// Central Type Exports - 중앙 타입 내보내기
// 모든 타입을 여기서 한번에 내보내서 import 경로를 단순화

// Database Types
export type {
  BaseEntity,
  User,
  Channel,
  ChannelRule,
  Post,
  PostImage,
  Comment,
  Vote,
  Report,
  Profile,
  Database,
} from './database';

// Master System Types
export type {
  ChannelMaster,
  MasterPermissions,
  ChannelPolicy,
  PolicyRule,
  ModerationSettings,
  ModerationQueueItem,
  MasterAction,
  MasterNotification,
  PolicyConflict,
  MasterDashboardStats,
} from './master';

// API Types
export type {
  ApiResponse,
  PaginatedResponse,
  ApiError,
  CreatePolicyRequest,
  UpdateModerationSettingsRequest,
  ModerationActionRequest,
  MasterAnalyticsQuery,
  ContentToModerate,
  ModerationResult,
  TrendingTopic,
  ViralPrediction,
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  CreatePostRequest,
  CreateCommentRequest,
  VoteRequest,
  SearchQuery,
  FilterOptions,
} from './api';

// AI Types
export type {
  AutoModLog,
  AIContentGeneration,
  AIContentSuggestion,
  SentimentAnalysis,
  LanguageDetection,
  TextAnalysis,
  AIModelConfig,
} from './ai';

// Component Props Types
export interface ComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface LoadingState {
  loading: boolean;
  error?: string | null;
}

export interface PaginationProps {
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
}

// Utility Types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type Required<T, K extends keyof T> = T & RequiredPick<T, K>;
type RequiredPick<T, K extends keyof T> = { [P in K]-?: T[P] };

// Status Types
export type Status = 'idle' | 'loading' | 'success' | 'error';
export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type Period = '24h' | '7d' | '30d';

// Korean Language Support
export type Language = 'ko' | 'en';
export type Locale = 'ko-KR' | 'en-US';

// Theme Types
export type Theme = 'light' | 'dark' | 'system';
export type ColorScheme = 'blue' | 'green' | 'red' | 'purple' | 'orange';

// Form Types


export interface ChannelRequest {
  id: string
  user_id: string
  name: string
  name_en: string
  description: string
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  reviewed_at?: string
  reviewed_by?: string
  rejection_reason?: string
}

export interface FormField<T = string> {
  value: T;
  error?: string;
  touched: boolean;
  required?: boolean;
}

export interface FormState<T extends Record<string, unknown>> {
  fields: { [K in keyof T]: FormField<T[K]> };
  isValid: boolean;
  isSubmitting: boolean;
  errors: string[];
}