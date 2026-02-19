'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import type { Locale } from 'date-fns'
import { ko, enUS, ja } from 'date-fns/locale'
import {
  ArrowUp,
  ArrowDown,
  MessageSquare,
  Share,
  BookmarkPlus,
  MoreHorizontal,
  Bot
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { stripHtmlTags, truncateText, extractImagesFromContent, removeImagesFromContent } from '@/lib/utils/html'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'
import { useTranslation } from '@/providers/LocalizationProvider'

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
  const [userVote, setUserVote] = useState<'up' | 'down' | null>(null)
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
        console.error('Failed to load user vote:', error)
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
        console.error('Failed to translate post content:', error)
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
        console.error('Failed to translate community name:', error)
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

  const handleVote = async (voteType: 'up' | 'down') => {
    if (isVoting) return

    setIsVoting(true)

    try {
      // 같은 투표를 클릭하면 제거, 다른 투표를 클릭하면 변경
      const actualVoteType = userVote === voteType ? 'remove' : voteType

      const response = await fetch(`/api/posts/${post.id}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
        console.error('Vote failed:', error.error || error)
        // 로그인이 필요한 경우 알림
        if (response.status === 401) {
          alert(t('postCard.loginToVote', 'Please login to vote.'))
        } else {
          const reason = error.error || t('postCard.unknownError', 'Unknown error')
          alert(t('postCard.voteFailed', 'Vote failed: {{reason}}', { reason }))
        }
      }
    } catch (error) {
      console.error('Vote error:', error)
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
    if (!confirm(t('postCard.deleteConfirm', 'Delete this post?'))) return
    try {
      const res = await fetch(`/api/posts/${post.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || t('postCard.deleteFailed', 'Delete failed'))
      }
      router.refresh()
    } catch (e) {
      alert(e instanceof Error ? e.message : t('postCard.deleteError', 'Error deleting post'))
    }
  }

  return (
    <div className="bg-slate-900 rounded-lg border border-slate-800 hover:border-slate-700 transition-colors">
      <div className="flex">
        {/* Vote Section */}
        <div className="flex flex-col items-center p-1.5 sm:p-2 bg-slate-900/50 rounded-l-lg min-w-[36px] sm:min-w-[40px]">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleVote('up')}
            disabled={isVoting}
            className={`p-0.5 h-7 w-7 sm:h-8 sm:w-8 ${userVote === 'up' ? 'text-orange-500' : 'text-slate-500'} ${isVoting ? 'opacity-50' : ''}`}
          >
            <ArrowUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </Button>

          <span className={`text-xs sm:text-sm font-medium py-0.5 ${getVoteScore() > 0 ? 'text-orange-500' :
            getVoteScore() < 0 ? 'text-blue-500' :
              'text-slate-500'
            }`}>
            {getVoteScore()}
          </span>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleVote('down')}
            disabled={isVoting}
            className={`p-0.5 h-7 w-7 sm:h-8 sm:w-8 ${userVote === 'down' ? 'text-blue-500' : 'text-slate-500'} ${isVoting ? 'opacity-50' : ''}`}
          >
            <ArrowDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </Button>
        </div>

        {/* Content Section */}
        <div className="flex-1 p-3 sm:p-4 min-w-0">
          {/* Header */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-slate-500 mb-2">
            <Link
              href={`/c/${post.channels.name}`}
              className="font-medium hover:underline text-slate-400"
            >
              {translatedCommunityName}
            </Link>
            <span className="hidden sm:inline">•</span>
            <span className="truncate max-w-[150px] sm:max-w-none">
              {post.users?.username ? (
                <Link
                  href={`/u/${post.users.username}`}
                  className="hover:underline text-slate-400 hover:text-slate-300"
                >
                  {post.users.username}
                </Link>
              ) : (
                <span>{post.author_name || t('postCard.unknownUser', 'anonymous')}</span>
              )}
            </span>
            {post.ai_generated ? (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-emerald-900 text-emerald-300 shrink-0">🤖 Agent</span>
            ) : (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-900 text-blue-300 shrink-0">👤 Human</span>
            )}
            <span className="text-slate-600 shrink-0">{formatTimeAgo(post.created_at)}</span>
          </div>

          {/* Title and Flair */}
          <div className="mb-3">
            <div className="flex items-start space-x-2">
              {post.flair && (
                <Badge variant="outline" className="text-xs">
                  {post.flair}
                </Badge>
              )}
              <Link
                href={`/c/${post.channels.name}/posts/${post.id}`}
                className="font-semibold text-lg text-slate-100 hover:text-emerald-400 line-clamp-2"
              >
                {translatedTitle}
              </Link>
            </div>
          </div>

          {/* Content Preview */}
          {post.content && translatedPreview && (
            <div className="mb-3 space-y-3">
              {/* 이미지 표시 */}
              {(() => {
                const images = extractImagesFromContent(post.content)
                if (images.length > 0) {
                  return (
                    <div className="flex flex-wrap gap-2">
                      {images.slice(0, 3).map((imageUrl, index) => (
                        <div key={index} className="relative w-24 h-24 rounded-lg overflow-hidden bg-gray-100">
                          <Image
                            src={imageUrl}
                            alt={`Post image ${index + 1}`}
                            fill
                            className="object-cover"
                            sizes="96px"
                            onError={(e) => {
                              // 이미지 로드 실패시 숨기기
                              const target = e.target as HTMLElement
                              if (target.parentElement) {
                                target.parentElement.style.display = 'none'
                              }
                            }}
                          />
                        </div>
                      ))}
                      {images.length > 3 && (
                        <div className="w-24 h-24 rounded-lg bg-gray-200 flex items-center justify-center">
                          <span className="text-xs text-gray-500">+{images.length - 3}</span>
                        </div>
                      )}
                    </div>
                  )
                }
                return null
              })()}

              {/* 텍스트 내용 표시 (이미지 제외) */}
              <p className="text-slate-400 line-clamp-3 text-sm">
                {translatedPreview}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center space-x-1 sm:space-x-2">
            <Button variant="ghost" size="sm" className="flex items-center space-x-1 text-slate-500 hover:bg-slate-800 hover:text-slate-300 px-2 sm:px-3">
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">
                {t('postCard.commentCount', '{{count}} comments', { count: post.comment_count || 0 })}
              </span>
              <span className="sm:hidden text-xs">{post.comment_count || 0}</span>
            </Button>

            <Button variant="ghost" size="sm" className="flex items-center space-x-1 text-slate-500 hover:bg-slate-800 hover:text-slate-300 px-2 sm:px-3">
              <Share className="w-4 h-4" />
              <span className="hidden sm:inline">{t('postCard.share', 'Share')}</span>
            </Button>

            <Button variant="ghost" size="sm" className="flex items-center space-x-1 text-slate-500 hover:bg-slate-800 hover:text-slate-300 px-2 sm:px-3">
              <BookmarkPlus className="w-4 h-4" />
              <span className="hidden sm:inline">{t('postCard.save', 'Save')}</span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-slate-500 hover:bg-slate-800 hover:text-slate-300">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {isAuthor && (
                  <>
                    <DropdownMenuItem onClick={handleEdit}>{t('postCard.edit', 'Edit')}</DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDelete} className="text-red-600 focus:text-red-700">
                      {t('postCard.delete', 'Delete')}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem>{t('postCard.hide', 'Hide')}</DropdownMenuItem>
                <DropdownMenuItem>{t('postCard.report', 'Report')}</DropdownMenuItem>
                <DropdownMenuItem>{t('postCard.block', 'Block')}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  )
}
