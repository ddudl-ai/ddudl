"use client&quot;

import { useState } from &quot;react&quot;
import { useModerationQueue } from &quot;@/hooks/useModerationQueue&quot;
import { Card, CardContent } from &quot;@/components/ui/card&quot;
import { Badge } from &quot;@/components/ui/badge&quot;
import { Button } from &quot;@/components/ui/button&quot;
import { Avatar, AvatarFallback, AvatarImage } from &quot;@/components/ui/avatar&quot;
import { Input } from &quot;@/components/ui/input&quot;
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from &quot;@/components/ui/select&quot;
import { Progress } from &quot;@/components/ui/progress&quot;
import { Checkbox } from &quot;@/components/ui/checkbox&quot;
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
} from &quot;lucide-react&quot;

interface ModerationQueueProps {
  channelId: string
}

interface QueueItem {
  id: string
  type: &apos;post&apos; | &apos;comment&apos; | &apos;user&apos;
  priority: &apos;critical&apos; | &apos;high&apos; | &apos;medium&apos; | &apos;low&apos;
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
  status: &apos;pending&apos; | &apos;approved&apos; | &apos;rejected&apos; | &apos;escalated&apos;
}

export function ModerationQueue({ channelId }: ModerationQueueProps) {
  const [statusFilter, setStatusFilter] = useState(&quot;pending&quot;)
  const [priorityFilter, setPriorityFilter] = useState(&quot;all&quot;)
  const [typeFilter, setTypeFilter] = useState(&quot;all&quot;)
  const [searchQuery, setSearchQuery] = useState(&quot;")
  const [selectedItems, setSelectedItems] = useState<string[]>([])

  const { loading, error, refetch, processModerationAction } = useModerationQueue({
    channelId,
    status: statusFilter === &apos;all&apos; ? undefined : statusFilter
  })

  // Mock queue items for demo - replace with real data from API
  const mockQueueItems: QueueItem[] = [
    {
      id: &quot;1&quot;,
      type: &quot;post&quot;,
      priority: &quot;critical&quot;,
      content: &quot;이 제품은 완전히 사기입니다. 절대 사지 마세요. 돈만 날립니다.&quot;,
      author: {
        username: &quot;익명User123&quot;,
        karma: -15,
        accountAge: &quot;3일&quot;,
        violations: 2,
        avatar: &quot;/placeholder-user.jpg&quot;
      },
      ai: {
        confidence: 95,
        violations: [&quot;스팸&quot;, &quot;허위정보&quot;],
        reasoning: &quot;부정적 언어 패턴과 제품 비방 내용이 감지되었습니다. 계정 생성 후 즉시 부정적 리뷰만 작성하는 패턴이 의심스럽습니다.&quot;
      },
      reportedBy: &quot;user456&quot;,
      reportReason: &quot;부적절한 내용&quot;,
      createdAt: &quot;5분 전&quot;,
      status: &quot;pending&quot;
    },
    {
      id: &quot;2&quot;,
      type: &quot;comment&quot;,
      priority: &quot;high&quot;,
      content: &quot;너 정말 멍청하다. 이런 것도 모르냐?&quot;,
      author: {
        username: &quot;화난User&quot;,
        karma: 245,
        accountAge: &quot;2개월&quot;,
        violations: 1,
        avatar: &quot;/placeholder-user.jpg&quot;
      },
      ai: {
        confidence: 88,
        violations: [&quot;괴롭힘&quot;, &quot;혐오발언&quot;],
        reasoning: &quot;공격적인 언어와 개인 모독 표현이 감지되었습니다.&quot;
      },
      reportedBy: &quot;user789&quot;,
      reportReason: &quot;괴롭힘&quot;,
      createdAt: &quot;12분 전&quot;,
      status: &quot;pending&quot;
    },
    {
      id: &quot;3&quot;,
      type: &quot;post&quot;,
      priority: &quot;medium&quot;,
      content: &quot;새로운 제품 리뷰입니다. 링크: suspicious-site.com/product&quot;,
      author: {
        username: &quot;리뷰어123&quot;,
        karma: 89,
        accountAge: &quot;1개월&quot;,
        violations: 0,
        avatar: &quot;/placeholder-user.jpg&quot;
      },
      ai: {
        confidence: 72,
        violations: [&quot;의심스러운 링크&quot;],
        reasoning: &quot;외부 링크가 포함되어 있고, 신뢰도가 낮은 도메인으로 판단됩니다.&quot;
      },
      createdAt: &quot;25분 전&quot;,
      status: &quot;pending&quot;
    }
  ]

  const handleModerationAction = async (action: &apos;approve&apos; | &apos;reject&apos; | &apos;escalate&apos;, itemId: string) => {
    try {
      await processModerationAction({
        queueItemId: itemId,
        action,
        reason: action === &apos;approve&apos; ? &apos;승인됨&apos; : action === &apos;reject&apos; ? &apos;거부됨&apos; : &apos;에스컬레이션됨&apos;
      })
    } catch (err) {
      console.error(&apos;Failed to process moderation action:&apos;, err)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case &apos;critical&apos;: return &apos;text-red-600&apos;
      case &apos;high&apos;: return &apos;text-orange-600&apos;
      case &apos;medium&apos;: return &apos;text-blue-600&apos;
      case &apos;low&apos;: return &apos;text-green-600&apos;
      default: return &apos;text-gray-600&apos;
    }
  }

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case &apos;critical&apos;: return &apos;destructive&apos; as const
      case &apos;high&apos;: return &apos;secondary&apos; as const
      case &apos;medium&apos;: return &apos;outline&apos; as const
      case &apos;low&apos;: return &apos;default&apos; as const
      default: return &apos;outline&apos; as const
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 85) return &apos;text-green-600&apos;
    if (confidence >= 70) return &apos;text-yellow-600&apos;
    return &apos;text-red-600&apos;
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
      (statusFilter === &apos;all&apos; || item.status === statusFilter) &&
      (priorityFilter === &apos;all&apos; || item.priority === priorityFilter) &&
      (typeFilter === &apos;all&apos; || item.type === typeFilter)
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
    const matchesStatus = statusFilter === &apos;all&apos; || item.status === statusFilter
    const matchesPriority = priorityFilter === &apos;all&apos; || item.priority === priorityFilter
    const matchesType = typeFilter === &apos;all&apos; || item.type === typeFilter
    const matchesSearch = searchQuery === &apos;' ||
      item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.author.username.toLowerCase().includes(searchQuery.toLowerCase())

    return matchesStatus && matchesPriority && matchesType && matchesSearch
  })

  return (
    <div className=&quot;min-h-screen bg-background p-6&quot;>
      <div className=&quot;max-w-7xl mx-auto space-y-6&quot;>
        {/* Header */}
        <div className=&quot;flex items-center justify-between&quot;>
          <div>
            <h1 className=&quot;text-3xl font-bold text-foreground&quot;>모더레이션 큐</h1>
            <p className=&quot;text-muted-foreground mt-1&quot;>검토가 필요한 콘텐츠 관리</p>
          </div>
          <div className=&quot;flex items-center space-x-2&quot;>
            <Badge variant=&quot;outline&quot; className=&quot;text-sm&quot;>
              큐 크기: {loading ? &apos;...&apos; : filteredItems.length}
            </Badge>
            <Badge variant=&quot;secondary&quot; className=&quot;text-sm&quot;>
              평균 응답시간: 12분
            </Badge>
            {loading && (
              <div className=&quot;flex items-center space-x-1&quot;>
                <Loader2 className=&quot;h-4 w-4 animate-spin&quot; />
                <span className=&quot;text-sm text-muted-foreground&quot;>로딩 중...</span>
              </div>
            )}
          </div>
        </div>

        {/* Error State */}
        {error && (
          <Card className=&quot;border-red-200 bg-red-50&quot;>
            <CardContent className=&quot;p-6&quot;>
              <div className=&quot;flex items-center space-x-2&quot;>
                <AlertTriangle className=&quot;h-5 w-5 text-red-600&quot; />
                <span className=&quot;text-red-800&quot;>큐 데이터를 불러오는 중 오류가 발생했습니다: {error}</span>
                <Button
                  variant=&quot;outline&quot;
                  size=&quot;sm&quot;
                  onClick={refetch}
                  className=&quot;ml-auto&quot;
                >
                  재시도
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card>
          <CardContent className=&quot;p-4&quot;>
            <div className=&quot;flex flex-wrap items-center gap-4&quot;>
              <div className=&quot;flex items-center space-x-2&quot;>
                <Search className=&quot;h-4 w-4 text-muted-foreground&quot; />
                <Input
                  placeholder=&quot;검색...&quot;
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className=&quot;w-64&quot;
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className=&quot;w-32&quot;>
                  <SelectValue placeholder=&quot;상태&quot; />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=&quot;all&quot;>전체</SelectItem>
                  <SelectItem value=&quot;pending&quot;>대기중</SelectItem>
                  <SelectItem value=&quot;approved&quot;>승인됨</SelectItem>
                  <SelectItem value=&quot;rejected&quot;>거부됨</SelectItem>
                  <SelectItem value=&quot;escalated&quot;>에스컬레이션</SelectItem>
                </SelectContent>
              </Select>

              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className=&quot;w-32&quot;>
                  <SelectValue placeholder=&quot;우선순위&quot; />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=&quot;all&quot;>전체</SelectItem>
                  <SelectItem value=&quot;critical&quot;>긴급</SelectItem>
                  <SelectItem value=&quot;high&quot;>높음</SelectItem>
                  <SelectItem value=&quot;medium&quot;>보통</SelectItem>
                  <SelectItem value=&quot;low&quot;>낮음</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className=&quot;w-32&quot;>
                  <SelectValue placeholder=&quot;유형&quot; />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=&quot;all&quot;>전체</SelectItem>
                  <SelectItem value=&quot;post&quot;>게시물</SelectItem>
                  <SelectItem value=&quot;comment&quot;>댓글</SelectItem>
                  <SelectItem value=&quot;user&quot;>User</SelectItem>
                </SelectContent>
              </Select>

              <div className=&quot;flex items-center space-x-2 ml-auto&quot;>
                <Checkbox
                  checked={selectedItems.length === filteredItems.length && filteredItems.length > 0}
                  onCheckedChange={handleSelectAll}
                />
                <label className=&quot;text-sm&quot;>전체 선택</label>
              </div>

              {selectedItems.length > 0 && (
                <div className=&quot;flex items-center space-x-2&quot;>
                  <Button size=&quot;sm&quot; variant=&quot;outline&quot;>
                    일괄 승인 ({selectedItems.length})
                  </Button>
                  <Button size=&quot;sm&quot; variant=&quot;outline&quot;>
                    일괄 거부 ({selectedItems.length})
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Queue Items */}
        <div className=&quot;space-y-4&quot;>
          {filteredItems.map((item) => (
            <Card key={item.id} className=&quot;hover:shadow-md transition-shadow&quot;>
              <CardContent className=&quot;p-6&quot;>
                <div className=&quot;flex items-start space-x-4&quot;>
                  <Checkbox
                    checked={selectedItems.includes(item.id)}
                    onCheckedChange={() => handleItemSelect(item.id)}
                  />

                  <div className=&quot;flex-1 space-y-4&quot;>
                    {/* Header */}
                    <div className=&quot;flex items-center justify-between&quot;>
                      <div className=&quot;flex items-center space-x-3&quot;>
                        <div className={`w-3 h-3 rounded-full ${getPriorityColor(item.priority)}`} />
                        {item.type === &apos;post&apos; ? (
                          <MessageSquare className=&quot;h-4 w-4 text-muted-foreground&quot; />
                        ) : item.type === &apos;comment&apos; ? (
                          <MessageSquare className=&quot;h-4 w-4 text-muted-foreground&quot; />
                        ) : (
                          <User className=&quot;h-4 w-4 text-muted-foreground&quot; />
                        )}
                        <Badge variant={getPriorityBadgeVariant(item.priority)}>
                          {item.priority === &apos;critical&apos; ? &apos;긴급&apos; :
                            item.priority === &apos;high&apos; ? &apos;높음&apos; :
                              item.priority === &apos;medium&apos; ? &apos;보통&apos; : &apos;낮음&apos;}
                        </Badge>
                        <span className=&quot;text-sm text-muted-foreground&quot;>{item.createdAt}</span>
                      </div>

                      <div className=&quot;flex items-center space-x-2&quot;>
                        <Button size=&quot;sm&quot; variant=&quot;outline&quot;>
                          <Eye className=&quot;h-4 w-4 mr-1&quot; />
                          세부사항
                        </Button>
                      </div>
                    </div>

                    {/* Content */}
                    <div className=&quot;bg-muted/30 p-4 rounded-lg&quot;>
                      <p className=&quot;text-sm&quot;>{item.content}</p>
                    </div>

                    {/* Author Info & AI Analysis */}
                    <div className=&quot;grid grid-cols-1 md:grid-cols-2 gap-4&quot;>
                      {/* Author Info */}
                      <div className=&quot;space-y-2&quot;>
                        <h4 className=&quot;text-sm font-medium&quot;>작성자 정보</h4>
                        <div className=&quot;flex items-center space-x-3&quot;>
                          <Avatar className=&quot;h-8 w-8&quot;>
                            <AvatarImage src={item.author.avatar} alt={item.author.username} />
                            <AvatarFallback>{item.author.username[0]}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className=&quot;text-sm font-medium&quot;>{item.author.username}</p>
                            <div className=&quot;flex items-center space-x-2 text-xs text-muted-foreground&quot;>
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
                      <div className=&quot;space-y-2&quot;>
                        <h4 className=&quot;text-sm font-medium&quot;>AI 분석</h4>
                        <div className=&quot;space-y-2&quot;>
                          <div className=&quot;flex items-center justify-between&quot;>
                            <span className=&quot;text-sm&quot;>신뢰도</span>
                            <span className={`text-sm font-medium ${getConfidenceColor(item.ai.confidence)}`}>
                              {item.ai.confidence}%
                            </span>
                          </div>
                          <Progress value={item.ai.confidence} className=&quot;h-2&quot; />
                          <div className=&quot;flex flex-wrap gap-1&quot;>
                            {item.ai.violations.map((violation) => (
                              <Badge key={violation} variant=&quot;secondary&quot; className=&quot;text-xs&quot;>
                                {violation}
                              </Badge>
                            ))}
                          </div>
                          <p className=&quot;text-xs text-muted-foreground&quot;>{item.ai.reasoning}</p>
                        </div>
                      </div>
                    </div>

                    {/* Report Info */}
                    {item.reportedBy && (
                      <div className=&quot;bg-yellow-50 border border-yellow-200 p-3 rounded-lg&quot;>
                        <div className=&quot;flex items-center space-x-2&quot;>
                          <Flag className=&quot;h-4 w-4 text-yellow-600&quot; />
                          <span className=&quot;text-sm font-medium&quot;>User 신고</span>
                        </div>
                        <p className=&quot;text-sm text-muted-foreground mt-1&quot;>
                          {item.reportedBy}님이 &ldquo;{item.reportReason}&rdquo; 사유로 신고
                        </p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className=&quot;flex items-center space-x-2 pt-2 border-t&quot;>
                      <Button
                        size=&quot;sm&quot;
                        className=&quot;bg-green-600 hover:bg-green-700&quot;
                        onClick={() => handleModerationAction(&apos;approve&apos;, item.id)}
                      >
                        <CheckCircle className=&quot;h-4 w-4 mr-1&quot; />
                        승인
                      </Button>
                      <Button
                        size=&quot;sm&quot;
                        variant=&quot;destructive&quot;
                        onClick={() => handleModerationAction(&apos;reject&apos;, item.id)}
                      >
                        <X className=&quot;h-4 w-4 mr-1&quot; />
                        거부
                      </Button>
                      <Button
                        size=&quot;sm&quot;
                        variant=&quot;outline&quot;
                        onClick={() => handleModerationAction(&apos;escalate&apos;, item.id)}
                      >
                        <AlertTriangle className=&quot;h-4 w-4 mr-1&quot; />
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
            <CardContent className=&quot;p-12 text-center&quot;>
              <CheckCircle className=&quot;h-12 w-12 text-green-600 mx-auto mb-4&quot; />
              <h3 className=&quot;text-lg font-medium mb-2&quot;>모든 항목이 처리되었습니다</h3>
              <p className=&quot;text-muted-foreground&quot;>현재 검토가 필요한 콘텐츠가 없습니다.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}