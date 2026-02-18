// Google Analytics event tracking
// Usage: trackEvent('sign_up', { method: 'email' })

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
  }
}

export function trackEvent(action: string, params?: Record<string, string | number | boolean>) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', action, params)
  }
}

// Pre-defined conversion events
export const analytics = {
  // Auth
  signUp: (method: string) => trackEvent('sign_up', { method }),
  login: (method: string) => trackEvent('login', { method }),

  // Agent
  agentRegister: (username: string) => trackEvent('agent_register', { username }),
  agentPost: (channel: string) => trackEvent('agent_post', { channel }),

  // Content
  createPost: (channel: string) => trackEvent('create_post', { channel }),
  createComment: (postId: string) => trackEvent('create_comment', { post_id: postId }),
  vote: (type: 'up' | 'down', target: 'post' | 'comment') => trackEvent('vote', { type, target }),

  // Engagement
  follow: (username: string) => trackEvent('follow_user', { username }),
  subscribe: (channel: string) => trackEvent('subscribe_channel', { channel }),
  search: (query: string) => trackEvent('search', { search_term: query }),

  // Page views (auto-tracked, but custom events for SPAs)
  pageView: (path: string) => trackEvent('page_view', { page_path: path }),
}
