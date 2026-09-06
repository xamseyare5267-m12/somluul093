import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { uploadMediaFile } from '../lib/scaleClient';
import {
  Camera, Edit3, Plus, UserPlus, UserCheck, UserMinus, UserX,
  MapPin, Calendar, Globe, Briefcase, Phone, Mail, Award, Check,
  Grid, Image, Video, Users, List, MoreHorizontal, MessageSquare, Music,
  Heart, Bookmark, Share2, Send, Trash2, ShieldCheck, Sparkles, AlertCircle,
  RefreshCw, Laptop, X
} from 'lucide-react';
import { Profile, Post } from '../types';
import { useLanguage } from './LanguageContext';
import { formatTimeAgo } from '../utils';
import { motion, AnimatePresence } from 'motion/react';
import { VideoPlayer } from './VideoPlayer';
import { DEFAULT_SOMLUUL_LOGO } from './defaultLogo';

interface ProfileSectionProps {
  user: Profile; // The currently logged-in user
  profileId: string | null; // The ID of the profile being viewed (null means the current logged-in user)
  authToken: string;
  onShowToast: (message: string, type: 'success' | 'error') => void;
  onViewProfile: (userId: string) => void;
  onProfileUpdate: (updatedUser: Profile) => void;
}

// Pre-designed cover banner options
const COVERS = [
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&q=80', // Abstract Artistic
  'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1200&q=80', // Gradient
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80', // Sea
  'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&q=80', // Tech
  'https://images.unsplash.com/photo-1472214222541-d510753a4707?w=1200&q=80', // Nature
];

export const ProfileSection: React.FC<ProfileSectionProps> = ({
  user,
  profileId,
  authToken,
  onShowToast,
  onViewProfile,
  onProfileUpdate,
}) => {
  const { t, language } = useLanguage();
  const effectiveProfileId = profileId || user.id;
  const isOwnProfile = effectiveProfileId === user.id;

  // Messaging Modal States
  const [isMessagingOpen, setIsMessagingOpen] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  // State variables
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profilePosts, setProfilePosts] = useState<Post[]>([]);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'all' | 'about' | 'photos' | 'friends' | 'videos' | 'security'>('all');

  // Security and devices tracking states
  const [activeDevices, setActiveDevices] = useState<any[]>([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);

  const fetchActiveDevices = async () => {
    setIsLoadingDevices(true);
    try {
      const res = await axios.get('/api/auth/devices', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      setActiveDevices(res.data.devices || []);
    } catch (err) {
      console.error('Error fetching devices:', err);
    } finally {
      setIsLoadingDevices(false);
    }
  };

  const handleLogoutDevice = async (devId: string) => {
    try {
      await axios.post('/api/auth/logout-device', { deviceId: devId }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      onShowToast('Kalfadhiga aaladan waa la soo afjaray!', 'success');
      fetchActiveDevices();
    } catch (err) {
      onShowToast('Guuldaro ayaa ku dhacday ka saarista aaladan.', 'error');
    }
  };

  const handleLogoutAllOtherDevices = async () => {
    try {
      await axios.post('/api/auth/logout-all', {}, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      onShowToast('Kalfadhiyadii kale oo dhan waa la soo afjaray!', 'success');
      fetchActiveDevices();
    } catch (err) {
      onShowToast('Guuldaro ayaa ku dhacday soo afjarida kalfadhiyada.', 'error');
    }
  };

  useEffect(() => {
    if (activeSubTab === 'security') {
      fetchActiveDevices();
    }
  }, [activeSubTab]);

  // Interactive inline editing states
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioText, setBioText] = useState('');
  const [isEditingIntro, setIsEditingIntro] = useState(false);
  const [introData, setIntroData] = useState({
    city: '',
    country: '',
    phone: '',
    website: '',
    gender: '',
    dob: '',
    work: '',
  });

  // Photo gallery / covers and custom uploads
  const [coverPhoto, setCoverPhoto] = useState('');
  const [showCoverSelector, setShowCoverSelector] = useState(false);
  const [previewMediaModal, setPreviewMediaModal] = useState<{ url: string; type?: string; title?: string } | null>(null);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [postInputs, setPostInputs] = useState({
    content: '',
    mediaType: 'text' as 'text' | 'image' | 'video' | 'audio',
    mediaUrl: '',
  });
  const [isPublishingPost, setIsPublishingPost] = useState(false);

  // File upload input refs
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const postFileInputRef = useRef<HTMLInputElement | null>(null);

  // Friendship state from API / db.json
  const [friendshipState, setFriendshipState] = useState<'none' | 'sent' | 'received' | 'friends'>('none');
  const [isFollowed, setIsFollowed] = useState(false);

  // Load all profile details
  const fetchProfileDetails = async () => {
    setIsLoading(true);
    try {
      // 1. Prefer public single-profile endpoint (works without login), then optional list
      let list: Profile[] = [];
      try {
        const one = await axios.get(`/api/profiles/${encodeURIComponent(effectiveProfileId)}`, {
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        });
        if (one.data && one.data.id) {
          list = [one.data];
        }
      } catch (_) {}
      try {
        const profRes = await axios.get('/api/profiles', {
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        });
        if (Array.isArray(profRes.data)) {
          const fromList = profRes.data as Profile[];
          fromList.forEach((p) => {
            if (!list.some((x) => x.id === p.id)) list.push(p);
            else list = list.map((x) => (x.id === p.id ? { ...x, ...p } : x));
          });
        }
      } catch (_) {}

      // Update the profiles with any cached profile fields saved in localStorage
      list = list.map(p => {
        const backupStr = localStorage.getItem(`somluul_profile_backup_${p.id}`);
        if (backupStr) {
          try {
            const parsed = JSON.parse(backupStr);
            return { ...p, ...parsed };
          } catch (_) {}
        }
        return p;
      });

      setAllProfiles(list);

      // Find the viewed profile
      let targetProfile = list.find(p => p.id === effectiveProfileId);

      // If profile is not found (if handle lookup needed), check if we can match by handle or create a template
      if (!targetProfile) {
        // Try searching by handle / username — guard against missing email
        targetProfile = list.find(p => {
          if (!p) return false;
          const emailPrefix = (p.email || '').split('@')[0];
          const uname = (p.username || '').toLowerCase();
          const idMatch = p.id === effectiveProfileId;
          return idMatch ||
            (emailPrefix && emailPrefix === effectiveProfileId) ||
            (uname && uname === String(effectiveProfileId).toLowerCase());
        });
      }

      if (!targetProfile) {
        // Fallback: match by handle if id lookup missed
        const namePart = effectiveProfileId.replace('_', ' ');
        const capName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
        targetProfile = {
          id: effectiveProfileId,
          email: `${effectiveProfileId}@somluul.com`,
          first_name: capName.split(' ')[0] || 'SomLuul',
          last_name: capName.split(' ')[1] || 'Member',
          avatar: null,
          role: 'normal',
          blocked: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          bio: 'SomLuul active community contributor sxb!',
          city: 'Mogadishu',
          country: 'Somalia',
        };
      }

      // Prioritize server avatar; fallback to local cached avatar if missing on server
      if (!targetProfile.avatar) {
        const localAvatar = localStorage.getItem(`somluul_avatar_${targetProfile.id}`);
        if (localAvatar) {
          targetProfile.avatar = localAvatar;
        }
      }

      setProfile(targetProfile);
      setBioText(targetProfile.bio || '');
      setCoverPhoto(targetProfile.cover_photo || COVERS[0]);
      setIntroData({
        city: targetProfile.city || 'Mogadishu',
        country: targetProfile.country || 'Somalia',
        phone: targetProfile.phone || '',
        website: targetProfile.website || '',
        gender: targetProfile.gender || '',
        dob: targetProfile.dob || '',
        work: targetProfile.work || '',
      });

      // 2. Fetch posts by this profile (server-side author filter + client fallback)
      const postsRes = await axios.get('/api/posts', {
        params: { page: 1, limit: 50, authorId: targetProfile.id || effectiveProfileId },
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        timeout: 30000,
      });
      const rawPosts = postsRes.data;
      let serverPosts: Post[] = [];
      if (Array.isArray(rawPosts)) {
        serverPosts = rawPosts;
      } else if (rawPosts && Array.isArray(rawPosts.data)) {
        serverPosts = rawPosts.data;
      } else if (rawPosts && Array.isArray(rawPosts.posts)) {
        serverPosts = rawPosts.posts;
      }

      const mergedPosts = [...serverPosts];

      const authorHandle = (targetProfile.email || '').split('@')[0].toLowerCase();
      const customUsername = (targetProfile.username || '').toLowerCase();
      const targetName = `${targetProfile.first_name || ''} ${targetProfile.last_name || ''}`.toLowerCase().trim();
      const targetId = targetProfile.id;

      const userPosts = mergedPosts.filter((p: any) => {
        const postHandle = (p.author?.handle || '').toLowerCase();
        const postName = (p.author?.name || '').toLowerCase().trim();
        const postAuthorId = p.author?.id || p.authorId || '';
        // Primary match: author id (Facebook-style)
        if (postAuthorId && (postAuthorId === targetId || postAuthorId === effectiveProfileId)) return true;
        const isMyOwn = isOwnProfile && (
          postAuthorId === user.id ||
          postHandle === (user.username || '').toLowerCase() ||
          postHandle === (user.email || '').split('@')[0].toLowerCase() ||
          postName === `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase().trim()
        );
        return postHandle === authorHandle ||
               (customUsername && postHandle === customUsername) ||
               (targetName && postName === targetName) ||
               isMyOwn;
      });

      // Force each post's author avatar to the targetProfile's current avatar (or null if none)
      userPosts.forEach((p: any) => {
        if (p.author) {
          if (p.author.avatar && p.author.avatar.includes('photo-1535713875002-d1d0cf377fde')) {
            p.author.avatar = null;
          } else {
            p.author.avatar = targetProfile.avatar || null;
          }
        }
      });

      setProfilePosts(userPosts);

      // 3. Determine following & friend status
      // Following status
      const currentlyFollowed = targetProfile.followers?.includes(user.id) || false;
      setIsFollowed(currentlyFollowed);

      // Friends status
      // We read from custom fields inside user/target profile
      const userFriends = user.friends || [];
      const userRequestsSent = user.friendRequests || [];
      
      const targetFriends = targetProfile.friends || [];
      const targetRequestsSent = targetProfile.friendRequests || [];

      if (userFriends.includes(targetProfile.id)) {
        setFriendshipState('friends');
      } else if (userRequestsSent.includes(targetProfile.id)) {
        setFriendshipState('sent');
      } else if (targetRequestsSent.includes(user.id)) {
        setFriendshipState('received');
      } else {
        setFriendshipState('none');
      }

    } catch (err) {
      console.error('Error loading profile details:', err);
      const status = (err as any)?.response?.status;
      if (status === 401) {
        onShowToast(
          language === 'so'
            ? 'Fadlan gal account-kaaga si aad u aragto profile-ka.'
            : 'Please log in to view this profile.',
          'error'
        );
      } else if (status === 404) {
        onShowToast(
          language === 'so' ? 'Profile-kan lama helin.' : 'Profile not found.',
          'error'
        );
      } else {
        onShowToast(
          language === 'so'
            ? 'Cillad ayaa dhacday marka la soo rarayay profile-ka. Isku day mar kale.'
            : 'Failed to load profile. Please try again.',
          'error'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileDetails();
  }, [effectiveProfileId, user.id]);

  // Avatar Image Upload (Base64 for absolute persistence)
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      onShowToast('Sawirka profile-ka waa la raranayaa...', 'success');
      const avatarUrl = await uploadMediaFile(file);
      if (!avatarUrl) throw new Error('Avatar upload returned no URL');
      const res = await axios.put('/api/auth/profile', {
        first_name: user.first_name,
        last_name: user.last_name,
        avatar: avatarUrl,
        bio: user.bio,
        phone: user.phone,
      }, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (res.data.success) {
        onProfileUpdate(res.data.user);
        setProfile(prev => prev ? { ...prev, avatar: avatarUrl } : null);
        localStorage.setItem(`somluul_avatar_${user.id}`, avatarUrl);
        onShowToast('Sawirka profile-ka waa lagu guuleystay!', 'success');
      }
    } catch (err) {
      console.error('Error uploading avatar:', err);
      onShowToast('Guuldaro ayaa ku dhacday raridda sawirka.', 'error');
    }
  };

  // Cover Image Selection & Upload
  const handleCoverSelect = async (url: string) => {
    setCoverPhoto(url);
    setShowCoverSelector(false);
    
    // Save to backend
    try {
      const updatedProfile = {
        ...user,
        cover_photo: url
      };
      const res = await axios.put('/api/auth/profile', {
        first_name: user.first_name,
        last_name: user.last_name,
        avatar: user.avatar,
        bio: user.bio,
        phone: user.phone,
        cover_photo: url
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.data.success) {
        onProfileUpdate(res.data.user);
        onShowToast('Sawirka galka (cover) waa la beddelay!', 'success');
      }
    } catch (err) {
      console.warn('Cover photo save failed, fallback to local state', err);
    }
  };

  const handleCustomCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const dataUrl = reader.result as string;
      setCoverPhoto(dataUrl);
      setShowCoverSelector(false);

      // Save custom cover
      try {
        await axios.put('/api/auth/profile', {
          first_name: user.first_name,
          last_name: user.last_name,
          avatar: user.avatar,
          bio: user.bio,
          phone: user.phone,
          cover_photo: dataUrl
        }, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        onShowToast('Sawirka galka (cover) waa la dhigay!', 'success');
      } catch (err) {
        console.warn('Custom cover upload failed on server, using local memory state');
      }
    };
    reader.readAsDataURL(file);
  };

  // Send Message from Profile
  const handleSendMessage = async () => {
    if (!profile || !messageText.trim()) return;
    setIsSendingMessage(true);
    try {
      const savedRoomsStr = localStorage.getItem('somluul_chat_rooms');
      const savedMessagesStr = localStorage.getItem('somluul_chat_messages');
      
      let rooms: any[] = [];
      let messages: Record<string, any[]> = {};

      if (savedRoomsStr) {
        try {
          rooms = JSON.parse(savedRoomsStr);
        } catch (e) {
          console.error('Error parsing rooms for profile message:', e);
        }
      }
      if (savedMessagesStr) {
        try {
          messages = JSON.parse(savedMessagesStr);
        } catch (e) {
          console.error('Error parsing messages for profile message:', e);
        }
      }

      const roomId = profile.id;
      let existingRoom = rooms.find((r: any) => r.id === roomId);

      if (!existingRoom) {
        existingRoom = {
          id: roomId,
          name: `${profile.first_name} ${profile.last_name}`,
          avatar: profile.avatar || null,
          isGroup: false,
          unreadCount: 0,
          lastMessage: messageText,
          lastMessageTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          members: [roomId, 'me'],
          bio: profile.bio || '',
          phone: profile.phone || '',
          followersCount: typeof profile.followersCount === 'number' ? profile.followersCount : 0,
          followingCount: typeof profile.followingCount === 'number' ? profile.followingCount : 0,
          isFollowing: false
        };
        rooms.push(existingRoom);
      } else {
        existingRoom.lastMessage = messageText;
        existingRoom.lastMessageTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }

      const newMsg = {
        id: `m_${Date.now()}`,
        roomId: roomId,
        senderId: 'me',
        senderName: `${user.first_name} ${user.last_name}`,
        content: messageText,
        type: 'text',
        created_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      messages[roomId] = [...(messages[roomId] || []), newMsg];

      localStorage.setItem('somluul_chat_rooms', JSON.stringify(rooms));
      localStorage.setItem('somluul_chat_messages', JSON.stringify(messages));

      // Push to backend database for global synchronization
      try {
        await axios.post('/api/chat/rooms', { room: existingRoom }, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        await axios.post('/api/chat/messages', { message: newMsg }, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
      } catch (serverErr) {
        console.warn('Backend message sync issue:', serverErr);
      }

      onShowToast(
        language === 'so' 
          ? 'Farriintaada si guul leh ayaa loo diray!' 
          : 'Your message has been sent successfully!', 
        'success'
      );
      setMessageText('');
      setIsMessagingOpen(false);
      // Automatically switch to Messenger tab so the user can see their active chat
      window.dispatchEvent(new CustomEvent('somluul_switch_tab', { detail: 'messenger' }));
    } catch (err) {
      console.error('Error sending message from profile:', err);
      onShowToast(
        language === 'so'
          ? 'Cillad ayaa dhacday marka la dirayay farriinta.'
          : 'Failed to send message.',
        'error'
      );
    } finally {
      setIsSendingMessage(false);
    }
  };

  // Toggle Follow
  const handleToggleFollow = async () => {
    if (!profile) return;
    try {
      const res = await axios.post(`/api/profiles/${profile.id}/follow`, {}, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      setIsFollowed(res.data.isFollowing);
      setProfile(prev => {
        if (!prev) return null;
        const updatedFollowers = res.data.target.followers || [];
        return {
          ...prev,
          followers: updatedFollowers,
          followersCount: updatedFollowers.length,
        };
      });
      onShowToast(res.data.isFollowing ? 'Hadda waad la socotaa qofkaan!' : 'Waad joojisay la socoshada qofkaan.', 'success');
    } catch (err) {
      console.error('Error toggling follow:', err);
      // Fallback
      setIsFollowed(!isFollowed);
      onShowToast(!isFollowed ? 'Hadda waad la socotaa (Local)' : 'Waad joojisay la socoshada (Local)', 'success');
    }
  };

  // Manage Friendship
  const handleFriendshipAction = async () => {
    if (!profile || !authToken) return;
    try {
      let action: 'send' | 'cancel' | 'accept' | 'decline' | 'unfriend' = 'send';
      if (friendshipState === 'none') action = 'send';
      else if (friendshipState === 'sent') action = 'cancel';
      else if (friendshipState === 'received') action = 'accept';
      else if (friendshipState === 'friends') action = 'unfriend';

      const res = await axios.post(
        `/api/profiles/${profile.id}/friend`,
        { action },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      const state = res.data?.state as typeof friendshipState | undefined;
      if (state) setFriendshipState(state);
      else {
        // Fallback mapping
        if (action === 'send') setFriendshipState('sent');
        else if (action === 'cancel' || (action as string) === 'decline' || action === 'unfriend') setFriendshipState('none');
        else if (action === 'accept') setFriendshipState('friends');
      }
      const msgSo: Record<string, string> = {
        send: 'Codsiga saaxiibtinimo waa la diray!',
        cancel: 'Codsiga waa laga noqday.',
        accept: 'Waad saaxiib noqoteen!',
        decline: 'Codsiga waa la diiday.',
        unfriend: 'Saaxiibtinimada waa la joojiyay.',
      };
      onShowToast?.(msgSo[action] || res.data?.message || 'OK', 'success');
    } catch (err: any) {
      onShowToast?.(err?.response?.data?.error || 'Friend action failed', 'error');
    }
  };

  
  const handleSaveBio = async () => {
    if (!profile) return;
    try {
      const res = await axios.put('/api/auth/profile', {
        first_name: profile.first_name,
        last_name: profile.last_name,
        avatar: profile.avatar,
        bio: bioText,
        phone: profile.phone,
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      if (res.data.success) {
        onProfileUpdate(res.data.user);
        setProfile(prev => prev ? { ...prev, bio: bioText } : null);
        setIsEditingBio(false);
        onShowToast('Faahfaahintaada waa la cusbooneysiiyay!', 'success');
      }
    } catch (err) {
      console.error('Error saving bio:', err);
      setIsEditingBio(false);
      onShowToast('Guuldaro ayaa ku dhacday kaydinta faahfaahinta.', 'error');
    }
  };

  // Save Intro Information
  const handleSaveIntro = async () => {
    if (!profile) return;
    try {
      const res = await axios.put('/api/auth/profile', {
        first_name: profile.first_name,
        last_name: profile.last_name,
        avatar: profile.avatar,
        bio: profile.bio,
        phone: introData.phone,
        city: introData.city,
        country: introData.country,
        website: introData.website,
        gender: introData.gender,
        dob: introData.dob,
        work: introData.work,
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      if (res.data.success) {
        onProfileUpdate(res.data.user);
        setProfile(prev => prev ? {
          ...prev,
          city: introData.city,
          country: introData.country,
          website: introData.website,
          gender: introData.gender,
          dob: introData.dob,
          phone: introData.phone,
          work: introData.work,
        } : null);
        setIsEditingIntro(false);
        onShowToast('Macluumaadkaaga shakhsiyeed waa la kaydiyay!', 'success');
      }
    } catch (err) {
      console.error('Error saving intro:', err);
      setIsEditingIntro(false);
      onShowToast('Waa lagu guuldareystay kaydinta macluumaadka.', 'error');
    }
  };

  // Publisher Post Creation
  const [attachedMediaList, setAttachedMediaList] = useState<{ type: 'image' | 'video' | 'audio'; url: string }[]>([]);

  const uploadFileToServer = async (file: File): Promise<{ type: 'image' | 'video' | 'audio'; url: string }> => {
    const isVideo = file.type.startsWith('video') || file.name.endsWith('.mp4') || file.name.endsWith('.webm') || file.name.endsWith('.mov') || file.name.endsWith('.mkv');
    const mediaType: 'image' | 'video' | 'audio' = isVideo ? 'video' : 'image';

    let token = authToken;
    if (!token) {
      try {
        const saved = localStorage.getItem('auth_session') || sessionStorage.getItem('auth_session');
        if (saved) token = JSON.parse(saved).token;
      } catch (_) {}
    }

    if (token) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await axios.post('/api/files/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.data && res.data.public_url) {
          return { type: mediaType, url: res.data.public_url };
        }
      } catch (err) {
        console.warn('Direct file upload to server failed, falling back to FileReader base64:', err);
      }
    }

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve({ type: mediaType, url: reader.result as string });
      };
      reader.readAsDataURL(file);
    });
  };

  const handleLocalPostFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const fileList = Array.from(files) as File[];
      for (const file of fileList) {
        const uploaded = await uploadFileToServer(file);
        setAttachedMediaList(prev => [...prev, uploaded]);
        setPostInputs(prev => ({
          ...prev,
          mediaType: uploaded.type,
          mediaUrl: uploaded.url
        }));
      }
      e.target.value = '';
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postInputs.content.trim() && !postInputs.mediaUrl && attachedMediaList.length === 0) return;

    setIsPublishingPost(true);
    try {
      let primaryMediaType = postInputs.mediaType;
      let primaryMediaUrl = postInputs.mediaType !== 'text' ? postInputs.mediaUrl : undefined;

      if (attachedMediaList.length > 0) {
        primaryMediaType = attachedMediaList[0].type;
        primaryMediaUrl = attachedMediaList[0].url;
      }

      const payload = {
        content: postInputs.content,
        mediaType: primaryMediaType,
        mediaUrl: primaryMediaUrl,
        mediaList: attachedMediaList.length > 0 ? attachedMediaList : undefined
      };

      let activeToken = authToken;
      if (!activeToken) {
        try {
          const saved = localStorage.getItem('auth_session') || sessionStorage.getItem('auth_session');
          if (saved) activeToken = JSON.parse(saved).token;
        } catch (_) {}
      }

      const res = await axios.post('/api/posts', payload, {
        headers: activeToken ? { Authorization: `Bearer ${activeToken}` } : {}
      });

      const newCreatedPost = res.data;

      setProfilePosts([newCreatedPost, ...profilePosts]);
      setPostInputs({
        content: '',
        mediaType: 'text',
        mediaUrl: '',
      });
      setAttachedMediaList([]);
      onShowToast('Qoraalkaaga/Muuqaalkaaga waa la daabacay profile-kaaga!', 'success');
    } catch (err) {
      console.error('Error creating profile post:', err);
      onShowToast('Cillad ayaa dhacday marka la daabacayay.', 'error');
    } finally {
      setIsPublishingPost(false);
    }
  };

  // Comments inside profile posts
  const handleAddComment = async (postId: string) => {
    const text = commentInputs[postId];
    if (!text || !text.trim()) return;

    try {
      const res = await axios.post(`/api/posts/${postId}/comment`, { content: text }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      setProfilePosts(profilePosts.map(p => p.id === postId ? res.data : p));
      setCommentInputs({ ...commentInputs, [postId]: '' });
    } catch (err) {
      console.error('Error posting comment:', err);
    }
  };

  // Like reaction toggle
  const toggleLike = async (postId: string, type: 'like' | 'love') => {
    try {
      const res = await axios.post(`/api/posts/${postId}/like`, { type }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      setProfilePosts(profilePosts.map(p => p.id === postId ? res.data : p));
    } catch (err) {
      console.error('Error liking post:', err);
    }
  };

  // Render avatars helper with onError fallback protection
  const renderAvatarBubble = (avatarUrl: string | null | undefined, name: string, sizeClass: string = "w-24 h-24") => {
    const isSomLuulLogo = avatarUrl && avatarUrl.includes('somluul_logo');
    const finalUrl = isSomLuulLogo ? DEFAULT_SOMLUUL_LOGO : avatarUrl;
    const isUrl = finalUrl && (finalUrl.startsWith('http') || finalUrl.startsWith('/') || finalUrl.startsWith('data:image'));
    if (isUrl) {
      return (
        <img
          src={finalUrl}
          alt={name}
          className={`${sizeClass} rounded-full object-cover border-4 border-white dark:border-gray-900 shadow-lg shrink-0`}
          referrerPolicy="no-referrer"
          onError={(e) => {
            // Replace broken image with initial avatar bubble on error
            const target = e.currentTarget;
            target.onerror = null;
            target.style.display = 'none';
            if (target.parentElement) {
              const parts = name ? name.trim().split(' ').filter(p => Boolean(p) && !['my', 'avatar', 'user'].includes(p.toLowerCase())) : [];
              let initials = 'SL';
              if (parts.length >= 2) {
                initials = `${parts[0][0]}${parts[1][0]}`.toUpperCase();
              } else if (parts.length === 1 && parts[0].length > 0) {
                initials = parts[0].slice(0, 2).toUpperCase();
              }
              const fallbackDiv = document.createElement('div');
              fallbackDiv.className = `${sizeClass} rounded-full bg-gradient-to-tr from-indigo-600 via-indigo-600 to-purple-600 text-white flex items-center justify-center font-black border-4 border-white dark:border-gray-900 shadow-lg shrink-0 tracking-tight font-sans`;
              fallbackDiv.innerText = initials;
              target.parentElement.appendChild(fallbackDiv);
            }
          }}
        />
      );
    }

    const parts = name ? name.trim().split(' ').filter(p => Boolean(p) && !['my', 'avatar', 'user'].includes(p.toLowerCase())) : [];
    let initials = '';
    if (parts.length >= 2) {
      initials = `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    } else if (parts.length === 1 && parts[0].length > 0) {
      initials = parts[0].slice(0, 2).toUpperCase();
    } else {
      initials = user?.first_name ? `${user.first_name[0]}${user.last_name ? user.last_name[0] : ''}`.toUpperCase() : 'SL';
    }

    return (
      <div className={`${sizeClass} rounded-full bg-gradient-to-tr from-indigo-600 via-indigo-600 to-purple-600 text-white flex items-center justify-center font-black border-4 border-white dark:border-gray-900 shadow-lg shrink-0 tracking-tight font-sans`}>
        {initials}
      </div>
    );
  };

  if (isLoading || !profile) {
    return (
      <div className="bg-white dark:bg-[var(--sl-bg-card)] rounded-2xl p-16 text-center space-y-4 shadow-sm border border-gray-150 dark:border-gray-800">
        <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-blue-500 rounded-full animate-spin mx-auto"></div>
        <p className="text-xs text-gray-400 animate-pulse">Soo raraya faahfaahinta profile-ka...</p>
      </div>
    );
  }

  // Derived arrays
  const photosUploaded: string[] = [];
  const videosUploaded: string[] = [];

  profilePosts.forEach(p => {
    if (p.mediaList && p.mediaList.length > 0) {
      p.mediaList.forEach(m => {
        if (m.type === 'image' && m.url) photosUploaded.push(m.url);
        if (m.type === 'video' && m.url) videosUploaded.push(m.url);
      });
    } else {
      if (p.mediaType === 'image' && p.mediaUrl) photosUploaded.push(p.mediaUrl);
      if (p.mediaType === 'video' && p.mediaUrl) videosUploaded.push(p.mediaUrl);
    }
  });
  const suggestedFriendsList = allProfiles.filter(p => p.id !== profile.id).slice(0, 6);

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
      
      {/* 1. FACEBOOK PROFILE HEADER BANNER & INFO (Matches Screenshot 1) */}
      <div className="bg-white dark:bg-[var(--sl-bg-card)] rounded-2xl border border-gray-150 dark:border-gray-800/80 shadow-md overflow-hidden transition-all duration-300">
        
        {/* Cover image wrapper */}
        <div className="relative h-48 sm:h-64 md:h-80 w-full bg-slate-100 dark:bg-slate-900 overflow-hidden group">
          <img
            src={coverPhoto}
            alt="Profile Cover"
            className="w-full h-full object-cover transition-transform duration-700 hover:scale-101"
            referrerPolicy="no-referrer"
          />

          {/* Edit cover banner button */}
          {isOwnProfile && (
            <div className="absolute bottom-4 right-4 z-10 flex gap-2">
              <button
                onClick={() => setShowCoverSelector(!showCoverSelector)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/90 hover:bg-white text-gray-800 text-xs font-bold rounded-xl shadow-lg transition-all border border-gray-200"
              >
                <Camera size={14} className="text-gray-700" />
                <span>{t('profile_change_cover')}</span>
              </button>
              <input
                type="file"
                ref={coverInputRef}
                accept="image/*"
                onChange={handleCustomCoverUpload}
                className="hidden"
              />
            </div>
          )}

          {/* Preset covers selector popover */}
          {showCoverSelector && (
            <div className="absolute bottom-14 right-4 bg-white dark:bg-[#1a2235] border border-gray-150 dark:border-gray-800 p-3 rounded-2xl shadow-2xl z-20 w-80 animate-fade-in space-y-3">
              <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">{t('profile_choose_cover')}</h4>
              <div className="grid grid-cols-5 gap-1.5">
                {COVERS.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => handleCoverSelect(url)}
                    className="h-10 rounded-lg overflow-hidden border border-gray-200/50 hover:border-indigo-500 transition-all cursor-pointer"
                  >
                    <img src={url} alt="Cover option" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
              <div className="border-t border-gray-100 dark:border-gray-800 pt-2 flex justify-between items-center">
                <span className="text-[10px] text-gray-400">{t('profile_upload_from_device')}:</span>
                <button
                  onClick={() => coverInputRef.current?.click()}
                  className="px-3 py-1 bg-[var(--somluul-primary)] hover:brightness-110 text-white text-[10px] font-bold rounded-lg transition-all"
                >
                  {t('profile_upload_image')}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Profile Info Details Section (Screenshot overlap) */}
        <div className="relative px-6 pb-6 pt-16 sm:pt-4 flex flex-col md:flex-row items-center justify-between gap-6">
          
          {/* Overlapping circular avatar */}
          <div className="absolute -top-16 left-6 md:left-8 z-10">
            <div className="relative group">
              {renderAvatarBubble(profile.avatar, `${profile.first_name} ${profile.last_name}`, "w-32 h-32 md:w-36 md:h-36")}
              {isOwnProfile && (
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  className="absolute bottom-1 right-1 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-full p-2.5 shadow-md border border-gray-200 cursor-pointer transition-all hover:scale-110"
                  title={t('profile_avatar_title')}
                >
                  <Camera size={16} />
                </button>
              )}
              <input
                type="file"
                ref={avatarInputRef}
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>
          </div>

          {/* Name & Count metrics */}
          <div className="md:ml-40 flex-1 text-center md:text-left space-y-1.5">
            <div className="flex flex-col sm:flex-row items-center gap-2 justify-center md:justify-start">
              <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white leading-tight">
                {profile.first_name} {profile.last_name}
              </h1>
              {profile.role === 'admin' && (
                <span className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase border border-indigo-500/20">
                  Verified
                </span>
              )}
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              <span className="font-bold text-gray-800 dark:text-gray-200">
                {profile.followersCount ?? profile.followers?.length ?? 0}
              </span> {t('profile_followers_count')} • <span className="font-bold text-gray-800 dark:text-gray-200">
                {profile.followingCount ?? profile.following?.length ?? 0}
              </span> {t('profile_following_count')}
            </p>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-3 gap-y-1 text-xs text-gray-400">
              <span className="flex items-center gap-1"><MapPin size={13} /> {introData.city}, {introData.country}</span>
              <span>•</span>
              <span className="flex items-center gap-1"><Briefcase size={13} /> {introData.work}</span>
            </div>
          </div>

          {/* Context Action Buttons (Follow, Add Friend, Edit) */}
          <div className="flex flex-wrap items-center justify-center md:justify-end gap-2 shrink-0 self-center md:self-end w-full md:w-auto mt-2 md:mt-0">
            {isOwnProfile ? (
              <>
                <button
                  onClick={() => onViewProfile(user.id)}
                  className="px-4 py-2 bg-[var(--somluul-primary)] hover:brightness-110 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Award size={15} />
                  <span>{t('profile_dashboard')}</span>
                </button>
                <button
                  onClick={() => setIsEditingIntro(true)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit3 size={15} />
                  <span>{t('profile_edit')}</span>
                </button>
              </>
            ) : (
              <>
                {/* Follow/Unfollow Button */}
                <button
                  onClick={handleToggleFollow}
                  className={`px-3.5 py-2 text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                    isFollowed
                      ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-200'
                      : 'bg-[var(--somluul-primary)] hover:brightness-110 text-white'
                  }`}
                >
                  <Check size={14} className={isFollowed ? 'block' : 'hidden'} />
                  <span>{isFollowed ? t('profile_following') : t('profile_follow')}</span>
                </button>

                {/* Add Friend Button */}
                <button
                  onClick={handleFriendshipAction}
                  className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer ${
                    friendshipState === 'friends'
                      ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-200'
                      : friendshipState === 'sent'
                      ? 'bg-amber-50 text-amber-600 border border-amber-200'
                      : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-750 text-gray-900 dark:text-white'
                  }`}
                >
                  {friendshipState === 'friends' && <UserCheck size={15} />}
                  {friendshipState === 'sent' && <UserMinus size={15} />}
                  {friendshipState === 'received' && <Plus size={15} />}
                  {friendshipState === 'none' && <UserPlus size={15} />}
                  
                  <span>
                    {friendshipState === 'friends' && t('profile_friends_mutual')}
                    {friendshipState === 'sent' && t('profile_friend_request_sent')}
                    {friendshipState === 'received' && t('profile_friend_request_accept')}
                    {friendshipState === 'none' && t('profile_friend_add')}
                  </span>
                </button>

                {/* Send Message Button */}
                <button
                  type="button"
                  onClick={() => {
                    if (profile) {
                      const targetProfileObj = {
                        id: profile.id,
                        first_name: profile.first_name,
                        last_name: profile.last_name,
                        avatar: profile.avatar,
                        bio: profile.bio || '',
                        phone: profile.phone || ''
                      };
                      localStorage.setItem('somluul_chat_target_profile', JSON.stringify(targetProfileObj));
                      window.dispatchEvent(new CustomEvent('somluul_open_floating_chat', { detail: targetProfileObj }));
                    }
                  }}
                  className="px-3.5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <MessageSquare size={15} />
                  <span>{language === 'so' ? 'Fariin Dir' : 'Send Message'}</span>
                </button>

                {/* Call Button */}
                <button
                  type="button"
                  onClick={() => {
                    if (profile) {
                      const targetProfileObj = {
                        id: profile.id,
                        first_name: profile.first_name,
                        last_name: profile.last_name,
                        avatar: profile.avatar,
                        bio: profile.bio || '',
                        phone: profile.phone || '',
                        startCall: 'voice'
                      };
                      localStorage.setItem('somluul_chat_target_profile', JSON.stringify(targetProfileObj));
                      window.dispatchEvent(new CustomEvent('somluul_open_floating_chat', { detail: targetProfileObj }));
                    }
                  }}
                  className="px-3.5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                  title="Wac Hadda / Call Now"
                >
                  <Phone size={15} />
                  <span>{language === 'so' ? 'Wac' : 'Call'}</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Biography Inline Section (Screenshot 1) */}
        <div className="border-t border-gray-100 dark:border-gray-800/60 px-6 py-4 flex flex-col items-center text-center">
          {isEditingBio ? (
            <div className="w-full max-w-md space-y-2">
              <textarea
                value={bioText}
                onChange={(e) => setBioText(e.target.value)}
                maxLength={160}
                rows={2}
                placeholder={t('profile_bio_placeholder')}
                className="w-full text-xs p-2 border border-gray-200 rounded-xl bg-gray-50 text-center focus:bg-white focus:outline-none dark:bg-gray-800"
              />
              <div className="flex justify-center gap-2">
                <button
                  onClick={() => setIsEditingBio(false)}
                  className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 text-[10px] font-bold rounded-lg transition-all"
                >
                  {t('profile_cancel')}
                </button>
                <button
                  onClick={handleSaveBio}
                  className="px-3 py-1 bg-[var(--somluul-primary)] hover:brightness-110 text-white text-[10px] font-bold rounded-lg transition-all"
                >
                  {t('profile_save')}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-1 w-full max-w-xl">
              <p className="text-sm font-medium italic text-gray-700 dark:text-gray-300 leading-relaxed">
                {profile.bio || t('profile_no_bio')}
              </p>
              {isOwnProfile && (
                <button
                  onClick={() => setIsEditingBio(true)}
                  className="text-[10px] text-indigo-500 hover:underline font-bold"
                >
                  {t('profile_edit_bio')}
                </button>
              )}
            </div>
          )}
        </div>

        {/* 2. PROFILE MENU NAVIGATION BAR (Matches Screenshot 2) */}
        <div className="border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 px-4 py-1 flex items-center overflow-x-auto scrollbar-none gap-1">
          {[
            { id: 'all', label: t('profile_all'), icon: Grid },
            { id: 'about', label: t('profile_about'), icon: Users },
            { id: 'photos', label: t('profile_photos'), icon: Image },
            { id: 'friends', label: t('profile_friends'), icon: HeartHandshakeIcon },
            { id: 'videos', label: t('profile_videos'), icon: Video },
            ...(isOwnProfile ? [{ id: 'security', label: t('profile_security'), icon: ShieldCheck }] : []),
          ].map(subTab => {
            const Icon = subTab.icon;
            const isSubActive = activeSubTab === subTab.id;
            return (
              <button
                key={subTab.id}
                onClick={() => setActiveSubTab(subTab.id as any)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isSubActive
                    ? 'bg-[var(--somluul-primary)] text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-150/75 dark:hover:bg-gray-800'
                }`}
              >
                <Icon size={14} />
                <span>{subTab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. DYNAMIC WORKSPACE BODY: TWO-COLUMN OR SINGLE VIEWS */}
      
      {/* Intro update overlay modal */}
      {isEditingIntro && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[var(--sl-bg-card)] border border-gray-150 dark:border-gray-800 rounded-3xl p-6 max-w-md w-full shadow-2xl animate-fade-in space-y-4">
            <div className="flex justify-between items-center border-b pb-2.5">
              <h3 className="text-sm font-extrabold text-gray-800 dark:text-white uppercase tracking-wider">{t('profile_update_info')}</h3>
              <button onClick={() => setIsEditingIntro(false)} className="text-gray-400 hover:text-gray-600"><Plus className="rotate-45" size={20} /></button>
            </div>
            <div className="space-y-3.5 max-h-[350px] overflow-y-auto pr-1">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase">{t('profile_lives_in')} (City)</label>
                <input
                  type="text"
                  value={introData.city}
                  onChange={(e) => setIntroData({ ...introData, city: e.target.value })}
                  className="w-full text-xs p-2.5 border rounded-xl bg-gray-50"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase">{t('ad_country')} (Country)</label>
                <input
                  type="text"
                  value={introData.country}
                  onChange={(e) => setIntroData({ ...introData, country: e.target.value })}
                  className="w-full text-xs p-2.5 border rounded-xl bg-gray-50"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase">{t('profile_works_at')} (Work)</label>
                <input
                  type="text"
                  value={introData.work}
                  onChange={(e) => setIntroData({ ...introData, work: e.target.value })}
                  className="w-full text-xs p-2.5 border rounded-xl bg-gray-50"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase">{t('profile_phone')}</label>
                <input
                  type="text"
                  value={introData.phone}
                  onChange={(e) => setIntroData({ ...introData, phone: e.target.value })}
                  className="w-full text-xs p-2.5 border rounded-xl bg-gray-50"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase">{t('profile_website')}</label>
                <input
                  type="text"
                  value={introData.website}
                  onChange={(e) => setIntroData({ ...introData, website: e.target.value })}
                  className="w-full text-xs p-2.5 border rounded-xl bg-gray-50"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase">{t('dob_label')}</label>
                <input
                  type="date"
                  value={introData.dob}
                  onChange={(e) => setIntroData({ ...introData, dob: e.target.value })}
                  className="w-full text-xs p-2.5 border rounded-xl bg-gray-50"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setIsEditingIntro(false)}
                className="px-4 py-2 bg-gray-100 text-gray-800 text-xs font-bold rounded-xl"
              >
                {t('profile_cancel')}
              </button>
              <button
                onClick={handleSaveIntro}
                className="px-4 py-2 bg-[var(--somluul-primary)] text-white text-xs font-bold rounded-xl"
              >
                {t('profile_save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RENDER CONDITIONAL VIEWS BASED ON SUBTAB */}
      {activeSubTab === 'all' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT PANEL: Intro & Previews (Occupies 5 columns on desktop) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Introductory personal info Card */}
            <div className="bg-white dark:bg-[var(--sl-bg-card)] rounded-2xl border border-gray-150 dark:border-gray-800/80 p-4 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-widest">{t('profile_personal_details')}</h3>
              
              <div className="space-y-3 text-xs text-gray-700 dark:text-gray-300">
                <div className="flex items-center gap-3">
                  <MapPin className="text-gray-400 shrink-0" size={16} />
                  <span>{t('profile_lives_in')} <span className="font-semibold text-gray-900 dark:text-white">{introData.city}, {introData.country}</span></span>
                </div>
                <div className="flex items-center gap-3">
                  <Briefcase className="text-gray-400 shrink-0" size={16} />
                  <span>{t('profile_works_at')} <span className="font-semibold text-gray-900 dark:text-white">{introData.work}</span></span>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="text-gray-400 shrink-0" size={16} />
                  <span>{t('profile_born_on')} <span className="font-semibold text-gray-900 dark:text-white">{new Date(introData.dob).toLocaleDateString()}</span></span>
                </div>
                {introData.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="text-gray-400 shrink-0" size={16} />
                    <span>{t('profile_phone')}: <span className="font-semibold text-gray-900 dark:text-white">{introData.phone}</span></span>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <Globe className="text-gray-400 shrink-0" size={16} />
                  <span>{t('profile_website')}: <a href={`https://${introData.website}`} target="_blank" rel="noreferrer" className="text-indigo-500 hover:underline">{introData.website}</a></span>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="text-gray-400 shrink-0" size={16} />
                  <span>{t('profile_email')}: <span className="text-gray-500 dark:text-gray-400">{profile.email}</span></span>
                </div>
              </div>

              {isOwnProfile && (
                <button
                  onClick={() => setIsEditingIntro(true)}
                  className="w-full py-2.5 text-center text-xs font-bold bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-150 text-gray-800 dark:text-white rounded-xl transition-all"
                >
                  {t('profile_edit_details')}
                </button>
              )}
            </div>

            {!isOwnProfile && (
              <div className="bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/10 dark:to-[#141b2d] rounded-2xl border border-indigo-100 dark:border-indigo-900/30 p-4 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-indigo-100/50 dark:border-indigo-900/10 pb-2">
                  <MessageSquare className="text-indigo-600 dark:text-indigo-400 shrink-0" size={16} />
                  <h3 className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-widest">
                    {language === 'so' ? 'U Dir Farriin Toos Ah' : 'Send Direct Message'}
                  </h3>
                </div>
                
                <div className="space-y-3">
                  <textarea
                    rows={3}
                    placeholder={language === 'so' ? 'Ku qor halkan farriintaada tooska ah...' : 'Write your direct message here...'}
                    className="w-full bg-white dark:bg-gray-900 text-xs p-3 rounded-xl border border-gray-200 dark:border-gray-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:text-white"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                  />
                  
                  <button
                    onClick={handleSendMessage}
                    disabled={isSendingMessage || !messageText.trim()}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-indigo-200 dark:shadow-none flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSendingMessage ? (
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                      <Send size={14} />
                    )}
                    <span>
                      {language === 'so' ? 'Dir Farriinta' : 'Send Message'}
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* Photos card preview (Grid of 9 square cards) */}
            <div className="bg-white dark:bg-[var(--sl-bg-card)] rounded-2xl border border-gray-150 dark:border-gray-800/80 p-4 shadow-sm space-y-3">
              <div className="flex justify-between items-center border-b pb-2">
                <div className="flex items-center gap-2">
                  <Image size={15} className="text-indigo-500" />
                  <h3 className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-widest">{t('profile_photos')}</h3>
                </div>
                <button onClick={() => setActiveSubTab('photos')} className="text-xs font-bold text-indigo-500 hover:underline">{t('profile_view_all')}</button>
              </div>

              {photosUploaded.length === 0 ? (
                <p className="text-[11px] text-gray-400 text-center py-6">{t('profile_no_photos')}</p>
              ) : (
                <div className="grid grid-cols-3 gap-1.5 rounded-xl overflow-hidden">
                  {photosUploaded.slice(0, 9).map((url, idx) => (
                    <div
                      key={idx}
                      onClick={() => setPreviewMediaModal({ url, type: 'image', title: `Sawirka ${idx + 1}` })}
                      className="aspect-square bg-gray-50 overflow-hidden hover:opacity-90 transition-all cursor-pointer hover:scale-105"
                    >
                      <img src={url} alt="Profile preview" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Friends list preview widget */}
            <div className="bg-white dark:bg-[var(--sl-bg-card)] rounded-2xl border border-gray-150 dark:border-gray-800/80 p-4 shadow-sm space-y-3">
              <div className="flex justify-between items-center border-b pb-2">
                <div className="flex items-center gap-2">
                  <Users size={15} className="text-indigo-500" />
                  <h3 className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-widest">{t('profile_friends')}</h3>
                </div>
                <button onClick={() => setActiveSubTab('friends')} className="text-xs font-bold text-indigo-500 hover:underline">{t('profile_view_all')}</button>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {suggestedFriendsList.map((friend) => (
                  <div
                    key={friend.id}
                    onClick={() => onViewProfile(friend.id)}
                    className="flex flex-col items-center gap-1 cursor-pointer hover:scale-103 transition-all"
                  >
                    {renderAvatarBubble(friend.avatar, `${friend.first_name} ${friend.last_name}`, "w-16 h-16")}
                    <span className="text-[10px] font-bold text-gray-800 dark:text-gray-200 text-center truncate w-full">
                      {friend.first_name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT PANEL: Post creation & user's actual feed list (Occupies 7 columns) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Publisher Card (Only on OWN Profile) */}
            {isOwnProfile && (
              <form onSubmit={handleCreatePost} className="bg-white dark:bg-[var(--sl-bg-card)] border border-gray-150 dark:border-gray-800/80 rounded-2xl p-4 shadow-sm space-y-4">
                <div className="flex gap-3">
                  {renderAvatarBubble(user.avatar, "My Avatar", "w-10 h-10")}
                  <textarea
                    rows={2}
                    placeholder={t('mind_placeholder')}
                    className="w-full bg-gray-50 hover:bg-gray-100/50 focus:bg-white text-xs p-3 rounded-2xl border border-gray-200 focus:ring-1 focus:ring-indigo-500 focus:outline-none dark:bg-gray-800"
                    value={postInputs.content}
                    onChange={(e) => setPostInputs({ ...postInputs, content: e.target.value })}
                  />
                </div>

                {postInputs.mediaUrl && (
                  <div className="relative rounded-xl overflow-hidden border bg-black h-48 flex items-center justify-center">
                    {postInputs.mediaType === 'image' ? (
                      <img src={postInputs.mediaUrl} alt="Upload preview" className="w-full h-full object-cover" />
                    ) : (
                      <VideoPlayer src={postInputs.mediaUrl} controls className="h-full" />
                    )}
                    <button
                      type="button"
                      onClick={() => setPostInputs({ ...postInputs, mediaUrl: '' })}
                      className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1.5"
                    >
                      <Plus className="rotate-45" size={16} />
                    </button>
                  </div>
                )}

                <div className="border-t pt-3 flex justify-between items-center">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => postFileInputRef.current?.click()}
                      className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-gray-100 rounded-xl text-xs font-bold text-gray-500"
                    >
                      <Image className="text-green-500" size={16} />
                      <span>{t('photo_video')}</span>
                    </button>
                    <input
                      type="file"
                      ref={postFileInputRef}
                      accept="image/*,video/*"
                      onChange={handleLocalPostFileSelect}
                      className="hidden"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isPublishingPost || (!postInputs.content.trim() && !postInputs.mediaUrl)}
                    className="bg-[var(--somluul-primary)] hover:brightness-110 disabled:opacity-40 text-white font-bold text-xs px-5 py-2 rounded-xl shadow-md transition-all"
                  >
                    {isPublishingPost ? t('publishing') : t('post_btn')}
                  </button>
                </div>
              </form>
            )}

            {/* Post Filter controls title */}
            <div className="bg-white dark:bg-[var(--sl-bg-card)] border border-gray-150 dark:border-gray-800/80 rounded-2xl px-4 py-3 shadow-sm flex justify-between items-center">
              <span className="text-xs font-extrabold text-gray-800 dark:text-gray-200 uppercase tracking-widest">{t('profile_posts')}</span>
              <div className="flex items-center gap-1">
                <button className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50"><List size={16} /></button>
                <button className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50"><Grid size={16} /></button>
              </div>
            </div>

            {/* Actual posts list */}
            {profilePosts.length === 0 ? (
              <div className="bg-white dark:bg-[var(--sl-bg-card)] border border-gray-150 dark:border-gray-800 rounded-2xl p-10 text-center text-gray-400">
                <AlertCircle className="mx-auto text-gray-300 mb-2" size={32} />
                <p className="text-xs font-semibold">{t('profile_no_posts')}</p>
              </div>
            ) : (
              <div className="space-y-6">
                {profilePosts.map(p => (
                  <div
                    key={p.id}
                    className="bg-white dark:bg-[var(--sl-bg-card)] border border-gray-150 dark:border-gray-800/80 rounded-2xl shadow-sm p-4 space-y-4"
                  >
                    {/* Header */}
                    <div className="flex justify-between items-center">
                      <div className="flex gap-3">
                        {renderAvatarBubble(p.author.avatar, p.author.name, "w-10 h-10")}
                        <div>
                          <div className="flex items-center gap-1">
                            <span className="font-extrabold text-xs text-gray-900 dark:text-white leading-tight">
                              {p.author.name}
                            </span>
                          </div>
                          <span className="text-[10px] text-gray-400">
                            {p.author.handle ? `@${p.author.handle} • ` : ''}
                            {formatTimeAgo(p.created_at, language)}
                          </span>
                        </div>
                      </div>
                      <button className="text-gray-400 hover:text-gray-600"><MoreHorizontal size={18} /></button>
                    </div>

                    {/* Content text */}
                    <p className="text-xs text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">{p.content}</p>

                    {/* Content attachments */}
                    {p.mediaList && p.mediaList.length > 0 ? (
                      <div className={`grid gap-2 mb-4 rounded-xl overflow-hidden ${
                        p.mediaList.length === 1 
                          ? 'grid-cols-1' 
                          : p.mediaList.length === 2 
                            ? 'grid-cols-2' 
                            : 'grid-cols-2 sm:grid-cols-3'
                      }`}>
                        {p.mediaList.map((item, index) => (
                          <div 
                            key={index} 
                            className={`relative overflow-hidden border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 flex items-center justify-center ${
                              p.mediaList!.length === 1 ? 'max-h-[300px] rounded-xl' : 'aspect-square rounded-lg'
                            }`}
                          >
                            {item.type === 'image' && (
                              <img
                                src={item.url}
                                alt="Attachment"
                                onClick={() => setPreviewMediaModal({ url: item.url, type: 'image', title: p.content })}
                                className="w-full h-full object-cover cursor-pointer hover:opacity-95 transition-opacity"
                                referrerPolicy="no-referrer"
                              />
                            )}
                            {item.type === 'video' && (
                              <VideoPlayer 
                                src={item.url} 
                                controls 
                                className="w-full h-full object-cover" 
                                playsInline 
                              />
                            )}
                            {item.type === 'audio' && (
                              <div className="p-3 w-full text-center flex flex-col justify-center items-center">
                                <Music size={20} className="text-indigo-500 mb-1" />
                                <audio src={item.url} controls className="w-full h-8" />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <>
                      {(() => {
                        const isVideoUrl = p.mediaType === 'video' || (typeof p.mediaUrl === 'string' && (p.mediaUrl.startsWith('data:video') || p.mediaUrl.includes('.mp4') || p.mediaUrl.includes('.webm') || p.mediaUrl.includes('.mov') || p.mediaUrl.includes('.mkv') || p.mediaUrl.includes('.avi')));
                        if (isVideoUrl && p.mediaUrl) {
                          return (
                            <div className="rounded-xl overflow-hidden bg-black max-h-[350px] flex items-center justify-center">
                              <VideoPlayer src={p.mediaUrl} controls className="w-full max-h-[350px]" playsInline preload="metadata" />
                            </div>
                          );
                        }
                        if (p.mediaUrl) {
                          return (
                            <div
                              onClick={() => setPreviewMediaModal({ url: p.mediaUrl, type: 'image', title: p.content })}
                              className="rounded-xl overflow-hidden bg-slate-50 max-h-[350px] cursor-pointer hover:opacity-95 transition-opacity"
                            >
                              <img src={p.mediaUrl} alt="Attachment" className="w-full h-full object-cover" />
                            </div>
                          );
                        }
                        return null;
                      })()}
                      </>
                    )}

                    {/* Likes/Comments Bar */}
                    <div className="flex justify-between text-[11px] text-gray-400 border-b pb-2.5">
                      <span>👍 {p.likes} likes</span>
                      <span>{p.comments.length} comments</span>
                    </div>

                    {/* Actions Row */}
                    <div className="flex justify-between items-center border-b pb-2 text-xs font-bold text-gray-500">
                      <button onClick={() => toggleLike(p.id, 'like')} className="flex-1 py-1.5 flex justify-center items-center gap-1 hover:bg-gray-50 rounded-xl">
                        <Heart size={15} fill={p.isLiked ? 'red' : 'none'} className={p.isLiked ? 'text-red-500 scale-110' : ''} />
                        <span>Kici</span>
                      </button>
                      <button className="flex-1 py-1.5 flex justify-center items-center gap-1 hover:bg-gray-50 rounded-xl">
                        <MessageSquare size={15} />
                        <span>Faallo</span>
                      </button>
                      <button className="flex-1 py-1.5 flex justify-center items-center gap-1 hover:bg-gray-50 rounded-xl">
                        <Share2 size={15} />
                        <span>Wadaag</span>
                      </button>
                    </div>

                    {/* Nested comments */}
                    {p.comments.length > 0 && (
                      <div className="space-y-2.5 max-h-[150px] overflow-y-auto pr-1">
                        {p.comments.map(c => (
                          <div key={c.id} className="flex gap-2 text-[11px] items-start">
                            {renderAvatarBubble(c.authorAvatar, c.authorName, "w-6 h-6")}
                            <div className="bg-gray-50 p-2 rounded-xl grow">
                              <span className="font-extrabold text-gray-800 mr-2">{c.authorName}</span>
                              <span className="text-gray-600">{c.content}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Input box to add comment */}
                    <div className="flex gap-2">
                      {renderAvatarBubble(user.avatar, "My Avatar", "w-7 h-7")}
                      <div className="relative grow">
                        <input
                          type="text"
                          placeholder="Ku qor faallo kooban..."
                          className="w-full text-xs bg-gray-50 border rounded-full pl-3.5 pr-10 py-1.5"
                          value={commentInputs[p.id] || ''}
                          onChange={(e) => setCommentInputs({ ...commentInputs, [p.id]: e.target.value })}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddComment(p.id)}
                        />
                        <button onClick={() => handleAddComment(p.id)} className="absolute right-2.5 top-1 text-indigo-500 p-1"><Send size={12} /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Conditionally rendered subtab about page */}
      {activeSubTab === 'about' && (
        <div className="bg-white dark:bg-[var(--sl-bg-card)] border border-gray-150 dark:border-gray-800 rounded-2xl p-6 shadow-sm space-y-6">
          <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 uppercase tracking-widest border-b pb-2">Macluumaadka ku saabsan profile-ka</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-gray-700 dark:text-gray-300">
            <div className="space-y-4">
              <h4 className="font-bold text-gray-900 dark:text-white uppercase tracking-wider text-[10px] text-gray-400">Cinwaanka & Xiriirka</h4>
              <div className="space-y-2">
                <p>📍 Magaalada: <span className="font-semibold text-gray-800 dark:text-white">{introData.city}</span></p>
                <p>🌍 Dalka dhashay: <span className="font-semibold text-gray-800 dark:text-white">{introData.country}</span></p>
                <p>📞 Telefanka: <span className="font-semibold text-gray-800 dark:text-white">{introData.phone || 'Lama geliyeen'}</span></p>
              </div>
            </div>
            <div className="space-y-4">
              <h4 className="font-bold text-gray-900 dark:text-white uppercase tracking-wider text-[10px] text-gray-400">Nolosha & Dhalashada</h4>
              <div className="space-y-2">
                <p>🎂 Dhalashada: <span className="font-semibold text-gray-800 dark:text-white">{introData.dob}</span></p>
                <p>👤 Lab ama Dhedig: <span className="font-semibold text-gray-800 dark:text-white">{introData.gender}</span></p>
                <p>🌐 Website: <a href={`https://${introData.website}`} target="_blank" className="text-indigo-500 underline">{introData.website}</a></p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Conditionally rendered subtab photos gallery page */}
      {activeSubTab === 'photos' && (
        <div className="bg-white dark:bg-[var(--sl-bg-card)] border border-gray-150 dark:border-gray-800 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 uppercase tracking-widest border-b pb-2">Dhamaan sawirada la soo dhigay</h3>
          {photosUploaded.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-10">Malaha sawiro la soo dhigay sxb.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {photosUploaded.map((url, idx) => (
                <div key={idx} className="aspect-square bg-slate-50 border rounded-xl overflow-hidden shadow-xs hover:scale-101 hover:shadow-md transition-all cursor-pointer">
                  <img src={url} alt="Gallery" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Conditionally rendered subtab videos gallery page */}
      {activeSubTab === 'videos' && (
        <div className="bg-white dark:bg-[var(--sl-bg-card)] border border-gray-150 dark:border-gray-800 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 uppercase tracking-widest border-b pb-2">Dhamaan muuqaalada la soo dhigay</h3>
          {videosUploaded.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-10">Malaha muuqaalo la soo dhigay sxb.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {videosUploaded.map((url, idx) => (
                <div key={idx} className="bg-black rounded-xl overflow-hidden aspect-video border shadow-sm flex items-center justify-center">
                  <VideoPlayer src={url} controls className="w-full h-full" playsInline />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Conditionally rendered subtab friends page */}
      {activeSubTab === 'friends' && (
        <div className="bg-white dark:bg-[var(--sl-bg-card)] border border-gray-150 dark:border-gray-800 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 uppercase tracking-widest border-b pb-2">Xubnaha & Saaxiibada</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {allProfiles.map((person) => {
              const isFriend = user.friends?.includes(person.id);
              return (
                <div
                  key={person.id}
                  className="flex items-center justify-between p-3 border rounded-xl bg-gray-50/50 hover:bg-gray-50 transition-all cursor-pointer"
                  onClick={() => onViewProfile(person.id)}
                >
                  <div className="flex items-center gap-3">
                    {renderAvatarBubble(person.avatar, `${person.first_name} ${person.last_name}`, "w-12 h-12")}
                    <div>
                      <h4 className="text-xs font-bold text-gray-900 dark:text-white">{person.first_name} {person.last_name}</h4>
                      <p className="text-[10px] text-gray-400">{person.email}</p>
                    </div>
                  </div>
                  {person.id !== user.id && (
                    <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-2 py-1 rounded-lg">
                      {isFriend ? 'Saaxiib' : 'Xubin'}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Conditionally rendered subtab security and devices page */}
      {activeSubTab === 'security' && (
        <div className="bg-white dark:bg-[var(--sl-bg-card)] border border-gray-150 dark:border-gray-800 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
            <div className="text-left">
              <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 uppercase tracking-widest">Aaladaha & Kalfadhiyada Firfircoon</h3>
              <p className="text-xs text-gray-400 mt-1">Ku maamul dhammaan taleefannada, kombiyuutarrada iyo aaladaha hadda u furan akoonkaaga.</p>
            </div>
            {activeDevices.length > 1 && (
              <button
                onClick={handleLogoutAllOtherDevices}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-md transition-all shrink-0 cursor-pointer"
              >
                Ka Saar Dhammaan Aaladaha Kale
              </button>
            )}
          </div>

          {isLoadingDevices ? (
            <div className="text-center py-12 text-gray-400 text-xs flex flex-col items-center gap-2">
              <RefreshCw className="animate-spin text-indigo-500" size={24} />
              <span>La soo raranayaa liiska aaladaha...</span>
            </div>
          ) : activeDevices.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-10">Ma jiraan aalado kale oo hadda furan sxb.</p>
          ) : (
            <div className="space-y-3">
              {activeDevices.map((dev: any) => {
                const isCurrent = dev.id === localStorage.getItem('somluul_device_id');
                return (
                  <div
                    key={dev.id}
                    className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-xl gap-4 transition-all ${
                      isCurrent
                        ? 'bg-indigo-50/20 dark:bg-indigo-950/10 border-indigo-200 dark:border-indigo-900/40'
                        : 'bg-gray-50/40 dark:bg-gray-900/10 border-gray-100 dark:border-gray-800/80'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${
                        isCurrent
                          ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400'
                          : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                      }`}>
                        <Laptop size={20} />
                      </div>
                      <div className="space-y-0.5 text-left">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-gray-900 dark:text-white capitalize">
                            {dev.os} • {dev.browser}
                          </h4>
                          {isCurrent && (
                            <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase">
                              Aaladan (Current)
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-gray-400 font-mono">
                          IP Address: {dev.ip} • Last Active: {new Date(dev.last_active).toLocaleString()}
                        </p>
                        <p className="text-[11px] text-gray-500 font-semibold">
                          Goobta: {dev.location || 'Not determined'}
                        </p>
                      </div>
                    </div>

                    {!isCurrent && (
                      <button
                        onClick={() => handleLogoutDevice(dev.id)}
                        className="px-3.5 py-1.5 border border-red-200 dark:border-red-900/30 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600 dark:text-red-400 text-xs font-bold rounded-lg transition-all cursor-pointer inline-flex items-center gap-1.5"
                      >
                        Ka saar
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Send Message Modal Dialog */}
      {isMessagingOpen && profile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-[var(--sl-bg-card)] rounded-2xl border border-gray-150 dark:border-gray-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-150 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30">
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
                <h3 className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-widest">
                  {language === 'so' ? `Farriin u dir ${profile.first_name}` : `Send Message to ${profile.first_name}`}
                </h3>
              </div>
              <button 
                onClick={() => setIsMessagingOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 bg-indigo-50/40 dark:bg-indigo-950/10 p-3 rounded-xl border border-blue-100/50 dark:border-indigo-900/20">
                {renderAvatarBubble(profile.avatar, `${profile.first_name} ${profile.last_name}`, "w-10 h-10")}
                <div className="text-left">
                  <h4 className="text-xs font-bold text-gray-950 dark:text-white">{profile.first_name} {profile.last_name}</h4>
                  <p className="text-[10px] text-gray-400">{profile.bio || ''}</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-wider text-left">
                  {language === 'so' ? 'Qoraalka Farriinta' : 'Message Content'}
                </label>
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder={language === 'so' ? 'Ku qor halkan farriintaada badbaadsan...' : 'Type your secure message here...'}
                  rows={4}
                  className="w-full text-xs p-3.5 border border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50/50 focus:bg-white dark:bg-gray-900/50 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all resize-none"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-2.5 px-6 py-4 bg-gray-50/50 dark:bg-gray-900/30 border-t border-gray-150 dark:border-gray-800">
              <button
                onClick={() => setIsMessagingOpen(false)}
                className="px-4 py-2 bg-gray-150 hover:bg-gray-200 text-gray-700 dark:bg-gray-800 dark:hover:bg-gray-750 dark:text-gray-200 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                {language === 'so' ? 'Ka Noqo' : 'Cancel'}
              </button>
              <button
                onClick={handleSendMessage}
                disabled={isSendingMessage || !messageText.trim()}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer inline-flex items-center gap-1.5"
              >
                {isSendingMessage ? (
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <MessageSquare size={13} />
                )}
                <span>{language === 'so' ? 'Dir' : 'Send'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full-Screen Media Lightbox Preview Modal */}
      {previewMediaModal && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 backdrop-blur-md animate-fadeIn"
          onClick={() => setPreviewMediaModal(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPreviewMediaModal(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 p-2 text-sm font-bold flex items-center gap-1 bg-black/50 rounded-full px-3"
            >
              <X size={18} />
              <span>{language === 'so' ? 'Xir' : 'Close'}</span>
            </button>

            {previewMediaModal.type === 'video' || previewMediaModal.url.includes('.mp4') || previewMediaModal.url.startsWith('data:video') ? (
              <VideoPlayer src={previewMediaModal.url} controls autoPlay className="max-w-full max-h-[80vh] rounded-2xl shadow-2xl" />
            ) : (
              <img src={previewMediaModal.url} alt="Media preview" className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl" />
            )}

            {previewMediaModal.title && (
              <p className="text-white/80 text-xs mt-3 font-semibold text-center max-w-md line-clamp-2">
                {previewMediaModal.title}
              </p>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

// Simple HeartHandshake Icon component replacement for lucide issues
const HeartHandshakeIcon = (props: any) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size || "24"}
    height={props.size || "24"}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={props.className}
  >
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    <path d="M12 5 9.04 7.96a2.17 2.17 0 0 0 0 3.08c.82.82 2.13.85 3 .07l2.07-1.9a1.86 1.86 0 0 1 2.67 0c.74.75.74 1.95 0 2.7l-2.82 2.82" />
  </svg>
);
