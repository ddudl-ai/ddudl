"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { useMasterDashboard } from "@/hooks/useMasterDashboard"
import {
  TrendingUp,
  Users,
  AlertTriangle,
  CheckCircle,
  Eye,
  Clock,
  Flag,
  BarChart3,
} from "lucide-react"
import { LoadingSpinner } from "@/components/common/LoadingSpinner"
import { ErrorBoundary } from "@/components/common/ErrorBoundary"

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
  type: 'post' | 'comment'
}

export function MasterDashboard({ channelId }: MasterDashboardProps) {
  const [timePeriod, setTimePeriod] = useState<'24h' | '7d' | '30d'>('24h')

  const { stats, loading, error, refetch } = useMasterDashboard({
    channelId,
    period: timePeriod
  })

  const handlePeriodChange = (value: string) => {
    const period = value === '24시간' ? '24h' : value === '7일' ? '7d' : '30d'
    setTimePeriod(period)
  }

  const getCurrentPeriodLabel = () => {
    switch (timePeriod) {
      case '24h': return '24시간'
      case '7d': return '7일'
      case '30d': return '30일'
      default: return '24시간'
    }
  }

  // Mock activity feed - in real app, this would come from API
  const activityFeed: ActivityItem[] = [
    {
      id: "1",
      user: "김철수",
      avatar: "/placeholder-user.jpg",
      content: "새로운 기술 트렌드에 대한 토론을 시작했습니다. AI와 머신러닝의 미래는...",
      aiScore: 85,
      time: "2분 전",
      type: "post",
    },
    {
      id: "2",
      user: "박영희",
      avatar: "/placeholder-user.jpg",
      content: "정말 유용한 정보네요! 추가로 질문이 있는데...",
      aiScore: 92,
      time: "5분 전",
      type: "comment",
    },
    {
      id: "3",
      user: "이민수",
      avatar: "/placeholder-user.jpg",
      content: "이 제품 리뷰를 공유합니다. 실제 사용해본 경험을 바탕으로...",
      aiScore: 78,
      time: "8분 전",
      type: "post",
    },
  ]

  const violationsData = [
    { name: "스팸", count: 45 },
    { name: "혐오발언", count: 32 },
    { name: "부적절한 콘텐츠", count: 28 },
    { name: "괴롭힘", count: 19 },
    { name: "저작권 침해", count: 12 },
  ]


  const getAiScoreBadgeVariant = (score: number) => {
    if (score >= 85) return "default" as const
    if (score >= 70) return "secondary" as const
    return "destructive" as const
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">마스터 대시보드</h1>
              <p className="text-muted-foreground mt-1">커뮤니티 관리 및 모더레이션 현황</p>
            </div>
            <Select value={getCurrentPeriodLabel()} onValueChange={handlePeriodChange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24시간">24시간</SelectItem>
                <SelectItem value="7일">7일</SelectItem>
                <SelectItem value="30일">30일</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Error State */}
          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <span className="text-red-800">데이터를 불러오는 중 오류가 발생했습니다: {error}</span>
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

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">총 게시물</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <LoadingSpinner size="sm" text="로딩 중..." />
                ) : (
                  <>
                    <div className="text-2xl font-bold">
                      {stats?.overview.totalPosts.toLocaleString() || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      <span className="text-green-600">+{stats?.overview.growth || 0}%</span> 전 기간 대비
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">활성 User</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <LoadingSpinner size="sm" text="로딩 중..." />
                ) : (
                  <>
                    <div className="text-2xl font-bold">
                      {stats?.overview.activeUsers.toLocaleString() || 0}
                    </div>
                    <div className="flex items-center mt-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                      <p className="text-xs text-muted-foreground">온라인</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">대기중 검토</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <LoadingSpinner size="sm" text="로딩 중..." />
                ) : (
                  <>
                    <div className="text-2xl font-bold">
                      {stats?.moderation.queueSize || 0}
                    </div>
                    <div className="flex items-center mt-1">
                      <Badge variant="secondary" className="text-xs">높음</Badge>
                      <span className="text-xs text-muted-foreground ml-1">우선순위</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">AI 정확도</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <LoadingSpinner size="sm" text="로딩 중..." />
                ) : (
                  <>
                    <div className="text-2xl font-bold">
                      {stats?.moderation.accuracy.toFixed(1) || 0}%
                    </div>
                    <Progress value={stats?.moderation.accuracy || 0} className="mt-2 h-2" />
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Activity Feed */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Eye className="h-5 w-5 mr-2" />
                    실시간 활동
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {activityFeed.map((item) => (
                    <div key={item.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={item.avatar} alt={item.user} />
                        <AvatarFallback>{item.user[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-foreground">{item.user}</p>
                          <div className="flex items-center space-x-2">
                            <Badge variant={getAiScoreBadgeVariant(item.aiScore)} className="text-xs">
                              AI {item.aiScore}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{item.time}</span>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 truncate">{item.content}</p>
                        <div className="flex items-center space-x-2 mt-2">
                          <Button size="sm" variant="outline" className="h-7 text-xs">
                            승인
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs">
                            거부
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs">
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
            <div className="space-y-6">
              {/* Moderation Queue Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Flag className="h-5 w-5 mr-2" />
                    모더레이션 큐
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">대기중</span>
                    <Badge variant="secondary">23</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">긴급</span>
                    <Badge variant="destructive">5</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">높음</span>
                    <Badge variant="secondary">8</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">보통</span>
                    <Badge variant="outline">10</Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Top Violations */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2" />
                    주요 위반사항
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {violationsData.map((violation) => (
                    <div key={violation.name} className="flex items-center justify-between">
                      <span className="text-sm">{violation.name}</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-16 bg-muted rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full"
                            style={{ width: `${(violation.count / violationsData[0].count) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium w-6 text-right">{violation.count}</span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Recent Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Clock className="h-5 w-5 mr-2" />
                    최근 조치
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm space-y-2">
                    <div className="flex items-center justify-between">
                      <span>게시물 승인</span>
                      <span className="text-muted-foreground">2분 전</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>User 차단</span>
                      <span className="text-muted-foreground">5분 전</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>댓글 삭제</span>
                      <span className="text-muted-foreground">8분 전</span>
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