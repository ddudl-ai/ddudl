'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import { stripHtmlTags } from '@/lib/utils/html'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import {
  Search,
  FileText,
  MessageSquare,
  Users,
  Hash,
  ArrowUp,
  Calendar,
  ChevronRight
} from 'lucide-react'

interface SearchResults {
  posts: any[]
  comments: any[]
  users: any[]
  channels: any[]
}

function SearchContent() {
  const searchParams = useSearchParams()
  const query = searchParams.get('q') || ''
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<SearchResults>({
    posts: [],
    comments: [],
    users: [],
    channels: []
  })
  const [activeTab, setActiveTab] = useState('all')
  const [totalResults, setTotalResults] = useState(0)

  useEffect(() => {
    if (query) {
      performSearch()
    }
  }, [query])

  const performSearch = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&type=${activeTab}`)
      if (!response.ok) throw new Error('Search failed')

      const data = await response.json()
      setResults(data.results)
      setTotalResults(data.totalResults)
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))

    if (hours < 1) return 'Just now'
    if (hours < 24) return `${hours} hours ago`
    if (hours < 168) return `${Math.floor(hours / 24)} days ago`
    return date.toLocaleDateString('ko-KR')
  }

  const highlightText = (text: string, query: string) => {
    if (!query) return text
    const parts = text.split(new RegExp(`(${query})`, 'gi'))
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ?
        <mark key={i} className="bg-yellow-200 px-0.5">{part}</mark> : part
    )
  }

  if (!query) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <Search className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h1 className="text-2xl font-bold mb-2">Enter your search term</h1>
          <p className="text-gray-600">You can search for posts, comments, users, and communities.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* 검색 헤더 */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">
            Search results for &ldquo;{query}&rdquo;
          </h1>
          <p className="text-gray-600">
            Found {totalResults} results
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner text="Searching..." />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={(value) => {
            setActiveTab(value)
            performSearch()
          }}>
            <TabsList className="mb-6">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="posts">Posts</TabsTrigger>
              <TabsTrigger value="channels">Channels</TabsTrigger>
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="channels">Channels</TabsTrigger>
            </TabsList>

            {/* 전체 검색 결과 */}
            <TabsContent value="all" className="space-y-6">
              {/* 채널 */}
              {results.channels.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Hash className="w-5 h-5" />
                      <span>Channels</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {results.channels.slice(0, 3).map((sub) => (
                      <Link key={sub.id} href={`/c/${sub.name}`}>
                        <div className="p-3 hover:bg-gray-50 rounded-lg transition-colors">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-medium">c/{sub.name}</h3>
                              <p className="text-sm text-gray-600">
                                {highlightText(sub.description || '', query)}
                              </p>
                            </div>
                            <Badge variant="secondary">{sub.member_count} 멤버</Badge>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* 게시물 */}
              {results.posts.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <FileText className="w-5 h-5" />
                      <span>게시물</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {results.posts.slice(0, 5).map((post) => (
                      <Link key={post.id} href={`/c/${post.channel?.name}/posts/${post.id}`}>
                        <div className="p-3 hover:bg-gray-50 rounded-lg transition-colors">
                          <h3 className="font-medium mb-1">
                            {highlightText(post.title, query)}
                          </h3>
                          <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                            {highlightText(stripHtmlTags(post.content || ''), query)}
                          </p>
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <span>c/{post.channel?.name}</span>
                            <span>{post.author?.username}</span>
                            <span className="flex items-center">
                              <ArrowUp className="w-3 h-3 mr-1" />
                              {post.upvotes}
                            </span>
                            <span>{formatDate(post.created_at)}</span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* 댓글 */}
              {results.comments.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <MessageSquare className="w-5 h-5" />
                      <span>댓글</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {results.comments.slice(0, 5).map((comment) => (
                      <Link key={comment.id} href={`#`}>
                        <div className="p-3 hover:bg-gray-50 rounded-lg transition-colors">
                          <p className="text-sm mb-2">
                            {highlightText(stripHtmlTags(comment.content), query)}
                          </p>
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <span>{comment.author?.username}</span>
                            <span className="flex items-center">
                              <ArrowUp className="w-3 h-3 mr-1" />
                              {comment.upvotes}
                            </span>
                            <span>{formatDate(comment.created_at)}</span>
                          </div>
                          {comment.post && (
                            <div className="mt-2 text-xs text-blue-600">
                              게시물: {comment.post.title}
                            </div>
                          )}
                        </div>
                      </Link>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* User */}
              {results.users.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Users className="w-5 h-5" />
                      <span>User</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {results.users.slice(0, 5).map((user) => (
                      <Link key={user.id} href={`/u/${user.username}`}>
                        <div className="p-3 hover:bg-gray-50 rounded-lg transition-colors flex items-center justify-between">
                          <div>
                            <h3 className="font-medium">
                              {highlightText(user.username, query)}
                            </h3>
                            <p className="text-sm text-gray-600">
                              가입일: {formatDate(user.created_at)}
                            </p>
                          </div>
                          <Badge variant="outline">{user.karma_points} Karma</Badge>
                        </div>
                      </Link>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* 결과 없음 */}
              {totalResults === 0 && (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Search className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-medium mb-2">검색 결과가 없습니다</h3>
                    <p className="text-gray-600">다른 검색어를 시도해보세요</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* 게시물 탭 */}
            <TabsContent value="posts" className="space-y-4">
              {results.posts.map((post) => (
                <Card key={post.id}>
                  <CardContent className="pt-6">
                    <Link href={`/c/${post.channel?.name}/posts/${post.id}`}>
                      <h3 className="font-medium text-lg mb-2 hover:text-blue-600">
                        {highlightText(post.title, query)}
                      </h3>
                      <p className="text-gray-600 mb-3 line-clamp-3">
                        {highlightText(stripHtmlTags(post.content || ''), query)}
                      </p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>c/{post.channel?.name}</span>
                        <span>{post.author?.username}</span>
                        <span className="flex items-center">
                          <ArrowUp className="w-4 h-4 mr-1" />
                          {post.upvotes}
                        </span>
                        <span>{post.comment_count} 댓글</span>
                        <span>{formatDate(post.created_at)}</span>
                      </div>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            {/* 댓글 탭 */}
            <TabsContent value="comments" className="space-y-4">
              {results.comments.map((comment) => (
                <Card key={comment.id}>
                  <CardContent className="pt-6">
                    <p className="mb-3">
                      {highlightText(stripHtmlTags(comment.content), query)}
                    </p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>{comment.author?.username}</span>
                      <span className="flex items-center">
                        <ArrowUp className="w-4 h-4 mr-1" />
                        {comment.upvotes}
                      </span>
                      <span>{formatDate(comment.created_at)}</span>
                    </div>
                    {comment.post && (
                      <div className="mt-3 p-2 bg-gray-50 rounded">
                        <span className="text-xs text-gray-500">원글:</span>
                        <p className="text-sm">{comment.post.title}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            {/* User 탭 */}
            <TabsContent value="users" className="space-y-4">
              {results.users.map((user) => (
                <Card key={user.id}>
                  <CardContent className="pt-6">
                    <Link href={`/u/${user.username}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-lg mb-1">
                            {highlightText(user.username, query)}
                          </h3>
                          <p className="text-sm text-gray-600">
                            가입일: {formatDate(user.created_at)}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-amber-600">
                            {user.karma_points}
                          </div>
                          <div className="text-sm text-gray-500">Karma 포인트</div>
                        </div>
                      </div>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            {/* 채널 탭 */}
            <TabsContent value="channels" className="space-y-4">
              {results.channels.map((sub) => (
                <Card key={sub.id}>
                  <CardContent className="pt-6">
                    <Link href={`/c/${sub.name}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-lg mb-1">
                            c/{highlightText(sub.name, query)}
                          </h3>
                          <p className="text-gray-600 mb-2">
                            {highlightText(sub.display_name || sub.name, query)}
                          </p>
                          <p className="text-sm text-gray-500">
                            {highlightText(sub.description || '', query)}
                          </p>
                        </div>
                        <div className="ml-4">
                          <Badge variant="secondary" className="text-lg px-3 py-1">
                            {sub.member_count} 멤버
                          </Badge>
                        </div>
                      </div>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50"><Header /><div className="flex justify-center py-12"><LoadingSpinner text="검색 페이지 로딩 중..." /></div></div>}>
      <SearchContent />
    </Suspense>
  )
}