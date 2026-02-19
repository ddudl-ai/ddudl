"use client"

import { useState } from "react"
import { useModerationQueue } from "@/hooks/useModerationQueue"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Checkbox } from "@/components/ui/checkbox"
import {
  AlertTriangle,
  CheckCircle,
  X,
  Eye,
  MessageSquare,
  User,
  Flag,
  Search,
  Loader2,
} from "lucide-react"

interface ModerationQueueProps {
  channelId: string
}

interface QueueItem {
  id: string
  type: 'post' | 'comment' | 'user'
  priority: 'critical' | 'high' | 'medium' | 'low'
  content: string
  author: {
    username: string
    karma: number
    accountAge: string
    violations: number
    avatar: string
  }
  ai: {
    confidence: number
    violations: string[]
    reasoning: string
  }
  reportedBy?: string
  reportReason?: string
  createdAt: string
  status: 'pending' | 'approved' | 'rejected' | 'escalated'
}

export function ModerationQueue({ channelId }: ModerationQueueProps) {
  const [statusFilter, setStatusFilter] = useState("pending")
  const [priorityFilter, setPriorityFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedItems, setSelectedItems] = useState<string[]>([])

  const { loading, error, refetch, processModerationAction } = useModerationQueue({
    channelId,
    status: statusFilter === 'all' ? undefined : statusFilter
  })

  // Mock queue items for demo - replace with real data from API
  const mockQueueItems: QueueItem[] = [
    {
      id: "1",
      type: "post",
      priority: "critical",
      content: "이 제품은 완전히 사기입니다. 절대 사지 마세요. 돈만 날립니다.",
      author: {
        username: "익명User123",
        karma: -15,
        accountAge: "3일",
        violations: 2,
        avatar: "/placeholder-user.jpg"
      },
      ai: {
        confidence: 95,
        violations: ["스팸", "허위정보"],
        reasoning: "부정적 언어 패턴과 제품 비방 내용이 감지되었습니다. 계정 생성 후 즉시 부정적 리뷰만 작성하는 패턴이 의심스럽습니다."
      },
      reportedBy: "user456",
      reportReason: "부적절한 내용",
      createdAt: "5분 전",
      status: "pending"
    },
    {
      id: "2",
      type: "comment",
      priority: "high",
      content: "너 정말 멍청하다. 이런 것도 모르냐?",
      author: {
        username: "화난User",
        karma: 245,
        accountAge: "2개월",
        violations: 1,
        avatar: "/placeholder-user.jpg"
      },
      ai: {
        confidence: 88,
        violations: ["괴롭힘", "혐오발언"],
        reasoning: "공격적인 언어와 개인 모독 표현이 감지되었습니다."
      },
      reportedBy: "user789",
      reportReason: "괴롭힘",
      createdAt: "12분 전",
      status: "pending"
    },
    {
      id: "3",
      type: "post",
      priority: "medium",
      content: "새로운 제품 리뷰입니다. 링크: suspicious-site.com/product",
      author: {
        username: "리뷰어123",
        karma: 89,
        accountAge: "1개월",
        violations: 0,
        avatar: "/placeholder-user.jpg"
      },
      ai: {
        confidence: 72,
        violations: ["의심스러운 링크"],
        reasoning: "외부 링크가 포함되어 있고, 신뢰도가 낮은 도메인으로 판단됩니다."
      },
      createdAt: "25분 전",
      status: "pending"
    }
  ]

  const handleModerationAction = async (action: 'approve' | 'reject' | 'escalate', itemId: string) => {
    try {
      await processModerationAction({
        queueItemId: itemId,
        action,
        reason: action === 'approve' ? '승인됨' : action === 'reject' ? '거부됨' : '에스컬레이션됨'
      })
    } catch (err) {
      console.error('Failed to process moderation action:', err)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-600'
      case 'high': return 'text-orange-600'
      case 'medium': return 'text-blue-600'
      case 'low': return 'text-green-600'
      default: return 'text-gray-600'
    }
  }

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'critical': return 'destructive' as const
      case 'high': return 'secondary' as const
      case 'medium': return 'outline' as const
      case 'low': return 'default' as const
      default: return 'outline' as const
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 85) return 'text-green-600'
    if (confidence >= 70) return 'text-yellow-600'
    return 'text-red-600'
  }

  const handleItemSelect = (itemId: string) => {
    setSelectedItems(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    )
  }

  const handleSelectAll = () => {
    const filteredItems = queueItems.filter(item =>
      (statusFilter === 'all' || item.status === statusFilter) &&
      (priorityFilter === 'all' || item.priority === priorityFilter) &&
      (typeFilter === 'all' || item.type === typeFilter)
    )

    if (selectedItems.length === filteredItems.length) {
      setSelectedItems([])
    } else {
      setSelectedItems(filteredItems.map(item => item.id))
    }
  }

  // Use mock data for now, replace with items from API when ready
  const queueItems = mockQueueItems

  const filteredItems = queueItems.filter(item => {
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter
    const matchesPriority = priorityFilter === 'all' || item.priority === priorityFilter
    const matchesType = typeFilter === 'all' || item.type === typeFilter
    const matchesSearch = searchQuery === '' ||
      item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.author.username.toLowerCase().includes(searchQuery.toLowerCase())

    return matchesStatus && matchesPriority && matchesType && matchesSearch
  })

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">모더레이션 큐</h1>
            <p className="text-muted-foreground mt-1">검토가 필요한 콘텐츠 관리</p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-sm">
              큐 크기: {loading ? '...' : filteredItems.length}
            </Badge>
            <Badge variant="secondary" className="text-sm">
              평균 응답시간: 12분
            </Badge>
            {loading && (
              <div className="flex items-center space-x-1">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">로딩 중...</span>
              </div>
            )}
          </div>
        </div>

        {/* Error State */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <span className="text-red-800">큐 데이터를 불러오는 중 오류가 발생했습니다: {error}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refetch}
                  className="ml-auto"
                >
                  재시도
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center space-x-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64"
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="상태" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="pending">대기중</SelectItem>
                  <SelectItem value="approved">승인됨</SelectItem>
                  <SelectItem value="rejected">거부됨</SelectItem>
                  <SelectItem value="escalated">에스컬레이션</SelectItem>
                </SelectContent>
              </Select>

              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="우선순위" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="critical">긴급</SelectItem>
                  <SelectItem value="high">높음</SelectItem>
                  <SelectItem value="medium">보통</SelectItem>
                  <SelectItem value="low">낮음</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="유형" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="post">게시물</SelectItem>
                  <SelectItem value="comment">댓글</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center space-x-2 ml-auto">
                <Checkbox
                  checked={selectedItems.length === filteredItems.length && filteredItems.length > 0}
                  onCheckedChange={handleSelectAll}
                />
                <label className="text-sm">전체 선택</label>
              </div>

              {selectedItems.length > 0 && (
                <div className="flex items-center space-x-2">
                  <Button size="sm" variant="outline">
                    일괄 승인 ({selectedItems.length})
                  </Button>
                  <Button size="sm" variant="outline">
                    일괄 거부 ({selectedItems.length})
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Queue Items */}
        <div className="space-y-4">
          {filteredItems.map((item) => (
            <Card key={item.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <Checkbox
                    checked={selectedItems.includes(item.id)}
                    onCheckedChange={() => handleItemSelect(item.id)}
                  />

                  <div className="flex-1 space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${getPriorityColor(item.priority)}`} />
                        {item.type === 'post' ? (
                          <MessageSquare className="h-4 w-4 text-muted-foreground" />
                        ) : item.type === 'comment' ? (
                          <MessageSquare className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <User className="h-4 w-4 text-muted-foreground" />
                        )}
                        <Badge variant={getPriorityBadgeVariant(item.priority)}>
                          {item.priority === 'critical' ? '긴급' :
                            item.priority === 'high' ? '높음' :
                              item.priority === 'medium' ? '보통' : '낮음'}
                        </Badge>
                        <span className="text-sm text-muted-foreground">{item.createdAt}</span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4 mr-1" />
                          세부사항
                        </Button>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="bg-muted/30 p-4 rounded-lg">
                      <p className="text-sm">{item.content}</p>
                    </div>

                    {/* Author Info & AI Analysis */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Author Info */}
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium">작성자 정보</h4>
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={item.author.avatar} alt={item.author.username} />
                            <AvatarFallback>{item.author.username[0]}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{item.author.username}</p>
                            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                              <span>Points: {item.author.karma}</span>
                              <span>•</span>
                              <span>계정: {item.author.accountAge}</span>
                              <span>•</span>
                              <span>위반: {item.author.violations}회</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* AI Analysis */}
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium">AI 분석</h4>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm">신뢰도</span>
                            <span className={`text-sm font-medium ${getConfidenceColor(item.ai.confidence)}`}>
                              {item.ai.confidence}%
                            </span>
                          </div>
                          <Progress value={item.ai.confidence} className="h-2" />
                          <div className="flex flex-wrap gap-1">
                            {item.ai.violations.map((violation) => (
                              <Badge key={violation} variant="secondary" className="text-xs">
                                {violation}
                              </Badge>
                            ))}
                          </div>
                          <p className="text-xs text-muted-foreground">{item.ai.reasoning}</p>
                        </div>
                      </div>
                    </div>

                    {/* Report Info */}
                    {item.reportedBy && (
                      <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <Flag className="h-4 w-4 text-yellow-600" />
                          <span className="text-sm font-medium">User 신고</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {item.reportedBy}님이 &ldquo;{item.reportReason}&rdquo; 사유로 신고
                        </p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center space-x-2 pt-2 border-t">
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => handleModerationAction('approve', item.id)}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        승인
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleModerationAction('reject', item.id)}
                      >
                        <X className="h-4 w-4 mr-1" />
                        거부
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleModerationAction('escalate', item.id)}
                      >
                        <AlertTriangle className="h-4 w-4 mr-1" />
                        에스컬레이션
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredItems.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">모든 항목이 처리되었습니다</h3>
              <p className="text-muted-foreground">현재 검토가 필요한 콘텐츠가 없습니다.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}