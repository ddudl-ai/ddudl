// Database Entity Types
// 데이터베이스 엔티티 기본 타입들

export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface User extends BaseEntity {
  username: string;
  emailHash: string;
  phoneHash?: string;
  karmaPoints: number;
  isBanned: boolean;
  profileImageUrl?: string;
  ageVerified: boolean;
  preferences: Record<string, unknown>;
  // Moderation related
  banReason?: string;
  bannedUntil?: Date;
}

export interface Channel extends BaseEntity {
  name: string;
  displayName: string;
  description?: string;
  masterId?: string;
  memberCount: number;
  isNsfw: boolean;
  moderationSettings: Record<string, unknown>;
  rules: ChannelRule[];
}

export interface ChannelRule {
  id: string;
  title: string;
  description: string;
  order: number;
  isActive: boolean;
}

export interface Post extends BaseEntity {
  title: string;
  content?: string;
  authorId: string;
  channelId: string;
  upvotes: number;
  downvotes: number;
  commentCount: number;
  isDeleted: boolean;
  flair?: string;
  moderationStatus: 'pending' | 'approved' | 'flagged' | 'removed';
  aiGenerated: boolean;
  allowGuestComments: boolean;
  authorName?: string;
  guestPassword?: string;
  
  // Relations
  author?: User;
  channel?: Channel;
  images?: PostImage[];
}

export interface PostImage extends BaseEntity {
  postId: string;
  imageUrl: string;
  thumbnailUrl?: string;
  altText?: string;
  orderIndex: number;
}

export interface Comment extends BaseEntity {
  content: string;
  authorId: string;
  postId: string;
  parentId?: string;
  upvotes: number;
  downvotes: number;
  isDeleted: boolean;
  aiGenerated: boolean;
  authorName?: string;
  guestPassword?: string;
  
  // Relations
  author?: User;
  replies?: Comment[];
}

export interface Vote extends BaseEntity {
  userId: string;
  postId?: string;
  commentId?: string;
  voteType: 'upvote' | 'downvote';
}

export interface Report extends BaseEntity {
  reporterId: string;
  reportedContentId: string;
  contentType: 'post' | 'comment' | 'user';
  reason: string;
  description?: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  resolvedAt?: Date;
  resolvedBy?: string;
}

export interface Profile extends BaseEntity {
  userId: string;
  username: string;
  karmaScore: number;
  isBanned: boolean;
  banReason?: string;
  bannedUntil?: Date;
}

// Supabase specific types
export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: Omit<User, 'id' | 'createdAt' | 'updatedAt'>;
        Update: Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>;
      };
      channels: {
        Row: Channel;
        Insert: Omit<Channel, 'id' | 'createdAt' | 'updatedAt'>;
        Update: Partial<Omit<Channel, 'id' | 'createdAt' | 'updatedAt'>>;
      };
      posts: {
        Row: Post;
        Insert: Omit<Post, 'id' | 'createdAt' | 'updatedAt'>;
        Update: Partial<Omit<Post, 'id' | 'createdAt' | 'updatedAt'>>;
      };
      comments: {
        Row: Comment;
        Insert: Omit<Comment, 'id' | 'createdAt' | 'updatedAt'>;
        Update: Partial<Omit<Comment, 'id' | 'createdAt' | 'updatedAt'>>;
      };
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'id' | 'createdAt' | 'updatedAt'>;
        Update: Partial<Omit<Profile, 'id' | 'createdAt' | 'updatedAt'>>;
      };
    };
  };
}