import { createClient } from &apos;@/lib/supabase/server&apos;
import Link from &apos;next/link&apos;
import { formatDistanceToNow } from &apos;date-fns&apos;
import { ArrowUpIcon, MessageSquareIcon, CalendarIcon } from &apos;lucide-react&apos;

// Force dynamic rendering
export const dynamic = &apos;force-dynamic&apos;

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
      .from(&apos;posts&apos;)
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
      .eq(&apos;is_deleted&apos;, false)
      .gte(&apos;created_at&apos;, sevenDaysAgoISOString)
      .order(&apos;upvotes&apos;, { ascending: false })
      .limit(10)

    if (topPostsError) {
      console.error(&apos;Error fetching top posts:&apos;, topPostsError)
      return null
    }

    const { data: mostCommentedPosts, error: commentedError } = await supabase
      .from(&apos;posts&apos;)
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
      .eq(&apos;is_deleted&apos;, false)
      .gte(&apos;created_at&apos;, sevenDaysAgoISOString)
      .order(&apos;comment_count&apos;, { ascending: false })
      .limit(5)

    if (commentedError) {
      console.error(&apos;Error fetching most commented posts:&apos;, commentedError)
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
    console.error(&apos;Error loading digest data:&apos;, error)
    return null
  }
}

function PostItem({ post }: { post: PostData }) {
  return (
    <div className=&quot;bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700&quot;>
      <div className=&quot;flex items-start gap-3&quot;>
        <div className=&quot;flex flex-col items-center gap-1 text-sm text-gray-500 dark:text-gray-400&quot;>
          <ArrowUpIcon className=&quot;h-4 w-4&quot; />
          <span className=&quot;font-semibold&quot;>{post.vote_score}</span>
        </div>
        
        <div className=&quot;flex-1 min-w-0&quot;>
          <h3 className=&quot;font-medium text-gray-900 dark:text-gray-100 mb-2&quot;>
            <Link 
              href={`/c/${post.channel.name}/${post.id}`}
              className=&quot;hover:text-blue-600 dark:hover:text-blue-400&quot;
            >
              {post.title}
            </Link>
          </h3>
          
          <div className=&quot;flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400&quot;>
            <Link 
              href={`/c/${post.channel.name}`}
              className=&quot;hover:text-blue-600 dark:hover:text-blue-400 font-medium&quot;
            >
              c/{post.channel.name}
            </Link>
            
            <Link 
              href={`/u/${post.author.username}`}
              className=&quot;hover:text-blue-600 dark:hover:text-blue-400&quot;
            >
              u/{post.author.username}
            </Link>
            
            <div className=&quot;flex items-center gap-1&quot;>
              <MessageSquareIcon className=&quot;h-3 w-3&quot; />
              <span>{post.comment_count}</span>
            </div>
            
            <div className=&quot;flex items-center gap-1&quot;>
              <CalendarIcon className=&quot;h-3 w-3&quot; />
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
      <div className=&quot;container mx-auto px-4 py-8&quot;>
        <div className=&quot;text-center&quot;>
          <h1 className=&quot;text-3xl font-bold mb-4&quot;>Weekly Digest</h1>
          <p className=&quot;text-gray-500&quot;>Failed to load digest data. Please try again later.</p>
        </div>
      </div>
    )
  }

  const periodStart = new Date(digestData.period.start)
  const periodEnd = new Date(digestData.period.end)

  return (
    <div className=&quot;container mx-auto px-4 py-8&quot;>
      <div className=&quot;mb-8&quot;>
        <h1 className=&quot;text-4xl font-bold mb-2 text-gray-900 dark:text-gray-100&quot;>
          This Week on ddudl
        </h1>
        <p className=&quot;text-lg text-gray-600 dark:text-gray-400&quot;>
          Weekly digest for {periodStart.toLocaleDateString()} - {periodEnd.toLocaleDateString()}
        </p>
      </div>

      {/* Top Posts by Votes */}
      <section className=&quot;mb-12&quot;>
        <h2 className=&quot;text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100&quot;>
          🏆 Most Upvoted Posts
        </h2>
        <div className=&quot;space-y-4&quot;>
          {digestData.topPosts.map((post, index) => (
            <div key={post.id} className=&quot;relative&quot;>
              <div className=&quot;absolute -left-8 top-4 text-2xl font-bold text-yellow-500&quot;>
                #{index + 1}
              </div>
              <PostItem post={post} />
            </div>
          ))}
        </div>
      </section>

      {/* Most Commented Posts */}
      <section className=&quot;mb-12&quot;>
        <h2 className=&quot;text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100&quot;>
          💬 Most Discussed Posts
        </h2>
        <div className=&quot;space-y-4&quot;>
          {digestData.mostCommentedPosts.map((post, index) => (
            <div key={post.id} className=&quot;relative&quot;>
              <div className=&quot;absolute -left-8 top-4 text-2xl font-bold text-blue-500&quot;>
                #{index + 1}
              </div>
              <PostItem post={post} />
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <div className=&quot;text-center text-sm text-gray-500 dark:text-gray-400 mt-12&quot;>
        <p>
          Generated on {new Date(digestData.generated_at).toLocaleString()}
        </p>
        <p className=&quot;mt-2&quot;>
          <Link href=&quot;/&quot; className=&quot;hover:text-blue-600 dark:hover:text-blue-400&quot;>
            ← Back to Home
          </Link>
        </p>
      </div>
    </div>
  )
}