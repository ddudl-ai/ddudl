'use client&apos;

import { useState, useEffect, useMemo } from &apos;react&apos;
import Link from &apos;next/link&apos;
import { formatDistanceToNow } from &apos;date-fns&apos;
import type { Locale } from &apos;date-fns&apos;
import { ko, enUS, ja } from &apos;date-fns/locale&apos;
import {
  ArrowUp,
  ArrowDown,
  MessageSquare,
  Share,
  BookmarkPlus,
  MoreHorizontal,
  Bot
} from &apos;lucide-react&apos;
import { Button } from &apos;@/components/ui/button&apos;
import { Badge } from &apos;@/components/ui/badge&apos;
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from &apos;@/components/ui/dropdown-menu&apos;
import { stripHtmlTags, truncateText, extractImagesFromContent, removeImagesFromContent } from &apos;@/lib/utils/html&apos;
import Image from &apos;next/image&apos;
import { useRouter } from &apos;next/navigation&apos;
import { useAuthStore } from &apos;@/stores/authStore&apos;
import { useTranslation } from &apos;@/providers/LocalizationProvider&apos;

interface Post {
  id: string
  title: string
  content: string | null
  author_id: string
  channel_id: string
  upvotes: number
  downvotes: number
  comment_count: number
  created_at: string
  updated_at: string
  flair: string | null
  ai_generated: boolean
  allow_guest_comments: boolean
  author_name?: string | null
  channels: {
    name: string
    display_name: string
  }
  users: {
    username: string
  } | null
}

interface PostCardProps {
  post: Post
}

export default function PostCard({ post }: PostCardProps) {
  const router = useRouter()
  const { profile, initialize } = useAuthStore()
  const [userVote, setUserVote] = useState<&apos;up&apos; | &apos;down&apos; | null>(null)
  const [currentUpvotes, setCurrentUpvotes] = useState(post.upvotes || 0)
  const [currentDownvotes, setCurrentDownvotes] = useState(post.downvotes || 0)
  const [isVoting, setIsVoting] = useState(false)
  const { t, translateContent, language, autoTranslate } = useTranslation()

  const rawPreview = useMemo(() => {
    if (!post.content) {
      return null
    }

    return truncateText(
      stripHtmlTags(removeImagesFromContent(post.content)),
      200
    )
  }, [post.content])

  const [translatedTitle, setTranslatedTitle] = useState(post.title)
  const [translatedPreview, setTranslatedPreview] = useState<string | null>(rawPreview)
  const [translatedCommunityName, setTranslatedCommunityName] = useState(
    post.channels.display_name || post.channels.name
  )

  // 컴포넌트 마운트시 User의 투표 상태 로드
  useEffect(() => {
    initialize()
    const loadUserVote = async () => {
      try {
        const response = await fetch(`/api/posts/${post.id}/vote`)
        if (response.ok) {
          const data = await response.json()
          setUserVote(data.userVote)
          setCurrentUpvotes(data.upvotes || 0)
          setCurrentDownvotes(data.downvotes || 0)
        }
      } catch (error) {
        console.error(&apos;Failed to load user vote:&apos;, error)
      }
    }

    loadUserVote()
  }, [post.id])

  useEffect(() => {
    let isCancelled = false

    const updateTranslations = async () => {
      if (!autoTranslate) {
        setTranslatedTitle(post.title)
        setTranslatedPreview(rawPreview)
        return
      }

      try {
        const [titleResult, previewResult] = await Promise.all([
          translateContent(post.title, { fallback: post.title }),
          rawPreview
            ? translateContent(rawPreview, { fallback: rawPreview })
            : Promise.resolve<string | null>(null)
        ])

        if (!isCancelled) {
          setTranslatedTitle(titleResult)
          setTranslatedPreview(previewResult)
        }
      } catch (error) {
        console.error(&apos;Failed to translate post content:&apos;, error)
        if (!isCancelled) {
          setTranslatedTitle(post.title)
          setTranslatedPreview(rawPreview)
        }
      }
    }

    updateTranslations()

    return () => {
      isCancelled = true
    }
  }, [autoTranslate, post.title, rawPreview, translateContent])

  useEffect(() => {
    let isCancelled = false

    const updateCommunityName = async () => {
      const baseName = post.channels.display_name || post.channels.name

      if (!autoTranslate) {
        setTranslatedCommunityName(baseName)
        return
      }

      try {
        const translated = await translateContent(baseName, { fallback: baseName })
        if (!isCancelled) {
          setTranslatedCommunityName(translated)
        }
      } catch (error) {
        console.error(&apos;Failed to translate community name:&apos;, error)
        if (!isCancelled) {
          setTranslatedCommunityName(baseName)
        }
      }
    }

    updateCommunityName()

    return () => {
      isCancelled = true
    }
  }, [autoTranslate, post.channels.display_name, post.channels.name, translateContent])

  const handleVote = async (voteType: &apos;up&apos; | &apos;down&apos;) => {
    if (isVoting) return

    setIsVoting(true)

    try {
      // 같은 투표를 클릭하면 제거, 다른 투표를 클릭하면 변경
      const actualVoteType = userVote === voteType ? &apos;remove&apos; : voteType

      const response = await fetch(`/api/posts/${post.id}/vote`, {
        method: &apos;POST&apos;,
        headers: {
          &apos;Content-Type&apos;: &apos;application/json&apos;,
        },
        body: JSON.stringify({ voteType: actualVoteType }),
      })

      if (response.ok) {
        const data = await response.json()
        setUserVote(data.userVote)
        setCurrentUpvotes(data.upvotes || 0)
        setCurrentDownvotes(data.downvotes || 0)
      } else {
        const error = await response.json()
        console.error(&apos;Vote failed:&apos;, error.error || error)
        // 로그인이 필요한 경우 알림
        if (response.status === 401) {
          alert(t(&apos;postCard.loginToVote&apos;, &apos;Please login to vote.&apos;))
        } else {
          const reason = error.error || t(&apos;postCard.unknownError&apos;, &apos;Unknown error&apos;)
          alert(t(&apos;postCard.voteFailed&apos;, &apos;Vote failed: {{reason}}&apos;, { reason }))
        }
      }
    } catch (error) {
      console.error(&apos;Vote error:&apos;, error)
    } finally {
      setIsVoting(false)
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

  const getVoteScore = () => (currentUpvotes || 0) - (currentDownvotes || 0)

  const isAuthor = profile?.id === post.author_id

  const handleEdit = () => {
    router.push(`/c/${post.channels.name}/write?edit=${post.id}`)
  }

  const handleDelete = async () => {
    if (!confirm(t(&apos;postCard.deleteConfirm&apos;, &apos;Delete this post?&apos;))) return
    try {
      const res = await fetch(`/api/posts/${post.id}`, { method: &apos;DELETE&apos; })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || t(&apos;postCard.deleteFailed&apos;, &apos;Delete failed&apos;))
      }
      router.refresh()
    } catch (e) {
      alert(e instanceof Error ? e.message : t(&apos;postCard.deleteError&apos;, &apos;Error deleting post&apos;))
    }
  }

  return (
    <div className=&quot;bg-slate-900 rounded-lg border border-slate-800 hover:border-slate-700 transition-colors&quot;>
      <div className=&quot;flex&quot;>
        {/* Vote Section */}
        <div className=&quot;flex flex-col items-center p-1.5 sm:p-2 bg-slate-900/50 rounded-l-lg min-w-[36px] sm:min-w-[40px]&quot;>
          <Button
            variant=&quot;ghost&quot;
            size=&quot;sm&quot;
            onClick={() => handleVote(&apos;up&apos;)}
            disabled={isVoting}
            className={`p-0.5 h-7 w-7 sm:h-8 sm:w-8 ${userVote === &apos;up&apos; ? &apos;text-orange-500&apos; : &apos;text-slate-500&apos;} ${isVoting ? &apos;opacity-50&apos; : &apos;'}`}
          >
            <ArrowUp className=&quot;w-3.5 h-3.5 sm:w-4 sm:h-4&quot; />
          </Button>

          <span className={`text-xs sm:text-sm font-medium py-0.5 ${getVoteScore() > 0 ? &apos;text-orange-500&apos; :
            getVoteScore() < 0 ? &apos;text-blue-500&apos; :
              &apos;text-slate-500&apos;
            }`}>
            {getVoteScore()}
          </span>

          <Button
            variant=&quot;ghost&quot;
            size=&quot;sm&quot;
            onClick={() => handleVote(&apos;down&apos;)}
            disabled={isVoting}
            className={`p-0.5 h-7 w-7 sm:h-8 sm:w-8 ${userVote === &apos;down&apos; ? &apos;text-blue-500&apos; : &apos;text-slate-500&apos;} ${isVoting ? &apos;opacity-50&apos; : &apos;'}`}
          >
            <ArrowDown className=&quot;w-3.5 h-3.5 sm:w-4 sm:h-4&quot; />
          </Button>
        </div>

        {/* Content Section */}
        <div className=&quot;flex-1 p-3 sm:p-4 min-w-0&quot;>
          {/* Header */}
          <div className=&quot;flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-slate-500 mb-2&quot;>
            <Link
              href={`/c/${post.channels.name}`}
              className=&quot;font-medium hover:underline text-slate-400&quot;
            >
              {translatedCommunityName}
            </Link>
            <span className=&quot;hidden sm:inline&quot;>•</span>
            <span className=&quot;truncate max-w-[150px] sm:max-w-none&quot;>
              {post.users?.username ? (
                <Link
                  href={`/u/${post.users.username}`}
                  className=&quot;hover:underline text-slate-400 hover:text-slate-300&quot;
                >
                  {post.users.username}
                </Link>
              ) : (
                <span>{post.author_name || t(&apos;postCard.unknownUser&apos;, &apos;anonymous&apos;)}</span>
              )}
            </span>
            {post.ai_generated ? (
              <span className=&quot;inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-emerald-900 text-emerald-300 shrink-0&quot;>🤖 Agent</span>
            ) : (
              <span className=&quot;inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-900 text-blue-300 shrink-0&quot;>👤 Human</span>
            )}
            <span className=&quot;text-slate-600 shrink-0&quot;>{formatTimeAgo(post.created_at)}</span>
          </div>

          {/* Title and Flair */}
          <div className=&quot;mb-3&quot;>
            <div className=&quot;flex items-start space-x-2&quot;>
              {post.flair && (
                <Badge variant=&quot;outline&quot; className=&quot;text-xs&quot;>
                  {post.flair}
                </Badge>
              )}
              <Link
                href={`/c/${post.channels.name}/posts/${post.id}`}
                className=&quot;font-semibold text-lg text-slate-100 hover:text-emerald-400 line-clamp-2&quot;
              >
                {translatedTitle}
              </Link>
            </div>
          </div>

          {/* Content Preview */}
          {post.content && translatedPreview && (
            <div className=&quot;mb-3 space-y-3&quot;>
              {/* 이미지 표시 */}
              {(() => {
                const images = extractImagesFromContent(post.content)
                if (images.length > 0) {
                  return (
                    <div className=&quot;flex flex-wrap gap-2&quot;>
                      {images.slice(0, 3).map((imageUrl, index) => (
                        <div key={index} className=&quot;relative w-24 h-24 rounded-lg overflow-hidden bg-gray-100&quot;>
                          <Image
                            src={imageUrl}
                            alt={`Post image ${index + 1}`}
                            fill
                            className=&quot;object-cover&quot;
                            sizes=&quot;96px&quot;
                            onError={(e) => {
                              // 이미지 로드 실패시 숨기기
                              const target = e.target as HTMLElement
                              if (target.parentElement) {
                                target.parentElement.style.display = &apos;none&apos;
                              }
                            }}
                          />
                        </div>
                      ))}
                      {images.length > 3 && (
                        <div className=&quot;w-24 h-24 rounded-lg bg-gray-200 flex items-center justify-center&quot;>
                          <span className=&quot;text-xs text-gray-500&quot;>+{images.length - 3}</span>
                        </div>
                      )}
                    </div>
                  )
                }
                return null
              })()}

              {/* 텍스트 내용 표시 (이미지 제외) */}
              <p className=&quot;text-slate-400 line-clamp-3 text-sm&quot;>
                {translatedPreview}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className=&quot;flex items-center space-x-1 sm:space-x-2&quot;>
            <Button variant=&quot;ghost&quot; size=&quot;sm&quot; className=&quot;flex items-center space-x-1 text-slate-500 hover:bg-slate-800 hover:text-slate-300 px-2 sm:px-3&quot;>
              <MessageSquare className=&quot;w-4 h-4&quot; />
              <span className=&quot;hidden sm:inline&quot;>
                {t(&apos;postCard.commentCount&apos;, &apos;{{count}} comments&apos;, { count: post.comment_count || 0 })}
              </span>
              <span className=&quot;sm:hidden text-xs&quot;>{post.comment_count || 0}</span>
            </Button>

            <Button variant=&quot;ghost&quot; size=&quot;sm&quot; className=&quot;flex items-center space-x-1 text-slate-500 hover:bg-slate-800 hover:text-slate-300 px-2 sm:px-3&quot;>
              <Share className=&quot;w-4 h-4&quot; />
              <span className=&quot;hidden sm:inline&quot;>{t(&apos;postCard.share&apos;, &apos;Share&apos;)}</span>
            </Button>

            <Button variant=&quot;ghost&quot; size=&quot;sm&quot; className=&quot;flex items-center space-x-1 text-slate-500 hover:bg-slate-800 hover:text-slate-300 px-2 sm:px-3&quot;>
              <BookmarkPlus className=&quot;w-4 h-4&quot; />
              <span className=&quot;hidden sm:inline&quot;>{t(&apos;postCard.save&apos;, &apos;Save&apos;)}</span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant=&quot;ghost&quot; size=&quot;sm&quot; className=&quot;text-slate-500 hover:bg-slate-800 hover:text-slate-300&quot;>
                  <MoreHorizontal className=&quot;w-4 h-4&quot; />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align=&quot;end&quot;>
                {isAuthor && (
                  <>
                    <DropdownMenuItem onClick={handleEdit}>{t(&apos;postCard.edit&apos;, &apos;Edit&apos;)}</DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDelete} className=&quot;text-red-600 focus:text-red-700&quot;>
                      {t(&apos;postCard.delete&apos;, &apos;Delete&apos;)}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem>{t(&apos;postCard.hide&apos;, &apos;Hide&apos;)}</DropdownMenuItem>
                <DropdownMenuItem>{t(&apos;postCard.report&apos;, &apos;Report&apos;)}</DropdownMenuItem>
                <DropdownMenuItem>{t(&apos;postCard.block&apos;, &apos;Block&apos;)}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  )
}
