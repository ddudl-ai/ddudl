'use client&apos;

import { useEffect, useMemo, useState } from &apos;react&apos;
import { useRouter } from &apos;next/navigation&apos;
import { formatDistanceToNow } from &apos;date-fns&apos;
import type { Locale } from &apos;date-fns&apos;
import { ko, enUS, ja } from &apos;date-fns/locale&apos;
import { 
  ArrowUp, 
  ArrowDown, 
  MessageSquare, 
  BookmarkPlus,
  Bot,
  Send,
  User
} from &apos;lucide-react&apos;
import { Button } from &apos;@/components/ui/button&apos;
import { Badge } from &apos;@/components/ui/badge&apos;
import { Card, CardContent, CardHeader } from &apos;@/components/ui/card&apos;
import { Textarea } from &apos;@/components/ui/textarea&apos;
import { Input } from &apos;@/components/ui/input&apos;
import { LoadingSpinner } from &apos;@/components/common/LoadingSpinner&apos;
import { HtmlRenderer } from &apos;@/components/common/HtmlRenderer&apos;
import LinkPreview from &apos;@/components/common/LinkPreview&apos;
import { createClient } from &apos;@/lib/supabase/client&apos;
import { useAuthStore } from &apos;@/stores/authStore&apos;
import { useTranslation } from &apos;@/providers/LocalizationProvider&apos;
import ShareButtons from &apos;@/components/posts/ShareButtons&apos;

interface Post {
  id: string
  title: string
  content: string | null
  author_id: string
  channel_id: string
  upvote_count?: number
  downvote_count?: number
  comment_count?: number
  vote_score?: number
  created_at: string
  updated_at: string
  flair: string | null
  ai_generated?: boolean
  allow_guest_comments: boolean
  channels: {
    name: string
    display_name: string
  }
  users: {
    username: string
  } | null
}

interface Comment {
  id: string
  content: string
  author_id: string
  post_id: string
  parent_id: string | null
  upvotes?: number
  downvotes?: number
  upvote_count?: number
  downvote_count?: number
  vote_score?: number
  created_at: string
  updated_at: string
  ai_generated?: boolean
  users: {
    username: string
  } | null
}

interface PostDetailClientProps {
  postId: string
  channel: string
}

type TranslateFn = ReturnType<typeof useTranslation>[&apos;t&apos;]

export default function PostDetailClient({ postId, channel }: PostDetailClientProps) {
  const [post, setPost] = useState<Post | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newComment, setNewComment] = useState(&apos;')
  const [commentAuthor, setCommentAuthor] = useState(&apos;')
  const [submittingComment, setSubmittingComment] = useState(false)
  const router = useRouter()

  const { t, translateContent, autoTranslate, language } = useTranslation()
  const { user, profile, initialize } = useAuthStore()
  const supabase = useMemo(() => createClient(), [])
  const [translatedTitle, setTranslatedTitle] = useState<string | null>(null)
  const [translatedContent, setTranslatedContent] = useState<string | null>(null)
  const [translatedChannelName, setTranslatedChannelName] = useState<string | null>(null)
  const [commentTranslations, setCommentTranslations] = useState<Record<string, string>>({})
  const [showOriginal, setShowOriginal] = useState(false)

  useEffect(() => {
    setTranslatedTitle(null)
    setTranslatedContent(null)
    setTranslatedChannelName(null)
    setCommentTranslations({})
    setShowOriginal(false)
  }, [postId, autoTranslate])

  useEffect(() => {
    initialize()
  }, [initialize])

  useEffect(() => {
    if (user) {
      setCommentAuthor(user.user_metadata?.username || &apos;User&apos;)
    } else {
      setCommentAuthor(&apos;') // Login required
    }
  }, [user])

  useEffect(() => {
    fetchPostDetail()
  }, [postId])

  useEffect(() => {
    if (!post) {
      return
    }

    if (!autoTranslate) {
      setTranslatedTitle(null)
      setTranslatedContent(null)
      setTranslatedChannelName(null)
      return
    }

    let isCancelled = false

    const translatePost = async () => {
      const titlePromise = translateContent(post.title, { fallback: post.title }).catch((error) => {
        console.error(&apos;Failed to translate post title:&apos;, error)
        return post.title
      })

      const contentPromise = post.content
        ? translateContent(post.content, { fallback: post.content }).catch((error) => {
            console.error(&apos;Failed to translate post content:&apos;, error)
            return post.content as string
          })
        : Promise.resolve<string | null>(null)

      const channelPromise = post.channels?.display_name
        ? translateContent(post.channels.display_name, { fallback: post.channels.display_name }).catch((error) => {
            console.error(&apos;Failed to translate community name:&apos;, error)
            return post.channels.display_name
          })
        : Promise.resolve<string | null>(null)

      const [titleResult, contentResult, channelResult] = await Promise.all([
        titlePromise,
        contentPromise,
        channelPromise
      ])

      if (isCancelled) {
        return
      }

      setTranslatedTitle(titleResult)
      setTranslatedContent(post.content ? (contentResult ?? post.content) : null)
      setTranslatedChannelName(
        post.channels?.display_name ? (channelResult ?? post.channels.display_name) : null
      )
    }

    translatePost()

    return () => {
      isCancelled = true
    }
  }, [post, autoTranslate, translateContent])

  // Realtime comments subscription
  useEffect(() => {
    const channelSub = supabase
      .channel(&apos;comments-stream&apos;)
      .on(
        &apos;postgres_changes&apos;,
        { event: &apos;INSERT&apos;, schema: &apos;public&apos;, table: &apos;comments&apos;, filter: `post_id=eq.${postId}` },
        (payload: any) => {
          setComments((prev) => [...prev, payload.new])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channelSub)
    }
  }, [postId, supabase])

  const handleEdit = () => {
    router.push(`/c/${channel}/write?edit=${postId}`)
  }

  const handleDelete = async () => {
    if (!confirm(&apos;Are you sure you want to delete this post? This action cannot be undone.&apos;)) {
      return
    }

    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: &apos;DELETE&apos;,
      })

      if (!response.ok) {
        throw new Error(&apos;Failed to delete post&apos;)
      }

      alert(&apos;Post has been deleted.&apos;)
      router.push(`/${channel}`)
      router.refresh() // 페이지 새로고침으로 목록 업데이트
    } catch (err) {
      console.error(&apos;Error deleting post:&apos;, err)
      alert(&apos;Failed to delete post.&apos;)
    }
  }

  useEffect(() => {
    if (!autoTranslate) {
      if (Object.keys(commentTranslations).length > 0) {
        setCommentTranslations({})
      }
      return
    }

    const missingComments = comments.filter(
      (comment) => comment.content?.trim() && !commentTranslations[comment.id]
    )

    if (missingComments.length === 0) {
      return
    }

    let isCancelled = false

    const translateComments = async () => {
      const updates: Record<string, string> = {}

      for (const comment of missingComments) {
        try {
          const translated = await translateContent(comment.content, { fallback: comment.content })
          updates[comment.id] = translated
        } catch (error) {
          console.error(&apos;Failed to translate comment:&apos;, error)
          updates[comment.id] = comment.content
        }

        if (isCancelled) {
          return
        }
      }

      if (!isCancelled && Object.keys(updates).length > 0) {
        setCommentTranslations((prev) => ({ ...prev, ...updates }))
      }
    }

    translateComments()

    return () => {
      isCancelled = true
    }
  }, [comments, autoTranslate, translateContent, commentTranslations])

  async function fetchPostDetail() {
    try {
      setLoading(true)
      const response = await fetch(`/api/posts/${postId}`)
      
      if (!response.ok) {
        throw new Error(&apos;Failed to fetch post&apos;)
      }
      
      const { post, comments } = await response.json()
      setPost(post)
      setComments(comments || [])
    } catch (err) {
      setError(&apos;Failed to load post.&apos;)
      console.error(&apos;Error:&apos;, err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmitComment() {
    if (!newComment.trim() || !commentAuthor.trim() || !user) {
      alert(&apos;You need to sign in to write comments.&apos;)
      return
    }
    
    try {
      setSubmittingComment(true)
      
      const response = await fetch(&apos;/api/comments&apos;, {
        method: &apos;POST&apos;,
        headers: {
          &apos;Content-Type&apos;: &apos;application/json&apos;,
        },
        body: JSON.stringify({
          content: newComment,
          postId: postId,
          authorName: commentAuthor
        })
      })
      
      if (!response.ok) {
        throw new Error(&apos;Failed to submit comment&apos;)
      }
      
      const { comment } = await response.json()
      setComments([...comments, comment])
      setNewComment(&apos;')
      
      // 게시물의 댓글 수 업데이트
      if (post) {
        setPost({
          ...post,
          comment_count: (post.comment_count || 0) + 1
        })
      }
    } catch (err) {
      console.error(&apos;Error submitting comment:&apos;, err)
      alert(&apos;Failed to write comment.&apos;)
    } finally {
      setSubmittingComment(false)
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const localeMap: Record<string, Locale> = {
      ko,
      en: enUS,
      ja
    }

    const locale = localeMap[language] || ko

    return formatDistanceToNow(new Date(dateString), {
      addSuffix: true,
      locale
    })
  }

  if (loading) {
    return <LoadingSpinner text=&quot;Loading post...&quot; />
  }

  if (error || !post) {
    return (
      <div className=&quot;text-center py-8&quot;>
        <p className=&quot;text-red-600&quot;>{error || &apos;Post not found.&apos;}</p>
      </div>
    )
  }

  const displayTitle = autoTranslate && !showOriginal && translatedTitle ? translatedTitle : post.title

  const displayContent = post.content
    ? autoTranslate && !showOriginal && translatedContent
      ? translatedContent
      : post.content
    : null

  const displayChannelName = post.channels.display_name
    ? autoTranslate && !showOriginal && translatedChannelName
      ? translatedChannelName
      : post.channels.display_name
    : post.channels.name

  const canToggleOriginal =
    autoTranslate &&
    ((post.title && translatedTitle !== null) ||
      (post.content && translatedContent !== null) ||
      Object.keys(commentTranslations).length > 0)

  return (
    <div className=&quot;space-y-6&quot;>
      {/* 게시물 상세 */}
      <Card>
        <CardHeader>
          <div className=&quot;flex flex-wrap items-center gap-x-2 text-sm text-gray-500 mb-2&quot;>
            <span>/{post.channels.name}</span>
            {post.channels.display_name && (
              <>
                <span>•</span>
                <span>{displayChannelName}</span>
              </>
            )}
            <span>•</span>
            <span>
              {t(&apos;postCard.authorWrote&apos;, &apos;{{username}}님이 작성&apos;, {
                username: post.users?.username || t(&apos;postCard.unknownUser&apos;, &apos;알 수 없는 User&apos;)
              })}
            </span>
            <span>•</span>
            <span>{formatTimeAgo(post.created_at)}</span>
            {post.ai_generated && (
              <>
                <span>•</span>
                <Badge variant=&quot;secondary&quot; className=&quot;flex items-center space-x-1&quot;>
                  <Bot className=&quot;w-3 h-3&quot; />
                  <span>{t(&apos;postCard.aiGenerated&apos;, &apos;AI 생성&apos;)}</span>
                </Badge>
              </>
            )}
          </div>

          <div className=&quot;flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between&quot;>
            <div className=&quot;flex-1&quot;>
              <div className=&quot;flex items-start space-x-2&quot;>
                {post.flair && (
                  <Badge variant=&quot;outline&quot; className=&quot;text-xs&quot;>
                    {post.flair}
                  </Badge>
                )}
                <h1 className=&quot;text-2xl font-bold text-gray-900&quot;>
                  {displayTitle}
                </h1>
              </div>
            </div>

            {(canToggleOriginal || profile?.id === post.author_id) && (
              <div className=&quot;flex items-center space-x-2&quot;>
                {canToggleOriginal && (
                  <Button variant=&quot;outline&quot; size=&quot;sm&quot; onClick={() => setShowOriginal((prev) => !prev)}>
                    {showOriginal
                      ? t(&apos;postDetail.viewTranslation&apos;, &apos;번역 보기&apos;)
                      : t(&apos;postDetail.viewOriginal&apos;, &apos;원문 보기&apos;)}
                  </Button>
                )}
                {profile?.id === post.author_id && (
                  <>
                    <Button variant=&quot;outline&quot; size=&quot;sm&quot; onClick={handleEdit}>
                      {t(&apos;postCard.edit&apos;, &apos;수정&apos;)}
                    </Button>
                    <Button variant=&quot;destructive&quot; size=&quot;sm&quot; onClick={handleDelete}>
                      {t(&apos;postCard.delete&apos;, &apos;삭제&apos;)}
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        
        <CardContent>
          {post.content && (
            <div className=&quot;mb-6 space-y-3&quot;>
              <HtmlRenderer content={displayContent ?? post.content} />
              <LinkPreview content={post.content} />
            </div>
          )}
          
          {/* 투표 및 액션 버튼 */}
          <div className=&quot;flex items-center space-x-4 pt-4 border-t&quot;>
            <div className=&quot;flex items-center space-x-2&quot;>
              <Button variant=&quot;ghost&quot; size=&quot;sm&quot; className=&quot;text-gray-500 hover:text-orange-500&quot;>
                <ArrowUp className=&quot;w-4 h-4&quot; />
              </Button>
              <span className=&quot;font-medium&quot;>{post.vote_score || ((post.upvote_count || 0) - (post.downvote_count || 0))}</span>
              <Button variant=&quot;ghost&quot; size=&quot;sm&quot; className=&quot;text-gray-500 hover:text-blue-500&quot;>
                <ArrowDown className=&quot;w-4 h-4&quot; />
              </Button>
            </div>
            
            <Button variant=&quot;ghost&quot; size=&quot;sm&quot; className=&quot;flex items-center space-x-1 text-gray-500&quot;>
              <MessageSquare className=&quot;w-4 h-4&quot; />
              <span>{post.comment_count || 0} Comments</span>
            </Button>
            
            <ShareButtons
              title={displayTitle}
              url={`https://ddudl.com/c/${channel}/posts/${postId}`}
              description={displayContent ? displayContent.substring(0, 160) : &apos;'}
            />
            
            <Button variant=&quot;ghost&quot; size=&quot;sm&quot; className=&quot;flex items-center space-x-1 text-gray-500&quot;>
              <BookmarkPlus className=&quot;w-4 h-4&quot; />
              <span>Save</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 댓글 작성 */}
      {user ? (
        <Card>
          <CardHeader>
            <h3 className=&quot;text-lg font-semibold&quot;>Write Comment</h3>
          </CardHeader>
          <CardContent>
            <div className=&quot;space-y-4&quot;>
              <div className=&quot;flex items-center space-x-2 p-3 bg-green-50 border border-green-200 rounded-md&quot;>
                <User className=&quot;w-4 h-4 text-green-600&quot; />
                <span className=&quot;text-green-800 font-medium&quot;>{commentAuthor}</span>
                <Badge variant=&quot;secondary&quot; className=&quot;text-xs&quot;>Verified</Badge>
              </div>

              <Textarea
                placeholder=&quot;Enter your comment...&quot;
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={3}
              />

              <Button
                onClick={handleSubmitComment}
                disabled={
                  !newComment.trim() ||
                  !commentAuthor.trim() ||
                  submittingComment
                }
                className=&quot;flex items-center space-x-2&quot;
              >
                {submittingComment ? (
                  <LoadingSpinner size=&quot;sm&quot; />
                ) : (
                  <Send className=&quot;w-4 h-4&quot; />
                )}
                <span>Post Comment</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className=&quot;text-center py-6&quot;>
            <p className=&quot;text-sm text-gray-600&quot;>You need to sign in to write comments.</p>
            <Button 
              variant=&quot;default&quot; 
              className=&quot;mt-3&quot;
              onClick={() => router.push(&apos;/auth/login&apos;)}
            >
              Sign In
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 댓글 목록 */}
      <div className=&quot;space-y-4&quot;>
        <h3 className=&quot;text-lg font-semibold&quot;>
          {comments.length} Comments
        </h3>
        
        {comments.length === 0 ? (
          <Card>
            <CardContent className=&quot;text-center py-8 text-gray-500&quot;>
              No comments yet. Be the first to write a comment!
            </CardContent>
          </Card>
        ) : (
          <CommentTree
            comments={comments}
            translations={commentTranslations}
            showOriginal={showOriginal}
            autoTranslate={autoTranslate}
            formatTimeAgo={formatTimeAgo}
            t={t}
            onReply={async (parentId, content, author) => {
              // reuse comment submission with parentId
              if (!user) {
                alert(&apos;You need to sign in to write comments.&apos;)
                return false
              }
              try {
                const response = await fetch(&apos;/api/comments&apos;, {
                  method: &apos;POST&apos;,
                  headers: { &apos;Content-Type&apos;: &apos;application/json&apos; },
                  body: JSON.stringify({
                    content,
                    postId,
                    authorName: author,
                    parentId
                  })
                })
                if (!response.ok) throw new Error(&apos;Failed reply&apos;)
                const { comment } = await response.json()
                setComments((prev) => [...prev, comment])
                return true
              } catch (e) {
                console.error(e)
                alert(&apos;Failed to write reply.&apos;)
                return false
              }
            }}
          />
        )}
      </div>
    </div>
  )
}

// Build nested tree and render recursively
function CommentTree({
  comments,
  translations,
  showOriginal,
  autoTranslate,
  formatTimeAgo,
  t,
  onReply
}: {
  comments: Comment[];
  translations: Record<string, string>;
  showOriginal: boolean;
  autoTranslate: boolean;
  formatTimeAgo: (dateString: string) => string;
  t: TranslateFn;
  onReply: (parentId: string, content: string, author: string) => Promise<boolean>
}) {
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState(&apos;')
  const [replyAuthor, setReplyAuthor] = useState(&apos;')

  const byParent = useMemo(() => {
    const map = new Map<string | null, Comment[]>()
    comments.forEach((c) => {
      const key = c.parent_id
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(c)
    })
    return map
  }, [comments])

  const roots = byParent.get(null) || []

  return (
    <div className=&quot;space-y-3&quot;>
      {roots.map((c) => (
        <CommentItem
          key={c.id}
          comment={c}
          childrenMap={byParent}
          depth={0}
          replyingTo={replyingTo}
          replyText={replyText}
          replyAuthor={replyAuthor}
          setReplyingTo={setReplyingTo}
          setReplyText={setReplyText}
          setReplyAuthor={setReplyAuthor}
          onReply={onReply}
          translations={translations}
          showOriginal={showOriginal}
          autoTranslate={autoTranslate}
          formatTimeAgo={formatTimeAgo}
          t={t}
        />
      ))}
    </div>
  )
}

function CommentItem({
  comment,
  childrenMap,
  depth,
  replyingTo,
  replyText,
  replyAuthor,
  setReplyingTo,
  setReplyText,
  setReplyAuthor,
  onReply,
  translations,
  showOriginal,
  autoTranslate,
  formatTimeAgo,
  t,
}: {
  comment: Comment
  childrenMap: Map<string | null, Comment[]>
  depth: number
  replyingTo: string | null
  replyText: string
  replyAuthor: string
  setReplyingTo: (id: string | null) => void
  setReplyText: (t: string) => void
  setReplyAuthor: (a: string) => void
  onReply: (parentId: string, content: string, author: string) => Promise<boolean>
  translations: Record<string, string>
  showOriginal: boolean
  autoTranslate: boolean
  formatTimeAgo: (dateString: string) => string
  t: TranslateFn
}) {
  const children = childrenMap.get(comment.id) || []

  const submitReply = async () => {
    if (!replyText.trim() || !replyAuthor.trim()) return
    const ok = await onReply(comment.id, replyText, replyAuthor)
    if (ok) {
      setReplyText(&apos;')
      setReplyingTo(null)
    }
  }

  const contentToRender =
    !autoTranslate || showOriginal ? comment.content : translations[comment.id] ?? comment.content

  return (
    <div className=&quot;space-y-2&quot;>
      <Card>
        <CardContent className=&quot;pt-4&quot;>
          <div className=&quot;flex items-center space-x-2 text-sm text-gray-500 mb-2&quot;>
            <span className=&quot;font-medium&quot;>
              {comment.users?.username || t(&apos;postCard.unknownUser&apos;, &apos;알 수 없는 User&apos;)}
            </span>
            <span>•</span>
            <span>{formatTimeAgo(comment.created_at)}</span>
            {comment.ai_generated && (
              <>
                <span>•</span>
                <Badge variant=&quot;secondary&quot; className=&quot;text-xs&quot;>AI</Badge>
              </>
            )}
          </div>
          <div className=&quot;text-gray-700 mb-3 prose max-w-none prose-p:my-2&quot;>
            <HtmlRenderer content={contentToRender} />
          </div>
          <div className=&quot;flex items-center space-x-2&quot;>
            <Button variant=&quot;ghost&quot; size=&quot;sm&quot; className=&quot;text-gray-500 hover:text-orange-500 p-1&quot;>
              <ArrowUp className=&quot;w-3 h-3&quot; />
            </Button>
            <span className=&quot;text-sm&quot;>{comment.vote_score || ((comment.upvotes || comment.upvote_count || 0) - (comment.downvotes || comment.downvote_count || 0))}</span>
            <Button variant=&quot;ghost&quot; size=&quot;sm&quot; className=&quot;text-gray-500 hover:text-blue-500 p-1&quot;>
              <ArrowDown className=&quot;w-3 h-3&quot; />
            </Button>
            <Button 
              variant=&quot;ghost&quot; 
              size=&quot;sm&quot; 
              className=&quot;text-gray-500&quot;
              onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
            >
              Reply
            </Button>
          </div>
          {replyingTo === comment.id && (
            <div className=&quot;mt-3 space-y-2&quot;>
              <div className=&quot;flex items-center space-x-2&quot;>
                <Input
                  placeholder=&quot;Nickname&quot;
                  value={replyAuthor}
                  onChange={(e) => setReplyAuthor(e.target.value)}
                  className=&quot;w-32&quot;
                />
              </div>
              <Textarea
                placeholder=&quot;Enter your reply...&quot;
                rows={3}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
              />
              <div className=&quot;flex justify-end&quot;>
                <Button size=&quot;sm&quot; onClick={submitReply} className=&quot;flex items-center space-x-1&quot;>
                  <Send className=&quot;w-4 h-4&quot; />
                  <span>Post Reply</span>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      {children.length > 0 && (
        <div className=&quot;pl-4 border-l ml-2 space-y-2&quot;>
          {children.map((ch) => (
            <CommentItem
              key={ch.id}
              comment={ch}
              childrenMap={childrenMap}
              depth={depth + 1}
              replyingTo={replyingTo}
              replyText={replyText}
              replyAuthor={replyAuthor}
              setReplyingTo={setReplyingTo}
              setReplyText={setReplyText}
              setReplyAuthor={setReplyAuthor}
              onReply={onReply}
              translations={translations}
              showOriginal={showOriginal}
              autoTranslate={autoTranslate}
              formatTimeAgo={formatTimeAgo}
              t={t}
            />
          ))}
        </div>
      )}
    </div>
  )
}