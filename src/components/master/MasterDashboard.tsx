"use client&quot;

import { useState } from &quot;react&quot;
import { Card, CardContent, CardHeader, CardTitle } from &quot;@/components/ui/card&quot;
import { Badge } from &quot;@/components/ui/badge&quot;
import { Button } from &quot;@/components/ui/button&quot;
import { Avatar, AvatarFallback, AvatarImage } from &quot;@/components/ui/avatar&quot;
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from &quot;@/components/ui/select&quot;
import { Progress } from &quot;@/components/ui/progress&quot;
import { useMasterDashboard } from &quot;@/hooks/useMasterDashboard&quot;
import {
  TrendingUp,
  Users,
  AlertTriangle,
  CheckCircle,
  Eye,
  Clock,
  Flag,
  BarChart3,
} from &quot;lucide-react&quot;
import { LoadingSpinner } from &quot;@/components/common/LoadingSpinner&quot;
import { ErrorBoundary } from &quot;@/components/common/ErrorBoundary&quot;

interface MasterDashboardProps {
  channelId: string
}

interface ActivityItem {
  id: string
  user: string
  avatar: string
  content: string
  aiScore: number
  time: string
  type: &apos;post&apos; | &apos;comment&apos;
}

export function MasterDashboard({ channelId }: MasterDashboardProps) {
  const [timePeriod, setTimePeriod] = useState<&apos;24h&apos; | &apos;7d&apos; | &apos;30d&apos;>(&apos;24h&apos;)

  const { stats, loading, error, refetch } = useMasterDashboard({
    channelId,
    period: timePeriod
  })

  const handlePeriodChange = (value: string) => {
    const period = value === &apos;24시간&apos; ? &apos;24h&apos; : value === &apos;7일&apos; ? &apos;7d&apos; : &apos;30d&apos;
    setTimePeriod(period)
  }

  const getCurrentPeriodLabel = () => {
    switch (timePeriod) {
      case &apos;24h&apos;: return &apos;24시간&apos;
      case &apos;7d&apos;: return &apos;7일&apos;
      case &apos;30d&apos;: return &apos;30일&apos;
      default: return &apos;24시간&apos;
    }
  }

  // Mock activity feed - in real app, this would come from API
  const activityFeed: ActivityItem[] = [
    {
      id: &quot;1&quot;,
      user: &quot;김철수&quot;,
      avatar: &quot;/placeholder-user.jpg&quot;,
      content: &quot;새로운 기술 트렌드에 대한 토론을 시작했습니다. AI와 머신러닝의 미래는...&quot;,
      aiScore: 85,
      time: &quot;2분 전&quot;,
      type: &quot;post&quot;,
    },
    {
      id: &quot;2&quot;,
      user: &quot;박영희&quot;,
      avatar: &quot;/placeholder-user.jpg&quot;,
      content: &quot;정말 유용한 정보네요! 추가로 질문이 있는데...&quot;,
      aiScore: 92,
      time: &quot;5분 전&quot;,
      type: &quot;comment&quot;,
    },
    {
      id: &quot;3&quot;,
      user: &quot;이민수&quot;,
      avatar: &quot;/placeholder-user.jpg&quot;,
      content: &quot;이 제품 리뷰를 공유합니다. 실제 사용해본 경험을 바탕으로...&quot;,
      aiScore: 78,
      time: &quot;8분 전&quot;,
      type: &quot;post&quot;,
    },
  ]

  const violationsData = [
    { name: &quot;스팸&quot;, count: 45 },
    { name: &quot;혐오발언&quot;, count: 32 },
    { name: &quot;부적절한 콘텐츠&quot;, count: 28 },
    { name: &quot;괴롭힘&quot;, count: 19 },
    { name: &quot;저작권 침해&quot;, count: 12 },
  ]


  const getAiScoreBadgeVariant = (score: number) => {
    if (score >= 85) return &quot;default&quot; as const
    if (score >= 70) return &quot;secondary&quot; as const
    return &quot;destructive&quot; as const
  }

  return (
    <ErrorBoundary>
      <div className=&quot;min-h-screen bg-background p-6&quot;>
        <div className=&quot;max-w-7xl mx-auto space-y-6&quot;>
          {/* Header */}
          <div className=&quot;flex items-center justify-between&quot;>
            <div>
              <h1 className=&quot;text-3xl font-bold text-foreground&quot;>마스터 대시보드</h1>
              <p className=&quot;text-muted-foreground mt-1&quot;>커뮤니티 관리 및 모더레이션 현황</p>
            </div>
            <Select value={getCurrentPeriodLabel()} onValueChange={handlePeriodChange}>
              <SelectTrigger className=&quot;w-32&quot;>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value=&quot;24시간&quot;>24시간</SelectItem>
                <SelectItem value=&quot;7일&quot;>7일</SelectItem>
                <SelectItem value=&quot;30일&quot;>30일</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Error State */}
          {error && (
            <Card className=&quot;border-red-200 bg-red-50&quot;>
              <CardContent className=&quot;p-6&quot;>
                <div className=&quot;flex items-center space-x-2&quot;>
                  <AlertTriangle className=&quot;h-5 w-5 text-red-600&quot; />
                  <span className=&quot;text-red-800&quot;>데이터를 불러오는 중 오류가 발생했습니다: {error}</span>
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

          {/* Stats Cards */}
          <div className=&quot;grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6&quot;>
            <Card>
              <CardHeader className=&quot;flex flex-row items-center justify-between space-y-0 pb-2&quot;>
                <CardTitle className=&quot;text-sm font-medium&quot;>총 게시물</CardTitle>
                <TrendingUp className=&quot;h-4 w-4 text-muted-foreground&quot; />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <LoadingSpinner size=&quot;sm&quot; text=&quot;로딩 중...&quot; />
                ) : (
                  <>
                    <div className=&quot;text-2xl font-bold&quot;>
                      {stats?.overview.totalPosts.toLocaleString() || 0}
                    </div>
                    <p className=&quot;text-xs text-muted-foreground&quot;>
                      <span className=&quot;text-green-600&quot;>+{stats?.overview.growth || 0}%</span> 전 기간 대비
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className=&quot;flex flex-row items-center justify-between space-y-0 pb-2&quot;>
                <CardTitle className=&quot;text-sm font-medium&quot;>활성 User</CardTitle>
                <Users className=&quot;h-4 w-4 text-muted-foreground&quot; />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <LoadingSpinner size=&quot;sm&quot; text=&quot;로딩 중...&quot; />
                ) : (
                  <>
                    <div className=&quot;text-2xl font-bold&quot;>
                      {stats?.overview.activeUsers.toLocaleString() || 0}
                    </div>
                    <div className=&quot;flex items-center mt-1&quot;>
                      <div className=&quot;w-2 h-2 bg-green-500 rounded-full mr-1&quot;></div>
                      <p className=&quot;text-xs text-muted-foreground&quot;>온라인</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className=&quot;flex flex-row items-center justify-between space-y-0 pb-2&quot;>
                <CardTitle className=&quot;text-sm font-medium&quot;>대기중 검토</CardTitle>
                <AlertTriangle className=&quot;h-4 w-4 text-muted-foreground&quot; />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <LoadingSpinner size=&quot;sm&quot; text=&quot;로딩 중...&quot; />
                ) : (
                  <>
                    <div className=&quot;text-2xl font-bold&quot;>
                      {stats?.moderation.queueSize || 0}
                    </div>
                    <div className=&quot;flex items-center mt-1&quot;>
                      <Badge variant=&quot;secondary&quot; className=&quot;text-xs&quot;>높음</Badge>
                      <span className=&quot;text-xs text-muted-foreground ml-1&quot;>우선순위</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className=&quot;flex flex-row items-center justify-between space-y-0 pb-2&quot;>
                <CardTitle className=&quot;text-sm font-medium&quot;>AI 정확도</CardTitle>
                <CheckCircle className=&quot;h-4 w-4 text-muted-foreground&quot; />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <LoadingSpinner size=&quot;sm&quot; text=&quot;로딩 중...&quot; />
                ) : (
                  <>
                    <div className=&quot;text-2xl font-bold&quot;>
                      {stats?.moderation.accuracy.toFixed(1) || 0}%
                    </div>
                    <Progress value={stats?.moderation.accuracy || 0} className=&quot;mt-2 h-2&quot; />
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className=&quot;grid grid-cols-1 lg:grid-cols-3 gap-6&quot;>
            {/* Activity Feed */}
            <div className=&quot;lg:col-span-2&quot;>
              <Card>
                <CardHeader>
                  <CardTitle className=&quot;flex items-center&quot;>
                    <Eye className=&quot;h-5 w-5 mr-2&quot; />
                    실시간 활동
                  </CardTitle>
                </CardHeader>
                <CardContent className=&quot;space-y-4&quot;>
                  {activityFeed.map((item) => (
                    <div key={item.id} className=&quot;flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors&quot;>
                      <Avatar className=&quot;h-10 w-10&quot;>
                        <AvatarImage src={item.avatar} alt={item.user} />
                        <AvatarFallback>{item.user[0]}</AvatarFallback>
                      </Avatar>
                      <div className=&quot;flex-1 min-w-0&quot;>
                        <div className=&quot;flex items-center justify-between&quot;>
                          <p className=&quot;text-sm font-medium text-foreground&quot;>{item.user}</p>
                          <div className=&quot;flex items-center space-x-2&quot;>
                            <Badge variant={getAiScoreBadgeVariant(item.aiScore)} className=&quot;text-xs&quot;>
                              AI {item.aiScore}
                            </Badge>
                            <span className=&quot;text-xs text-muted-foreground&quot;>{item.time}</span>
                          </div>
                        </div>
                        <p className=&quot;text-sm text-muted-foreground mt-1 truncate&quot;>{item.content}</p>
                        <div className=&quot;flex items-center space-x-2 mt-2&quot;>
                          <Button size=&quot;sm&quot; variant=&quot;outline&quot; className=&quot;h-7 text-xs&quot;>
                            승인
                          </Button>
                          <Button size=&quot;sm&quot; variant=&quot;outline&quot; className=&quot;h-7 text-xs&quot;>
                            거부
                          </Button>
                          <Button size=&quot;sm&quot; variant=&quot;outline&quot; className=&quot;h-7 text-xs&quot;>
                            검토
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Right Sidebar */}
            <div className=&quot;space-y-6&quot;>
              {/* Moderation Queue Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className=&quot;flex items-center&quot;>
                    <Flag className=&quot;h-5 w-5 mr-2&quot; />
                    모더레이션 큐
                  </CardTitle>
                </CardHeader>
                <CardContent className=&quot;space-y-3&quot;>
                  <div className=&quot;flex items-center justify-between&quot;>
                    <span className=&quot;text-sm&quot;>대기중</span>
                    <Badge variant=&quot;secondary&quot;>23</Badge>
                  </div>
                  <div className=&quot;flex items-center justify-between&quot;>
                    <span className=&quot;text-sm&quot;>긴급</span>
                    <Badge variant=&quot;destructive&quot;>5</Badge>
                  </div>
                  <div className=&quot;flex items-center justify-between&quot;>
                    <span className=&quot;text-sm&quot;>높음</span>
                    <Badge variant=&quot;secondary&quot;>8</Badge>
                  </div>
                  <div className=&quot;flex items-center justify-between&quot;>
                    <span className=&quot;text-sm&quot;>보통</span>
                    <Badge variant=&quot;outline&quot;>10</Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Top Violations */}
              <Card>
                <CardHeader>
                  <CardTitle className=&quot;flex items-center&quot;>
                    <BarChart3 className=&quot;h-5 w-5 mr-2&quot; />
                    주요 위반사항
                  </CardTitle>
                </CardHeader>
                <CardContent className=&quot;space-y-3&quot;>
                  {violationsData.map((violation) => (
                    <div key={violation.name} className=&quot;flex items-center justify-between&quot;>
                      <span className=&quot;text-sm&quot;>{violation.name}</span>
                      <div className=&quot;flex items-center space-x-2&quot;>
                        <div className=&quot;w-16 bg-muted rounded-full h-2&quot;>
                          <div
                            className=&quot;bg-primary h-2 rounded-full&quot;
                            style={{ width: `${(violation.count / violationsData[0].count) * 100}%` }}
                          />
                        </div>
                        <span className=&quot;text-sm font-medium w-6 text-right&quot;>{violation.count}</span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Recent Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className=&quot;flex items-center&quot;>
                    <Clock className=&quot;h-5 w-5 mr-2&quot; />
                    최근 조치
                  </CardTitle>
                </CardHeader>
                <CardContent className=&quot;space-y-3&quot;>
                  <div className=&quot;text-sm space-y-2&quot;>
                    <div className=&quot;flex items-center justify-between&quot;>
                      <span>게시물 승인</span>
                      <span className=&quot;text-muted-foreground&quot;>2분 전</span>
                    </div>
                    <div className=&quot;flex items-center justify-between&quot;>
                      <span>User 차단</span>
                      <span className=&quot;text-muted-foreground&quot;>5분 전</span>
                    </div>
                    <div className=&quot;flex items-center justify-between&quot;>
                      <span>댓글 삭제</span>
                      <span className=&quot;text-muted-foreground&quot;>8분 전</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  )
}