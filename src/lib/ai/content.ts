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

export interface GeneratedContent {
  title?: string;
  content: string;
  tags?: string[];
  summary?: string;
}

export interface ContentGenerationOptions {
  type: 'post' | 'comment' | 'reply' | 'summary';
  context?: string;
  tone?: 'formal' | 'casual' | 'humorous' | 'informative';
  language?: 'ko' | 'en' | 'mixed';
  maxLength?: number;
  channelTheme?: string;
}

export async function generateContent(
  prompt: string,
  options: ContentGenerationOptions
): Promise<GeneratedContent> {
  const systemPrompt = buildSystemPrompt(options);
  
  try {
    if (options.type === 'summary' || prompt.length > 2000) {
      // Use Claude for complex analysis and summaries
      return await generateWithClaude(prompt, systemPrompt, options);
    } else {
      // Use GPT-4 for general content generation
      return await generateWithOpenAI(prompt, systemPrompt, options);
    }
  } catch (error) {
    console.error('Content generation failed:', error);
    throw new Error('Failed to generate content');
  }
}

async function generateWithOpenAI(
  prompt: string,
  systemPrompt: string,
  options: ContentGenerationOptions
): Promise<GeneratedContent> {
  const response = await getOpenAI().chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ],
    temperature: options.tone === 'humorous' ? 0.8 : 0.6,
    max_tokens: options.maxLength || 1000,
    response_format: options.type === 'post' ? { type: 'json_object' } : undefined
  });

  const content = response.choices[0].message.content || '';
  
  if (options.type === 'post') {
    try {
      return JSON.parse(content);
    } catch {
      return { content };
    }
  }
  
  return { content };
}

async function generateWithClaude(
  prompt: string,
  systemPrompt: string,
  options: ContentGenerationOptions
): Promise<GeneratedContent> {
  const response = await getAnthropic().messages.create({
    model: 'claude-3-opus-20240229',
    max_tokens: options.maxLength || 1500,
    temperature: 0.5,
    system: systemPrompt,
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
  
  if (options.type === 'post' || options.type === 'summary') {
    try {
      return JSON.parse(textContent);
    } catch {
      return { content: textContent };
    }
  }
  
  return { content: textContent };
}

function buildSystemPrompt(options: ContentGenerationOptions): string {
  const language = options.language === 'ko' ? 'Korean' : 
                  options.language === 'en' ? 'English' : 
                  'Korean with some English mixed in';
  
  const toneMap = {
    formal: 'professional and respectful',
    casual: 'friendly and conversational',
    humorous: 'witty and entertaining',
    informative: 'educational and clear'
  };
  
  const tone = toneMap[options.tone || 'casual'];
  
  let basePrompt = `You are a helpful AI assistant for a Korean Reddit-like community platform. 
    Generate content in ${language} with a ${tone} tone.`;
  
  if (options.channelTheme) {
    basePrompt += ` The content should be relevant to the "${options.channelTheme}" community theme.`;
  }
  
  switch (options.type) {
    case 'post':
      basePrompt += ` Generate a complete post with a title, content body, and relevant tags. 
        Return as JSON with fields: title, content, tags (array of strings).`;
      break;
    case 'comment':
      basePrompt += ` Generate a thoughtful comment that adds value to the discussion.`;
      break;
    case 'reply':
      basePrompt += ` Generate a relevant reply to the given comment or post.`;
      break;
    case 'summary':
      basePrompt += ` Generate a concise summary of the content, highlighting key points.
        If possible, return as JSON with fields: summary, keyPoints (array), sentiment.`;
      break;
  }
  
  if (options.maxLength) {
    basePrompt += ` Keep the response under ${options.maxLength} characters.`;
  }
  
  return basePrompt;
}

export async function suggestTags(content: string, channelTheme?: string): Promise<string[]> {
  const prompt = `Analyze this content and suggest 3-5 relevant tags in Korean:
    Content: "${content}"
    ${channelTheme ? `Community theme: ${channelTheme}` : ''}
    
    Return only a JSON array of tag strings.`;
  
  try {
    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 100
    });

    const tags = JSON.parse(response.choices[0].message.content || '[]');
    return Array.isArray(tags) ? tags : [];
  } catch (error) {
    console.error('Tag suggestion failed:', error);
    return [];
  }
}

export async function improveContent(
  content: string,
  improvements: string[]
): Promise<string> {
  const improvementList = improvements.join(', ');
  const prompt = `Improve this content based on the following suggestions: ${improvementList}
    
    Original content: "${content}"
    
    Return only the improved content without explanations.`;
  
  try {
    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'user', content: prompt }
      ],
      temperature: 0.5,
      max_tokens: 1000
    });

    return response.choices[0].message.content || content;
  } catch (error) {
    console.error('Content improvement failed:', error);
    return content;
  }
}