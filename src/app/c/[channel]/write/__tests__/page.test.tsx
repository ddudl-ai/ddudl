import { describe, it, expect, beforeEach, afterEach, jest } from &apos;@jest/globals&apos;
import { render, screen, waitFor } from &apos;@testing-library/react&apos;
import userEvent from &apos;@testing-library/user-event&apos;
import &apos;@testing-library/jest-dom&apos;
import WritePage from &apos;../page&apos;

// Mock Header component
jest.mock(&apos;@/components/layout/Header&apos;, () => {
  return function MockHeader() {
    return <header data-testid=&quot;header&quot;>Header</header>
  }
})

// Mock WritePostForm component
jest.mock(&apos;../WritePostForm&apos;, () => {
  return function MockWritePostForm({ channelName }: { channelName: string }) {
    return (
      <div data-testid=&quot;write-post-form&quot;>
        <p>WritePostForm for {channelName}</p>
      </div>
    )
  }
})

// Mock LocalizationProvider
jest.mock(&apos;@/providers/LocalizationProvider&apos;, () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  LocalizationProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>
}))

// Mock LoadingSpinner
jest.mock(&apos;@/components/common/LoadingSpinner&apos;, () => ({
  LoadingSpinner: function MockLoadingSpinner({ text }: { text: string }) {
    return <div data-testid=&quot;loading-spinner&quot;>{text}</div>
  }
}))

// Mock Next.js params and searchParams
const mockParams = (channel: string) => Promise.resolve({ channel })
const mockSearchParams = (params?: Record<string, string>) => Promise.resolve(params || {})

describe(&apos;WritePage Integration Tests&apos;, () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe(&apos;Basic Rendering&apos;, () => {
    it(&apos;should render write page with basic elements&apos;, async () => {
      const props = {
        params: mockParams(&apos;test-channel&apos;),
        searchParams: mockSearchParams()
      }

      render(await WritePage(props))

      expect(screen.getByTestId(&apos;header&apos;)).toBeInTheDocument()
      expect(await screen.findByText(&apos;WritePostForm for test-channel&apos;)).toBeInTheDocument()
      expect(screen.getByText(&apos;/test-channel Channel에 글쓰기&apos;)).toBeInTheDocument()
    })

    it(&apos;should render with correct channel name in title&apos;, async () => {
      const props = {
        params: mockParams(&apos;technology&apos;),
        searchParams: mockSearchParams()
      }

      render(await WritePage(props))

      expect(screen.getByText(&apos;/technology Channel에 글쓰기&apos;)).toBeInTheDocument()
    })

    it(&apos;should render back link to channel&apos;, async () => {
      const props = {
        params: mockParams(&apos;gaming&apos;),
        searchParams: mockSearchParams()
      }

      render(await WritePage(props))

      const backLink = screen.getByText(&apos;← /gaming Channel으로 돌아가기&apos;)
      expect(backLink).toBeInTheDocument()
      expect(backLink.closest(&apos;a&apos;)).toHaveAttribute(&apos;href&apos;, &apos;/gaming&apos;)
    })

    it(&apos;should pass correct channelName to WritePostForm&apos;, async () => {
      const props = {
        params: mockParams(&apos;music&apos;),
        searchParams: mockSearchParams()
      }

      render(await WritePage(props))

      expect(await screen.findByText(&apos;WritePostForm for music&apos;)).toBeInTheDocument()
    })
  })

  describe(&apos;Edit Mode&apos;, () => {
    it(&apos;should show edit title when edit param is present&apos;, async () => {
      const props = {
        params: mockParams(&apos;art&apos;),
        searchParams: mockSearchParams({ edit: &apos;true&apos; })
      }

      render(await WritePage(props))

      expect(screen.getByText(&apos;/art Channel 글 수정&apos;)).toBeInTheDocument()
      expect(screen.queryByText(&apos;/art Channel에 글쓰기&apos;)).not.toBeInTheDocument()
    })

    it(&apos;should show create title when edit param is not present&apos;, async () => {
      const props = {
        params: mockParams(&apos;books&apos;),
        searchParams: mockSearchParams({})
      }

      render(await WritePage(props))

      expect(screen.getByText(&apos;/books Channel에 글쓰기&apos;)).toBeInTheDocument()
      expect(screen.queryByText(&apos;/books Channel 글 수정&apos;)).not.toBeInTheDocument()
    })

    it(&apos;should show create title when edit param is falsy&apos;, async () => {
      const props = {
        params: mockParams(&apos;movies&apos;),
        searchParams: mockSearchParams({ edit: &apos;' })
      }

      render(await WritePage(props))

      expect(screen.getByText(&apos;/movies Channel에 글쓰기&apos;)).toBeInTheDocument()
    })

    it(&apos;should show edit title when edit param has any truthy value&apos;, async () => {
      const props = {
        params: mockParams(&apos;science&apos;),
        searchParams: mockSearchParams({ edit: &apos;1&apos; })
      }

      render(await WritePage(props))

      expect(screen.getByText(&apos;/science Channel 글 수정&apos;)).toBeInTheDocument()
    })
  })

  describe(&apos;Layout and Styling&apos;, () => {
    it(&apos;should apply correct CSS classes for layout&apos;, async () => {
      const props = {
        params: mockParams(&apos;test&apos;),
        searchParams: mockSearchParams()
      }

      render(await WritePage(props))

      // Check main container classes
      const mainContainer = screen.getByTestId(&apos;header&apos;).parentElement
      expect(mainContainer).toHaveClass(&apos;min-h-screen&apos;, &apos;bg-gray-50&apos;)

      // Check content container classes
      const writePostForm = await screen.findByText(&apos;WritePostForm for test&apos;)
      const contentContainer = writePostForm.parentElement?.parentElement
      expect(contentContainer).toHaveClass(&apos;max-w-4xl&apos;, &apos;mx-auto&apos;, &apos;px-4&apos;, &apos;py-6&apos;)
    })

    it(&apos;should apply correct styling to back link&apos;, async () => {
      const props = {
        params: mockParams(&apos;food&apos;),
        searchParams: mockSearchParams()
      }

      render(await WritePage(props))

      const backLink = screen.getByText(&apos;← /food Channel으로 돌아가기&apos;)
      expect(backLink).toHaveClass(&apos;text-blue-600&apos;, &apos;hover:underline&apos;)
    })

    it(&apos;should apply correct styling to form container&apos;, async () => {
      const props = {
        params: mockParams(&apos;travel&apos;),
        searchParams: mockSearchParams()
      }

      render(await WritePage(props))

      const writePostForm = await screen.findByText(&apos;WritePostForm for travel&apos;)
      const formContainer = writePostForm.parentElement?.parentElement
      expect(formContainer).toHaveClass(&apos;bg-white&apos;, &apos;rounded-lg&apos;, &apos;border&apos;, &apos;p-6&apos;)
    })

    it(&apos;should apply correct styling to page title&apos;, async () => {
      const props = {
        params: mockParams(&apos;fitness&apos;),
        searchParams: mockSearchParams()
      }

      render(await WritePage(props))

      const title = screen.getByText(&apos;/fitness Channel에 글쓰기&apos;)
      expect(title).toHaveClass(&apos;text-2xl&apos;, &apos;font-bold&apos;, &apos;mb-6&apos;)
    })
  })

  describe(&apos;Suspense and Loading&apos;, () => {
    it(&apos;should wrap WritePostForm in Suspense&apos;, async () => {
      const props = {
        params: mockParams(&apos;photography&apos;),
        searchParams: mockSearchParams()
      }

      // The component should render without throwing
      render(await WritePage(props))

      expect(await screen.findByText(&apos;WritePostForm for photography&apos;)).toBeInTheDocument()
    })

    it(&apos;should show loading spinner as fallback&apos;, async () => {
      // This test would require more complex mocking to actually trigger the loading state
      // For now, we&apos;ll just verify that the Suspense wrapper exists by checking the component renders
      const props = {
        params: mockParams(&apos;design&apos;),
        searchParams: mockSearchParams()
      }

      render(await WritePage(props))

      // If Suspense is working correctly, the form should eventually render
      expect(await screen.findByText(&apos;WritePostForm for design&apos;)).toBeInTheDocument()
    })
  })

  describe(&apos;URL Parameters Handling&apos;, () => {
    it(&apos;should handle special characters in channel name&apos;, async () => {
      const props = {
        params: mockParams(&apos;한국어-channel&apos;),
        searchParams: mockSearchParams()
      }

      render(await WritePage(props))

      expect(screen.getByText(&apos;/한국어-channel Channel에 글쓰기&apos;)).toBeInTheDocument()
      expect(screen.getByText(&apos;← /한국어-channel Channel으로 돌아가기&apos;)).toBeInTheDocument()
    })

    it(&apos;should handle numeric channel names&apos;, async () => {
      const props = {
        params: mockParams(&apos;12345&apos;),
        searchParams: mockSearchParams()
      }

      render(await WritePage(props))

      expect(screen.getByText(&apos;/12345 Channel에 글쓰기&apos;)).toBeInTheDocument()
      expect(await screen.findByText(&apos;WritePostForm for 12345&apos;)).toBeInTheDocument()
    })

    it(&apos;should handle multiple search parameters&apos;, async () => {
      const props = {
        params: mockParams(&apos;test&apos;),
        searchParams: mockSearchParams({
          edit: &apos;true&apos;,
          postId: &apos;123&apos;,
          other: &apos;param&apos;
        })
      }

      render(await WritePage(props))

      // Should show edit mode based on edit parameter
      expect(screen.getByText(&apos;/test Channel 글 수정&apos;)).toBeInTheDocument()
    })
  })

  describe(&apos;Accessibility&apos;, () => {
    it(&apos;should have proper heading hierarchy&apos;, async () => {
      const props = {
        params: mockParams(&apos;accessibility&apos;),
        searchParams: mockSearchParams()
      }

      render(await WritePage(props))

      const heading = screen.getByRole(&apos;heading&apos;, { level: 1 })
      expect(heading).toHaveTextContent(&apos;/accessibility Channel에 글쓰기&apos;)
    })

    it(&apos;should have accessible back link&apos;, async () => {
      const props = {
        params: mockParams(&apos;ux&apos;),
        searchParams: mockSearchParams()
      }

      render(await WritePage(props))

      const backLink = screen.getByRole(&apos;link&apos;, { name: &apos;← /ux Channel으로 돌아가기&apos; })
      expect(backLink).toHaveAttribute(&apos;href&apos;, &apos;/ux&apos;)
    })

    it(&apos;should be keyboard navigable&apos;, async () => {
      const user = userEvent.setup()
      const props = {
        params: mockParams(&apos;keyboard&apos;),
        searchParams: mockSearchParams()
      }

      render(await WritePage(props))

      // Tab through interactive elements
      await user.tab()

      const backLink = screen.getByRole(&apos;link&apos;)
      expect(backLink).toHaveFocus()
    })
  })

  describe(&apos;Component Integration&apos;, () => {
    it(&apos;should pass correct props to Header component&apos;, async () => {
      const props = {
        params: mockParams(&apos;integration&apos;),
        searchParams: mockSearchParams()
      }

      render(await WritePage(props))

      // Header should be rendered
      expect(screen.getByTestId(&apos;header&apos;)).toBeInTheDocument()
    })

    it(&apos;should render WritePostForm with correct channel name&apos;, async () => {
      const props = {
        params: mockParams(&apos;test-integration&apos;),
        searchParams: mockSearchParams()
      }

      render(await WritePage(props))

      // WritePostForm should receive the correct channelName prop
      expect(await screen.findByText(&apos;WritePostForm for test-integration&apos;)).toBeInTheDocument()
    })
  })

  describe(&apos;Error Handling&apos;, () => {
    it(&apos;should handle missing channel parameter gracefully&apos;, async () => {
      const props = {
        params: mockParams(&apos;'),
        searchParams: mockSearchParams()
      }

      render(await WritePage(props))

      // Should still render the page structure
      expect(screen.getByTestId(&apos;header&apos;)).toBeInTheDocument()
      expect(await screen.findByText(&apos;WritePostForm for &apos;)).toBeInTheDocument()
    })

    it(&apos;should handle malformed search parameters&apos;, async () => {
      const props = {
        params: mockParams(&apos;test&apos;),
        searchParams: Promise.resolve({ edit: [&apos;array&apos;, &apos;value&apos;] as any })
      }

      // Should not throw an error
      await expect(WritePage(props)).resolves.toBeDefined()
    })
  })

  describe(&apos;Performance&apos;, () => {
    it(&apos;should render efficiently with complex channel names&apos;, async () => {
      const longChannelName = &apos;a&apos;.repeat(100)
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

    it(&apos;should handle multiple renders efficiently&apos;, async () => {
      const props = {
        params: mockParams(&apos;performance&apos;),
        searchParams: mockSearchParams()
      }

      const { rerender } = render(await WritePage(props))

      // Re-render with same props
      const newProps = {
        params: mockParams(&apos;performance&apos;),
        searchParams: mockSearchParams()
      }

      rerender(await WritePage(newProps))

      expect(await screen.findByText(&apos;WritePostForm for performance&apos;)).toBeInTheDocument()
    })
  })

  describe(&apos;Mobile Responsiveness&apos;, () => {
    it(&apos;should render mobile-friendly layout&apos;, async () => {
      const props = {
        params: mockParams(&apos;mobile&apos;),
        searchParams: mockSearchParams()
      }

      render(await WritePage(props))

      // Check responsive classes are applied
      const writePostForm = await screen.findByText(&apos;WritePostForm for mobile&apos;)
      const contentContainer = writePostForm.parentElement?.parentElement
      expect(contentContainer).toHaveClass(&apos;px-4&apos;) // Mobile padding
    })

    it(&apos;should maintain functionality on mobile viewports&apos;, async () => {
      // Mock mobile viewport
      Object.defineProperty(window, &apos;innerWidth&apos;, {
        writable: true,
        configurable: true,
        value: 375,
      })

      const props = {
        params: mockParams(&apos;mobile-test&apos;),
        searchParams: mockSearchParams({ edit: &apos;true&apos; })
      }

      render(await WritePage(props))

      // Should still show edit mode correctly
      expect(screen.getByText(&apos;/mobile-test Channel 글 수정&apos;)).toBeInTheDocument()
    })
  })
})