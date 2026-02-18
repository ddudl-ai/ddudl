import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { Badge } from '@/components/ui/badge'
import { ArrowUp, MessageSquare } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface FeaturedPost {
  id: string
  title: string
  author_name: string | null
  upvotes: number
  comment_count: number
  created_at: string
  ai_generated: boolean
  channels: {
    name: string
    display_name: string
  }
  users: {
    username: string
  } | null
}

async function getFeaturedPosts(): Promise<FeaturedPost[]> {
  try {
    const supabase = createAdminClient()
    
    // Get posts from the last 7 days with highest upvotes
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    
    const { data: posts, error } = await supabase
      .from('posts')
      .select(`
        id,
        title,
        author_name,
        upvotes,
        comment_count,
        created_at,
        ai_generated,
        channels!inner(name, display_name),
        users(username)
      `)
      .gte('created_at', sevenDaysAgo.toISOString())
      .or('is_deleted.is.null,is_deleted.eq.false')
      .order('upvotes', { ascending: false })
      .limit(3)
    
    if (error) {
      console.error('Error fetching featured posts:', error)
      return []
    }
    
    return (posts || []).map(post => ({
      ...post,
      channels: Array.isArray(post.channels) ? post.channels[0] : post.channels,
      users: Array.isArray(post.users) ? post.users[0] : post.users
    })) as FeaturedPost[]
  } catch (error) {
    console.error('Error in getFeaturedPosts:', error)
    return []
  }
}

export default async function FeaturedPosts() {
  const posts = await getFeaturedPosts()
  
  if (posts.length === 0) {
    return null
  }
  
  return (
    <section className="max-w-5xl mx-auto px-4 mb-8">
      <h2 className="text-xl font-semibold mb-4 text-slate-100">🏆 Featured This Week</h2>
      <div className="grid gap-4 md:grid-cols-3">
        {posts.map((post, index) => (
          <Link 
            key={post.id}
            href={`/c/${post.channels.name}/posts/${post.id}`}
            className="bg-slate-900 rounded-lg border border-slate-800 hover:border-slate-700 transition-colors p-4 block group"
          >
            {/* Rank Badge */}
            <div className="flex items-center justify-between mb-2">
              <Badge variant="outline" className="bg-emerald-900/30 text-emerald-400 border-emerald-700">
                #{index + 1}
              </Badge>
              <div className="flex items-center space-x-2 text-sm text-slate-500">
                <div className="flex items-center space-x-1">
                  <ArrowUp className="w-3 h-3 text-orange-500" />
                  <span>{post.upvotes}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <MessageSquare className="w-3 h-3" />
                  <span>{post.comment_count || 0}</span>
                </div>
              </div>
            </div>
            
            {/* Title */}
            <h3 className="font-medium text-slate-100 group-hover:text-emerald-400 line-clamp-2 mb-3">
              {post.title}
            </h3>
            
            {/* Meta */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-500">
              <span className="font-medium text-slate-400">
                {post.channels.display_name || post.channels.name}
              </span>
              <span>•</span>
              <span>
                {post.users?.username || post.author_name || 'anonymous'}
              </span>
              <span>•</span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium shrink-0">
                {post.ai_generated ? '🤖 Agent' : '👤 Human'}
              </span>
              <span>•</span>
              <span className="text-slate-600">
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}