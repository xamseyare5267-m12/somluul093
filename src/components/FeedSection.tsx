import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios'
import { fetchFeedPosts, createFeedPost, reactToPost, commentOnPost, uploadMediaFile, prefetchScaleStatus } from '../lib/scaleClient';
import { useLanguage } from './LanguageContext';
import { assertCleanContent, assertCleanFile } from '../lib/contentSafety';
import { 
  Heart, MessageCircle, Share2, Send, MoreHorizontal, Plus, Video, Image, Music,
  Globe, Bookmark, Sparkles, Check, X, HardDrive, Download, FileText, Megaphone,
  MessageSquare, Minimize2, Maximize2, ShieldCheck, Users, Smile, HeartHandshake, Eye,
  RefreshCw, Play
} from 'lucide-react';
import { Post, Story } from '../types';
import { formatTimeAgo } from '../utils';
import { motion, AnimatePresence } from 'motion/react';
import { VideoPlayer } from './VideoPlayer';

interface FeedSectionProps {
  user?: any;
  authToken?: string;
  onGoToStorage?: () => void;
  onDownloadFile?: (file: any) => void;
  onShowToast?: (message: string, type: 'success' | 'error') => void;
  onViewProfile?: (userIdOrHandle: string) => void;
}

interface ActiveChatBox {
  id: string;
  name: string;
  avatar: string;
  messages: { id: string; text: string; isSelf: boolean; time: string }[];
  isMinimized: boolean;
}

export const FeedSection: React.FC<FeedSectionProps> = ({
  user,
  authToken,
  onGoToStorage,
  onDownloadFile,
  onShowToast,
  onViewProfile
}) => {
  const { t, language } = useLanguage();

  const renderAuthorAvatar = (avatar: string | null | undefined, name: string, sizeClass: string = "w-10 h-10") => {
    let cleanAvatar = avatar;
    if (cleanAvatar && cleanAvatar.includes('photo-1535713875002-d1d0cf377fde')) {
      cleanAvatar = null;
    }
    const isUrl = cleanAvatar && (cleanAvatar.startsWith('http') || cleanAvatar.startsWith('/') || cleanAvatar.startsWith('data:image'));
    if (isUrl) {
      return (
        <img
          src={cleanAvatar}
          alt={name}
          className={`${sizeClass} rounded-full object-cover border border-gray-100 dark:border-gray-800 shrink-0`}
          referrerPolicy="no-referrer"
        />
      );
    }
    
    // Resolve clean display name if generic placeholders were passed
    let effectiveName = name;
    if (!effectiveName || effectiveName.toLowerCase().includes('avatar') || effectiveName === 'My avatar' || effectiveName === 'User Avatar') {
      effectiveName = user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : (user?.username || 'User');
    }

    const parts = effectiveName.trim().split(' ').filter(Boolean);
    let initials = '👤';
    if (parts.length >= 2) {
      initials = `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    } else if (parts.length === 1 && parts[0].length > 0) {
      initials = parts[0].slice(0, 2).toUpperCase();
    }

    return (
      <div className={`${sizeClass} rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-600 text-white flex items-center justify-center text-xs font-black shadow-xs shrink-0 border border-blue-400/30 font-sans tracking-tight`}>
        {initials}
      </div>
    );
  };

  // State Management
  const [posts, setPosts] = useState<Post[]>([]);
  const [feedPage, setFeedPage] = useState(1);
  const [feedHasMore, setFeedHasMore] = useState(true);
  const [feedLoadingMore, setFeedLoadingMore] = useState(false);
  const [stories, setStories] = useState<Story[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [userFiles, setUserFiles] = useState<any[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [systemNotice, setSystemNotice] = useState('');

  // Active floating chat boxes (Facebook-style)
  const [activeChats, setActiveChats] = useState<ActiveChatBox[]>([]);
  const [chatInputs, setChatInputs] = useState<Record<string, string>>({});

  // Story modals & uploader state
  const [activeStoryGroup, setActiveStoryGroup] = useState<StoryGroup | null>(null);
  const [activeStoryIndex, setActiveStoryIndex] = useState<number>(0);
  const [storyTimer, setStoryTimer] = useState(0);
  const [storyViewers, setStoryViewers] = useState<any[]>([]);
  const [showStoryViewers, setShowStoryViewers] = useState(false);
  const [showStoryCreator, setShowStoryCreator] = useState(false);
  const [newStoryMedia, setNewStoryMedia] = useState('');
  const [newStoryMediaType, setNewStoryMediaType] = useState<'image' | 'video'>('image');
  const [customStoryUrl, setCustomStoryUrl] = useState('');
  const [isCreatingStory, setIsCreatingStory] = useState(false);

  // New Post States
  const [previewMediaModal, setPreviewMediaModal] = useState<{ url: string; type?: string; title?: string } | null>(null);
  const [newPostContent, setNewPostContent] = useState('');
  const [composerExpanded, setComposerExpanded] = useState(false);
  const [postType, setPostType] = useState<'text' | 'image' | 'audio' | 'video'>('text');
  const [imageLink, setImageLink] = useState('');
  const [attachedMediaList, setAttachedMediaList] = useState<{ type: 'image' | 'video' | 'audio'; url: string }[]>([]);
  const [isPublishingPost, setIsPublishingPost] = useState(false);
  const [openPostMenuId, setOpenPostMenuId] = useState<string | null>(null);
  const [reportTarget, setReportTarget] = useState<{ type: 'post' | 'user'; id: string } | null>(null);
  const [reportReason, setReportReason] = useState('spam');
  const [hiddenPostIds, setHiddenPostIds] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Comment & Share States
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [replyToComment, setReplyToComment] = useState<Record<string, string | null>>({});
  const [sharingPost, setSharingPost] = useState<Post | null>(null);

  // Refs
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const storyFileInputRef = useRef<HTMLInputElement | null>(null);
  const chatScrollRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Active online contacts — real users only (fetched from API)
  const [onlineContacts, setOnlineContacts] = useState<{ id: string; name: string; avatar: string | null; bio?: string }[]>([]);

  useEffect(() => {
    if (!authToken) return;
    axios.get('/api/profiles', { headers: { Authorization: `Bearer ${authToken}` } })
      .then(res => {
        const profiles = (res.data || [])
          .filter((p: any) => p.id !== user?.id)
          .slice(0, 8)
          .map((p: any) => ({
            id: p.id,
            name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.email?.split('@')[0] || 'User',
            avatar: p.avatar || null,
            bio: p.bio || p.work || ''
          }));
        setOnlineContacts(profiles);
      })
      .catch(() => setOnlineContacts([]));
  }, [authToken, user?.id]);

  const [feedAds, setFeedAds] = useState<any[]>([]);
  useEffect(() => {
    axios.get('/api/ads').then(res => setFeedAds(res.data || [])).catch(() => setFeedAds([]));
  }, []);

  // Load Data — supports paginated { data, hasMore } and legacy array responses
  const normalizePostsResponse = (data: any): { list: Post[]; hasMore: boolean; page: number } => {
    if (Array.isArray(data)) return { list: data, hasMore: false, page: 1 };
    if (data && Array.isArray(data.data)) {
      return { list: data.data, hasMore: !!data.hasMore, page: data.page || 1 };
    }
    if (data && Array.isArray(data.posts)) {
      return { list: data.posts, hasMore: !!data.hasMore, page: data.page || 1 };
    }
    return { list: [], hasMore: false, page: 1 };
  };

  const fetchPosts = async (page = 1, append = false) => {
    try {
      if (append) setFeedLoadingMore(true);
      else setFeedError(null);
      const feedResult = await fetchFeedPosts({ page, limit: 30 });
      const serverPosts = feedResult.list;
      const hasMore = feedResult.hasMore;

      const mergedPosts = [...serverPosts];

      const myHandle = (user?.username || user?.email?.split('@')[0] || '').toLowerCase();
      mergedPosts.forEach((p: Post) => {
        if (p.author) {
          if (p.author.avatar && p.author.avatar.includes('photo-1535713875002-d1d0cf377fde')) {
            p.author.avatar = null;
          }
          if (p.author.handle && p.author.handle.toLowerCase() === myHandle) {
            p.author.avatar = user?.avatar || null;
          }
        }
      });

      setPosts(prev => {
        if (!append) return mergedPosts;
        const ids = new Set(prev.map(x => x.id));
        return [...prev, ...mergedPosts.filter(x => !ids.has(x.id))];
      });
      setFeedPage(page);
      setFeedHasMore(hasMore);
      setFeedError(null);
    } catch (err) {
      console.error('Error fetching posts:', err);
      if (!append) {
        setFeedError(
          language === 'so'
            ? 'Posts-ka lama soo rarayn. Hubi internet-ka oo isku day mar kale.'
            : 'Could not load posts. Check your connection and try again.'
        );
      }
    } finally {
      setIsLoading(false);
      setFeedLoadingMore(false);
    }
  };

  const fetchStories = async () => {
    try {
      const response = await axios.get('/api/stories');
      let serverStories = response.data || [];

      setStories(serverStories);
    } catch (err) {
      console.error('Error fetching stories:', err);
    }
  };

  interface StoryGroup {
    authorName: string;
    authorAvatar: string | null;
    items: Story[];
    hasUnread: boolean;
  }

  // Group stories by author so each user has ONE story card/entry
  const groupedStories = useMemo<StoryGroup[]>(() => {
    const map: { [key: string]: StoryGroup } = {};
    stories.forEach(s => {
      const key = (s.authorName || 'SomLuul User').trim().toLowerCase();
      if (!map[key]) {
        map[key] = {
          authorName: s.authorName || 'SomLuul User',
          authorAvatar: s.authorAvatar || null,
          items: [],
          hasUnread: false
        };
      }
      map[key].items.push(s);
      if (s.isUnread) {
        map[key].hasUnread = true;
      }
    });
    return Object.values(map);
  }, [stories]);

  const fetchSystemNotice = async () => {
    try {
      const response = await axios.get('/api/system-notice');
      setSystemNotice(response.data.system_notice || '');
    } catch (err) {
      console.error('Error fetching system notice:', err);
    }
  };

  const handleRefreshFeed = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([fetchPosts(1, false), fetchStories(), fetchSystemNotice()]);
      if (onShowToast) {
        onShowToast(
          language === 'so'
            ? 'Bogga waa la cusbooneysiiyay si guul leh!'
            : 'Page refreshed successfully!',
          'success'
        );
      }
    } catch (err) {
      console.error('Error refreshing feed:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPosts();
    fetchStories();
    fetchSystemNotice();

    if (authToken) {
      setLoadingFiles(true);
      axios.get('/api/files', {
        headers: { Authorization: `Bearer ${authToken}` },
        params: { limit: 5 }
      })
      .then(res => {
        setUserFiles(res.data.data || []);
      })
      .catch(err => {
        console.error("Error loading files in feed:", err);
      })
      .finally(() => {
        setLoadingFiles(false);
      });
    }
  }, [authToken]);

  // Handle active story viewer progress bar
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeStoryGroup) {
      setStoryTimer(0);
      interval = setInterval(() => {
        setStoryTimer(prev => {
          if (prev >= 100) {
            if (activeStoryIndex < activeStoryGroup.items.length - 1) {
              setActiveStoryIndex(i => i + 1);
              return 0;
            } else {
              setActiveStoryGroup(null);
              return 0;
            }
          }
          return prev + 2;
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [activeStoryGroup, activeStoryIndex]);

  // Record story view for analytics / owner viewer list
  useEffect(() => {
    if (!activeStoryGroup || !authToken) return;
    const item: any = activeStoryGroup.items?.[activeStoryIndex];
    if (!item?.id) return;
    setShowStoryViewers(false);
    setStoryViewers([]);
    axios.post(`/api/stories/${item.id}/view`, {}, {
      headers: { Authorization: `Bearer ${authToken}` }
    }).catch(() => {});
    // If this is my story, load viewer list
    const myName = user ? `${user.first_name} ${user.last_name}`.trim().toLowerCase() : '';
    const isMine = (item.authorId && user?.id && item.authorId === user.id) ||
      (activeStoryGroup.authorName || '').trim().toLowerCase() === myName;
    if (isMine) {
      axios.get(`/api/stories/${item.id}/viewers`, {
        headers: { Authorization: `Bearer ${authToken}` }
      }).then(res => {
        setStoryViewers(res.data?.viewers || []);
      }).catch(() => setStoryViewers([]));
    }
  }, [activeStoryGroup, activeStoryIndex, authToken, user?.id]);

  // Server File Upload Helper for Posts & Media
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
        const url = await uploadMediaFile(file);
        if (url && typeof url === 'string') {
          return { type: mediaType, url };
        }
      } catch (err) {
        console.warn('Server upload failed:', err);
      }
    }

    // Base64 only for small images — large video base64 breaks posts after refresh
    if (mediaType === 'image' && file.size < 2 * 1024 * 1024) {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve({ type: mediaType, url: reader.result as string });
        };
        reader.readAsDataURL(file);
      });
    }
    throw new Error(
      mediaType === 'video'
        ? 'Video upload failed. Check server / Supabase storage, then try again.'
        : 'Image upload failed. Try again.'
    );
  };

  // Image Upload handler
  const triggerImageUpload = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  // Facebook-style limits
  const FB_MAX_IMAGE_BYTES = 10 * 1024 * 1024;   // 10 MB per photo
  const FB_MAX_VIDEO_BYTES = 1024 * 1024 * 1024; // 1 GB per video
  const FB_MAX_MEDIA_COUNT = 10;
  const FB_MAX_TEXT_LENGTH = 63206;

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const fileList = Array.from(files) as File[];
      for (const file of fileList) {
        try {
          if (attachedMediaList.length >= FB_MAX_MEDIA_COUNT) {
            if (onShowToast) onShowToast(language === 'so' ? `Ugu badnaan ${FB_MAX_MEDIA_COUNT} sawir/muqaal post kasta (sida Facebook).` : `Max ${FB_MAX_MEDIA_COUNT} media per post (Facebook-style).`, 'error');
            break;
          }
          const safety = assertCleanFile(file, language);
          if (!safety.ok) {
            if (onShowToast) onShowToast(safety.message, 'error');
            continue;
          }
          const isVideo = file.type.startsWith('video');
          const maxBytes = isVideo ? FB_MAX_VIDEO_BYTES : FB_MAX_IMAGE_BYTES;
          const maxLabel = isVideo ? '1 GB' : '10 MB';
          if (file.size > maxBytes) {
            if (onShowToast) onShowToast(
              language === 'so'
                ? `Faylka waa weyn yahay (max ${maxLabel}, sida Facebook). Dooro mid ka yar.`
                : `File too large (max ${maxLabel}, Facebook-style).`,
              'error'
            );
            continue;
          }
          const uploaded = await uploadFileToServer(file);
          setAttachedMediaList(prev => {
            if (prev.length >= FB_MAX_MEDIA_COUNT) return prev;
            return [...prev, uploaded];
          });
          setPostType(uploaded.type);
          if (onShowToast) onShowToast(language === 'so' ? 'Sawir/muuqaal waa la lifaaqay — hadda Post riix.' : 'Media attached — click Post.', 'success');
        } catch (err) {
          console.error('Media attach failed:', err);
          if (onShowToast) onShowToast(language === 'so' ? 'Ku lifaaqidda sawirka way fashilantay.' : 'Failed to attach media.', 'error');
        }
      }
      e.target.value = '';
    }
  };

  // Video Upload handler
  const triggerVideoUpload = () => {
    if (videoInputRef.current) videoInputRef.current.click();
  };

  const handleVideoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const fileList = Array.from(files) as File[];
      for (const file of fileList) {
        try {
          if (attachedMediaList.length >= FB_MAX_MEDIA_COUNT) {
            if (onShowToast) onShowToast(language === 'so' ? `Ugu badnaan ${FB_MAX_MEDIA_COUNT} media post kasta.` : `Max ${FB_MAX_MEDIA_COUNT} media per post.`, 'error');
            break;
          }
          const safety = assertCleanFile(file, language);
          if (!safety.ok) {
            if (onShowToast) onShowToast(safety.message, 'error');
            continue;
          }
          if (file.size > FB_MAX_VIDEO_BYTES) {
            if (onShowToast) onShowToast(language === 'so' ? 'Video aad u weyn (max 1 GB, sida Facebook).' : 'Video too large (max 1 GB, Facebook-style).', 'error');
            continue;
          }
          const uploaded = await uploadFileToServer(file);
          setAttachedMediaList(prev => {
            if (prev.length >= FB_MAX_MEDIA_COUNT) return prev;
            return [...prev, uploaded];
          });
          setPostType(uploaded.type);
          if (onShowToast) onShowToast(language === 'so' ? 'Video waa la lifaaqay — hadda Post riix.' : 'Video attached — click Post.', 'success');
        } catch (err) {
          console.error('Video attach failed:', err);
          if (onShowToast) onShowToast(language === 'so' ? 'Video lifaaqid way fashilantay.' : 'Failed to attach video.', 'error');
        }
      }
      e.target.value = '';
    }
  };

  // Story file uploader
  const triggerStoryUpload = () => {
    if (storyFileInputRef.current) storyFileInputRef.current.click();
  };

  const handleStoryFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const safety = assertCleanFile(file, language);
      if (!safety.ok) {
        if (onShowToast) onShowToast(safety.message, 'error');
        e.target.value = '';
        return;
      }
      const isVideo = file.type.startsWith('video') || file.name.endsWith('.mp4') || file.name.endsWith('.webm') || file.name.endsWith('.mov');
      const maxBytes = isVideo ? FB_MAX_VIDEO_BYTES : FB_MAX_IMAGE_BYTES;
      const maxLabel = isVideo ? '1 GB' : '10 MB';
      if (file.size > maxBytes) {
        if (onShowToast) onShowToast(
          language === 'so' ? `Story fayl waa weyn yahay (max ${maxLabel}).` : `Story file too large (max ${maxLabel}).`,
          'error'
        );
        e.target.value = '';
        return;
      }
      setNewStoryMediaType(isVideo ? 'video' : 'image');
      // Prefer server upload for large files
      uploadFileToServer(file).then((uploaded) => {
        setNewStoryMedia(uploaded.url);
      }).catch(() => {
        const reader = new FileReader();
        reader.onloadend = () => setNewStoryMedia(reader.result as string);
        reader.readAsDataURL(file);
      });
    }
  };

  // Create Post
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostContent.trim() && !imageLink && attachedMediaList.length === 0) return;
    if (newPostContent.length > FB_MAX_TEXT_LENGTH) {
      if (onShowToast) onShowToast(
        language === 'so'
          ? `Qoraalka wuu dheer yahay (max ${FB_MAX_TEXT_LENGTH} xaraf, sida Facebook).`
          : `Text too long (max ${FB_MAX_TEXT_LENGTH} chars, Facebook-style).`,
        'error'
      );
      return;
    }
    {
      // Only scan human-written caption — media URLs/data are never keyword-scanned (false positives)
      const safety = assertCleanContent(language, newPostContent);
      if (!safety.ok) {
        if (onShowToast) onShowToast(safety.message, 'error');
        return;
      }
    }

    setIsPublishingPost(true);
    
    // Determine backward-compatible singular mediaUrl and mediaType
    let primaryMediaType = postType;
    let primaryMediaUrl = (postType !== 'text') ? imageLink : undefined;
    
    if (attachedMediaList.length > 0) {
      primaryMediaType = attachedMediaList[0].type;
      primaryMediaUrl = attachedMediaList[0].url;
    }

    const payload = {
      content: newPostContent,
      mediaType: primaryMediaType,
      mediaUrl: primaryMediaUrl,
      mediaList: attachedMediaList.length > 0 ? attachedMediaList : undefined
    };

    // Determine token
    let activeToken = authToken;
    if (!activeToken) {
      try {
        const saved = localStorage.getItem('auth_session') || sessionStorage.getItem('auth_session');
        if (saved) {
          const parsed = JSON.parse(saved);
          activeToken = parsed.token;
        }
      } catch (_) {}
    }

    try {
      const { post: newCreatedPost } = await createFeedPost(payload, activeToken);

      setPosts([newCreatedPost, ...posts]);
      setNewPostContent('');
      setImageLink('');
      setAttachedMediaList([]);
      setPostType('text');
      setComposerExpanded(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (videoInputRef.current) videoInputRef.current.value = '';
      if (onShowToast) onShowToast('Farriintaada/Muuqaalkaaga waa la daabacay!', 'success');
    } catch (err: any) {
      console.error('Error creating post on server:', err);
      if (onShowToast) {
        const serverError = err?.response?.data?.error;
        onShowToast(
          serverError || (language === 'so' ? 'Post-ka lama daabicin. Server-ka hubi oo isku day mar kale.' : 'Post was not published. Check the server and try again.'),
          'error'
        );
      }
    } finally {
      setIsPublishingPost(false);
    }
  };

  // Create Story
  const handlePublishStory = async () => {
    const media = newStoryMedia || customStoryUrl;
    if (!media) {
      if (onShowToast) onShowToast('Fadlan geli sawir ama muuqaal!', 'error');
      return;
    }

    let isVideo = newStoryMediaType === 'video';
    if (media.startsWith('data:video') || media.includes('.mp4') || media.includes('.webm') || media.includes('.mov')) {
      isVideo = true;
    }

    setIsCreatingStory(true);
    try {
      const response = await axios.post('/api/stories', {
        mediaUrl: media,
        mediaType: isVideo ? 'video' : 'image'
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      const newStoryItem = response.data;

      setStories([newStoryItem, ...stories]);
      setShowStoryCreator(false);
      setNewStoryMedia('');
      setCustomStoryUrl('');
      setNewStoryMediaType('image');
      if (onShowToast) onShowToast('Sheekadaada (Story/Status) waa la daray!', 'success');
    } catch (err) {
      console.error('Error publishing story:', err);
      if (onShowToast) onShowToast('Ku darista sheekada waa ay guuldareysatay.', 'error');
    } finally {
      setIsCreatingStory(false);
    }
  };


  // Infinite scroll: load next page near bottom of window
  useEffect(() => {
    const onScroll = () => {
      if (!feedHasMore || feedLoadingMore || isLoading) return;
      const nearBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 400;
      if (nearBottom) {
        fetchPosts(feedPage + 1, true);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [feedHasMore, feedLoadingMore, feedPage, isLoading]);

  // Multi-reaction: like | love | haha | wow | sad | angry
  type ReactionKind = 'like' | 'love' | 'haha' | 'wow' | 'sad' | 'angry';
  const [reactionPickerFor, setReactionPickerFor] = useState<string | null>(null);

  const REACTION_META: Record<ReactionKind, { emoji: string; label: string; color: string }> = {
    like:  { emoji: '👍', label: 'Like',  color: 'text-indigo-600' },
    love:  { emoji: '❤️', label: 'Love',  color: 'text-red-500' },
    haha:  { emoji: '😆', label: 'Haha',  color: 'text-amber-500' },
    wow:   { emoji: '😮', label: 'Wow',   color: 'text-amber-400' },
    sad:   { emoji: '😢', label: 'Sad',   color: 'text-amber-600' },
    angry: { emoji: '😡', label: 'Angry', color: 'text-orange-600' },
  };

  const toggleLike = async (postId: string, type: ReactionKind) => {
    setReactionPickerFor(null);
    try {
      await reactToPost(postId, type || 'like');
      // Optimistic local update; scale path may not return full post
      setPosts(posts.map(p => {
        if (p.id !== postId) return p;
        const reactions = { ...(p.reactions || {}) } as any;
        reactions[type || 'like'] = (reactions[type || 'like'] || 0) + 1;
        return { ...p, reactions, userReaction: type || 'like' };
      }));
    } catch (err) {
      console.error('Error toggling reaction:', err);
      setPosts(posts.map(p => {
        if (p.id !== postId) return p;
        const prev = (p as any).myReaction as ReactionKind | null;
        const next = prev === type ? null : type;
        return {
          ...p,
          myReaction: next,
          isLiked: next === 'like',
          isLoved: next === 'love',
          likes: Math.max(0, (p.likes || 0) + (next ? 1 : -1) + (prev ? -1 : 0) + (prev && next ? 1 : 0)),
        } as any;
      }));
    }
  };

  // Bookmarks
  const toggleSave = (postId: string) => {
    setPosts(posts.map(p => {
      if (p.id === postId) {
        const nextSaved = !p.isSaved;
        if (onShowToast) {
          onShowToast(nextSaved ? 'Waa lagu daray kuwa la kaydsaday!' : 'Waa laga saaray kuwa la kaydsaday.', 'success');
        }
        return { ...p, isSaved: nextSaved };
      }
      return p;
    }));
  };

  // Comment Addition (supports nested replies via parentId)
  const handleAddComment = async (postId: string) => {
    const text = commentInputs[postId];
    if (!text || !text.trim()) return;
    const parentId = replyToComment[postId] || undefined;

    try {
      const comment = await commentOnPost(postId, text, parentId);
      setPosts(posts.map(p => {
        if (p.id !== postId) return p;
        const comments = Array.isArray(p.comments) ? [...p.comments, comment] : [comment];
        return { ...p, comments };
      }));
      setCommentInputs({ ...commentInputs, [postId]: '' });
      setReplyToComment({ ...replyToComment, [postId]: null });
    } catch (err) {
      console.error('Error adding comment:', err);
      // Local fallback
      setPosts(posts.map(p => {
        if (p.id === postId) {
          return {
            ...p,
            comments: [
              ...p.comments,
              {
                id: `c-${Date.now()}`,
                authorId: user?.id,
                authorName: user ? `${user.first_name} ${user.last_name}` : 'You',
                authorAvatar: user?.avatar || null,
                content: text.trim(),
                created_at: new Date().toISOString()
              }
            ]
          };
        }
        return p;
      }));
      setCommentInputs({ ...commentInputs, [postId]: '' });
    }
  };

  const submitReport = async () => {
    if (!reportTarget || !authToken) return;
    try {
      await axios.post('/api/reports', {
        targetType: reportTarget.type,
        targetId: reportTarget.id,
        reason: reportReason,
        details: ''
      }, { headers: { Authorization: `Bearer ${authToken}` } });
      if (onShowToast) onShowToast(language === 'so' ? 'Warbixinta waa la diray. Waad ku mahadsan tahay.' : 'Report submitted. Thank you.', 'success');
      setReportTarget(null);
      setOpenPostMenuId(null);
    } catch (err: any) {
      if (onShowToast) onShowToast(err?.response?.data?.error || 'Report failed', 'error');
    }
  };

  const hidePost = (postId: string) => {
    setHiddenPostIds(prev => [...prev, postId]);
    setOpenPostMenuId(null);
    if (onShowToast) onShowToast(language === 'so' ? 'Post-ka waa la qariyay.' : 'Post hidden.', 'success');
  };

  const deleteOwnPost = async (postId: string) => {
    if (!authToken) return;
    try {
      await axios.delete(`/api/posts/${postId}`, { headers: { Authorization: `Bearer ${authToken}` } });
      setPosts(prev => prev.filter(p => p.id !== postId));
      if (onShowToast) onShowToast(language === 'so' ? 'Post-ka waa la tirtiray.' : 'Post deleted.', 'success');
    } catch (err: any) {
      if (onShowToast) onShowToast(err?.response?.data?.error || 'Delete failed', 'error');
    }
    setOpenPostMenuId(null);
  };

  const togglePinPost = async (postId: string) => {
    if (!authToken) return;
    try {
      const res = await axios.post(`/api/posts/${postId}/pin`, {}, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      setPosts(prev => {
        const updated = prev.map(x => x.id === postId ? { ...x, ...res.data } : x);
        updated.sort((a, b) => {
          const ap = (a as any).isPinned ? 1 : 0;
          const bp = (b as any).isPinned ? 1 : 0;
          if (bp !== ap) return bp - ap;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
        return updated;
      });
      setOpenPostMenuId(null);
      if (onShowToast) onShowToast(res.data.isPinned ? (language === 'so' ? 'Post waa la pin-gareeyay' : 'Post pinned') : (language === 'so' ? 'Pin waa laga qaaday' : 'Post unpinned'), 'success');
    } catch (err: any) {
      if (onShowToast) onShowToast(err?.response?.data?.error || 'Pin failed', 'error');
    }
  };

  // Share post helper
  const triggerSharePost = (post: Post) => {
    setSharingPost(post);
  };

  const confirmShare = async (option: 'messenger' | 'timeline' | 'copy') => {
    if (!sharingPost) return;

    if (option === 'copy') {
      const postUrl = `${window.location.origin}/?tab=feed&post=${encodeURIComponent(sharingPost.id)}`;
      try {
        await navigator.clipboard.writeText(postUrl);
        if (onShowToast) onShowToast(language === 'so' ? 'Link-ga waa la koobiyeeyay!' : 'Link copied!', 'success');
      } catch {
        if (onShowToast) onShowToast('Copy failed', 'error');
      }
    } else if (option === 'timeline') {
      const content = `🔄 Wadaagay qoraalka ${sharingPost.author?.handle ? '@' + sharingPost.author.handle : (sharingPost.author?.name || '')}:\n\n"${sharingPost.content || ''}"`;
      try {
        if (authToken) {
          const res = await axios.post('/api/posts', {
            content,
            mediaType: sharingPost.mediaType || 'none',
            mediaUrl: sharingPost.mediaUrl || undefined,
            sharedFromPostId: sharingPost.id,
          }, { headers: { Authorization: `Bearer ${authToken}` } });
          const created = res.data?.post || res.data;
          if (created) {
            setPosts(prev => [created, ...prev]);
          }
          if (onShowToast) onShowToast(language === 'so' ? 'Qoraalka waa lagu daray timeline-kaaga!' : 'Shared to your timeline!', 'success');
        } else {
          if (onShowToast) onShowToast(language === 'so' ? 'Fadlan soo gal si aad u wadaagto' : 'Please log in to share', 'error');
        }
      } catch (err: any) {
        if (onShowToast) onShowToast(err?.response?.data?.error || 'Share failed', 'error');
      }
    } else if (option === 'messenger') {
      // Open real messenger with share intent via localStorage target
      try {
        localStorage.setItem('somluul_share_post', JSON.stringify({
          id: sharingPost.id,
          content: sharingPost.content,
          author: sharingPost.author,
        }));
      } catch (_) {}
      if (typeof window !== 'undefined') {
        window.history.replaceState({}, '', '?tab=messenger');
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
      if (onShowToast) onShowToast(language === 'so' ? 'Messenger — dooro qof aad ula wadaagto' : 'Messenger — pick who to share with', 'success');
    }

    setSharingPost(null);
  };

  // Open Chatbox
  const handleOpenChat = (contact: any) => {
    // Check if already open
    if (activeChats.find(c => c.id === contact.id)) {
      setActiveChats(activeChats.map(c => c.id === contact.id ? { ...c, isMinimized: false } : c));
      return;
    }

    // Max 3 chat boxes on screen
    const rawChats = [...activeChats];
    if (rawChats.length >= 3) {
      rawChats.shift(); // remove oldest
    }

    const newChat: ActiveChatBox = {
      id: contact.id,
      name: contact.name,
      avatar: contact.avatar,
      messages: [],
      isMinimized: false
    };

    setActiveChats([...rawChats, newChat]);
  };

  // Close Chatbox
  const handleCloseChat = (chatId: string) => {
    setActiveChats(activeChats.filter(c => c.id !== chatId));
  };

  // Minimize Chatbox
  const toggleMinimizeChat = (chatId: string) => {
    setActiveChats(activeChats.map(c => c.id === chatId ? { ...c, isMinimized: !c.isMinimized } : c));
  };

  // Send Messenger message from floating chatbox
  const handleSendChatMessage = (chatId: string) => {
    const text = chatInputs[chatId];
    if (!text || !text.trim()) return;

    setActiveChats(prev => prev.map(c => {
      if (c.id === chatId) {
        return {
          ...c,
          messages: [
            ...c.messages,
            { id: `m-${Date.now()}`, text, isSelf: true, time: 'Just now' }
          ]
        };
      }
      return c;
    }));

    setChatInputs({ ...chatInputs, [chatId]: '' });
    // Real delivery only — no auto-reply bots. Other user answers themselves via Messenger.
  };

  return (
    <div id="feed-root-grid" className="feed-root grid grid-cols-1 xl:grid-cols-[280px_minmax(0,680px)_280px] gap-0 sm:gap-4 max-w-[1080px] mx-auto py-0 sm:py-2 px-0 sm:px-2 md:px-3 pb-20 md:pb-3 w-full overflow-x-hidden bg-[var(--sl-bg)] dark:bg-[var(--sl-bg)] isolate">
      
      {/* 1. LEFT SIDEBAR: Nav and Quick Stats (Visible on desktop XL) */}
      <div className="hidden xl:flex flex-col space-y-6">
        <div className="feed-card bg-white dark:bg-[var(--sl-bg-card)] border border-gray-200 dark:border-[var(--sl-border)] rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3 pb-4 border-b border-gray-100 dark:border-gray-800/60 mb-4">
            {renderAuthorAvatar(user?.avatar, 'User Avatar', 'w-12 h-12')}
            <div>
              <h4 className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
                {user?.first_name} {user?.last_name}
              </h4>
              <p className="text-[10px] text-gray-400 font-mono">@{user?.email?.split('@')?.[0]}</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs p-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-xl transition-all">
              <span className="text-gray-500 dark:text-gray-400 font-medium flex items-center gap-2">
                <Users size={14} className="text-indigo-500" /> Followers
              </span>
              <span className="font-bold text-gray-800 dark:text-white">{Array.isArray((user as any)?.followers) ? (user as any).followers.length : ((user as any)?.followers_count ?? 0)}</span>
            </div>
            <div className="flex items-center justify-between text-xs p-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-xl transition-all">
              <span className="text-gray-500 dark:text-gray-400 font-medium flex items-center gap-2">
                <Smile size={14} className="text-emerald-500" /> Following
              </span>
              <span className="font-bold text-gray-800 dark:text-white">{Array.isArray(user?.following) ? user.following.length : (user?.following_count || 0)}</span>
            </div>
            <div className="flex items-center justify-between text-xs p-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-xl transition-all">
              <span className="text-gray-500 dark:text-gray-400 font-medium flex items-center gap-2">
                <Eye size={14} className="text-amber-500" /> Profile Views
              </span>
              <span className="font-bold text-gray-800 dark:text-white">324 kan toddobaadkan</span>
            </div>
          </div>
        </div>

        {/* Quick Help & Privacy Pledge */}
        <div className="bg-gradient-to-br from-[#121824] to-[#1a2333] border border-gray-800 rounded-2xl p-4 text-white">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck size={16} className="text-indigo-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider">Amniga SomLuul</h4>
          </div>
          <p className="text-[11px] text-gray-300 leading-relaxed">
            SomLuul waxay isticmaashaa sirta dhamaadka-ilaa-dhamaadka (End-to-End Encryption) si loo hubiyo in xogtaada iyo wada sheekaysigiinu ay ahaan karaan kuwa gaar ah oo ammaan ah.
          </p>
        </div>
      </div>

      {/* 2. MIDDLE CONTENT COLUMN: Composer → Stories → Posts (Facebook order) */}
      <div className="flex flex-col gap-2 sm:gap-4 min-w-0 w-full">
        
        {/* SYSTEM NOTICE (If any) */}
        {systemNotice && (
          <div className="order-0 p-4 bg-amber-500/10 dark:bg-amber-950/20 border border-amber-500/20 dark:border-amber-900/30 rounded-2xl flex items-start gap-3.5 shadow-xs relative overflow-hidden animate-fade-in">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-amber-500/20 to-transparent rounded-full blur-2xl pointer-events-none" />
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 dark:bg-amber-500/25 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 border border-amber-500/20">
              <Megaphone size={17} className="animate-bounce" />
            </div>
            <div className="space-y-1 grow min-w-0">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-600 dark:text-amber-400 flex items-center gap-1">
                📢 Farriin rasmi ah
              </span>
              <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-line">
                {systemNotice}
              </p>
            </div>
          </div>
        )}

        {/* STORIES BAR — Premium horizontal stories. order-2 so composer is first */}
        <div id="stories-wrapper" className="order-2 feed-card bg-white dark:bg-[var(--sl-bg-card)] border border-gray-200/80 dark:border-[var(--sl-border)] rounded-xl sm:rounded-2xl p-2 sm:p-3 shadow-sm">
          <div className="flex gap-2 overflow-x-auto pb-0.5 pt-0.5 scrollbar-none snap-x">
            {/* 1st Card: Create Story Tile — Facebook "Samey Sheeko" style */}
            <div
              onClick={() => setShowStoryCreator(true)}
              className="relative w-[112px] h-[200px] sm:w-[112px] sm:h-[200px] rounded-[10px] overflow-hidden shrink-0 cursor-pointer shadow-sm border border-gray-200 dark:border-[var(--sl-border)] group flex flex-col bg-white dark:bg-[var(--sl-bg-card)]"
            >
              <div className="h-[70%] w-full overflow-hidden bg-gray-100 dark:bg-gray-800">
                {user?.avatar && (user.avatar.startsWith('http') || user.avatar.startsWith('data:image')) && !user.avatar.includes('photo-1535713875002-d1d0cf377fde') ? (
                  <img
                    src={user.avatar}
                    alt={`${user.first_name || ''} ${user.last_name || ''}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-tr from-slate-800 via-blue-900 to-indigo-900 flex flex-col items-center justify-center text-white p-2 text-center group-hover:scale-105 transition-all duration-500">
                    <div className="w-12 h-12 rounded-full bg-[var(--somluul-primary)]/80 border border-blue-400/40 flex items-center justify-center font-black text-base shadow-inner mb-1">
                      {user?.first_name && user?.last_name ? `${user.first_name[0]}${user.last_name[0]}`.toUpperCase() : (user?.first_name ? user.first_name.slice(0, 2).toUpperCase() : '👤')}
                    </div>
                    <span className="text-[10px] font-bold opacity-90 truncate max-w-full">
                      {user?.first_name ? `${user.first_name} ${user.last_name || ''}` : 'User'}
                    </span>
                  </div>
                )}
              </div>
              <div className="relative h-[30%] bg-white dark:bg-[var(--sl-bg-card)] flex flex-col items-center justify-center pt-2 pb-1 px-1">
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 w-9 h-9 rounded-full bg-[var(--somluul-primary)] text-white flex items-center justify-center border-4 border-white dark:border-[#242526] shadow-md group-hover:scale-110 transition-all duration-300">
                  <Plus size={18} />
                </div>
                <span className="text-[12px] font-semibold text-[#050505] dark:text-[#e4e6eb] tracking-tight text-center truncate w-full px-1">
                  {t('create_story')}
                </span>
              </div>
            </div>

            {/* Stories mapping (Grouped by User) */}
            {groupedStories.map(group => {
              const latestItem = group.items[group.items.length - 1];
              if (!latestItem) return null;
              const isVideo = latestItem.mediaType === 'video' || (typeof latestItem.mediaUrl === 'string' && (latestItem.mediaUrl.startsWith('data:video') || latestItem.mediaUrl.includes('.mp4') || latestItem.mediaUrl.includes('.webm') || latestItem.mediaUrl.includes('.mov')));
              return (
                <div
                  key={group.authorName}
                  onClick={() => {
                    setActiveStoryGroup(group);
                    setActiveStoryIndex(0);
                  }}
                  className="relative w-[88px] h-[148px] sm:w-[112px] sm:h-[190px] md:w-[120px] md:h-[200px] rounded-[10px] overflow-hidden shrink-0 cursor-pointer shadow-sm group snap-start"
                >
                  {/* Story Image/Video as background */}
                  {isVideo ? (
                    <VideoPlayer
                      src={latestItem.mediaUrl}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-all duration-500"
                      autoPlay
                      loop
                      muted
                      controls={false}
                      playsInline
                    />
                  ) : (
                    <img
                      src={latestItem.mediaUrl}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-all duration-500"
                      referrerPolicy="no-referrer"
                    />
                  )}
                  
                  {/* Dark gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80 pointer-events-none" />

                  {/* Author Avatar in Top-Left */}
                  <div className="absolute top-2.5 left-2.5 z-10">
                    <div className={`w-8 h-8 rounded-full p-[2px] ${group.hasUnread ? 'bg-indigo-500' : 'bg-gray-400'} shadow-md overflow-hidden`}>
                      {renderAuthorAvatar(group.authorAvatar, group.authorName, "w-full h-full")}
                    </div>
                  </div>

                  {/* Item count badge in Top-Right if user posted multiple stories */}
                  {group.items.length > 1 && (
                    <div className="absolute top-2.5 right-2.5 z-10 bg-[var(--somluul-primary)]/90 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-full shadow-md backdrop-blur-xs flex items-center gap-0.5">
                      <span>{group.items.length}</span>
                    </div>
                  )}

                  {/* Author Name at Bottom */}
                  <div className="absolute bottom-2.5 inset-x-2.5 z-10">
                    <p className="text-[11px] font-extrabold text-white truncate shadow-xs">
                      {group.authorName}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* FACEBOOK STYLE COMPOSER BOX — exact FB layout (order-1 = above stories) */}
        <form
          onSubmit={handleCreatePost}
          className="order-1 feed-card bg-white dark:bg-[var(--sl-bg-card)] border border-gray-200/80 dark:border-[var(--sl-border)] rounded-xl sm:rounded-2xl p-3 shadow-sm"
        >
          {/* Hidden native selectors */}
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*" multiple onChange={handleImageFileChange} />
          <input type="file" ref={videoInputRef} className="hidden" accept="video/*,image/*" multiple onChange={handleVideoFileChange} />
          
          {/* Row 1: Avatar + pill input + Live / Photo / Reel icons (Facebook exact) */}
          <div className="flex gap-2 items-center">
            {renderAuthorAvatar(user?.avatar, 'My avatar', 'w-10 h-10 shrink-0')}
            {!composerExpanded ? (
              <button
                type="button"
                onClick={() => setComposerExpanded(true)}
                className="grow min-w-0 text-left bg-[var(--sl-bg)] dark:bg-[#3a3b3c] rounded-full px-4 py-2.5 text-[15px] text-[#65676b] dark:text-gray-400 hover:bg-[#e4e6eb] dark:hover:bg-[#4e4f50] transition-colors cursor-text truncate"
              >
                {language === 'so'
                  ? `Maxaa maskaxdaada ku jira${user?.first_name ? `, ${user.first_name}` : ''}?`
                  : `What's on your mind${user?.first_name ? `, ${user.first_name}` : ''}?`}
              </button>
            ) : null}
            {/* Live / Photo / Reel icons — Facebook style on the right of the pill */}
            <div className="flex items-center gap-0 shrink-0">
              <button
                type="button"
                onClick={() => { setComposerExpanded(true); triggerVideoUpload(); }}
                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[var(--sl-bg)] dark:hover:bg-[#3a3b3c] transition-colors"
                title={language === 'so' ? 'Muuqaal toos ah' : 'Live video'}
              >
                <Video size={22} className="text-[#f3425f]" />
              </button>
              <button
                type="button"
                onClick={() => { setComposerExpanded(true); triggerImageUpload(); }}
                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[var(--sl-bg)] dark:hover:bg-[#3a3b3c] transition-colors"
                title={language === 'so' ? 'Sawir/Muuqaal' : 'Photo/video'}
              >
                <Image size={22} className="text-[#45bd62]" />
              </button>
              <button
                type="button"
                onClick={() => { setComposerExpanded(true); setPostType(postType === 'audio' ? 'text' : 'audio'); }}
                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[var(--sl-bg)] dark:hover:bg-[#3a3b3c] transition-colors"
                title={language === 'so' ? 'Reel' : 'Reel'}
              >
                <Play size={20} className="text-[#f02849]" fill="currentColor" />
              </button>
            </div>
          </div>

          {/* Expanded composer when clicked / typing / media */}
          {composerExpanded && (
            <div className="mt-3 space-y-3">
              <textarea
                id="feed-composer-input"
                placeholder={language === 'so'
                  ? `Maxaa maskaxdaada ku jira${user?.first_name ? `, ${user.first_name}` : ''}?`
                  : `What's on your mind${user?.first_name ? `, ${user.first_name}` : ''}?`}
                rows={3}
                autoFocus
                className="w-full bg-transparent border-0 px-1 py-1 text-[16px] text-[#050505] dark:text-[#e4e6eb] placeholder-[#65676b] focus:outline-none focus:ring-0 resize-none min-h-[72px] leading-6"
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value.slice(0, FB_MAX_TEXT_LENGTH))}
                maxLength={FB_MAX_TEXT_LENGTH}
              />
              {newPostContent.length > 0 && (
                <p className={`text-[10px] text-right font-mono ${newPostContent.length > FB_MAX_TEXT_LENGTH - 500 ? 'text-amber-500' : 'text-gray-400'}`}>
                  {newPostContent.length.toLocaleString()} / {FB_MAX_TEXT_LENGTH.toLocaleString()}
                </p>
              )}
            </div>
          )}
          {!composerExpanded && (
            <textarea id="feed-composer-input" className="sr-only" readOnly value="" onFocus={() => setComposerExpanded(true)} />
          )}

          {/* Multiple Attached Media Previews */}
          {attachedMediaList.length > 0 && (
            <div className="pl-12 grid grid-cols-2 sm:grid-cols-3 gap-3 mb-2">
              {attachedMediaList.map((item, index) => (
                <div key={index} className="relative rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 aspect-video flex items-center justify-center shadow-xs">
                  {item.type === 'image' && (
                    <img src={item.url} alt="preview" className="w-full h-full object-cover" />
                  )}
                  {item.type === 'video' && (
                    <div className="relative w-full h-full bg-black flex items-center justify-center">
                      <VideoPlayer src={item.url} controls={false} className="max-w-full max-h-full" />
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center pointer-events-none">
                        <Video size={20} className="text-white" />
                      </div>
                    </div>
                  )}
                  {item.type === 'audio' && (
                    <div className="text-center p-2">
                      <Music size={20} className="mx-auto text-indigo-500" />
                      <span className="text-[10px] text-gray-500 font-bold block mt-1 truncate max-w-full">Audio file</span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setAttachedMediaList(prev => prev.filter((_, i) => i !== index));
                    }}
                    className="absolute top-1 right-1 bg-black/75 hover:bg-black text-white rounded-full p-1 shadow-md hover:scale-110 transition-all cursor-pointer z-10"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Conditional image URL preview (Only when no attached files) */}
          {attachedMediaList.length === 0 && postType === 'image' && (
            <div className="pl-12 space-y-2">
              {imageLink ? (
                <div className="relative w-fit rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 max-h-[220px]">
                  <img src={imageLink} alt="Selected preview" className="object-cover max-h-[220px] max-w-full rounded-xl" />
                  <button
                    type="button"
                    onClick={() => { setImageLink(''); setPostType('text'); }}
                    className="absolute top-2 right-2 bg-black/75 hover:bg-black text-white rounded-full p-1.5 shadow"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <input
                  type="text"
                  placeholder="Paste custom image URL here..."
                  className="w-full text-xs bg-gray-50 dark:bg-[var(--sl-bg-muted)] border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white focus:outline-none"
                  value={imageLink}
                  onChange={(e) => setImageLink(e.target.value)}
                />
              )}
            </div>
          )}

          {/* Conditional video URL preview (Only when no attached files) */}
          {attachedMediaList.length === 0 && postType === 'video' && (
            <div className="pl-12 space-y-2">
              {imageLink ? (
                <div className="relative w-fit rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 max-h-[220px] bg-black">
                  <VideoPlayer src={imageLink} controls className="max-h-[220px] max-w-full rounded-xl" />
                  <button
                    type="button"
                    onClick={() => { setImageLink(''); setPostType('text'); }}
                    className="absolute top-2 right-2 bg-black/75 hover:bg-black text-white rounded-full p-1.5 shadow-lg"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <input
                  type="text"
                  placeholder="Paste video source URL (mp4)..."
                  className="w-full text-xs bg-gray-50 dark:bg-[var(--sl-bg-muted)] border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white focus:outline-none"
                  value={imageLink}
                  onChange={(e) => setImageLink(e.target.value)}
                />
              )}
            </div>
          )}

          {/* Conditional audio URL */}
          {attachedMediaList.length === 0 && postType === 'audio' && (
            <div className="pl-12">
              <input
                type="text"
                placeholder="Paste MP3 audio source URL..."
                className="w-full text-xs bg-gray-50 dark:bg-[var(--sl-bg-muted)] border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white focus:outline-none"
                value={imageLink}
                onChange={(e) => setImageLink(e.target.value)}
              />
            </div>
          )}

          {/* FB-style action row — only when expanded */}
          {composerExpanded && (
            <div className="flex justify-between items-center border-t border-gray-200 dark:border-[var(--sl-border)] pt-3 mt-1">
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={triggerVideoUpload}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[13px] font-semibold text-[#65676b] dark:text-gray-300 hover:bg-[var(--sl-bg)] dark:hover:bg-[#3a3b3c] transition-colors"
                >
                  <Video size={18} className="text-[#f3425f]" />
                  <span className="hidden sm:inline">{language === 'so' ? 'Toos ah' : 'Live'}</span>
                </button>
                <button
                  type="button"
                  onClick={triggerImageUpload}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[13px] font-semibold text-[#65676b] dark:text-gray-300 hover:bg-[var(--sl-bg)] dark:hover:bg-[#3a3b3c] transition-colors"
                >
                  <Image size={18} className="text-[#45bd62]" />
                  <span className="hidden sm:inline">{language === 'so' ? 'Sawir' : 'Photo'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPostType(postType === 'audio' ? 'text' : 'audio')}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[13px] font-semibold text-[#65676b] dark:text-gray-300 hover:bg-[var(--sl-bg)] dark:hover:bg-[#3a3b3c] transition-colors"
                >
                  <Smile size={18} className="text-[#f7b928]" />
                  <span className="hidden sm:inline">{language === 'so' ? 'Dareen' : 'Feeling'}</span>
                </button>
              </div>
              <button
                type="submit"
                disabled={isPublishingPost || (!newPostContent.trim() && attachedMediaList.length === 0 && !imageLink)}
                className="bg-[var(--somluul-primary)] hover:bg-[#0854d4] text-white text-[15px] font-bold px-8 py-1.5 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isPublishingPost ? (language === 'so' ? 'Waa la daabacayaa…' : 'Posting…') : (language === 'so' ? 'Daabac' : 'Post')}
              </button>
            </div>
          )}
        </form>

        {/* FEED POSTS LIST */}
        <div className="order-3 space-y-4">
          {isLoading ? (
            <div className="bg-white dark:bg-[var(--sl-bg-card)] border border-gray-150 dark:border-gray-800/80 rounded-2xl p-10 text-center space-y-4">
              <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-blue-500 rounded-full animate-spin mx-auto"></div>
              <p className="text-xs text-gray-400 animate-pulse">{t('loading_posts')}</p>
            </div>
          ) : feedError ? (
            <div className="feed-card bg-white dark:bg-[var(--sl-bg-card)] border border-gray-200 dark:border-[var(--sl-border)] rounded-xl p-10 text-center space-y-3">
              <MessageSquare size={32} className="text-red-300 dark:text-red-600 mx-auto" />
              <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">{feedError}</p>
              <button
                type="button"
                onClick={() => { setIsLoading(true); fetchPosts(1, false); }}
                className="mt-2 px-4 py-2 rounded-lg bg-[var(--somluul-primary)] text-white text-sm font-semibold hover:brightness-110"
              >
                {language === 'so' ? 'Isku day mar kale' : 'Try again'}
              </button>
            </div>
          ) : posts.length === 0 ? (
            <div className="feed-card bg-white dark:bg-[var(--sl-bg-card)] border border-gray-200 dark:border-[var(--sl-border)] rounded-xl p-10 text-center space-y-3">
              <MessageSquare size={32} className="text-gray-300 dark:text-gray-600 mx-auto" />
              <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">{t('no_posts_yet')}</p>
              <p className="text-xs text-gray-400">{t('be_first_post')}</p>
              <button
                type="button"
                onClick={() => { setIsLoading(true); fetchPosts(1, false); }}
                className="mt-2 px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-sm font-semibold"
              >
                {language === 'so' ? 'Cusboonaysii' : 'Refresh'}
              </button>
            </div>
          ) : (
            posts.filter(p => !hiddenPostIds.includes(p.id)).map(p => (
              <div
                key={p.id}
                className="feed-card bg-white dark:bg-[var(--sl-bg-card)] border border-gray-200/80 dark:border-[var(--sl-border)] rounded-xl sm:rounded-2xl shadow-sm overflow-hidden transition-shadow hover:shadow-md border-b border-gray-200 dark:border-[var(--sl-border)] sm:border-b-0"
              >
                {/* Post Header */}
                <div className="flex justify-between items-center px-4 pt-3 pb-2">
                  <div 
                    className="flex gap-3 cursor-pointer group"
                    onClick={() => onViewProfile && onViewProfile(p.author.handle)}
                  >
                    {renderAuthorAvatar(p.author.avatar, p.author.name)}
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="font-extrabold text-sm text-gray-900 dark:text-white leading-tight group-hover:underline">
                          {p.author.name}
                        </span>
                        {p.author.verified && (
                          <span className="w-4 h-4 rounded-full bg-indigo-500 flex items-center justify-center text-white text-[9px] font-bold shadow-xs" title="Verified Account">✓</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-gray-400 dark:text-gray-500">
                        {p.author.handle && (
                          <>
                            <span>@{p.author.handle}</span>
                            <span>•</span>
                          </>
                        )}
                        <span>{formatTimeAgo(p.created_at, language)}</span>
                        <span>•</span>
                        <Globe size={11} className="text-gray-400" />
                      </div>
                    </div>
                  </div>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setOpenPostMenuId(openPostMenuId === p.id ? null : p.id)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full p-1.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
                    >
                      <MoreHorizontal size={18} />
                    </button>
                    {openPostMenuId === p.id && (
                      <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-[#1a2235] border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-30 py-1 text-left animate-fade-in">
                        <button type="button" onClick={() => { triggerSharePost(p); setOpenPostMenuId(null); }} className="w-full px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 text-left">Copy / Share</button>
                        <button type="button" onClick={() => hidePost(p.id)} className="w-full px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 text-left">Hide post</button>
                        <button type="button" onClick={() => { setReportTarget({ type: 'post', id: p.id }); setOpenPostMenuId(null); }} className="w-full px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 text-left">Report post</button>
                        {p.author?.id && (
                          <button type="button" onClick={() => { setReportTarget({ type: 'user', id: p.author.id! }); setOpenPostMenuId(null); }} className="w-full px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 text-left">Report user</button>
                        )}
                        {(() => {
                          const myHandle = (user?.username || user?.email?.split('@')[0] || '').toLowerCase();
                          const postHandle = (p.author?.handle || '').toLowerCase();
                          const canManage =
                            p.author?.id === user?.id ||
                            (!!myHandle && postHandle === myHandle) ||
                            user?.role === 'admin' ||
                            user?.role === 'admin';
                          if (!canManage) return null;
                          return (
                            <>
                              <button type="button" onClick={() => togglePinPost(p.id)} className="w-full px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 text-left border-t border-gray-100 dark:border-gray-800">
                                {(p as any).isPinned ? 'Unpin post' : 'Pin post'}
                              </button>
                              <button type="button" onClick={() => deleteOwnPost(p.id)} className="w-full px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 text-left border-t border-gray-100 dark:border-gray-800">Delete</button>
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                </div>

                {(p as any).isPinned && (
                  <p className="text-[11px] font-semibold text-[#65676b] dark:text-[#b0b3b8] px-4 pb-1 flex items-center gap-1">📌 Pinned post</p>
                )}
                {/* Text Content */}
                {p.content && (
                  <p className="text-[15px] text-[#050505] dark:text-[#e4e6eb] leading-[1.3333] whitespace-pre-wrap px-4 pb-3">
                    {p.content}
                  </p>
                )}

                {/* Media Attachments */}
                {p.mediaList && p.mediaList.length > 0 ? (
                  <div className={`grid gap-0.5 mb-0 overflow-hidden bg-black/5 dark:bg-black/20 ${
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
                          p.mediaList!.length === 1 ? 'max-h-[380px] rounded-xl' : 'aspect-square rounded-lg'
                        }`}
                      >
                        {item.type === 'image' && (
                          <img
                            src={item.url}
                            alt="Attachment"
                            onClick={() => setPreviewMediaModal({ url: item.url, type: 'image', title: p.content })}
                            className="w-full h-full object-cover hover:scale-102 transition-all duration-350 cursor-pointer"
                            referrerPolicy="no-referrer"
                          />
                        )}
                        {item.type === 'video' && (
                          <div className="w-full h-full bg-black flex items-center justify-center relative">
                            <VideoPlayer 
                              src={item.url} 
                              controls 
                              className="w-full max-h-[380px] rounded-lg object-contain cursor-pointer" 
                              playsInline 
                              preload="metadata"
                            />
                          </div>
                        )}
                        {item.type === 'audio' && (
                          <div className="p-3 w-full text-center flex flex-col justify-center items-center">
                            <Music size={24} className="text-indigo-500 mb-1" />
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
                      const isAudioUrl = p.mediaType === 'audio' || (typeof p.mediaUrl === 'string' && (p.mediaUrl.startsWith('data:audio') || p.mediaUrl.includes('.mp3') || p.mediaUrl.includes('.wav') || p.mediaUrl.includes('.m4a') || p.mediaUrl.includes('.ogg')));

                      if (isVideoUrl && p.mediaUrl) {
                        return (
                          <div className="rounded-xl overflow-hidden mb-4 border border-gray-100 dark:border-gray-800/40 bg-black max-h-[420px] flex items-center justify-center shadow-inner relative">
                            <VideoPlayer 
                              src={p.mediaUrl} 
                              controls 
                              className="w-full max-h-[420px] rounded-xl object-contain cursor-pointer" 
                              playsInline 
                              preload="metadata"
                            />
                          </div>
                        );
                      }

                      if (isAudioUrl && p.mediaUrl) {
                        return (
                          <div className="bg-gray-50 dark:bg-[var(--sl-bg-muted)]/60 p-3.5 rounded-xl mb-4 flex items-center gap-3 border border-gray-150 dark:border-gray-800">
                            <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                              <Music size={18} />
                            </div>
                            <div className="grow min-w-0">
                              <div className="text-xs font-bold text-gray-700 dark:text-gray-300">SomLuul Audio Attachment</div>
                              <audio controls className="w-full h-8 mt-1.5 focus:outline-none">
                                <source src={p.mediaUrl} />
                              </audio>
                            </div>
                          </div>
                        );
                      }

                      if (p.mediaUrl) {
                        return (
                          <div
                            onClick={() => setPreviewMediaModal({ url: p.mediaUrl, type: 'image', title: p.content })}
                            className="rounded-xl overflow-hidden mb-4 border border-gray-100 dark:border-gray-800/40 bg-gray-50 dark:bg-gray-900 cursor-pointer hover:opacity-95 transition-opacity"
                          >
                            <img
                              src={p.mediaUrl}
                              alt=""
                              className="w-full max-h-[350px] object-cover hover:scale-101 transition-all duration-500 cursor-pointer"
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                const el = e.currentTarget;
                                el.style.display = 'none';
                                const parent = el.parentElement;
                                if (parent && !parent.querySelector('[data-media-err]')) {
                                  const d = document.createElement('div');
                                  d.setAttribute('data-media-err', '1');
                                  d.className = 'p-6 text-center text-xs text-gray-500';
                                  d.textContent = 'Media lama soo rarayn (URL xumaaday). Mar kale soo geli.';
                                  parent.appendChild(d);
                                }
                              }}
                            />
                          </div>
                        );
                      }

                      return null;
                    })()}
                  </>
                )}

                {/* Sponsored Tag */}
                {p.isSponsored && (
                  <div className="flex items-center gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[9px] font-extrabold px-2.5 py-1 rounded-lg w-fit mb-4 uppercase tracking-wider border border-amber-500/20">
                    <Sparkles size={11} className="animate-spin-slow" />
                    <span>{t('sponsored_label')}</span>
                  </div>
                )}

                {/* Post Stats Counters */}
                <div className="flex justify-between items-center text-[13px] text-[#65676b] dark:text-[#b0b3b8] px-4 py-2.5 border-t border-gray-100 dark:border-[var(--sl-border)]">
                  <div className="flex items-center gap-1">
                    <div className="flex -space-x-1">
                      <span className="w-4 h-4 rounded-full bg-indigo-500 flex items-center justify-center text-white text-[8px] font-bold border border-white dark:border-gray-900">👍</span>
                      <span className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center text-white text-[8px] font-bold border border-white dark:border-gray-900">❤️</span>
                    </div>
                    <span className="text-[13px] text-[#65676b] dark:text-[#b0b3b8] ml-1.5 hover:underline cursor-pointer">{p.likes}</span>
                  </div>
                  <div className="flex gap-3 text-[13px] text-[#65676b] dark:text-[#b0b3b8]">
                    <span className="hover:underline cursor-pointer">{p.comments.length} comments</span>
                    <span className="hover:underline cursor-pointer">{p.shares} shares</span>
                  </div>
                </div>

                {/* Action Reaction Buttons (Facebook Style) */}
                <div className="flex items-stretch border-t border-gray-200 dark:border-[var(--sl-border)] mx-0 px-1 gap-0">
                  <div className="relative grow">
                    {reactionPickerFor === p.id && (
                      <div className="absolute bottom-full left-0 mb-2 flex gap-1 bg-white dark:bg-[#1a2235] border border-gray-200 dark:border-gray-700 rounded-full px-2 py-1.5 shadow-xl z-20 animate-fade-in">
                        {(Object.keys(REACTION_META) as ReactionKind[]).map((rk) => (
                          <button
                            key={rk}
                            type="button"
                            title={REACTION_META[rk].label}
                            onClick={() => toggleLike(p.id, rk)}
                            className="text-xl hover:scale-125 transition-transform px-1"
                          >
                            {REACTION_META[rk].emoji}
                          </button>
                        ))}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => toggleLike(p.id, ((p as any).myReaction as ReactionKind) || 'like')}
                      onContextMenu={(e) => { e.preventDefault(); setReactionPickerFor(reactionPickerFor === p.id ? null : p.id); }}
                      onMouseEnter={() => { /* long-press alternative on desktop via double-click area */ }}
                      className={`w-full flex items-center justify-center gap-1.5 py-2.5 text-[13px] font-semibold rounded-lg transition-colors ${
                        (p as any).myReaction
                          ? REACTION_META[((p as any).myReaction as ReactionKind)]?.color + ' bg-[var(--sl-bg)] dark:bg-[#3a3b3c]'
                          : 'text-[#65676b] dark:text-[#b0b3b8] hover:bg-[var(--sl-bg)] dark:hover:bg-[#3a3b3c]'
                      }`}
                    >
                      <span className="text-base leading-none">
                        {(p as any).myReaction ? REACTION_META[(p as any).myReaction as ReactionKind]?.emoji : '👍'}
                      </span>
                      <span>{(p as any).myReaction ? REACTION_META[(p as any).myReaction as ReactionKind]?.label : 'Like'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setReactionPickerFor(reactionPickerFor === p.id ? null : p.id)}
                      className="absolute -top-1 right-0 text-[10px] text-gray-400 px-1"
                      title="More reactions"
                    >
                      ▾
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      if (onShowToast) onShowToast('Muuqaalka faallada waa uu furan yahay!', 'success');
                    }}
                    className="flex items-center justify-center gap-1.5 grow py-2.5 text-[13px] font-semibold text-[#65676b] dark:text-[#b0b3b8] hover:bg-[var(--sl-bg)] dark:hover:bg-[#3a3b3c] rounded-lg transition-colors"
                  >
                    <MessageCircle size={16} />
                    <span>Comment</span>
                  </button>

                  <button
                    onClick={() => triggerSharePost(p)}
                    className="flex items-center justify-center gap-1.5 grow py-2.5 text-[13px] font-semibold text-[#65676b] dark:text-[#b0b3b8] hover:bg-[var(--sl-bg)] dark:hover:bg-[#3a3b3c] rounded-lg transition-colors"
                  >
                    <Share2 size={16} />
                    <span>Share</span>
                  </button>

                  <button
                    onClick={() => toggleSave(p.id)}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl transition-all ${p.isSaved ? 'text-amber-500 bg-amber-50/20' : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                    title="Kaydi qoraalkan"
                  >
                    <Bookmark size={15} fill={p.isSaved ? 'currentColor' : 'none'} />
                  </button>
                </div>

                {/* Nested Comments List */}
                {p.comments.length > 0 && (
                  <div className="space-y-2.5 mb-3 max-h-[280px] overflow-y-auto px-4 pr-2 scrollbar-thin">
                    {p.comments.filter((c: any) => !c.parentId).map((c: any) => (
                      <div key={c.id} className="space-y-2">
                        <div className="flex gap-2.5 text-xs items-start">
                          <button type="button" onClick={() => c.authorId && onViewProfile?.(c.authorId)} className="shrink-0">
                            {renderAuthorAvatar(c.authorAvatar, c.authorName, "w-8 h-8")}
                          </button>
                          <div className="bg-[var(--sl-bg)] dark:bg-[#3a3b3c] rounded-2xl px-3 py-2 grow border-0">
                            <div className="flex justify-between items-center mb-0.5 gap-2">
                              <button type="button" onClick={() => c.authorId && onViewProfile?.(c.authorId)} className="font-extrabold text-gray-800 dark:text-gray-200 hover:underline text-left">
                                {c.authorName}
                              </button>
                              <span className="text-[9px] text-gray-400 shrink-0">{formatTimeAgo(c.created_at)}</span>
                            </div>
                            <p className="text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{c.content}</p>
                            <button
                              type="button"
                              onClick={() => setReplyToComment({ ...replyToComment, [p.id]: c.id })}
                              className="mt-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                            >
                              Reply
                            </button>
                          </div>
                        </div>
                        {/* Replies */}
                        {p.comments.filter((r: any) => r.parentId === c.id).map((r: any) => (
                          <div key={r.id} className="flex gap-2.5 text-xs items-start ml-10">
                            <button type="button" onClick={() => r.authorId && onViewProfile?.(r.authorId)} className="shrink-0">
                              {renderAuthorAvatar(r.authorAvatar, r.authorName, "w-7 h-7")}
                            </button>
                            <div className="bg-gray-50/80 dark:bg-[#1a2235] rounded-2xl px-3 py-1.5 grow border border-gray-100 dark:border-gray-800/30">
                              <div className="flex justify-between items-center mb-0.5 gap-2">
                                <button type="button" onClick={() => r.authorId && onViewProfile?.(r.authorId)} className="font-bold text-gray-800 dark:text-gray-200 hover:underline text-left">
                                  {r.authorName}
                                </button>
                                <span className="text-[9px] text-gray-400 shrink-0">{formatTimeAgo(r.created_at)}</span>
                              </div>
                              <p className="text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{r.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Comment / Reply Input Bar */}
                <div className="flex gap-2.5 pt-1 pb-3 px-4 flex-col">
                  {replyToComment[p.id] && (
                    <div className="flex items-center justify-between text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold px-1">
                      <span>Replying to comment…</span>
                      <button type="button" onClick={() => setReplyToComment({ ...replyToComment, [p.id]: null })} className="text-gray-400 hover:text-gray-600">Cancel</button>
                    </div>
                  )}
                  <div className="flex gap-2.5">
                    {renderAuthorAvatar(user?.avatar, 'My avatar', 'w-8 h-8')}
                    <div className="relative grow">
                      <input
                        type="text"
                        placeholder={replyToComment[p.id] ? 'Write a reply…' : t('write_comment')}
                        className="w-full text-[13px] bg-[var(--sl-bg)] dark:bg-[#3a3b3c] border-0 rounded-full pl-3.5 pr-10 py-2 text-gray-900 dark:text-[#e4e6eb] placeholder-gray-500 focus:outline-none focus:ring-0"
                        value={commentInputs[p.id] || ''}
                        onChange={(e) => setCommentInputs({ ...commentInputs, [p.id]: e.target.value })}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddComment(p.id)}
                      />
                      <button
                        type="button"
                        onClick={() => handleAddComment(p.id)}
                        className="absolute right-2.5 top-1.5 p-1 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-full transition-all"
                      >
                        <Send size={14} />
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            ))
          )}
        </div>
      </div>

      {/* 3. RIGHT COLUMN: Sponsors, Storage & Active Friends (Visible on LG screens) */}
      <div className="hidden lg:flex flex-col space-y-6 lg:col-span-1">
        
        {/* RECENT STORAGE FILES SHORTCUT */}
        {authToken && (
          <div className="bg-white dark:bg-[var(--sl-bg-card)] border border-gray-150 dark:border-gray-800/80 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-800 pb-2.5">
              <div className="flex items-center gap-2">
                <HardDrive size={16} className="text-indigo-500" />
                <h3 className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-widest">
                  Cloud Files
                </h3>
              </div>
              {onGoToStorage && (
                <button
                  onClick={onGoToStorage}
                  className="text-[10px] text-indigo-500 hover:text-indigo-600 font-extrabold uppercase hover:underline"
                >
                  Go to Cloud
                </button>
              )}
            </div>

            {loadingFiles ? (
              <div className="flex justify-center py-4">
                <span className="text-xs text-gray-400 animate-pulse">Loading...</span>
              </div>
            ) : userFiles.length === 0 ? (
              <div className="text-center py-5 space-y-2">
                <FileText size={24} className="text-gray-300 dark:text-gray-600 mx-auto" />
                <p className="text-[11px] text-gray-400 leading-normal">Ma jiraan faylal dhawaan la geliyay.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[180px] overflow-y-auto pr-0.5 scrollbar-thin">
                {userFiles.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-2 rounded-xl bg-gray-50 dark:bg-[var(--sl-bg-muted)]/30 hover:bg-gray-100/60 dark:hover:bg-[#1f293d]/80 border border-gray-100/50 dark:border-gray-800/20 transition-all"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
                      <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 shrink-0">
                        <FileText size={13} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-gray-700 dark:text-gray-300 truncate" title={file.original_name}>
                          {file.original_name}
                        </p>
                        <p className="text-[9px] text-gray-400">
                          {parseFloat((file.file_size / (1024 * 1024)).toFixed(2))} MB
                        </p>
                      </div>
                    </div>
                    {onDownloadFile && (
                      <button
                        onClick={() => onDownloadFile(file)}
                        className="p-1.5 bg-indigo-500 hover:bg-[var(--somluul-primary)] text-white rounded-lg transition-all"
                        title="Download"
                      >
                        <Download size={11} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* REAL-LOOKING SOMALI SPONSORS (ADS) */}
        <div className="bg-white dark:bg-[var(--sl-bg-card)] border border-gray-150 dark:border-gray-800/80 rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-800 pb-2">
            <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Sponsored Ads</span>
            <span className="text-[9px] text-gray-400 font-medium">Verified Ad Network</span>
          </div>

          <div className="space-y-4">
            {/* Dahabshiil Transfer Ad */}
            <div className="group cursor-pointer block">
              <div className="relative h-28 rounded-xl overflow-hidden mb-2 border border-gray-100 dark:border-gray-800">
                <img
                  src="/somluul_logo.png"
                  alt="Dahabshiil Money Transfer"
                  className="w-full h-full object-cover group-hover:scale-103 transition-all duration-500"
                />
                <div className="absolute top-2 left-2 bg-black/70 text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded">FAST PAY</div>
              </div>
              <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200 leading-tight">Dahabshiil Money Transfer</h4>
              <p className="text-[10px] text-gray-400 mt-0.5 leading-snug">U dir lacag dalkaaga si ka sahlan sidii hore. Qiime jaban iyo amaan 100% ah.</p>
            </div>

            {/* SomLuul Premium Pro */}
            <div className="group cursor-pointer block">
              <div className="relative h-28 rounded-xl overflow-hidden mb-2 border border-gray-150 dark:border-gray-800">
                <img
                  src="/somluul_logo.png"
                  alt="SomLuul Storage Pro"
                  className="w-full h-full object-cover group-hover:scale-103 transition-all duration-500"
                />
                <div className="absolute top-2 left-2 bg-[var(--somluul-primary)] text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded">OFFER</div>
              </div>
              <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200 leading-tight">SomLuul Unlimited Cloud Storage</h4>
              <p className="text-[10px] text-gray-400 mt-0.5 leading-snug">Kor u qaad xisaabtaada ilaa 100GB oo Cloud ah oo gabi ahaanba sugan oo bilaash ah maanta!</p>
            </div>
          </div>
        </div>

        {/* ACTIVE CONTACTS & CHAT INITIATOR (Facebook-style Sidebar) */}
        <div className="bg-white dark:bg-[var(--sl-bg-card)] border border-gray-150 dark:border-gray-800/80 rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-800 pb-2">
            <h3 className="text-xs font-extrabold text-gray-800 dark:text-gray-200 uppercase tracking-widest flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Contacts Online
            </h3>
            <span className="text-[10px] bg-green-500/10 text-green-600 dark:text-green-400 font-bold px-1.5 py-0.5 rounded">
              5 Active
            </span>
          </div>

          <p className="text-[10px] text-gray-450 dark:text-gray-400 leading-relaxed">
            Guji mid kasta oo ka mid ah asxaabta si aad u bilowdo wada hadal Messenger ah!
          </p>

          <div className="space-y-2.5">
            {onlineContacts.map(contact => (
              <div
                key={contact.id}
                onClick={() => handleOpenChat(contact)}
                className="flex items-center gap-2.5 p-1.5 hover:bg-gray-50 dark:hover:bg-[#1f293d]/50 rounded-xl cursor-pointer transition-all border border-transparent hover:border-gray-100 dark:hover:border-gray-800"
              >
                <div 
                  className="relative hover:scale-105 transition-transform"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onViewProfile) onViewProfile(contact.id);
                  }}
                  title="Eeg Profile-ka"
                >
                  <img
                    src={contact.avatar}
                    alt={contact.name}
                    className="w-8 h-8 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-white dark:ring-gray-900" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate">{contact.name}</h4>
                  <p className="text-[9px] text-gray-400 truncate">{contact.bio}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ============================================== */}
      {/* 4. MODALS & POPUPS OR INTERACTIVE PORTALS */}
      {/* ============================================== */}

      {/* A. STORY CREATOR MODAL */}
      <AnimatePresence>
        {showStoryCreator && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-[var(--sl-bg-card)] border border-gray-150 dark:border-gray-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
            >
              <div className="flex justify-between items-center px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Ku dar Story / Add Story</h3>
                <button onClick={() => setShowStoryCreator(false)} className="p-1.5 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-white">
                  <X size={18} />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <input type="file" ref={storyFileInputRef} className="hidden" accept="image/*,video/*" onChange={handleStoryFileChange} />
                
                {/* Preview block */}
                {newStoryMedia ? (
                  <div className="relative h-48 rounded-xl overflow-hidden bg-black border border-gray-150 dark:border-gray-800 flex items-center justify-center">
                    {newStoryMediaType === 'video' || newStoryMedia.startsWith('data:video') ? (
                      <VideoPlayer src={newStoryMedia} controls className="max-h-full max-w-full" />
                    ) : (
                      <img src={newStoryMedia} alt="Preview" className="w-full h-full object-cover" />
                    )}
                    <button
                      onClick={() => setNewStoryMedia('')}
                      className="absolute top-2.5 right-2.5 p-1 bg-black/70 hover:bg-black text-white rounded-full z-10"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={triggerStoryUpload}
                    className="h-40 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500 hover:bg-indigo-50/20 transition-all space-y-2"
                  >
                    <div className="flex gap-2 text-gray-400">
                      <Image size={24} />
                      <Video size={24} className="text-red-500" />
                    </div>
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-200">Soo gali Sawir ama Muuqaal (Photo or Video)</span>
                    <span className="text-[10px] text-gray-400">PNG, JPG, MP4, WEBM up to 50MB</span>
                  </div>
                )}

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Globe size={14} className="text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Ama Geli sawir ama video URL halkan..."
                    className="w-full text-xs bg-gray-50 dark:bg-[var(--sl-bg-muted)] border border-gray-200 dark:border-gray-850 rounded-xl pl-9 pr-3 py-3 text-gray-900 dark:text-white placeholder-gray-450 focus:outline-none"
                    value={customStoryUrl}
                    onChange={(e) => setCustomStoryUrl(e.target.value)}
                  />
                </div>

                <div className="bg-indigo-500/5 p-3 rounded-xl border border-indigo-500/10 text-[10px] text-indigo-600 dark:text-indigo-400 leading-normal">
                  Sheekadaadu (Story/Status) waxay u muuqan doontaa dhammaan bulshada SomLuul.
                </div>
              </div>

              <div className="px-5 py-4 bg-gray-50 dark:bg-[#111724]/60 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-2.5">
                <button
                  onClick={() => setShowStoryCreator(false)}
                  className="px-4 py-2 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-xl text-xs font-bold"
                >
                  Abbaar / Cancel
                </button>
                <button
                  onClick={handlePublishStory}
                  disabled={isCreatingStory}
                  className="px-4 py-2 bg-[var(--somluul-primary)] hover:brightness-110 text-white rounded-xl text-xs font-bold shadow-md disabled:opacity-50"
                >
                  {isCreatingStory ? 'Publishing...' : 'Daabac Story'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* B. DETAILED STORY PLAYER BACKDROP */}
      {activeStoryGroup && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-sm h-[85vh] rounded-3xl overflow-hidden bg-gray-950 flex flex-col justify-between shadow-2xl border border-gray-800">
            {/* Loading top segments bar */}
            <div className="absolute top-3.5 inset-x-4 flex gap-1 z-25">
              {activeStoryGroup.items.map((item, idx) => {
                let fillWidth = '0%';
                if (idx < activeStoryIndex) fillWidth = '100%';
                else if (idx === activeStoryIndex) fillWidth = `${storyTimer}%`;

                return (
                  <div key={item.id || idx} className="h-1 bg-white/30 rounded-full grow overflow-hidden">
                    <div className="h-full bg-white transition-all duration-100 ease-linear" style={{ width: fillWidth }} />
                  </div>
                );
              })}
            </div>

            {/* Top Info Header */}
            <div className="absolute top-6 inset-x-0 bg-gradient-to-b from-black/80 via-black/40 to-transparent p-4 flex justify-between items-center z-20">
              <div className="flex items-center gap-2">
                {renderAuthorAvatar(activeStoryGroup.authorAvatar, activeStoryGroup.authorName, "w-8 h-8")}
                <div className="text-left">
                  <span className="text-xs font-bold text-white block leading-none">{activeStoryGroup.authorName}</span>
                  <span className="text-[9px] text-gray-300 font-medium">
                    Status {activeStoryIndex + 1} of {activeStoryGroup.items.length}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {(activeStoryGroup.authorName || '').trim().toLowerCase() === (user ? `${user.first_name} ${user.last_name}`.trim().toLowerCase() : '') && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setShowStoryViewers(v => !v); }}
                    className="text-white text-[10px] font-bold bg-white/15 hover:bg-white/25 px-2.5 py-1.5 rounded-full transition-all"
                  >
                    👁 {storyViewers.length}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setActiveStoryGroup(null)}
                  className="text-white hover:text-gray-300 bg-white/10 hover:bg-white/20 p-1.5 rounded-full transition-all"
                >
                  <X size={15} />
                </button>
              </div>
            </div>
            {showStoryViewers && (
              <div className="absolute top-16 right-4 z-40 w-56 max-h-48 overflow-y-auto bg-black/85 border border-white/10 rounded-xl p-2 text-left shadow-xl">
                <p className="text-[10px] font-bold text-white/70 px-2 py-1 uppercase tracking-wider">Viewers</p>
                {storyViewers.length === 0 ? (
                  <p className="text-[11px] text-white/50 px-2 py-2">No views yet</p>
                ) : storyViewers.map((v: any) => (
                  <div key={v.userId || v.viewed_at} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/10">
                    <div className="w-6 h-6 rounded-full bg-[var(--somluul-primary)] text-white text-[10px] font-bold flex items-center justify-center shrink-0 overflow-hidden">
                      {v.avatar ? <img src={v.avatar} className="w-full h-full object-cover" alt="" /> : (v.name || '?')[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-white truncate">{v.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Navigation Tap Overlay (Left & Right) */}
            <div
              className="absolute inset-y-0 left-0 w-1/3 z-30 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                if (activeStoryIndex > 0) {
                  setActiveStoryIndex(prev => prev - 1);
                  setStoryTimer(0);
                } else {
                  setActiveStoryGroup(null);
                }
              }}
            />
            <div
              className="absolute inset-y-0 right-0 w-1/3 z-30 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                if (activeStoryIndex < activeStoryGroup.items.length - 1) {
                  setActiveStoryIndex(prev => prev + 1);
                  setStoryTimer(0);
                } else {
                  setActiveStoryGroup(null);
                }
              }}
            />

            {/* Core Story Image/Video */}
            {(() => {
              const currentStoryItem = activeStoryGroup.items[activeStoryIndex];
              if (!currentStoryItem) return null;
              const isVideo = currentStoryItem.mediaType === 'video' || (typeof currentStoryItem.mediaUrl === 'string' && (currentStoryItem.mediaUrl.startsWith('data:video') || currentStoryItem.mediaUrl.includes('.mp4') || currentStoryItem.mediaUrl.includes('.webm') || currentStoryItem.mediaUrl.includes('.mov')));
              return isVideo ? (
                <VideoPlayer src={currentStoryItem.mediaUrl} controls autoPlay className="w-full h-full object-cover" playsInline />
              ) : (
                <img src={currentStoryItem.mediaUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              );
            })()}

            {/* Bottom Info and action */}
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent p-5 text-center z-20 space-y-2 pointer-events-none">
              <span className="text-[10px] text-gray-300 font-medium bg-black/40 px-3 py-1.5 rounded-full inline-block backdrop-blur-md">
                Taabo dhinaca bidix ama xaq si aad status kale u aragto
              </span>
            </div>
          </div>
          <div className="absolute inset-0 -z-10 cursor-pointer" onClick={() => setActiveStoryGroup(null)}></div>
        </div>
      )}

      {/* C. FACEBOOK-STYLE FLOATING CHAT BOXES CONTAINER (BOTTOM RIGHT) */}
      <div id="floating-messenger-dock" className="fixed bottom-0 right-4 z-40 hidden sm:flex gap-3 items-end pointer-events-none">
        {activeChats.map(chat => (
          <div
            key={chat.id}
            className={`w-72 bg-white dark:bg-[var(--sl-bg-card)] rounded-t-2xl shadow-2xl border border-gray-150 dark:border-gray-800 transition-all duration-300 flex flex-col pointer-events-auto ${chat.isMinimized ? 'h-11' : 'h-96'}`}
          >
            {/* Chatbox Header */}
            <div className="h-11 bg-[var(--somluul-primary)] text-white px-3 flex items-center justify-between rounded-t-2xl shrink-0 cursor-pointer" onClick={() => toggleMinimizeChat(chat.id)}>
              <div className="flex items-center gap-2 min-w-0">
                <div className="relative shrink-0">
                  <img src={chat.avatar} alt="" className="w-6 h-6 rounded-full object-cover border border-white/20" />
                  <span className="absolute bottom-0 right-0 block h-1.5 w-1.5 rounded-full bg-green-400" />
                </div>
                <span className="text-xs font-bold truncate leading-none">{chat.name}</span>
              </div>
              
              <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                <button onClick={() => toggleMinimizeChat(chat.id)} className="p-1 hover:bg-white/10 rounded transition-all">
                  <Minimize2 size={12} />
                </button>
                <button onClick={() => handleCloseChat(chat.id)} className="p-1 hover:bg-white/10 rounded transition-all">
                  <X size={12} />
                </button>
              </div>
            </div>

            {/* Chatbox body messages */}
            {!chat.isMinimized && (
              <>
                <div
                  className="flex-1 p-3 overflow-y-auto space-y-2.5 bg-gray-50 dark:bg-[#0c111d] scrollbar-thin"
                  ref={el => { chatScrollRefs.current[chat.id] = el; }}
                  style={{ maxHeight: 'calc(24rem - 5.5rem)' }}
                >
                  {chat.messages.map(m => (
                    <div key={m.id} className={`flex ${m.isSelf ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${m.isSelf ? 'bg-[var(--somluul-primary)] text-white rounded-tr-none' : 'bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-tl-none'}`}>
                        <p>{m.text}</p>
                        <span className={`text-[8px] mt-0.5 block text-right ${m.isSelf ? 'text-blue-200' : 'text-gray-400'}`}>
                          {m.time}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Chatbox input bar */}
                <div className="p-2 border-t border-gray-150 dark:border-gray-800 bg-white dark:bg-[var(--sl-bg-card)] flex gap-1.5 shrink-0">
                  <input
                    type="text"
                    placeholder="Type message..."
                    className="grow text-xs bg-gray-50 dark:bg-[var(--sl-bg-muted)] border border-gray-150 dark:border-gray-800 rounded-full px-3 py-2 text-gray-900 dark:text-white focus:outline-none"
                    value={chatInputs[chat.id] || ''}
                    onChange={e => setChatInputs({ ...chatInputs, [chat.id]: e.target.value })}
                    onKeyDown={e => e.key === 'Enter' && handleSendChatMessage(chat.id)}
                  />
                  <button
                    onClick={() => handleSendChatMessage(chat.id)}
                    className="p-1.5 bg-[var(--somluul-primary)] hover:brightness-110 text-white rounded-full transition-all shrink-0"
                  >
                    <Send size={12} />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* D. BEAUTIFUL FACEBOOK SHARE INTERACTIVE POPUP */}
      <AnimatePresence>
        {sharingPost && (
          <div className="fixed inset-0 bg-black/55 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-[var(--sl-bg-card)] border border-gray-150 dark:border-gray-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-5 space-y-4"
            >
              <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-800">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-gray-200">Share Post</h3>
                <button onClick={() => setSharingPost(null)} className="text-gray-400 hover:text-white">
                  <X size={16} />
                </button>
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400">
                Do you want to share {sharingPost.author.handle ? `@${sharingPost.author.handle}` : sharingPost.author.name}'s post with others?
              </p>

              <div className="space-y-2">
                <button
                  onClick={() => confirmShare('timeline')}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-indigo-500/10 hover:text-indigo-500 dark:hover:bg-blue-950/20 text-left cursor-pointer transition-all border border-gray-100 dark:border-gray-800"
                >
                  <Share2 size={15} />
                  <span>Share directly to my timeline</span>
                </button>

                <button
                  onClick={() => confirmShare('messenger')}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-emerald-500/10 hover:text-emerald-500 dark:hover:bg-emerald-950/20 text-left cursor-pointer transition-all border border-gray-100 dark:border-gray-800"
                >
                  <MessageSquare size={15} />
                  <span>Send in private Messenger chat</span>
                </button>

                <button
                  onClick={() => confirmShare('copy')}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-amber-500/10 hover:text-amber-500 dark:hover:bg-amber-950/20 text-left cursor-pointer transition-all border border-gray-100 dark:border-gray-800"
                >
                  <Bookmark size={15} />
                  <span>Copy web link for clipboard</span>
                </button>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setSharingPost(null)}
                  className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
