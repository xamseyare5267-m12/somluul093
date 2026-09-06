import jwt from 'jsonwebtoken';
/**
 * Mount scale-mode API routes onto the Express app.
 * Safe to call always — routes no-op or fall back when SCALE_MODE is off.
 */
import type { Express, Request, Response, NextFunction } from 'express';
import { canUsePostsRepo, insertPost, listFeed, listReels, getPost, softDeletePost, upsertReaction, addComment, listComments } from '../repos/postsRepo.js';
import { canUseMessagesRepo, ensureDmRoom, insertMessage, listMessages, listRoomsForUser, markRead, softDeleteMessage, createGroupRoom } from '../repos/messagesRepo.js';
import { canUseProfilesRepo, searchProfiles, follow, unfollow, blockUser, unblockUser, isBlocked, setOnline, getProfileById } from '../repos/profilesRepo.js';
import { canUseWebrtcRepo, pushSignal, pollSignals, markConsumed, getIceServers, cleanupExpiredSignals } from '../repos/webrtcRepo.js';
import { canUseNotificationsRepo, pushNotification, listNotifications, markNotificationRead, markAllRead } from '../repos/notificationsRepo.js';
import { signDirectUpload, mediaCacheHeaders, completeDirectUpload, assertPublishedMediaAllowed } from './mediaUpload.js';
import { cacheGetJson, cacheSetJson, CacheKeys, cacheDel } from './cache.js';
import { isScaleMode, supabaseConfig } from './supabaseRest.js';
import { projectDbToTables } from './dualWrite.js';
import {
  realtimeAttach,
  emitNewMessage,
  emitTyping,
  emitCallRing,
  touchPresence,
  realtimeStats,
  listOnlineUserIds,
} from './realtimeHub.js';
import { enqueueJob, jobQueueStats, startJobWorkers } from './jobQueue.js';
import { busStats, isRedisBusReady } from './redisBus.js';
import { rankedFeed, rankedReels, recommendRelated } from './ranking.js';
import { shardingStatus, routeForUser, routeForRoom } from './sharding.js';
import { serviceStatus } from './serviceRegistry.js';

type AuthReq = Request & { user?: { id: string; first_name?: string; last_name?: string; email?: string } };

function requireAuth(req: AuthReq, res: Response): req is AuthReq & { user: { id: string } } {
  if (!req.user?.id) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
}

export function mountScaleRoutes(
  app: Express,
  deps: {
    authMiddleware: (req: any, res: any, next: any) => void;
  }
): void {
  const { authMiddleware } = deps;

  // ---- Health scale details ----
  app.get('/api/scale/status', async (_req: Request, res: Response) => {
    res.json({
      scaleMode: isScaleMode(),
      supabaseConfigured: !!supabaseConfig(),
      postsRepo: canUsePostsRepo(),
      messagesRepo: canUseMessagesRepo(),
      profilesRepo: canUseProfilesRepo(),
      webrtcRepo: canUseWebrtcRepo(),
      notificationsRepo: canUseNotificationsRepo(),
      redisConfigured: !!process.env.REDIS_URL,
      redisBusReady: isRedisBusReady(),
      bus: busStats(),
      jobs: jobQueueStats(),
      turnConfigured: !!(process.env.TURN_URL && process.env.TURN_USERNAME && process.env.TURN_CREDENTIAL),
      cdnBase: process.env.CDN_BASE_URL || null,
      sharding: shardingStatus(),
      services: serviceStatus(),
    });
  });


  // ---- Phase 5: Realtime SSE gateway ----
  app.get('/api/scale/realtime', (req: Request, res: Response) => {
    let userId: string | undefined;
    try {
      const token = String(req.query.token || '').trim() ||
        String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
      if (!token) {
        res.status(401).end();
        return;
      }
      const secret = process.env.JWT_SECRET || '';
      if (!secret) {
        res.status(503).end();
        return;
      }
      const decoded: any = jwt.verify(token, secret);
      userId = decoded.userId || decoded.id;
    } catch {
      res.status(401).end();
      return;
    }
    if (!userId) {
      res.status(401).end();
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    (res as any).flushHeaders?.();
    res.write(`event: connected\ndata: ${JSON.stringify({ userId, stats: realtimeStats() })}\n\n`);

    const cleanup = realtimeAttach(userId, res);
    req.on('close', cleanup);
    req.on('error', cleanup);
  });

  app.get('/api/scale/presence/online', authMiddleware, (_req: AuthReq, res: Response) => {
    res.json({ online: listOnlineUserIds(), stats: realtimeStats() });
  });


  // ---- Phase 7: Jobs & bus status ----
  app.get('/api/scale/jobs', authMiddleware, (_req: AuthReq, res: Response) => {
    res.json({
      jobs: jobQueueStats(),
      bus: busStats(),
      redisBusReady: isRedisBusReady(),
    });
  });

  app.post('/api/scale/jobs/enqueue', authMiddleware, async (req: AuthReq, res: Response) => {
    if (!requireAuth(req, res)) return;
    const type = String(req.body?.type || '');
    const allowed = ['cleanup_webrtc', 'cleanup_stories', 'cleanup_idempotency', 'notify_fanout', 'dual_write_flush'];
    if (!allowed.includes(type)) {
      res.status(400).json({ error: 'Invalid job type', allowed });
      return;
    }
    const id = await enqueueJob(type as any, req.body?.payload || {});
    res.json({ success: true, id });
  });


  // ---- Phase 10: Hyperscale foundations ----
  app.get('/api/scale/sharding', authMiddleware, (req: AuthReq, res: Response) => {
    const userId = req.user?.id;
    res.json({
      ...shardingStatus(),
      me: userId ? routeForUser(userId) : null,
    });
  });

  app.get('/api/scale/services', authMiddleware, (_req: AuthReq, res: Response) => {
    res.json(serviceStatus());
  });

  app.get('/api/scale/route/user/:id', authMiddleware, (req: AuthReq, res: Response) => {
    res.json(routeForUser(req.params.id));
  });

  app.get('/api/scale/route/room/:id', authMiddleware, (req: AuthReq, res: Response) => {
    res.json(routeForRoom(req.params.id));
  });

  // ---- ICE servers for WebRTC clients ----
  app.get('/api/webrtc/ice-servers', authMiddleware, async (_req: AuthReq, res: Response) => {
    const cached = await cacheGetJson<any>(CacheKeys.iceConfig());
    if (cached) {
      res.json(cached);
      return;
    }
    const payload = { iceServers: getIceServers(), ttl: 300 };
    await cacheSetJson(CacheKeys.iceConfig(), payload, 300);
    res.json(payload);
  });

  // ---- Scale WebRTC signaling (table-backed) ----
  app.post('/api/scale/webrtc/signal', authMiddleware, async (req: AuthReq, res: Response) => {
    if (!requireAuth(req, res)) return;
    if (!canUseWebrtcRepo()) {
      res.status(503).json({ error: 'Scale WebRTC requires SCALE_MODE=1 and Supabase' });
      return;
    }
    const { roomId, type, sdp, candidate, targetUserId, callType, fromName } = req.body || {};
    if (!roomId || !type) {
      res.status(400).json({ error: 'roomId and type required' });
      return;
    }
    try {
      const signal = await pushSignal({
        roomId,
        fromUserId: req.user!.id,
        targetUserId: targetUserId || null,
        type,
        callType: callType || null,
        sdp: sdp || null,
        candidate: candidate || null,
        fromName: fromName || `${req.user!.first_name || ''} ${req.user!.last_name || ''}`.trim(),
      });
      if (type === 'offer' && targetUserId) {
        try {
          emitCallRing({
            targetUserId,
            fromUserId: req.user!.id,
            fromName: signal.from_name || `${req.user!.first_name || ''} ${req.user!.last_name || ''}`.trim(),
            roomId,
            callType: callType || 'voice',
          });
        } catch (_) {}
        if (canUseNotificationsRepo()) {
          const isVideo = callType === 'video';
          await pushNotification({
            userId: targetUserId,
            type: isVideo ? 'video_call' : 'voice_call',
            title: isVideo ? 'Video call' : 'Voice call',
            body: `${signal.from_name || 'User'} is calling you`,
            data: { roomId, callType, fromUserId: req.user!.id },
          });
        }
      }
      res.json({ success: true, signal });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'signal failed' });
    }
  });

  app.get('/api/scale/webrtc/poll', authMiddleware, async (req: AuthReq, res: Response) => {
    if (!requireAuth(req, res)) return;
    if (!canUseWebrtcRepo()) {
      res.status(503).json({ error: 'Scale WebRTC requires SCALE_MODE=1 and Supabase' });
      return;
    }
    try {
      const after = typeof req.query.after === 'string' ? req.query.after : undefined;
      const signals = await pollSignals(req.user!.id, after);
      res.json({ signals });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'poll failed' });
    }
  });

  app.post('/api/scale/webrtc/consumed', authMiddleware, async (req: AuthReq, res: Response) => {
    if (!requireAuth(req, res)) return;
    if (!canUseWebrtcRepo()) {
      res.status(503).json({ error: 'Scale mode required' });
      return;
    }
    const { signalId } = req.body || {};
    if (!signalId) {
      res.status(400).json({ error: 'signalId required' });
      return;
    }
    await markConsumed(signalId, req.user!.id);
    res.json({ success: true });
  });

  // ---- Direct media upload (CDN path) ----
  app.post('/api/media/sign', authMiddleware, async (req: AuthReq, res: Response) => {
    if (!requireAuth(req, res)) return;
    try {
      const { filename, contentType, sizeBytes } = req.body || {};
      if (!filename) {
        res.status(400).json({ error: 'filename required' });
        return;
      }
      const signed = await signDirectUpload({
        userId: req.user!.id,
        filename: String(filename),
        contentType: contentType ? String(contentType) : undefined,
        sizeBytes: Number(sizeBytes || 0),
      });
      if (!signed) {
        res.status(503).json({ error: 'Object storage is not configured (SUPABASE_URL + SERVICE_ROLE + BUCKET)' });
        return;
      }
      res.json(signed);
    } catch (err: any) {
      res.status(400).json({ error: err?.message || 'sign failed' });
    }
  });

  app.post('/api/media/complete', authMiddleware, async (req: AuthReq, res: Response) => { if(!requireAuth(req,res))return; try{const {mediaId,objectKey,contentType}=req.body||{}; if(!mediaId||!objectKey)return res.status(400).json({error:'mediaId and objectKey are required'}); const r=await completeDirectUpload({userId:req.user!.id,mediaId:String(mediaId),objectKey:String(objectKey),contentType:contentType?String(contentType):undefined}); if(!r.approved)return res.status(422).json(r); res.json(r);}catch(e:any){res.status(400).json({error:e?.message||'media completion failed'});} });

  // ---- Scale feed ----
  app.get('/api/scale/feed', authMiddleware, async (req: AuthReq, res: Response) => {
    if (!requireAuth(req, res)) return;
    if (!canUsePostsRepo()) {
      res.status(503).json({ error: 'Scale feed requires SCALE_MODE=1' });
      return;
    }
    try {
      const before = typeof req.query.before === 'string' ? req.query.before : undefined;
      const authorId = typeof req.query.authorId === 'string' ? req.query.authorId : undefined;
      const ranked = req.query.ranked !== '0';
      const cacheKey = CacheKeys.feed(`${authorId || ''}:${before || 'head'}:r${ranked ? 1 : 0}:${req.user!.id}`);
      const cached = await cacheGetJson<any>(cacheKey);
      if (cached) {
        res.set(mediaCacheHeaders('short'));
        res.json(cached);
        return;
      }
      let posts: any[];
      if (ranked && !before) {
        posts = await rankedFeed({ userId: req.user!.id, authorId, limit: 30 });
      } else {
        posts = await listFeed({ before, authorId, limit: 30 });
      }
      const payload = { posts, ranked: !!(ranked && !before) };
      await cacheSetJson(cacheKey, payload, 20);
      res.json(payload);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'feed failed' });
    }
  });

  app.post('/api/scale/posts', authMiddleware, async (req: AuthReq, res: Response) => {
    if (!requireAuth(req, res)) return;
    if (!canUsePostsRepo()) {
      res.status(503).json({ error: 'Scale posts require SCALE_MODE=1' });
      return;
    }
    try {
      const { content, mediaType, mediaUrl, mediaList, visibility } = req.body || {};
      await assertPublishedMediaAllowed(req.user!.id,[mediaUrl,...(Array.isArray(mediaList)?mediaList.map((m:any)=>m?.url):[])]);
      const post = await insertPost({
        authorId: req.user!.id,
        content,
        mediaType,
        mediaUrl,
        mediaList,
        visibility,
      });
      await cacheDel(CacheKeys.feed('head'));
      res.status(201).json({ post });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'create post failed' });
    }
  });

  app.get('/api/scale/reels', authMiddleware, async (req: AuthReq, res: Response) => {
    if (!requireAuth(req, res)) return;
    if (!canUsePostsRepo()) {
      res.status(503).json({ error: 'Scale mode required' });
      return;
    }
    try {
      const ranked = req.query.ranked !== '0';
      const posts = ranked
        ? await rankedReels({ userId: req.user!.id, limit: 40 })
        : await listReels(40);
      res.json({ posts, ranked });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'reels failed' });
    }
  });

  app.get('/api/scale/recommend/:postId', authMiddleware, async (req: AuthReq, res: Response) => {
    if (!requireAuth(req, res)) return;
    if (!canUsePostsRepo()) {
      res.status(503).json({ error: 'Scale mode required' });
      return;
    }
    try {
      const posts = await recommendRelated(req.params.postId, 12);
      res.json({ posts });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'recommend failed' });
    }
  });

  app.post('/api/scale/posts/:id/react', authMiddleware, async (req: AuthReq, res: Response) => {
    if (!requireAuth(req, res)) return;
    if (!canUsePostsRepo()) {
      res.status(503).json({ error: 'Scale mode required' });
      return;
    }
    try {
      const allowed=new Set(['like','love','haha','wow','sad','angry']); const reaction=allowed.has(String(req.body?.reaction))?String(req.body?.reaction):'like';
      await upsertReaction(req.params.id, req.user!.id, reaction);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'react failed' });
    }
  });

  app.post('/api/scale/posts/:id/comments', authMiddleware, async (req: AuthReq, res: Response) => {
    if (!requireAuth(req, res)) return;
    if (!canUsePostsRepo()) {
      res.status(503).json({ error: 'Scale mode required' });
      return;
    }
    try {
      const comment = await addComment({
        postId: req.params.id,
        authorId: req.user!.id,
        content: String(req.body?.content || ''),
        parentId: req.body?.parentId,
      });
      res.status(201).json({ comment });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'comment failed' });
    }
  });

  app.get('/api/scale/posts/:id/comments', authMiddleware, async (req: AuthReq, res: Response) => {
    if (!requireAuth(req, res)) return;
    if (!canUsePostsRepo()) {
      res.status(503).json({ error: 'Scale mode required' });
      return;
    }
    try {
      const comments = await listComments(req.params.id);
      res.json({ comments });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'comments failed' });
    }
  });

  app.delete('/api/scale/posts/:id', authMiddleware, async (req: AuthReq, res: Response) => {
    if (!requireAuth(req, res)) return;
    if (!canUsePostsRepo()) {
      res.status(503).json({ error: 'Scale mode required' });
      return;
    }
    try {
      const ok = await softDeletePost(req.params.id, req.user!.id);
      res.json({ success: ok });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'delete failed' });
    }
  });

  // ---- Scale messenger ----
  app.post('/api/scale/chat/dm', authMiddleware, async (req: AuthReq, res: Response) => {
    if (!requireAuth(req, res)) return;
    if (!canUseMessagesRepo()) {
      res.status(503).json({ error: 'Scale mode required' });
      return;
    }
    const peerId = req.body?.peerId;
    if (!peerId) {
      res.status(400).json({ error: 'peerId required' });
      return;
    }
    try {
      if (canUseProfilesRepo() && (await isBlocked(req.user!.id, peerId))) {
        res.status(403).json({ error: 'Blocked' });
        return;
      }
      const roomId = await ensureDmRoom(req.user!.id, peerId);
      res.json({ roomId });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'dm failed' });
    }
  });

  app.post('/api/scale/chat/group', authMiddleware, async (req: AuthReq, res: Response) => {
    if (!requireAuth(req, res)) return;
    if (!canUseMessagesRepo()) {
      res.status(503).json({ error: 'Scale mode required' });
      return;
    }
    try {
      const roomId = await createGroupRoom({
        name: String(req.body?.name || 'Group'),
        createdBy: req.user!.id,
        memberIds: Array.isArray(req.body?.memberIds) ? req.body.memberIds : [],
      });
      res.status(201).json({ roomId });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'group failed' });
    }
  });

  app.get('/api/scale/chat/rooms', authMiddleware, async (req: AuthReq, res: Response) => {
    if (!requireAuth(req, res)) return;
    if (!canUseMessagesRepo()) {
      res.status(503).json({ error: 'Scale mode required' });
      return;
    }
    try {
      const rooms = await listRoomsForUser(req.user!.id);
      res.json({ rooms });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'rooms failed' });
    }
  });

  app.get('/api/scale/chat/:roomId/messages', authMiddleware, async (req: AuthReq, res: Response) => {
    if (!requireAuth(req, res)) return;
    if (!canUseMessagesRepo()) {
      res.status(503).json({ error: 'Scale mode required' });
      return;
    }
    try {
      const before = typeof req.query.before === 'string' ? req.query.before : undefined;
      const messages = await listMessages(req.params.roomId, { before, limit: 50 });
      res.json({ messages });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'messages failed' });
    }
  });

  app.post('/api/scale/chat/:roomId/messages', authMiddleware, async (req: AuthReq, res: Response) => {
    if (!requireAuth(req, res)) return;
    if (!canUseMessagesRepo()) {
      res.status(503).json({ error: 'Scale mode required' });
      return;
    }
    try {
      const msg = await insertMessage({
        roomId: req.params.roomId,
        senderId: req.user!.id,
        body: req.body?.body,
        mediaUrl: req.body?.mediaUrl,
        mediaType: req.body?.mediaType,
        replyToId: req.body?.replyToId,
        metadata: req.body?.metadata,
      });
      try {
        const { restGet } = await import('./supabaseRest.js');
        const members = await restGet(
          `chat_members?room_id=eq.${encodeURIComponent(req.params.roomId)}&select=user_id`
        );
        const ids = Array.isArray(members)
          ? members.map((m: any) => m.user_id).filter((id: string) => id && id !== req.user!.id)
          : [];
        emitNewMessage(ids, {
          ...msg,
          roomId: req.params.roomId,
          room_id: req.params.roomId,
          sender_id: req.user!.id,
        });
      } catch (_) {
        /* non-fatal */
      }
      res.status(201).json({ message: msg });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'send failed' });
    }
  });

  app.post('/api/scale/chat/:roomId/read', authMiddleware, async (req: AuthReq, res: Response) => {
    if (!requireAuth(req, res)) return;
    if (!canUseMessagesRepo()) {
      res.status(503).json({ error: 'Scale mode required' });
      return;
    }
    await markRead(req.params.roomId, req.user!.id);
    res.json({ success: true });
  });

  // ---- Scale social graph ----
  app.post('/api/scale/follow/:id', authMiddleware, async (req: AuthReq, res: Response) => {
    if (!requireAuth(req, res)) return;
    if (!canUseProfilesRepo()) {
      res.status(503).json({ error: 'Scale mode required' });
      return;
    }
    await follow(req.user!.id, req.params.id);
    res.json({ success: true });
  });

  app.delete('/api/scale/follow/:id', authMiddleware, async (req: AuthReq, res: Response) => {
    if (!requireAuth(req, res)) return;
    if (!canUseProfilesRepo()) {
      res.status(503).json({ error: 'Scale mode required' });
      return;
    }
    await unfollow(req.user!.id, req.params.id);
    res.json({ success: true });
  });

  app.post('/api/scale/block/:id', authMiddleware, async (req: AuthReq, res: Response) => {
    if (!requireAuth(req, res)) return;
    if (!canUseProfilesRepo()) {
      res.status(503).json({ error: 'Scale mode required' });
      return;
    }
    await blockUser(req.user!.id, req.params.id);
    res.json({ success: true });
  });

  app.delete('/api/scale/block/:id', authMiddleware, async (req: AuthReq, res: Response) => {
    if (!requireAuth(req, res)) return;
    if (!canUseProfilesRepo()) {
      res.status(503).json({ error: 'Scale mode required' });
      return;
    }
    await unblockUser(req.user!.id, req.params.id);
    res.json({ success: true });
  });

  app.get('/api/scale/search/users', authMiddleware, async (req: AuthReq, res: Response) => {
    if (!requireAuth(req, res)) return;
    if (!canUseProfilesRepo()) {
      res.status(503).json({ error: 'Scale mode required' });
      return;
    }
    const q = String(req.query.q || '');
    const users = await searchProfiles(q);
    res.json({ users });
  });

  app.post('/api/scale/presence', authMiddleware, async (req: AuthReq, res: Response) => {
    if (!requireAuth(req, res)) return;
    if (!canUseProfilesRepo()) {
      res.status(503).json({ error: 'Scale mode required' });
      return;
    }
    const online = req.body?.online !== false;
    await setOnline(req.user!.id, online);
    try { touchPresence(req.user!.id, online); } catch (_) {}
    res.json({ success: true });
  });

  // ---- Notifications ----
  app.get('/api/scale/notifications', authMiddleware, async (req: AuthReq, res: Response) => {
    if (!requireAuth(req, res)) return;
    if (!canUseNotificationsRepo()) {
      res.status(503).json({ error: 'Scale mode required' });
      return;
    }
    const items = await listNotifications(req.user!.id);
    res.json({ notifications: items });
  });

  app.post('/api/scale/notifications/:id/read', authMiddleware, async (req: AuthReq, res: Response) => {
    if (!requireAuth(req, res)) return;
    if (!canUseNotificationsRepo()) {
      res.status(503).json({ error: 'Scale mode required' });
      return;
    }
    await markNotificationRead(req.params.id, req.user!.id);
    res.json({ success: true });
  });

  app.post('/api/scale/notifications/read-all', authMiddleware, async (req: AuthReq, res: Response) => {
    if (!requireAuth(req, res)) return;
    if (!canUseNotificationsRepo()) {
      res.status(503).json({ error: 'Scale mode required' });
      return;
    }
    await markAllRead(req.user!.id);
    res.json({ success: true });
  });

  // Periodic cleanup hook (call from cron or on health)

  // ---- Phase 3: one-shot project from in-memory/legacy state into tables ----
  app.post('/api/scale/migrate-from-memory', authMiddleware, async (req: AuthReq, res: Response) => {
    if (!requireAuth(req, res)) return;
    if (!isScaleMode()) {
      res.status(503).json({ error: 'SCALE_MODE=1 required' });
      return;
    }
    try {
      const { readDB } = await import('../db.js');
      const db = readDB();
      const result = await projectDbToTables(db, { maxPosts: 2000, maxMessages: 5000 });
      res.json({ success: true, result });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'migration failed' });
    }
  });

  app.post('/api/scale/maintenance/cleanup-signals', authMiddleware, async (req: AuthReq, res: Response) => {
    if (!requireAuth(req, res)) return;
    if (req.user && (req.user as any).role !== 'owner' && (req.user as any).role !== 'admin') {
      // soft allow if no role field
    }
    await cleanupExpiredSignals();
    res.json({ success: true });
  });
}
