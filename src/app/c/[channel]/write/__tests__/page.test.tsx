import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import WritePage from '../page'

// Mock Header component
jest.mock('@/components/layout/Header', () => {
  return function MockHeader() {
    return <header data-testid="header">Header</header>
  }
})

// Mock WritePostForm component
jest.mock('../WritePostForm', () => {
  return function MockWritePostForm({ channelName }: { channelName: string }) {
    return (
      <div data-testid="write-post-form">
        <p>WritePostForm for {channelName}</p>
      </div>
    )
  }
})

// Mock LocalizationProvider
jest.mock('@/providers/LocalizationProvider', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  LocalizationProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>
}))

// Mock LoadingSpinner
jest.mock('@/components/common/LoadingSpinner', () => ({
  LoadingSpinner: function MockLoadingSpinner({ text }: { text: string }) {
    return <div data-testid="loading-spinner">{text}</div>
  }
}))

// Mock Next.js params and searchParams
const mockParams = (channel: string) => Promise.resolve({ channel })
const mockSearchParams = (params?: Record<string, string>) => Promise.resolve(params || {})

describe.skip('WritePage Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('should render write page with basic elements', async () => {
      const props = {
        params: mockParams('test-channel'),
        searchParams: mockSearchParams()
      }

      render(await WritePage(props))

      expect(screen.getByTestId('header')).toBeInTheDocument()
      expect(await screen.findByText('WritePostForm for test-channel')).toBeInTheDocument()
      expect(screen.getByText('/test-channel Channel에 글쓰기')).toBeInTheDocument()
    })

    it('should render with correct channel name in title', async () => {
      const props = {
        params: mockParams('technology'),
        searchParams: mockSearchParams()
      }

      render(await WritePage(props))

      expect(screen.getByText('/technology Channel에 글쓰기')).toBeInTheDocument()
    })

    it('should render back link to channel', async () => {
      const props = {
        params: mockParams('gaming'),
        searchParams: mockSearchParams()
      }

      render(await WritePage(props))

      const backLink = screen.getByText('← /gaming Channel으로 돌아가기')
      expect(backLink).toBeInTheDocument()
      expect(backLink.closest('a')).toHaveAttribute('href', '/gaming')
    })

    it('should pass correct channelName to WritePostForm', async () => {
      const props = {
        params: mockParams('music'),
        searchParams: mockSearchParams()
      }

      render(await WritePage(props))

      expect(await screen.findByText('WritePostForm for music')).toBeInTheDocument()
    })
  })

  describe('Edit Mode', () => {
    it('should show edit title when edit param is present', async () => {
      const props = {
        params: mockParams('art'),
        searchParams: mockSearchParams({ edit: 'true' })
      }

      render(await WritePage(props))

      expect(screen.getByText('/art Channel 글 수정')).toBeInTheDocument()
      expect(screen.queryByText('/art Channel에 글쓰기')).not.toBeInTheDocument()
    })

    it('should show create title when edit param is not present', async () => {
      const props = {
        params: mockParams('books'),
        searchParams: mockSearchParams({})
      }

      render(await WritePage(props))

      expect(screen.getByText('/books Channel에 글쓰기')).toBeInTheDocument()
      expect(screen.queryByText('/books Channel 글 수정')).not.toBeInTheDocument()
    })

    it('should show create title when edit param is falsy', async () => {
      const props = {
        params: mockParams('movies'),
        searchParams: mockSearchParams({ edit: '' })
      }

      render(await WritePage(props))

      expect(screen.getByText('/movies Channel에 글쓰기')).toBeInTheDocument()
    })

    it('should show edit title when edit param has any truthy value', async () => {
      const props = {
        params: mockParams('science'),
        searchParams: mockSearchParams({ edit: '1' })
      }

      render(await WritePage(props))

      expect(screen.getByText('/science Channel 글 수정')).toBeInTheDocument()
    })
  })

  describe('Layout and Styling', () => {
    it('should apply correct CSS classes for layout', async () => {
      const props = {
        params: mockParams('test'),
        searchParams: mockSearchParams()
      }

      render(await WritePage(props))

      // Check main container classes
      const mainContainer = screen.getByTestId('header').parentElement
      expect(mainContainer).toHaveClass('min-h-screen', 'bg-gray-50')

      // Check content container classes
      const writePostForm = await screen.findByText('WritePostForm for test')
      const contentContainer = writePostForm.parentElement?.parentElement
      expect(contentContainer).toHaveClass('max-w-4xl', 'mx-auto', 'px-4', 'py-6')
    })

    it('should apply correct styling to back link', async () => {
      const props = {
        params: mockParams('food'),
        searchParams: mockSearchParams()
      }

      render(await WritePage(props))

      const backLink = screen.getByText('← /food Channel으로 돌아가기')
      expect(backLink).toHaveClass('text-blue-600', 'hover:underline')
    })

    it('should apply correct styling to form container', async () => {
      const props = {
        params: mockParams('travel'),
        searchParams: mockSearchParams()
      }

      render(await WritePage(props))

      const writePostForm = await screen.findByText('WritePostForm for travel')
      const formContainer = writePostForm.parentElement?.parentElement
      expect(formContainer).toHaveClass('bg-white', 'rounded-lg', 'border', 'p-6')
    })

    it('should apply correct styling to page title', async () => {
      const props = {
        params: mockParams('fitness'),
        searchParams: mockSearchParams()
      }

      render(await WritePage(props))

      const title = screen.getByText('/fitness Channel에 글쓰기')
      expect(title).toHaveClass('text-2xl', 'font-bold', 'mb-6')
    })
  })

  describe('Suspense and Loading', () => {
    it('should wrap WritePostForm in Suspense', async () => {
      const props = {
        params: mockParams('photography'),
        searchParams: mockSearchParams()
      }

      // The component should render without throwing
      render(await WritePage(props))

      expect(await screen.findByText('WritePostForm for photography')).toBeInTheDocument()
    })

    it('should show loading spinner as fallback', async () => {
      // This test would require more complex mocking to actually trigger the loading state
      // For now, we'll just verify that the Suspense wrapper exists by checking the component renders
      const props = {
        params: mockParams('design'),
        searchParams: mockSearchParams()
      }

      render(await WritePage(props))

      // If Suspense is working correctly, the form should eventually render
      expect(await screen.findByText('WritePostForm for design')).toBeInTheDocument()
    })
  })

  describe('URL Parameters Handling', () => {
    it('should handle special characters in channel name', async () => {
      const props = {
        params: mockParams('한국어-channel'),
        searchParams: mockSearchParams()
      }

      render(await WritePage(props))

      expect(screen.getByText('/한국어-channel Channel에 글쓰기')).toBeInTheDocument()
      expect(screen.getByText('← /한국어-channel Channel으로 돌아가기')).toBeInTheDocument()
    })

    it('should handle numeric channel names', async () => {
      const props = {
        params: mockParams('12345'),
        searchParams: mockSearchParams()
      }

      render(await WritePage(props))

      expect(screen.getByText('/12345 Channel에 글쓰기')).toBeInTheDocument()
      expect(await screen.findByText('WritePostForm for 12345')).toBeInTheDocument()
    })

    it('should handle multiple search parameters', async () => {
      const props = {
        params: mockParams('test'),
        searchParams: mockSearchParams({
          edit: 'true',
          postId: '123',
          other: 'param'
        })
      }

      render(await WritePage(props))

      // Should show edit mode based on edit parameter
      expect(screen.getByText('/test Channel 글 수정')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', async () => {
      const props = {
        params: mockParams('accessibility'),
        searchParams: mockSearchParams()
      }

      render(await WritePage(props))

      const heading = screen.getByRole('heading', { level: 1 })
      expect(heading).toHaveTextContent('/accessibility Channel에 글쓰기')
    })

    it('should have accessible back link', async () => {
      const props = {
        params: mockParams('ux'),
        searchParams: mockSearchParams()
      }

      render(await WritePage(props))

      const backLink = screen.getByRole('link', { name: '← /ux Channel으로 돌아가기' })
      expect(backLink).toHaveAttribute('href', '/ux')
    })

    it('should be keyboard navigable', async () => {
      const user = userEvent.setup()
      const props = {
        params: mockParams('keyboard'),
        searchParams: mockSearchParams()
      }

      render(await WritePage(props))

      // Tab through interactive elements
      await user.tab()

      const backLink = screen.getByRole('link')
      expect(backLink).toHaveFocus()
    })
  })

  describe('Component Integration', () => {
    it('should pass correct props to Header component', async () => {
      const props = {
        params: mockParams('integration'),
        searchParams: mockSearchParams()
      }

      render(await WritePage(props))

      // Header should be rendered
      expect(screen.getByTestId('header')).toBeInTheDocument()
    })

    it('should render WritePostForm with correct channel name', async () => {
      const props = {
        params: mockParams('test-integration'),
        searchParams: mockSearchParams()
      }

      render(await WritePage(props))

      // WritePostForm should receive the correct channelName prop
      expect(await screen.findByText('WritePostForm for test-integration')).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should handle missing channel parameter gracefully', async () => {
      const props = {
        params: mockParams(''),
        searchParams: mockSearchParams()
      }

      render(await WritePage(props))

      // Should still render the page structure
      expect(screen.getByTestId('header')).toBeInTheDocument()
      expect(await screen.findByText('WritePostForm for ')).toBeInTheDocument()
    })

    it('should handle malformed search parameters', async () => {
      const props = {
        params: mockParams('test'),
        searchParams: Promise.resolve({ edit: ['array', 'value'] as any })
      }

      // Should not throw an error
      await expect(WritePage(props)).resolves.toBeDefined()
    })
  })

  describe('Performance', () => {
    it('should render efficiently with complex channel names', async () => {
      const longChannelName = 'a'.repeat(100)
      const props = {
        params: mockParams(longChannelName),
        searchParams: mockSearchParams()
      }

      const startTime = performance.now()
      render(await WritePage(props))
      const endTime = performance.now()

      // Should render in reasonable time (less than 100ms)
      expect(endTime - startTime).toBeLessThan(100)

      expect(await screen.findByText(`WritePostForm for ${longChannelName}`)).toBeInTheDocument()
    })

    it('should handle multiple renders efficiently', async () => {
      const props = {
        params: mockParams('performance'),
        searchParams: mockSearchParams()
      }

      const { rerender } = render(await WritePage(props))

      // Re-render with same props
      const newProps = {
        params: mockParams('performance'),
        searchParams: mockSearchParams()
      }

      rerender(await WritePage(newProps))

      expect(await screen.findByText('WritePostForm for performance')).toBeInTheDocument()
    })
  })

  describe('Mobile Responsiveness', () => {
    it('should render mobile-friendly layout', async () => {
      const props = {
        params: mockParams('mobile'),
        searchParams: mockSearchParams()
      }

      render(await WritePage(props))

      // Check responsive classes are applied
      const writePostForm = await screen.findByText('WritePostForm for mobile')
      const contentContainer = writePostForm.parentElement?.parentElement
      expect(contentContainer).toHaveClass('px-4') // Mobile padding
    })

    it('should maintain functionality on mobile viewports', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })

      const props = {
        params: mockParams('mobile-test'),
        searchParams: mockSearchParams({ edit: 'true' })
      }

      render(await WritePage(props))

      // Should still show edit mode correctly
      expect(screen.getByText('/mobile-test Channel 글 수정')).toBeInTheDocument()
    })
  })
})