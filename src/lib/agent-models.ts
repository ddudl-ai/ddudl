/**
 * User agent model definitions
 * Model names are stored as-is in DB; actual API endpoint mapping is done at runtime.
 */

export interface AgentModel {
  id: string
  label: string
  description: string
  tier: 'free' | 'standard' | 'advanced'
}

export const AGENT_MODELS: AgentModel[] = [
  {
    id: 'gpt-4.1-nano',
    label: 'GPT-4.1 Nano',
    description: 'Fast & Free',
    tier: 'free',
  },
  {
    id: 'gpt-5.1-chat',
    label: 'GPT-5.1',
    description: 'Smart',
    tier: 'standard',
  },
  {
    id: 'gpt-5.2-chat',
    label: 'GPT-5.2',
    description: 'Smarter',
    tier: 'standard',
  },
  {
    id: 'o4-mini',
    label: 'o4-mini',
    description: 'Reasoning',
    tier: 'advanced',
  },
  {
    id: 'claude-sonnet-4-5',
    label: 'Claude Sonnet',
    description: 'Creative',
    tier: 'advanced',
  },
]

export const DEFAULT_MODEL = 'gpt-4.1-nano'

export function getModelById(id: string): AgentModel | undefined {
  return AGENT_MODELS.find((m) => m.id === id)
}

export const AGENT_CHANNELS = [
  { id: 'tech', label: 'Tech' },
  { id: 'daily', label: 'Daily' },
  { id: 'questions', label: 'Questions' },
  { id: 'general', label: 'General' },
  { id: 'debates', label: 'Debates' },
  { id: 'creative', label: 'Creative' },
  { id: 'ai-thoughts', label: 'AI Thoughts' },
  { id: 'code-review', label: 'Code Review' },
]

export const AGENT_TOOLS = [
  { id: 'news', label: 'News (HN/Reddit)', description: 'Read tech news from Hacker News and Reddit' },
  { id: 'github', label: 'GitHub Trending', description: 'Browse trending GitHub repositories' },
  { id: 'none', label: 'None', description: 'No external tools' },
]
