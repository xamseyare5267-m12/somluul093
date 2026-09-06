/**
 * Phase 8 — Feed & Reels ranking.
 * Score = engagement + recency decay + social graph boost + media affinity.
 */
import { restGet, isScaleMode, supabaseConfig } from './supabaseRest.js';
import * as postsRepo from '../repos/postsRepo.js';
import * as profilesRepo from '../repos/profilesRepo.js';

export type RankedPost = postsRepo.PostRow & {
  _score?: number;
  _reasons?: string[];
  reaction_count?: number;
  comment_count?: number;
};

function hoursSince(iso: string): number {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return 999;
  return Math.max(0, (Date.now() - t) / 3_600_000);
}

/** Time decay: half-life ~18h for feed, ~8h for reels */
function recencyScore(createdAt: string, halfLifeHours: number): number {
  const h = hoursSince(createdAt);
  return Math.pow(0.5, h / halfLifeHours);
}

function engagementScore(reactions: number, comments: number, shares: number): number {
  // Diminishing returns (log-like)
  const r = Math.log10(1 + reactions * 3);
  const c = Math.log10(1 + comments * 4);
  const s = Math.log10(1 + shares * 5);
  return r * 2.0 + c * 2.5 + s * 1.5;
}

export async function loadReactionCounts(postIds: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (!postIds.length || !supabaseConfig()) return map;
  try {
    // Fetch reactions for these posts (cap)
    const inList = postIds
      .slice(0, 80)
      .map((id) => `"${id}"`)
      .join(',');
    if (!inList) return map;
    const rows = await restGet<any[]>(
      `post_reactions?post_id=in.(${inList})&select=post_id`
    );
    if (Array.isArray(rows)) {
      for (const row of rows) {
        const id = row.post_id;
        map.set(id, (map.get(id) || 0) + 1);
      }
    }
  } catch {
    /* ignore */
  }
  return map;
}

export async function loadCommentCounts(postIds: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (!postIds.length || !supabaseConfig()) return map;
  try {
    const inList = postIds
      .slice(0, 80)
      .map((id) => `"${id}"`)
      .join(',');
    if (!inList) return map;
    const rows = await restGet<any[]>(
      `post_comments?post_id=in.(${inList})&deleted_at=is.null&select=post_id`
    );
    if (Array.isArray(rows)) {
      for (const row of rows) {
        const id = row.post_id;
        map.set(id, (map.get(id) || 0) + 1);
      }
    }
  } catch {
    /* ignore */
  }
  return map;
}

export async function loadFollowingSet(userId: string): Promise<Set<string>> {
  const set = new Set<string>();
  if (!userId || !isScaleMode()) return set;
  try {
    const ids = await profilesRepo.listFollowing(userId, 200);
    for (const id of ids) set.add(id);
  } catch {
    /* ignore */
  }
  return set;
}

export function scorePost(
  post: postsRepo.PostRow,
  ctx: {
    following: Set<string>;
    reactions: number;
    comments: number;
    mode: 'feed' | 'reels';
  }
): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  const halfLife = ctx.mode === 'reels' ? 8 : 18;
  const recency = recencyScore(post.created_at, halfLife);
  const eng = engagementScore(ctx.reactions, ctx.comments, post.shares || 0);

  let social = 0;
  if (ctx.following.has(post.author_id)) {
    social = 1.8;
    reasons.push('following');
  }

  let mediaBoost = 0;
  if (ctx.mode === 'reels') {
    if (post.media_type === 'video' || post.media_type === 'mixed') {
      mediaBoost = 1.2;
      reasons.push('video');
    }
  } else if (post.media_type === 'image' || post.media_type === 'video') {
    mediaBoost = 0.35;
  }

  // Pinned / sponsored light boost (not full ads system)
  let pinBoost = 0;
  if (post.is_pinned) {
    pinBoost = 3;
    reasons.push('pinned');
  }
  if (post.is_sponsored) {
    pinBoost += 1.5;
    reasons.push('sponsored');
  }

  const score = recency * 4 + eng * 3 + social + mediaBoost + pinBoost;
  if (recency > 0.5) reasons.push('fresh');
  if (eng > 1) reasons.push('engaged');
  return { score, reasons };
}

export async function rankPosts(
  posts: postsRepo.PostRow[],
  opts: { userId?: string; mode: 'feed' | 'reels' }
): Promise<RankedPost[]> {
  if (!posts.length) return [];
  const ids = posts.map((p) => p.id);
  const [reactions, comments, following] = await Promise.all([
    loadReactionCounts(ids),
    loadCommentCounts(ids),
    opts.userId ? loadFollowingSet(opts.userId) : Promise.resolve(new Set<string>()),
  ]);

  const ranked: RankedPost[] = posts.map((p) => {
    const rc = reactions.get(p.id) || 0;
    const cc = comments.get(p.id) || 0;
    const { score, reasons } = scorePost(p, {
      following,
      reactions: rc,
      comments: cc,
      mode: opts.mode,
    });
    return {
      ...p,
      reaction_count: rc,
      comment_count: cc,
      _score: score,
      _reasons: reasons,
    };
  });

  ranked.sort((a, b) => (b._score || 0) - (a._score || 0));
  return ranked;
}

/**
 * Fetch candidate pool then rank.
 * Pool = recent posts (larger than page size), then sort by score.
 */
export async function rankedFeed(opts: {
  userId?: string;
  limit?: number;
  authorId?: string;
}): Promise<RankedPost[]> {
  const limit = Math.min(opts.limit || 30, 50);
  const pool = await postsRepo.listFeed({
    limit: Math.min(limit * 3, 90),
    authorId: opts.authorId,
  });
  const ranked = await rankPosts(pool, { userId: opts.userId, mode: 'feed' });
  return ranked.slice(0, limit);
}

export async function rankedReels(opts: {
  userId?: string;
  limit?: number;
}): Promise<RankedPost[]> {
  const limit = Math.min(opts.limit || 40, 60);
  const pool = await postsRepo.listReels(Math.min(limit * 3, 100));
  const ranked = await rankPosts(pool, { userId: opts.userId, mode: 'reels' });
  return ranked.slice(0, limit);
}

/** Simple related posts: same author + recent engaged videos/images */
export async function recommendRelated(postId: string, limit = 10): Promise<RankedPost[]> {
  const post = await postsRepo.getPost(postId);
  if (!post) return [];
  const byAuthor = await postsRepo.listFeed({ authorId: post.author_id, limit: 20 });
  const others = byAuthor.filter((p) => p.id !== postId);
  const ranked = await rankPosts(others, { mode: 'feed' });
  return ranked.slice(0, limit);
}
