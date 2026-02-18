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

export interface ModerationResult {
  isApproved: boolean;
  confidence: number;
  reasons: string[];
  category: string[];
  requiresHumanReview: boolean;
  aiProvider: 'openai' | 'claude' | 'rule-based';
}

export interface ContentToModerate {
  text: string;
  imageUrls?: string[];
  context?: {
    channelRules?: string[];
    userHistory?: {
      previousViolations: number;
      accountAge: number;
      karmaScore: number;
    };
    reportCount?: number;
  };
}

const CONFIDENCE_THRESHOLD = Number(process.env.AI_MODERATION_CONFIDENCE_THRESHOLD) || 95;

export async function moderateContent(content: ContentToModerate): Promise<ModerationResult> {
  try {
    // Try OpenAI first
    return await moderateWithOpenAI(content);
  } catch (error) {
    console.error('OpenAI moderation failed:', error);
    
    // Fallback to Claude
    try {
      return await moderateWithClaude(content);
    } catch (claudeError) {
      console.error('Claude moderation failed:', claudeError);
      
      // Final fallback to rule-based
      return moderateWithRules(content);
    }
  }
}

async function moderateWithOpenAI(content: ContentToModerate): Promise<ModerationResult> {
  const prompt = buildModerationPrompt(content);
  
  const response = await getOpenAI().chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      {
        role: 'system',
        content: `You are a content moderator for a Korean Reddit-like platform. 
        Analyze content for policy violations including hate speech, harassment, 
        spam, NSFW content, and cultural context violations.
        Consider Korean language nuances and slang.
        Return a JSON object with: isApproved (boolean), confidence (0-100), 
        reasons (array), category (array of violation types).`
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1,
    max_tokens: 500
  });

  const result = JSON.parse(response.choices[0].message.content || '{}');
  
  return {
    isApproved: result.isApproved ?? true,
    confidence: result.confidence ?? 50,
    reasons: result.reasons ?? [],
    category: result.category ?? [],
    requiresHumanReview: result.confidence < CONFIDENCE_THRESHOLD,
    aiProvider: 'openai'
  };
}

async function moderateWithClaude(content: ContentToModerate): Promise<ModerationResult> {
  const prompt = buildModerationPrompt(content);
  
  const response = await getAnthropic().messages.create({
    model: 'claude-3-opus-20240229',
    max_tokens: 500,
    temperature: 0.1,
    messages: [
      {
        role: 'user',
        content: `You are a content moderator for a Korean Reddit-like platform. 
        Analyze this content and return a JSON object with: 
        isApproved (boolean), confidence (0-100), reasons (array), 
        category (array of violation types).
        
        Content to moderate: ${prompt}`
      }
    ]
  });

  const textContent = response.content[0].type === 'text' 
    ? response.content[0].text 
    : '';
  
  const result = JSON.parse(textContent);
  
  return {
    isApproved: result.isApproved ?? true,
    confidence: result.confidence ?? 50,
    reasons: result.reasons ?? [],
    category: result.category ?? [],
    requiresHumanReview: result.confidence < CONFIDENCE_THRESHOLD,
    aiProvider: 'claude'
  };
}

function moderateWithRules(content: ContentToModerate): ModerationResult {
  const violations: string[] = [];
  const categories: string[] = [];
  
  // Basic rule-based checks
  const text = content.text.toLowerCase();
  
  // Check for explicit keywords (Korean and English)
  const explicitKeywords = [
    // Add Korean profanity and inappropriate terms
    '씨발', '개새끼', '병신', '지랄',
    // English terms
    'fuck', 'shit', 'damn'
  ];
  
  const spamPatterns = [
    /http[s]?:\/\/[^\s]+/gi, // URLs
    /\d{3,4}-\d{3,4}-\d{4}/g, // Phone numbers
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g // Emails
  ];
  
  // Check for explicit content
  for (const keyword of explicitKeywords) {
    if (text.includes(keyword)) {
      violations.push(`Contains inappropriate language: ${keyword}`);
      categories.push('profanity');
      break;
    }
  }
  
  // Check for spam patterns
  const urlMatches = text.match(spamPatterns[0]);
  if (urlMatches && urlMatches.length > 3) {
    violations.push('Excessive URLs detected');
    categories.push('spam');
  }
  
  // Check for personal information
  if (spamPatterns[1].test(text) || spamPatterns[2].test(text)) {
    violations.push('Personal information detected');
    categories.push('privacy');
  }
  
  // Check content length
  if (text.length < 10) {
    violations.push('Content too short');
    categories.push('low_quality');
  }
  
  const isApproved = violations.length === 0;
  const confidence = isApproved ? 80 : 90; // Lower confidence for rule-based
  
  return {
    isApproved,
    confidence,
    reasons: violations,
    category: categories,
    requiresHumanReview: true, // Always require review for rule-based
    aiProvider: 'rule-based'
  };
}

function buildModerationPrompt(content: ContentToModerate): string {
  let prompt = `Content to moderate: "${content.text}"`;
  
  if (content.context?.channelRules && content.context.channelRules.length > 0) {
    prompt += `\n\nChannel rules: ${content.context.channelRules.join(', ')}`;
  }
  
  if (content.context?.reportCount) {
    prompt += `\n\nThis content has been reported ${content.context.reportCount} times.`;
  }
  
  if (content.imageUrls && content.imageUrls.length > 0) {
    prompt += `\n\nImages attached: ${content.imageUrls.length} images`;
  }
  
  return prompt;
}

export async function analyzeImage(imageUrl: string): Promise<ModerationResult> {
  try {
    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-4-vision-preview',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Analyze this image for inappropriate content, NSFW material, violence, or policy violations. Return JSON with: isApproved, confidence, reasons, category.'
            },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl
              }
            }
          ]
        }
      ],
      max_tokens: 300
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    return {
      isApproved: result.isApproved ?? true,
      confidence: result.confidence ?? 50,
      reasons: result.reasons ?? [],
      category: result.category ?? [],
      requiresHumanReview: result.confidence < CONFIDENCE_THRESHOLD,
      aiProvider: 'openai'
    };
  } catch (error) {
    console.error('Image analysis failed:', error);
    return {
      isApproved: false,
      confidence: 0,
      reasons: ['Image analysis failed'],
      category: ['error'],
      requiresHumanReview: true,
      aiProvider: 'rule-based'
    };
  }
}