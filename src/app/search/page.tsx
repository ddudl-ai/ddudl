'use client&apos;

import { Suspense, useEffect, useState } from &apos;react&apos;
import { useSearchParams } from &apos;next/navigation&apos;
import Link from &apos;next/link&apos;
import Header from &apos;@/components/layout/Header&apos;
import { stripHtmlTags } from &apos;@/lib/utils/html&apos;
import { Card, CardContent, CardHeader, CardTitle } from &apos;@/components/ui/card&apos;
import { Tabs, TabsContent, TabsList, TabsTrigger } from &apos;@/components/ui/tabs&apos;
import { Badge } from &apos;@/components/ui/badge&apos;
import { Button } from &apos;@/components/ui/button&apos;
import { LoadingSpinner } from &apos;@/components/common/LoadingSpinner&apos;
import {
  Search,
  FileText,
  MessageSquare,
  Users,
  Hash,
  ArrowUp,
  Calendar,
  ChevronRight
} from &apos;lucide-react&apos;

interface SearchResults {
  posts: any[]
  comments: any[]
  users: any[]
  channels: any[]
}

function SearchContent() {
  const searchParams = useSearchParams()
  const query = searchParams.get(&apos;q&apos;) || &apos;'
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<SearchResults>({
    posts: [],
    comments: [],
    users: [],
    channels: []
  })
  const [activeTab, setActiveTab] = useState(&apos;all&apos;)
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
      if (!response.ok) throw new Error(&apos;Search failed&apos;)

      const data = await response.json()
      setResults(data.results)
      setTotalResults(data.totalResults)
    } catch (error) {
      console.error(&apos;Search error:&apos;, error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))

    if (hours < 1) return &apos;Just now&apos;
    if (hours < 24) return `${hours} hours ago`
    if (hours < 168) return `${Math.floor(hours / 24)} days ago`
    return date.toLocaleDateString(&apos;ko-KR&apos;)
  }

  const highlightText = (text: string, query: string) => {
    if (!query) return text
    const parts = text.split(new RegExp(`(${query})`, &apos;gi&apos;))
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ?
        <mark key={i} className=&quot;bg-yellow-200 px-0.5&quot;>{part}</mark> : part
    )
  }

  if (!query) {
    return (
      <div className=&quot;min-h-screen bg-gray-50&quot;>
        <Header />
        <div className=&quot;max-w-4xl mx-auto px-4 py-16 text-center&quot;>
          <Search className=&quot;w-16 h-16 mx-auto mb-4 text-gray-400&quot; />
          <h1 className=&quot;text-2xl font-bold mb-2&quot;>Enter your search term</h1>
          <p className=&quot;text-gray-600&quot;>You can search for posts, comments, users, and communities.</p>
        </div>
      </div>
    )
  }

  return (
    <div className=&quot;min-h-screen bg-gray-50&quot;>
      <Header />

      <div className=&quot;max-w-6xl mx-auto px-4 py-6&quot;>
        {/* 검색 헤더 */}
        <div className=&quot;mb-6&quot;>
          <h1 className=&quot;text-2xl font-bold mb-2&quot;>
            Search results for &ldquo;{query}&rdquo;
          </h1>
          <p className=&quot;text-gray-600&quot;>
            Found {totalResults} results
          </p>
        </div>

        {loading ? (
          <div className=&quot;flex justify-center py-12&quot;>
            <LoadingSpinner text=&quot;Searching...&quot; />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={(value) => {
            setActiveTab(value)
            performSearch()
          }}>
            <TabsList className=&quot;mb-6&quot;>
              <TabsTrigger value=&quot;all&quot;>All</TabsTrigger>
              <TabsTrigger value=&quot;posts&quot;>Posts</TabsTrigger>
              <TabsTrigger value=&quot;channels&quot;>Channels</TabsTrigger>
              <TabsTrigger value=&quot;users&quot;>Users</TabsTrigger>
              <TabsTrigger value=&quot;channels&quot;>Channels</TabsTrigger>
            </TabsList>

            {/* 전체 검색 결과 */}
            <TabsContent value=&quot;all&quot; className=&quot;space-y-6&quot;>
              {/* 채널 */}
              {results.channels.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className=&quot;flex items-center space-x-2&quot;>
                      <Hash className=&quot;w-5 h-5&quot; />
                      <span>Channels</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className=&quot;space-y-3&quot;>
                    {results.channels.slice(0, 3).map((sub) => (
                      <Link key={sub.id} href={`/c/${sub.name}`}>
                        <div className=&quot;p-3 hover:bg-gray-50 rounded-lg transition-colors&quot;>
                          <div className=&quot;flex items-center justify-between&quot;>
                            <div>
                              <h3 className=&quot;font-medium&quot;>c/{sub.name}</h3>
                              <p className=&quot;text-sm text-gray-600&quot;>
                                {highlightText(sub.description || &apos;', query)}
                              </p>
                            </div>
                            <Badge variant=&quot;secondary&quot;>{sub.member_count} 멤버</Badge>
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
                    <CardTitle className=&quot;flex items-center space-x-2&quot;>
                      <FileText className=&quot;w-5 h-5&quot; />
                      <span>게시물</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className=&quot;space-y-3&quot;>
                    {results.posts.slice(0, 5).map((post) => (
                      <Link key={post.id} href={`/c/${post.channel?.name}/posts/${post.id}`}>
                        <div className=&quot;p-3 hover:bg-gray-50 rounded-lg transition-colors&quot;>
                          <h3 className=&quot;font-medium mb-1&quot;>
                            {highlightText(post.title, query)}
                          </h3>
                          <p className=&quot;text-sm text-gray-600 line-clamp-2 mb-2&quot;>
                            {highlightText(stripHtmlTags(post.content || &apos;'), query)}
                          </p>
                          <div className=&quot;flex items-center space-x-4 text-xs text-gray-500&quot;>
                            <span>c/{post.channel?.name}</span>
                            <span>{post.author?.username}</span>
                            <span className=&quot;flex items-center&quot;>
                              <ArrowUp className=&quot;w-3 h-3 mr-1&quot; />
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
                    <CardTitle className=&quot;flex items-center space-x-2&quot;>
                      <MessageSquare className=&quot;w-5 h-5&quot; />
                      <span>댓글</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className=&quot;space-y-3&quot;>
                    {results.comments.slice(0, 5).map((comment) => (
                      <Link key={comment.id} href={`#`}>
                        <div className=&quot;p-3 hover:bg-gray-50 rounded-lg transition-colors&quot;>
                          <p className=&quot;text-sm mb-2&quot;>
                            {highlightText(stripHtmlTags(comment.content), query)}
                          </p>
                          <div className=&quot;flex items-center space-x-4 text-xs text-gray-500&quot;>
                            <span>{comment.author?.username}</span>
                            <span className=&quot;flex items-center&quot;>
                              <ArrowUp className=&quot;w-3 h-3 mr-1&quot; />
                              {comment.upvotes}
                            </span>
                            <span>{formatDate(comment.created_at)}</span>
                          </div>
                          {comment.post && (
                            <div className=&quot;mt-2 text-xs text-blue-600&quot;>
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
                    <CardTitle className=&quot;flex items-center space-x-2&quot;>
                      <Users className=&quot;w-5 h-5&quot; />
                      <span>User</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className=&quot;space-y-3&quot;>
                    {results.users.slice(0, 5).map((user) => (
                      <Link key={user.id} href={`/u/${user.username}`}>
                        <div className=&quot;p-3 hover:bg-gray-50 rounded-lg transition-colors flex items-center justify-between&quot;>
                          <div>
                            <h3 className=&quot;font-medium&quot;>
                              {highlightText(user.username, query)}
                            </h3>
                            <p className=&quot;text-sm text-gray-600&quot;>
                              가입일: {formatDate(user.created_at)}
                            </p>
                          </div>
                          <Badge variant=&quot;outline&quot;>{user.karma_points} Karma</Badge>
                        </div>
                      </Link>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* 결과 없음 */}
              {totalResults === 0 && (
                <Card>
                  <CardContent className=&quot;py-12 text-center&quot;>
                    <Search className=&quot;w-12 h-12 mx-auto mb-4 text-gray-400&quot; />
                    <h3 className=&quot;text-lg font-medium mb-2&quot;>검색 결과가 없습니다</h3>
                    <p className=&quot;text-gray-600&quot;>다른 검색어를 시도해보세요</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* 게시물 탭 */}
            <TabsContent value=&quot;posts&quot; className=&quot;space-y-4&quot;>
              {results.posts.map((post) => (
                <Card key={post.id}>
                  <CardContent className=&quot;pt-6&quot;>
                    <Link href={`/c/${post.channel?.name}/posts/${post.id}`}>
                      <h3 className=&quot;font-medium text-lg mb-2 hover:text-blue-600&quot;>
                        {highlightText(post.title, query)}
                      </h3>
                      <p className=&quot;text-gray-600 mb-3 line-clamp-3&quot;>
                        {highlightText(stripHtmlTags(post.content || &apos;'), query)}
                      </p>
                      <div className=&quot;flex items-center space-x-4 text-sm text-gray-500&quot;>
                        <span>c/{post.channel?.name}</span>
                        <span>{post.author?.username}</span>
                        <span className=&quot;flex items-center&quot;>
                          <ArrowUp className=&quot;w-4 h-4 mr-1&quot; />
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
            <TabsContent value=&quot;comments&quot; className=&quot;space-y-4&quot;>
              {results.comments.map((comment) => (
                <Card key={comment.id}>
                  <CardContent className=&quot;pt-6&quot;>
                    <p className=&quot;mb-3&quot;>
                      {highlightText(stripHtmlTags(comment.content), query)}
                    </p>
                    <div className=&quot;flex items-center space-x-4 text-sm text-gray-500&quot;>
                      <span>{comment.author?.username}</span>
                      <span className=&quot;flex items-center&quot;>
                        <ArrowUp className=&quot;w-4 h-4 mr-1&quot; />
                        {comment.upvotes}
                      </span>
                      <span>{formatDate(comment.created_at)}</span>
                    </div>
                    {comment.post && (
                      <div className=&quot;mt-3 p-2 bg-gray-50 rounded&quot;>
                        <span className=&quot;text-xs text-gray-500&quot;>원글:</span>
                        <p className=&quot;text-sm&quot;>{comment.post.title}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            {/* User 탭 */}
            <TabsContent value=&quot;users&quot; className=&quot;space-y-4&quot;>
              {results.users.map((user) => (
                <Card key={user.id}>
                  <CardContent className=&quot;pt-6&quot;>
                    <Link href={`/u/${user.username}`}>
                      <div className=&quot;flex items-center justify-between&quot;>
                        <div>
                          <h3 className=&quot;font-medium text-lg mb-1&quot;>
                            {highlightText(user.username, query)}
                          </h3>
                          <p className=&quot;text-sm text-gray-600&quot;>
                            가입일: {formatDate(user.created_at)}
                          </p>
                        </div>
                        <div className=&quot;text-right&quot;>
                          <div className=&quot;text-2xl font-bold text-amber-600&quot;>
                            {user.karma_points}
                          </div>
                          <div className=&quot;text-sm text-gray-500&quot;>Points</div>
                        </div>
                      </div>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            {/* 채널 탭 */}
            <TabsContent value=&quot;channels&quot; className=&quot;space-y-4&quot;>
              {results.channels.map((sub) => (
                <Card key={sub.id}>
                  <CardContent className=&quot;pt-6&quot;>
                    <Link href={`/c/${sub.name}`}>
                      <div className=&quot;flex items-center justify-between&quot;>
                        <div className=&quot;flex-1&quot;>
                          <h3 className=&quot;font-medium text-lg mb-1&quot;>
                            c/{highlightText(sub.name, query)}
                          </h3>
                          <p className=&quot;text-gray-600 mb-2&quot;>
                            {highlightText(sub.display_name || sub.name, query)}
                          </p>
                          <p className=&quot;text-sm text-gray-500&quot;>
                            {highlightText(sub.description || &apos;', query)}
                          </p>
                        </div>
                        <div className=&quot;ml-4&quot;>
                          <Badge variant=&quot;secondary&quot; className=&quot;text-lg px-3 py-1&quot;>
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
    <Suspense fallback={<div className=&quot;min-h-screen bg-gray-50&quot;><Header /><div className=&quot;flex justify-center py-12&quot;><LoadingSpinner text=&quot;검색 페이지 로딩 중...&quot; /></div></div>}>
      <SearchContent />
    </Suspense>
  )
}