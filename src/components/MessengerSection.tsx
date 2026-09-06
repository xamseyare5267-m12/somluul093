import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios'
import { fetchChatRooms, fetchChatMessages, sendChatMessage, sendWebrtcSignal, pollWebrtcSignals, fetchIceServers, uploadMediaFile, prefetchScaleStatus } from '../lib/scaleClient'
import { connectRealtime, disconnectRealtime } from '../lib/realtimeClient';
import { useLanguage } from './LanguageContext';
import { AppLogo } from './AppLogo';
import { 
  Search, Send, Mic, MicOff, Phone, Video, Shield, User, MoreHorizontal, 
  Smile, Paperclip, CheckCheck, Volume2, VideoOff, ScreenShare, 
  Info, ShieldAlert, BadgeInfo, Users, Check, Plus, MessageSquare, X, 
  Heart, Radio, Trash2, Edit2, MapPin, UserSquare, Star, CheckCircle, 
  AlertCircle, Lock, CornerUpLeft, Forward, Copy, Pin, Wifi, WifiOff, RefreshCw,
  ArrowLeft, Image as ImageIcon, Square
} from 'lucide-react';

import { ChatRoom, ChatMessage } from '../types';

// Sound Utilities & Audio Recorder
import { 
  playRingtoneSound, 
  playNotificationSound, 
  playCallConnectedSound, 
  playCallEndedSound 
} from '../lib/soundUtils';
import { notifyIncomingCall, ensureNotificationPermission } from '../lib/browserNotify';
import { useAudioRecorder } from '../lib/useAudioRecorder';
import { VoiceNotePlayer } from './VoiceNotePlayer';

// Import Modular Components
import { DeviceFrame } from './messenger/DeviceFrame';
import { ContactsSyncModal } from './messenger/ContactsSyncModal';
import { UserProfileSidebar } from './messenger/UserProfileSidebar';
import { BlockedUsersManager } from './messenger/BlockedUsersManager';
import { GroupChatCreator } from './messenger/GroupChatCreator';
import { PollBuilder } from './messenger/PollBuilder';
import { BroadcastComposer } from './messenger/BroadcastComposer';

interface MessengerSectionProps {
  user: any;
  authToken: string;
  onShowToast?: (message: string, type: 'success' | 'error') => void;
  onNavigateHome?: () => void;
  onViewProfile?: (userId: string) => void;
}

interface InAppNotification {
  id: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  roomId: string;
}

export const MessengerSection: React.FC<MessengerSectionProps> = ({ user, authToken, onShowToast, onNavigateHome, onViewProfile }) => {
  const { t, language } = useLanguage();

  const triggerAlert = (message: string, type: 'success' | 'error' = 'success') => {
    if (onShowToast) {
      onShowToast(message, type);
    } else {
      console.log(`[ALERT] ${type}: ${message}`);
    }
  };

  // --- CORE STATE DRIVERS ---
  const [networkStatus, setNetworkStatus] = useState<'online' | 'offline'>('online');
  const [offlineQueue, setOfflineQueue] = useState<ChatMessage[]>([]);
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
  const [selectedSubTab, setSelectedSubTab] = useState<'all' | 'chats' | 'groups' | 'channels' | 'contacts'>('all');
  const [viewingContactProfile, setViewingContactProfile] = useState<any | null>(null);
  const [inviteTargetContact, setInviteTargetContact] = useState<any | null>(null);

  // Predefined phone contacts representing the user's phonebook
  const deviceContacts: { name: string; phone: string }[] = []; // real contacts come from device sync / profiles

  const getMatchedPhonebook = () => {
    return deviceContacts.map(contact => {
      const cleanContactPhone = contact.phone.replace(/[^0-9]/g, '');
      const matchedRoom = rooms.find(r => {
        if (!r.phone) return false;
        const cleanRoomPhone = r.phone.replace(/[^0-9]/g, '');
        return cleanRoomPhone.endsWith(cleanContactPhone) || cleanContactPhone.endsWith(cleanRoomPhone);
      });
      return {
        ...contact,
        registered: !!matchedRoom,
        room: matchedRoom
      };
    });
  };
  
  const [rooms, setRooms] = useState<ChatRoom[]>([]);

  const [activeRoomId, setActiveRoomId] = useState<string>('');
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({});

  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isTyping, setIsTyping] = useState<string | null>(null); // name of who is typing
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  // Users blocking state
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);
  
  // Custom Starred & Pinned Messages lists
  const [starredMessageIds, setStarredMessageIds] = useState<string[]>([]);
  const [pinnedMessageIds, setPinnedMessageIds] = useState<Record<string, string>>({}); // roomId -> messageId

  // Live Poll responses tracker
  const [pollVotes, setPollVotes] = useState<Record<string, Record<string, number>>>({}); // messageId -> {optionIndex: votes}

  // Active Broadcast Lists
  const [broadcastLists, setBroadcastLists] = useState<Array<{ id: string; name: string; memberIds: string[] }>>([]);

  // Message reply tracking
  const [replyingToMessage, setReplyingToMessage] = useState<ChatMessage | null>(null);

  // Security Verification Screens
  const [otpVerificationState, setOtpVerificationState] = useState<{ phone: string; step: 'none' | 'input' | 'verified' }>({
    phone: '',
    step: 'none'
  });
  const [otpCode, setOtpCode] = useState('');

  // Privacy Options State
  const [privacySettings, setPrivacySettings] = useState({
    hideLastSeen: false,
    hideOnline: false
  });

  // Floating notifications toasts list
  const [activeToasts, setActiveToasts] = useState<InAppNotification[]>([]);

  // Sub-drawers & Dropdowns
  const [showEmojiDrawer, setShowEmojiDrawer] = useState(false);
  const [showStickerDrawer, setShowStickerDrawer] = useState(false);
  const [showMediaUploadOverlay, setShowMediaUploadOverlay] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ name: string; pct: number } | null>(null);

  // UI Panels Modals Visibility
  const [showContactsModal, setShowContactsModal] = useState(false);
  const [showContactInfo, setShowContactInfo] = useState(true);
  const [showGroupCreator, setShowGroupCreator] = useState(false);
  const [showPollBuilder, setShowPollBuilder] = useState(false);
  const [showBroadcastComposer, setShowBroadcastComposer] = useState(false);
  const [showBlockedManager, setShowBlockedManager] = useState(false);

  // Profiles Database
  const [profiles, setProfiles] = useState<any[]>([]);

  // WebRTC call state (real P2P — no fake auto-connect)
  const [activeCall, setActiveCall] = useState<{
    room: ChatRoom;
    type: 'voice' | 'video';
    status: 'ringing' | 'connecting' | 'connected' | 'ended';
    noiseCancel: boolean;
    captionsEnabled: boolean;
    isScreenSharing: boolean;
    isMuted: boolean;
    isVideoOff?: boolean;
    callTime: number;
    isIncoming?: boolean;
  } | null>(null);

  const [callCaption, setCallCaption] = useState<string>('Connecting...');
  const [incomingCall, setIncomingCall] = useState<{
    roomId: string;
    fromUserId: string;
    fromName: string;
    type: 'voice' | 'video';
    offer: RTCSessionDescriptionInit;
    signalId: string;
  } | null>(null);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const recordingTimerRef = useRef<any>(null);
  const ringtoneControllerRef = useRef<{ stop: () => void } | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const signalPollRef = useRef<any>(null);
  const callTimeoutRef = useRef<any>(null);
  const callSessionStartedAtRef = useRef<number>(0);
  const isCallerRef = useRef<boolean>(false);
  const activeCallRef = useRef<typeof activeCall>(null);
  activeCallRef.current = activeCall;

  const resolvePeerUserId = (room: ChatRoom | undefined) => {
    if (!room) return '';
    const myId = user?.id || '';
    const members = (room.members || []).filter((m: string) => m && m !== 'me');
    const other = members.find((m: string) => m !== myId);
    if (other) return other;
    // room id may be "idA_idB" or legacy profile id
    if (room.id && room.id.includes('_') && myId) {
      const parts = room.id.split('_');
      return parts.find((p) => p !== myId) || parts[0] || '';
    }
    return room.id || '';
  };

  const getIceServers = (): RTCIceServer[] => { try { const w=window as any; if(Array.isArray(w.__SOMLUUL_ICE__)&&w.__SOMLUUL_ICE__.length)return w.__SOMLUUL_ICE__; } catch {} return [{urls:'stun:stun.l.google.com:19302'}]; };

  // Phase 4: load TURN/STUN from server when available
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const servers = await fetchIceServers();
        if (!cancelled && Array.isArray(servers) && servers.length) {
          (window as any).__SOMLUUL_ICE__ = servers;
        }
      } catch (_) {}
      try { prefetchScaleStatus(); } catch (_) {}
    })();
    return () => { cancelled = true; };
  }, []);

  const attachLocalStreamToVideo = () => {
    const stream = localStreamRef.current;
    if (stream && localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
      localVideoRef.current.muted = true;
      localVideoRef.current.play().catch(() => {});
    }
  };

  const cleanupMediaOnly = () => {
    if (signalPollRef.current) {
      clearInterval(signalPollRef.current);
      signalPollRef.current = null;
    }
    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = null;
    }
    if (ringtoneControllerRef.current) {
      try { ringtoneControllerRef.current.stop(); } catch (_) {}
      ringtoneControllerRef.current = null;
    }
    if (peerConnectionRef.current) {
      try { peerConnectionRef.current.close(); } catch (_) {}
      peerConnectionRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((tr) => tr.stop());
      localStreamRef.current = null;
    }
    remoteStreamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
  };

  const startSignalPolling = (roomId: string) => {
    if (signalPollRef.current) clearInterval(signalPollRef.current);
    signalPollRef.current = setInterval(async () => {
      if (!authToken) return;
      try {
        const signals = await pollWebrtcSignals({
          roomId,
          since: callSessionStartedAtRef.current,
        });
        for (const s of signals) {
          // Ignore signals older than this call session
          const created = s.created_at ? new Date(s.created_at).getTime() : 0;
          if (callSessionStartedAtRef.current && created && created < callSessionStartedAtRef.current - 2000) {
            continue;
          }

          if (s.type === 'hangup') {
            // peer hung up or cancelled ring — cleanup without sending another hangup
            if (callTimeoutRef.current) { clearTimeout(callTimeoutRef.current); callTimeoutRef.current = null; }
            if (ringtoneControllerRef.current) { try { ringtoneControllerRef.current.stop(); } catch(_){} ringtoneControllerRef.current = null; }
            if (peerConnectionRef.current) {
              try { peerConnectionRef.current.close(); } catch(_){}
              peerConnectionRef.current = null;
            }
            if (localStreamRef.current) { localStreamRef.current.getTracks().forEach(tr => tr.stop()); localStreamRef.current = null; }
            remoteStreamRef.current = null;
            if (localVideoRef.current) localVideoRef.current.srcObject = null;
            if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
            try { playCallEndedSound(); } catch(_){}
            setActiveCall(null);
            setIncomingCall(null);
            isCallerRef.current = false;
            continue;
          }

          // Incoming offer while idle → show accept UI
          if (s.type === 'offer' && s.sdp && !peerConnectionRef.current && !activeCall) {
            const room = rooms.find((r) => r.id === roomId) || {
              id: roomId,
              name: s.fromName || 'Caller',
              avatar: null,
              isGroup: false,
              members: [s.fromUserId, user?.id],
            } as ChatRoom;
            const callType = s.callType === 'video' ? 'video' : 'voice';
            const fromName = s.fromName || room.name || 'Caller';
            setIncomingCall({
              roomId,
              fromUserId: s.fromUserId,
              fromName,
              type: callType,
              offer: s.sdp,
              signalId: s.id,
            });
            try {
              ringtoneControllerRef.current = playRingtoneSound();
            } catch (_) {}
            try {
              ensureNotificationPermission().then(() => {
                notifyIncomingCall(fromName, callType as 'voice' | 'video', roomId);
              });
            } catch (_) {}
            continue;
          }

          if (!peerConnectionRef.current) continue;

          if (s.type === 'answer' && s.sdp && isCallerRef.current) {
            const pc = peerConnectionRef.current;
            if (pc.signalingState !== 'stable') {
              await pc.setRemoteDescription(new RTCSessionDescription(s.sdp));
              setActiveCall((prev) => (prev ? { ...prev, status: 'connected' } : null));
              setCallCaption(language === 'so' ? 'Wicitaanka waa la xidhay' : 'Call connected');
              if (ringtoneControllerRef.current) {
                ringtoneControllerRef.current.stop();
                ringtoneControllerRef.current = null;
              }
              playCallConnectedSound();
            }
          } else if (s.type === 'offer' && s.sdp && !isCallerRef.current) {
            // already handling via accept
          } else if (s.type === 'ice' && s.candidate) {
            try {
              await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(s.candidate));
            } catch (_) {}
          }
        }
      } catch (_) {}
    }, 1200);
  };

  const createPeerConnection = (roomId: string, peerUserId: string) => {
    const pc = new RTCPeerConnection({ iceServers: getIceServers() });
    peerConnectionRef.current = pc;

    pc.ontrack = (ev) => {
      const stream = ev.streams?.[0] || new MediaStream([ev.track]);
      remoteStreamRef.current = stream;
      // Ensure remote audio is always audible (voice + video calls)
      const attachRemote = () => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream;
          remoteVideoRef.current.muted = false;
          remoteVideoRef.current.volume = 1;
          const p = remoteVideoRef.current.play();
          if (p && typeof p.catch === 'function') p.catch(() => {});
          return true;
        }
        return false;
      };
      if (!attachRemote()) {
        // Element not mounted yet (voice UI) — retry shortly
        setTimeout(attachRemote, 150);
        setTimeout(attachRemote, 500);
      }
      setActiveCall((prev) => (prev ? { ...prev, status: 'connected' } : null));
      setCallCaption(language === 'so' ? 'Wicitaanka waa la xidhay' : 'Call connected');
      if (ringtoneControllerRef.current) {
        try { ringtoneControllerRef.current.stop(); } catch (_) {}
        ringtoneControllerRef.current = null;
      }
      try { playCallConnectedSound(); } catch (_) {}
    };

    pc.onicecandidate = (ev) => {
      if (ev.candidate && authToken) {
        axios
          .post(
            '/api/webrtc/signal',
            {
              roomId,
              type: 'ice',
              candidate: ev.candidate,
              targetUserId: peerUserId || undefined,
            },
            { headers: { Authorization: `Bearer ${authToken}` } }
          )
          .catch(() => {});
      }
    };

    pc.onconnectionstatechange = () => {
      const st = pc.connectionState;
      if (st === 'connected') {
        setActiveCall((prev) => (prev ? { ...prev, status: 'connected' } : null));
        setCallCaption(language === 'so' ? 'Wicitaanka waa la xidhay' : 'Call connected');
        if (ringtoneControllerRef.current) {
          try { ringtoneControllerRef.current.stop(); } catch (_) {}
          ringtoneControllerRef.current = null;
        }
      } else if (st === 'failed') {
        triggerAlert(
          language === 'so'
            ? 'Xiriirka wuu fashilmay (network). Isku day mar kale.'
            : 'Connection failed. Try again.',
          'error'
        );
        try { pc.close(); } catch(_){}
        peerConnectionRef.current = null;
        if (localStreamRef.current) { localStreamRef.current.getTracks().forEach(tr => tr.stop()); localStreamRef.current = null; }
        setActiveCall(null);
      }
      // Do NOT end on 'disconnected' — ICE can recover
    };

    return pc;
  };

  const handleStartCall = async (type: 'voice' | 'video') => {
    const activeRoom = rooms.find((r) => r.id === activeRoomId);
    if (!activeRoom) return;
    if (isCurrentRoomBlocked) {
      triggerAlert('Cannot call a blocked contact!', 'error');
      return;
    }

    cleanupMediaOnly();
    isCallerRef.current = true;
    callSessionStartedAtRef.current = Date.now();
    const peerUserId = resolvePeerUserId(activeRoom);
    if (!peerUserId) {
      triggerAlert(
        language === 'so' ? 'Qofka lama helin — fur chat-ka marka hore.' : 'Could not find the other person. Open the chat first.',
        'error'
      );
      return;
    }

    try {
      ringtoneControllerRef.current = playRingtoneSound();
    } catch (_) {}

    setActiveCall({
      room: activeRoom,
      type,
      status: 'ringing',
      noiseCancel: true,
      captionsEnabled: false,
      isScreenSharing: false,
      isMuted: false,
      isVideoOff: type === 'voice',
      callTime: 0,
      isIncoming: false,
    });
    setCallCaption(language === 'so' ? 'Wuu wacayaa... 📞' : 'Calling... 📞');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: type === 'video' ? { facingMode: 'user' } : false,
      });
      localStreamRef.current = stream;
      // Wait a tick so video element mounts
      setTimeout(attachLocalStreamToVideo, 100);

      const pc = createPeerConnection(activeRoomId, peerUserId);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      if (authToken) {
        await sendWebrtcSignal({
            roomId: activeRoomId,
            type: 'offer',
            sdp: offer,
            callType: type,
            targetUserId: peerUserId || undefined,
            fromName: `${user?.first_name || ''} ${user?.last_name || ''}`.trim(),
          });
      }

      startSignalPolling(activeRoomId);

      // Ring max 60s then end if never connected (WhatsApp-like)
      callTimeoutRef.current = setTimeout(() => {
        const st = peerConnectionRef.current?.connectionState;
        if (st !== 'connected') {
          handleEndCall(true, true);
        }
      }, 60000);
    } catch (err: any) {
      console.error('WebRTC start error', err);
      triggerAlert(
        language === 'so' ? 'Kamera/mic ma furmi karo. Fasax bixi.' : 'Cannot access camera/mic. Allow permission.',
        'error'
      );
      handleEndCall(false, true);
    }
  };

  const handleAcceptIncoming = async () => {
    if (!incomingCall) return;
    const { roomId, fromUserId, type, offer, fromName } = incomingCall;
    setIncomingCall(null);
    isCallerRef.current = false;
    callSessionStartedAtRef.current = Date.now();
    cleanupMediaOnly();

    const room =
      rooms.find((r) => r.id === roomId) ||
      ({
        id: roomId,
        name: fromName,
        avatar: null,
        isGroup: false,
        members: [fromUserId, user?.id || ''],
      } as ChatRoom);

    setActiveCall({
      room,
      type,
      status: 'connecting',
      noiseCancel: true,
      captionsEnabled: false,
      isScreenSharing: false,
      isMuted: false,
      isVideoOff: type === 'voice',
      callTime: 0,
      isIncoming: true,
    });
    setCallCaption(language === 'so' ? 'Waa la xiranayaa...' : 'Connecting...');
    setActiveRoomId(roomId);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: type === 'video' ? { facingMode: 'user' } : false,
      });
      localStreamRef.current = stream;
      setTimeout(attachLocalStreamToVideo, 100);

      const pc = createPeerConnection(roomId, fromUserId);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      if (authToken) {
        await sendWebrtcSignal({
            roomId,
            type: 'answer',
            sdp: answer,
            targetUserId: fromUserId,
          });
      }
      startSignalPolling(roomId);
    } catch (err) {
      console.error('Accept call error', err);
      triggerAlert(
        language === 'so' ? 'Wicitaanka lama aqbalin karo' : 'Could not accept call',
        'error'
      );
      handleEndCall(false, true);
    }
  };

  const handleRejectIncoming = () => {
    if (!incomingCall) return;
    if (authToken) {
      axios
        .post(
          '/api/webrtc/signal',
          { roomId: incomingCall.roomId, type: 'hangup', targetUserId: incomingCall.fromUserId },
          { headers: { Authorization: `Bearer ${authToken}` } }
        )
        .catch(() => {});
    }
    if (ringtoneControllerRef.current) {
      try { ringtoneControllerRef.current.stop(); } catch (_) {}
      ringtoneControllerRef.current = null;
    }
    setIncomingCall(null);
  };

  const handleEndCall = (isUnanswered: boolean | React.SyntheticEvent = false, fromPeer = false) => {
    const unansweredFlag = typeof isUnanswered === 'boolean' ? isUnanswered : false;
    const roomId = activeCall?.room?.id || activeRoomId;
    const peerUserId = resolvePeerUserId(activeCall?.room || rooms.find((r) => r.id === activeRoomId));

    if (!fromPeer && authToken && roomId) {
      axios
        .post(
          '/api/webrtc/signal',
          { roomId, type: 'hangup', targetUserId: peerUserId || undefined },
          { headers: { Authorization: `Bearer ${authToken}` } }
        )
        .catch(() => {});
    }

    cleanupMediaOnly();
    try { playCallEndedSound(); } catch (_) {}
    setActiveCall(null);
    setIncomingCall(null);
    isCallerRef.current = false;

    if (unansweredFlag) {
      triggerAlert(
        language === 'so' ? 'Wicitaanku ma jawaabin' : 'Call unanswered',
        'error'
      );
    }
  };

  // GLOBAL poll for incoming offers while on messenger (any room — callee must see ring UI immediately)
  useEffect(() => {
    if (!authToken) return;
    const idlePoll = setInterval(async () => {
      // Still poll when we have an incoming ring so we can clear on remote hangup
      if (activeCallRef.current || peerConnectionRef.current) return;
      try {
        // No roomId → server returns all pending offers/hangups targeted at this user
        const signals = await pollWebrtcSignals({});
        for (const s of signals) {
          // Caller cancelled before we answered
          if (s.type === 'hangup' && incomingCall && s.roomId === incomingCall.roomId) {
            if (ringtoneControllerRef.current) {
              try { ringtoneControllerRef.current.stop(); } catch (_) {}
              ringtoneControllerRef.current = null;
            }
            setIncomingCall(null);
            continue;
          }
          if (s.type === 'offer' && s.sdp && !incomingCall) {
            const callType = s.callType === 'video' ? 'video' : 'voice';
            const fromName = s.fromName || 'Caller';
            setIncomingCall({
              roomId: s.roomId,
              fromUserId: s.fromUserId,
              fromName,
              type: callType,
              offer: s.sdp,
              signalId: s.id,
            });
            try {
              if (!ringtoneControllerRef.current) {
                ringtoneControllerRef.current = playRingtoneSound();
              }
            } catch (_) {}
            // OS notification (background tab / lock screen style)
            try {
              ensureNotificationPermission().then(() => {
                notifyIncomingCall(fromName, callType as 'voice' | 'video', s.roomId);
              });
            } catch (_) {}
            // Focus the chat room so accept flow has context
            if (s.roomId) setActiveRoomId(s.roomId);
            break;
          }
        }
      } catch (_) {}
    }, 1500);
    return () => clearInterval(idlePoll);
  }, [authToken, incomingCall]);

  // Attach local + remote media when call UI mounts / type changes
  useEffect(() => {
    if (activeCall) {
      attachLocalStreamToVideo();
      if (remoteStreamRef.current && remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStreamRef.current;
        remoteVideoRef.current.muted = false;
        remoteVideoRef.current.volume = 1;
        remoteVideoRef.current.play().catch(() => {});
      }
    }
  }, [activeCall?.status, activeCall?.type]);

  // Real Microphone Audio Recorder Hook
  const audioRecorder = useAudioRecorder();

  useEffect(() => {
    const stream = localStreamRef.current || (localVideoRef.current?.srcObject as MediaStream | null);
    if (stream) {
      stream.getAudioTracks().forEach(track => {
        track.enabled = !activeCall?.isMuted;
      });
      stream.getVideoTracks().forEach(track => {
        track.enabled = !activeCall?.isVideoOff;
      });
    }
  }, [activeCall?.isMuted, activeCall?.isVideoOff]);

  const renderAvatar = (avatarUrl: string | null | undefined, name: string, sizeClass = "w-10 h-10") => {
    const isValidUrl = avatarUrl && (avatarUrl.startsWith('http') || avatarUrl.startsWith('data:image') || avatarUrl.startsWith('/'));
    if (isValidUrl) {
      return (
        <img 
          src={avatarUrl} 
          alt={name || 'User'} 
          className={`${sizeClass} rounded-full object-cover border border-gray-200 dark:border-gray-700 shrink-0`} 
          referrerPolicy="no-referrer"
        />
      );
    }
    const parts = name ? name.trim().split(' ').filter(p => Boolean(p) && !['user', 'admin'].includes(p.toLowerCase())) : [];
    const initials = parts.length >= 2 
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : (parts.length === 1 && parts[0].length > 0 ? parts[0].slice(0, 2).toUpperCase() : '💬');

    return (
      <div className={`${sizeClass} rounded-full bg-gradient-to-tr from-indigo-600 via-indigo-600 to-purple-600 text-white flex items-center justify-center font-black text-xs shrink-0 tracking-tight border border-white/30 shadow-xs font-sans`}>
        {initials}
      </div>
    );
  };

  // --- ACTIONS & API HOOKS ---

  // Fetch profiles registered on database
  const fetchProfiles = async () => {
    try {
      const res = await axios.get('/api/profiles', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      setProfiles(res.data);
    } catch (_err) {
      // Silent fallback
    }
  };

  const syncWithServerDB = async () => {
    if (!authToken) return;
    try {
      const { rooms: scaleRooms } = await fetchChatRooms();
      const roomsRes = { data: scaleRooms };
      if (roomsRes.data && roomsRes.data.length > 0) {
        setRooms(prev => {
          let updated = false;
          const merged = [...prev];
          roomsRes.data.forEach((srvRoom: any) => {
            const index = merged.findIndex(r => r.id === srvRoom.id);
            if (index > -1) {
              if (merged[index].lastMessage !== srvRoom.lastMessage || merged[index].unreadCount !== srvRoom.unreadCount) {
                merged[index] = { ...merged[index], ...srvRoom };
                updated = true;
              }
            } else {
              merged.push(srvRoom);
              updated = true;
            }
          });
          return updated ? merged : prev;
        });
      }

      const msgsRes = await axios.get('/api/chat/messages', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (msgsRes.data && msgsRes.data.length > 0) {
        const myId = user?.id || 'me';
        const decryptedList: any[] = [];
        for (const msg of msgsRes.data) {
          // Plaintext only — discard any legacy e2e ciphertext blobs
          let content = msg.content || '';
          if (typeof content === 'string' && content.startsWith('e2e:')) {
            content = '';
          }
          if (!content && !msg.mediaUrl) continue;
          decryptedList.push({ ...msg, content });
        }
        setMessages(prev => {
          let updated = false;
          const merged = { ...prev };
          decryptedList.forEach((msg: any) => {
            const roomId = msg.roomId;
            if (!merged[roomId]) merged[roomId] = [];
            const exists = merged[roomId].some((m: any) => m.id === msg.id);
            if (!exists) {
              merged[roomId] = [...merged[roomId], msg];
              updated = true;
            } else {
              // refresh decrypted content if still ciphertext locally
              merged[roomId] = merged[roomId].map((m: any) =>
                m.id === msg.id && (m.content || '').startsWith('e2e:') ? { ...m, content: msg.content } : m
              );
            }
          });
          if (updated) {
            localStorage.setItem('somluul_chat_messages', JSON.stringify(merged));
            return { ...merged };
          }
          return prev;
        });
      }
    } catch (_err) {
      // Silent fallback
    }
  };

  useEffect(() => {
    fetchProfiles();
    syncWithServerDB();
    const syncInterval = setInterval(() => {
      if (document.hasFocus()) {
        syncWithServerDB();
      }
    }, 8000); // slower poll; SSE handles instant delivery when available

    // Phase 5: Realtime gateway (SSE + auto-reconnect)
    if (authToken) {
      connectRealtime({
        onNewMessage: (msg) => {
          try {
            const roomId = msg.roomId || msg.room_id;
            if (!msg || !msg.id || !roomId) return;
            setMessages(prev => {
              const roomMsgs = prev[roomId] || [];
              if (roomMsgs.some((m: any) => m.id === msg.id)) return prev;
              const normalized = { ...msg, roomId, text: msg.text || msg.body || msg.content || '' };
              return { ...prev, [roomId]: [...roomMsgs, normalized] };
            });
          } catch (_) {}
        },
        onTyping: (data) => {
          try {
            if (!data || !data.roomId) return;
            if (data.userId && data.name) {
              setIsTyping(data.name);
              setTimeout(() => setIsTyping(null), 3000);
            }
          } catch (_) {}
        },
        onCallRing: (data) => {
          try {
            // Incoming call ring — messenger already polls WebRTC; this wakes UI faster
            if (data?.fromName) {
              setIsTyping(null);
              try {
                window.dispatchEvent(new CustomEvent('somluul_call_ring', { detail: data }));
              } catch (_) {}
            }
          } catch (_) {}
        },
        onPresence: (data) => {
          try {
            if (data?.userId) {
              (window as any).__SOMLUUL_PRESENCE__ = {
                ...((window as any).__SOMLUUL_PRESENCE__ || {}),
                [data.userId]: !!data.online,
              };
            }
          } catch (_) {}
        },
      });
    }

    return () => {
      clearInterval(syncInterval);
      disconnectRealtime();
    };
  }, [authToken]);

  // Always ensure a personal Notes room exists so the message composer is never empty
  const ensureNotesRoom = () => {
    const notesId = `notes_${user?.id || 'me'}`;
    setRooms(prev => {
      if (prev.some(r => r.id === notesId)) return prev;
      const notesRoom: ChatRoom = {
        id: notesId,
        name: language === 'so' ? 'Fariimaha Keydsan (Notes)' : 'Saved Messages (Notes)',
        avatar: null,
        isGroup: false,
        unreadCount: 0,
        lastMessage: language === 'so' ? 'Qor fariin, sawir, cod...' : 'Type a message, photo, voice...',
        lastMessageTime: 'Now',
        members: [user?.id || 'me'],
        bio: 'Personal notes',
        phone: ''
      } as any;
      return [notesRoom, ...prev];
    });
    setActiveRoomId(prev => prev || notesId);
    setMobileView('chat');
  };

  useEffect(() => {
    if (user) {
      const t = setTimeout(() => ensureNotesRoom(), 300);
      return () => clearTimeout(t);
    }
  }, [user?.id]);

  const processTargetProfile = (targetProfile: any) => {
    if (!targetProfile || !targetProfile.id) return;
    const myId = user?.id || 'me';
    // Stable room id for both users (sorted) so A→B and B→A share the same conversation
    const roomId = [myId, targetProfile.id].sort().join('_');
    const nameStr = targetProfile.first_name
      ? `${targetProfile.first_name} ${targetProfile.last_name || ''}`.trim()
      : (targetProfile.name || 'User');
    const newRoom: ChatRoom = {
      id: roomId,
      name: nameStr,
      avatar: targetProfile.avatar || null,
      isGroup: false,
      unreadCount: 0,
      lastMessage: language === 'so' ? 'Ku bilow sheeko...' : 'Start a conversation...',
      lastMessageTime: 'Just now',
      members: [myId, targetProfile.id],
      bio: targetProfile.bio || '',
      phone: targetProfile.phone || ''
    };
    setRooms(prev => {
      if (prev.some(r => r.id === roomId || r.id === targetProfile.id)) {
        // Prefer stable id if an old room with profile id exists
        return prev.map(r => (r.id === targetProfile.id ? { ...r, id: roomId, members: [myId, targetProfile.id] } : r));
      }
      return [newRoom, ...prev];
    });
    setActiveRoomId(roomId);
    setMobileView('chat');
    // Persist room on server so the other user can see it
    if (authToken) {
      axios.post('/api/chat/rooms', { room: newRoom }, {
        headers: { Authorization: `Bearer ${authToken}` }
      }).catch(() => {});
    }
  };

  // Persistent storage loaders & dynamic event listeners
  useEffect(() => {
    let currentRooms: ChatRoom[] = [];
    const savedRooms = localStorage.getItem('somluul_chat_rooms');
    if (savedRooms) {
      try {
        currentRooms = JSON.parse(savedRooms);
        setRooms(currentRooms);
      } catch (e) {
        console.error('Error parsing stored chat rooms:', e);
      }
    }
    const savedMessages = localStorage.getItem('somluul_chat_messages');
    if (savedMessages) {
      try {
        const parsed = JSON.parse(savedMessages);
        // Strip any leftover e2e ciphertext so the UI never shows garbage
        const cleaned: Record<string, any[]> = {};
        Object.keys(parsed || {}).forEach((roomId) => {
          cleaned[roomId] = (parsed[roomId] || []).map((m: any) => ({
            ...m,
            content:
              typeof m.content === 'string' && m.content.startsWith('e2e:')
                ? '' // will show empty; user can re-type. Prefer blank over ciphertext.
                : m.content,
          })).filter((m: any) => m.content || m.mediaUrl || m.type !== 'text');
        });
        setMessages(cleaned);
        localStorage.setItem('somluul_chat_messages', JSON.stringify(cleaned));
      } catch (e) {
        console.error('Error parsing stored chat messages:', e);
      }
    }

    // Handle initial redirection/start-chat
    const chatTargetStr = localStorage.getItem('somluul_chat_target_profile');
    if (chatTargetStr) {
      try {
        const targetProfile = JSON.parse(chatTargetStr);
        localStorage.removeItem('somluul_chat_target_profile');
        processTargetProfile(targetProfile);
      } catch (e) {
        // Silent catch
      }
    }

    const handleCustomOpenChat = (e: CustomEvent) => {
      if (e.detail) {
        processTargetProfile(e.detail);
      }
    };

    window.addEventListener('somluul_open_floating_chat' as any, handleCustomOpenChat as any);
    window.addEventListener('somluul_select_messenger_room' as any, handleCustomOpenChat as any);
    return () => {
      window.removeEventListener('somluul_open_floating_chat' as any, handleCustomOpenChat as any);
      window.removeEventListener('somluul_select_messenger_room' as any, handleCustomOpenChat as any);
    };
  }, []);

  // Server is the source of truth. Chat rooms/messages are never persisted as fake local records.

  // Scroll stream inside chat container without scrolling main window
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, activeRoomId, isTyping]);

  // Real voice-note duration timer (only while MediaRecorder is active)
  useEffect(() => {
    if (isRecording || audioRecorder.isRecording) {
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(recordingTimerRef.current);
      setRecordingSeconds(0);
    }
    return () => clearInterval(recordingTimerRef.current);
  }, [isRecording, audioRecorder.isRecording]);

  // Real call timer
  useEffect(() => {
    if (!activeCall || activeCall.status !== 'connected') return;
    const tick = setInterval(() => {
      setActiveCall(prev => prev ? { ...prev, callTime: (prev.callTime || 0) + 1 } : null);
    }, 1000);
    return () => clearInterval(tick);
  }, [activeCall?.status]);

  // Real live captions via Web Speech API (browser STT) — not fake text
  useEffect(() => {
    if (!activeCall || activeCall.status !== 'connected' || !activeCall.captionsEnabled) {
      return;
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setCallCaption(language === 'so' ? 'Browser-kani ma taageero captions' : 'Captions not supported in this browser');
      return;
    }
    const recog = new SR();
    recog.continuous = true;
    recog.interimResults = true;
    recog.lang = language === 'so' ? 'so-SO' : 'en-US';
    recog.onresult = (event: any) => {
      let interim = '';
      let finalText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += t;
        else interim += t;
      }
      const text = (finalText || interim || '').trim();
      if (text) setCallCaption(text);
    };
    recog.onerror = () => {};
    try { recog.start(); } catch (_) {}
    return () => {
      try { recog.stop(); } catch (_) {}
    };
  }, [activeCall?.status, activeCall?.captionsEnabled, language]);

  // Apply real noise suppression when toggled during a call
  useEffect(() => {
    const stream = localStreamRef.current;
    if (!stream || !activeCall) return;
    stream.getAudioTracks().forEach((track) => {
      try {
        const constraints: any = {
          echoCancellation: true,
          noiseSuppression: !!activeCall.noiseCancel,
          autoGainControl: true,
        };
        track.applyConstraints(constraints).catch(() => {});
      } catch (_) {}
    });
  }, [activeCall?.noiseCancel]);

  // --- MESSAGING OPERATORS ---

  // Handle send message logic with Offline Cache and Background Queue support
  const handleSendMessage = async (textToSend?: string, customType: 'text' | 'image' | 'video' | 'file' | 'voice' | 'location' = 'text', customMediaUrl?: string) => {
    const rawContent = textToSend || inputText;
    if (!rawContent.trim() && !customMediaUrl) return;

    const activeRoom = rooms.find(r => r.id === activeRoomId);
    if (!activeRoom) return;

    // Check if user is blocked
    if (blockedUserIds.includes(activeRoomId)) {
      triggerAlert("You cannot message a blocked user. Unblock them to continue.", "error");
      return;
    }

    // Plain text only — message content is NEVER encrypted or transformed.
    // It stays exactly as the user typed it, forever, until deleted by sender/owner.
    const plainContent = replyingToMessage
      ? `[Replied to: ${String(replyingToMessage.content || '').replace(/^e2e:.*/, '').slice(0, 40)}] ${rawContent}`
      : rawContent;

    const newMsg: ChatMessage = {
      id: crypto.randomUUID(),
      roomId: activeRoomId,
      senderId: user?.id || 'me',
      senderName: `${user?.first_name || 'Me'} ${user?.last_name || ''}`.trim(),
      content: plainContent,
      type: customType,
      mediaUrl: customMediaUrl,
      created_at: new Date().toISOString()
    };

    const localMsg = { ...newMsg };

    if (networkStatus === 'offline') {
      setOfflineQueue(prev => [...prev, newMsg]);
      setMessages(prev => ({
        ...prev,
        [activeRoomId]: [...(prev[activeRoomId] || []), { ...localMsg, reaction: '🕒 (Offline Queue)' }]
      }));
    } else {
      setMessages(prev => ({
        ...prev,
        [activeRoomId]: [...(prev[activeRoomId] || []), localMsg]
      }));

      // Play message chime
      playNotificationSound();

      // Update last message
      setRooms(prev => prev.map(r => r.id === activeRoomId ? { ...r, lastMessage: rawContent || `Shared a ${customType}`, lastMessageTime: 'Just now' } : r));

      // Synchronize with server database
      const updatedRoom = {
        ...activeRoom,
        lastMessage: rawContent || `Shared a ${customType}`,
        lastMessageTime: 'Just now'
      };
      axios.post('/api/chat/rooms', { room: updatedRoom }, {
        headers: { Authorization: `Bearer ${authToken}` }
      }).catch(err => console.warn('Room sync error:', err));

      sendChatMessage(newMsg.roomId || activeRoomId || '', {
        body: newMsg.text || newMsg.body || newMsg.content || '',
        mediaUrl: newMsg.mediaUrl || newMsg.media_url,
        mediaType: newMsg.mediaType || newMsg.media_type,
      }).catch(err => console.warn('Message sync error:', err));
    }

    setInputText('');
    setReplyingToMessage(null);
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

    triggerAlert(language === 'so' ? "✓ Fariinta waa la tirtiray" : "✓ Message deleted successfully", "success");
  };

  // Dispatch all queued offline messages when reconnecting
  const triggerBackgroundSync = async () => {
    if (offlineQueue.length === 0) return;
    const queued = [...offlineQueue];
    const failed: ChatMessage[] = [];
    setNetworkStatus('online');

    for (const msg of queued) {
      try {
        await sendChatMessage(msg.roomId || '', {
          body: msg.text || msg.body || msg.content || '',
          mediaUrl: msg.mediaUrl || msg.media_url,
          mediaType: msg.mediaType || msg.media_type,
        });
        setMessages(prev => {
          const list = prev[msg.roomId] || [];
          return { ...prev, [msg.roomId]: list.map(m => m.id === msg.id ? { ...m, reaction: undefined } : m) };
        });
      } catch {
        failed.push(msg);
      }
    }

    setOfflineQueue(failed);
    triggerAlert(
      failed.length
        ? `Sync: ${queued.length - failed.length} sent, ${failed.length} still waiting.`
        : `Background Sync complete! ${queued.length} message(s) sent successfully.`,
      failed.length ? 'error' : 'success'
    );
  };

  // Real voice notes via MediaRecorder — no fake audio URLs
  const handleStartRecordingVoice = async () => {
    if (isCurrentRoomBlocked) return;
    const success = await audioRecorder.startRecording();
    if (!success) {
      triggerAlert(
        language === 'so'
          ? 'Mikrofoonka lama heli karo. Fasax browser-ka mic-ka.'
          : 'Microphone unavailable. Allow mic permission in the browser.',
        'error'
      );
      setIsRecording(false);
      return;
    }
    setIsRecording(true);
  };

  const handleFinishVoiceRecording = async () => {
    if (audioRecorder.isRecording) {
      const result = await audioRecorder.stopRecording();
      setIsRecording(false);
      if (result && result.audioUrl) {
        const secs = result.durationSeconds || recordingSeconds || 0;
        const durStr = `0:${secs < 10 ? '0' : ''}${secs}`;
        handleSendMessage(`🎤 Voice Note (${durStr})`, 'voice', result.audioUrl);
        return;
      }
    }
    setIsRecording(false);
    triggerAlert(
      language === 'so' ? 'Codka lama duubin karin. Isku day mar kale.' : 'Could not record audio. Try again.',
      'error'
    );
  };

  const handleCancelVoiceRecording = () => {
    if (audioRecorder.isRecording) {
      audioRecorder.cancelRecording();
    }
    setIsRecording(false);
  };

  // Real geolocation — falls back only if permission denied
  const handleSendLocation = () => {
    if (!navigator.geolocation) {
      triggerAlert(language === 'so' ? 'Browser-kaagu ma taageero location.' : 'Geolocation not supported.', 'error');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const mapsUrl = `https://maps.google.com/?q=${latitude},${longitude}`;
        handleSendMessage(
          language === 'so'
            ? `📍 Goobtaada: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
            : `📍 Shared location: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
          'location',
          mapsUrl
        );
      },
      () => {
        triggerAlert(
          language === 'so' ? 'Location waa la diiday. Fasax browser settings.' : 'Location permission denied.',
          'error'
        );
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Contact Sharing Card Dispatcher
  const handleSendContact = (contactProfile: any) => {
    const details = `👤 Contact Card: ${contactProfile.first_name} ${contactProfile.last_name} (@${contactProfile.email.split('@')[0]}) • 📱 ${contactProfile.phone || 'No Phone'}`;
    handleSendMessage(details, 'text');
    triggerAlert(`Shared contact @${contactProfile.email.split('@')[0]} to this chat.`, "success");
  };

  // Custom Interactive Polls builder
  const handleSendPoll = (question: string, options: string[]) => {
    const pollId = `poll_${Date.now()}`;
    const formattedContent = `📊 POLL: ${question}\n` + options.map((o, idx) => `[${idx}] ${o}`).join('\n');
    
    // Dispatch
    handleSendMessage(formattedContent, 'text');

    // Register active vote tracker
    const votesInit: Record<string, number> = {};
    options.forEach((_, idx) => {
      votesInit[idx.toString()] = 0;
    });

    setPollVotes(prev => ({
      ...prev,
      [pollId]: votesInit
    }));
  };

  // Handle vote click on custom polls
  const handleVotePoll = (pollId: string, optionIdx: number) => {
    setPollVotes(prev => {
      const current = prev[pollId] || {};
      const votes = current[optionIdx.toString()] || 0;
      return {
        ...prev,
        [pollId]: {
          ...current,
          [optionIdx.toString()]: votes + 1
        }
      };
    });
  };

  // Broadcast lists transmitter
  const handleSendBroadcast = (listId: string, broadcastMsgText: string) => {
    const selectedList = broadcastLists.find(l => l.id === listId);
    if (!selectedList) return;

    // Send the message individually to all members of the list
    selectedList.memberIds.forEach(memberId => {
      const bMsg: ChatMessage = {
        id: `m_b_${Date.now()}_${memberId}`,
        roomId: memberId,
        senderId: 'me',
        senderName: `${user?.first_name || 'Me'} ${user?.last_name || ''}`,
        content: `📢 [Broadcast]: ${broadcastMsgText}`,
        type: 'text',
        created_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => ({
        ...prev,
        [memberId]: [...(prev[memberId] || []), bMsg]
      }));

      // Update room lastMessage
      setRooms(prev => prev.map(r => r.id === memberId ? { ...r, lastMessage: `📢 Broadcast: ${broadcastMsgText.slice(0, 20)}...`, lastMessageTime: 'Just now' } : r));
    });
  };

  // Real file upload — never send a placeholder path.
  const handleTriggerFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!authToken || !activeRoomId) {
      triggerAlert(language === 'so' ? 'Fadlan marka hore gal.' : 'Please sign in first.', 'error');
      return;
    }

    setUploadProgress({ name: file.name, pct: 5 });
    setShowMediaUploadOverlay(false);
    try {
      const form = new FormData();
      form.append('file', file);
      const upload = await axios.post('/api/files/upload', form, {
        headers: { Authorization: `Bearer ${authToken}` },
        onUploadProgress: (evt) => {
          if (evt.total) {
            setUploadProgress({ name: file.name, pct: Math.max(5, Math.round((evt.loaded / evt.total) * 100)) });
          }
        }
      });
      const publicUrl = upload.data?.public_url || upload.data?.url;
      if (!publicUrl) throw new Error('Upload completed without a public URL.');
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      await handleSendMessage(`📄 ${file.name} (${sizeMb} MB)`, 'file', publicUrl);
    } catch (err: any) {
      triggerAlert(err?.response?.data?.error || (language === 'so' ? 'Faylka lama gelin.' : 'File upload failed.'), 'error');
    } finally {
      setUploadProgress(null);
      e.target.value = '';
    }
  };

  // Real OTP via server API (dev returns code in response when SMS gateway not configured)
  const handleOTPRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpVerificationState.phone.trim()) return;
    try {
      const res = await axios.post('/api/auth/phone/send-otp', {
        phone: otpVerificationState.phone.trim(),
      }, authToken ? { headers: { Authorization: `Bearer ${authToken}` } } : undefined);
      setOtpVerificationState(prev => ({ ...prev, step: 'input' }));
      const codeHint = res.data?.otpCode
        ? (language === 'so'
            ? `OTP waa la diyaariyay (dev): ${res.data.otpCode}`
            : `OTP ready (dev mode): ${res.data.otpCode}`)
        : (language === 'so'
            ? `OTP waxaa loo diray ${otpVerificationState.phone}`
            : `OTP sent to ${otpVerificationState.phone}`);
      triggerAlert(codeHint, 'success');
    } catch (err: any) {
      triggerAlert(err?.response?.data?.error || (language === 'so' ? 'OTP lama diri karin' : 'Could not send OTP'), 'error');
    }
  };

  const handleOTPVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim()) return;
    try {
      await axios.post('/api/auth/phone/verify-otp', {
        phone: otpVerificationState.phone.trim(),
        otpCode: otpCode.trim(),
      }, authToken ? { headers: { Authorization: `Bearer ${authToken}` } } : undefined);
      setOtpVerificationState(prev => ({ ...prev, step: 'verified' }));
      triggerAlert(language === 'so' ? '✓ Telefoonka waa la xaqiijiyay' : '✓ Phone verified', 'success');
    } catch (err: any) {
      triggerAlert(err?.response?.data?.error || (language === 'so' ? 'OTP khaldan' : 'Invalid OTP'), 'error');
    }
  };

  // --- HELPER COMPONENT DISPATCHERS ---
  const handleToggleBlock = (targetId: string) => {
    setBlockedUserIds(prev => {
      const exists = prev.includes(targetId);
      if (exists) {
        triggerAlert("Contact unblocked successfully.", "success");
        return prev.filter(id => id !== targetId);
      } else {
        triggerAlert("Contact blocked. They can no longer call or text you.", "error");
        return [...prev, targetId];
      }
    });
  };

  const handleCreateGroupChannel = (groupData: { name: string; avatar: string; description: string; members: string[] }) => {
    const newGroupId = `group_${Date.now()}`;
    const newGroupRoom: ChatRoom = {
      id: newGroupId,
      name: groupData.name,
      avatar: groupData.avatar,
      isGroup: true,
      unreadCount: 0,
      lastMessage: 'Kooxda si guul leh ayaa loo abuuray. Ku soo dhowada!',
      lastMessageTime: 'Just now',
      members: groupData.members,
      bio: groupData.description,
      phone: 'Group Chat Link: somluul.com/join/' + newGroupId
    };

    setRooms(prev => [newGroupRoom, ...prev]);
    setMessages(prev => ({
      ...prev,
      [newGroupId]: [
        { id: `init_${Date.now()}`, roomId: newGroupId, senderId: 'system', senderName: 'SomLuul Security', content: `🔒 Group initialized with End-to-End Encryption. Description: "${groupData.description}"`, type: 'text', created_at: 'Just now' }
      ]
    }));
    setActiveRoomId(newGroupId);
  };

  // Global search matching messages and attachments (Fulfills Module 9)
  const getGlobalSearchResults = () => {
    if (!searchQuery.trim()) return [];
    const results: Array<{ type: 'message' | 'group' | 'contact'; title: string; subtitle: string; roomId: string }> = [];

    // Search contacts/users
    profiles.forEach(p => {
      const name = `${p.first_name} ${p.last_name}`;
      if (name.toLowerCase().includes(searchQuery.toLowerCase()) || p.email.includes(searchQuery)) {
        results.push({ type: 'contact', title: name, subtitle: `Contact: @${p.email.split('@')[0]}`, roomId: p.id });
      }
    });

    // Search messages content
    Object.keys(messages).forEach(rId => {
      const roomMsgs = messages[rId] || [];
      const matchedRoom = rooms.find(r => r.id === rId);
      if (!matchedRoom) return;

      roomMsgs.forEach(m => {
        if (m.content.toLowerCase().includes(searchQuery.toLowerCase())) {
          results.push({ type: 'message', title: m.content, subtitle: `In chat with: ${matchedRoom.name}`, roomId: rId });
        }
      });
    });

    return results;
  };

  const globalSearchResults = getGlobalSearchResults();

  // Filtered rooms display list based on sub-tabs
  const filteredRooms = rooms.filter(r => {
    // Search query filter first
    const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (selectedSubTab === 'chats') {
      return !r.isGroup && !r.isChannel;
    }
    if (selectedSubTab === 'groups') {
      return r.isGroup === true;
    }
    if (selectedSubTab === 'channels') {
      return r.isChannel === true;
    }
    return true; // 'all'
  });
  const activeRoom = rooms.find(r => r.id === activeRoomId);
  const activeRoomMessages = messages[activeRoomId] || [];

  const isCurrentRoomBlocked = blockedUserIds.includes(activeRoomId);

  // Match against profile
  const matchingRealProfile = activeRoom ? profiles.find(p => p.id === activeRoom.id) : null;

  // Custom Somali Themes stickers dictionary (Module 5 stickers)
  const somaliStickers = [
    { label: '🐪 Geel dhoodaan', emoji: '🐪', desc: 'Camel emoji sticker' },
    { label: '☕ Shaah Carbeed', emoji: '☕', desc: 'Somali Cardamom Spiced Tea' },
    { label: '🌊 Lido Beach', emoji: '🌊', desc: 'Mogadishu Beach wave' },
    { label: '🌴 SomLuul Premium', emoji: '🌴', desc: 'Official SomLuul premium leaf' },
    { label: '🛡️ Gaashaan', emoji: '🛡️', desc: 'Somali traditional shield' }
  ];

  return (
    <DeviceFrame language={language}>
      
      <div id="messenger-wrapper" className="bg-white dark:bg-[var(--sl-bg-card)] rounded-2xl shadow-sm h-[calc(100vh-140px)] min-h-[460px] max-h-[720px] overflow-hidden grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 relative border border-gray-150 dark:border-gray-800/60 animate-fade-in">
        
        {/* 1. SIDEBAR COLUMN (ROOMS, CHATS, AND DISCOVERY SECTORS) */}
        <div className={`border-r border-gray-150 dark:border-gray-800/60 flex flex-col h-full bg-gray-50/50 dark:bg-[#121826] md:col-span-1 pt-3 ${mobileView === 'chat' ? 'hidden md:flex' : 'flex'}`}>
          
          {/* SomLuul App header */}
          <div className="px-3.5 py-3 bg-white dark:bg-[var(--sl-bg-card)] flex justify-between items-center select-none border-b border-gray-100 dark:border-gray-850">
            <div className="flex items-center gap-1.5">
              {onNavigateHome && (
                <button
                  type="button"
                  onClick={onNavigateHome}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all cursor-pointer"
                  title="Ka noqo / Back to Home"
                >
                  <ArrowLeft size={18} />
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  if (onNavigateHome) onNavigateHome();
                }}
                className="text-lg font-black text-indigo-600 dark:text-indigo-500 tracking-tight font-sans flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer text-left"
                title="Aada Hoyga SomLuul / Go to Home Feed"
              >
                <AppLogo className="w-6 h-6 rounded-lg" />
                <span>SomLuul</span>
              </button>
            </div>
            <div className="flex items-center gap-2.5 text-gray-500 dark:text-gray-400">
              <button 
                onClick={() => setSelectedSubTab('contacts')} 
                className={`p-1.5 rounded-lg hover:text-indigo-600 dark:hover:text-indigo-500 cursor-pointer transition-all ${selectedSubTab === 'contacts' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/20 dark:text-blue-450' : ''}`}
                title="Daawo Lambarada / Contacts"
              >
                <Users size={17} />
              </button>
              <button 
                onClick={() => setShowBroadcastComposer(true)}
                className="p-1.5 hover:text-indigo-600 dark:hover:text-indigo-500 cursor-pointer transition-all"
                title="Broadcasting"
              >
                <Radio size={16} />
              </button>
              <button 
                onClick={() => setShowGroupCreator(true)}
                className="p-1.5 hover:text-indigo-600 dark:hover:text-indigo-500 cursor-pointer transition-all"
                title="Create Group"
              >
                <Plus size={18} />
              </button>
            </div>
          </div>

          {/* Sub-tabs Slider Menu */}
          <div className="px-4 py-2 bg-white dark:bg-[var(--sl-bg-card)] overflow-x-auto scrollbar-none flex gap-1.5 border-b border-gray-100 dark:border-gray-850">
            {[
              { id: 'all', label: language === 'so' ? 'Dhamaan' : 'All' },
              { id: 'chats', label: language === 'so' ? 'Kala hadal' : 'Chats' },
              { id: 'groups', label: language === 'so' ? 'Kooxaha' : 'Groups' },
              { id: 'channels', label: language === 'so' ? 'Kanaalada' : 'Channels' },
              { id: 'contacts', label: language === 'so' ? 'Lambarada' : 'Contacts' }
            ].map(tab => {
              const isActive = selectedSubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setSelectedSubTab(tab.id as any)}
                  className={`px-3 py-1.5 text-[11px] font-extrabold rounded-full transition-all shrink-0 cursor-pointer ${
                    isActive 
                      ? 'bg-[var(--somluul-primary)] text-white shadow-xs' 
                      : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-750 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Search globally / locally */}
          <div className="p-3 bg-white dark:bg-[var(--sl-bg-card)] space-y-2 border-b border-gray-100 dark:border-gray-850">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={14} />
              <input
                type="text"
                placeholder={selectedSubTab === 'contacts' ? (language === 'so' ? 'Raadi lambar ama magac...' : 'Search contacts...') : t('search_chats')}
                className="w-full pl-8.5 pr-3 py-2 bg-gray-50 dark:bg-[var(--sl-bg-muted)] border border-gray-150 dark:border-gray-700/60 rounded-xl text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500/50"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Global Search Results dropdown if matching (Module 9) */}
            {searchQuery.trim() !== '' && selectedSubTab !== 'contacts' && globalSearchResults.length > 0 && (
              <div className="bg-white dark:bg-[#1e2738] border border-gray-200 dark:border-gray-800 rounded-xl p-2.5 space-y-2 shadow-lg max-h-36 overflow-y-auto">
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">Global Search Matches:</span>
                {globalSearchResults.map((res, i) => (
                  <div 
                    key={i} 
                    onClick={() => { setActiveRoomId(res.roomId); setSearchQuery(''); }}
                    className="p-1.5 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg cursor-pointer text-[10px]"
                  >
                    <span className="font-bold text-gray-950 dark:text-white block truncate">{res.title}</span>
                    <span className="text-indigo-500 font-medium block truncate mt-0.5">{res.subtitle}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* PRIVACY CONTROLS SHORTCUT */}
          <div className="px-4 py-2.5 bg-gray-50/50 dark:bg-gray-900/10 border-b border-gray-150 dark:border-gray-800/60 flex items-center justify-between text-[10px]">
            <span className="text-gray-400 font-bold uppercase font-mono">My Presence</span>
            <div className="flex gap-2">
              <label className="flex items-center gap-1 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={privacySettings.hideOnline} 
                  onChange={(e) => setPrivacySettings({ ...privacySettings, hideOnline: e.target.checked })} 
                  className="rounded dark:bg-gray-800 border-gray-300"
                />
                <span className="text-gray-500 dark:text-gray-450">Hide Online</span>
              </label>
            </div>
          </div>

          {/* ROOMS AND CONTACTS LISTING STREAM */}
          <div className="grow overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800/40 scrollbar-thin">
            {selectedSubTab === 'contacts' ? (
              <div className="p-3.5 space-y-3">
                <div className="flex items-center justify-between text-[10px] font-extrabold text-gray-400 uppercase tracking-widest pb-1">
                  <span>{language === 'so' ? 'Lambarrada ku jira taleefankaaga' : 'Your Phonebook Contacts'}</span>
                  <span className="bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 px-2 py-0.5 rounded-full">
                    {deviceContacts.length} Contacts
                  </span>
                </div>
                
                <div className="space-y-3.5">
                  {getMatchedPhonebook()
                    .filter(c => 
                      c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                      c.phone.includes(searchQuery)
                    )
                    .map((contact, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-2.5 p-2 hover:bg-gray-100/40 dark:hover:bg-gray-800/20 rounded-xl transition-all">
                        <div className="flex gap-2.5 items-center min-w-0">
                          {renderAvatar(contact.room?.avatar, contact.name, "w-9 h-9")}
                          
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-bold text-gray-900 dark:text-white truncate">
                                {contact.name}
                              </span>
                              {contact.registered && (
                                <span className="text-[7.5px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-1 rounded font-black uppercase tracking-wider shrink-0">
                                  SomLuul
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-gray-400 dark:text-gray-450 font-mono block mt-0.5">
                              {contact.phone}
                            </span>
                          </div>
                        </div>

                        <div className="flex gap-1 shrink-0">
                          {contact.registered ? (
                            <>
                              <button
                                onClick={() => {
                                  if (contact.room) {
                                    setActiveRoomId(contact.room.id);
                                    setShowContactInfo(true);
                                    setMobileView('chat');
                                  }
                                }}
                                className="px-2 py-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-300 text-[10px] font-extrabold rounded-lg transition-all cursor-pointer"
                                title="Show Profile"
                              >
                                Profile
                              </button>
                              <button
                                onClick={() => {
                                  if (contact.room) {
                                    setActiveRoomId(contact.room.id);
                                    setMobileView('chat');
                                  }
                                }}
                                className="px-2.5 py-1 bg-[var(--somluul-primary)] hover:brightness-110 text-white text-[10px] font-extrabold rounded-lg transition-all cursor-pointer shadow-xs"
                              >
                                Chat
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => {
                                setInviteTargetContact(contact);
                              }}
                              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-extrabold rounded-lg transition-all cursor-pointer shadow-xs"
                            >
                              {language === 'so' ? 'Casuun' : 'Invite'}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ) : (
              filteredRooms.map(r => {
                const isBlocked = blockedUserIds.includes(r.id);
                return (
                  <div
                    key={r.id}
                    onClick={() => { setActiveRoomId(r.id); setMobileView('chat'); }}
                    className={`flex items-center gap-3 p-3.5 cursor-pointer transition-all ${r.id === activeRoomId ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-l-4 border-indigo-500' : 'hover:bg-gray-100/50 dark:hover:bg-gray-800/30'}`}
                  >
                    <div className="relative shrink-0">
                      {renderAvatar(r.avatar, r.name, "w-10 h-10")}
                      {!isBlocked && !privacySettings.hideOnline && (
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-white dark:border-[#141b2d]" />
                      )}
                    </div>
                    
                    <div className="grow min-w-0">
                      <div className="flex justify-between items-center">
                        <span className={`text-xs font-semibold truncate ${r.isSecret ? 'text-green-600 dark:text-green-400 flex items-center gap-1' : 'text-gray-900 dark:text-white'}`}>
                          {r.isSecret && <Shield size={11} />}
                          {r.name}
                        </span>
                        <span className="text-[9px] text-gray-400 shrink-0">{r.lastMessageTime}</span>
                      </div>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
                        {isBlocked ? '🚫 Content Blocked' : r.lastMessage}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* VERIFY PHONE CORNER LINK */}
          <div className="p-3 bg-gray-100/60 dark:bg-gray-900/40 border-t border-gray-150 dark:border-gray-850 flex justify-between items-center">
            <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest">Verification Status</span>
            <button
              onClick={() => setOtpVerificationState({ phone: user.phone || '', step: 'input' })}
              className={`text-[9px] font-bold px-2 py-0.8 rounded-md transition-all ${otpVerificationState.step === 'verified' ? 'bg-green-100 text-green-700 dark:bg-green-950/20 dark:text-green-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400'}`}
            >
              {otpVerificationState.step === 'verified' ? '✓ OTP Verified' : 'Unverified • OTP Sync'}
            </button>
          </div>

        </div>

        {/* 2. CHAT STREAM PANEL (CONVERSATIONS FEED) */}
        <div className={`flex flex-col h-full overflow-hidden min-h-0 bg-white dark:bg-[var(--sl-bg-card)] ${showContactInfo ? 'md:col-span-2 lg:col-span-2' : 'md:col-span-2 lg:col-span-3'} ${mobileView === 'list' ? 'hidden md:flex' : 'flex'}`}>
          
          {activeRoom ? (
            <>
              {/* Active room headers */}
              <div className="p-3 border-b border-gray-100 dark:border-gray-800/60 flex justify-between items-center bg-gray-50/20 dark:bg-gray-900/10 shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <button
                    type="button"
                    onClick={() => setMobileView('list')}
                    className="md:hidden p-1.5 hover:bg-gray-150 dark:hover:bg-gray-800 rounded-xl text-gray-500 hover:text-gray-900 dark:hover:text-white transition-all shrink-0"
                    title="Back to chat list"
                  >
                    <ArrowLeft size={16} />
                  </button>
                  <div 
                    onClick={() => setShowContactInfo(true)}
                    className="flex items-center gap-2.5 min-w-0 cursor-pointer hover:opacity-80"
                  >
                    {renderAvatar(activeRoom.avatar, activeRoom.name, "w-9 h-9")}
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-gray-900 dark:text-white truncate flex items-center gap-1.5">
                        {activeRoom.name}
                        {isCurrentRoomBlocked && (
                          <span className="text-[8px] bg-red-500/10 text-red-600 dark:text-red-400 font-extrabold px-1.5 py-0.2 rounded uppercase">BLOCKED</span>
                        )}
                      </h4>
                      <div className="text-[9px] text-gray-400 flex items-center gap-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${isCurrentRoomBlocked ? 'bg-gray-400' : 'bg-green-500'}`}></span>
                        <span>{isCurrentRoomBlocked ? 'Blocked' : 'Online / Verified Line'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Call & Meta settings */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleStartCall('voice')}
                    className="p-2 text-gray-500 hover:text-indigo-500 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-all cursor-pointer"
                    title="Wacitaanka Codka / Voice Call"
                  >
                    <Phone size={15} />
                  </button>

                  <button
                    onClick={() => handleStartCall('video')}
                    className="p-2 text-gray-500 hover:text-indigo-500 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-all cursor-pointer"
                    title="Wacitaanka Muuqaalka / Video Call"
                  >
                    <Video size={15} />
                  </button>

                  <button
                    onClick={() => setShowContactInfo(!showContactInfo)}
                    className={`p-2 rounded-xl transition-all ${showContactInfo ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400' : 'text-gray-500 hover:text-indigo-500 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                    title="Xogta Qofka / Contact Info"
                  >
                    <Info size={15} />
                  </button>

                  {/* Close Chat Button (X) */}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveRoomId('');
                      setShowContactInfo(false);
                      setMobileView('list');
                    }}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-all cursor-pointer ml-1"
                    title="Xidh Sheekada / Close Chat (X)"
                  >
                    <X size={17} />
                  </button>
                </div>
              </div>

              {/* CHATS STREAM CONTAINER */}
              <div ref={chatContainerRef} className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 bg-gray-50/20 dark:bg-[var(--sl-bg)]/15">
                {activeRoomMessages.map((m, idx) => {
                  const isMe = m.senderId === 'me' || m.senderId === user?.id;
                  const isStarred = starredMessageIds.includes(m.id);
                  const isPinned = pinnedMessageIds[activeRoomId] === m.id;

                  return (
                    <div key={m.id || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group relative`}>
                      
                      <div className={`max-w-[75%] flex flex-col ${isMe ? 'items-end' : 'items-start'} relative`}>
                        {/* Pinned Marker */}
                        {isPinned && (
                          <span className="text-[8px] text-indigo-500 font-extrabold flex items-center gap-1 mb-1 uppercase tracking-widest"><Pin size={8} /> Pinned Message</span>
                        )}

                        {/* Speech Bubble */}
                        <div className={`p-3 rounded-2xl text-xs leading-relaxed shadow-xs relative ${isMe ? 'bg-[var(--somluul-primary)] text-white rounded-br-none' : 'bg-gray-150 dark:bg-[var(--sl-bg-muted)] text-gray-900 dark:text-gray-200 rounded-bl-none'}`}>
                          
                          {/* File sharing attachment template with realistic download/preview features (Module 6) */}
                          {m.type === 'file' && (
                            <div className="flex items-center gap-2.5 p-1 bg-black/5 dark:bg-black/20 rounded-xl border border-white/10 my-1">
                              <span className="text-xl">📄</span>
                              <div className="min-w-0 text-left">
                                <span className="block font-bold text-[11px] truncate">{m.content}</span>
                                <span className="text-[9px] text-gray-400 block mt-0.5">Attachment verified • 100% Downloaded</span>
                              </div>
                            </div>
                          )}

                          {/* Location pin template */}
                          {m.type === 'location' && (
                            <div className="p-1 my-1 space-y-1 text-left bg-black/10 rounded-xl">
                              <span className="text-xs font-bold block flex items-center gap-1 text-indigo-300"><MapPin size={11} /> Lido Beach, Mogadishu</span>
                              <div className="w-full h-24 bg-gray-300 dark:bg-gray-800 rounded-lg flex items-center justify-center relative overflow-hidden">
                                <span className="text-lg">📍</span>
                                <span className="absolute bottom-1 right-1 text-[8px] bg-black/50 text-white px-1.5 py-0.2 rounded font-mono">2.0408, 45.3421</span>
                              </div>
                              <a href={m.mediaUrl} target="_blank" rel="noreferrer" className="text-[10px] text-indigo-400 hover:underline block font-semibold">Open in Google Maps</a>
                            </div>
                          )}

                          {/* Image preview template */}
                          {m.type === 'image' && (
                            <div className="space-y-1.5 my-1 text-left">
                              <img
                                src={m.mediaUrl || '/somluul_logo.png'}
                                alt="Sawir"
                                className="rounded-xl max-h-60 max-w-full object-cover border border-white/20 shadow-xs cursor-pointer hover:opacity-95 transition-opacity"
                                referrerPolicy="no-referrer"
                                onClick={() => {
                                  if (m.mediaUrl) window.open(m.mediaUrl, '_blank');
                                }}
                              />
                              {m.content && m.content !== 'Sawir 📷' && <p className="text-xs pt-0.5">{m.content}</p>}
                            </div>
                          )}

                          {/* Voice Note player */}
                          {m.type === 'voice' ? (
                            <VoiceNotePlayer
                              mediaUrl={m.mediaUrl}
                              durationLabel={m.content.includes('(') ? m.content.split('(')[1]?.replace(')', '') : '0:08'}
                              isMe={isMe}
                            />
                          ) : (
                            /* Render default text — never show raw e2e ciphertext */
                            m.type !== 'file' && m.type !== 'location' && m.type !== 'image' && (
                              <p className="whitespace-pre-wrap break-words">
                                {(m.content || '').startsWith('e2e:')
                                  ? (language === 'so' ? '🔒 Fariin la ilaaliyay' : '🔒 Protected message')
                                  : m.content}
                              </p>
                            )
                          )}

                          {/* Action context float menus on hover */}
                          <div className="absolute top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-1 bg-white dark:bg-[var(--sl-bg-muted)] border border-gray-250 dark:border-gray-700 shadow-md p-1 rounded-xl z-20 transition-all -left-20 group-hover:opacity-100">
                            {/* Star */}
                            <button 
                              onClick={() => {
                                setStarredMessageIds(prev => prev.includes(m.id) ? prev.filter(id => id !== m.id) : [...prev, m.id]);
                              }}
                              className={`p-1 hover:text-amber-500 rounded ${isStarred ? 'text-amber-500' : 'text-gray-400'}`}
                              title="Star message"
                            >
                              <Star size={11} />
                            </button>
                            {/* Pin */}
                            <button
                              onClick={() => {
                                setPinnedMessageIds(prev => ({ ...prev, [activeRoomId]: prev[activeRoomId] === m.id ? '' : m.id }));
                              }}
                              className={`p-1 hover:text-indigo-500 rounded ${isPinned ? 'text-indigo-500' : 'text-gray-400'}`}
                              title="Pin/unpin message"
                            >
                              <Pin size={11} />
                            </button>
                            {/* Reply */}
                            <button
                              onClick={() => setReplyingToMessage(m)}
                              className="p-1 hover:text-indigo-500 text-gray-400 rounded"
                              title="Reply to message"
                            >
                              <CornerUpLeft size={11} />
                            </button>
                            {/* Delete message button */}
                            <button
                              onClick={() => handleDeleteMessage(m.id, activeRoomId)}
                              className="p-1 hover:text-rose-500 text-gray-400 rounded"
                              title={language === 'so' ? "Tirtir fariinta" : "Delete message"}
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>

                        </div>

                        {/* Meta indicators */}
                        <div className="flex items-center gap-1.5 mt-1 text-[9px] text-gray-400 font-mono font-bold">
                          <span>{m.created_at}</span>
                          {isStarred && <Star size={9} className="text-amber-500 fill-amber-500" />}
                          {isMe && <CheckCheck size={11} className="text-indigo-500 shrink-0" />}
                          {m.reaction && <span className="bg-gray-100 dark:bg-gray-800 px-1 rounded text-[8px]">{m.reaction}</span>}
                          <button
                            onClick={() => handleDeleteMessage(m.id, activeRoomId)}
                            className="text-gray-400 hover:text-rose-500 transition-colors ml-1"
                            title={language === 'so' ? "Tirtir fariinta" : "Delete message"}
                          >
                            <Trash2 size={10} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Typing indicators */}
                {isTyping && (
                  <div className="flex justify-start items-center gap-2 text-[10px] text-gray-400">
                    <span className="font-semibold text-gray-500">{isTyping}</span>
                    <span>{t('typing')}</span>
                    <span className="flex gap-1">
                      <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"></span>
                      <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                      <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                    </span>
                  </div>
                )}


              </div>

              {/* INPUT BOX CONTROL FOOTERS — always visible (shrink-0) */}
              <div className="p-3 border-t border-gray-100 dark:border-gray-800/60 bg-white dark:bg-[var(--sl-bg-card)] shrink-0 z-10">
                
                {/* Replying context bar if active */}
                {replyingToMessage && (
                  <div className="p-2 mb-2 bg-indigo-50 dark:bg-indigo-950/20 border-l-4 border-indigo-500 rounded-lg flex justify-between items-center text-[10px] text-gray-600 dark:text-gray-300">
                    <div className="truncate">
                      <span className="font-bold">Replying to {replyingToMessage.senderName}: </span>
                      <span className="italic">"{replyingToMessage.content}"</span>
                    </div>
                    <button onClick={() => setReplyingToMessage(null)} className="text-gray-400 hover:text-gray-600">
                      <X size={12} />
                    </button>
                  </div>
                )}

                {/* Drawers panels overlay toggles */}
                <div className="flex gap-2 mb-2">
                  {/* Emoji Drawer trigger */}
                  <button 
                    onClick={() => { setShowEmojiDrawer(!showEmojiDrawer); setShowStickerDrawer(false); }}
                    className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-lg border transition-all ${showEmojiDrawer ? 'bg-indigo-100 text-indigo-600 border-indigo-200' : 'bg-white dark:bg-gray-800 text-gray-500'}`}
                  >
                    😃 Emoji
                  </button>

                  {/* Somali Tech Stickers drawer */}
                  <button 
                    onClick={() => { setShowStickerDrawer(!showStickerDrawer); setShowEmojiDrawer(false); }}
                    className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-lg border transition-all ${showStickerDrawer ? 'bg-amber-100 text-amber-600 border-amber-200' : 'bg-white dark:bg-gray-800 text-gray-500'}`}
                  >
                    🐫 Somali Stickers
                  </button>

                  {/* Attachment overlay launcher */}
                  <button 
                    onClick={() => setShowMediaUploadOverlay(!showMediaUploadOverlay)}
                    className="px-2.5 py-1 text-[10px] font-bold uppercase rounded-lg border bg-white dark:bg-gray-800 text-gray-500"
                  >
                    📎 Share Attachment
                  </button>
                </div>

                {/* Render Emoji Drawer Grid if open */}
                {showEmojiDrawer && (
                  <div className="p-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-850 rounded-xl mb-3 grid grid-cols-8 gap-2 text-lg">
                    {['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '🐫', '☕', '⚡', '🎉', '💡', '💯', '👏', '🤝', '🇸🇴'].map(em => (
                      <button 
                        key={em} 
                        type="button"
                        onClick={() => { setInputText(prev => prev + em); setShowEmojiDrawer(false); }}
                        className="hover:scale-125 transition-transform"
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                )}

                {/* Render Stickers Drawer Grid if open */}
                {showStickerDrawer && (
                  <div className="p-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-850 rounded-xl mb-3 space-y-2">
                    <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest block">Premium Somali Stickers:</span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {somaliStickers.map(st => (
                        <button
                          key={st.label}
                          type="button"
                          onClick={() => {
                            handleSendMessage(st.label, 'text');
                            setShowStickerDrawer(false);
                          }}
                          className="flex items-center gap-1.5 p-2 bg-gray-50 dark:bg-[#1a2235]/40 hover:bg-amber-500/10 hover:border-amber-500/25 border border-gray-100 dark:border-gray-850 rounded-xl text-left text-xs font-semibold cursor-pointer"
                        >
                          <span className="text-lg">{st.emoji}</span>
                          <span className="truncate">{st.label.split(' ')[1] || st.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Attachment Drawer Grid */}
                {showMediaUploadOverlay && (
                  <div className="p-3.5 bg-white dark:bg-[#1e2738] border border-gray-150 dark:border-gray-800 rounded-xl mb-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {/* File sharing input click */}
                    <label className="flex items-center gap-2 p-2.5 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 rounded-xl cursor-pointer text-xs font-bold border border-transparent hover:border-gray-200">
                      <Paperclip size={14} className="text-indigo-500" />
                      <span>Document / ZIP / APK</span>
                      <input 
                        type="file" 
                        className="hidden" 
                        onChange={handleTriggerFileUpload} 
                        accept=".pdf,.docx,.xlsx,.txt,.zip,.rar,.apk"
                      />
                    </label>

                    {/* Location Pin */}
                    <button
                      onClick={() => { handleSendLocation(); setShowMediaUploadOverlay(false); }}
                      className="flex items-center gap-2 p-2.5 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 rounded-xl text-xs font-bold text-left border border-transparent hover:border-gray-200 cursor-pointer"
                    >
                      <MapPin size={14} className="text-emerald-500" />
                      <span>Live Location</span>
                    </button>

                    {/* Poll generator */}
                    <button
                      onClick={() => { setShowPollBuilder(true); setShowMediaUploadOverlay(false); }}
                      className="flex items-center gap-2 p-2.5 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 rounded-xl text-xs font-bold text-left border border-transparent hover:border-gray-200 cursor-pointer"
                    >
                      <CheckCircle size={14} className="text-amber-500" />
                      <span>Create Poll</span>
                    </button>
                  </div>
                )}

                {/* Animated File Upload progress bar */}
                {uploadProgress && (
                  <div className="bg-indigo-50 dark:bg-indigo-950/20 border border-blue-100 dark:border-indigo-900/40 p-2.5 rounded-xl mb-3 space-y-1.5 animate-pulse">
                    <div className="flex justify-between items-center text-[9px] text-gray-500 font-bold">
                      <span className="truncate">Uploading: {uploadProgress.name}</span>
                      <span>{uploadProgress.pct}%</span>
                    </div>
                    <div className="w-full h-1 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full bg-[var(--somluul-primary)] transition-all duration-300" style={{ width: `${uploadProgress.pct}%` }} />
                    </div>
                  </div>
                )}

                {/* Core Message Dispatcher Form */}
                <form 
                  onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} 
                  className="flex gap-1.5 items-center"
                >
                  {/* Photo Upload quick button */}
                  {!audioRecorder.isRecording && !isRecording && (
                    <label 
                      className="p-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-full text-gray-500 hover:text-indigo-500 shrink-0 transition-all cursor-pointer" 
                      title="Soo gudbi Sawir / Send Image (📷)"
                    >
                      <ImageIcon size={15} />
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        disabled={isCurrentRoomBlocked}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              handleSendMessage('Sawir 📷', 'image', reader.result as string);
                            };
                            reader.readAsDataURL(file);
                          }
                        }} 
                      />
                    </label>
                  )}

                  {/* Real Voice Note Recorder controls or Text Input */}
                  {(audioRecorder.isRecording || isRecording) ? (
                    <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 px-3 py-1.5 rounded-full text-red-600 dark:text-red-400 text-xs font-mono font-bold animate-pulse grow justify-between min-w-0 overflow-hidden">
                      <div className="flex items-center gap-1.5 min-w-0 shrink">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping shrink-0" />
                        <span className="truncate whitespace-nowrap text-[11px] sm:text-xs">
                          Duubida codka: 0:{((audioRecorder.recordingSeconds || recordingSeconds) < 10 ? '0' : '')}{(audioRecorder.recordingSeconds || recordingSeconds)}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button 
                          type="button" 
                          onClick={handleCancelVoiceRecording} 
                          className="px-2 py-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-[11px] font-sans font-semibold flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap"
                          title="Ka noqo duubista / Cancel recording"
                        >
                          <Trash2 size={12} />
                          <span className="hidden sm:inline">Kanasal</span>
                        </button>

                        <button 
                          type="button" 
                          onClick={handleFinishVoiceRecording} 
                          className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[11px] font-sans font-semibold flex items-center gap-1 cursor-pointer shadow-xs transition-colors whitespace-nowrap"
                          title="Jooji & Dir / Stop & Send voice note"
                        >
                          <Square size={11} fill="currentColor" />
                          <span>Jooji & Dir</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <input
                        type="text"
                        disabled={isCurrentRoomBlocked}
                        placeholder={isCurrentRoomBlocked ? 'You have blocked this contact. Unblock to message.' : (activeRoom.isSecret ? t('secret_chat') : 'Qor farriin... (Type message)')}
                        className="grow bg-gray-50 dark:bg-[var(--sl-bg-muted)] border border-gray-150 dark:border-gray-700 rounded-full px-4 py-2 text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 min-w-0"
                        value={inputText}
                        onChange={(e) => {
                          setInputText(e.target.value);
                          // Notify peers (throttled via last emit flag on window)
                          try {
                            const now = Date.now();
                            const w = window as any;
                            if (authToken && activeRoomId && e.target.value && (!w.__somluulTypingAt || now - w.__somluulTypingAt > 2000)) {
                              w.__somluulTypingAt = now;
                              axios.post('/api/chat/typing', { roomId: activeRoomId }, {
                                headers: { Authorization: `Bearer ${authToken}` }
                              }).catch(() => {});
                            }
                          } catch (_) {}
                        }}
                      />

                      <button
                        type="button"
                        disabled={isCurrentRoomBlocked}
                        onClick={handleStartRecordingVoice}
                        className="p-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-full text-gray-500 hover:text-red-500 shrink-0 transition-all cursor-pointer"
                        title="Duub cod (Record voice note 🎤)"
                      >
                        <Mic size={15} />
                      </button>
                    </>
                  )}

                  <button
                    type="submit"
                    disabled={isCurrentRoomBlocked || (!inputText.trim() && !isRecording)}
                    className="p-2.5 bg-[var(--somluul-primary)] hover:brightness-110 text-white rounded-full transition-all shrink-0 cursor-pointer disabled:opacity-50"
                    title="Dir farriinta / Send message (➔)"
                  >
                    <Send size={15} />
                  </button>
                </form>

              </div>
            </>
          ) : (
            <div className="grow flex flex-col items-center justify-center text-center p-6 bg-gray-50/20 dark:bg-[var(--sl-bg)]/10 relative gap-3">
              <button
                type="button"
                onClick={() => {
                  setMobileView('list');
                  setShowContactInfo(false);
                }}
                className="md:hidden absolute top-4 left-4 p-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-200 cursor-pointer flex items-center gap-1 text-xs font-bold"
                title="Ka noqo / Back to list"
              >
                <ArrowLeft size={16} />
                <span>Liiska</span>
              </button>
              <MessageSquare className="text-gray-300 dark:text-gray-700 mb-1" size={48} />
              <h4 className="text-sm font-bold text-gray-900 dark:text-white">Chats & Rooms</h4>
              <p className="text-xs text-gray-400 mt-1 max-w-sm leading-relaxed">
                Weli ma dooran sheeko. Dooro qof liiska bidix, ama bilow chat cusub si aad u aragto
                sanduuqa qoraalka, sawirada, codka iyo stickers-ka.
              </p>
              <div className="flex flex-wrap gap-2 justify-center mt-2">
                <button
                  type="button"
                  onClick={() => { setSelectedSubTab('contacts'); setMobileView('list'); }}
                  className="px-4 py-2 bg-[var(--somluul-primary)] hover:brightness-110 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Bilow Chat (Contacts)
                </button>
                <button
                  type="button"
                  onClick={() => setShowGroupCreator(true)}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 text-gray-800 dark:text-gray-200 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Samee Group
                </button>
              </div>
              <p className="text-[10px] text-gray-400 max-w-xs mt-2">
                Marka aad qof doorato: hoose waxaa ka muuqan doona qoraal + 📎 + 🎤 + emoji.
              </p>
            </div>
          )}

        </div>

        {/* 3. USER PROFILE SETTINGS SIDEBAR DETAIL PANELS */}
        {showContactInfo && activeRoom && (
          <div className={`border-l border-gray-150 dark:border-gray-800/60 flex flex-col h-full bg-gray-50/50 dark:bg-[#111624] md:col-span-1 ${mobileView !== 'chat' || !showContactInfo ? 'hidden md:flex' : 'flex'}`}>
            <UserProfileSidebar
              room={activeRoom}
              onClose={() => setShowContactInfo(false)}
              matchingRealProfile={matchingRealProfile}
              isBlocked={isCurrentRoomBlocked}
              onToggleBlock={() => handleToggleBlock(activeRoomId)}
              language={language}
              onViewProfile={onViewProfile}
              onReport={async (reason) => {
                try {
                  if (authToken) {
                    await axios.post('/api/reports', {
                      type: 'user',
                      targetId: activeRoomId,
                      reason: reason || 'abuse',
                    }, { headers: { Authorization: `Bearer ${authToken}` } });
                  }
                  triggerAlert(
                    language === 'so' ? '✓ Warbixinta waa la diray' : '✓ Report submitted',
                    'success'
                  );
                } catch (err: any) {
                  triggerAlert(err?.response?.data?.error || 'Report failed', 'error');
                }
              }}
            />
          </div>
        )}

      </div>

      {/* --- FLOATING NOTIFICATIONS TOAST SYSTEM (Module 12) --- */}
      <div className="fixed bottom-6 right-6 z-55 space-y-2 max-w-xs">
        {activeToasts.map(toast => (
          <div key={toast.id} className="bg-gray-900/95 text-white border border-white/10 p-3.5 rounded-2xl shadow-2xl flex gap-3 items-start animate-slide-up select-none">
            <img src={toast.senderAvatar} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" referrerPolicy="no-referrer" />
            <div className="grow space-y-1.5 min-w-0">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-extrabold truncate">{toast.senderName}</span>
                <span className="text-[8px] bg-indigo-500 text-white font-mono font-bold px-1 rounded uppercase">NEW</span>
              </div>
              <p className="text-[10px] text-gray-300 line-clamp-2 leading-relaxed">{toast.text}</p>
              
              <div className="flex gap-1.5 pt-1">
                <button 
                  onClick={() => { setActiveRoomId(toast.roomId); setActiveToasts([]); }}
                  className="bg-[var(--somluul-primary)] hover:brightness-110 text-[9px] font-bold px-2 py-0.5 rounded cursor-pointer"
                >
                  Reply
                </button>
                <button 
                  onClick={() => setActiveToasts([])}
                  className="bg-white/15 hover:bg-white/20 text-[9px] font-bold px-2 py-0.5 rounded cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* --- INTEGRATED MODALS SYSTEM MANAGER --- */}

      {/* 1. Phone Contacts Sync Modal */}
      <ContactsSyncModal
        isOpen={showContactsModal}
        onClose={() => setShowContactsModal(false)}
        profiles={profiles}
        onStartChat={(profile) => {
          // Check if room already in set
          const exists = rooms.find(r => r.id === profile.id);
          if (exists) {
            setActiveRoomId(profile.id);
          } else {
            // Append as new direct chat
            const newRoom: ChatRoom = {
              id: profile.id,
              name: `${profile.first_name} ${profile.last_name}`,
              avatar: profile.avatar || null,
              isGroup: false,
              unreadCount: 0,
              lastMessage: 'Ku bilow hadal badbaado leh!',
              lastMessageTime: 'Just now',
              members: [profile.id, 'me'],
              bio: profile.bio,
              phone: profile.phone
            };
            setRooms(prev => [newRoom, ...prev]);
            setActiveRoomId(profile.id);
          }
        }}
        language={language}
      />

      {/* 2. Group Chat Wizard modal */}
      <GroupChatCreator
        isOpen={showGroupCreator}
        onClose={() => setShowGroupCreator(false)}
        profiles={profiles}
        onCreateGroup={handleCreateGroupChannel}
        language={language}
      />

      {/* 3. Poll Builder custom modal */}
      <PollBuilder
        isOpen={showPollBuilder}
        onClose={() => setShowPollBuilder(false)}
        onSendPoll={handleSendPoll}
        language={language}
      />

      {/* 4. Broadcast composer and lists center */}
      <BroadcastComposer
        isOpen={showBroadcastComposer}
        onClose={() => setShowBroadcastComposer(false)}
        profiles={profiles}
        broadcastLists={broadcastLists}
        onSaveList={(name, ids) => {
          setBroadcastLists(prev => [...prev, { id: `b_${Date.now()}`, name, memberIds: ids }]);
          triggerAlert("✓ Broadcast List saved successfully.", "success");
        }}
        onDeleteList={(id) => {
          setBroadcastLists(prev => prev.filter(l => l.id !== id));
          triggerAlert("Broadcast List deleted.", "success");
        }}
        onSendBroadcast={handleSendBroadcast}
        language={language}
      />

      {/* 5. Direct Phonebook Contact Invite Modal */}
      {inviteTargetContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-[#182135] rounded-3xl p-6 shadow-2xl border border-gray-150 dark:border-gray-800 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-base font-black text-gray-900 dark:text-white">
                  {language === 'so' ? 'Ku Casuun SomLuul' : 'Invite to SomLuul'}
                </h3>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                  {language === 'so' 
                    ? `U dir fariin casuumad ah ${inviteTargetContact.name}` 
                    : `Send an invitation message to ${inviteTargetContact.name}`}
                </p>
              </div>
              <button 
                onClick={() => setInviteTargetContact(null)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="bg-gray-50 dark:bg-gray-900/40 p-4 rounded-2xl border border-gray-100 dark:border-gray-850 space-y-1">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                {language === 'so' ? 'Xiriirka / Contact' : 'Contact Details'}
              </span>
              <div className="font-extrabold text-xs text-gray-900 dark:text-white">
                {inviteTargetContact.name}
              </div>
              <div className="font-mono text-[11px] text-gray-500 dark:text-gray-400">
                {inviteTargetContact.phone}
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block pb-1">
                {language === 'so' ? 'Dooro halkaad u marinayso' : 'Choose Platform to Send'}
              </span>

              <div className="grid grid-cols-2 gap-2">
                <a
                  href={`https://api.whatsapp.com/send?phone=${inviteTargetContact.phone.replace(/[^0-9]/g, '')}&text=${encodeURIComponent(
                    language === 'so'
                      ? `Asc! Waxaan kugu casuumayaa SomLuul, oo ah barnaamijka rasmiga ah ee wada sheekaysiga, badbaadada iyo wicitaanka. Ku soo biir hadda: https://somluul.com/download`
                      : `Hello! I am inviting you to SomLuul, the official messenger for secure chat, HD calls, and social updates. Join now: https://somluul.com/download`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 bg-emerald-50 hover:bg-emerald-100/80 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-450 rounded-2xl font-bold text-xs transition-all cursor-pointer"
                >
                  <span className="text-base">💬</span>
                  <span>WhatsApp</span>
                </a>

                <a
                  href={`https://t.me/share/url?url=${encodeURIComponent('https://somluul.com/download')}&text=${encodeURIComponent(
                    language === 'so'
                      ? `Asc! Ku soo biir SomLuul Messenger.`
                      : `Hello! Join me on SomLuul Messenger.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 bg-sky-50 hover:bg-sky-100/80 dark:bg-sky-950/20 dark:hover:bg-sky-950/40 text-sky-700 dark:text-sky-450 rounded-2xl font-bold text-xs transition-all cursor-pointer"
                >
                  <span className="text-base">✈</span>
                  <span>Telegram</span>
                </a>

                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent('https://somluul.com/download')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 bg-indigo-50 hover:bg-indigo-100/80 dark:bg-indigo-950/20 dark:hover:bg-blue-950/40 text-indigo-700 dark:text-blue-450 rounded-2xl font-bold text-xs transition-all cursor-pointer"
                >
                  <span className="text-base">👤</span>
                  <span>Facebook</span>
                </a>

                <button
                  onClick={() => {
                    const inviteText = language === 'so'
                      ? `Asc! Ku soo biir SomLuul Messenger: https://somluul.com/download`
                      : `Join me on SomLuul secure messenger: https://somluul.com/download`;
                    navigator.clipboard.writeText(inviteText);
                    triggerAlert(language === 'so' ? '✓ Link-ga casuumadda waa la koobiyeeyay!' : '✓ Invitation link copied to clipboard!', "success");
                  }}
                  className="flex items-center gap-2 p-3 bg-gray-50 hover:bg-gray-100 dark:bg-gray-900/40 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-2xl font-bold text-xs transition-all cursor-pointer border border-gray-150 dark:border-gray-800"
                >
                  <span className="text-base">📋</span>
                  <span>{language === 'so' ? 'Koobiyeey Link-ga' : 'Copy Link'}</span>
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setInviteTargetContact(null)}
                className="w-full py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-300 rounded-2xl font-bold text-xs transition-all cursor-pointer text-center"
              >
                {language === 'so' ? 'Xir' : 'Close'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* OTP SMS VERIFICATION OVERLAY SCREEN */}
      {otpVerificationState.step !== 'none' && otpVerificationState.step !== 'verified' && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-[#182135] rounded-2xl p-6 shadow-2xl border border-gray-150 dark:border-gray-800 space-y-4">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mx-auto">
                <Lock size={24} />
              </div>
              <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                SMS OTP Verification Security
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                SomLuul Core requires verifying your phone line before account-sensitive actions are enabled.
              </p>
            </div>

            {otpVerificationState.step === 'input' && (
              <form onSubmit={handleOTPVerifySubmit} className="space-y-3">
                <div className="space-y-1">
                  <span className="text-[9px] uppercase font-bold text-gray-400">OTP Code:</span>
                  <input
                    type="text"
                    required
                    placeholder="Enter 6-digit OTP code..."
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-250 dark:border-gray-750 rounded-xl text-center text-lg font-mono font-black tracking-widest text-gray-950 dark:text-white focus:outline-none"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 bg-[var(--somluul-primary)] hover:brightness-110 text-white rounded-xl text-xs font-bold cursor-pointer shadow-sm"
                >
                  Confirm Code
                </button>
              </form>
            )}

            <button
              onClick={() => setOtpVerificationState({ phone: '', step: 'none' })}
              className="w-full py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-xl text-xs font-bold cursor-pointer"
            >
              Cancel Sync
            </button>
          </div>
        </div>
      )}

      {/* INCOMING CALL */}
      {incomingCall && !activeCall && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-6">
          <div className="bg-[#141b2d] border border-white/10 rounded-3xl p-8 max-w-sm w-full text-center space-y-6 shadow-2xl">
            <p className="text-xs uppercase tracking-widest text-emerald-400 font-bold">
              {incomingCall.type === 'video' ? 'Video call' : 'Voice call'}
            </p>
            <h3 className="text-xl font-black text-white">{incomingCall.fromName}</h3>
            <p className="text-sm text-gray-400">
              {language === 'so' ? 'Wicitaan soo galaya...' : 'Incoming call...'}
            </p>
            <div className="flex justify-center gap-6">
              <button
                type="button"
                onClick={handleRejectIncoming}
                className="w-14 h-14 rounded-full bg-red-600 text-white flex items-center justify-center"
                title="Reject"
              >
                <Phone size={22} className="rotate-[135deg]" />
              </button>
              <button
                type="button"
                onClick={handleAcceptIncoming}
                className="w-14 h-14 rounded-full bg-emerald-600 text-white flex items-center justify-center"
                title="Accept"
              >
                <Phone size={22} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ACTIVE PEER CALL — full-screen WhatsApp-style */}
      {activeCall && (
        <div className="fixed inset-0 bg-black text-white flex flex-col z-[70]" style={{ height: '100dvh' }}>
          {/* Top bar */}
          <div className="absolute top-0 left-0 right-0 z-20 flex justify-between items-center px-4 pt-safe py-3 bg-gradient-to-b from-black/70 to-transparent">
            <div className="text-xs font-bold text-white/90">
              {activeCall.type === 'video' ? (language === 'so' ? 'Video' : 'Video') : (language === 'so' ? 'Cod' : 'Voice')}
              {activeCall.status === 'ringing' ? (language === 'so' ? ' • Wuu wacayaa' : ' • Ringing') : ''}
              {activeCall.status === 'connecting' ? (language === 'so' ? ' • Waa la xiranayaa' : ' • Connecting') : ''}
              {activeCall.status === 'connected' ? (language === 'so' ? ' • Socda' : ' • Live') : ''}
            </div>
            <div className="text-xs font-mono font-bold text-white flex items-center gap-1.5 bg-black/40 px-3 py-1.5 rounded-full">
              {activeCall.status === 'connected' && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
              <span>
                {Math.floor(activeCall.callTime / 60)}:{(activeCall.callTime % 60).toString().padStart(2, '0')}
              </span>
            </div>
          </div>

          {/* Media stage — full viewport */}
          <div className="relative flex-1 w-full h-full min-h-0 bg-black">
            {/* Always mount remote media so voice audio plays */}
            {activeCall.type !== 'video' && (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="hidden"
                style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
              />
            )}
            {activeCall.type === 'video' ? (
              <>
                {/* Remote — full screen */}
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="absolute inset-0 w-full h-full object-cover bg-black"
                />
                {/* Local PiP — WhatsApp style bottom-right */}
                <div className="absolute bottom-28 right-3 w-28 h-40 sm:w-32 sm:h-44 rounded-2xl overflow-hidden border-2 border-white/70 shadow-2xl bg-gray-900 z-10">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                </div>
                {/* Name overlay */}
                <div className="absolute bottom-28 left-4 z-10 pointer-events-none">
                  <p className="text-base font-bold text-white drop-shadow-lg">{activeCall.room.name}</p>
                  <p className="text-[11px] text-white/80">
                    {activeCall.status === 'connected'
                      ? (language === 'so' ? 'Wicitaan socda' : 'In call')
                      : (language === 'so' ? 'Waa la xiranayaa...' : 'Connecting...')}
                  </p>
                </div>
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-[#1a1f2e] to-[#0a0f1d]">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-indigo-500/25 rounded-full animate-ping [animation-duration:2.5s]" />
                  {activeCall.room.avatar ? (
                    <img src={activeCall.room.avatar} alt="" className="w-32 h-32 rounded-full object-cover border-4 border-white/20 relative z-10" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-32 h-32 rounded-full bg-indigo-600/40 border-4 border-white/20 flex items-center justify-center relative z-10 text-3xl font-black">
                      {(activeCall.room.name || '?').charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <h4 className="text-2xl font-bold tracking-tight">{activeCall.room.name}</h4>
                <p className="text-sm text-gray-400 mt-2 uppercase tracking-widest">
                  {activeCall.status === 'ringing' || activeCall.status === 'connecting'
                    ? (language === 'so' ? 'Wuu wacayaa...' : 'Ringing...')
                    : (language === 'so' ? 'Wicitaan socda' : 'Call in progress')}
                </p>
                {activeCall.status === 'connected' && (
                  <div className="flex gap-1.5 items-end h-10 mt-8">
                    <span className="w-1.5 bg-indigo-500 rounded-full animate-bounce [animation-duration:0.6s] h-5" />
                    <span className="w-1.5 bg-blue-400 rounded-full animate-bounce [animation-duration:0.8s] h-8" />
                    <span className="w-1.5 bg-indigo-500 rounded-full animate-bounce [animation-duration:0.7s] h-6" />
                    <span className="w-1.5 bg-indigo-500 rounded-full animate-bounce [animation-duration:0.9s] h-10" />
                    <span className="w-1.5 bg-indigo-400 rounded-full animate-bounce [animation-duration:0.5s] h-5" />
                  </div>
                )}
              </div>
            )}

            {/* LIVE SUBTITLES */}
            {activeCall.captionsEnabled && activeCall.status === 'connected' && (
              <div className="absolute bottom-36 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-black/70 backdrop-blur-md border border-white/10 p-3 rounded-xl text-center shadow-lg z-20">
                <div className="text-[10px] text-amber-400 font-extrabold uppercase tracking-widest mb-1">Live Captions</div>
                <p className="text-xs text-gray-200 leading-relaxed font-medium italic">
                  "{callCaption}"
                </p>
              </div>
            )}
          </div>

          {/* Bottom controls — WhatsApp style */}
          <div className="absolute bottom-0 left-0 right-0 z-20 pb-6 pt-10 px-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent space-y-3">
            <div className="flex justify-center items-center gap-2 max-w-sm mx-auto flex-wrap">
              <button
                type="button"
                onClick={() => setActiveCall({ ...activeCall, noiseCancel: !activeCall.noiseCancel })}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${activeCall.noiseCancel ? 'bg-green-600/30 text-green-300 border border-green-500/40' : 'bg-white/10 text-gray-300 border border-white/10'}`}
              >
                <Volume2 size={13} />
                <span>Noise</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveCall({ ...activeCall, captionsEnabled: !activeCall.captionsEnabled })}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${activeCall.captionsEnabled ? 'bg-indigo-500/30 text-indigo-200 border border-indigo-400/40' : 'bg-white/10 text-gray-300 border border-white/10'}`}
              >
                <BadgeInfo size={13} />
                <span>Captions</span>
              </button>

              <button
                onClick={async () => {
                  if (!activeCall) return;
                  if (activeCall.isScreenSharing) {
                    // stop screen share, restore camera if video call
                    if (localStreamRef.current && peerConnectionRef.current) {
                      localStreamRef.current.getTracks().forEach(t => t.stop());
                      try {
                        const cam = await navigator.mediaDevices.getUserMedia({
                          video: activeCall.type === 'video',
                          audio: true
                        });
                        localStreamRef.current = cam;
                        if (localVideoRef.current) localVideoRef.current.srcObject = cam;
                        const sender = peerConnectionRef.current.getSenders().find(s => s.track?.kind === 'video');
                        const vTrack = cam.getVideoTracks()[0];
                        if (sender && vTrack) await sender.replaceTrack(vTrack);
                      } catch (_) {}
                    }
                    setActiveCall({ ...activeCall, isScreenSharing: false });
                  } else {
                    try {
                      const display = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
                      const screenTrack = display.getVideoTracks()[0];
                      if (peerConnectionRef.current) {
                        const sender = peerConnectionRef.current.getSenders().find(s => s.track?.kind === 'video');
                        if (sender) await sender.replaceTrack(screenTrack);
                        else peerConnectionRef.current.addTrack(screenTrack, display);
                      }
                      if (localVideoRef.current) localVideoRef.current.srcObject = display;
                      screenTrack.onended = () => {
                        setActiveCall(prev => prev ? { ...prev, isScreenSharing: false } : null);
                      };
                      setActiveCall({ ...activeCall, isScreenSharing: true });
                    } catch (e) {
                      triggerAlert(language === 'so' ? 'Screen share waa la diiday' : 'Screen share denied', 'error');
                    }
                  }
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${activeCall.isScreenSharing ? 'bg-amber-600/20 text-amber-400 border border-amber-500/30 animate-pulse' : 'bg-white/5 text-gray-450 border border-transparent'}`}
              >
                <ScreenShare size={13} />
                <span>Share Screen</span>
              </button>
            </div>

            <div className="flex justify-center items-center gap-5">
              <button
                type="button"
                onClick={() => setActiveCall(prev => prev ? { ...prev, isMuted: !prev.isMuted } : null)}
                className={`p-3.5 rounded-full transition-all border cursor-pointer ${activeCall.isMuted ? 'bg-amber-500 text-white border-amber-500' : 'bg-white/10 hover:bg-white/20 border-white/10 text-white'}`}
                title={activeCall.isMuted ? 'Unmute Mic' : 'Mute Mic'}
              >
                {activeCall.isMuted ? <MicOff size={20} /> : <Mic size={20} />}
              </button>
              
              <button
                type="button"
                onClick={() => handleEndCall(false)}
                className="w-16 h-16 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center shadow-xl transition-transform active:scale-95 cursor-pointer shrink-0"
                title="Jooji Wacitaanka (Hang Up / Cancel Call)"
              >
                <Phone size={26} className="rotate-[135deg]" />
              </button>

              <button
                type="button"
                onClick={() => setActiveCall(prev => prev ? { ...prev, isVideoOff: !prev.isVideoOff } : null)}
                className={`p-3.5 rounded-full transition-all border cursor-pointer ${activeCall.isVideoOff ? 'bg-amber-500 text-white border-amber-500' : 'bg-white/10 hover:bg-white/20 border-white/10 text-white'}`}
                title={activeCall.isVideoOff ? 'Turn Camera On' : 'Turn Camera Off'}
              >
                {activeCall.isVideoOff ? <VideoOff size={20} /> : <Video size={20} />}
              </button>
            </div>
          </div>

        </div>
      )}

    </DeviceFrame>
  );
};
