// AI System Types - AI 관련 전용 타입들

import { BaseEntity } from './database';

export interface AutoModLog extends BaseEntity {
  contentId: string;
  contentType: 'post' | 'comment' | 'user';
  action: 'approved' | 'flagged' | 'removed';
  aiModel: string;
  confidence: number;
  reason?: string;
  humanReviewed: boolean;
  reviewedBy?: string;
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
  metadata?: {
    processingTime: number;
    modelVersion: string;
    features: Record<string, number>;
  };
}

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
    links?: string[];
    images?: string[];
  };
}

export interface TrendingTopic {
  topic: string;
  score: number;
  postsCount: number;
  engagementRate: number;
  growth: number;
  category?: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
}

export interface ViralPrediction {
  postId: string;
  viralScore: number;
  predictedReach: number;
  confidence: number;
  factors: {
    contentQuality: number;
    authorCredibility: number;
    timing: number;
    topicPopularity: number;
    engagement: number;
  };
  estimatedPeakTime?: Date;
}

export interface AIContentGeneration {
  type: 'post' | 'comment' | 'title' | 'summary';
  prompt: string;
  context?: {
    channelId: string;
    tone: 'formal' | 'casual' | 'humorous' | 'informative';
    length: 'short' | 'medium' | 'long';
    language: 'korean' | 'english';
  };
  constraints?: {
    maxLength: number;
    minLength: number;
    keywords: string[];
    avoidWords: string[];
  };
}

export interface AIContentSuggestion {
  id: string;
  type: 'trending_topic' | 'viral_prediction' | 'engagement_boost';
  title: string;
  description: string;
  confidence: number;
  potentialReach: number;
  suggestedContent: {
    title?: string;
    body?: string;
    tags?: string[];
  };
  bestPostingTime?: Date;
  targetAudience?: {
    demographics: string[];
    interests: string[];
  };
}

export interface SentimentAnalysis {
  score: number; // -1 to 1
  label: 'positive' | 'neutral' | 'negative';
  confidence: number;
  emotions?: {
    joy: number;
    anger: number;
    fear: number;
    sadness: number;
    surprise: number;
    disgust: number;
  };
}

export interface LanguageDetection {
  language: string;
  confidence: number;
  alternatives?: Array<{
    language: string;
    confidence: number;
  }>;
}

export interface TextAnalysis {
  sentiment: SentimentAnalysis;
  language: LanguageDetection;
  toxicity: {
    score: number;
    categories: {
      severe_toxicity: number;
      obscene: number;
      threat: number;
      insult: number;
      identity_attack: number;
    };
  };
  readability: {
    score: number;
    level: 'elementary' | 'middle' | 'high' | 'college';
  };
}

export interface AIModelConfig {
  name: string;
  version: string;
  type: 'moderation' | 'generation' | 'analysis' | 'prediction';
  provider: 'openai' | 'anthropic' | 'custom';
  settings: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
  };
  fallbackModel?: string;
  enabled: boolean;
}