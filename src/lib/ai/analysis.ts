import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

let _openai: OpenAI | null = null;
function getOpenAI() {
  if (!_openai) {
    _openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || 'dummy-key-for-build',
    });
  }
  return _openai;
}

let _anthropic: Anthropic | null = null;
function getAnthropic() {
  if (!_anthropic) {
    _anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || 'dummy-key-for-build',
    });
  }
  return _anthropic;
}

export interface TrendAnalysis {
  trendingTopics: Array<{
    topic: string;
    score: number;
    posts: number;
    growth: number;
  }>;
  sentiment: {
    positive: number;
    neutral: number;
    negative: number;
  };
  engagement: {
    averageComments: number;
    averageUpvotes: number;
    activeUsers: number;
  };
  recommendations: string[];
}

export interface UserBehaviorAnalysis {
  activityPattern: {
    mostActiveHours: number[];
    mostActiveDays: string[];
    avgSessionLength: number;
  };
  contentPreferences: {
    topCategories: string[];
    preferredContentLength: 'short' | 'medium' | 'long';
    engagementStyle: 'lurker' | 'commenter' | 'poster' | 'all-around';
  };
  riskFactors: {
    spamLikelihood: number;
    toxicityRisk: number;
    banRisk: number;
  };
}

export interface ContentAnalytics {
  performance: {
    views: number;
    engagement: number;
    shareability: number;
    virality: number;
  };
  audience: {
    demographics: Record<string, number>;
    interests: string[];
    sentimentTowards: 'positive' | 'negative' | 'neutral';
  };
  optimization: {
    suggestedTags: string[];
    bestPostTime: string;
    improvementAreas: string[];
  };
}

export async function analyzeTrends(
  posts: Array<{
    title: string;
    content: string;
    tags: string[];
    score: number;
    commentCount: number;
    createdAt: string;
  }>,
  timeframe: '24h' | '7d' | '30d' = '24h'
): Promise<TrendAnalysis> {
  if (posts.length === 0) {
    return {
      trendingTopics: [],
      sentiment: { positive: 0, neutral: 0, negative: 0 },
      engagement: { averageComments: 0, averageUpvotes: 0, activeUsers: 0 },
      recommendations: ['More content needed for analysis']
    };
  }

  const prompt = `Analyze these ${posts.length} posts from the last ${timeframe} and identify trends:

${posts.map((post, i) => 
  `Post ${i + 1}: "${post.title}" (Score: ${post.score}, Comments: ${post.commentCount})
  Content: ${post.content.substring(0, 200)}...
  Tags: ${post.tags.join(', ')}`
).join('\n\n')}

Return a JSON object with:
- trendingTopics: array of {topic, score (0-100), posts, growth}  
- sentiment: {positive, neutral, negative} percentages
- engagement: {averageComments, averageUpvotes, activeUsers}
- recommendations: array of actionable insights`;

  try {
    const response = await getAnthropic().messages.create({
      model: 'claude-3-opus-20240229',
      max_tokens: 2000,
      temperature: 0.3,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const textContent = response.content[0].type === 'text' 
      ? response.content[0].text 
      : '';
    
    return JSON.parse(textContent);
  } catch (error) {
    console.error('Trend analysis failed:', error);
    return generateFallbackTrendAnalysis(posts);
  }
}

interface UserPost {
  title: string;
  content: string;
  createdAt: string;
  score: number;
}

interface UserComment {
  content: string;
  createdAt: string;
  score: number;
}

interface UserVote {
  voteType: 'upvote' | 'downvote';
  createdAt: string;
}

export async function analyzeUserBehavior(
  userId: string,
  userPosts: UserPost[],
  userComments: UserComment[],
  userVotes: UserVote[]
): Promise<UserBehaviorAnalysis> {
  const prompt = `Analyze user behavior patterns:

Posts: ${userPosts.length}
Comments: ${userComments.length}  
Votes: ${userVotes.length}

Recent post titles: ${userPosts.slice(0, 5).map(p => p.title).join(', ')}
Recent comment samples: ${userComments.slice(0, 5).map(c => c.content.substring(0, 100)).join('; ')}

Return JSON with:
- activityPattern: {mostActiveHours, mostActiveDays, avgSessionLength}
- contentPreferences: {topCategories, preferredContentLength, engagementStyle}
- riskFactors: {spamLikelihood, toxicityRisk, banRisk} (0-100 scale)`;

  try {
    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 1000
    });

    return JSON.parse(response.choices[0].message.content || '{}');
  } catch (error) {
    console.error('User behavior analysis failed:', error);
    return generateFallbackUserAnalysis();
  }
}

export async function analyzeContent(
  content: string,
  metadata: {
    views?: number;
    comments?: number;
    votes?: number;
    shares?: number;
    demographics?: Record<string, number>;
  }
): Promise<ContentAnalytics> {
  const prompt = `Analyze this content and its performance:

Content: "${content}"
Views: ${metadata.views || 0}
Comments: ${metadata.comments || 0}
Votes: ${metadata.votes || 0}
Shares: ${metadata.shares || 0}

Return JSON analysis with:
- performance: {views, engagement, shareability, virality} scores (0-100)
- audience: {demographics, interests, sentimentTowards}
- optimization: {suggestedTags, bestPostTime, improvementAreas}`;

  try {
    const response = await getAnthropic().messages.create({
      model: 'claude-3-opus-20240229',
      max_tokens: 1500,
      temperature: 0.3,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const textContent = response.content[0].type === 'text' 
      ? response.content[0].text 
      : '';
    
    return JSON.parse(textContent);
  } catch (error) {
    console.error('Content analysis failed:', error);
    return generateFallbackContentAnalysis();
  }
}

export async function predictEngagement(
  content: string,
  channelMetrics: {
    averageScore: number;
    averageComments: number;
    topPerformingTags: string[];
  }
): Promise<{
  predictedScore: number;
  predictedComments: number;
  confidence: number;
  factors: string[];
}> {
  const prompt = `Predict engagement for this content:

Content: "${content}"
Channel average score: ${channelMetrics.averageScore}
Channel average comments: ${channelMetrics.averageComments}
Top performing tags: ${channelMetrics.topPerformingTags.join(', ')}

Return JSON with:
- predictedScore: estimated upvotes
- predictedComments: estimated comment count
- confidence: prediction confidence (0-100)
- factors: key factors affecting prediction`;

  try {
    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 500
    });

    return JSON.parse(response.choices[0].message.content || '{}');
  } catch (error) {
    console.error('Engagement prediction failed:', error);
    return {
      predictedScore: channelMetrics.averageScore,
      predictedComments: channelMetrics.averageComments,
      confidence: 30,
      factors: ['Prediction service unavailable']
    };
  }
}

function generateFallbackTrendAnalysis(posts: Array<{
  title: string;
  content: string;
  tags: string[];
  score: number;
  commentCount: number;
  createdAt: string;
}>): TrendAnalysis {
  const totalPosts = posts.length;
  const totalComments = posts.reduce((sum, p) => sum + p.commentCount, 0);
  const totalUpvotes = posts.reduce((sum, p) => sum + p.score, 0);
  
  return {
    trendingTopics: [
      { topic: 'General Discussion', score: 70, posts: totalPosts, growth: 5 }
    ],
    sentiment: { positive: 60, neutral: 30, negative: 10 },
    engagement: {
      averageComments: totalComments / totalPosts || 0,
      averageUpvotes: totalUpvotes / totalPosts || 0,
      activeUsers: Math.floor(totalPosts * 1.5)
    },
    recommendations: ['AI analysis temporarily unavailable - manual review recommended']
  };
}

function generateFallbackUserAnalysis(): UserBehaviorAnalysis {
  return {
    activityPattern: {
      mostActiveHours: [19, 20, 21],
      mostActiveDays: ['Saturday', 'Sunday'],
      avgSessionLength: 15
    },
    contentPreferences: {
      topCategories: ['general'],
      preferredContentLength: 'medium',
      engagementStyle: 'commenter'
    },
    riskFactors: {
      spamLikelihood: 20,
      toxicityRisk: 15,
      banRisk: 5
    }
  };
}

function generateFallbackContentAnalysis(): ContentAnalytics {
  return {
    performance: {
      views: 0,
      engagement: 50,
      shareability: 40,
      virality: 20
    },
    audience: {
      demographics: { 'general': 100 },
      interests: ['general'],
      sentimentTowards: 'neutral'
    },
    optimization: {
      suggestedTags: ['general'],
      bestPostTime: '19:00',
      improvementAreas: ['AI analysis unavailable']
    }
  };
}