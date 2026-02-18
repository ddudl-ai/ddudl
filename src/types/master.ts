// Master System Types - 마스터 시스템 전용 타입들
import { BaseEntity } from './database';

export interface ChannelMaster extends BaseEntity {
  userId: string;
  channelId: string;
  role: 'owner' | 'moderator' | 'assistant';
  permissions: MasterPermissions;
  isActive: boolean;
  lastActiveAt: Date;
}

export interface MasterPermissions {
  canEditPolicies: boolean;
  canBanUsers: boolean;
  canRemoveContent: boolean;
  canAddModerators: boolean;
  canViewAnalytics: boolean;
  canManageAutomod: boolean;
  canReviewAIDecisions: boolean;
}

export interface ChannelPolicy extends BaseEntity {
  channelId: string;
  masterId: string;
  policyType: 'profanity' | 'spam' | 'harassment' | 'nsfw' | 'custom';
  rules: PolicyRule[];
  enabled: boolean;
}

export interface PolicyRule {
  id: string;
  type: 'keyword' | 'regex' | 'ai_threshold' | 'user_criteria';
  condition: string;
  action: 'remove' | 'flag' | 'shadow_ban' | 'require_review';
  severity: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, unknown>;
}

export interface ModerationSettings extends BaseEntity {
  channelId: string;
  profanityLevel: 'strict' | 'moderate' | 'relaxed';
  spamProtection: {
    enabled: boolean;
    linkLimit: number;
    repetitionThreshold: number;
    newUserRestrictions: boolean;
  };
  bannedWords: string[];
  autoModEnabled: boolean;
  aiModerationEnabled: boolean;
  aiConfidenceThreshold: number;
  karmaRequirements: {
    minToPost: number;
    minToComment: number;
    bypassForVerified: boolean;
  };
  newUserRestrictions: {
    enabled: boolean;
    accountAgeInDays: number;
    requireEmailVerification: boolean;
  };
}

export interface ModerationQueueItem extends BaseEntity {
  channelId: string;
  targetType: 'post' | 'comment' | 'user';
  targetId: string;
  reason: string;
  reportedBy?: string;
  aiScore?: number;
  aiReasons?: string[];
  status: 'pending' | 'approved' | 'rejected' | 'escalated';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignedTo?: string;
  metadata: {
    content?: string;
    authorId?: string;
    authorKarma?: number;
    previousViolations?: number;
  };
  resolvedAt?: Date;
  resolvedBy?: string;
  resolution?: string;
}

export interface MasterAction extends BaseEntity {
  masterId: string;
  channelId: string;
  actionType: 'ban_user' | 'remove_content' | 'approve_content' | 'update_policy' | 'override_ai';
  targetId: string;
  reason: string;
  details?: Record<string, unknown>;
  reversible: boolean;
  reversedAt?: Date;
  reversedBy?: string;
}

export interface MasterNotification extends BaseEntity {
  masterId: string;
  type: 'queue_threshold' | 'policy_conflict' | 'ai_uncertainty' | 'user_report' | 'system_alert';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  actionRequired: boolean;
  actionUrl?: string;
  read: boolean;
  readAt?: Date;
}

export interface PolicyConflict extends BaseEntity {
  channelId: string;
  channelPolicy: PolicyRule;
  platformPolicy: PolicyRule;
  conflictType: 'contradiction' | 'overlap' | 'insufficient';
  severity: 'low' | 'medium' | 'high';
  resolution?: 'platform_override' | 'channel_exception' | 'manual_review';
  resolvedBy?: string;
  resolvedAt?: Date;
}

// Analytics & Dashboard Types
export interface MasterDashboardStats {
  channelId: string;
  period: '24h' | '7d' | '30d';
  overview: {
    totalPosts: number;
    totalComments: number;
    activeUsers: number;
    newUsers: number;
    growth: number;
  };
  moderation: {
    queueSize: number;
    itemsReviewed: number;
    aiDecisions: number;
    manualOverrides: number;
    falsePositives: number;
    accuracy: number;
  };
  content: {
    postsRemoved: number;
    commentsRemoved: number;
    usersBanned: number;
    reportsReceived: number;
    avgResponseTime: number;
  };
  trends: {
    topPosts: Array<{
      id: string;
      title: string;
      score: number;
      engagement: number;
    }>;
    violations: Array<{
      type: string;
      count: number;
      trend: 'increasing' | 'stable' | 'decreasing';
    }>;
  };
}