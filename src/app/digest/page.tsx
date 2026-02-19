import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { ArrowUpIcon, MessageSquareIcon, CalendarIcon } from 'lucide-react'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

interface PostData {
  id: string
  title: string
  content: string
  created_at: string
  upvotes: number
  downvotes: number
  comment_count: number
  vote_score: number
  channel: {
    name: string
    display_name: string
  }
  author: {
    username: string
  }
}

interface DigestData {
  period: {
    start: string
    end: string
  }
  topPosts: PostData[]
  mostCommentedPosts: PostData[]
  generated_at: string
}

async function getDigestData(): Promise<DigestData | null> {
  try {
    const supabase = await createClient()
    
    // 지난 7일 계산
    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000))
    const sevenDaysAgoISOString = sevenDaysAgo.toISOString()

    // 서버 컴포넌트에서는 직접 DB 쿼리
    const { data: topPosts, error: topPostsError } = await supabase
      .from('posts')
      .select(`
        id,
        title,
        content,
        created_at,
        upvotes,
        downvotes,
        comment_count,
        channel:channels(name, display_name),
        author:users(username)
      `)
      .eq('is_deleted', false)
      .gte('created_at', sevenDaysAgoISOString)
      .order('upvotes', { ascending: false })
      .limit(10)

    if (topPostsError) {
      console.error('Error fetching top posts:', topPostsError)
      return null
    }

    const { data: mostCommentedPosts, error: commentedError } = await supabase
      .from('posts')
      .select(`
        id,
        title,
        content,
        created_at,
        upvotes,
        downvotes,
        comment_count,
        channel:channels(name, display_name),
        author:users(username)
      `)
      .eq('is_deleted', false)
      .gte('created_at', sevenDaysAgoISOString)
      .order('comment_count', { ascending: false })
      .limit(5)

    if (commentedError) {
      console.error('Error fetching most commented posts:', commentedError)
      return null
    }

    // vote_score 계산
    const addVoteScore = (posts: any[]): PostData[] => {
      return posts.map(post => ({
        ...post,
        vote_score: post.upvotes - post.downvotes
      }))
    }

    return {
      period: {
        start: sevenDaysAgoISOString,
        end: now.toISOString()
      },
      topPosts: addVoteScore(topPosts || []),
      mostCommentedPosts: addVoteScore(mostCommentedPosts || []),
      generated_at: now.toISOString()
    }
  } catch (error) {
    console.error('Error loading digest data:', error)
    return null
  }
}

function PostItem({ post }: { post: PostData }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-start gap-3">
        <div className="flex flex-col items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
          <ArrowUpIcon className="h-4 w-4" />
          <span className="font-semibold">{post.vote_score}</span>
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
            <Link 
              href={`/c/${post.channel.name}/${post.id}`}
              className="hover:text-blue-600 dark:hover:text-blue-400"
            >
              {post.title}
            </Link>
          </h3>
          
          <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
            <Link 
              href={`/c/${post.channel.name}`}
              className="hover:text-blue-600 dark:hover:text-blue-400 font-medium"
            >
              c/{post.channel.name}
            </Link>
            
            <Link 
              href={`/u/${post.author.username}`}
              className="hover:text-blue-600 dark:hover:text-blue-400"
            >
              u/{post.author.username}
            </Link>
            
            <div className="flex items-center gap-1">
              <MessageSquareIcon className="h-3 w-3" />
              <span>{post.comment_count}</span>
            </div>
            
            <div className="flex items-center gap-1">
              <CalendarIcon className="h-3 w-3" />
              <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default async function DigestPage() {
  const digestData = await getDigestData()

  if (!digestData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Weekly Digest</h1>
          <p className="text-gray-500">Failed to load digest data. Please try again later.</p>
        </div>
      </div>
    )
  }

  const periodStart = new Date(digestData.period.start)
  const periodEnd = new Date(digestData.period.end)

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 text-gray-900 dark:text-gray-100">
          This Week on ddudl
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          Weekly digest for {periodStart.toLocaleDateString()} - {periodEnd.toLocaleDateString()}
        </p>
      </div>

      {/* Top Posts by Votes */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">
          🏆 Most Upvoted Posts
        </h2>
        <div className="space-y-4">
          {digestData.topPosts.map((post, index) => (
            <div key={post.id} className="relative">
              <div className="absolute -left-8 top-4 text-2xl font-bold text-yellow-500">
                #{index + 1}
              </div>
              <PostItem post={post} />
            </div>
          ))}
        </div>
      </section>

      {/* Most Commented Posts */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">
          💬 Most Discussed Posts
        </h2>
        <div className="space-y-4">
          {digestData.mostCommentedPosts.map((post, index) => (
            <div key={post.id} className="relative">
              <div className="absolute -left-8 top-4 text-2xl font-bold text-blue-500">
                #{index + 1}
              </div>
              <PostItem post={post} />
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <div className="text-center text-sm text-gray-500 dark:text-gray-400 mt-12">
        <p>
          Generated on {new Date(digestData.generated_at).toLocaleString()}
        </p>
        <p className="mt-2">
          <Link href="/" className="hover:text-blue-600 dark:hover:text-blue-400">
            ← Back to Home
          </Link>
        </p>
      </div>
    </div>
  )
}