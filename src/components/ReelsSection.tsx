import React, { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios'
import { fetchFeedPosts } from '../lib/scaleClient';
import {
  Heart,
  MessageCircle,
  Share2,
  Volume2,
  VolumeX,
  ChevronUp,
  ChevronDown,
  Plus,
  X,
  Send,
  Loader2,
  Film,
} from 'lucide-react';
import { useLanguage } from './LanguageContext';

interface Props {
  user?: any;
  authToken?: string;
  onShowToast?: (m: string, t: 'success' | 'error') => void;
  onViewProfile?: (id: string) => void;
}

/**
 * Reels — real short videos from /api/posts (video), create reel, like, comments.
 * No fake streams or placeholder videos.
 */
export const ReelsSection: React.FC<Props> = ({ user, authToken, onShowToast, onViewProfile }) => {
  const { language } = useLanguage();
  const so = language === 'so';

  const [reels, setReels] = useState<any[]>([]);
  const [index, setIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const [loading, setLoading] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Create reel
  const [showCreate, setShowCreate] = useState(false);
  const [caption, setCaption] = useState('');
  const [videoData, setVideoData] = useState<{ url: string; type: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Comments
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commenting, setCommenting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const feed = await fetchFeedPosts({ limit: 80 });
      const raw = feed.list.length ? { posts: feed.list } : (await axios.get('/api/posts', {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        params: { page: 1, limit: 80 },
      })).data;
      const all: any[] = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.data)
          ? raw.data
          : Array.isArray(raw?.posts)
            ? raw.posts
            : [];
      const videos = all
        .filter((p: any) => {
          if (p.mediaType === 'video' && p.mediaUrl) return true;
          if (Array.isArray(p.mediaList) && p.mediaList.some((m: any) => (m.type || '').includes('video'))) return true;
          return false;
        })
        .map((p: any) => {
          const videoUrl =
            p.mediaType === 'video'
              ? p.mediaUrl
              : p.mediaList?.find((m: any) => (m.type || '').includes('video'))?.url || p.mediaUrl;
          return { ...p, videoUrl };
        });
      setReels(videos);
      setIndex(0);
    } catch {
      setReels([]);
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.load();
    v.play().catch(() => {});
  }, [index, reels]);

  const current = reels[index];

  const go = (dir: 1 | -1) => {
    if (!reels.length) return;
    setIndex((i) => (i + dir + reels.length) % reels.length);
    setShowComments(false);
  };

  const react = async (type: 'like' | 'love' = 'like') => {
    if (!current || !authToken) {
      onShowToast?.(so ? 'Fadlan soo gal' : 'Please log in', 'error');
      return;
    }
    try {
      const res = await axios.post(
        `/api/posts/${current.id}/like`,
        { type },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      const updated = res.data;
      setReels((prev) =>
        prev.map((r, i) => (i === index ? { ...r, ...updated, videoUrl: r.videoUrl } : r))
      );
    } catch (err: any) {
      onShowToast?.(err?.response?.data?.error || 'Failed', 'error');
    }
  };

  const onPickVideo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('video/')) {
      onShowToast?.(so ? 'Fadlan dooro video' : 'Please choose a video', 'error');
      return;
    }
    // Client-side size hint (server still enforces)
    if (file.size > 200 * 1024 * 1024) {
      onShowToast?.(so ? 'Video aad u weyn (max ~200MB browser)' : 'Video too large for browser upload', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setVideoData({ url: String(reader.result), type: 'video' });
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const submitReel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authToken) {
      onShowToast?.(so ? 'Fadlan soo gal' : 'Please log in', 'error');
      return;
    }
    if (!videoData) {
      onShowToast?.(so ? 'Video dooro' : 'Choose a video', 'error');
      return;
    }
    setUploading(true);
    try {
      const res = await axios.post(
        '/api/posts',
        {
          content: caption.trim(),
          mediaType: 'video',
          mediaUrl: videoData.url,
          mediaList: [{ url: videoData.url, type: 'video' }],
        },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      const post = res.data;
      const videoUrl =
        post.mediaType === 'video'
          ? post.mediaUrl
          : post.mediaList?.find((m: any) => (m.type || '').includes('video'))?.url || post.mediaUrl;
      setReels((prev) => [{ ...post, videoUrl }, ...prev]);
      setIndex(0);
      setShowCreate(false);
      setCaption('');
      setVideoData(null);
      onShowToast?.(so ? 'Reel waa la daabacay' : 'Reel published', 'success');
    } catch (err: any) {
      onShowToast?.(err?.response?.data?.error || (so ? 'Upload way fashilantay' : 'Upload failed'), 'error');
    } finally {
      setUploading(false);
    }
  };

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!current || !authToken || !commentText.trim()) return;
    setCommenting(true);
    try {
      const res = await axios.post(
        `/api/posts/${current.id}/comment`,
        { content: commentText.trim() },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      // API may return post or comment — merge comments onto current reel
      const data = res.data;
      setReels((prev) =>
        prev.map((r, i) => {
          if (i !== index) return r;
          if (data?.comments) return { ...r, ...data, videoUrl: r.videoUrl };
          if (data?.id && data?.content) {
            const comments = Array.isArray(r.comments) ? [...r.comments, data] : [data];
            return { ...r, comments, videoUrl: r.videoUrl };
          }
          return r;
        })
      );
      setCommentText('');
      onShowToast?.(so ? 'Faallada waa la diray' : 'Comment posted', 'success');
    } catch (err: any) {
      onShowToast?.(err?.response?.data?.error || 'Failed', 'error');
    } finally {
      setCommenting(false);
    }
  };

  const shareReel = async () => {
    if (!current) return;
    const url = typeof window !== 'undefined' ? window.location.origin + '/?tab=reels' : '';
    try {
      if (navigator.share) {
        await navigator.share({ title: 'SomLuul Reel', text: current.content || 'Reel', url });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        onShowToast?.(so ? 'Link waa la copy-gareeyay' : 'Link copied', 'success');
      }
    } catch {
      /* user cancelled share */
    }
  };

  const likes = typeof current?.likes === 'number'
    ? current.likes
    : current?.reactions
      ? Object.values(current.reactions as Record<string, string[]>).reduce(
          (s, a) => s + (Array.isArray(a) ? a.length : 0),
          0
        )
      : Array.isArray(current?.likedBy)
        ? current.likedBy.length
        : 0;

  const comments: any[] = Array.isArray(current?.comments) ? current.comments : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[70vh] text-[var(--sl-text-muted)]">
        <Loader2 className="animate-spin text-[var(--somluul-primary)]" size={32} />
      </div>
    );
  }

  if (!reels.length) {
    return (
      <div className="max-w-md mx-auto p-6 pb-24">
        <div className="sl-empty rounded-2xl bg-[var(--sl-bg-card)] border border-[var(--sl-border)]">
          <div className="sl-empty-icon">
            <Film size={28} />
          </div>
          <p className="text-sm font-semibold text-[var(--sl-text-secondary)]">
            {so ? 'Reels ma jiraan weli' : 'No reels yet'}
          </p>
          <p className="text-xs text-[var(--sl-text-muted)] mt-1 mb-4">
            {so ? 'Soo geli video si aad u sameyso reel' : 'Upload a video to create the first reel'}
          </p>
          <button
            type="button"
            onClick={() => {
              if (!authToken) {
                onShowToast?.(so ? 'Fadlan soo gal' : 'Please log in', 'error');
                return;
              }
              setShowCreate(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold bg-[var(--somluul-primary)] text-white"
          >
            <Plus size={16} />
            {so ? 'Samee Reel' : 'Create Reel'}
          </button>
        </div>
        {showCreate && renderCreateModal()}
      </div>
    );
  }

  function renderCreateModal() {
    return (
      <div
        className="fixed inset-0 z-50 sl-modal-backdrop flex items-center justify-center p-4"
        onClick={() => !uploading && setShowCreate(false)}
      >
        <form
          onSubmit={submitReel}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md bg-[var(--sl-bg-elevated)] rounded-2xl p-5 border border-[var(--sl-border)] shadow-[var(--sl-shadow-xl)] space-y-3"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-[var(--sl-text)]">{so ? 'Samee Reel' : 'Create Reel'}</h3>
            <button type="button" onClick={() => setShowCreate(false)} className="p-1 rounded-lg hover:bg-[var(--sl-bg-hover)]">
              <X size={18} />
            </button>
          </div>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={2}
            placeholder={so ? 'Qoraal (ikhtiyaari)' : 'Caption (optional)'}
            className="w-full text-sm px-3 py-2 rounded-xl bg-[var(--sl-bg-muted)] border border-[var(--sl-border)] text-[var(--sl-text)] outline-none"
          />
          {videoData ? (
            <div className="relative rounded-xl overflow-hidden bg-black">
              <video src={videoData.url} controls className="w-full max-h-64 object-contain" />
              <button
                type="button"
                onClick={() => setVideoData(null)}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full py-8 rounded-xl border-2 border-dashed border-[var(--sl-border)] text-sm font-semibold text-[var(--sl-text-muted)] hover:border-[var(--somluul-primary)] hover:text-[var(--somluul-primary)]"
            >
              {so ? 'Dooro video' : 'Choose video'}
            </button>
          )}
          <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={onPickVideo} />
          <button
            type="submit"
            disabled={uploading || !videoData}
            className="w-full py-2.5 rounded-xl text-sm font-bold bg-[var(--somluul-primary)] text-white disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {uploading ? <Loader2 size={16} className="animate-spin" /> : null}
            {uploading ? (so ? 'Waa la soo gelinayaa...' : 'Uploading...') : so ? 'Daabac' : 'Publish'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="relative max-w-lg mx-auto h-[calc(100vh-7rem)] md:h-[calc(100vh-5rem)] bg-black rounded-none sm:rounded-2xl overflow-hidden">
      {/* Create button */}
      <button
        type="button"
        onClick={() => {
          if (!authToken) {
            onShowToast?.(so ? 'Fadlan soo gal' : 'Please log in', 'error');
            return;
          }
          setShowCreate(true);
        }}
        className="absolute top-3 left-3 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/50 text-white text-xs font-bold backdrop-blur-sm border border-white/20"
      >
        <Plus size={14} />
        {so ? 'Reel' : 'Create'}
      </button>

      {/* Mute */}
      <button
        type="button"
        onClick={() => setMuted((m) => !m)}
        className="absolute top-3 right-3 z-20 p-2 rounded-full bg-black/50 text-white backdrop-blur-sm"
      >
        {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
      </button>

      {/* Video */}
      <video
        ref={videoRef}
        key={current?.id || index}
        src={current?.videoUrl}
        className="w-full h-full object-contain bg-black"
        loop
        playsInline
        muted={muted}
        onClick={() => {
          const v = videoRef.current;
          if (!v) return;
          if (v.paused) v.play().catch(() => {});
          else v.pause();
        }}
      />

      {/* Side actions */}
      <div className="absolute right-3 bottom-28 z-20 flex flex-col items-center gap-4">
        <button type="button" onClick={() => react('like')} className="flex flex-col items-center gap-0.5 text-white">
          <div className={`p-2.5 rounded-full bg-black/40 ${current?.isLiked ? 'text-red-500' : ''}`}>
            <Heart size={26} className={current?.isLiked ? 'fill-current' : ''} />
          </div>
          <span className="text-[11px] font-bold drop-shadow">{likes || ''}</span>
        </button>
        <button
          type="button"
          onClick={() => setShowComments((s) => !s)}
          className="flex flex-col items-center gap-0.5 text-white"
        >
          <div className="p-2.5 rounded-full bg-black/40">
            <MessageCircle size={26} />
          </div>
          <span className="text-[11px] font-bold drop-shadow">{comments.length || ''}</span>
        </button>
        <button type="button" onClick={shareReel} className="flex flex-col items-center gap-0.5 text-white">
          <div className="p-2.5 rounded-full bg-black/40">
            <Share2 size={26} />
          </div>
          <span className="text-[11px] font-bold drop-shadow">Share</span>
        </button>
        <button type="button" onClick={() => go(-1)} className="p-2 rounded-full bg-black/40 text-white mt-2">
          <ChevronUp size={22} />
        </button>
        <button type="button" onClick={() => go(1)} className="p-2 rounded-full bg-black/40 text-white">
          <ChevronDown size={22} />
        </button>
      </div>

      {/* Caption / author */}
      <div className="absolute left-0 right-16 bottom-4 z-10 p-4 bg-gradient-to-t from-black/80 to-transparent">
        <button
          type="button"
          onClick={() => current?.author?.id && onViewProfile?.(current.author.id)}
          className="flex items-center gap-2 mb-1"
        >
          <div className="w-9 h-9 rounded-full overflow-hidden bg-white/20">
            {current?.author?.avatar ? (
              <img src={current.author.avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white text-sm font-bold">
                {(current?.author?.name || 'U').charAt(0)}
              </div>
            )}
          </div>
          <span className="text-white text-sm font-bold drop-shadow">{current?.author?.name || 'User'}</span>
        </button>
        {current?.content && (
          <p className="text-white text-sm drop-shadow line-clamp-3 whitespace-pre-wrap">{current.content}</p>
        )}
        <p className="text-white/60 text-[10px] mt-1">
          {index + 1} / {reels.length}
        </p>
      </div>

      {/* Comments panel */}
      {showComments && (
        <div className="absolute inset-x-0 bottom-0 z-30 max-h-[55%] bg-[var(--sl-bg-elevated)] rounded-t-2xl border-t border-[var(--sl-border)] flex flex-col shadow-[var(--sl-shadow-xl)]">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--sl-border)]">
            <h4 className="text-sm font-bold text-[var(--sl-text)]">
              {so ? 'Faallooyin' : 'Comments'} ({comments.length})
            </h4>
            <button type="button" onClick={() => setShowComments(false)} className="p-1 rounded-lg hover:bg-[var(--sl-bg-hover)]">
              <X size={18} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3 min-h-[120px]">
            {comments.length === 0 && (
              <p className="text-center text-xs text-[var(--sl-text-muted)] py-6">
                {so ? 'Weli faallo ma jirto' : 'No comments yet'}
              </p>
            )}
            {comments.map((c: any, i: number) => (
              <div key={c.id || i} className="flex gap-2">
                <div className="w-8 h-8 rounded-full overflow-hidden bg-[var(--sl-bg-muted)] shrink-0">
                  {c.author?.avatar || c.avatar ? (
                    <img src={c.author?.avatar || c.avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs font-bold text-[var(--sl-text-muted)]">
                      {(c.author?.name || c.authorName || c.name || 'U').charAt(0)}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-[var(--sl-text)]">
                    {c.author?.name || c.authorName || c.name || 'User'}
                  </p>
                  <p className="text-sm text-[var(--sl-text-secondary)] whitespace-pre-wrap">{c.content || c.text}</p>
                </div>
              </div>
            ))}
          </div>
          <form onSubmit={submitComment} className="p-3 border-t border-[var(--sl-border)] flex gap-2">
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder={so ? 'Qor faallo...' : 'Write a comment...'}
              className="flex-1 text-sm px-3 py-2 rounded-full bg-[var(--sl-bg-muted)] border border-transparent focus:border-[var(--somluul-primary)] text-[var(--sl-text)] outline-none"
            />
            <button
              type="submit"
              disabled={commenting || !commentText.trim()}
              className="p-2.5 rounded-full bg-[var(--somluul-primary)] text-white disabled:opacity-50"
            >
              {commenting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </form>
        </div>
      )}

      {showCreate && renderCreateModal()}
    </div>
  );
};
