import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { analyzeTrends } from './analysis';

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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://example.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy-key-for-build'
);

export interface TrendingTopic {
  topic: string;
  keywords: string[];
  score: number;
  postCount: number;
  growthRate: number;
  category: string;
  suggestedChannelName: string;
  description: string;
  confidence: number;
}

export interface ChannelSuggestion {
  name: string;
  displayName: string;
  description: string;
  category: string;
  keywords: string[];
  estimatedInterest: number;
  reasoning: string;
  rules: string[];
  isNSFW: boolean;
}

export interface CrossPostSuggestion {
  postId: string;
  originalChannel: string;
  suggestedChannels: Array<{
    name: string;
    relevanceScore: number;
    reasoning: string;
  }>;
}

/**
 * Analyze real-time trends from recent posts and comments
 */
export async function analyzeRealTimeTrends(
  timeframe: '1h' | '6h' | '24h' | '7d' = '24h'
): Promise<TrendingTopic[]> {
  
  try {
    // Get recent posts based on timeframe
    const hoursBack = timeframe === '1h' ? 1 : 
                     timeframe === '6h' ? 6 : 
                     timeframe === '24h' ? 24 : 168;
    
    const since = new Date();
    since.setHours(since.getHours() - hoursBack);
    
    const { data: posts, error } = await supabase
      .from('posts')
      .select(`
        id,
        title,
        content,
        upvotes,
        downvotes,
        comment_count,
        created_at,
        flair,
        channels!inner(name, display_name)
      `)
      .eq('is_deleted', false)
      .eq('moderation_status', 'approved')
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: false })
      .limit(200);
    
    if (error) {
      throw error;
    }
    
    if (!posts || posts.length === 0) {
      return [];
    }
    
    // Analyze trends using AI
    const mappedTimeframe = timeframe === '1h' || timeframe === '6h' ? '24h' : timeframe;
    const trendAnalysis = await analyzeTrends(
      posts.map((post: any) => ({
        title: post.title,
        content: post.content || '',
        tags: post.flair ? [post.flair] : [],
        score: post.upvotes - post.downvotes,
        commentCount: post.comment_count,
        createdAt: post.created_at
      })),
      mappedTimeframe
    );
    
    // Convert trend analysis to trending topics
    const trendingTopics: TrendingTopic[] = [];
    
    for (const trend of trendAnalysis.trendingTopics) {
      const topic = await enrichTrendingTopic(trend, posts);
      if (topic) {
        trendingTopics.push(topic);
      }
    }
    
    return trendingTopics.sort((a, b) => b.score - a.score);
    
  } catch (error) {
    console.error('Failed to analyze real-time trends:', error);
    return [];
  }
}

/**
 * Enrich trending topic with AI analysis
 */
async function enrichTrendingTopic(
  trend: { topic: string; score: number; posts: number; growth: number },
  posts: Array<{ title: string; content?: string; created_at: string; upvotes: number }>
): Promise<TrendingTopic | null> {
  
  const relatedPosts = posts.filter(post => 
    post.title.toLowerCase().includes(trend.topic.toLowerCase()) ||
    (post.content || '').toLowerCase().includes(trend.topic.toLowerCase())
  );
  
  const prompt = `Analyze this trending topic and suggest a channel:

Topic: "${trend.topic}"
Score: ${trend.score}
Related Posts: ${relatedPosts.length}
Growth Rate: ${trend.growth}%

Sample post titles:
${relatedPosts.slice(0, 5).map(p => `- ${p.title}`).join('\n')}

Requirements:
- Suggest a Korean channel name (format: k/name)
- Provide Korean display name and description
- Extract relevant keywords
- Categorize the topic
- Assess confidence (0-100)

Return JSON with: keywords (array), category, suggestedChannelName, description, confidence`;

  try {
    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are a Korean community analyst specializing in identifying trending topics and suggesting channels.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.4,
      max_tokens: 600
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    if (!result.suggestedChannelName || result.confidence < 60) {
      return null;
    }
    
    return {
      topic: trend.topic,
      keywords: result.keywords || [],
      score: trend.score,
      postCount: trend.posts,
      growthRate: trend.growth,
      category: result.category || 'general',
      suggestedChannelName: result.suggestedChannelName.replace('k/', ''),
      description: result.description || '',
      confidence: result.confidence || 60
    };
    
  } catch (error) {
    console.error('Failed to enrich trending topic:', error);
    return null;
  }
}

/**
 * Generate channel suggestions based on trending topics
 */
export async function generateChannelSuggestions(
  trendingTopics: TrendingTopic[],
  existingChannels: string[] = []
): Promise<ChannelSuggestion[]> {
  
  const suggestions: ChannelSuggestion[] = [];
  
  for (const topic of trendingTopics) {
    // Skip if channel already exists
    if (existingChannels.includes(topic.suggestedChannelName)) {
      continue;
    }
    
    // Only suggest if confidence is high and there's significant interest
    if (topic.confidence < 70 || topic.postCount < 3) {
      continue;
    }
    
    const suggestion = await createChannelSuggestion(topic);
    if (suggestion) {
      suggestions.push(suggestion);
    }
  }
  
  return suggestions.sort((a, b) => b.estimatedInterest - a.estimatedInterest);
}

/**
 * Create detailed channel suggestion
 */
async function createChannelSuggestion(
  topic: TrendingTopic
): Promise<ChannelSuggestion | null> {
  
  const prompt = `Create a detailed channel proposal for this trending topic:

Topic: "${topic.topic}"
Category: ${topic.category}
Keywords: ${topic.keywords.join(', ')}
Post Count: ${topic.postCount}
Growth Rate: ${topic.growthRate}%

Create a comprehensive channel proposal:
- Korean display name and description
- Community rules (3-5 rules in Korean)
- Estimate interest level (0-100)
- Determine if NSFW content is likely
- Provide reasoning for creation

Return JSON with: displayName, description, rules (array), estimatedInterest, isNSFW, reasoning`;

  try {
    const response = await getAnthropic().messages.create({
      model: 'claude-3-opus-20240229',
      max_tokens: 1000,
      temperature: 0.5,
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
    
    const result = JSON.parse(textContent);
    
    if (!result.displayName || !result.description) {
      return null;
    }
    
    return {
      name: topic.suggestedChannelName,
      displayName: result.displayName,
      description: result.description,
      category: topic.category,
      keywords: topic.keywords,
      estimatedInterest: result.estimatedInterest || 50,
      reasoning: result.reasoning || '',
      rules: result.rules || [],
      isNSFW: result.isNSFW || false
    };
    
  } catch (error) {
    console.error('Failed to create channel suggestion:', error);
    return null;
  }
}

/**
 * Automatically create channels based on high-confidence suggestions
 */
export async function autoCreateChannels(
  suggestions: ChannelSuggestion[],
  minInterestThreshold: number = 80
): Promise<{ created: number; failed: number; errors: string[] }> {
  
  const results = {
    created: 0,
    failed: 0,
    errors: [] as string[]
  };
  
  // Get AI bot user to be the initial master
  const botUser = await getOrCreateAIBotUser();
  
  for (const suggestion of suggestions) {
    // Only auto-create high-interest, non-NSFW channels
    if (suggestion.estimatedInterest < minInterestThreshold || suggestion.isNSFW) {
      continue;
    }
    
    try {
      // Check if channel name is available
      const { data: existing } = await supabase
        .from('channels')
        .select('id')
        .eq('name', suggestion.name)
        .single();
      
      if (existing) {
        results.errors.push(`Channel k/${suggestion.name} already exists`);
        results.failed++;
        continue;
      }
      
      // Create channel
      const { error } = await supabase
        .from('channels')
        .insert({
          name: suggestion.name,
          display_name: suggestion.displayName,
          description: suggestion.description,
          master_id: botUser.id,
          is_nsfw: suggestion.isNSFW,
          rules: suggestion.rules
        });
      
      if (error) {
        results.errors.push(`Failed to create k/${suggestion.name}: ${error.message}`);
        results.failed++;
      } else {
        results.created++;
      }
      
    } catch (error) {
      results.errors.push(`Error creating k/${suggestion.name}: ${error}`);
      results.failed++;
    }
  }
  
  return results;
}

/**
 * Suggest cross-posts for existing posts
 */
export async function suggestCrossPosts(
  postId: string,
  postTitle: string,
  postContent: string,
  currentChannel: string,
  limit: number = 3
): Promise<CrossPostSuggestion | null> {
  
  try {
    // Get all available channels
    const { data: channels, error } = await supabase
      .from('channels')
      .select('name, display_name, description')
      .neq('name', currentChannel)
      .eq('is_nsfw', false);
    
    if (error || !channels || channels.length === 0) {
      return null;
    }
    
    const prompt = `Analyze this post and suggest relevant channels for cross-posting:

Post Title: "${postTitle}"
Post Content: "${postContent}"
Current Channel: k/${currentChannel}

Available Channels:
${channels.map((ch: any) => `- k/${ch.name} (${ch.display_name}): ${ch.description}`).join('\n')}

Requirements:
- Suggest up to ${limit} most relevant channels
- Provide relevance score (0-100) for each
- Explain reasoning for each suggestion
- Only suggest if relevance score > 60

Return JSON with: suggestions array containing {name, relevanceScore, reasoning}`;

    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are a Korean community expert who understands channel themes and cross-posting relevance.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 800
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    if (!result.suggestions || !Array.isArray(result.suggestions)) {
      return null;
    }
    
    const validSuggestions = result.suggestions
      .filter((s: { relevanceScore: number }) => s.relevanceScore > 60)
      .sort((a: { relevanceScore: number }, b: { relevanceScore: number }) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit);
    
    if (validSuggestions.length === 0) {
      return null;
    }
    
    return {
      postId,
      originalChannel: currentChannel,
      suggestedChannels: validSuggestions
    };
    
  } catch (error) {
    console.error('Failed to suggest cross-posts:', error);
    return null;
  }
}

/**
 * Get existing channel names
 */
export async function getExistingChannels(): Promise<string[]> {
  try {
    const { data: channels, error } = await supabase
      .from('channels')
      .select('name');
    
    if (error) {
      throw error;
    }
    
    return (channels || []).map((ch: any) => ch.name);
    
  } catch (error) {
    console.error('Failed to get existing channels:', error);
    return [];
  }
}

/**
 * Run complete trend analysis and channel management
 */
export async function runTrendAnalysisTask(): Promise<{
  trendsAnalyzed: number;
  channelsCreated: number;
  crossPostsSuggested: number;
  errors: string[];
}> {
  
  const results = {
    trendsAnalyzed: 0,
    channelsCreated: 0,
    crossPostsSuggested: 0,
    errors: [] as string[]
  };
  
  try {
    // Analyze trends
    const trendingTopics = await analyzeRealTimeTrends('24h');
    results.trendsAnalyzed = trendingTopics.length;
    
    if (trendingTopics.length === 0) {
      return results;
    }
    
    // Generate channel suggestions
    const existingChannels = await getExistingChannels();
    const suggestions = await generateChannelSuggestions(trendingTopics, existingChannels);
    
    // Auto-create high-confidence channels
    if (suggestions.length > 0) {
      const createResults = await autoCreateChannels(suggestions, 85);
      results.channelsCreated = createResults.created;
      results.errors.push(...createResults.errors);
    }
    
    // TODO: Implement cross-post suggestions for recent popular posts
    // This would require analyzing recent high-engagement posts
    
  } catch (error) {
    results.errors.push(`Trend analysis task failed: ${error}`);
  }
  
  return results;
}

/**
 * Get or create AI bot user
 */
async function getOrCreateAIBotUser() {
  const { data: existingBot } = await supabase
    .from('users')
    .select('id')
    .eq('username', 'ai-moderator')
    .single();
  
  if (existingBot) {
    return existingBot;
  }
  
  // Create AI moderator user
  const { data: newBot, error } = await supabase
    .from('users')
    .insert({
      username: 'ai-moderator',
      email_hash: 'ai-moderator-hash',
      karma_points: 1000
    })
    .select('id')
    .single();
  
  if (error) {
    throw new Error(`Failed to create AI moderator user: ${error.message}`);
  }
  
  return newBot;
}