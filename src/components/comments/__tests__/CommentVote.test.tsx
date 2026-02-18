import React from &apos;react&apos;
import { render, screen, fireEvent, waitFor } from &apos;@testing-library/react&apos;
import CommentVote from &apos;../CommentVote&apos;

describe(&apos;CommentVote&apos;, () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
    global.alert = jest.fn()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  const defaultProps = {
    commentId: &apos;comment-123&apos;,
    initialUpvotes: 5,
    initialDownvotes: 2,
  }

  describe(&apos;Initial render&apos;, () => {
    it(&apos;should render vote buttons and initial score&apos;, () => {
      render(<CommentVote {...defaultProps} />)

      // Should show vote score (upvotes - downvotes)
      expect(screen.getByText(&apos;3&apos;)).toBeInTheDocument() // 5 - 2 = 3

      // Should have up and down vote buttons
      const buttons = screen.getAllByRole(&apos;button&apos;)
      expect(buttons).toHaveLength(2)
    })

    it(&apos;should load user vote on mount&apos;, async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          userVote: &apos;up&apos;,
          upvotes: 6,
          downvotes: 2,
        }),
      })

      render(<CommentVote {...defaultProps} />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(&apos;/api/comments/comment-123/vote&apos;)
      })

      // Should update with server data
      await waitFor(() => {
        expect(screen.getByText(&apos;4&apos;)).toBeInTheDocument() // 6 - 2 = 4
      })
    })

    it(&apos;should handle vote loading error gracefully&apos;, async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error(&apos;Network error&apos;))

      // Should not crash
      render(<CommentVote {...defaultProps} />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled()
      })

      // Should still show initial values
      expect(screen.getByText(&apos;3&apos;)).toBeInTheDocument()
    })
  })

  describe(&apos;Vote score display&apos;, () => {
    it(&apos;should display positive score in orange&apos;, () => {
      render(<CommentVote commentId=&quot;comment-123&quot; initialUpvotes={10} initialDownvotes={3} />)

      const scoreElement = screen.getByText(&apos;7&apos;) // 10 - 3
      expect(scoreElement).toHaveClass(&apos;text-orange-500&apos;)
    })

    it(&apos;should display negative score in blue&apos;, () => {
      render(<CommentVote commentId=&quot;comment-123&quot; initialUpvotes={2} initialDownvotes={8} />)

      const scoreElement = screen.getByText(&apos;-6&apos;) // 2 - 8
      expect(scoreElement).toHaveClass(&apos;text-blue-500&apos;)
    })

    it(&apos;should display zero score in gray&apos;, () => {
      render(<CommentVote commentId=&quot;comment-123&quot; initialUpvotes={5} initialDownvotes={5} />)

      const scoreElement = screen.getByText(&apos;0&apos;) // 5 - 5
      expect(scoreElement).toHaveClass(&apos;text-gray-500&apos;)
    })
  })

  describe(&apos;Upvote functionality&apos;, () => {
    it(&apos;should handle upvote click&apos;, async () => {
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
            userVote: &apos;up&apos;,
            upvotes: 6,
            downvotes: 2,
          }),
        })

      render(<CommentVote {...defaultProps} />)

      // Wait for initial load
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1)
      })

      const upvoteButton = screen.getAllByRole(&apos;button&apos;)[0]
      fireEvent.click(upvoteButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(&apos;/api/comments/comment-123/vote&apos;, {
          method: &apos;POST&apos;,
          headers: {
            &apos;Content-Type&apos;: &apos;application/json&apos;,
          },
          body: JSON.stringify({ voteType: &apos;up&apos; }),
        })
      })

      // Should update score
      await waitFor(() => {
        expect(screen.getByText(&apos;4&apos;)).toBeInTheDocument() // 6 - 2 = 4
      })
    })

    it(&apos;should show upvoted state&apos;, async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            userVote: &apos;up&apos;,
            upvotes: 6,
            downvotes: 2,
          }),
        })

      render(<CommentVote {...defaultProps} />)

      await waitFor(() => {
        const upvoteButton = screen.getAllByRole(&apos;button&apos;)[0]
        expect(upvoteButton).toHaveClass(&apos;text-orange-500&apos;)
      })
    })
  })

  describe(&apos;Downvote functionality&apos;, () => {
    it(&apos;should handle downvote click&apos;, async () => {
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
            userVote: &apos;down&apos;,
            upvotes: 5,
            downvotes: 3,
          }),
        })

      render(<CommentVote {...defaultProps} />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1)
      })

      const downvoteButton = screen.getAllByRole(&apos;button&apos;)[1]
      fireEvent.click(downvoteButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(&apos;/api/comments/comment-123/vote&apos;, {
          method: &apos;POST&apos;,
          headers: {
            &apos;Content-Type&apos;: &apos;application/json&apos;,
          },
          body: JSON.stringify({ voteType: &apos;down&apos; }),
        })
      })

      // Should update score
      await waitFor(() => {
        expect(screen.getByText(&apos;2&apos;)).toBeInTheDocument() // 5 - 3 = 2
      })
    })

    it(&apos;should show downvoted state&apos;, async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            userVote: &apos;down&apos;,
            upvotes: 5,
            downvotes: 3,
          }),
        })

      render(<CommentVote {...defaultProps} />)

      await waitFor(() => {
        const downvoteButton = screen.getAllByRole(&apos;button&apos;)[1]
        expect(downvoteButton).toHaveClass(&apos;text-blue-500&apos;)
      })
    })
  })

  describe(&apos;Vote toggling&apos;, () => {
    it(&apos;should toggle upvote when same vote is clicked&apos;, async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            userVote: &apos;up&apos;,
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

      const upvoteButton = screen.getAllByRole(&apos;button&apos;)[0]
      fireEvent.click(upvoteButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(&apos;/api/comments/comment-123/vote&apos;, {
          method: &apos;POST&apos;,
          headers: {
            &apos;Content-Type&apos;: &apos;application/json&apos;,
          },
          body: JSON.stringify({ voteType: &apos;remove&apos; }),
        })
      })
    })

    it(&apos;should toggle downvote when same vote is clicked&apos;, async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            userVote: &apos;down&apos;,
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

      const downvoteButton = screen.getAllByRole(&apos;button&apos;)[1]
      fireEvent.click(downvoteButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(&apos;/api/comments/comment-123/vote&apos;, {
          method: &apos;POST&apos;,
          headers: {
            &apos;Content-Type&apos;: &apos;application/json&apos;,
          },
          body: JSON.stringify({ voteType: &apos;remove&apos; }),
        })
      })
    })
  })

  describe(&apos;Vote changes&apos;, () => {
    it(&apos;should change upvote to downvote&apos;, async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            userVote: &apos;up&apos;,
            upvotes: 6,
            downvotes: 2,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            userVote: &apos;down&apos;,
            upvotes: 5,
            downvotes: 3,
          }),
        })

      render(<CommentVote {...defaultProps} />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1)
      })

      const downvoteButton = screen.getAllByRole(&apos;button&apos;)[1]
      fireEvent.click(downvoteButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(&apos;/api/comments/comment-123/vote&apos;, {
          method: &apos;POST&apos;,
          headers: {
            &apos;Content-Type&apos;: &apos;application/json&apos;,
          },
          body: JSON.stringify({ voteType: &apos;down&apos; }),
        })
      })

      // Should update score and button states
      await waitFor(() => {
        expect(screen.getByText(&apos;2&apos;)).toBeInTheDocument() // 5 - 3 = 2
        expect(downvoteButton).toHaveClass(&apos;text-blue-500&apos;)
      })
    })

    it(&apos;should change downvote to upvote&apos;, async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            userVote: &apos;down&apos;,
            upvotes: 5,
            downvotes: 3,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            userVote: &apos;up&apos;,
            upvotes: 6,
            downvotes: 2,
          }),
        })

      render(<CommentVote {...defaultProps} />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1)
      })

      const upvoteButton = screen.getAllByRole(&apos;button&apos;)[0]
      fireEvent.click(upvoteButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(&apos;/api/comments/comment-123/vote&apos;, {
          method: &apos;POST&apos;,
          headers: {
            &apos;Content-Type&apos;: &apos;application/json&apos;,
          },
          body: JSON.stringify({ voteType: &apos;up&apos; }),
        })
      })
    })
  })

  describe(&apos;Loading states&apos;, () => {
    it(&apos;should prevent multiple simultaneous votes&apos;, async () => {
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

    it(&apos;should show loading state on buttons&apos;, async () => {
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

      const upvoteButton = screen.getAllByRole(&apos;button&apos;)[0]
      const downvoteButton = screen.getAllByRole(&apos;button&apos;)[1]
      
      fireEvent.click(upvoteButton)

      // Both buttons should be disabled and have opacity class
      expect(upvoteButton).toBeDisabled()
      expect(downvoteButton).toBeDisabled()
      expect(upvoteButton).toHaveClass(&apos;opacity-50&apos;)
      expect(downvoteButton).toHaveClass(&apos;opacity-50&apos;)
    })
  })

  describe(&apos;Error handling&apos;, () => {
    it(&apos;should show alert for authentication error&apos;, async () => {
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
            error: &apos;Not authenticated&apos;,
          }),
        })

      render(<CommentVote {...defaultProps} />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1)
      })

      const upvoteButton = screen.getAllByRole(&apos;button&apos;)[0]
      fireEvent.click(upvoteButton)

      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith(&apos;투표하려면 로그인이 필요합니다.&apos;)
      })
    })

    it(&apos;should show alert for general vote error&apos;, async () => {
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
            error: &apos;Internal server error&apos;,
          }),
        })

      render(<CommentVote {...defaultProps} />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1)
      })

      const upvoteButton = screen.getAllByRole(&apos;button&apos;)[0]
      fireEvent.click(upvoteButton)

      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith(&apos;투표 실패: Internal server error&apos;)
      })
    })

    it(&apos;should handle network errors gracefully&apos;, async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            userVote: null,
            upvotes: 5,
            downvotes: 2,
          }),
        })
        .mockRejectedValueOnce(new Error(&apos;Network error&apos;))

      render(<CommentVote {...defaultProps} />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1)
      })

      const upvoteButton = screen.getAllByRole(&apos;button&apos;)[0]
      
      // Should not crash
      fireEvent.click(upvoteButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2)
      })

      // Should reset loading state
      expect(upvoteButton).not.toBeDisabled()
    })

    it(&apos;should handle malformed response gracefully&apos;, async () => {
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
            throw new Error(&apos;Invalid JSON&apos;)
          },
        })

      render(<CommentVote {...defaultProps} />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1)
      })

      const upvoteButton = screen.getAllByRole(&apos;button&apos;)[0]
      fireEvent.click(upvoteButton)

      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith(&apos;투표 실패: 알 수 없는 오류&apos;)
      })
    })
  })

  describe(&apos;Accessibility&apos;, () => {
    it(&apos;should have proper button roles&apos;, () => {
      render(<CommentVote {...defaultProps} />)

      const buttons = screen.getAllByRole(&apos;button&apos;)
      expect(buttons).toHaveLength(2)
    })

    it(&apos;should be keyboard navigable&apos;, () => {
      render(<CommentVote {...defaultProps} />)

      const upvoteButton = screen.getAllByRole(&apos;button&apos;)[0]
      upvoteButton.focus()
      
      expect(upvoteButton).toHaveFocus()
    })
  })

  describe(&apos;Visual feedback&apos;, () => {
    it(&apos;should show correct colors for vote states&apos;, async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            userVote: &apos;up&apos;,
            upvotes: 6,
            downvotes: 2,
          }),
        })

      render(<CommentVote {...defaultProps} />)

      await waitFor(() => {
        const upvoteButton = screen.getAllByRole(&apos;button&apos;)[0]
        const downvoteButton = screen.getAllByRole(&apos;button&apos;)[1]
        
        expect(upvoteButton).toHaveClass(&apos;text-orange-500&apos;)
        expect(downvoteButton).toHaveClass(&apos;text-gray-400&apos;)
      })
    })

    it(&apos;should show correct colors for neutral state&apos;, async () => {
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
        const buttons = screen.getAllByRole(&apos;button&apos;)
        buttons.forEach(button => {
          expect(button).toHaveClass(&apos;text-gray-400&apos;)
        })
      })
    })
  })
})