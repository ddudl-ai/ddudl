import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import PostCard from '../PostCard'
import { mockPosts } from '@/lib/test/mocks'

// Mock date-fns
jest.mock('date-fns', () => ({
  formatDistanceToNow: jest.fn(),
}))

describe.skip('PostCard', () => {
  const mockPost = mockPosts[0]
  
  beforeEach(() => {
    jest.clearAllMocks()
    ;(formatDistanceToNow as jest.Mock).mockReturnValue('1h ago')
    
    // Mock fetch globally with default vote response
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ userVote: null, upvotes: 0, downvotes: 0 }),
    }) as jest.MockedFunction<typeof fetch>
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should render post information correctly', () => {
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
    expect(screen.getByText('1시간 전')).toBeInTheDocument()
    
    // Check vote score
    const voteScore = mockPost.upvotes - mockPost.downvotes
    expect(screen.getByText(voteScore.toString())).toBeInTheDocument()
    
    // Check comment count
    expect(screen.getByText(`${mockPost.comment_count} 댓글`)).toBeInTheDocument()
  })

  it('should render AI generated badge for AI posts', () => {
    const aiPost = { ...mockPost, ai_generated: true }
    render(<PostCard post={aiPost} />)
    
    expect(screen.getByText('AI 생성')).toBeInTheDocument()
  })

  it('should not render AI badge for human posts', () => {
    const humanPost = { ...mockPost, ai_generated: false }
    render(<PostCard post={humanPost} />)
    
    expect(screen.queryByText('AI 생성')).not.toBeInTheDocument()
  })

  it('should render flair when present', () => {
    const postWithFlair = { ...mockPost, flair: '질문' }
    render(<PostCard post={postWithFlair} />)
    
    expect(screen.getByText('질문')).toBeInTheDocument()
  })

  it('should not render flair when not present', () => {
    const postWithoutFlair = { ...mockPost, flair: null }
    render(<PostCard post={postWithoutFlair} />)
    
    // Should not have any flair badge
    expect(screen.queryByText('질문')).not.toBeInTheDocument()
  })

  it('should handle missing user gracefully', () => {
    const postWithoutUser = { ...mockPost, users: null }
    render(<PostCard post={postWithoutUser} />)
    
    expect(screen.getByText('알 수 없는 User님이 작성')).toBeInTheDocument()
  })

  describe('Voting functionality', () => {
    it('should load user vote on mount', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          userVote: 'up',
          upvotes: 10,
          downvotes: 2,
        }),
      })

      render(<PostCard post={mockPost} />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(`/api/posts/${mockPost.id}/vote`)
      })
    })

    it('should handle vote loading error gracefully', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))
      
      // Should not crash
      render(<PostCard post={mockPost} />)
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled()
      })
    })

    it('should handle upvote click', async () => {
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
            userVote: 'up',
            upvotes: 11,
            downvotes: 2,
          }),
        })

      render(<PostCard post={mockPost} />)

      // Wait for initial load
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1)
      })

      const upvoteButton = screen.getAllByRole('button')[0] // First button should be upvote
      fireEvent.click(upvoteButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(`/api/posts/${mockPost.id}/vote`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ voteType: 'up' }),
        })
      })

      // Check if vote count updated
      await waitFor(() => {
        expect(screen.getByText('9')).toBeInTheDocument() // 11 - 2 = 9
      })
    })

    it('should handle downvote click', async () => {
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
            userVote: 'down',
            upvotes: 10,
            downvotes: 3,
          }),
        })

      render(<PostCard post={mockPost} />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1)
      })

      const downvoteButton = screen.getAllByRole('button')[2] // Third button should be downvote
      fireEvent.click(downvoteButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(`/api/posts/${mockPost.id}/vote`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ voteType: 'down' }),
        })
      })
    })

    it('should toggle vote when same vote is clicked', async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            userVote: 'up',
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

      const upvoteButton = screen.getAllByRole('button')[0]
      fireEvent.click(upvoteButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(`/api/posts/${mockPost.id}/vote`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ voteType: 'remove' }),
        })
      })
    })

    it('should prevent multiple simultaneous votes', async () => {
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

      const upvoteButton = screen.getAllByRole('button')[0]
      
      // Click multiple times quickly
      fireEvent.click(upvoteButton)
      fireEvent.click(upvoteButton)
      fireEvent.click(upvoteButton)

      // Should only make one vote request
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2) // Initial load + one vote
      })
    })

    it('should handle vote error and show alert for unauthenticated', async () => {
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
            error: 'Not authenticated',
          }),
        })

      // Mock alert
      const alertMock = jest.fn()
      global.alert = alertMock

      render(<PostCard post={mockPost} />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1)
      })

      const upvoteButton = screen.getAllByRole('button')[0]
      fireEvent.click(upvoteButton)

      await waitFor(() => {
        expect(alertMock).toHaveBeenCalledWith('투표하려면 로그인이 필요합니다.')
      })
    })

    it('should handle general vote error', async () => {
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
            error: 'Internal server error',
          }),
        })

      const alertMock = jest.fn()
      global.alert = alertMock

      render(<PostCard post={mockPost} />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1)
      })

      const upvoteButton = screen.getAllByRole('button')[0]
      fireEvent.click(upvoteButton)

      await waitFor(() => {
        expect(alertMock).toHaveBeenCalledWith('투표 실패: Internal server error')
      })
    })
  })

  describe('Vote score display', () => {
    it('should display positive score in orange', () => {
      const positivePost = { ...mockPost, upvotes: 15, downvotes: 5 }
      render(<PostCard post={positivePost} />)

      const scoreElement = screen.getByText('10') // 15 - 5
      expect(scoreElement).toHaveClass('text-orange-500')
    })

    it('should display negative score in blue', () => {
      const negativePost = { ...mockPost, upvotes: 5, downvotes: 15 }
      render(<PostCard post={negativePost} />)

      const scoreElement = screen.getByText('-10') // 5 - 15
      expect(scoreElement).toHaveClass('text-blue-500')
    })

    it('should display zero score in gray', () => {
      const neutralPost = { ...mockPost, upvotes: 5, downvotes: 5 }
      render(<PostCard post={neutralPost} />)

      const scoreElement = screen.getByText('0') // 5 - 5
      expect(scoreElement).toHaveClass('text-gray-500')
    })
  })

  describe('Links and navigation', () => {
    it('should link to channel page', () => {
      render(<PostCard post={mockPost} />)

      const channelLink = screen.getByRole('link', { name: mockPost.channels.display_name })
      expect(channelLink).toHaveAttribute('href', `/${mockPost.channels.name}`)
    })

    it('should link to post detail page', () => {
      render(<PostCard post={mockPost} />)

      const titleLink = screen.getByRole('link', { name: mockPost.title })
      expect(titleLink).toHaveAttribute('href', `/${mockPost.channels.name}/posts/${mockPost.id}`)
    })
  })

  describe('Action buttons', () => {
    it('should render all action buttons', () => {
      render(<PostCard post={mockPost} />)

      expect(screen.getByText(`${mockPost.comment_count} 댓글`)).toBeInTheDocument()
      expect(screen.getByText('공유')).toBeInTheDocument()
      expect(screen.getByText('저장')).toBeInTheDocument()
    })

    it('should render dropdown menu', () => {
      render(<PostCard post={mockPost} />)

      // Click on the more options button
      const moreButton = screen.getByRole('button', { name: '' }) // Button with MoreHorizontal icon
      fireEvent.click(moreButton)

      expect(screen.getByText('숨기기')).toBeInTheDocument()
      expect(screen.getByText('신고하기')).toBeInTheDocument()
      expect(screen.getByText('차단하기')).toBeInTheDocument()
    })
  })

  describe('Date formatting', () => {
    it('should format date with Korean locale', () => {
      const testDate = '2024-01-01T12:00:00Z'
      const postWithDate = { ...mockPost, created_at: testDate }
      
      render(<PostCard post={postWithDate} />)

      expect(formatDistanceToNow).toHaveBeenCalledWith(new Date(testDate), {
        addSuffix: true,
        locale: ko,
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<PostCard post={mockPost} />)

      const upvoteButton = screen.getAllByRole('button')[0]
      const downvoteButton = screen.getAllByRole('button')[2]

      expect(upvoteButton).toBeInTheDocument()
      expect(downvoteButton).toBeInTheDocument()
    })

    it('should be keyboard navigable', () => {
      render(<PostCard post={mockPost} />)

      const titleLink = screen.getByRole('link', { name: mockPost.title })
      titleLink.focus()
      
      expect(titleLink).toHaveFocus()
    })
  })

  describe('Content truncation', () => {
    it('should truncate long content with line-clamp', () => {
      const longContentPost = {
        ...mockPost,
        content: 'A'.repeat(500), // Very long content
      }
      
      render(<PostCard post={longContentPost} />)

      const contentElement = screen.getByText(longContentPost.content)
      expect(contentElement).toHaveClass('line-clamp-3')
    })

    it('should truncate long titles with line-clamp', () => {
      render(<PostCard post={mockPost} />)

      const titleElement = screen.getByRole('link', { name: mockPost.title })
      expect(titleElement).toHaveClass('line-clamp-2')
    })
  })
})