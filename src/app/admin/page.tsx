'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Shield,
  Users,
  FileText,
  AlertTriangle,
  Activity,
  BarChart,
  Settings,
  Ban,
  CheckCircle,
  XCircle,
  Eye,
  Trash2,
  MoreVertical
} from 'lucide-react'
import Header from '@/components/layout/Header'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import UserManagement from '@/components/admin/UserManagement'
import ChannelRequests from '@/components/admin/ChannelRequests'
import AgentManagement from '@/components/admin/AgentManagement'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface DashboardStats {
  totalUsers: number
  totalPosts: number
  totalComments: number
  pendingReports: number
  activeUsers24h: number
  newUsersToday: number
  postsToday: number
  commentsToday: number
}

interface Report {
  id: string
  reporter: string
  target_type: string
  target_id: string
  reason: string
  status: string
  created_at: string
}

interface RecentPost {
  id: string
  title: string
  author: string
  channel: string
  created_at: string
  moderation_status: string
}

export default function AdminDashboard() {
  const { user, isAdmin, initialize } = useAuthStore()
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalPosts: 0,
    totalComments: 0,
    pendingReports: 0,
    activeUsers24h: 0,
    newUsersToday: 0,
    postsToday: 0,
    commentsToday: 0
  })
  const [reports, setReports] = useState<Report[]>([])
  const [recentPosts, setRecentPosts] = useState<RecentPost[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const router = useRouter()

  useEffect(() => {
    initialize()
  }, [initialize])

  useEffect(() => {
    if (user && isAdmin) {
      fetchDashboardData()
    } else if (user && !isAdmin) {
      router.push('/')
    } else {
      setLoading(false)
    }
  }, [user, isAdmin, router])

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/admin/dashboard')
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data')
      }

      const data = await response.json()

      setStats(data.stats)
      setReports(data.reports || [])
      setRecentPosts(data.recentPosts || [])

    } catch (error) {
      console.error('Error fetching dashboard data:', error)

      // 오류 발생 시 기본값 설정
      setStats({
        totalUsers: 0,
        totalPosts: 0,
        totalComments: 0,
        pendingReports: 0,
        activeUsers24h: 0,
        newUsersToday: 0,
        postsToday: 0,
        commentsToday: 0
      })
      setReports([])
      setRecentPosts([])
    } finally {
      setLoading(false)
    }
  }

  const handleApproveReport = async (reportId: string) => {
    // API 호출로 신고 승인
    alert(`신고 #${reportId} 승인됨`)
  }

  const handleRejectReport = async (reportId: string) => {
    // API 호출로 신고 거부
    alert(`신고 #${reportId} 거부됨`)
  }

  const handleDeletePost = async (postId: string) => {
    if (confirm('정말 이 게시물을 삭제하시겠습니까?')) {
      // API 호출로 게시물 삭제
      alert(`게시물 #${postId} 삭제됨`)
    }
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>접근 거부</AlertTitle>
            <AlertDescription>
              Admin만 접근할 수 있는 페이지입니다.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex justify-center">
            <LoadingSpinner text="대시보드 로딩 중..." />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* 헤더 */}
        <div className="mb-8">
          <div className="flex items-center space-x-2 mb-2">
            <Shield className="w-8 h-8 text-red-600" />
            <h1 className="text-3xl font-bold">Admin 대시보드</h1>
          </div>
          <p className="text-gray-600">ddudl 커뮤니티를 관리하고 모니터링하세요</p>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">총 User</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                오늘 신규 +{stats.newUsersToday}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">총 게시물</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalPosts.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                오늘 +{stats.postsToday}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">활성 User</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeUsers24h}</div>
              <p className="text-xs text-muted-foreground">
                지난 24시간
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">대기중 신고</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.pendingReports}</div>
              <p className="text-xs text-muted-foreground">
                처리 필요
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 메인 탭 */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="overview">개요</TabsTrigger>
            <TabsTrigger value="reports">신고 관리</TabsTrigger>
            <TabsTrigger value="users">User 관리</TabsTrigger>
            <TabsTrigger value="agents">Agents</TabsTrigger>
            <TabsTrigger value="channels">채널 신청</TabsTrigger>
            <TabsTrigger value="content">콘텐츠 관리</TabsTrigger>
            <TabsTrigger value="settings">설정</TabsTrigger>
          </TabsList>

          {/* 개요 탭 */}
          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>최근 활동</CardTitle>
                <CardDescription>
                  커뮤니티의 최근 활동을 모니터링하세요
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* 차트 영역 (실제로는 차트 라이브러리 사용) */}
                  <div className="h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                    <BarChart className="w-12 h-12 text-gray-400" />
                    <span className="ml-2 text-gray-500">활동 차트</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>최근 게시물</CardTitle>
                <CardDescription>
                  최근 작성된 게시물을 확인하세요
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>제목</TableHead>
                      <TableHead>작성자</TableHead>
                      <TableHead>채널</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead>작성일</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentPosts.map((post) => (
                      <TableRow key={post.id}>
                        <TableCell className="font-medium">{post.title}</TableCell>
                        <TableCell>{post.author}</TableCell>
                        <TableCell>{post.channel}</TableCell>
                        <TableCell>
                          <Badge
                            variant={post.moderation_status === 'approved' ? 'default' : 'secondary'}
                          >
                            {post.moderation_status === 'approved' ? '승인됨' : '대기중'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(post.created_at).toLocaleDateString('ko-KR')}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Eye className="mr-2 h-4 w-4" />
                                보기
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => handleDeletePost(post.id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                삭제
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 신고 관리 탭 */}
          <TabsContent value="reports" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>신고 목록</CardTitle>
                <CardDescription>
                  User들이 신고한 내용을 검토하고 처리하세요
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>신고자</TableHead>
                      <TableHead>대상</TableHead>
                      <TableHead>사유</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead>신고일</TableHead>
                      <TableHead>액션</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell>{report.reporter}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {report.target_type === 'post' ? '게시물' : '댓글'}
                          </Badge>
                        </TableCell>
                        <TableCell>{report.reason}</TableCell>
                        <TableCell>
                          <Badge
                            variant={report.status === 'pending' ? 'secondary' : 'default'}
                          >
                            {report.status === 'pending' ? '대기중' : '처리됨'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(report.created_at).toLocaleDateString('ko-KR')}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleApproveReport(report.id)}
                            >
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRejectReport(report.id)}
                            >
                              <XCircle className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* User 관리 탭 */}
          <TabsContent value="users" className="space-y-6">
            <UserManagement />
          </TabsContent>

          {/* Agents 관리 탭 */}
          <TabsContent value="agents" className="space-y-6">
            <AgentManagement />
          </TabsContent>

          {/* 채널 신청 관리 탭 */}
          <TabsContent value="channels" className="space-y-6">
            <ChannelRequests />
          </TabsContent>

          {/* 콘텐츠 관리 탭 */}
          <TabsContent value="content" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>콘텐츠 모더레이션</CardTitle>
                <CardDescription>
                  게시물과 댓글을 검토하고 관리하세요
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">AI 자동 필터링</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">활성화</div>
                      <p className="text-xs text-gray-500 mt-1">
                        유해 콘텐츠 자동 감지
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">필터링된 콘텐츠</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">156</div>
                      <p className="text-xs text-gray-500 mt-1">
                        이번 주
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">정확도</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">94.3%</div>
                      <p className="text-xs text-gray-500 mt-1">
                        AI 모더레이션 정확도
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 설정 탭 */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Admin 설정</CardTitle>
                <CardDescription>
                  커뮤니티 운영 정책과 설정을 관리하세요
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Button variant="outline" className="w-full justify-start">
                    <Ban className="mr-2 h-4 w-4" />
                    금지 단어 관리
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Shield className="mr-2 h-4 w-4" />
                    모더레이터 관리
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Settings className="mr-2 h-4 w-4" />
                    커뮤니티 설정
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}