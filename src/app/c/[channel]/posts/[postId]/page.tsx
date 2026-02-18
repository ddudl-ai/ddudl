import { Suspense } from &apos;react&apos;
import { Metadata } from &apos;next&apos;
import PostDetailClient from &apos;./PostDetailClient&apos;
import Header from &apos;@/components/layout/Header&apos;
import { LoadingSpinner } from &apos;@/components/common/LoadingSpinner&apos;
import { createAdminClient } from &apos;@/lib/supabase/admin&apos;
import { APP_CONFIG } from &apos;@/lib/constants&apos;
import StructuredData, { createArticleStructuredData } from &apos;@/components/seo/StructuredData&apos;

interface PostDetailPageProps {
  params: Promise<{
    channel: string
    postId: string
  }>
}

export async function generateMetadata({ params }: PostDetailPageProps): Promise<Metadata> {
  const { channel, postId } = await params
  const supabase = createAdminClient()

  try {
    const { data: post } = await supabase
      .from(&apos;posts&apos;)
      .select(&apos;title, content, created_at, channels(name)&apos;)
      .eq(&apos;id&apos;, postId)
      .single()

    if (!post) {
      return {
        title: &apos;Post Not Found&apos;,
        description: &apos;The requested post could not be found.&apos;,
      }
    }

    const postTitle = post.title || &apos;Untitled Post&apos;
    const description = post.content 
      ? post.content.substring(0, 160).replace(/\n/g, &apos; &apos;) + (post.content.length > 160 ? &apos;...&apos; : &apos;')
      : &apos;Discussion post on ddudl.com&apos;
    
    const channelName = (post.channels as unknown as { name: string } | null)?.name || channel
    const fullTitle = `${postTitle} - ${channelName}`
    const url = `https://ddudl.com/c/${channelName}/posts/${postId}`

    return {
      title: fullTitle,
      description,
      openGraph: {
        type: &apos;article&apos;,
        title: postTitle,
        description,
        url,
        siteName: APP_CONFIG.name,
        publishedTime: post.created_at,
      },
      twitter: {
        card: &apos;summary_large_image&apos;,
        title: postTitle,
        description,
      },
      alternates: {
        canonical: url,
      },
    }
  } catch (error) {
    console.error(&apos;Error generating metadata:&apos;, error)
    return {
      title: `Post in ${channel}`,
      description: &apos;Discussion post on ddudl.com&apos;,
    }
  }
}

export default async function PostDetailPage({ params }: PostDetailPageProps) {
  const { channel, postId } = await params
  const supabase = createAdminClient()
  
  // Get post data for structured data
  let postStructuredData = null
  try {
    const { data: post } = await supabase
      .from(&apos;posts&apos;)
      .select(&apos;title, content, created_at, updated_at, users(username, display_name), channels(name)&apos;)
      .eq(&apos;id&apos;, postId)
      .single()

    if (post) {
      const author = (post.users as unknown as { username: string, display_name?: string } | null)
      const channelName = (post.channels as unknown as { name: string } | null)?.name || channel
      const authorName = author?.display_name || author?.username || &apos;Anonymous&apos;
      const postTitle = post.title || &apos;Untitled Post&apos;
      const url = `https://ddudl.com/c/${channelName}/posts/${postId}`
      
      postStructuredData = createArticleStructuredData(
        postTitle,
        post.content ? post.content.substring(0, 160) : &apos;Discussion post on ddudl.com&apos;,
        authorName,
        post.created_at,
        url,
        APP_CONFIG.name,
        &apos;https://ddudl.com&apos;,
        post.updated_at
      )
    }
  } catch (error) {
    console.error(&apos;Error fetching post for structured data:&apos;, error)
  }
  
  return (
    <div className=&quot;min-h-screen bg-slate-950&quot;>
      {postStructuredData && (
        <StructuredData data={postStructuredData} />
      )}
      
      <Header />
      
      <div className=&quot;max-w-4xl mx-auto px-4 py-6&quot;>
        <div className=&quot;mb-4&quot;>
          <a href={`/c/${channel}`} className=&quot;text-slate-400 hover:text-slate-200 hover:underline&quot;>
            ← Back to {channel}
          </a>
        </div>
        
        <Suspense fallback={<LoadingSpinner text=&quot;Loading post...&quot; />}>
          <PostDetailClient postId={postId} channel={channel} />
        </Suspense>
      </div>
    </div>
  )
}