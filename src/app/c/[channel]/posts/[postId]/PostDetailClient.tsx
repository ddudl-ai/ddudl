'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import type { Locale } from 'date-fns'
import { ko, enUS, ja } from 'date-fns/locale'
import { 
  ArrowUp, 
  ArrowDown, 
  MessageSquare, 
  BookmarkPlus,
  Bot,
  Send,
  User
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { HtmlRenderer } from '@/components/common/HtmlRenderer'
import LinkPreview from '@/components/common/LinkPreview'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import { useTranslation } from '@/providers/LocalizationProvider'
import ShareButtons from '@/components/posts/ShareButtons'

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

type TranslateFn = ReturnType<typeof useTranslation>['t']

export default function PostDetailClient({ postId, channel }: PostDetailClientProps) {
  const [post, setPost] = useState<Post | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newComment, setNewComment] = useState('')
  const [commentAuthor, setCommentAuthor] = useState('')
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
      setCommentAuthor(user.user_metadata?.username || 'User')
    } else {
      setCommentAuthor('') // Login required
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
        console.error('Failed to translate post title:', error)
        return post.title
      })

      const contentPromise = post.content
        ? translateContent(post.content, { fallback: post.content }).catch((error) => {
            console.error('Failed to translate post content:', error)
            return post.content as string
          })
        : Promise.resolve<string | null>(null)

      const channelPromise = post.channels?.display_name
        ? translateContent(post.channels.display_name, { fallback: post.channels.display_name }).catch((error) => {
            console.error('Failed to translate community name:', error)
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
      .channel('comments-stream')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'comments', filter: `post_id=eq.${postId}` },
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
    if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete post')
      }

      alert('Post has been deleted.')
      router.push(`/${channel}`)
      router.refresh() // 페이지 새로고침으로 목록 업데이트
    } catch (err) {
      console.error('Error deleting post:', err)
      alert('Failed to delete post.')
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
          console.error('Failed to translate comment:', error)
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
        throw new Error('Failed to fetch post')
      }
      
      const { post, comments } = await response.json()
      setPost(post)
      setComments(comments || [])
    } catch (err) {
      setError('Failed to load post.')
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmitComment() {
    if (!newComment.trim() || !commentAuthor.trim() || !user) {
      alert('You need to sign in to write comments.')
      return
    }
    
    try {
      setSubmittingComment(true)
      
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: newComment,
          postId: postId,
          authorName: commentAuthor
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to submit comment')
      }
      
      const { comment } = await response.json()
      setComments([...comments, comment])
      setNewComment('')
      
      // 게시물의 댓글 수 업데이트
      if (post) {
        setPost({
          ...post,
          comment_count: (post.comment_count || 0) + 1
        })
      }
    } catch (err) {
      console.error('Error submitting comment:', err)
      alert('Failed to write comment.')
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
    return <LoadingSpinner text="Loading post..." />
  }

  if (error || !post) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">{error || 'Post not found.'}</p>
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
    <div className="space-y-6">
      {/* 게시물 상세 */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-x-2 text-sm text-gray-500 mb-2">
            <span>/{post.channels.name}</span>
            {post.channels.display_name && (
              <>
                <span>•</span>
                <span>{displayChannelName}</span>
              </>
            )}
            <span>•</span>
            <span>
              {t('postCard.authorWrote', '{{username}}님이 작성', {
                username: post.users?.username || t('postCard.unknownUser', '알 수 없는 User')
              })}
            </span>
            <span>•</span>
            <span>{formatTimeAgo(post.created_at)}</span>
            {post.ai_generated && (
              <>
                <span>•</span>
                <Badge variant="secondary" className="flex items-center space-x-1">
                  <Bot className="w-3 h-3" />
                  <span>{t('postCard.aiGenerated', 'AI 생성')}</span>
                </Badge>
              </>
            )}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex-1">
              <div className="flex items-start space-x-2">
                {post.flair && (
                  <Badge variant="outline" className="text-xs">
                    {post.flair}
                  </Badge>
                )}
                <h1 className="text-2xl font-bold text-gray-900">
                  {displayTitle}
                </h1>
              </div>
            </div>

            {(canToggleOriginal || profile?.id === post.author_id) && (
              <div className="flex items-center space-x-2">
                {canToggleOriginal && (
                  <Button variant="outline" size="sm" onClick={() => setShowOriginal((prev) => !prev)}>
                    {showOriginal
                      ? t('postDetail.viewTranslation', '번역 보기')
                      : t('postDetail.viewOriginal', '원문 보기')}
                  </Button>
                )}
                {profile?.id === post.author_id && (
                  <>
                    <Button variant="outline" size="sm" onClick={handleEdit}>
                      {t('postCard.edit', '수정')}
                    </Button>
                    <Button variant="destructive" size="sm" onClick={handleDelete}>
                      {t('postCard.delete', '삭제')}
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        
        <CardContent>
          {post.content && (
            <div className="mb-6 space-y-3">
              <HtmlRenderer content={displayContent ?? post.content} />
              <LinkPreview content={post.content} />
            </div>
          )}
          
          {/* 투표 및 액션 버튼 */}
          <div className="flex items-center space-x-4 pt-4 border-t">
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" className="text-gray-500 hover:text-orange-500">
                <ArrowUp className="w-4 h-4" />
              </Button>
              <span className="font-medium">{post.vote_score || ((post.upvote_count || 0) - (post.downvote_count || 0))}</span>
              <Button variant="ghost" size="sm" className="text-gray-500 hover:text-blue-500">
                <ArrowDown className="w-4 h-4" />
              </Button>
            </div>
            
            <Button variant="ghost" size="sm" className="flex items-center space-x-1 text-gray-500">
              <MessageSquare className="w-4 h-4" />
              <span>{post.comment_count || 0} Comments</span>
            </Button>
            
            <ShareButtons
              title={displayTitle}
              url={`https://ddudl.com/c/${channel}/posts/${postId}`}
              description={displayContent ? displayContent.substring(0, 160) : ''}
            />
            
            <Button variant="ghost" size="sm" className="flex items-center space-x-1 text-gray-500">
              <BookmarkPlus className="w-4 h-4" />
              <span>Save</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 댓글 작성 */}
      {user ? (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Write Comment</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-2 p-3 bg-green-50 border border-green-200 rounded-md">
                <User className="w-4 h-4 text-green-600" />
                <span className="text-green-800 font-medium">{commentAuthor}</span>
                <Badge variant="secondary" className="text-xs">Verified</Badge>
              </div>

              <Textarea
                placeholder="Enter your comment..."
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
                className="flex items-center space-x-2"
              >
                {submittingComment ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span>Post Comment</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="text-center py-6">
            <p className="text-sm text-gray-600">You need to sign in to write comments.</p>
            <Button 
              variant="default" 
              className="mt-3"
              onClick={() => router.push('/auth/login')}
            >
              Sign In
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 댓글 목록 */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">
          {comments.length} Comments
        </h3>
        
        {comments.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8 text-gray-500">
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
                alert('You need to sign in to write comments.')
                return false
              }
              try {
                const response = await fetch('/api/comments', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    content,
                    postId,
                    authorName: author,
                    parentId
                  })
                })
                if (!response.ok) throw new Error('Failed reply')
                const { comment } = await response.json()
                setComments((prev) => [...prev, comment])
                return true
              } catch (e) {
                console.error(e)
                alert('Failed to write reply.')
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
  const [replyText, setReplyText] = useState('')
  const [replyAuthor, setReplyAuthor] = useState('')

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
    <div className="space-y-3">
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
      setReplyText('')
      setReplyingTo(null)
    }
  }

  const contentToRender =
    !autoTranslate || showOriginal ? comment.content : translations[comment.id] ?? comment.content

  return (
    <div className="space-y-2">
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center space-x-2 text-sm text-gray-500 mb-2">
            <span className="font-medium">
              {comment.users?.username || t('postCard.unknownUser', '알 수 없는 User')}
            </span>
            <span>•</span>
            <span>{formatTimeAgo(comment.created_at)}</span>
            {comment.ai_generated && (
              <>
                <span>•</span>
                <Badge variant="secondary" className="text-xs">AI</Badge>
              </>
            )}
          </div>
          <div className="text-gray-700 mb-3 prose max-w-none prose-p:my-2">
            <HtmlRenderer content={contentToRender} />
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" className="text-gray-500 hover:text-orange-500 p-1">
              <ArrowUp className="w-3 h-3" />
            </Button>
            <span className="text-sm">{comment.vote_score || ((comment.upvotes || comment.upvote_count || 0) - (comment.downvotes || comment.downvote_count || 0))}</span>
            <Button variant="ghost" size="sm" className="text-gray-500 hover:text-blue-500 p-1">
              <ArrowDown className="w-3 h-3" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-gray-500"
              onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
            >
              Reply
            </Button>
          </div>
          {replyingTo === comment.id && (
            <div className="mt-3 space-y-2">
              <div className="flex items-center space-x-2">
                <Input
                  placeholder="Nickname"
                  value={replyAuthor}
                  onChange={(e) => setReplyAuthor(e.target.value)}
                  className="w-32"
                />
              </div>
              <Textarea
                placeholder="Enter your reply..."
                rows={3}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
              />
              <div className="flex justify-end">
                <Button size="sm" onClick={submitReply} className="flex items-center space-x-1">
                  <Send className="w-4 h-4" />
                  <span>Post Reply</span>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      {children.length > 0 && (
        <div className="pl-4 border-l ml-2 space-y-2">
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