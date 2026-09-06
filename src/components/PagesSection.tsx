import React, { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useLanguage } from './LanguageContext';
import { uploadMediaFile } from '../lib/scaleClient';
import {
  Flag,
  Plus,
  Users,
  Search,
  ArrowLeft,
  Image as ImageIcon,
  Heart,
  MessageCircle,
  Share2,
  MoreHorizontal,
  Camera,
  Globe,
  Check,
  X,
  Send,
  Loader2,
} from 'lucide-react';

interface Props {
  user?: any;
  authToken?: string;
  onShowToast?: (m: string, t: 'success' | 'error') => void;
  onViewProfile?: (id: string) => void;
}

type Page = {
  id: string;
  name: string;
  username?: string;
  category?: string;
  description?: string;
  avatar?: string | null;
  cover_photo?: string | null;
  ownerId?: string;
  admins?: string[];
  followers?: string[];
  followersCount?: number;
  created_at?: string;
  status?: string;
};

type PagePost = {
  id: string;
  content?: string;
  mediaType?: string;
  mediaUrl?: string | null;
  mediaList?: { url?: string; type?: string }[];
  author?: { id?: string; name?: string; avatar?: string | null; handle?: string; isPage?: boolean };
  likes?: number;
  comments?: any[];
  shares?: number;
  likedBy?: string[];
  reactions?: Record<string, string[]>;
  isLiked?: boolean;
  pageId?: string;
  created_at?: string;
};

/** Full public Pages — create, browse, open, post text/image, like, follow */
export const PagesSection: React.FC<Props> = ({ user, authToken, onShowToast }) => {
  const { language } = useLanguage();
  const so = language === 'so';

  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Business');
  const [description, setDescription] = useState('');
  const [username, setUsername] = useState('');
  const [creating, setCreating] = useState(false);

  const [activePage, setActivePage] = useState<Page | null>(null);
  const [pagePosts, setPagePosts] = useState<PagePost[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  const [postText, setPostText] = useState('');
  const [postMedia, setPostMedia] = useState<{ url: string; type: string } | null>(null);
  const [posting, setPosting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [commentOpenId, setCommentOpenId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [commenting, setCommenting] = useState(false);

  const isAdminOf = (page: Page | null) => {
    if (!page || !user?.id) return false;
    return page.ownerId === user.id || (Array.isArray(page.admins) && page.admins.includes(user.id));
  };

  const isFollowing = (page: Page | null) => {
    if (!page || !user?.id) return false;
    return Array.isArray(page.followers) && page.followers.includes(user.id);
  };

  const load = useCallback(async (query?: string) => {
    setLoading(true);
    try {
      const res = await axios.get('/api/pages', { params: query ? { q: query } : {} });
      setPages(Array.isArray(res.data) ? res.data : []);
    } catch {
      setPages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openPage = async (page: Page) => {
    setActivePage(page);
    setDetailLoading(true);
    setPostsLoading(true);
    try {
      const [pageRes, postsRes] = await Promise.all([
        axios.get(`/api/pages/${page.id}`),
        axios.get('/api/posts', {
          params: { pageId: page.id, limit: 50 },
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        }),
      ]);
      setActivePage(pageRes.data);
      const list = Array.isArray(postsRes.data) ? postsRes.data : (postsRes.data?.data || postsRes.data?.posts || []);
      setPagePosts(list);
    } catch {
      onShowToast?.(so ? 'Page lama helin' : 'Could not load page', 'error');
    } finally {
      setDetailLoading(false);
      setPostsLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authToken) {
      onShowToast?.(so ? 'Fadlan soo gal' : 'Please log in', 'error');
      return;
    }
    if (!name.trim()) return;
    setCreating(true);
    try {
      const res = await axios.post(
        '/api/pages',
        { name: name.trim(), category, description, username: username.trim() || undefined },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      setShowCreate(false);
      setName('');
      setDescription('');
      setUsername('');
      onShowToast?.(so ? 'Page waa la sameeyay' : 'Page created', 'success');
      await load();
      if (res.data?.id) openPage(res.data);
    } catch (err: any) {
      onShowToast?.(err?.response?.data?.error || (so ? 'Waa fashilantay' : 'Failed'), 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleFollow = async (pageId: string) => {
    if (!authToken) {
      onShowToast?.(so ? 'Fadlan soo gal' : 'Please log in', 'error');
      return;
    }
    try {
      const res = await axios.post(
        `/api/pages/${pageId}/follow`,
        {},
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      const updated = res.data?.page;
      const followersCount = res.data?.followersCount;
      const following = res.data?.following;
      setPages((prev) =>
        prev.map((p) =>
          p.id === pageId
            ? {
                ...p,
                ...(updated || {}),
                followersCount: followersCount ?? p.followersCount,
                followers: updated?.followers ?? p.followers,
              }
            : p
        )
      );
      if (activePage?.id === pageId) {
        setActivePage((prev) =>
          prev
            ? {
                ...prev,
                ...(updated || {}),
                followersCount: followersCount ?? prev.followersCount,
                followers: updated?.followers ?? prev.followers,
              }
            : prev
        );
      }
      onShowToast?.(
        following
          ? so
            ? 'Waad follow gareysay'
            : 'Following'
          : so
            ? 'Follow waa laga noqday'
            : 'Unfollowed',
        'success'
      );
    } catch (err: any) {
      onShowToast?.(err?.response?.data?.error || 'Failed', 'error');
    }
  };

  const onPickMedia = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      onShowToast?.(so ? 'Fadlan dooro sawir ama video' : 'Please choose an image or video', 'error');
      return;
    }
    try {
      const uploadedUrl = await uploadMediaFile(file);
      if (!uploadedUrl) throw new Error('Media upload returned no URL');
      setPostMedia({
        url: uploadedUrl,
        type: file.type.startsWith('video/') ? 'video' : 'image',
      });
    } catch (err) {
      console.error('Error uploading page media:', err);
      onShowToast?.(so ? 'Sawirka lama rarin' : 'Media upload failed', 'error');
    } finally {
      e.target.value = '';
    };
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePage || !authToken) return;
    if (!postText.trim() && !postMedia) {
      onShowToast?.(so ? 'Qor qoraal ama soo geli sawir' : 'Write text or add media', 'error');
      return;
    }
    setPosting(true);
    try {
      const body: any = {
        content: postText.trim(),
        pageId: activePage.id,
        mediaType: postMedia ? postMedia.type : 'text',
      };
      if (postMedia) {
        body.mediaUrl = postMedia.url;
        body.mediaList = [{ url: postMedia.url, type: postMedia.type }];
      }
      const res = await axios.post('/api/posts', body, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      setPagePosts((prev) => [res.data, ...prev]);
      setPostText('');
      setPostMedia(null);
      onShowToast?.(so ? 'Post waa la diray' : 'Post published', 'success');
    } catch (err: any) {
      onShowToast?.(err?.response?.data?.error || (so ? 'Post waa fashilmay' : 'Post failed'), 'error');
    } finally {
      setPosting(false);
    }
  };

  const handleLike = async (postId: string) => {
    if (!authToken) {
      onShowToast?.(so ? 'Fadlan soo gal' : 'Please log in', 'error');
      return;
    }
    try {
      const res = await axios.post(
        `/api/posts/${postId}/like`,
        { type: 'like' },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      const updated = res.data;
      setPagePosts((prev) =>
        prev.map((p) => {
          if (p.id !== postId) return p;
          if (updated && typeof updated === 'object' && updated.id) {
            return { ...p, ...updated };
          }
          const liked = !p.isLiked;
          const likes = Math.max(0, (p.likes || 0) + (liked ? 1 : -1));
          return { ...p, isLiked: liked, likes };
        })
      );
    } catch (err: any) {
      onShowToast?.(err?.response?.data?.error || 'Failed', 'error');
    }
  };

  const submitPageComment = async (postId: string) => {
    if (!authToken || !commentText.trim()) return;
    setCommenting(true);
    try {
      const res = await axios.post(
        `/api/posts/${postId}/comment`,
        { content: commentText.trim() },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      const data = res.data;
      setPagePosts((prev) =>
        prev.map((p) => {
          if (p.id !== postId) return p;
          if (data?.comments) return { ...p, ...data };
          if (data?.id && data?.content) {
            const comments = Array.isArray(p.comments) ? [...p.comments, data] : [data];
            return { ...p, comments };
          }
          return p;
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

  const startEdit = () => {
    if (!activePage) return;
    setEditName(activePage.name || '');
    setEditDesc(activePage.description || '');
    setEditCategory(activePage.category || 'Business');
    setEditing(true);
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePage || !authToken) return;
    setSavingEdit(true);
    try {
      const res = await axios.patch(
        `/api/pages/${activePage.id}`,
        { name: editName.trim(), description: editDesc, category: editCategory },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      setActivePage(res.data);
      setPages((prev) => prev.map((p) => (p.id === res.data.id ? { ...p, ...res.data } : p)));
      setEditing(false);
      onShowToast?.(so ? 'Page waa la cusbooneysiiyay' : 'Page updated', 'success');
    } catch (err: any) {
      onShowToast?.(err?.response?.data?.error || 'Failed', 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  const updatePageMedia = async (field: 'avatar' | 'cover_photo', dataUrl: string) => {
    if (!activePage || !authToken) return;
    try {
      const res = await axios.patch(
        `/api/pages/${activePage.id}`,
        { [field]: dataUrl },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      setActivePage(res.data);
      setPages((prev) => prev.map((p) => (p.id === res.data.id ? { ...p, ...res.data } : p)));
      onShowToast?.(so ? 'Sawirka waa la kaydiyay' : 'Photo saved', 'success');
    } catch (err: any) {
      onShowToast?.(err?.response?.data?.error || 'Failed', 'error');
    }
  };

  const onCoverPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => updatePageMedia('cover_photo', String(reader.result));
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const onAvatarPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => updatePageMedia('avatar', String(reader.result));
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const formatTime = (iso?: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return so ? 'Hadda' : 'Just now';
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    const days = Math.floor(h / 24);
    if (days < 7) return `${days}d`;
    return d.toLocaleDateString();
  };

  const reactionCount = (post: PagePost) => {
    if (typeof post.likes === 'number' && post.likes > 0) return post.likes;
    if (post.reactions) {
      return Object.values(post.reactions).reduce((s, arr) => s + (Array.isArray(arr) ? arr.length : 0), 0);
    }
    return Array.isArray(post.likedBy) ? post.likedBy.length : 0;
  };

  if (activePage) {
    const admin = isAdminOf(activePage);
    const following = isFollowing(activePage);

    return (
      <div className="max-w-3xl mx-auto w-full pb-24 md:pb-8">
        <div className="sticky top-14 z-30 bg-[var(--sl-bg)]/90 backdrop-blur-md border-b border-[var(--sl-border)] px-3 py-2 flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setActivePage(null);
              setPagePosts([]);
              setPostText('');
              setPostMedia(null);
              setEditing(false);
            }}
            className="p-2 rounded-xl hover:bg-[var(--sl-bg-hover)] text-[var(--sl-text)] transition-colors"
            aria-label="Back"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-sm font-bold text-[var(--sl-text)] truncate">{activePage.name}</h1>
            <p className="text-[11px] text-[var(--sl-text-muted)]">
              {activePage.followersCount || 0} followers
            </p>
          </div>
        </div>

        {detailLoading ? (
          <div className="p-8 flex justify-center">
            <Loader2 className="animate-spin text-[var(--somluul-primary)]" size={28} />
          </div>
        ) : (
          <>
            <div className="relative w-full h-44 sm:h-56 bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-500">
              {activePage.cover_photo ? (
                <img src={activePage.cover_photo} alt="" className="w-full h-full object-cover" />
              ) : null}
              {admin && (
                <label className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/55 text-white text-xs font-semibold cursor-pointer hover:bg-black/70">
                  <Camera size={14} />
                  {so ? 'Cover' : 'Edit cover'}
                  <input type="file" accept="image/*" className="hidden" onChange={onCoverPick} />
                </label>
              )}
            </div>

            <div className="px-4 -mt-12 relative z-10">
              <div className="flex items-end gap-3">
                <div className="relative">
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-[var(--sl-bg)] bg-[var(--sl-bg-muted)] overflow-hidden shadow-md">
                    {activePage.avatar ? (
                      <img src={activePage.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-500 to-violet-600 text-white text-3xl font-black">
                        {(activePage.name || 'P').charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  {admin && (
                    <label className="absolute bottom-1 right-1 w-8 h-8 rounded-full bg-[var(--sl-bg-elevated)] border border-[var(--sl-border)] flex items-center justify-center cursor-pointer shadow">
                      <Camera size={14} className="text-[var(--sl-text-secondary)]" />
                      <input type="file" accept="image/*" className="hidden" onChange={onAvatarPick} />
                    </label>
                  )}
                </div>
                <div className="flex-1 min-w-0 pb-1">
                  <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--sl-text)] truncate flex items-center gap-1.5">
                    {activePage.name}
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--somluul-primary)] text-white">
                      <Check size={12} strokeWidth={3} />
                    </span>
                  </h2>
                  {activePage.username && (
                    <p className="text-sm text-[var(--sl-text-muted)]">@{activePage.username}</p>
                  )}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-[var(--sl-text-secondary)]">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--sl-bg-muted)] text-xs font-semibold">
                  <Flag size={12} />
                  {activePage.category || 'Page'}
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-medium">
                  <Users size={14} />
                  <strong className="text-[var(--sl-text)]">{activePage.followersCount || 0}</strong>
                  &nbsp;followers
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-[var(--sl-text-muted)]">
                  <Globe size={12} />
                  {so ? 'Dadweynaha oo dhan' : 'Public page'}
                </span>
              </div>

              {activePage.description && (
                <p className="mt-2 text-sm text-[var(--sl-text-secondary)] leading-relaxed whitespace-pre-wrap">
                  {activePage.description}
                </p>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                {!admin && (
                  <button
                    type="button"
                    onClick={() => handleFollow(activePage.id)}
                    className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${
                      following
                        ? 'bg-[var(--sl-bg-muted)] text-[var(--sl-text)] border border-[var(--sl-border)]'
                        : 'bg-[var(--somluul-primary)] text-white shadow-md shadow-indigo-500/25'
                    }`}
                  >
                    {following ? (so ? 'Following' : 'Following') : so ? 'Follow' : 'Follow'}
                  </button>
                )}
                {admin && (
                  <button
                    type="button"
                    onClick={startEdit}
                    className="px-5 py-2 rounded-xl text-sm font-bold bg-[var(--sl-bg-muted)] text-[var(--sl-text)] border border-[var(--sl-border)] hover:bg-[var(--sl-bg-hover)]"
                  >
                    {so ? 'Edit page' : 'Edit page'}
                  </button>
                )}
              </div>
            </div>

            {editing && (
              <div
                className="fixed inset-0 z-50 sl-modal-backdrop flex items-center justify-center p-4"
                onClick={() => setEditing(false)}
              >
                <form
                  onSubmit={saveEdit}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full max-w-md bg-[var(--sl-bg-elevated)] rounded-2xl p-5 shadow-[var(--sl-shadow-xl)] border border-[var(--sl-border)] space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-[var(--sl-text)]">{so ? 'Edit page' : 'Edit page'}</h3>
                    <button type="button" onClick={() => setEditing(false)} className="p-1 rounded-lg hover:bg-[var(--sl-bg-hover)]">
                      <X size={18} />
                    </button>
                  </div>
                  <input
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder={so ? 'Magaca' : 'Name'}
                    className="w-full text-sm px-3 py-2.5 rounded-xl border border-[var(--sl-border)] bg-[var(--sl-bg-muted)] text-[var(--sl-text)]"
                  />
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full text-sm px-3 py-2.5 rounded-xl border border-[var(--sl-border)] bg-[var(--sl-bg-muted)] text-[var(--sl-text)]"
                  >
                    {['Business', 'Public Figure', 'Brand', 'Community', 'Entertainment', 'News', 'Education', 'Other'].map(
                      (c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      )
                    )}
                  </select>
                  <textarea
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    rows={3}
                    placeholder={so ? 'Sharaxaad' : 'Description'}
                    className="w-full text-sm px-3 py-2.5 rounded-xl border border-[var(--sl-border)] bg-[var(--sl-bg-muted)] text-[var(--sl-text)]"
                  />
                  <button
                    type="submit"
                    disabled={savingEdit}
                    className="w-full py-2.5 rounded-xl text-sm font-bold bg-[var(--somluul-primary)] text-white disabled:opacity-60"
                  >
                    {savingEdit ? (so ? 'Waa la kaydinayaa...' : 'Saving...') : so ? 'Kaydi' : 'Save'}
                  </button>
                </form>
              </div>
            )}

            {admin && authToken && (
              <form
                onSubmit={handleCreatePost}
                className="mx-3 mt-5 p-4 rounded-2xl bg-[var(--sl-bg-card)] border border-[var(--sl-border)] shadow-[var(--sl-shadow-sm)] space-y-3"
              >
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 bg-[var(--sl-bg-muted)]">
                    {activePage.avatar ? (
                      <img src={activePage.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-indigo-500 text-white font-bold">
                        {(activePage.name || 'P').charAt(0)}
                      </div>
                    )}
                  </div>
                  <textarea
                    value={postText}
                    onChange={(e) => setPostText(e.target.value)}
                    rows={2}
                    placeholder={
                      so
                        ? `Maxaad la wadaagaysaa ${activePage.name}?`
                        : `What's on your mind, ${activePage.name}?`
                    }
                    className="flex-1 text-sm px-3 py-2 rounded-xl bg-[var(--sl-bg-muted)] border border-transparent focus:border-[var(--somluul-primary)] focus:ring-2 focus:ring-indigo-500/20 text-[var(--sl-text)] resize-none outline-none"
                  />
                </div>
                {postMedia && (
                  <div className="relative rounded-xl overflow-hidden border border-[var(--sl-border)]">
                    {postMedia.type === 'video' ? (
                      <video src={postMedia.url} controls className="w-full max-h-64 object-contain bg-black" />
                    ) : (
                      <img src={postMedia.url} alt="" className="w-full max-h-64 object-cover" />
                    )}
                    <button
                      type="button"
                      onClick={() => setPostMedia(null)}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-[var(--sl-border-subtle)]">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                    >
                      <ImageIcon size={16} />
                      {so ? 'Sawir / Video' : 'Photo/Video'}
                    </button>
                    <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={onPickMedia} />
                  </div>
                  <button
                    type="submit"
                    disabled={posting || (!postText.trim() && !postMedia)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[var(--somluul-primary)] text-white disabled:opacity-50 shadow-sm"
                  >
                    {posting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    {so ? 'Post' : 'Post'}
                  </button>
                </div>
              </form>
            )}

            <div className="mt-4 space-y-3 px-0 sm:px-3">
              <h3 className="px-4 sm:px-0 text-sm font-bold text-[var(--sl-text)]">Posts</h3>

              {postsLoading && (
                <div className="p-8 flex justify-center">
                  <Loader2 className="animate-spin text-[var(--somluul-primary)]" size={24} />
                </div>
              )}

              {!postsLoading && pagePosts.length === 0 && (
                <div className="sl-empty mx-3 sm:mx-0 rounded-2xl bg-[var(--sl-bg-card)] border border-[var(--sl-border)]">
                  <div className="sl-empty-icon">
                    <Flag size={28} />
                  </div>
                  <p className="text-sm font-semibold text-[var(--sl-text-secondary)]">
                    {so ? 'Weli post ma jiro' : 'No posts yet'}
                  </p>
                  <p className="text-xs text-[var(--sl-text-muted)] mt-1">
                    {admin
                      ? so
                        ? 'Samee postka ugu horreeya ee page-kan'
                        : 'Create the first post for this page'
                      : so
                        ? 'Soo laabo marka page-ku qoro'
                        : 'Check back when this page posts'}
                  </p>
                </div>
              )}

              {pagePosts.map((post) => (
                <article
                  key={post.id}
                  className="bg-[var(--sl-bg-card)] border border-[var(--sl-border)] sm:rounded-2xl overflow-hidden shadow-[var(--sl-shadow-sm)]"
                >
                  <div className="p-3 sm:p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-[var(--sl-bg-muted)] shrink-0">
                      {post.author?.avatar || activePage.avatar ? (
                        <img
                          src={post.author?.avatar || activePage.avatar || ''}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-indigo-500 text-white font-bold text-sm">
                          {(post.author?.name || activePage.name || 'P').charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-[var(--sl-text)] truncate flex items-center gap-1">
                        {post.author?.name || activePage.name}
                        <span className="inline-flex w-4 h-4 rounded-full bg-[var(--somluul-primary)] text-white items-center justify-center">
                          <Check size={10} strokeWidth={3} />
                        </span>
                      </p>
                      <p className="text-[11px] text-[var(--sl-text-muted)]">{formatTime(post.created_at)}</p>
                    </div>
                    <button type="button" className="p-1.5 rounded-lg hover:bg-[var(--sl-bg-hover)] text-[var(--sl-text-muted)]">
                      <MoreHorizontal size={18} />
                    </button>
                  </div>

                  {post.content && (
                    <p className="px-3 sm:px-4 pb-2 text-sm text-[var(--sl-text)] whitespace-pre-wrap leading-relaxed">
                      {post.content}
                    </p>
                  )}

                  {(post.mediaUrl || (post.mediaList && post.mediaList[0]?.url)) && (
                    <div className="w-full bg-black/5 dark:bg-black/30">
                      {post.mediaType === 'video' ||
                      (post.mediaList?.[0]?.type || '').includes('video') ? (
                        <video
                          src={post.mediaUrl || post.mediaList?.[0]?.url}
                          controls
                          className="w-full max-h-[480px] object-contain bg-black"
                        />
                      ) : (
                        <img
                          src={post.mediaUrl || post.mediaList?.[0]?.url}
                          alt=""
                          className="w-full max-h-[520px] object-contain"
                        />
                      )}
                    </div>
                  )}

                  {(reactionCount(post) > 0 || (post.comments && post.comments.length > 0)) && (
                    <div className="px-3 sm:px-4 py-2 flex items-center justify-between text-xs text-[var(--sl-text-muted)] border-b border-[var(--sl-border-subtle)]">
                      <span>{reactionCount(post) > 0 && <>👍 {reactionCount(post)}</>}</span>
                      <span>
                        {post.comments && post.comments.length > 0
                          ? `${post.comments.length} ${so ? 'faallo' : 'comments'}`
                          : ''}
                      </span>
                    </div>
                  )}

                  <div className="px-2 py-1 flex items-center">
                    <button
                      type="button"
                      onClick={() => handleLike(post.id)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                        post.isLiked
                          ? 'text-[var(--somluul-primary)]'
                          : 'text-[var(--sl-text-secondary)] hover:bg-[var(--sl-bg-hover)]'
                      }`}
                    >
                      <Heart size={18} className={post.isLiked ? 'fill-current' : ''} />
                      Like
                    </button>
                    <button
                      type="button"
                      onClick={() => setCommentOpenId(commentOpenId === post.id ? null : post.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-semibold text-[var(--sl-text-secondary)] hover:bg-[var(--sl-bg-hover)]"
                    >
                      <MessageCircle size={18} />
                      {so ? 'Faallo' : 'Comment'}
                    </button>
                    <button
                      type="button"
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-semibold text-[var(--sl-text-secondary)] hover:bg-[var(--sl-bg-hover)]"
                    >
                      <Share2 size={18} />
                      Share
                    </button>
                  </div>
                  {commentOpenId === post.id && (
                    <div className="px-3 sm:px-4 pb-3 border-t border-[var(--sl-border-subtle)] space-y-2">
                      {(Array.isArray(post.comments) ? post.comments : []).map((c: any, ci: number) => (
                        <div key={c.id || ci} className="flex gap-2 pt-2">
                          <div className="w-7 h-7 rounded-full bg-[var(--sl-bg-muted)] flex items-center justify-center text-[10px] font-bold text-[var(--sl-text-muted)] shrink-0">
                            {(c.author?.name || c.authorName || c.name || 'U').charAt(0)}
                          </div>
                          <div>
                            <p className="text-[11px] font-bold text-[var(--sl-text)]">{c.author?.name || c.authorName || c.name || 'User'}</p>
                            <p className="text-sm text-[var(--sl-text-secondary)]">{c.content || c.text}</p>
                          </div>
                        </div>
                      ))}
                      <form
                        onSubmit={(e) => { e.preventDefault(); submitPageComment(post.id); }}
                        className="flex gap-2 pt-1"
                      >
                        <input
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          placeholder={so ? 'Qor faallo...' : 'Write a comment...'}
                          className="flex-1 text-sm px-3 py-2 rounded-full bg-[var(--sl-bg-muted)] text-[var(--sl-text)] outline-none border border-transparent focus:border-[var(--somluul-primary)]"
                        />
                        <button
                          type="submit"
                          disabled={commenting || !commentText.trim()}
                          className="px-3 py-2 rounded-full text-xs font-bold bg-[var(--somluul-primary)] text-white disabled:opacity-50"
                        >
                          {so ? 'Dir' : 'Send'}
                        </button>
                      </form>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-3 sm:p-4 space-y-4 pb-24 md:pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-[var(--sl-text)] flex items-center gap-2">
            <Flag className="text-[var(--somluul-primary)]" size={22} />
            Pages
          </h1>
          <p className="text-xs text-[var(--sl-text-muted)] mt-0.5">
            {so
              ? 'Samee page, post qor, sawir geli, follow samee'
              : 'Create pages, post updates, follow brands & communities'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (!authToken) {
              onShowToast?.(so ? 'Fadlan soo gal' : 'Please log in', 'error');
              return;
            }
            setShowCreate(true);
          }}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold bg-[var(--somluul-primary)] text-white shadow-md shadow-indigo-500/20 hover:brightness-110"
        >
          <Plus size={18} />
          {so ? 'Samee Page' : 'Create Page'}
        </button>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--sl-text-muted)]" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') load(q.trim());
          }}
          placeholder={so ? 'Raadi pages...' : 'Search pages...'}
          className="w-full pl-10 pr-20 py-2.5 rounded-xl bg-[var(--sl-bg-muted)] border border-transparent focus:border-[var(--somluul-primary)] focus:ring-2 focus:ring-indigo-500/15 text-sm text-[var(--sl-text)] outline-none"
        />
        <button
          type="button"
          onClick={() => load(q.trim())}
          className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 rounded-lg text-xs font-bold bg-[var(--somluul-primary)] text-white"
        >
          {so ? 'Raadi' : 'Search'}
        </button>
      </div>

      {loading ? (
        <div className="py-16 flex justify-center">
          <Loader2 className="animate-spin text-[var(--somluul-primary)]" size={28} />
        </div>
      ) : pages.length === 0 ? (
        <div className="sl-empty rounded-2xl bg-[var(--sl-bg-card)] border border-[var(--sl-border)]">
          <div className="sl-empty-icon">
            <Flag size={28} />
          </div>
          <p className="text-sm font-semibold text-[var(--sl-text-secondary)]">
            {so ? 'Pages lama helin' : 'No pages found'}
          </p>
          <p className="text-xs text-[var(--sl-text-muted)] mt-1 mb-3">
            {so ? 'Samee page-kaaga ugu horreeya' : 'Create your first page'}
          </p>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-[var(--somluul-primary)] text-white"
          >
            {so ? 'Samee Page' : 'Create Page'}
          </button>
        </div>
      ) : (
        <div className="grid gap-3">
          {pages.map((page) => (
            <div
              key={page.id}
              className="flex items-center gap-3 p-3 sm:p-4 rounded-2xl bg-[var(--sl-bg-card)] border border-[var(--sl-border)] shadow-[var(--sl-shadow-sm)] hover:shadow-[var(--sl-shadow-md)] transition-shadow cursor-pointer"
              onClick={() => openPage(page)}
            >
              <div className="w-14 h-14 rounded-full overflow-hidden bg-[var(--sl-bg-muted)] shrink-0 border border-[var(--sl-border)]">
                {page.avatar ? (
                  <img src={page.avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-500 to-violet-600 text-white text-lg font-black">
                    {(page.name || 'P').charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-[var(--sl-text)] truncate flex items-center gap-1">
                  {page.name}
                  <span className="inline-flex w-4 h-4 rounded-full bg-[var(--somluul-primary)] text-white items-center justify-center">
                    <Check size={10} strokeWidth={3} />
                  </span>
                </p>
                <p className="text-xs text-[var(--sl-text-muted)] truncate">
                  {page.category || 'Page'}
                  {page.username ? ` · @${page.username}` : ''}
                </p>
                <p className="text-[11px] text-[var(--sl-text-muted)] mt-0.5">
                  {page.followersCount || 0} followers
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleFollow(page.id);
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 ${
                  isFollowing(page)
                    ? 'bg-[var(--sl-bg-muted)] text-[var(--sl-text)] border border-[var(--sl-border)]'
                    : 'bg-[var(--somluul-primary)] text-white hover:brightness-110'
                }`}
              >
                {isFollowing(page) ? 'Following' : so ? 'Follow' : 'Follow'}
              </button>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <div
          className="fixed inset-0 z-50 sl-modal-backdrop flex items-center justify-center p-4"
          onClick={() => setShowCreate(false)}
        >
          <form
            onSubmit={handleCreate}
            onClick={(e) => e.stopPropagation()}
            className="bg-[var(--sl-bg-elevated)] rounded-2xl p-5 w-full max-w-md space-y-3 shadow-[var(--sl-shadow-xl)] border border-[var(--sl-border)]"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-black text-[var(--sl-text)]">
                {so ? 'Samee Page cusub' : 'Create a Page'}
              </h3>
              <button type="button" onClick={() => setShowCreate(false)} className="p-1 rounded-lg hover:bg-[var(--sl-bg-hover)]">
                <X size={18} />
              </button>
            </div>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={so ? 'Magaca page-ka' : 'Page name'}
              className="w-full text-sm px-3 py-2.5 rounded-xl border border-[var(--sl-border)] bg-[var(--sl-bg-muted)] text-[var(--sl-text)]"
            />
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="username (optional)"
              className="w-full text-sm px-3 py-2.5 rounded-xl border border-[var(--sl-border)] bg-[var(--sl-bg-muted)] text-[var(--sl-text)]"
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full text-sm px-3 py-2.5 rounded-xl border border-[var(--sl-border)] bg-[var(--sl-bg-muted)] text-[var(--sl-text)]"
            >
              {['Business', 'Public Figure', 'Brand', 'Community', 'Entertainment', 'News', 'Education', 'Other'].map(
                (c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                )
              )}
            </select>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={so ? 'Sharaxaad' : 'Description'}
              rows={3}
              className="w-full text-sm px-3 py-2.5 rounded-xl border border-[var(--sl-border)] bg-[var(--sl-bg-muted)] text-[var(--sl-text)]"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-[var(--sl-bg-muted)] text-[var(--sl-text)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-[var(--somluul-primary)] text-white disabled:opacity-60"
              >
                {creating ? '...' : so ? 'Samee' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
