import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  X, Minus, Send, Image as ImageIcon, Mic, MicOff, Smile, Paperclip, Phone, Video, VideoOff,
  ChevronDown, Check, CheckCheck, Loader2, ArrowLeft, Square, Trash2
} from 'lucide-react';
import { Profile } from '../types';
import { fetchIceServers } from '../lib/scaleClient';

// Sound Utilities & Audio Recorder
import { 
  playRingtoneSound, 
  playNotificationSound, 
  playCallConnectedSound, 
  playCallEndedSound 
} from '../lib/soundUtils';
import { useAudioRecorder } from '../lib/useAudioRecorder';
import { VoiceNotePlayer } from './VoiceNotePlayer';
import { useLanguage } from './LanguageContext';

export interface FloatingChatWindow {
  id: string; // roomId or target profile id
  recipient: {
    id: string;
    name: string;
    avatar: string;
    bio?: string;
    phone?: string;
  };
  isMinimized?: boolean;
}

interface FloatingChatProps {
  user: Profile;
  authToken?: string;
  onShowToast?: (message: string, type: 'success' | 'error') => void;
  onViewProfile?: (userId: string) => void;
}

export const FloatingChat: React.FC<FloatingChatProps> = ({
  user,
  authToken,
  onShowToast,
  onViewProfile,
}) => {
  const { language } = useLanguage();
  const triggerAlert = (message: string, type: 'success' | 'error') => onShowToast?.(message, type);
  const [openChats, setOpenChats] = useState<FloatingChatWindow[]>([]);
  const [messages, setMessages] = useState<Record<string, any[]>>({});
  const [inputTexts, setInputTexts] = useState<Record<string, string>>({});
  const [isRecordingMap, setIsRecordingMap] = useState<Record<string, boolean>>({});
  const [recordingSecs, setRecordingSecs] = useState<Record<string, number>>({});
  const [showEmojiMap, setShowEmojiMap] = useState<Record<string, boolean>>({});

  // Real WebRTC call (same signaling as Messenger — no fake auto-connect)
  const [activeCall, setActiveCall] = useState<{
    roomId: string;
    peerUserId: string;
    recipientName: string;
    avatar: string;
    type: 'voice' | 'video';
    status: 'ringing' | 'connecting' | 'connected';
    callTime: number;
    isMuted?: boolean;
    isVideoOff?: boolean;
  } | null>(null);

  const [incomingCall, setIncomingCall] = useState<{
    roomId: string;
    fromUserId: string;
    fromName: string;
    type: 'voice' | 'video';
    offer: RTCSessionDescriptionInit;
  } | null>(null);
  const activeCallRef = useRef<typeof activeCall>(null);
  activeCallRef.current = activeCall;

  const activeRingRef = useRef<{ stop: () => void } | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const signalPollRef = useRef<any>(null);
  const callTimeoutRef = useRef<any>(null);
  const callSessionStartedAtRef = useRef<number>(0);

  const messageContainerRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const timerRefs = useRef<Record<string, any>>({});
  const mediaRecordersRef = useRef<Record<string, { recorder: MediaRecorder; chunks: Blob[]; stream: MediaStream }>>({});

  const getIceServers = (): RTCIceServer[] => { try { const w=window as any; if(Array.isArray(w.__SOMLUUL_ICE__)&&w.__SOMLUUL_ICE__.length)return w.__SOMLUUL_ICE__; } catch {} return [{urls:'stun:stun.l.google.com:19302'}]; };

  useEffect(()=>{ let cancelled=false; fetchIceServers().then(v=>{if(!cancelled&&v?.length)(window as any).__SOMLUUL_ICE__=v;}).catch(()=>{}); return ()=>{cancelled=true}; },[authToken]);

  const cleanupCallMedia = () => {
    if (signalPollRef.current) { clearInterval(signalPollRef.current); signalPollRef.current = null; }
    if (callTimeoutRef.current) { clearTimeout(callTimeoutRef.current); callTimeoutRef.current = null; }
    if (activeRingRef.current) { try { activeRingRef.current.stop(); } catch (_) {} activeRingRef.current = null; }
    if (peerConnectionRef.current) { try { peerConnectionRef.current.close(); } catch (_) {} peerConnectionRef.current = null; }
    if (localStreamRef.current) { localStreamRef.current.getTracks().forEach(t => t.stop()); localStreamRef.current = null; }
    remoteStreamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
  };

  const startSignalPolling = (roomId: string) => {
    if (signalPollRef.current) clearInterval(signalPollRef.current);
    signalPollRef.current = setInterval(async () => {
      if (!authToken) return;
      try {
        const res = await axios.get('/api/webrtc/signal', {
          params: { roomId, since: callSessionStartedAtRef.current },
          headers: { Authorization: `Bearer ${authToken}` },
        });
        for (const s of res.data?.signals || []) {
          if (s.type === 'hangup') {
            cleanupCallMedia();
            try { playCallEndedSound(); } catch (_) {}
            setActiveCall(null);
            continue;
          }
          if (!peerConnectionRef.current) continue;
          if (s.type === 'answer' && s.sdp) {
            const pc = peerConnectionRef.current;
            if (pc.signalingState !== 'stable') {
              await pc.setRemoteDescription(new RTCSessionDescription(s.sdp));
              setActiveCall(prev => prev ? { ...prev, status: 'connected' } : null);
              if (activeRingRef.current) { try { activeRingRef.current.stop(); } catch (_) {} activeRingRef.current = null; }
              try { playCallConnectedSound(); } catch (_) {}
            }
          } else if (s.type === 'ice' && s.candidate) {
            try { await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(s.candidate)); } catch (_) {}
          }
        }
      } catch (_) {}
    }, 1200);
  };

  // Global incoming-call poll (works even when Messenger tab is closed)
  useEffect(() => {
    if (!authToken) return;
    const poll = setInterval(async () => {
      if (activeCallRef.current || peerConnectionRef.current) return;
      try {
        const res = await axios.get('/api/webrtc/signal', {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        for (const s of res.data?.signals || []) {
          if (s.type === 'hangup' && incomingCall && s.roomId === incomingCall.roomId) {
            if (activeRingRef.current) { try { activeRingRef.current.stop(); } catch (_) {} activeRingRef.current = null; }
            setIncomingCall(null);
            continue;
          }
          if (s.type === 'offer' && s.sdp && !incomingCall) {
            setIncomingCall({
              roomId: s.roomId,
              fromUserId: s.fromUserId,
              fromName: s.fromName || 'Caller',
              type: s.callType === 'video' ? 'video' : 'voice',
              offer: s.sdp,
            });
            try {
              if (!activeRingRef.current) activeRingRef.current = playRingtoneSound();
            } catch (_) {}
            break;
          }
        }
      } catch (_) {}
    }, 1500);
    return () => clearInterval(poll);
  }, [authToken, incomingCall]);

  // Call timer
  useEffect(() => {
    if (!activeCall || activeCall.status !== 'connected') return;
    const interval = setInterval(() => {
      setActiveCall(prev => prev ? { ...prev, callTime: prev.callTime + 1 } : null);
    }, 1000);
    return () => clearInterval(interval);
  }, [activeCall?.status]);

  // Mute / camera toggles on live tracks
  useEffect(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getAudioTracks().forEach(t => { t.enabled = !activeCall?.isMuted; });
    stream.getVideoTracks().forEach(t => { t.enabled = !activeCall?.isVideoOff; });
  }, [activeCall?.isMuted, activeCall?.isVideoOff]);

  // Re-attach streams when UI mounts
  useEffect(() => {
    if (!activeCall) return;
    if (localStreamRef.current && localVideoRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
      localVideoRef.current.muted = true;
      localVideoRef.current.play().catch(() => {});
    }
    if (remoteStreamRef.current && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStreamRef.current;
      remoteVideoRef.current.muted = false;
      remoteVideoRef.current.play().catch(() => {});
    }
  }, [activeCall?.status, activeCall?.type]);

  const startCall = async (roomId: string, peerUserId: string, recipientName: string, avatar: string, type: 'voice' | 'video') => {
    if (!authToken) {
      onShowToast?.('Fadlan gal account-kaaga si aad u wacdo', 'error');
      return;
    }
    if (!roomId || !peerUserId) {
      onShowToast?.('Qofka lama helin — fur chat-ka marka hore', 'error');
      return;
    }
    cleanupCallMedia();
    callSessionStartedAtRef.current = Date.now();
    try {
      activeRingRef.current = playRingtoneSound();
    } catch (_) {}

    setActiveCall({
      roomId,
      peerUserId,
      recipientName,
      avatar,
      type,
      status: 'ringing',
      callTime: 0,
      isMuted: false,
      isVideoOff: type === 'voice',
    });

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: type === 'video' ? { facingMode: 'user' } : false,
      });
      localStreamRef.current = stream;
      setTimeout(() => {
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.muted = true;
          localVideoRef.current.play().catch(() => {});
        }
      }, 100);

      const pc = new RTCPeerConnection({ iceServers: getIceServers() });
      peerConnectionRef.current = pc;
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      pc.ontrack = (ev) => {
        const remote = ev.streams?.[0] || new MediaStream([ev.track]);
        remoteStreamRef.current = remote;
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remote;
          remoteVideoRef.current.muted = false;
          remoteVideoRef.current.volume = 1;
          remoteVideoRef.current.play().catch(() => {});
        }
        setActiveCall(prev => prev ? { ...prev, status: 'connected' } : null);
        if (activeRingRef.current) { try { activeRingRef.current.stop(); } catch (_) {} activeRingRef.current = null; }
        try { playCallConnectedSound(); } catch (_) {}
      };

      pc.onicecandidate = (ev) => {
        if (ev.candidate && authToken) {
          axios.post('/api/webrtc/signal', {
            roomId,
            type: 'ice',
            candidate: ev.candidate,
            targetUserId: peerUserId,
          }, { headers: { Authorization: `Bearer ${authToken}` } }).catch(() => {});
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
          setActiveCall(prev => prev ? { ...prev, status: 'connected' } : null);
        } else if (pc.connectionState === 'failed') {
          onShowToast?.('Xiriirka wuu fashilmay. Isku day mar kale.', 'error');
          endCall(false);
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await axios.post('/api/webrtc/signal', {
        roomId,
        type: 'offer',
        sdp: offer,
        callType: type,
        targetUserId: peerUserId,
        fromName: `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'User',
      }, { headers: { Authorization: `Bearer ${authToken}` } });

      startSignalPolling(roomId);
      callTimeoutRef.current = setTimeout(() => {
        if (peerConnectionRef.current?.connectionState !== 'connected') {
          endCall(true);
        }
      }, 60000);
    } catch (err) {
      console.error('Floating WebRTC error', err);
      onShowToast?.('Kamera/mic ma furmi karo. Fasax bixi.', 'error');
      endCall(false);
    }
  };

  const endCall = (isUnanswered: boolean | React.SyntheticEvent = false) => {
    const unansweredFlag = typeof isUnanswered === 'boolean' ? isUnanswered : false;
    const roomId = activeCall?.roomId;
    const peerUserId = activeCall?.peerUserId;
    if (authToken && roomId) {
      axios.post('/api/webrtc/signal', {
        roomId,
        type: 'hangup',
        targetUserId: peerUserId || undefined,
      }, { headers: { Authorization: `Bearer ${authToken}` } }).catch(() => {});
    }
    cleanupCallMedia();
    try { playCallEndedSound(); } catch (_) {}
    setActiveCall(null);
    setIncomingCall(null);
    if (unansweredFlag && onShowToast) {
      onShowToast('Wicitaanku ma jawaabin', 'error');
    }
  };

  const acceptIncoming = async () => {
    if (!incomingCall || !authToken) return;
    const { roomId, fromUserId, fromName, type, offer } = incomingCall;
    setIncomingCall(null);
    cleanupCallMedia();
    callSessionStartedAtRef.current = Date.now();
    setActiveCall({
      roomId,
      peerUserId: fromUserId,
      recipientName: fromName,
      avatar: '',
      type,
      status: 'connecting',
      callTime: 0,
      isMuted: false,
      isVideoOff: type === 'voice',
    });
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: type === 'video' ? { facingMode: 'user' } : false,
      });
      localStreamRef.current = stream;
      const pc = new RTCPeerConnection({ iceServers: getIceServers() });
      peerConnectionRef.current = pc;
      stream.getTracks().forEach(t => pc.addTrack(t, stream));
      pc.ontrack = (ev) => {
        const remote = ev.streams?.[0] || new MediaStream([ev.track]);
        remoteStreamRef.current = remote;
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remote;
          remoteVideoRef.current.muted = false;
          remoteVideoRef.current.play().catch(() => {});
        }
        setActiveCall(prev => prev ? { ...prev, status: 'connected' } : null);
        if (activeRingRef.current) { try { activeRingRef.current.stop(); } catch (_) {} activeRingRef.current = null; }
        try { playCallConnectedSound(); } catch (_) {}
      };
      pc.onicecandidate = (ev) => {
        if (ev.candidate) {
          axios.post('/api/webrtc/signal', {
            roomId, type: 'ice', candidate: ev.candidate, targetUserId: fromUserId,
          }, { headers: { Authorization: `Bearer ${authToken}` } }).catch(() => {});
        }
      };
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await axios.post('/api/webrtc/signal', {
        roomId, type: 'answer', sdp: answer, targetUserId: fromUserId,
      }, { headers: { Authorization: `Bearer ${authToken}` } });
      startSignalPolling(roomId);
    } catch (err) {
      console.error('Accept floating call error', err);
      onShowToast?.('Wicitaanka lama aqbalin karo', 'error');
      endCall(false);
    }
  };

  const rejectIncoming = () => {
    if (!incomingCall) return;
    if (authToken) {
      axios.post('/api/webrtc/signal', {
        roomId: incomingCall.roomId,
        type: 'hangup',
        targetUserId: incomingCall.fromUserId,
      }, { headers: { Authorization: `Bearer ${authToken}` } }).catch(() => {});
    }
    if (activeRingRef.current) { try { activeRingRef.current.stop(); } catch (_) {} activeRingRef.current = null; }
    setIncomingCall(null);
  };

  const renderAvatarBubble = (avatarUrl: string | null | undefined, name: string, sizeClass = "w-8 h-8") => {
    const isValidUrl = avatarUrl && (avatarUrl.startsWith('http') || avatarUrl.startsWith('data:image') || avatarUrl.startsWith('/'));
    if (isValidUrl) {
      return (
        <img
          src={avatarUrl}
          alt={name}
          className={`${sizeClass} rounded-full object-cover border border-white/20 shrink-0`}
          referrerPolicy="no-referrer"
        />
      );
    }
    const parts = name ? name.trim().split(' ').filter(p => Boolean(p) && !['user', 'admin'].includes(p.toLowerCase())) : [];
    const initials = parts.length >= 2 
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : (parts.length === 1 && parts[0].length > 0 ? parts[0].slice(0, 2).toUpperCase() : '💬');

    return (
      <div className={`${sizeClass} rounded-full bg-gradient-to-tr from-indigo-600 via-indigo-600 to-purple-600 text-white flex items-center justify-center font-black text-[11px] shrink-0 tracking-tight border border-white/30 shadow-xs font-sans`}>
        {initials}
      </div>
    );
  };

  // Sync with backend API
  const syncChatMessages = async () => {
    if (!authToken) return;
    try {
      const res = await axios.get('/api/chat/messages', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.data && Array.isArray(res.data)) {
        const grouped: Record<string, any[]> = {};
        res.data.forEach((msg: any) => {
          if (!grouped[msg.roomId]) grouped[msg.roomId] = [];
          grouped[msg.roomId].push(msg);
        });
        setMessages(prev => {
          let updated = false;
          const merged = { ...prev };
          Object.keys(grouped).forEach(rId => {
            if (!merged[rId]) {
              merged[rId] = grouped[rId];
              updated = true;
            } else {
              // Merge unique messages
              const existingIds = new Set(merged[rId].map(m => m.id));
              grouped[rId].forEach(m => {
                if (!existingIds.has(m.id)) {
                  merged[rId].push(m);
                  updated = true;
                }
              });
            }
          });
          if (updated) {
            return merged;
          }
          return prev;
        });
      }
    } catch (_err) {
      console.warn('Could not synchronize floating chat messages with server.', _err);
    }
  };

  const handleDeleteMessage = (msgId: string, roomId: string) => {
    setMessages(prev => {
      const roomMsgs = prev[roomId] || [];
      const filtered = roomMsgs.filter(m => m.id !== msgId);
      const updated = { ...prev, [roomId]: filtered };
      return updated;
    });

    if (authToken) {
      axios.delete(`/api/chat/messages/${msgId}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      }).catch(err => console.warn('Delete message sync error:', err));
    }
  };

  // Listen for global open floating chat events
  useEffect(() => {
    const handleOpenChat = (e: CustomEvent) => {
      if (!e.detail) return;
      const target = e.detail;
      const roomId = target.id;

      const chatObj: FloatingChatWindow = {
        id: roomId,
        recipient: {
          id: target.id,
          name: target.first_name ? `${target.first_name} ${target.last_name || ''}`.trim() : (target.name || 'User'),
          avatar: target.avatar || null,
          bio: target.bio,
          phone: target.phone
        },
        isMinimized: false
      };

      setOpenChats(prev => {
        const existingIdx = prev.findIndex(c => c.id === roomId || c.recipient.id === target.id);
        if (existingIdx > -1) {
          const updated = [...prev];
          updated[existingIdx].isMinimized = false;
          return updated;
        }
        // Limit max 3 floating chat boxes side-by-side
        if (prev.length >= 3) {
          return [...prev.slice(1), chatObj];
        }
        return [...prev, chatObj];
      });

      // Fetch message history for this room if missing
      syncChatMessages();

      if (target.startCall) {
        const recipientName = target.first_name ? `${target.first_name} ${target.last_name || ''}`.trim() : (target.name || 'User');
        const peerId = target.id || target.userId || '';
        const roomId = chatObj.id;
        startCall(roomId, peerId, recipientName, target.avatar || '', target.startCall === 'video' ? 'video' : 'voice');
      }
    };

    window.addEventListener('somluul_open_floating_chat' as any, handleOpenChat as any);
    syncChatMessages();

    // Poll chat messages every 10 seconds only when window focused
    const pollInterval = setInterval(() => {
      if (document.hasFocus()) {
        syncChatMessages();
      }
    }, 10000);

    return () => {
      window.removeEventListener('somluul_open_floating_chat' as any, handleOpenChat as any);
      clearInterval(pollInterval);
    };
  }, [user.id, authToken]);

  // Scroll to bottom when messages update without scrolling outer page window
  useEffect(() => {
    openChats.forEach(chat => {
      const container = messageContainerRefs.current[chat.id];
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    });
  }, [messages, openChats]);

  // Actions
  const handleCloseChat = (chatId: string) => {
    setOpenChats(prev => prev.filter(c => c.id !== chatId));
  };

  const handleToggleMinimize = (chatId: string) => {
    setOpenChats(prev => prev.map(c => c.id === chatId ? { ...c, isMinimized: !c.isMinimized } : c));
  };

  const handleSendMessage = async (chat: FloatingChatWindow, type: 'text' | 'image' | 'voice' = 'text', mediaUrl?: string) => {
    const roomId = chat.id;
    const textContent = inputTexts[roomId] || '';

    if (type === 'text' && !textContent.trim()) return;

    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newMsg = {
      id: crypto.randomUUID(),
      roomId,
      senderId: user.id,
      senderName: `${user.first_name} ${user.last_name}`,
      senderAvatar: user.avatar,
      content: type === 'text' ? textContent.trim() : (type === 'voice' ? 'Fariin maqal ah 🎤' : 'Sawir 📷'),
      type,
      mediaUrl,
      created_at: currentTime
    };

    // Update local state instantly
    setMessages(prev => ({
      ...prev,
      [roomId]: [...(prev[roomId] || []), newMsg]
    }));

    // Play message notification chime
    playNotificationSound();

    // Clear text input
    setInputTexts(prev => ({ ...prev, [roomId]: '' }));

    // Sync room object
    const updatedRoom = {
      id: roomId,
      name: chat.recipient.name,
      avatar: chat.recipient.avatar,
      isGroup: false,
      unreadCount: 0,
      lastMessage: newMsg.content,
      lastMessageTime: currentTime,
      members: [user.id, chat.recipient.id]
    };

    // Send to backend API
    if (authToken) {
      try {
        await axios.post('/api/chat/messages', { message: newMsg }, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        await axios.post('/api/chat/rooms', { room: updatedRoom }, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
      } catch (err) {
        setMessages(prev => ({
          ...prev,
          [roomId]: (prev[roomId] || []).filter((m: any) => m.id !== newMsg.id)
        }));
        triggerAlert(
          language === 'so' ? 'Fariinta lama dirin. Server-ka hubi oo isku day mar kale.' : 'Message was not sent. Check the server and try again.',
          'error'
        );
      }
    }

    // Real delivery only — no auto-reply bots. The other user answers themselves.
  };

  // Real image upload — persist the file before creating the chat message.
  const handleImageSelect = async (chat: FloatingChatWindow, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !authToken) return;
    try {
      const form = new FormData();
      form.append('file', file);
      const upload = await axios.post('/api/files/upload', form, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const url = upload.data?.public_url || upload.data?.url;
      if (!url) throw new Error('Upload returned no URL');
      await handleSendMessage(chat, 'image', url);
    } catch (err: any) {
      triggerAlert(err?.response?.data?.error || 'Image upload failed.', 'error');
    } finally {
      e.target.value = '';
    }
  };

  // Real Voice recording & playback handler
  const toggleRecording = async (chatId: string) => {
    const isRec = !!isRecordingMap[chatId];
    if (!isRec) {
      setIsRecordingMap(prev => ({ ...prev, [chatId]: true }));
      setRecordingSecs(prev => ({ ...prev, [chatId]: 0 }));

      timerRefs.current[chatId] = setInterval(() => {
        setRecordingSecs(prev => ({ ...prev, [chatId]: (prev[chatId] || 0) + 1 }));
      }, 1000);

      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const recorder = new MediaRecorder(stream);
          const chunks: Blob[] = [];
          recorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) chunks.push(e.data);
          };
          recorder.start(100);
          mediaRecordersRef.current[chatId] = { recorder, chunks, stream };
        } catch (err) {
          console.warn('Microphone access notice:', err);
        }
      }
    } else {
      if (timerRefs.current[chatId]) {
        clearInterval(timerRefs.current[chatId]);
      }
      const totalSecs = recordingSecs[chatId] || 3;
      setIsRecordingMap(prev => ({ ...prev, [chatId]: false }));

      const chat = openChats.find(c => c.id === chatId);
      const recData = mediaRecordersRef.current[chatId];

      if (recData && recData.recorder && recData.recorder.state !== 'inactive') {
        recData.recorder.onstop = () => {
          const blob = new Blob(recData.chunks, { type: recData.recorder.mimeType || 'audio/webm' });
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64Url = reader.result as string;
            if (chat) {
              handleSendMessage(chat, 'voice', base64Url);
            }
          };
          reader.readAsDataURL(blob);
          recData.stream.getTracks().forEach(t => t.stop());
          delete mediaRecordersRef.current[chatId];
        };
        try { recData.recorder.stop(); } catch (e) {}
      } else if (chat) {
        triggerAlert(
          language === 'so' ? 'Duubista codka lama heli karo. Fasax microphone-ka oo isku day mar kale.' : 'Voice recording is unavailable. Allow microphone access and try again.',
          'error'
        );
      }
    }
  };

  if (openChats.length === 0) return null;

  return (
    <div className="fixed bottom-0 right-4 z-50 flex items-end gap-3 pointer-events-none">
      {openChats.map((chat) => {
        const roomId = chat.id;
        const roomMsgs = messages[roomId] || [];
        const isRec = !!isRecordingMap[roomId];
        const currentSecs = recordingSecs[roomId] || 0;
        const isMin = !!chat.isMinimized;

        return (
          <div
            key={chat.id}
            className={`pointer-events-auto bg-white dark:bg-[#182232] border border-gray-200 dark:border-gray-800 rounded-t-2xl shadow-2xl transition-all duration-300 flex flex-col ${
              isMin ? 'w-64 h-12 overflow-hidden' : 'w-80 sm:w-88 h-[450px]'
            }`}
          >
            {/* Header Bar */}
            <div
              onClick={() => handleToggleMinimize(chat.id)}
              className="bg-[var(--somluul-primary)] dark:bg-[#1a2942] text-white px-3.5 py-2.5 flex items-center justify-between cursor-pointer rounded-t-2xl select-none shrink-0"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative shrink-0">
                  {renderAvatarBubble(chat.recipient.avatar, chat.recipient.name, "w-8 h-8")}
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[var(--somluul-primary)]"></span>
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold truncate leading-tight">{chat.recipient.name}</h4>
                  <p className="text-[10px] text-blue-100 dark:text-indigo-300 opacity-90 truncate">SomLuul Chat</p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => startCall(chat.id, chat.recipient.id, chat.recipient.name, chat.recipient.avatar, 'voice')}
                  className="p-1 hover:bg-white/20 rounded-lg text-white transition-colors cursor-pointer"
                  title="Wacitaan Cod ah (Voice Call)"
                >
                  <Phone size={13} />
                </button>

                <button
                  onClick={() => startCall(chat.id, chat.recipient.id, chat.recipient.name, chat.recipient.avatar, 'video')}
                  className="p-1 hover:bg-white/20 rounded-lg text-white transition-colors cursor-pointer"
                  title="Wacitaan Muuqaal ah (Video Call)"
                >
                  <Video size={13} />
                </button>

                <button
                  onClick={() => handleToggleMinimize(chat.id)}
                  className="p-1 hover:bg-white/20 rounded-lg text-white transition-colors"
                  title="Minimize"
                >
                  <Minus size={14} />
                </button>
                <button
                  onClick={() => handleCloseChat(chat.id)}
                  className="p-1 hover:bg-white/20 rounded-lg text-white transition-colors"
                  title="Close"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* If minimized, hide body */}
            {!isMin && (
              <>
                {/* Messages Body */}
                <div
                  ref={el => { messageContainerRefs.current[roomId] = el; }}
                  className="flex-1 p-3 overflow-y-auto space-y-3 bg-slate-50/50 dark:bg-[#111726]/60 text-xs"
                >
                  {roomMsgs.length === 0 ? (
                    <div className="text-center py-8 space-y-2">
                      <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto text-xl font-bold">
                        💬
                      </div>
                      <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                        Ku bilow sheeko badbaado leh {chat.recipient.name}!
                      </p>
                      <p className="text-[10px] text-gray-400">
                        Farriimahaagu waa kuwo la sireeyay oo si toos ah u gaaraya qofka.
                      </p>
                    </div>
                  ) : (
                    roomMsgs.map((m, idx) => {
                      const isMe = m.senderId === user.id || m.senderId === 'me';
                      return (
                        <div
                          key={m.id || idx}
                          className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1`}
                        >
                          <div
                            className={`max-w-[85%] rounded-2xl px-3.5 py-2 shadow-xs leading-relaxed ${
                              isMe
                                ? 'bg-[var(--somluul-primary)] text-white rounded-br-none'
                                : 'bg-white dark:bg-[#1e293b] text-gray-800 dark:text-gray-100 border border-gray-150 dark:border-gray-800 rounded-bl-none'
                            }`}
                          >
                            {m.type === 'text' && <p className="whitespace-pre-wrap break-words">{m.content}</p>}
                            {m.type === 'image' && (
                              <div className="space-y-1">
                                <img
                                  src={m.mediaUrl}
                                  alt="Attached media"
                                  className="rounded-xl max-h-48 object-cover border border-white/20"
                                />
                                {m.content && m.content !== 'Sawir 📷' && <p className="pt-1">{m.content}</p>}
                              </div>
                            )}
                            {m.type === 'voice' && (
                              <VoiceNotePlayer
                                mediaUrl={m.mediaUrl}
                                durationLabel={typeof m.mediaUrl === 'string' && !m.mediaUrl.startsWith('data:') ? m.mediaUrl : '0:08'}
                                isMe={isMe}
                              />
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 px-1">
                            <span className="text-[9px] text-gray-400">{m.created_at || 'Just now'}</span>
                            <button
                              onClick={() => handleDeleteMessage(m.id, chat.id)}
                              className="text-gray-400 hover:text-rose-500 transition-colors p-0.5"
                              title="Tirtir fariinta"
                            >
                              <Trash2 size={10} />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Input Controls Bar */}
                <div className="p-2.5 bg-white dark:bg-[#182232] border-t border-gray-200 dark:border-gray-800 shrink-0 space-y-1.5">
                  {/* Recording indicator */}
                  {isRec && (
                    <div className="flex items-center justify-between px-3 py-1 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-xl text-xs font-bold animate-pulse">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-red-600 animate-ping"></span>
                        Codeday farriin maqal ah...
                      </span>
                      <span>0:{currentSecs < 10 ? '0' : ''}{currentSecs}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-1.5">
                    {/* Image Attachment Button */}
                    <label className="p-1.5 text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl cursor-pointer transition-colors">
                      <ImageIcon size={18} />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageSelect(chat, e)}
                        className="hidden"
                      />
                    </label>

                    {/* Mic / Stop Recording Button */}
                    {isRec ? (
                      <button
                        type="button"
                        onClick={() => toggleRecording(roomId)}
                        className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer animate-pulse shrink-0"
                        title="Jooji & Dir Codka / Stop & Send Voice Note"
                      >
                        <Square size={12} fill="currentColor" />
                        <span>Jooji ({currentSecs}s)</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => toggleRecording(roomId)}
                        className="p-1.5 rounded-xl text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer shrink-0"
                        title="Duub Cod / Record Voice Note (🎤)"
                      >
                        <Mic size={18} />
                      </button>
                    )}

                    {/* Text Input */}
                    <input
                      type="text"
                      value={inputTexts[roomId] || ''}
                      onChange={(e) => setInputTexts(prev => ({ ...prev, [roomId]: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSendMessage(chat, 'text');
                        }
                      }}
                      placeholder="Qor farriin..."
                      className="flex-1 text-xs bg-gray-100 dark:bg-[#111726] border border-gray-200/80 dark:border-gray-800 rounded-xl px-3 py-2 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-indigo-500"
                    />

                    {/* Send Button */}
                    <button
                      type="button"
                      onClick={() => handleSendMessage(chat, 'text')}
                      disabled={!(inputTexts[roomId] || '').trim() && !isRec}
                      className="p-2 bg-[var(--somluul-primary)] hover:brightness-110 disabled:opacity-40 text-white rounded-xl shadow-xs transition-all shrink-0 cursor-pointer"
                    >
                      <Send size={15} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        );
      })}

      {/* Incoming call UI */}
      {incomingCall && !activeCall && (
        <div className="fixed inset-0 z-[85] bg-black/80 flex items-center justify-center p-6">
          <div className="bg-[#141b2d] border border-white/10 rounded-3xl p-8 max-w-sm w-full text-center space-y-6 shadow-2xl">
            <p className="text-xs uppercase tracking-widest text-emerald-400 font-bold">
              {incomingCall.type === 'video' ? 'Video call' : 'Voice call'}
            </p>
            <h3 className="text-xl font-black text-white">{incomingCall.fromName}</h3>
            <p className="text-sm text-gray-400">Wicitaan soo galaya...</p>
            <div className="flex justify-center gap-6">
              <button type="button" onClick={rejectIncoming} className="w-14 h-14 rounded-full bg-red-600 text-white flex items-center justify-center">
                <Phone size={22} className="rotate-[135deg]" />
              </button>
              <button type="button" onClick={acceptIncoming} className="w-14 h-14 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                <Phone size={22} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REAL WebRTC CALL — full screen */}
      {activeCall && (
        <div className="fixed inset-0 bg-black text-white flex flex-col z-[80]" style={{ height: '100dvh' }}>
          <div className="absolute top-0 left-0 right-0 z-20 flex justify-between items-center px-4 py-3 bg-gradient-to-b from-black/70 to-transparent">
            <button
              type="button"
              onClick={() => endCall(false)}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white cursor-pointer flex items-center gap-1.5 text-xs font-bold"
            >
              <ArrowLeft size={16} />
              <span>Ka laabo</span>
            </button>
            <div className="text-xs font-mono font-bold bg-black/40 px-3 py-1.5 rounded-full">
              {Math.floor(activeCall.callTime / 60)}:{(activeCall.callTime % 60).toString().padStart(2, '0')}
            </div>
          </div>

          <div className="relative flex-1 w-full min-h-0">
            {activeCall.type !== 'video' && (
              <video ref={remoteVideoRef} autoPlay playsInline className="hidden" style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }} />
            )}
            {activeCall.type === 'video' ? (
              <>
                <video ref={remoteVideoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover bg-black" />
                <div className="absolute bottom-28 right-3 w-28 h-40 rounded-2xl overflow-hidden border-2 border-white/70 shadow-2xl bg-gray-900 z-10">
                  <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                </div>
                <div className="absolute bottom-28 left-4 z-10">
                  <p className="text-base font-bold drop-shadow-lg">{activeCall.recipientName}</p>
                  <p className="text-[11px] text-white/80">
                    {activeCall.status === 'connected' ? 'Wicitaan socda' : activeCall.status === 'ringing' ? 'Wuu wacayaa...' : 'Waa la xiranayaa...'}
                  </p>
                </div>
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-[#1a1f2e] to-[#0a0f1d]">
                <div className="relative mb-6">
                  <div className="absolute -inset-2 bg-indigo-500/30 rounded-full animate-ping" />
                  {renderAvatarBubble(activeCall.avatar, activeCall.recipientName, 'w-28 h-28 text-2xl')}
                </div>
                <h4 className="text-xl font-bold">{activeCall.recipientName}</h4>
                <p className="text-xs text-indigo-300 font-semibold uppercase tracking-widest mt-2">
                  {activeCall.status === 'connected' ? 'Wicitaan socda' : 'Wuu wacayaa...'}
                </p>
              </div>
            )}
          </div>

          <div className="absolute bottom-0 left-0 right-0 z-20 pb-6 pt-10 flex justify-center items-center gap-5 bg-gradient-to-t from-black/80 to-transparent">
            <button
              type="button"
              onClick={() => setActiveCall(prev => prev ? { ...prev, isMuted: !prev.isMuted } : null)}
              className={`p-3.5 rounded-full border cursor-pointer ${activeCall.isMuted ? 'bg-amber-500 text-white border-amber-500' : 'bg-white/10 border-white/10 text-white'}`}
            >
              {activeCall.isMuted ? <MicOff size={20} /> : <Mic size={20} />}
            </button>
            <button
              type="button"
              onClick={endCall}
              className="w-16 h-16 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center shadow-xl cursor-pointer"
            >
              <Phone size={26} className="rotate-[135deg]" />
            </button>
            <button
              type="button"
              onClick={() => setActiveCall(prev => prev ? { ...prev, isVideoOff: !prev.isVideoOff } : null)}
              className={`p-3.5 rounded-full border cursor-pointer ${activeCall.isVideoOff ? 'bg-amber-500 text-white border-amber-500' : 'bg-white/10 border-white/10 text-white'}`}
            >
              {activeCall.isVideoOff ? <VideoOff size={20} /> : <Video size={20} />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
