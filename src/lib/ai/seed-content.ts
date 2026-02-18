import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

let _openai: OpenAI | null = null;
function getOpenAI() {
  if (!_openai) {
    _openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || 'dummy-key-for-build',
    });
  }
  return _openai;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://example.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy-key-for-build'
);

export interface SeedPost {
  title: string;
  content: string;
  channelName: string;
  tags: string[];
  flair?: string;
  isNSFW: boolean;
  source?: string;
  confidence: number;
}

export interface TrendingNews {
  title: string;
  summary: string;
  category: string;
  url?: string;
  publishedAt: Date;
  relevanceScore: number;
}

export interface ChannelTheme {
  name: string;
  displayName: string;
  description: string;
  keywords: string[];
  contentStyle: 'informative' | 'casual' | 'humorous' | 'debate';
  targetAudience: string;
}

/**
 * Generate daily seed posts based on trending news and channel themes
 */
export async function generateDailySeedPosts(
  targetCount: number = 10,
  channelFilter?: string[]
): Promise<SeedPost[]> {
  try {
    // Get trending news from multiple sources
    const trendingNews = await fetchTrendingNews();
    
    // Get active channels
    const channels = await getActiveChannels(channelFilter);
    
    // Generate seed posts for each channel
    const seedPosts: SeedPost[] = [];
    
    for (const channel of channels) {
      const relevantNews = filterNewsForChannel(trendingNews, channel);
      
      if (relevantNews.length > 0) {
        const postsForChannel = await generatePostsForChannel(
          channel,
          relevantNews,
          Math.ceil(targetCount / channels.length)
        );
        seedPosts.push(...postsForChannel);
      }
    }
    
    // Sort by confidence and return top posts
    return seedPosts
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, targetCount);
      
  } catch (error) {
    console.error('Failed to generate daily seed posts:', error);
    return [];
  }
}

/**
 * Fetch trending news from various sources
 */
async function fetchTrendingNews(): Promise<TrendingNews[]> {
  // In a real implementation, this would fetch from news APIs
  // For now, we'll use AI to generate trending topics
  
  const prompt = `Generate 15 trending news topics for today in Korea. 
  Include a mix of:
  - Technology and IT news
  - Entertainment and K-pop
  - Sports (especially Korean teams)
  - Politics and social issues
  - Gaming and esports
  - Lifestyle and culture
  - International news relevant to Korea
  
  Return JSON array with: title, summary, category, relevanceScore (0-100)`;

  try {
    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are a Korean news analyst. Generate realistic trending topics for today.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 2000
    });

    const result = JSON.parse(response.choices[0].message.content || '{"news": []}');
    
    return (result.news || []).map((item: { title: string; summary: string; category: string; relevanceScore?: number }) => ({
      title: item.title,
      summary: item.summary,
      category: item.category,
      publishedAt: new Date(),
      relevanceScore: item.relevanceScore || 50
    }));
    
  } catch (error) {
    console.error('Failed to fetch trending news:', error);
    return [];
  }
}

/**
 * Get active channels from database
 */
async function getActiveChannels(filter?: string[]): Promise<ChannelTheme[]> {
  try {
    let query = supabase
      .from('channels') // Keeping DB table name
      .select('name, display_name, description')
      .eq('is_nsfw', false);
    
    if (filter && filter.length > 0) {
      query = query.in('name', filter);
    }
    
    const { data: channels, error } = await query;
    
    if (error) throw error;
    
    return (channels || []).map((sub: any) => ({
      name: sub.name,
      displayName: sub.display_name,
      description: sub.description || '',
      keywords: extractKeywordsFromDescription(sub.description || ''),
      contentStyle: determineContentStyle(sub.name),
      targetAudience: determineTargetAudience(sub.name)
    }));
    
  } catch (error) {
    console.error('Failed to get channels:', error);
    return getDefaultChannels();
  }
}

/**
 * Filter news items relevant to a specific channel
 */
function filterNewsForChannel(
  news: TrendingNews[],
  channel: ChannelTheme
): TrendingNews[] {
  return news.filter(item => {
    const relevantCategories = getCategoriesForChannel(channel.name);
    const hasRelevantCategory = relevantCategories.includes(item.category.toLowerCase());
    
    const hasRelevantKeywords = channel.keywords.some(keyword =>
      item.title.toLowerCase().includes(keyword.toLowerCase()) ||
      item.summary.toLowerCase().includes(keyword.toLowerCase())
    );
    
    return hasRelevantCategory || hasRelevantKeywords;
  }).sort((a, b) => b.relevanceScore - a.relevanceScore);
}

/**
 * Generate posts for a specific channel based on relevant news
 */
async function generatePostsForChannel(
  channel: ChannelTheme,
  relevantNews: TrendingNews[],
  maxPosts: number
): Promise<SeedPost[]> {
  const posts: SeedPost[] = [];
  
  for (let i = 0; i < Math.min(relevantNews.length, maxPosts); i++) {
    const newsItem = relevantNews[i];
    
    try {
      const post = await generateSinglePost(channel, newsItem);
      if (post) {
        posts.push(post);
      }
    } catch (error) {
      console.error(`Failed to generate post for ${channel.name}:`, error);
    }
  }
  
  return posts;
}

/**
 * Generate a single post based on news item and channel theme
 */
async function generateSinglePost(
  channel: ChannelTheme,
  newsItem: TrendingNews
): Promise<SeedPost | null> {
  const prompt = `Create an engaging Reddit-style post for the Korean channel "c/${channel.name}" (${channel.displayName}).

News item: "${newsItem.title}"
Summary: "${newsItem.summary}"
Category: ${newsItem.category}

Channel info:
- Theme: ${channel.description}
- Style: ${channel.contentStyle}
- Target audience: ${channel.targetAudience}

Requirements:
- Write in Korean
- Create an engaging title (max 300 chars)
- Write substantial content (300-800 chars) that encourages discussion
- Match the channel's tone and style
- Include relevant context for Korean users
- End with a question to encourage comments

Return JSON with: title, content, tags (array), flair, confidence (0-100)`;

  try {
    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are a Korean community manager creating engaging posts for a Reddit-like platform.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 1000
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    if (!result.title || !result.content) {
      return null;
    }
    
    return {
      title: result.title,
      content: result.content,
      channelName: channel.name,
      tags: result.tags || [],
      flair: result.flair,
      isNSFW: false,
      source: newsItem.url,
      confidence: result.confidence || 70
    };
    
  } catch (error) {
    console.error('Failed to generate single post:', error);
    return null;
  }
}

/**
 * Publish seed posts to database
 */
export async function publishSeedPosts(
  seedPosts: SeedPost[],
  authorId?: string
): Promise<{ success: number; failed: number; errors: string[] }> {
  let success = 0;
  let failed = 0;
  const errors: string[] = [];
  
  // Get or create AI bot user
  const botUser = await getOrCreateAIBotUser();
  const actualAuthorId = authorId || botUser.id;
  
  for (const post of seedPosts) {
    try {
      // Get channel ID
      const { data: channel } = await supabase
        .from('channels') // Keeping table name
        .select('id')
        .eq('name', post.channelName)
        .single();
      
      if (!channel) {
        errors.push(`Channel not found: ${post.channelName}`);
        failed++;
        continue;
      }
      
      // Insert post
      const { error: postError } = await supabase
        .from('posts')
        .insert({
          title: post.title,
          content: post.content,
          author_id: actualAuthorId,
          channel_id: channel.id, // Column name is channel_id
          flair: post.flair,
          moderation_status: 'approved', // AI-generated content is pre-approved
          ai_generated: true
        });
      
      if (postError) {
        errors.push(`Failed to insert post: ${postError.message}`);
        failed++;
      } else {
        success++;
      }
      
    } catch (error) {
      errors.push(`Unexpected error: ${error}`);
      failed++;
    }
  }
  
  return { success, failed, errors };
}

/**
 * Get or create AI bot user for posting
 */
async function getOrCreateAIBotUser() {
  const { data: existingBot } = await supabase
    .from('users')
    .select('id')
    .eq('username', 'ai-bot')
    .single();
  
  if (existingBot) {
    return existingBot;
  }
  
  // Create AI bot user
  const { data: newBot, error } = await supabase
    .from('users')
    .insert({
      username: 'ai-bot',
      email_hash: 'ai-bot-hash',
      karma_points: 1000
    })
    .select('id')
    .single();
  
  if (error) {
    throw new Error(`Failed to create AI bot user: ${error.message}`);
  }
  
  return newBot;
}

/**
 * Validate seed post quality before publishing
 */
export async function validateSeedPost(post: SeedPost): Promise<{
  isValid: boolean;
  issues: string[];
  suggestions: string[];
}> {
  const issues: string[] = [];
  const suggestions: string[] = [];
  
  // Basic validation
  if (post.title.length < 10) {
    issues.push('Title too short');
  }
  
  if (post.title.length > 300) {
    issues.push('Title too long');
  }
  
  if (post.content.length < 50) {
    issues.push('Content too short');
  }
  
  if (post.confidence < 60) {
    issues.push('Low confidence score');
    suggestions.push('Consider regenerating with different parameters');
  }
  
  // Check for engagement potential
  if (!post.content.includes('?') && !post.content.includes('어떻게') && !post.content.includes('생각')) {
    suggestions.push('Add questions to encourage discussion');
  }
  
  return {
    isValid: issues.length === 0,
    issues,
    suggestions
  };
}

// Helper functions
function extractKeywordsFromDescription(description: string): string[] {
  // Simple keyword extraction - in production, use more sophisticated NLP
  const commonWords = ['에', '의', '을', '를', '이', '가', '은', '는', '과', '와', '에서', '으로', '로'];
  return description
    .split(/\s+/)
    .filter(word => word.length > 1 && !commonWords.includes(word))
    .slice(0, 5);
}

function determineContentStyle(channelName: string): 'informative' | 'casual' | 'humorous' | 'debate' {
  const styleMap: Record<string, 'informative' | 'casual' | 'humorous' | 'debate'> = {
    'news': 'informative',
    'tech': 'informative',
    'gaming': 'casual',
    'entertainment': 'humorous',
    'sports': 'debate',
    'general': 'casual'
  };
  
  return styleMap[channelName] || 'casual';
}

function determineTargetAudience(channelName: string): string {
  const audienceMap: Record<string, string> = {
    'tech': '기술에 관심있는 user',
    'gaming': '게임을 즐기는 user',
    'news': '시사에 관심있는 user',
    'entertainment': '엔터테인먼트를 즐기는 user',
    'sports': '스포츠 팬',
    'general': '일반 user'
  };
  
  return audienceMap[channelName] || '일반 user';
}

function getCategoriesForChannel(channelName: string): string[] {
  const categoryMap: Record<string, string[]> = {
    'tech': ['technology', 'it', 'science'],
    'gaming': ['gaming', 'esports', 'entertainment'],
    'news': ['politics', 'social', 'international'],
    'entertainment': ['entertainment', 'culture', 'celebrity'],
    'sports': ['sports', 'olympics', 'football'],
    'general': ['general', 'lifestyle', 'culture']
  };
  
  return categoryMap[channelName] || ['general'];
}

function getDefaultChannels(): ChannelTheme[] {
  return [
    {
      name: 'general',
      displayName: '일반',
      description: '일반적인 주제에 대한 토론',
      keywords: ['일반', '토론', '이야기'],
      contentStyle: 'casual',
      targetAudience: '일반 user'
    },
    {
      name: 'tech',
      displayName: '기술',
      description: '기술과 IT 관련 토론',
      keywords: ['기술', 'IT', '개발', '프로그래밍'],
      contentStyle: 'informative',
      targetAudience: '기술에 관심있는 user'
    },
    {
      name: 'gaming',
      displayName: '게임',
      description: '게임 관련 토론과 정보',
      keywords: ['게임', '게이밍', 'e스포츠'],
      contentStyle: 'casual',
      targetAudience: '게임을 즐기는 user'
    }
  ];
}