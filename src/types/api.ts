// API Request/Response Types - API 요청/응답 전용 타입들

import { ModerationSettings, PolicyRule } from './master';

// Common API Types
export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// Master System API Types
export interface CreatePolicyRequest {
  channelId: string;
  policyType: string;
  rules: PolicyRule[];
  enabled?: boolean;
}

export interface UpdateModerationSettingsRequest {
  channelId: string;
  settings: Partial<ModerationSettings>;
}

export interface ModerationActionRequest {
  queueItemId: string;
  action: 'approve' | 'reject' | 'escalate';
  reason?: string;
  additionalActions?: Array<{
    type: 'ban_user' | 'remove_similar' | 'update_policy';
    parameters: Record<string, unknown>;
  }>;
}

export interface MasterAnalyticsQuery {
  channelId: string;
  period: '24h' | '7d' | '30d' | 'custom';
  startDate?: Date;
  endDate?: Date;
  metrics?: string[];
  groupBy?: 'hour' | 'day' | 'week';
}

// AI API Types
export interface ContentToModerate {
  id: string;
  type: 'post' | 'comment';
  content: string;
  authorId: string;
  channelId: string;
  metadata?: {
    userKarma?: number;
    accountAge?: number;
    previousViolations?: number;
  };
}

export interface ModerationResult {
  status: 'approved' | 'flagged' | 'removed';
  confidence: number;
  reasons: string[];
  suggestedActions: string[];
  requiresHumanReview: boolean;
  categories: {
    spam: number;
    hate: number;
    violence: number;
    sexual: number;
    harassment: number;
  };
}

export interface TrendingTopic {
  topic: string;
  score: number;
  postsCount: number;
  engagementRate: number;
}

export interface ViralPrediction {
  postId: string;
  viralScore: number;
  predictedReach: number;
  confidence: number;
}

// Auth Types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  ageVerified: boolean;
}

export interface AuthResponse {
  user: {
    id: string;
    username: string;
    email: string;
  };
  session: {
    accessToken: string;
    refreshToken: string;
    expiresAt: string;
  };
}

// Content API Types
export interface CreatePostRequest {
  title: string;
  content?: string;
  channelId: string;
  flair?: string;
  images?: string[];
}

export interface CreateCommentRequest {
  content: string;
  postId: string;
  parentId?: string;
}

export interface VoteRequest {
  targetId: string;
  targetType: 'post' | 'comment';
  voteType: 'upvote' | 'downvote';
}

// Search & Filter Types
export interface SearchQuery {
  q: string;
  type?: 'posts' | 'comments' | 'users' | 'channels';
  channelId?: string;
  authorId?: string;
  sortBy?: 'relevance' | 'date' | 'score';
  timeRange?: '24h' | '7d' | '30d' | 'year' | 'all';
  page?: number;
  limit?: number;
}

export interface FilterOptions {
  channelIds?: string[];
  authorIds?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  minScore?: number;
  maxScore?: number;
  hasImages?: boolean;
  isNsfw?: boolean;
  flair?: string[];
}