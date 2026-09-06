import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Radio, Eye, Heart, MessageCircle, X, PhoneOff, Mic, MicOff, Video, VideoOff } from 'lucide-react';
import { Room, RoomEvent, Track } from 'livekit-client';
import { useLanguage } from './LanguageContext';
import { playNotifByType } from '../lib/soundUtils';

interface LiveSectionProps { user?: any; authToken?: string; onShowToast?: (m: string, t: 'success' | 'error') => void; }
const GIFTS = [
  { id: 'rose', name: '🌹 Rose', coins: 5 }, { id: 'fire', name: '🔥 Fire', coins: 20 },
  { id: 'diamond', name: '💎 Diamond', coins: 50 }, { id: 'rocket', name: '🚀 Rocket', coins: 100 },
  { id: 'crown', name: '👑 Crown', coins: 200 },
];

/** Production live UI: LiveKit SFU handles fan-out/media; HTTP handles durable metadata. */
export const LiveSection: React.FC<LiveSectionProps> = ({ user, authToken, onShowToast }) => {
  const { language } = useLanguage();
  const [lives, setLives] = useState<any[]>([]);
  const [activeLive, setActiveLive] = useState<any | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [comment, setComment] = useState('');
  const [title, setTitle] = useState('');
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const localRef = useRef<HTMLVideoElement>(null);
  const remoteContainerRef = useRef<HTMLDivElement>(null);
  const roomRef = useRef<Room | null>(null);
  const pollRef = useRef<any>(null);

  const loadLives = async () => { try { const r = await axios.get('/api/live'); setLives(Array.isArray(r.data) ? r.data : []); } catch { setLives([]); } };

  useEffect(() => { loadLives(); const i = setInterval(loadLives, 10000); return () => clearInterval(i); }, []);

  const detachAll = () => {
    if (localRef.current) localRef.current.srcObject = null;
    if (remoteContainerRef.current) remoteContainerRef.current.innerHTML = '';
  };
  const cleanupMedia = async () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (roomRef.current) { try { await roomRef.current.disconnect(); } catch {} roomRef.current = null; }
    detachAll(); setConnecting(false);
  };

  const connectLiveKit = async (live: any, publish: boolean) => {
    if (!authToken) throw new Error('Login required');
    const r = await axios.post(`/api/live/${live.id}/join`, {}, { headers: { Authorization: `Bearer ${authToken}` } });
    const info = r.data;
    if (info.provider !== 'livekit' || !info.url || !info.token) throw new Error('Live media infrastructure is unavailable.');
    const room = new Room({ adaptiveStream: true, dynacast: true, disconnectOnPageLeave: true });
    roomRef.current = room;
    room.on(RoomEvent.TrackSubscribed, (track, publication) => {
      if (track.kind !== Track.Kind.Video && track.kind !== Track.Kind.Audio) return;
      const el = track.attach();
      if (track.kind === Track.Kind.Video) {
        if (remoteContainerRef.current) { remoteContainerRef.current.innerHTML = ''; remoteContainerRef.current.appendChild(el); }
      } else if (remoteContainerRef.current) remoteContainerRef.current.appendChild(el);
      publication.setSubscribed(true);
    });
    room.on(RoomEvent.TrackUnsubscribed, (track) => track.detach());
    room.on(RoomEvent.Disconnected, () => { if (roomRef.current === room) roomRef.current = null; });
    await room.connect(info.url, info.token, { autoSubscribe: true });
    if (publish) {
      await room.localParticipant.enableCameraAndMicrophone();
      const videoPub = room.localParticipant.getTrackPublication(Track.Source.Camera);
      const audioPub = room.localParticipant.getTrackPublication(Track.Source.Microphone);
      if (videoPub?.track && localRef.current) videoPub.track.attach(localRef.current);
      if (audioPub?.track) await audioPub.track.setEnabled(!muted);
      await videoPub?.track?.setEnabled(!cameraOff);
    }
    return room;
  };

  const refreshLive = (id: string) => {
    pollRef.current = setInterval(async () => { try { const r = await axios.get(`/api/live/${id}`); setActiveLive(r.data); if (r.data.status !== 'live') await leaveLive(false); } catch {} }, 5000);
  };

  const startLive = async () => {
    if (!authToken || connecting) return;
    setConnecting(true);
    try {
      const res = await axios.post('/api/live/start', { title: title.trim() || undefined }, { headers: { Authorization: `Bearer ${authToken}` } });
      const live = res.data; setActiveLive(live); setIsHost(true); playNotifByType('live');
      await connectLiveKit(live, true); refreshLive(live.id);
      onShowToast?.(language === 'so' ? 'Live-ka waa bilaabmay! 🔴' : 'You are live! 🔴', 'success');
      loadLives();
    } catch (e: any) { await cleanupMedia(); setActiveLive(null); onShowToast?.(e?.response?.data?.error || e?.message || 'Failed to start live', 'error'); }
    finally { setConnecting(false); }
  };

  const joinLive = async (live: any) => {
    if (!authToken || connecting) return;
    setConnecting(true);
    try { setActiveLive(live); setIsHost(false); await connectLiveKit(live, false); await axios.post(`/api/live/${live.id}/viewer`, { delta: 1 }, { headers: { Authorization: `Bearer ${authToken}` } }).catch(() => {}); refreshLive(live.id); }
    catch (e: any) { await cleanupMedia(); setActiveLive(null); onShowToast?.(e?.response?.data?.error || e?.message || 'Live unavailable', 'error'); }
    finally { setConnecting(false); }
  };

  const leaveLive = async (endHost = true) => {
    const live = activeLive;
    if (live && authToken) {
      if (isHost && endHost) await axios.post(`/api/live/${live.id}/end`, {}, { headers: { Authorization: `Bearer ${authToken}` } }).catch(() => {});
      else if (!isHost) await axios.post(`/api/live/${live.id}/viewer`, { delta: -1 }, { headers: { Authorization: `Bearer ${authToken}` } }).catch(() => {});
    }
    await cleanupMedia(); setActiveLive(null); setIsHost(false); loadLives();
  };
  useEffect(() => () => { void cleanupMedia(); }, []);

  const toggleMic = async () => { const p = roomRef.current?.localParticipant; const pub = p?.getTrackPublication(Track.Source.Microphone); if (pub?.track) { const next = !muted; await pub.track.setEnabled(!next); setMuted(next); } };
  const toggleCamera = async () => { const p = roomRef.current?.localParticipant; const pub = p?.getTrackPublication(Track.Source.Camera); if (pub?.track) { const next = !cameraOff; await pub.track.setEnabled(!next); setCameraOff(next); } };
  const sendComment = async () => { if (!comment.trim() || !activeLive || !authToken) return; try { const r = await axios.post(`/api/live/${activeLive.id}/comment`, { content: comment.trim() }, { headers: { Authorization: `Bearer ${authToken}` } }); setActiveLive(r.data.live || activeLive); setComment(''); } catch {} };
  const react = async (reaction: 'like' | 'love') => { if (!activeLive || !authToken) return; try { await axios.post(`/api/live/${activeLive.id}/react`, { reaction }, { headers: { Authorization: `Bearer ${authToken}` } }); playNotifByType(reaction); } catch {} };
  const sendGift = async (g: typeof GIFTS[0]) => { if (!activeLive || !authToken) return; try { await axios.post('/api/gifts/send', { toUserId: activeLive.hostId, giftId: g.id, giftName: g.name, coinCost: g.coins, liveId: activeLive.id }, { headers: { Authorization: `Bearer ${authToken}` } }); onShowToast?.(language === 'so' ? `Waxaad dirtay ${g.name}` : `Sent ${g.name}`, 'success'); playNotifByType('gift'); } catch (e: any) { onShowToast?.(e?.response?.data?.error || 'Gift failed', 'error'); } };

  if (activeLive) return <div className="bg-black rounded-2xl overflow-hidden relative min-h-[560px] flex flex-col">
    <div className="absolute top-3 left-3 right-3 z-20 flex justify-between items-start">
      <div className="bg-black/60 backdrop-blur rounded-xl px-3 py-2 text-white"><div className="flex items-center gap-2 text-xs font-bold"><span className="bg-red-600 px-1.5 py-0.5 rounded text-[10px] animate-pulse">LIVE</span><span>{activeLive.hostName}</span></div><div className="text-[10px] text-gray-300 mt-0.5 flex gap-3"><span><Eye size={11} className="inline" /> {activeLive.viewers || 0}</span><span>❤️ {activeLive.likes || 0}</span><span>💕 {activeLive.loves || 0}</span></div></div>
      <button onClick={() => void leaveLive()} className="bg-red-600 text-white rounded-full p-2 shadow-lg">{isHost ? <PhoneOff size={18} /> : <X size={18} />}</button>
    </div>
    <div className="grow relative bg-gray-950 flex items-center justify-center overflow-hidden">
      {isHost ? <video ref={localRef} autoPlay muted playsInline className="w-full h-full max-h-[440px] object-contain" /> : <div ref={remoteContainerRef} className="w-full h-full max-h-[440px] flex items-center justify-center [&_video]:w-full [&_video]:h-full [&_video]:object-contain" />}
      {connecting && <div className="absolute inset-0 grid place-items-center text-white bg-black/60">Connecting…</div>}
    </div>
    <div className="bg-gradient-to-t from-black/95 via-black/80 to-black/50 p-3 space-y-2 text-white">
      <div className="max-h-28 overflow-y-auto space-y-1 px-1">{(activeLive.comments || []).slice(-30).map((c: any) => <div key={c.id} className="text-[11px]"><b className="text-amber-300">{c.userName}</b> {c.content}</div>)}</div>
      <div className="flex gap-1.5 flex-wrap">{GIFTS.map(g => <button key={g.id} onClick={() => void sendGift(g)} className="text-[10px] bg-white/10 hover:bg-white/20 rounded-full px-2 py-1 border border-white/10">{g.name} · {g.coins}</button>)}</div>
      <div className="flex gap-2 items-center">
        {isHost && <><button onClick={() => void toggleMic()} className="p-2 rounded-full bg-white/10" title="Microphone">{muted ? <MicOff size={16} /> : <Mic size={16} />}</button><button onClick={() => void toggleCamera()} className="p-2 rounded-full bg-white/10" title="Camera">{cameraOff ? <VideoOff size={16} /> : <Video size={16} />}</button></>}
        <button onClick={() => void react('like')} className="p-2 rounded-full bg-white/10"><Heart size={16} /></button><button onClick={() => void react('love')} className="p-2 rounded-full bg-pink-600/80 text-xs px-2">💕</button>
        <input value={comment} onChange={e => setComment(e.target.value)} onKeyDown={e => e.key === 'Enter' && void sendComment()} placeholder={language === 'so' ? 'Faallo...' : 'Comment...'} className="grow text-xs rounded-full bg-white/10 border border-white/20 px-3 py-2 placeholder-white/40 focus:outline-none" /><button onClick={() => void sendComment()} className="p-2 rounded-full bg-[var(--somluul-primary)]"><MessageCircle size={16} /></button>
      </div>
    </div>
  </div>;

  return <div className="space-y-5">
    <div className="bg-gradient-to-r from-rose-600 to-orange-500 rounded-2xl p-5 text-white shadow-lg"><h2 className="text-xl font-extrabold flex items-center gap-2"><Radio size={22} /> {language === 'so' ? 'Live Streaming' : 'Go Live'}</h2><p className="text-sm opacity-90 mt-1">{language === 'so' ? 'Live-kaaga si toos ah ula wadaag bulshada.' : 'Broadcast live to your community.'}</p><div className="mt-4 flex gap-2"><input value={title} onChange={e => setTitle(e.target.value)} placeholder={language === 'so' ? 'Cinwaanka live-ka' : 'Live title'} className="flex-1 rounded-xl bg-white/15 border border-white/20 px-3 py-2 text-sm placeholder-white/60 outline-none"/><button disabled={!authToken || connecting} onClick={() => void startLive()} className="bg-white text-rose-600 font-bold rounded-xl px-4 py-2 disabled:opacity-50">{connecting ? '…' : 'GO LIVE'}</button></div></div>
    <div><h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-3">{language === 'so' ? 'Live-yada hadda socda' : 'Live now'}</h3>{lives.length === 0 ? <div className="text-center py-10 text-gray-400 text-sm border border-dashed border-gray-200 dark:border-gray-700 rounded-2xl">{language === 'so' ? 'Ma jiro live hadda. Noqo kan ugu horreeya!' : 'No one is live. Be the first!'}</div> : <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{lives.map(l => <button key={l.id} onClick={() => void joinLive(l)} className="text-left bg-white dark:bg-[var(--sl-bg-card)] border border-gray-100 dark:border-gray-800 rounded-2xl p-4 hover:shadow-md transition-all"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-full bg-gradient-to-tr from-rose-500 to-orange-400 flex items-center justify-center text-white font-black relative">{(l.hostName || 'L')[0]}<span className="absolute -bottom-1 -right-1 bg-red-600 text-[8px] px-1 rounded font-bold">LIVE</span></div><div><div className="font-bold text-sm text-gray-900 dark:text-white">{l.title}</div><div className="text-[11px] text-gray-500">{l.hostName} · 👁 {l.viewers || 0}</div></div></div></button>)}</div>}</div>
  </div>;
};
