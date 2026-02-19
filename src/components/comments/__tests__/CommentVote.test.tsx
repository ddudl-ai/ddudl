import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import CommentVote from '../CommentVote'

describe('CommentVote', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
    global.alert = jest.fn()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  const defaultProps = {
    commentId: 'comment-123',
    initialUpvotes: 5,
    initialDownvotes: 2,
  }

  describe('Initial render', () => {
    it('should render vote buttons and initial score', () => {
      render(<CommentVote {...defaultProps} />)

      // Should show vote score (upvotes - downvotes)
      expect(screen.getByText('3')).toBeInTheDocument() // 5 - 2 = 3

      // Should have up and down vote buttons
      const buttons = screen.getAllByRole('button')
      expect(buttons).toHaveLength(2)
    })

    it('should load user vote on mount', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          userVote: 'up',
          upvotes: 6,
          downvotes: 2,
        }),
      })

      render(<CommentVote {...defaultProps} />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/comments/comment-123/vote')
      })

      // Should update with server data
      await waitFor(() => {
        expect(screen.getByText('4')).toBeInTheDocument() // 6 - 2 = 4
      })
    })

    it('should handle vote loading error gracefully', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

      // Should not crash
      render(<CommentVote {...defaultProps} />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled()
      })

      // Should still show initial values
      expect(screen.getByText('3')).toBeInTheDocument()
    })
  })

  describe('Vote score display', () => {
    it('should display positive score in orange', () => {
      render(<CommentVote commentId="comment-123" initialUpvotes={10} initialDownvotes={3} />)

      const scoreElement = screen.getByText('7') // 10 - 3
      expect(scoreElement).toHaveClass('text-orange-500')
    })

    it('should display negative score in blue', () => {
      render(<CommentVote commentId="comment-123" initialUpvotes={2} initialDownvotes={8} />)

      const scoreElement = screen.getByText('-6') // 2 - 8
      expect(scoreElement).toHaveClass('text-blue-500')
    })

    it('should display zero score in gray', () => {
      render(<CommentVote commentId="comment-123" initialUpvotes={5} initialDownvotes={5} />)

      const scoreElement = screen.getByText('0') // 5 - 5
      expect(scoreElement).toHaveClass('text-gray-500')
    })
  })

  describe('Upvote functionality', () => {
    it('should handle upvote click', async () => {
      ;(global.fetch as jest.Mock)
        // Initial vote loading
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            userVote: null,
            upvotes: 5,
            downvotes: 2,
          }),
        })
        // Vote submission
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            userVote: 'up',
            upvotes: 6,
            downvotes: 2,
          }),
        })

      render(<CommentVote {...defaultProps} />)

      // Wait for initial load
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1)
      })

      const upvoteButton = screen.getAllByRole('button')[0]
      fireEvent.click(upvoteButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/comments/comment-123/vote', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ voteType: 'up' }),
        })
      })

      // Should update score
      await waitFor(() => {
        expect(screen.getByText('4')).toBeInTheDocument() // 6 - 2 = 4
      })
    })

    it('should show upvoted state', async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            userVote: 'up',
            upvotes: 6,
            downvotes: 2,
          }),
        })

      render(<CommentVote {...defaultProps} />)

      await waitFor(() => {
        const upvoteButton = screen.getAllByRole('button')[0]
        expect(upvoteButton).toHaveClass('text-orange-500')
      })
    })
  })

  describe('Downvote functionality', () => {
    it('should handle downvote click', async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            userVote: null,
            upvotes: 5,
            downvotes: 2,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            userVote: 'down',
            upvotes: 5,
            downvotes: 3,
          }),
        })

      render(<CommentVote {...defaultProps} />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1)
      })

      const downvoteButton = screen.getAllByRole('button')[1]
      fireEvent.click(downvoteButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/comments/comment-123/vote', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ voteType: 'down' }),
        })
      })

      // Should update score
      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument() // 5 - 3 = 2
      })
    })

    it('should show downvoted state', async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            userVote: 'down',
            upvotes: 5,
            downvotes: 3,
          }),
        })

      render(<CommentVote {...defaultProps} />)

      await waitFor(() => {
        const downvoteButton = screen.getAllByRole('button')[1]
        expect(downvoteButton).toHaveClass('text-blue-500')
      })
    })
  })

  describe('Vote toggling', () => {
    it('should toggle upvote when same vote is clicked', async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            userVote: 'up',
            upvotes: 6,
            downvotes: 2,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            userVote: null,
            upvotes: 5,
            downvotes: 2,
          }),
        })

      render(<CommentVote {...defaultProps} />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1)
      })

      const upvoteButton = screen.getAllByRole('button')[0]
      fireEvent.click(upvoteButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/comments/comment-123/vote', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ voteType: 'remove' }),
        })
      })
    })

    it('should toggle downvote when same vote is clicked', async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            userVote: 'down',
            upvotes: 5,
            downvotes: 3,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            userVote: null,
            upvotes: 5,
            downvotes: 2,
          }),
        })

      render(<CommentVote {...defaultProps} />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1)
      })

      const downvoteButton = screen.getAllByRole('button')[1]
      fireEvent.click(downvoteButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/comments/comment-123/vote', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ voteType: 'remove' }),
        })
      })
    })
  })

  describe('Vote changes', () => {
    it('should change upvote to downvote', async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            userVote: 'up',
            upvotes: 6,
            downvotes: 2,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            userVote: 'down',
            upvotes: 5,
            downvotes: 3,
          }),
        })

      render(<CommentVote {...defaultProps} />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1)
      })

      const downvoteButton = screen.getAllByRole('button')[1]
      fireEvent.click(downvoteButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/comments/comment-123/vote', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ voteType: 'down' }),
        })
      })

      // Should update score and button states
      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument() // 5 - 3 = 2
        expect(downvoteButton).toHaveClass('text-blue-500')
      })
    })

    it('should change downvote to upvote', async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            userVote: 'down',
            upvotes: 5,
            downvotes: 3,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            userVote: 'up',
            upvotes: 6,
            downvotes: 2,
          }),
        })

      render(<CommentVote {...defaultProps} />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1)
      })

      const upvoteButton = screen.getAllByRole('button')[0]
      fireEvent.click(upvoteButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/comments/comment-123/vote', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ voteType: 'up' }),
        })
      })
    })
  })

  describe('Loading states', () => {
    it('should prevent multiple simultaneous votes', async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            userVote: null,
            upvotes: 5,
            downvotes: 2,
          }),
        })
        .mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

      render(<CommentVote {...defaultProps} />)

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

    it('should show loading state on buttons', async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            userVote: null,
            upvotes: 5,
            downvotes: 2,
          }),
        })
        .mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

      render(<CommentVote {...defaultProps} />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1)
      })

      const upvoteButton = screen.getAllByRole('button')[0]
      const downvoteButton = screen.getAllByRole('button')[1]
      
      fireEvent.click(upvoteButton)

      // Both buttons should be disabled and have opacity class
      expect(upvoteButton).toBeDisabled()
      expect(downvoteButton).toBeDisabled()
      expect(upvoteButton).toHaveClass('opacity-50')
      expect(downvoteButton).toHaveClass('opacity-50')
    })
  })

  describe('Error handling', () => {
    it('should show alert for authentication error', async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            userVote: null,
            upvotes: 5,
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

      render(<CommentVote {...defaultProps} />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1)
      })

      const upvoteButton = screen.getAllByRole('button')[0]
      fireEvent.click(upvoteButton)

      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith('투표하려면 로그인이 필요합니다.')
      })
    })

    it('should show alert for general vote error', async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            userVote: null,
            upvotes: 5,
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

      render(<CommentVote {...defaultProps} />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1)
      })

      const upvoteButton = screen.getAllByRole('button')[0]
      fireEvent.click(upvoteButton)

      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith('투표 실패: Internal server error')
      })
    })

    it('should handle network errors gracefully', async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            userVote: null,
            upvotes: 5,
            downvotes: 2,
          }),
        })
        .mockRejectedValueOnce(new Error('Network error'))

      render(<CommentVote {...defaultProps} />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1)
      })

      const upvoteButton = screen.getAllByRole('button')[0]
      
      // Should not crash
      fireEvent.click(upvoteButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2)
      })

      // Should reset loading state
      expect(upvoteButton).not.toBeDisabled()
    })

    it('should handle malformed response gracefully', async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            userVote: null,
            upvotes: 5,
            downvotes: 2,
          }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: async () => {
            throw new Error('Invalid JSON')
          },
        })

      render(<CommentVote {...defaultProps} />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1)
      })

      const upvoteButton = screen.getAllByRole('button')[0]
      fireEvent.click(upvoteButton)

      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith('투표 실패: 알 수 없는 오류')
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper button roles', () => {
      render(<CommentVote {...defaultProps} />)

      const buttons = screen.getAllByRole('button')
      expect(buttons).toHaveLength(2)
    })

    it('should be keyboard navigable', () => {
      render(<CommentVote {...defaultProps} />)

      const upvoteButton = screen.getAllByRole('button')[0]
      upvoteButton.focus()
      
      expect(upvoteButton).toHaveFocus()
    })
  })

  describe('Visual feedback', () => {
    it('should show correct colors for vote states', async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            userVote: 'up',
            upvotes: 6,
            downvotes: 2,
          }),
        })

      render(<CommentVote {...defaultProps} />)

      await waitFor(() => {
        const upvoteButton = screen.getAllByRole('button')[0]
        const downvoteButton = screen.getAllByRole('button')[1]
        
        expect(upvoteButton).toHaveClass('text-orange-500')
        expect(downvoteButton).toHaveClass('text-gray-400')
      })
    })

    it('should show correct colors for neutral state', async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            userVote: null,
            upvotes: 5,
            downvotes: 2,
          }),
        })

      render(<CommentVote {...defaultProps} />)

      await waitFor(() => {
        const buttons = screen.getAllByRole('button')
        buttons.forEach(button => {
          expect(button).toHaveClass('text-gray-400')
        })
      })
    })
  })
})