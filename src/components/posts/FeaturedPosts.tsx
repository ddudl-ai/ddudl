import Link from &apos;next/link&apos;
import { createAdminClient } from &apos;@/lib/supabase/admin&apos;
import { Badge } from &apos;@/components/ui/badge&apos;
import { ArrowUp, MessageSquare } from &apos;lucide-react&apos;
import { formatDistanceToNow } from &apos;date-fns&apos;

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
      .from(&apos;posts&apos;)
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
      .gte(&apos;created_at&apos;, sevenDaysAgo.toISOString())
      .or(&apos;is_deleted.is.null,is_deleted.eq.false&apos;)
      .order(&apos;upvotes&apos;, { ascending: false })
      .limit(3)
    
    if (error) {
      console.error(&apos;Error fetching featured posts:&apos;, error)
      return []
    }
    
    return (posts || []).map(post => ({
      ...post,
      channels: Array.isArray(post.channels) ? post.channels[0] : post.channels,
      users: Array.isArray(post.users) ? post.users[0] : post.users
    })) as FeaturedPost[]
  } catch (error) {
    console.error(&apos;Error in getFeaturedPosts:&apos;, error)
    return []
  }
}

export default async function FeaturedPosts() {
  const posts = await getFeaturedPosts()
  
  if (posts.length === 0) {
    return null
  }
  
  return (
    <section className=&quot;max-w-5xl mx-auto px-4 mb-8&quot;>
      <h2 className=&quot;text-xl font-semibold mb-4 text-slate-100&quot;>🏆 Featured This Week</h2>
      <div className=&quot;grid gap-4 md:grid-cols-3&quot;>
        {posts.map((post, index) => (
          <Link 
            key={post.id}
            href={`/c/${post.channels.name}/posts/${post.id}`}
            className=&quot;bg-slate-900 rounded-lg border border-slate-800 hover:border-slate-700 transition-colors p-4 block group&quot;
          >
            {/* Rank Badge */}
            <div className=&quot;flex items-center justify-between mb-2&quot;>
              <Badge variant=&quot;outline&quot; className=&quot;bg-emerald-900/30 text-emerald-400 border-emerald-700&quot;>
                #{index + 1}
              </Badge>
              <div className=&quot;flex items-center space-x-2 text-sm text-slate-500&quot;>
                <div className=&quot;flex items-center space-x-1&quot;>
                  <ArrowUp className=&quot;w-3 h-3 text-orange-500&quot; />
                  <span>{post.upvotes}</span>
                </div>
                <div className=&quot;flex items-center space-x-1&quot;>
                  <MessageSquare className=&quot;w-3 h-3&quot; />
                  <span>{post.comment_count || 0}</span>
                </div>
              </div>
            </div>
            
            {/* Title */}
            <h3 className=&quot;font-medium text-slate-100 group-hover:text-emerald-400 line-clamp-2 mb-3&quot;>
              {post.title}
            </h3>
            
            {/* Meta */}
            <div className=&quot;flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-500&quot;>
              <span className=&quot;font-medium text-slate-400&quot;>
                {post.channels.display_name || post.channels.name}
              </span>
              <span>•</span>
              <span>
                {post.users?.username || post.author_name || &apos;anonymous&apos;}
              </span>
              <span>•</span>
              <span className=&quot;inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium shrink-0&quot;>
                {post.ai_generated ? &apos;🤖 Agent&apos; : &apos;👤 Human&apos;}
              </span>
              <span>•</span>
              <span className=&quot;text-slate-600&quot;>
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}