import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Users, Plus, LogOut, LogIn, Lock, Globe, EyeOff, ArrowLeft, Heart, Send, Image as ImageIcon, X } from 'lucide-react';
import { assertCleanFile, assertCleanContent } from '../lib/contentSafety';
import { useLanguage } from './LanguageContext';

interface Props {
  user?: any;
  authToken?: string;
  onShowToast?: (m: string, t: 'success' | 'error') => void;
}

export const GroupsSection: React.FC<Props> = ({ user, authToken, onShowToast }) => {
  const { language } = useLanguage();
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [privacy, setPrivacy] = useState<'public' | 'private' | 'hidden'>('public');
  const [creating, setCreating] = useState(false);
  const [activeGroup, setActiveGroup] = useState<any | null>(null);
  const [groupPosts, setGroupPosts] = useState<any[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postText, setPostText] = useState('');
  const [posting, setPosting] = useState(false);
  const [postMedia, setPostMedia] = useState<{ url: string; type: 'image' | 'video' } | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [inviteUsername, setInviteUsername] = useState('');
  const [inviting, setInviting] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [showMembers, setShowMembers] = useState(false);
  const [editingGroup, setEditingGroup] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editRules, setEditRules] = useState('');
  const [savingGroup, setSavingGroup] = useState(false);

  const load = async () => {
    if (!authToken) return;
    setLoading(true);
    try {
      const res = await axios.get('/api/groups', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      setGroups(Array.isArray(res.data) ? res.data : []);
    } catch {
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [authToken]);

  const openGroup = async (g: any) => {
    setActiveGroup(g);
    setPostsLoading(true);
    try {
      const res = await axios.get(`/api/groups/${g.id}/posts`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      setGroupPosts(Array.isArray(res.data) ? res.data : []);
    } catch (err: any) {
      setGroupPosts([]);
      if (err?.response?.status === 403) {
        onShowToast?.(language === 'so' ? 'Ku biir si aad u aragto posts' : 'Join to see posts', 'error');
      }
    } finally {
      setPostsLoading(false);
    }
  };

  const createGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !authToken) return;
    setCreating(true);
    try {
      const res = await axios.post('/api/groups', { name, description, privacy }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      setGroups(prev => [res.data, ...prev]);
      setName('');
      setDescription('');
      onShowToast?.(language === 'so' ? 'Kooxda waa la sameeyay!' : 'Group created!', 'success');
      openGroup(res.data);
    } catch (err: any) {
      onShowToast?.(err?.response?.data?.error || 'Failed', 'error');
    } finally {
      setCreating(false);
    }
  };

  const join = async (id: string) => {
    try {
      const res = await axios.post(`/api/groups/${id}/join`, {}, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const g = res.data.group || res.data;
      setGroups(prev => prev.map(x => x.id === id ? g : x));
      if (activeGroup?.id === id) {
        setActiveGroup(g);
        openGroup(g);
      }
      onShowToast?.(language === 'so' ? 'Waad ku biirtay!' : 'Joined!', 'success');
    } catch (err: any) {
      onShowToast?.(err?.response?.data?.error || 'Join failed', 'error');
    }
  };

  const leave = async (id: string) => {
    try {
      await axios.post(`/api/groups/${id}/leave`, {}, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      setGroups(prev => prev.map(g => {
        if (g.id !== id) return g;
        return { ...g, members: (g.members || []).filter((m: string) => m !== user?.id) };
      }));
      if (activeGroup?.id === id) {
        setActiveGroup(prev => prev ? { ...prev, members: (prev.members || []).filter((m: string) => m !== user?.id) } : null);
      }
      onShowToast?.(language === 'so' ? 'Waad ka baxday' : 'Left group', 'success');
    } catch (err: any) {
      onShowToast?.(err?.response?.data?.error || 'Leave failed', 'error');
    }
  };

  const attachMedia = async (file: File) => {
    if (!authToken) return;
    const safety = assertCleanFile(file, language);
    if (!safety.ok) {
      onShowToast?.(safety.message, 'error');
      return;
    }
    const isVideo = file.type.startsWith('video');
    const max = isVideo ? 1024 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > max) {
      onShowToast?.(language === 'so' ? 'Faylka waa weyn yahay' : 'File too large', 'error');
      return;
    }
    setUploadingMedia(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await axios.post('/api/files/upload', fd, {
        headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'multipart/form-data' }
      });
      const url = res.data?.public_url || res.data?.url;
      if (!url) throw new Error('No url');
      setPostMedia({ url, type: isVideo ? 'video' : 'image' });
    } catch (err: any) {
      onShowToast?.(err?.response?.data?.error || (language === 'so' ? 'Upload way fashilantay' : 'Upload failed'), 'error');
    } finally {
      setUploadingMedia(false);
    }
  };

  const submitPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGroup || (!postText.trim() && !postMedia)) return;
    const clean = assertCleanContent(language, postText);
    if (!clean.ok) {
      onShowToast?.(clean.message, 'error');
      return;
    }
    setPosting(true);
    try {
      const res = await axios.post(`/api/groups/${activeGroup.id}/posts`, {
        content: postText.trim(),
        mediaUrl: postMedia?.url || null,
        mediaType: postMedia ? postMedia.type : 'text'
      }, { headers: { Authorization: `Bearer ${authToken}` } });
      setGroupPosts(prev => [res.data, ...prev]);
      setPostText('');
      setPostMedia(null);
      onShowToast?.(language === 'so' ? 'Post-ka waa la diray' : 'Posted', 'success');
    } catch (err: any) {
      onShowToast?.(err?.response?.data?.error || 'Post failed', 'error');
    } finally {
      setPosting(false);
    }
  };

  const deleteGroupPost = async (postId: string) => {
    if (!activeGroup || !authToken) return;
    try {
      await axios.delete(`/api/groups/${activeGroup.id}/posts/${postId}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      setGroupPosts(prev => prev.filter(x => x.id !== postId));
      onShowToast?.(language === 'so' ? 'Post waa la tirtiray' : 'Post deleted', 'success');
    } catch (err: any) {
      onShowToast?.(err?.response?.data?.error || 'Delete failed', 'error');
    }
  };

  const likePost = async (postId: string) => {
    if (!activeGroup) return;
    try {
      const res = await axios.post(`/api/groups/${activeGroup.id}/posts/${postId}/like`, {}, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      setGroupPosts(prev => prev.map(p => p.id === postId ? res.data : p));
    } catch (_) {}
  };

  const loadMembers = async (groupId: string) => {
    try {
      const res = await axios.get(`/api/groups/${groupId}/members`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      setMembers(Array.isArray(res.data) ? res.data : []);
    } catch {
      setMembers([]);
    }
  };

  const setModerator = async (userId: string, action: 'promote' | 'demote') => {
    if (!activeGroup) return;
    try {
      const res = await axios.post(`/api/groups/${activeGroup.id}/moderators`, { userId, action }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.data.group) setActiveGroup(res.data.group);
      await loadMembers(activeGroup.id);
      onShowToast?.(action === 'promote' ? 'Moderator added' : 'Moderator removed', 'success');
    } catch (err: any) {
      onShowToast?.(err?.response?.data?.error || 'Failed', 'error');
    }
  };

  const startEditGroup = () => {
    if (!activeGroup) return;
    setEditName(activeGroup.name || '');
    setEditDescription(activeGroup.description || '');
    setEditRules(activeGroup.rules || '');
    setEditingGroup(true);
  };

  const saveGroupMeta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGroup || !authToken) return;
    setSavingGroup(true);
    try {
      const res = await axios.patch(`/api/groups/${activeGroup.id}`, {
        name: editName,
        description: editDescription,
        rules: editRules
      }, { headers: { Authorization: `Bearer ${authToken}` } });
      setActiveGroup(res.data);
      setGroups(prev => prev.map(g => g.id === res.data.id ? res.data : g));
      setEditingGroup(false);
      onShowToast?.(language === 'so' ? 'Kooxda waa la cusboonaysiiyay' : 'Group updated', 'success');
    } catch (err: any) {
      onShowToast?.(err?.response?.data?.error || 'Update failed', 'error');
    } finally {
      setSavingGroup(false);
    }
  };

  const inviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGroup || !inviteUsername.trim() || !authToken) return;
    setInviting(true);
    try {
      await axios.post(`/api/groups/${activeGroup.id}/invite`, { username: inviteUsername.trim() }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      setInviteUsername('');
      onShowToast?.(language === 'so' ? 'Martiqaadka waa la diray' : 'Invite sent', 'success');
    } catch (err: any) {
      onShowToast?.(err?.response?.data?.error || 'Invite failed', 'error');
    } finally {
      setInviting(false);
    }
  };

  const acceptInvite = async (groupId: string) => {
    try {
      const res = await axios.post(`/api/groups/${groupId}/accept-invite`, {}, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const g = res.data.group || res.data;
      setGroups(prev => prev.map(x => x.id === groupId ? g : x));
      if (activeGroup?.id === groupId) setActiveGroup(g);
      onShowToast?.(language === 'so' ? 'Waad ku biirtay!' : 'Joined!', 'success');
      openGroup(g);
    } catch (err: any) {
      onShowToast?.(err?.response?.data?.error || 'Accept failed', 'error');
    }
  };

  const privacyIcon = (p: string) => {
    if (p === 'private') return <Lock size={12} />;
    if (p === 'hidden') return <EyeOff size={12} />;
    return <Globe size={12} />;
  };

  if (activeGroup) {
    const isMember = (activeGroup.members || []).includes(user?.id);
    const isOwner = activeGroup.ownerId === user?.id;
    const canModerate = isOwner || (activeGroup.admins || []).includes(user?.id) || user?.role === 'admin';
    return (
      <div className="max-w-2xl mx-auto space-y-4 py-2">
        <button type="button" onClick={() => { setActiveGroup(null); setGroupPosts([]); }}
          className="flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
          <ArrowLeft size={14} /> {language === 'so' ? 'Dib u noqo' : 'Back to groups'}
        </button>
        <div className="bg-white dark:bg-[var(--sl-bg-card)] border border-gray-150 dark:border-gray-800 rounded-2xl p-4 shadow-sm">
          <div className="flex gap-3 items-start">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white flex items-center justify-center font-black text-xl shrink-0">
              {(activeGroup.name || 'G')[0].toUpperCase()}
            </div>
            <div className="grow min-w-0">
              <h2 className="text-base font-black text-gray-900 dark:text-white">{activeGroup.name}</h2>
              <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                {privacyIcon(activeGroup.privacy)} {activeGroup.privacy} · {(activeGroup.members || []).length} members
              </p>
              {activeGroup.description && (
                <p className="text-xs text-gray-600 dark:text-gray-300 mt-2">{activeGroup.description}</p>
              )}
            </div>
            <div>
              {isMember ? (
                <button type="button" disabled={isOwner} onClick={() => leave(activeGroup.id)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-bold bg-gray-100 dark:bg-gray-800 disabled:opacity-40">
                  <LogOut size={12} /> Leave
                </button>
              ) : (
                <button type="button" onClick={() => join(activeGroup.id)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-bold bg-[var(--somluul-primary)] text-white">
                  <LogIn size={12} /> Join
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button type="button" onClick={() => { setShowMembers(s => !s); if (!showMembers) loadMembers(activeGroup.id); }}
            className="text-[11px] font-bold px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200">
            {showMembers ? 'Hide members' : 'Members'}
          </button>
          {canModerate && (
            <button type="button" onClick={startEditGroup}
              className="text-[11px] font-bold px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200">
              {language === 'so' ? 'Wax ka beddel' : 'Edit group'}
            </button>
          )}
        </div>
        {editingGroup && (
          <form onSubmit={saveGroupMeta} className="bg-white dark:bg-[var(--sl-bg-card)] border border-gray-150 dark:border-gray-800 rounded-2xl p-4 shadow-sm space-y-2">
            <input value={editName} onChange={e => setEditName(e.target.value)} maxLength={80}
              className="w-full px-3 py-2 rounded-xl text-sm bg-gray-50 dark:bg-[var(--sl-bg-muted)] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white"
              placeholder="Group name" required />
            <textarea value={editDescription} onChange={e => setEditDescription(e.target.value)} rows={2} maxLength={2000}
              className="w-full px-3 py-2 rounded-xl text-sm bg-gray-50 dark:bg-[var(--sl-bg-muted)] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white resize-none"
              placeholder={language === 'so' ? 'Sharaxaad' : 'Description'} />
            <textarea value={editRules} onChange={e => setEditRules(e.target.value)} rows={3} maxLength={5000}
              className="w-full px-3 py-2 rounded-xl text-sm bg-gray-50 dark:bg-[var(--sl-bg-muted)] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white resize-none"
              placeholder={language === 'so' ? 'Xeerarka kooxda' : 'Group rules'} />
            <div className="flex gap-2">
              <button type="button" onClick={() => setEditingGroup(false)} className="flex-1 py-2 rounded-xl text-xs font-bold bg-gray-100 dark:bg-gray-800">Cancel</button>
              <button type="submit" disabled={savingGroup} className="flex-1 py-2 rounded-xl text-xs font-bold bg-[var(--somluul-primary)] text-white disabled:opacity-50">Save</button>
            </div>
          </form>
        )}
        {activeGroup.rules && !editingGroup && (
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-2xl p-3 text-xs text-amber-900 dark:text-amber-200 whitespace-pre-wrap">
            <p className="font-bold text-[10px] uppercase tracking-wider mb-1">Rules</p>
            {activeGroup.rules}
          </div>
        )}
        {showMembers && (
          <div className="bg-white dark:bg-[var(--sl-bg-card)] border border-gray-150 dark:border-gray-800 rounded-2xl p-3 shadow-sm space-y-2">
            {members.length === 0 ? (
              <p className="text-xs text-gray-500">No members loaded</p>
            ) : members.map(m => (
              <div key={m.id} className="flex items-center gap-2 text-xs">
                <div className="w-7 h-7 rounded-full bg-[var(--somluul-primary)] text-white flex items-center justify-center font-bold text-[10px] overflow-hidden shrink-0">
                  {m.avatar ? <img src={m.avatar} className="w-full h-full object-cover" alt="" /> : (m.name || '?')[0]}
                </div>
                <div className="grow min-w-0">
                  <p className="font-bold text-gray-900 dark:text-white truncate">{m.name}</p>
                  <p className="text-[10px] text-gray-400">@{m.username} · {m.role}</p>
                </div>
                {isOwner && m.role === 'member' && (
                  <button type="button" onClick={() => setModerator(m.id, 'promote')}
                    className="text-[10px] font-bold text-emerald-600 hover:underline">Make mod</button>
                )}
                {isOwner && m.role === 'moderator' && (
                  <button type="button" onClick={() => setModerator(m.id, 'demote')}
                    className="text-[10px] font-bold text-red-500 hover:underline">Remove mod</button>
                )}
              </div>
            ))}
          </div>
        )}
        {(isOwner || (activeGroup.admins || []).includes(user?.id)) && (
          <form onSubmit={inviteUser} className="bg-white dark:bg-[var(--sl-bg-card)] border border-gray-150 dark:border-gray-800 rounded-2xl p-3 shadow-sm flex gap-2 items-center">
            <input
              value={inviteUsername}
              onChange={e => setInviteUsername(e.target.value)}
              placeholder={language === 'so' ? '@username ama handle' : '@username'}
              className="grow px-3 py-2 rounded-xl text-sm bg-gray-50 dark:bg-[var(--sl-bg-muted)] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white"
            />
            <button type="submit" disabled={inviting || !inviteUsername.trim()}
              className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold disabled:opacity-40 shrink-0">
              {language === 'so' ? 'Casuum' : 'Invite'}
            </button>
          </form>
        )}
        {isMember && (
          <form onSubmit={submitPost} className="bg-white dark:bg-[var(--sl-bg-card)] border border-gray-150 dark:border-gray-800 rounded-2xl p-3 shadow-sm space-y-2">
            {postMedia && (
              <div className="relative rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 max-h-40">
                {postMedia.type === 'video' ? (
                  <video src={postMedia.url} className="w-full max-h-40 object-contain bg-black" controls />
                ) : (
                  <img src={postMedia.url} alt="" className="w-full max-h-40 object-contain" />
                )}
                <button type="button" onClick={() => setPostMedia(null)}
                  className="absolute top-2 right-2 p-1 rounded-full bg-black/60 text-white">
                  <X size={14} />
                </button>
              </div>
            )}
            <div className="flex gap-2 items-center">
              <label className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 shrink-0" title="Photo/Video">
                <ImageIcon size={18} />
                <input type="file" accept="image/*,video/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) attachMedia(f); e.target.value = ''; }} />
              </label>
              <input value={postText} onChange={e => setPostText(e.target.value)}
                placeholder={language === 'so' ? 'La wadaag kooxda…' : 'Share with the group…'}
                className="grow px-3 py-2 rounded-xl text-sm bg-gray-50 dark:bg-[var(--sl-bg-muted)] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white"
                maxLength={10000} />
              <button type="submit" disabled={posting || uploadingMedia || (!postText.trim() && !postMedia)}
                className="px-3 py-2 rounded-xl bg-[var(--somluul-primary)] text-white disabled:opacity-40">
                <Send size={16} />
              </button>
            </div>
            {uploadingMedia && <p className="text-[10px] text-gray-500">Uploading…</p>}
          </form>
        )}
        {postsLoading ? (
          <p className="text-center text-xs text-gray-500 py-6">Loading posts…</p>
        ) : groupPosts.length === 0 ? (
          <p className="text-center text-xs text-gray-500 py-6">
            {language === 'so' ? 'Weli post kooxeed ma jiro.' : 'No group posts yet.'}
          </p>
        ) : (
          <div className="space-y-3">
            {groupPosts.map(p => (
              <div key={p.id} className="bg-white dark:bg-[var(--sl-bg-card)] border border-gray-150 dark:border-gray-800 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-[var(--somluul-primary)] text-white text-xs font-bold flex items-center justify-center overflow-hidden">
                    {p.authorAvatar ? <img src={p.authorAvatar} className="w-full h-full object-cover" alt="" /> : (p.authorName || '?')[0]}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-900 dark:text-white">{p.authorName}</p>
                    <p className="text-[10px] text-gray-400">{p.created_at ? new Date(p.created_at).toLocaleString() : ''}</p>
                  </div>
                </div>
                {p.content && <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{p.content}</p>}
                {p.mediaUrl && (
                  <div className="mt-2 rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800">
                    {p.mediaType === 'video' ? (
                      <video src={p.mediaUrl} controls className="w-full max-h-72 bg-black" />
                    ) : (
                      <img src={p.mediaUrl} alt="" className="w-full max-h-72 object-contain" />
                    )}
                  </div>
                )}
                <div className="mt-2 flex items-center gap-3">
                  <button type="button" onClick={() => likePost(p.id)}
                    className={`flex items-center gap-1 text-xs font-semibold ${(p.likedBy || []).includes(user?.id) ? 'text-indigo-600' : 'text-gray-500'}`}>
                    <Heart size={14} fill={(p.likedBy || []).includes(user?.id) ? 'currentColor' : 'none'} />
                    {p.likes || 0}
                  </button>
                  {(p.authorId === user?.id || canModerate) && (
                    <button type="button" onClick={() => deleteGroupPost(p.id)}
                      className="text-[11px] font-semibold text-red-500 hover:underline">
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-2">
      <div className="flex items-center gap-2">
        <Users className="text-indigo-600" size={22} />
        <h2 className="text-lg font-black text-gray-900 dark:text-white">
          {language === 'so' ? 'Kooxaha (Groups)' : 'Groups'}
        </h2>
      </div>
      <form onSubmit={createGroup} className="bg-white dark:bg-[var(--sl-bg-card)] border border-gray-150 dark:border-gray-800 rounded-2xl p-4 space-y-3 shadow-sm">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1">
          <Plus size={14} /> {language === 'so' ? 'Samee koox cusub' : 'Create group'}
        </h3>
        <input value={name} onChange={e => setName(e.target.value)}
          placeholder={language === 'so' ? 'Magaca kooxda' : 'Group name'}
          className="w-full px-3 py-2 rounded-xl text-sm bg-gray-50 dark:bg-[var(--sl-bg-muted)] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white"
          maxLength={80} required />
        <textarea value={description} onChange={e => setDescription(e.target.value)}
          placeholder={language === 'so' ? 'Sharaxaad (ikhtiyaari)' : 'Description (optional)'}
          className="w-full px-3 py-2 rounded-xl text-sm bg-gray-50 dark:bg-[var(--sl-bg-muted)] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white resize-none"
          rows={2} maxLength={500} />
        <div className="flex gap-2 flex-wrap">
          {(['public', 'private', 'hidden'] as const).map(opt => (
            <button key={opt} type="button" onClick={() => setPrivacy(opt)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all ${
                privacy === opt ? 'bg-[var(--somluul-primary)] text-white border-[var(--somluul-primary)]' : 'bg-transparent text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700'
              }`}>{opt}</button>
          ))}
        </div>
        <button type="submit" disabled={creating}
          className="w-full py-2.5 rounded-xl bg-[var(--somluul-primary)] hover:bg-indigo-500 text-white text-xs font-bold disabled:opacity-50">
          {creating ? '…' : (language === 'so' ? 'Abuur' : 'Create')}
        </button>
      </form>
      {loading ? (
        <p className="text-center text-xs text-gray-500 py-8">Loading…</p>
      ) : groups.length === 0 ? (
        <p className="text-center text-xs text-gray-500 py-8">
          {language === 'so' ? 'Weli koox ma jirto — samee mid.' : 'No groups yet — create one.'}
        </p>
      ) : (
        <div className="space-y-3">
          {groups.map(g => {
            const isMember = (g.members || []).includes(user?.id);
            const isOwner = g.ownerId === user?.id;
            return (
              <div key={g.id} className="bg-white dark:bg-[var(--sl-bg-card)] border border-gray-150 dark:border-gray-800 rounded-2xl p-4 shadow-sm flex gap-3 items-start">
                <button type="button" onClick={() => openGroup(g)}
                  className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white flex items-center justify-center font-black text-lg shrink-0">
                  {(g.name || 'G')[0].toUpperCase()}
                </button>
                <button type="button" onClick={() => openGroup(g)} className="grow min-w-0 text-left">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate">{g.name}</h4>
                    <span className="text-gray-400 flex items-center gap-0.5 text-[10px]">{privacyIcon(g.privacy)} {g.privacy}</span>
                  </div>
                  {g.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{g.description}</p>}
                  <p className="text-[10px] text-gray-400 mt-1">{(g.members || []).length} members · Open</p>
                </button>
                <div className="shrink-0">
                  {isMember ? (
                    <button type="button" disabled={isOwner} onClick={() => leave(g.id)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 disabled:opacity-40">
                      <LogOut size={12} /> Leave
                    </button>
                  ) : (
                    <div className="flex flex-col gap-1">
                      <button type="button" onClick={() => join(g.id)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-bold bg-[var(--somluul-primary)] text-white">
                        <LogIn size={12} /> Join
                      </button>
                      {(g.invites || []).includes(user?.id) && (
                        <button type="button" onClick={() => acceptInvite(g.id)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-bold bg-emerald-600 text-white">
                          Accept invite
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default GroupsSection;
