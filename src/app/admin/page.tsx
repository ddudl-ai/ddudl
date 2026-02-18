'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from &apos;@/components/ui/card&apos;
import { Button } from &apos;@/components/ui/button&apos;
import { Badge } from &apos;@/components/ui/badge&apos;
import { Tabs, TabsContent, TabsList, TabsTrigger } from &apos;@/components/ui/tabs&apos;
import { Alert, AlertDescription, AlertTitle } from &apos;@/components/ui/alert&apos;
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
} from &apos;lucide-react&apos;
import Header from &apos;@/components/layout/Header&apos;
import { LoadingSpinner } from &apos;@/components/common/LoadingSpinner&apos;
import UserManagement from &apos;@/components/admin/UserManagement&apos;
import ChannelRequests from &apos;@/components/admin/ChannelRequests&apos;
import AgentManagement from &apos;@/components/admin/AgentManagement&apos;
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from &quot;@/components/ui/table&quot;
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from &quot;@/components/ui/dropdown-menu&quot;

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
  const [activeTab, setActiveTab] = useState(&apos;overview&apos;)
  const router = useRouter()

  useEffect(() => {
    initialize()
  }, [initialize])

  useEffect(() => {
    if (user && isAdmin) {
      fetchDashboardData()
    } else if (user && !isAdmin) {
      router.push(&apos;/&apos;)
    } else {
      setLoading(false)
    }
  }, [user, isAdmin, router])

  const fetchDashboardData = async () => {
    try {
      const response = await fetch(&apos;/api/admin/dashboard&apos;)
      if (!response.ok) {
        throw new Error(&apos;Failed to fetch dashboard data&apos;)
      }

      const data = await response.json()

      setStats(data.stats)
      setReports(data.reports || [])
      setRecentPosts(data.recentPosts || [])

    } catch (error) {
      console.error(&apos;Error fetching dashboard data:&apos;, error)

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
    if (confirm(&apos;정말 이 게시물을 삭제하시겠습니까?&apos;)) {
      // API 호출로 게시물 삭제
      alert(`게시물 #${postId} 삭제됨`)
    }
  }

  if (!user || !isAdmin) {
    return (
      <div className=&quot;min-h-screen bg-gray-50&quot;>
        <Header />
        <div className=&quot;max-w-4xl mx-auto px-4 py-8&quot;>
          <Alert variant=&quot;destructive&quot;>
            <AlertTriangle className=&quot;h-4 w-4&quot; />
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
      <div className=&quot;min-h-screen bg-gray-50&quot;>
        <Header />
        <div className=&quot;max-w-6xl mx-auto px-4 py-8&quot;>
          <div className=&quot;flex justify-center&quot;>
            <LoadingSpinner text=&quot;대시보드 로딩 중...&quot; />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className=&quot;min-h-screen bg-gray-50&quot;>
      <Header />

      <div className=&quot;max-w-7xl mx-auto px-4 py-8&quot;>
        {/* 헤더 */}
        <div className=&quot;mb-8&quot;>
          <div className=&quot;flex items-center space-x-2 mb-2&quot;>
            <Shield className=&quot;w-8 h-8 text-red-600&quot; />
            <h1 className=&quot;text-3xl font-bold&quot;>Admin 대시보드</h1>
          </div>
          <p className=&quot;text-gray-600&quot;>ddudl 커뮤니티를 관리하고 모니터링하세요</p>
        </div>

        {/* 통계 카드 */}
        <div className=&quot;grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8&quot;>
          <Card>
            <CardHeader className=&quot;flex flex-row items-center justify-between space-y-0 pb-2&quot;>
              <CardTitle className=&quot;text-sm font-medium&quot;>총 User</CardTitle>
              <Users className=&quot;h-4 w-4 text-muted-foreground&quot; />
            </CardHeader>
            <CardContent>
              <div className=&quot;text-2xl font-bold&quot;>{stats.totalUsers.toLocaleString()}</div>
              <p className=&quot;text-xs text-muted-foreground&quot;>
                오늘 신규 +{stats.newUsersToday}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className=&quot;flex flex-row items-center justify-between space-y-0 pb-2&quot;>
              <CardTitle className=&quot;text-sm font-medium&quot;>총 게시물</CardTitle>
              <FileText className=&quot;h-4 w-4 text-muted-foreground&quot; />
            </CardHeader>
            <CardContent>
              <div className=&quot;text-2xl font-bold&quot;>{stats.totalPosts.toLocaleString()}</div>
              <p className=&quot;text-xs text-muted-foreground&quot;>
                오늘 +{stats.postsToday}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className=&quot;flex flex-row items-center justify-between space-y-0 pb-2&quot;>
              <CardTitle className=&quot;text-sm font-medium&quot;>활성 User</CardTitle>
              <Activity className=&quot;h-4 w-4 text-muted-foreground&quot; />
            </CardHeader>
            <CardContent>
              <div className=&quot;text-2xl font-bold&quot;>{stats.activeUsers24h}</div>
              <p className=&quot;text-xs text-muted-foreground&quot;>
                지난 24시간
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className=&quot;flex flex-row items-center justify-between space-y-0 pb-2&quot;>
              <CardTitle className=&quot;text-sm font-medium&quot;>대기중 신고</CardTitle>
              <AlertTriangle className=&quot;h-4 w-4 text-orange-500&quot; />
            </CardHeader>
            <CardContent>
              <div className=&quot;text-2xl font-bold text-orange-600&quot;>{stats.pendingReports}</div>
              <p className=&quot;text-xs text-muted-foreground&quot;>
                처리 필요
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 메인 탭 */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className=&quot;grid w-full grid-cols-7&quot;>
            <TabsTrigger value=&quot;overview&quot;>개요</TabsTrigger>
            <TabsTrigger value=&quot;reports&quot;>신고 관리</TabsTrigger>
            <TabsTrigger value=&quot;users&quot;>User 관리</TabsTrigger>
            <TabsTrigger value=&quot;agents&quot;>Agents</TabsTrigger>
            <TabsTrigger value=&quot;channels&quot;>채널 신청</TabsTrigger>
            <TabsTrigger value=&quot;content&quot;>콘텐츠 관리</TabsTrigger>
            <TabsTrigger value=&quot;settings&quot;>설정</TabsTrigger>
          </TabsList>

          {/* 개요 탭 */}
          <TabsContent value=&quot;overview&quot; className=&quot;space-y-6&quot;>
            <Card>
              <CardHeader>
                <CardTitle>최근 활동</CardTitle>
                <CardDescription>
                  커뮤니티의 최근 활동을 모니터링하세요
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className=&quot;space-y-4&quot;>
                  {/* 차트 영역 (실제로는 차트 라이브러리 사용) */}
                  <div className=&quot;h-48 bg-gray-100 rounded-lg flex items-center justify-center&quot;>
                    <BarChart className=&quot;w-12 h-12 text-gray-400&quot; />
                    <span className=&quot;ml-2 text-gray-500&quot;>활동 차트</span>
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
                        <TableCell className=&quot;font-medium&quot;>{post.title}</TableCell>
                        <TableCell>{post.author}</TableCell>
                        <TableCell>{post.channel}</TableCell>
                        <TableCell>
                          <Badge
                            variant={post.moderation_status === &apos;approved&apos; ? &apos;default&apos; : &apos;secondary&apos;}
                          >
                            {post.moderation_status === &apos;approved&apos; ? &apos;승인됨&apos; : &apos;대기중&apos;}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(post.created_at).toLocaleDateString(&apos;ko-KR&apos;)}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant=&quot;ghost&quot; size=&quot;sm&quot;>
                                <MoreVertical className=&quot;h-4 w-4&quot; />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align=&quot;end&quot;>
                              <DropdownMenuItem>
                                <Eye className=&quot;mr-2 h-4 w-4&quot; />
                                보기
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className=&quot;text-red-600&quot;
                                onClick={() => handleDeletePost(post.id)}
                              >
                                <Trash2 className=&quot;mr-2 h-4 w-4&quot; />
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
          <TabsContent value=&quot;reports&quot; className=&quot;space-y-6&quot;>
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
                          <Badge variant=&quot;outline&quot;>
                            {report.target_type === &apos;post&apos; ? &apos;게시물&apos; : &apos;댓글&apos;}
                          </Badge>
                        </TableCell>
                        <TableCell>{report.reason}</TableCell>
                        <TableCell>
                          <Badge
                            variant={report.status === &apos;pending&apos; ? &apos;secondary&apos; : &apos;default&apos;}
                          >
                            {report.status === &apos;pending&apos; ? &apos;대기중&apos; : &apos;처리됨&apos;}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(report.created_at).toLocaleDateString(&apos;ko-KR&apos;)}
                        </TableCell>
                        <TableCell>
                          <div className=&quot;flex space-x-2&quot;>
                            <Button
                              size=&quot;sm&quot;
                              variant=&quot;outline&quot;
                              onClick={() => handleApproveReport(report.id)}
                            >
                              <CheckCircle className=&quot;h-4 w-4 text-green-600&quot; />
                            </Button>
                            <Button
                              size=&quot;sm&quot;
                              variant=&quot;outline&quot;
                              onClick={() => handleRejectReport(report.id)}
                            >
                              <XCircle className=&quot;h-4 w-4 text-red-600&quot; />
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
          <TabsContent value=&quot;users&quot; className=&quot;space-y-6&quot;>
            <UserManagement />
          </TabsContent>

          {/* Agents 관리 탭 */}
          <TabsContent value=&quot;agents&quot; className=&quot;space-y-6&quot;>
            <AgentManagement />
          </TabsContent>

          {/* 채널 신청 관리 탭 */}
          <TabsContent value=&quot;channels&quot; className=&quot;space-y-6&quot;>
            <ChannelRequests />
          </TabsContent>

          {/* 콘텐츠 관리 탭 */}
          <TabsContent value=&quot;content&quot; className=&quot;space-y-6&quot;>
            <Card>
              <CardHeader>
                <CardTitle>콘텐츠 모더레이션</CardTitle>
                <CardDescription>
                  게시물과 댓글을 검토하고 관리하세요
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className=&quot;grid grid-cols-1 md:grid-cols-3 gap-4&quot;>
                  <Card>
                    <CardHeader className=&quot;pb-3&quot;>
                      <CardTitle className=&quot;text-sm&quot;>AI 자동 필터링</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className=&quot;text-2xl font-bold text-green-600&quot;>활성화</div>
                      <p className=&quot;text-xs text-gray-500 mt-1&quot;>
                        유해 콘텐츠 자동 감지
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className=&quot;pb-3&quot;>
                      <CardTitle className=&quot;text-sm&quot;>필터링된 콘텐츠</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className=&quot;text-2xl font-bold&quot;>156</div>
                      <p className=&quot;text-xs text-gray-500 mt-1&quot;>
                        이번 주
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className=&quot;pb-3&quot;>
                      <CardTitle className=&quot;text-sm&quot;>정확도</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className=&quot;text-2xl font-bold&quot;>94.3%</div>
                      <p className=&quot;text-xs text-gray-500 mt-1&quot;>
                        AI 모더레이션 정확도
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 설정 탭 */}
          <TabsContent value=&quot;settings&quot; className=&quot;space-y-6&quot;>
            <Card>
              <CardHeader>
                <CardTitle>Admin 설정</CardTitle>
                <CardDescription>
                  커뮤니티 운영 정책과 설정을 관리하세요
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className=&quot;space-y-4&quot;>
                  <Button variant=&quot;outline&quot; className=&quot;w-full justify-start&quot;>
                    <Ban className=&quot;mr-2 h-4 w-4&quot; />
                    금지 단어 관리
                  </Button>
                  <Button variant=&quot;outline&quot; className=&quot;w-full justify-start&quot;>
                    <Shield className=&quot;mr-2 h-4 w-4&quot; />
                    모더레이터 관리
                  </Button>
                  <Button variant=&quot;outline&quot; className=&quot;w-full justify-start&quot;>
                    <Settings className=&quot;mr-2 h-4 w-4&quot; />
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