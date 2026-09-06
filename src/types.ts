export type UserRole = 'normal' | 'admin' | 'moderator';

export interface Profile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  avatar: string | null;
  role: UserRole;
  blocked: boolean;
  created_at: string;
  updated_at: string;
  bio?: string;
  phone?: string;
  country?: string;
  city?: string;
  website?: string;
  gender?: string;
  dob?: string;
  work?: string;
  followersCount?: number;
  followingCount?: number;
  following?: string[];
  followers?: string[];
  cover_photo?: string | null;
  friends?: string[];
  friendRequests?: string[];
  username?: string;
  is_username_custom?: boolean;
  login_method?: 'email' | 'phone' | 'google' | 'facebook' | 'apple';
  last_login?: string;
  email_verified?: boolean;
  verification_code?: string;
  verification_code_expires?: string;
  phone_verified?: boolean;
  phone_otp_code?: string;
  phone_otp_expires?: string;
  devices?: { id: string; name: string; ip: string; last_active: string; location: string }[];
  language?: string;
}

export interface FileMetadata {
  id: string;
  user_id: string;
  filename: string;
  original_name: string;
  file_size: number;
  mime_type: string;
  storage_path: string;
  public_url: string;
  created_at: string;
}

export interface AuthSession {
  user: Profile;
  token: string;
  deviceId?: string;
}

export interface UserStats {
  totalFiles: number;
  totalSize: number;
  imagesCount: number;
  documentsCount: number;
  videosCount: number;
  recentUploads: FileMetadata[];
}

export interface AdminStats {
  totalUsers: number;
  blockedUsers: number;
  totalFiles: number;
  totalSize: number;
  recentUsers: Profile[];
  recentUploads: FileMetadata[];
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// SOCIAL PLATFORM SCHEMAS

export interface Post {
  id: string;
  authorId?: string;
  author: {
    id?: string;
    name: string;
    avatar: string;
    handle: string;
    verified?: boolean;
  };
  content: string;
  mediaType: 'text' | 'image' | 'video' | 'audio' | 'article' | 'poll';
  mediaUrl?: string;
  mediaList?: { type: 'image' | 'video' | 'audio'; url: string }[];
  pollOptions?: { option: string; votes: number }[];
  likes: number;
  likedBy?: string[];
  lovedBy?: string[];
  reactions?: Record<string, string[]>;
  reactionCounts?: Record<string, number>;
  myReaction?: 'like' | 'love' | 'haha' | 'wow' | 'sad' | 'angry' | null;
  isLiked?: boolean;
  isLoved?: boolean;
  isSaved?: boolean;
  isPinned?: boolean;
  pinned_at?: string | null;
  comments: Comment[];
  shares: number;
  created_at: string;
  isSponsored?: boolean;
}

export interface Comment {
  id: string;
  authorId?: string;
  authorName: string;
  authorAvatar: string | null;
  content: string;
  created_at: string;
}

export interface Story {
  id: string;
  authorName: string;
  authorAvatar: string;
  mediaUrl: string;
  mediaType?: string;
  isUnread: boolean;
  created_at?: string;
  userId?: string;
}

export interface ChatRoom {
  id: string;
  name: string;
  avatar: string;
  isGroup: boolean;
  isSecret?: boolean;
  isChannel?: boolean;
  unreadCount: number;
  lastMessage?: string;
  lastMessageTime?: string;
  members: string[];
  bio?: string;
  phone?: string;
  followersCount?: number;
  followingCount?: number;
  isFollowing?: boolean;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  content: string;
  text?: string;
  body?: string;
  type: 'text' | 'image' | 'video' | 'file' | 'voice' | 'location';
  mediaUrl?: string;
  media_url?: string;
  mediaType?: string;
  media_type?: string;
  created_at: string;
  reaction?: string;
  isSelfDestruct?: boolean;
  selfDestructSeconds?: number;
}

export interface MarketplaceItem {
  id: string;
  title: string;
  price: string;
  category: 'electronics' | 'property' | 'vehicles' | 'fashion' | 'others';
  imageUrl: string;
  location: string;
  sellerId?: string;
  sellerName: string;
  sellerAvatar: string | null;
  description: string;
  reviews: { reviewer: string; stars: number; comment: string }[];
  created_at: string;
}

export interface AdCampaign {
  id: string;
  title: string;
  bannerUrl: string;
  destinationUrl: string;
  budget: number;
  country: string;
  language: string;
  impressions: number;
  clicks: number;
  conversions: number;
  status: 'active' | 'paused' | 'scheduled';
}

export interface CreatorWallet {
  balance: number;
  views: number;
  followers: number;
  watchMinutes: number;
  earningsThisMonth: number;
  platformCut: number;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  user_email: string;
  action: 'upload' | 'download' | 'preview' | 'delete' | 'profile_update' | 'follow' | 'block' | 'unblock';
  details: string;
  created_at: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  type: 'follow' | 'message' | 'like' | 'comment' | 'system' | 'friend_request';
  title: string;
  body: string;
  senderId?: string;
  senderName?: string;
  senderAvatar?: string | null;
  read: boolean;
  created_at: string;
}
