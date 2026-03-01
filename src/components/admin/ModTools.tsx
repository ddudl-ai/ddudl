'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Shield, Eye, EyeOff, Trash2, RotateCcw, Pin, CheckCircle,
  Bot, User, ThumbsUp, ThumbsDown, Clock, FileText, MessageSquare
} from 'lucide-react'

interface QueueItem {
  type: 'post' | 'comment'
  id: string
  title: string | null
  content: string
  author_name: string
  vote_score: number
  upvotes: number
  downvotes: number
  ai_generated: boolean
  moderation_status: string
  created_at: string
}

type ModAction = 'approve' | 'hide' | 'delete' | 'restore' | 'pin'

export default function ModTools() {
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [actionInProgress, setActionInProgress] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const fetchQueue = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/mod-tools?view=queue')
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setQueue(data.queue || [])
    } catch {
      setMessage({ type: 'error', text: '리뷰 큐를 불러올 수 없습니다' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchQueue() }, [fetchQueue])

  const handleAction = async (item: QueueItem, action: ModAction, reason?: string) => {
    const key = `${item.type}-${item.id}-${action}`
    setActionInProgress(key)
    setMessage(null)
    try {
      const res = await fetch('/api/admin/mod-tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: item.type, id: item.id, action, reason }),
      })
      if (!res.ok) throw new Error('Action failed')

      // Remove from queue on success
      setQueue(prev => prev.filter(q => !(q.type === item.type && q.id === item.id)))
      const actionLabels: Record<string, string> = {
        approve: '승인', hide: '숨김', delete: '삭제', restore: '복원', pin: '고정',
      }
      setMessage({ type: 'success', text: `${item.type === 'post' ? '게시물' : '댓글'} ${actionLabels[action]} 완료` })
    } catch {
      setMessage({ type: 'error', text: '작업에 실패했습니다' })
    } finally {
      setActionInProgress(null)
    }
  }

  const formatTime = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime()
    const hours = Math.floor(diff / 3600000)
    if (hours < 1) return `${Math.floor(diff / 60000)}분 전`
    if (hours < 24) return `${hours}시간 전`
    return `${Math.floor(hours / 24)}일 전`
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Shield className="h-5 w-5" />
            모더레이션 도구
          </h3>
          <p className="text-sm text-gray-500">
            검토 대기 중인 콘텐츠를 관리하세요 (48시간 내 플래그/대기 항목)
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchQueue} disabled={loading}>
          새로고침
        </Button>
      </div>

      {message && (
        <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">로딩 중...</CardContent>
        </Card>
      ) : queue.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">검토할 항목이 없습니다</p>
            <p className="text-sm text-gray-400 mt-1">커뮤니티가 건강하게 운영되고 있어요 🌱</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">{queue.length}개 항목 검토 필요</p>
          {queue.map((item) => (
            <Card key={`${item.type}-${item.id}`} className="border-l-4 border-l-orange-300">
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  {/* Content info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {item.type === 'post' ? (
                        <FileText className="h-4 w-4 text-blue-500 shrink-0" />
                      ) : (
                        <MessageSquare className="h-4 w-4 text-orange-500 shrink-0" />
                      )}
                      <Badge variant="outline" className="text-xs">
                        {item.type === 'post' ? '게시물' : '댓글'}
                      </Badge>
                      {item.ai_generated && (
                        <Badge className="bg-purple-100 text-purple-700 text-xs gap-1">
                          <Bot className="h-3 w-3" /> AI
                        </Badge>
                      )}
                      {item.moderation_status === 'pending' && (
                        <Badge className="bg-yellow-100 text-yellow-700 text-xs">대기중</Badge>
                      )}
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTime(item.created_at)}
                      </span>
                    </div>

                    {item.title && (
                      <p className="font-medium text-sm mb-1 truncate">{item.title}</p>
                    )}
                    <p className="text-sm text-gray-600 line-clamp-2">{item.content}</p>

                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        {item.ai_generated ? <Bot className="h-3 w-3" /> : <User className="h-3 w-3" />}
                        {item.author_name}
                      </span>
                      <span className="flex items-center gap-1">
                        <ThumbsUp className="h-3 w-3 text-green-500" /> {item.upvotes}
                      </span>
                      <span className="flex items-center gap-1">
                        <ThumbsDown className="h-3 w-3 text-red-500" /> {item.downvotes}
                      </span>
                      <Badge variant={item.vote_score < 0 ? 'destructive' : 'secondary'} className="text-xs">
                        점수 {item.vote_score}
                      </Badge>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-green-600 hover:bg-green-50 gap-1"
                      disabled={actionInProgress !== null}
                      onClick={() => handleAction(item, 'approve')}
                    >
                      <Eye className="h-3 w-3" /> 승인
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-yellow-600 hover:bg-yellow-50 gap-1"
                      disabled={actionInProgress !== null}
                      onClick={() => handleAction(item, 'hide')}
                    >
                      <EyeOff className="h-3 w-3" /> 숨김
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:bg-red-50 gap-1"
                      disabled={actionInProgress !== null}
                      onClick={() => handleAction(item, 'delete')}
                    >
                      <Trash2 className="h-3 w-3" /> 삭제
                    </Button>
                    {item.type === 'post' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-blue-600 hover:bg-blue-50 gap-1"
                        disabled={actionInProgress !== null}
                        onClick={() => handleAction(item, 'pin')}
                      >
                        <Pin className="h-3 w-3" /> 고정
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
