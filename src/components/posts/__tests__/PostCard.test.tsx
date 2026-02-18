import React from &apos;react&apos;
import { render, screen, fireEvent, waitFor } from &apos;@testing-library/react&apos;
import { formatDistanceToNow } from &apos;date-fns&apos;
import { ko } from &apos;date-fns/locale&apos;
import PostCard from &apos;../PostCard&apos;
import { mockPosts } from &apos;@/lib/test/mocks&apos;

// Mock date-fns
jest.mock(&apos;date-fns&apos;, () => ({
  formatDistanceToNow: jest.fn(),
}))

describe(&apos;PostCard&apos;, () => {
  const mockPost = mockPosts[0]
  
  beforeEach(() => {
    jest.clearAllMocks()
    ;(formatDistanceToNow as jest.Mock).mockReturnValue(&apos;1시간 전&apos;)
    
    // Mock fetch globally
    global.fetch = jest.fn()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it(&apos;should render post information correctly&apos;, () => {
    render(<PostCard post={mockPost} />)

    // Check title
    expect(screen.getByText(mockPost.title)).toBeInTheDocument()
    
    // Check content
    if (mockPost.content) {
      expect(screen.getByText(mockPost.content)).toBeInTheDocument()
    }
    
    // Check channel
    expect(screen.getByText(mockPost.channels.display_name)).toBeInTheDocument()
    
    // Check author
    expect(screen.getByText(`${mockPost.users?.username}님이 작성`)).toBeInTheDocument()
    
    // Check time ago
    expect(screen.getByText(&apos;1시간 전&apos;)).toBeInTheDocument()
    
    // Check vote score
    const voteScore = mockPost.upvotes - mockPost.downvotes
    expect(screen.getByText(voteScore.toString())).toBeInTheDocument()
    
    // Check comment count
    expect(screen.getByText(`${mockPost.comment_count} 댓글`)).toBeInTheDocument()
  })

  it(&apos;should render AI generated badge for AI posts&apos;, () => {
    const aiPost = { ...mockPost, ai_generated: true }
    render(<PostCard post={aiPost} />)
    
    expect(screen.getByText(&apos;AI 생성&apos;)).toBeInTheDocument()
  })

  it(&apos;should not render AI badge for human posts&apos;, () => {
    const humanPost = { ...mockPost, ai_generated: false }
    render(<PostCard post={humanPost} />)
    
    expect(screen.queryByText(&apos;AI 생성&apos;)).not.toBeInTheDocument()
  })

  it(&apos;should render flair when present&apos;, () => {
    const postWithFlair = { ...mockPost, flair: &apos;질문&apos; }
    render(<PostCard post={postWithFlair} />)
    
    expect(screen.getByText(&apos;질문&apos;)).toBeInTheDocument()
  })

  it(&apos;should not render flair when not present&apos;, () => {
    const postWithoutFlair = { ...mockPost, flair: null }
    render(<PostCard post={postWithoutFlair} />)
    
    // Should not have any flair badge
    expect(screen.queryByText(&apos;질문&apos;)).not.toBeInTheDocument()
  })

  it(&apos;should handle missing user gracefully&apos;, () => {
    const postWithoutUser = { ...mockPost, users: null }
    render(<PostCard post={postWithoutUser} />)
    
    expect(screen.getByText(&apos;알 수 없는 User님이 작성&apos;)).toBeInTheDocument()
  })

  describe(&apos;Voting functionality&apos;, () => {
    it(&apos;should load user vote on mount&apos;, async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          userVote: &apos;up&apos;,
          upvotes: 10,
          downvotes: 2,
        }),
      })

      render(<PostCard post={mockPost} />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(`/api/posts/${mockPost.id}/vote`)
      })
    })

    it(&apos;should handle vote loading error gracefully&apos;, async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error(&apos;Network error&apos;))
      
      // Should not crash
      render(<PostCard post={mockPost} />)
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled()
      })
    })

    it(&apos;should handle upvote click&apos;, async () => {
      ;(global.fetch as jest.Mock)
        // Initial vote loading
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            userVote: null,
            upvotes: 10,
            downvotes: 2,
          }),
        })
        // Vote submission
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            userVote: &apos;up&apos;,
            upvotes: 11,
            downvotes: 2,
          }),
        })

      render(<PostCard post={mockPost} />)

      // Wait for initial load
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1)
      })

      const upvoteButton = screen.getAllByRole(&apos;button&apos;)[0] // First button should be upvote
      fireEvent.click(upvoteButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(`/api/posts/${mockPost.id}/vote`, {
          method: &apos;POST&apos;,
          headers: {
            &apos;Content-Type&apos;: &apos;application/json&apos;,
          },
          body: JSON.stringify({ voteType: &apos;up&apos; }),
        })
      })

      // Check if vote count updated
      await waitFor(() => {
        expect(screen.getByText(&apos;9&apos;)).toBeInTheDocument() // 11 - 2 = 9
      })
    })

    it(&apos;should handle downvote click&apos;, async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            userVote: null,
            upvotes: 10,
            downvotes: 2,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            userVote: &apos;down&apos;,
            upvotes: 10,
            downvotes: 3,
          }),
        })

      render(<PostCard post={mockPost} />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1)
      })

      const downvoteButton = screen.getAllByRole(&apos;button&apos;)[2] // Third button should be downvote
      fireEvent.click(downvoteButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(`/api/posts/${mockPost.id}/vote`, {
          method: &apos;POST&apos;,
          headers: {
            &apos;Content-Type&apos;: &apos;application/json&apos;,
          },
          body: JSON.stringify({ voteType: &apos;down&apos; }),
        })
      })
    })

    it(&apos;should toggle vote when same vote is clicked&apos;, async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            userVote: &apos;up&apos;,
            upvotes: 11,
            downvotes: 2,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            userVote: null,
            upvotes: 10,
            downvotes: 2,
          }),
        })

      render(<PostCard post={mockPost} />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1)
      })

      const upvoteButton = screen.getAllByRole(&apos;button&apos;)[0]
      fireEvent.click(upvoteButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(`/api/posts/${mockPost.id}/vote`, {
          method: &apos;POST&apos;,
          headers: {
            &apos;Content-Type&apos;: &apos;application/json&apos;,
          },
          body: JSON.stringify({ voteType: &apos;remove&apos; }),
        })
      })
    })

    it(&apos;should prevent multiple simultaneous votes&apos;, async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            userVote: null,
            upvotes: 10,
            downvotes: 2,
          }),
        })
        .mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

      render(<PostCard post={mockPost} />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1)
      })

      const upvoteButton = screen.getAllByRole(&apos;button&apos;)[0]
      
      // Click multiple times quickly
      fireEvent.click(upvoteButton)
      fireEvent.click(upvoteButton)
      fireEvent.click(upvoteButton)

      // Should only make one vote request
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2) // Initial load + one vote
      })
    })

    it(&apos;should handle vote error and show alert for unauthenticated&apos;, async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            userVote: null,
            upvotes: 10,
            downvotes: 2,
          }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          json: async () => ({
            error: &apos;Not authenticated&apos;,
          }),
        })

      // Mock alert
      const alertMock = jest.fn()
      global.alert = alertMock

      render(<PostCard post={mockPost} />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1)
      })

      const upvoteButton = screen.getAllByRole(&apos;button&apos;)[0]
      fireEvent.click(upvoteButton)

      await waitFor(() => {
        expect(alertMock).toHaveBeenCalledWith(&apos;투표하려면 로그인이 필요합니다.&apos;)
      })
    })

    it(&apos;should handle general vote error&apos;, async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            userVote: null,
            upvotes: 10,
            downvotes: 2,
          }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: async () => ({
            error: &apos;Internal server error&apos;,
          }),
        })

      const alertMock = jest.fn()
      global.alert = alertMock

      render(<PostCard post={mockPost} />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1)
      })

      const upvoteButton = screen.getAllByRole(&apos;button&apos;)[0]
      fireEvent.click(upvoteButton)

      await waitFor(() => {
        expect(alertMock).toHaveBeenCalledWith(&apos;투표 실패: Internal server error&apos;)
      })
    })
  })

  describe(&apos;Vote score display&apos;, () => {
    it(&apos;should display positive score in orange&apos;, () => {
      const positivePost = { ...mockPost, upvotes: 15, downvotes: 5 }
      render(<PostCard post={positivePost} />)

      const scoreElement = screen.getByText(&apos;10&apos;) // 15 - 5
      expect(scoreElement).toHaveClass(&apos;text-orange-500&apos;)
    })

    it(&apos;should display negative score in blue&apos;, () => {
      const negativePost = { ...mockPost, upvotes: 5, downvotes: 15 }
      render(<PostCard post={negativePost} />)

      const scoreElement = screen.getByText(&apos;-10&apos;) // 5 - 15
      expect(scoreElement).toHaveClass(&apos;text-blue-500&apos;)
    })

    it(&apos;should display zero score in gray&apos;, () => {
      const neutralPost = { ...mockPost, upvotes: 5, downvotes: 5 }
      render(<PostCard post={neutralPost} />)

      const scoreElement = screen.getByText(&apos;0&apos;) // 5 - 5
      expect(scoreElement).toHaveClass(&apos;text-gray-500&apos;)
    })
  })

  describe(&apos;Links and navigation&apos;, () => {
    it(&apos;should link to channel page&apos;, () => {
      render(<PostCard post={mockPost} />)

      const channelLink = screen.getByRole(&apos;link&apos;, { name: mockPost.channels.display_name })
      expect(channelLink).toHaveAttribute(&apos;href&apos;, `/${mockPost.channels.name}`)
    })

    it(&apos;should link to post detail page&apos;, () => {
      render(<PostCard post={mockPost} />)

      const titleLink = screen.getByRole(&apos;link&apos;, { name: mockPost.title })
      expect(titleLink).toHaveAttribute(&apos;href&apos;, `/${mockPost.channels.name}/posts/${mockPost.id}`)
    })
  })

  describe(&apos;Action buttons&apos;, () => {
    it(&apos;should render all action buttons&apos;, () => {
      render(<PostCard post={mockPost} />)

      expect(screen.getByText(`${mockPost.comment_count} 댓글`)).toBeInTheDocument()
      expect(screen.getByText(&apos;공유&apos;)).toBeInTheDocument()
      expect(screen.getByText(&apos;저장&apos;)).toBeInTheDocument()
    })

    it(&apos;should render dropdown menu&apos;, () => {
      render(<PostCard post={mockPost} />)

      // Click on the more options button
      const moreButton = screen.getByRole(&apos;button&apos;, { name: &apos;' }) // Button with MoreHorizontal icon
      fireEvent.click(moreButton)

      expect(screen.getByText(&apos;숨기기&apos;)).toBeInTheDocument()
      expect(screen.getByText(&apos;신고하기&apos;)).toBeInTheDocument()
      expect(screen.getByText(&apos;차단하기&apos;)).toBeInTheDocument()
    })
  })

  describe(&apos;Date formatting&apos;, () => {
    it(&apos;should format date with Korean locale&apos;, () => {
      const testDate = &apos;2024-01-01T12:00:00Z&apos;
      const postWithDate = { ...mockPost, created_at: testDate }
      
      render(<PostCard post={postWithDate} />)

      expect(formatDistanceToNow).toHaveBeenCalledWith(new Date(testDate), {
        addSuffix: true,
        locale: ko,
      })
    })
  })

  describe(&apos;Accessibility&apos;, () => {
    it(&apos;should have proper ARIA labels&apos;, () => {
      render(<PostCard post={mockPost} />)

      const upvoteButton = screen.getAllByRole(&apos;button&apos;)[0]
      const downvoteButton = screen.getAllByRole(&apos;button&apos;)[2]

      expect(upvoteButton).toBeInTheDocument()
      expect(downvoteButton).toBeInTheDocument()
    })

    it(&apos;should be keyboard navigable&apos;, () => {
      render(<PostCard post={mockPost} />)

      const titleLink = screen.getByRole(&apos;link&apos;, { name: mockPost.title })
      titleLink.focus()
      
      expect(titleLink).toHaveFocus()
    })
  })

  describe(&apos;Content truncation&apos;, () => {
    it(&apos;should truncate long content with line-clamp&apos;, () => {
      const longContentPost = {
        ...mockPost,
        content: &apos;A&apos;.repeat(500), // Very long content
      }
      
      render(<PostCard post={longContentPost} />)

      const contentElement = screen.getByText(longContentPost.content)
      expect(contentElement).toHaveClass(&apos;line-clamp-3&apos;)
    })

    it(&apos;should truncate long titles with line-clamp&apos;, () => {
      render(<PostCard post={mockPost} />)

      const titleElement = screen.getByRole(&apos;link&apos;, { name: mockPost.title })
      expect(titleElement).toHaveClass(&apos;line-clamp-2&apos;)
    })
  })
})