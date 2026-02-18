// Unit test for responsive image sizing behavior

import React from &apos;react&apos;
import { render, screen, fireEvent, waitFor } from &apos;@testing-library/react&apos;
import { ResponsiveImage } from &apos;../common/ResponsiveImage&apos;

// Mock global ResizeObserver
global.ResizeObserver = class ResizeObserver {
  callback: ResizeObserverCallback
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback
  }
  observe() {}
  disconnect() {}
  unobserve() {}
}

// Mock IntersectionObserver for lazy loading
global.IntersectionObserver = class IntersectionObserver {
  callback: IntersectionObserverCallback
  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback
  }
  observe() {}
  disconnect() {}
  unobserve() {}
}

describe(&apos;ResponsiveImage Component&apos;, () => {
  beforeEach(() => {
    jest.clearAllMocks()

    // Mock getComputedStyle for CSS custom properties
    Object.defineProperty(window, &apos;getComputedStyle&apos;, {
      value: jest.fn(() => ({
        getPropertyValue: jest.fn((prop: string) => {
          const mockValues: Record<string, string> = {
            &apos;--writepost-max-image-width&apos;: &apos;min(100%, 800px)&apos;,
            &apos;--writepost-max-image-height&apos;: &apos;600px&apos;
          }
          return mockValues[prop] || &apos;'
        }),
        maxWidth: &apos;min(100%, 800px)&apos;,
        maxHeight: &apos;600px&apos;,
        width: &apos;800px&apos;,
        height: &apos;600px&apos;
      })),
      configurable: true
    })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe(&apos;Basic Rendering&apos;, () => {
    test(&apos;should render image with provided src and alt&apos;, () => {
      // Arrange & Act
      render(
        <ResponsiveImage
          src=&quot;https://example.com/test-image.jpg&quot;
          alt=&quot;Test image&quot;
        />
      )

      // Assert
      const image = screen.getByRole(&apos;img&apos;, { name: /test image/i })
      expect(image).toBeInTheDocument()
      expect(image).toHaveAttribute(&apos;src&apos;, &apos;https://example.com/test-image.jpg&apos;)
      expect(image).toHaveAttribute(&apos;alt&apos;, &apos;Test image&apos;)
    })

    test(&apos;should apply responsive CSS classes&apos;, () => {
      // Arrange & Act
      render(
        <ResponsiveImage
          src=&quot;https://example.com/test-image.jpg&quot;
          alt=&quot;Test image&quot;
          className=&quot;custom-class&quot;
        />
      )

      // Assert
      const image = screen.getByRole(&apos;img&apos;)
      expect(image).toHaveClass(&apos;responsive-image&apos;)
      expect(image).toHaveClass(&apos;custom-class&apos;)
    })
  })

  describe(&apos;Small Image Handling (Original Size)&apos;, () => {
    test(&apos;should display small images at original size&apos;, () => {
      // Arrange
      const smallImageProps = {
        src: &apos;https://example.com/small-image.jpg&apos;,
        alt: &apos;Small image&apos;,
        originalWidth: 400,
        originalHeight: 300
      }

      // Act
      render(<ResponsiveImage {...smallImageProps} />)

      // Assert
      const image = screen.getByRole(&apos;img&apos;)

      // Should have CSS that allows original dimensions
      const computedStyle = window.getComputedStyle(image)
      expect(image).toHaveAttribute(&apos;data-original-width&apos;, &apos;400&apos;)
      expect(image).toHaveAttribute(&apos;data-original-height&apos;, &apos;300&apos;)
    })

    test(&apos;should not constrain images smaller than max width&apos;, async () => {
      // Arrange
      const smallImageProps = {
        src: &apos;https://example.com/small-image.jpg&apos;,
        alt: &apos;Small image&apos;,
        originalWidth: 300,
        originalHeight: 200,
        maxDisplayWidth: 800
      }

      // Act
      render(<ResponsiveImage {...smallImageProps} />)

      // Assert
      const image = screen.getByRole(&apos;img&apos;)

      // Mock image loading
      fireEvent.load(image)

      await waitFor(() => {
        // Image should maintain its original dimensions
        expect(image.style.maxWidth).toBe(&apos;300px&apos;)
      })
    })

    test(&apos;should preserve aspect ratio for small images&apos;, () => {
      // Arrange
      const smallImageProps = {
        src: &apos;https://example.com/small-image.jpg&apos;,
        alt: &apos;Small image&apos;,
        originalWidth: 400,
        originalHeight: 300 // 4:3 ratio
      }

      // Act
      render(<ResponsiveImage {...smallImageProps} />)

      // Assert
      const image = screen.getByRole(&apos;img&apos;)

      // Should have aspect ratio CSS property set
      expect(image.style.aspectRatio).toBe(&apos;400/300&apos;)
    })
  })

  describe(&apos;Large Image Handling (Auto-resize)&apos;, () => {
    test(&apos;should constrain large images to max width&apos;, async () => {
      // Arrange
      const largeImageProps = {
        src: &apos;https://example.com/large-image.jpg&apos;,
        alt: &apos;Large image&apos;,
        originalWidth: 1920,
        originalHeight: 1080,
        maxDisplayWidth: 800
      }

      // Act
      render(<ResponsiveImage {...largeImageProps} />)

      // Assert
      const image = screen.getByRole(&apos;img&apos;)

      // Mock image loading
      fireEvent.load(image)

      await waitFor(() => {
        // Image should be constrained to max width
        expect(image.style.maxWidth).toBe(&apos;800px&apos;)
        expect(image.style.width).toBe(&apos;100%&apos;) // Should be responsive within constraints
      })
    })

    test(&apos;should maintain aspect ratio when resizing large images&apos;, async () => {
      // Arrange
      const largeImageProps = {
        src: &apos;https://example.com/large-image.jpg&apos;,
        alt: &apos;Large image&apos;,
        originalWidth: 1920,
        originalHeight: 1080, // 16:9 ratio
        maxDisplayWidth: 800
      }

      // Act
      render(<ResponsiveImage {...largeImageProps} />)

      // Assert
      const image = screen.getByRole(&apos;img&apos;)

      fireEvent.load(image)

      await waitFor(() => {
        // Should preserve aspect ratio
        expect(image.style.aspectRatio).toBe(&apos;1920/1080&apos;)
        expect(image.style.height).toBe(&apos;auto&apos;) // Height should be auto to maintain ratio
      })
    })

    test(&apos;should apply CSS custom property constraints&apos;, async () => {
      // Arrange
      const largeImageProps = {
        src: &apos;https://example.com/ultra-wide-image.jpg&apos;,
        alt: &apos;Ultra wide image&apos;,
        originalWidth: 3840,
        originalHeight: 1080
      }

      // Act
      render(<ResponsiveImage {...largeImageProps} />)

      // Assert
      const image = screen.getByRole(&apos;img&apos;)

      fireEvent.load(image)

      await waitFor(() => {
        // Should use CSS custom properties for max constraints
        expect(image.style.maxWidth).toContain(&apos;min(100%, 800px)&apos;)
      })
    })
  })

  describe(&apos;Responsive Behavior&apos;, () => {
    test(&apos;should adapt to container width changes&apos;, async () => {
      // Arrange
      const { rerender } = render(
        <div style={{ width: &apos;1200px&apos; }}>
          <ResponsiveImage
            src=&quot;https://example.com/responsive-image.jpg&quot;
            alt=&quot;Responsive image&quot;
            originalWidth={1000}
            originalHeight={600}
          />
        </div>
      )

      const image = screen.getByRole(&apos;img&apos;)
      fireEvent.load(image)

      await waitFor(() => {
        expect(image.style.maxWidth).toBe(&apos;min(100%, 800px)&apos;)
      })

      // Act - Change container width
      rerender(
        <div style={{ width: &apos;600px&apos; }}>
          <ResponsiveImage
            src=&quot;https://example.com/responsive-image.jpg&quot;
            alt=&quot;Responsive image&quot;
            originalWidth={1000}
            originalHeight={600}
          />
        </div>
      )

      // Assert - Image should still be responsive
      expect(image.style.width).toBe(&apos;100%&apos;)
      expect(image.style.maxWidth).toBe(&apos;min(100%, 800px)&apos;)
    })

    test(&apos;should handle viewport size changes&apos;, async () => {
      // Arrange
      const originalInnerWidth = window.innerWidth

      // Mock different viewport sizes
      Object.defineProperty(window, &apos;innerWidth&apos;, {
        writable: true,
        configurable: true,
        value: 375 // Mobile width
      })

      render(
        <ResponsiveImage
          src=&quot;https://example.com/mobile-image.jpg&quot;
          alt=&quot;Mobile image&quot;
          originalWidth={800}
          originalHeight={600}
        />
      )

      const image = screen.getByRole(&apos;img&apos;)
      fireEvent.load(image)

      // Trigger resize event
      fireEvent(window, new Event(&apos;resize&apos;))

      await waitFor(() => {
        // Should adapt to mobile viewport
        expect(image.style.maxWidth).toBeTruthy()
        expect(image.style.width).toBe(&apos;100%&apos;)
      })

      // Restore original window width
      Object.defineProperty(window, &apos;innerWidth&apos;, {
        value: originalInnerWidth,
        configurable: true
      })
    })
  })

  describe(&apos;Loading States and Error Handling&apos;, () => {
    test(&apos;should show loading state before image loads&apos;, () => {
      // Arrange & Act
      render(
        <ResponsiveImage
          src=&quot;https://example.com/slow-loading-image.jpg&quot;
          alt=&quot;Slow loading image&quot;
        />
      )

      // Assert
      const container = screen.getByTestId(&apos;responsive-image-container&apos;)
      expect(container).toHaveClass(&apos;loading&apos;)
    })

    test(&apos;should remove loading state after image loads&apos;, async () => {
      // Arrange
      render(
        <ResponsiveImage
          src=&quot;https://example.com/image.jpg&quot;
          alt=&quot;Test image&quot;
        />
      )

      const image = screen.getByRole(&apos;img&apos;)

      // Act - Simulate image load
      fireEvent.load(image)

      // Assert
      await waitFor(() => {
        const container = screen.getByTestId(&apos;responsive-image-container&apos;)
        expect(container).not.toHaveClass(&apos;loading&apos;)
        expect(container).toHaveClass(&apos;loaded&apos;)
      })
    })

    test(&apos;should handle image load errors&apos;, async () => {
      // Arrange
      const onErrorMock = jest.fn()

      render(
        <ResponsiveImage
          src=&quot;https://example.com/broken-image.jpg&quot;
          alt=&quot;Broken image&quot;
          onError={onErrorMock}
        />
      )

      const image = screen.getByRole(&apos;img&apos;)

      // Act - Simulate image error
      fireEvent.error(image)

      // Assert
      await waitFor(() => {
        expect(onErrorMock).toHaveBeenCalledWith(expect.any(Error))

        const container = screen.getByTestId(&apos;responsive-image-container&apos;)
        expect(container).toHaveClass(&apos;error&apos;)
      })
    })

    test(&apos;should call onLoad callback when image loads&apos;, async () => {
      // Arrange
      const onLoadMock = jest.fn()

      render(
        <ResponsiveImage
          src=&quot;https://example.com/image.jpg&quot;
          alt=&quot;Test image&quot;
          onLoad={onLoadMock}
        />
      )

      const image = screen.getByRole(&apos;img&apos;)

      // Act
      fireEvent.load(image)

      // Assert
      await waitFor(() => {
        expect(onLoadMock).toHaveBeenCalled()
      })
    })
  })

  describe(&apos;Lazy Loading&apos;, () => {
    test(&apos;should implement lazy loading by default&apos;, () => {
      // Arrange & Act
      render(
        <ResponsiveImage
          src=&quot;https://example.com/lazy-image.jpg&quot;
          alt=&quot;Lazy loaded image&quot;
        />
      )

      // Assert
      const image = screen.getByRole(&apos;img&apos;)
      expect(image).toHaveAttribute(&apos;loading&apos;, &apos;lazy&apos;)
    })

    test(&apos;should allow disabling lazy loading&apos;, () => {
      // Arrange & Act
      render(
        <ResponsiveImage
          src=&quot;https://example.com/eager-image.jpg&quot;
          alt=&quot;Eager loaded image&quot;
          loading=&quot;eager&quot;
        />
      )

      // Assert
      const image = screen.getByRole(&apos;img&apos;)
      expect(image).toHaveAttribute(&apos;loading&apos;, &apos;eager&apos;)
    })
  })

  describe(&apos;Accessibility&apos;, () => {
    test(&apos;should provide proper alt text&apos;, () => {
      // Arrange & Act
      render(
        <ResponsiveImage
          src=&quot;https://example.com/image.jpg&quot;
          alt=&quot;Descriptive alt text&quot;
        />
      )

      // Assert
      const image = screen.getByRole(&apos;img&apos;)
      expect(image).toHaveAttribute(&apos;alt&apos;, &apos;Descriptive alt text&apos;)
    })

    test(&apos;should handle empty alt text for decorative images&apos;, () => {
      // Arrange & Act
      render(
        <ResponsiveImage
          src=&quot;https://example.com/decorative.jpg&quot;
          alt=&quot;"
        />
      )

      // Assert
      const image = screen.getByRole(&apos;img&apos;, { hidden: true })
      expect(image).toHaveAttribute(&apos;alt&apos;, &apos;')
    })

    test(&apos;should provide loading announcement for screen readers&apos;, async () => {
      // Arrange
      render(
        <ResponsiveImage
          src=&quot;https://example.com/image.jpg&quot;
          alt=&quot;Test image&quot;
        />
      )

      // Assert - Should have aria-busy during loading
      const container = screen.getByTestId(&apos;responsive-image-container&apos;)
      expect(container).toHaveAttribute(&apos;aria-busy&apos;, &apos;true&apos;)

      // Act - Complete loading
      const image = screen.getByRole(&apos;img&apos;)
      fireEvent.load(image)

      // Assert - Should remove aria-busy after loading
      await waitFor(() => {
        expect(container).toHaveAttribute(&apos;aria-busy&apos;, &apos;false&apos;)
      })
    })
  })

  describe(&apos;Performance Optimizations&apos;, () => {
    test(&apos;should use WebP format when available&apos;, () => {
      // Arrange & Act
      render(
        <ResponsiveImage
          src=&quot;https://example.com/image.jpg&quot;
          alt=&quot;Test image&quot;
        />
      )

      // Assert
      const picture = screen.getByTestId(&apos;responsive-picture&apos;)
      const webpSource = picture.querySelector(&apos;source[type=&quot;image/webp&quot;]&apos;)
      expect(webpSource).toBeInTheDocument()
    })

    test(&apos;should provide fallback for browsers without WebP support&apos;, () => {
      // Arrange & Act
      render(
        <ResponsiveImage
          src=&quot;https://example.com/image.jpg&quot;
          alt=&quot;Test image&quot;
        />
      )

      // Assert
      const picture = screen.getByTestId(&apos;responsive-picture&apos;)
      const fallbackImage = picture.querySelector(&apos;img&apos;)
      expect(fallbackImage).toHaveAttribute(&apos;src&apos;, &apos;https://example.com/image.jpg&apos;)
    })

    test(&apos;should implement proper image sizing attributes&apos;, () => {
      // Arrange & Act
      render(
        <ResponsiveImage
          src=&quot;https://example.com/image.jpg&quot;
          alt=&quot;Test image&quot;
          originalWidth={800}
          originalHeight={600}
        />
      )

      // Assert
      const image = screen.getByRole(&apos;img&apos;)
      expect(image).toHaveAttribute(&apos;width&apos;, &apos;800&apos;)
      expect(image).toHaveAttribute(&apos;height&apos;, &apos;600&apos;)
    })
  })

  describe(&apos;Edge Cases&apos;, () => {
    test(&apos;should handle missing dimensions gracefully&apos;, () => {
      // Arrange & Act
      render(
        <ResponsiveImage
          src=&quot;https://example.com/unknown-size.jpg&quot;
          alt=&quot;Unknown size image&quot;
        />
      )

      // Assert
      const image = screen.getByRole(&apos;img&apos;)
      expect(image).toBeInTheDocument()
      expect(image.style.maxWidth).toBe(&apos;min(100%, 800px)&apos;) // Should use default constraints
    })

    test(&apos;should handle very wide images&apos;, async () => {
      // Arrange
      render(
        <ResponsiveImage
          src=&quot;https://example.com/ultra-wide.jpg&quot;
          alt=&quot;Ultra wide image&quot;
          originalWidth={4000}
          originalHeight={500}
        />
      )

      const image = screen.getByRole(&apos;img&apos;)
      fireEvent.load(image)

      // Assert
      await waitFor(() => {
        expect(image.style.maxWidth).toBe(&apos;min(100%, 800px)&apos;)
        expect(image.style.aspectRatio).toBe(&apos;4000/500&apos;)
      })
    })

    test(&apos;should handle very tall images&apos;, async () => {
      // Arrange
      render(
        <ResponsiveImage
          src=&quot;https://example.com/ultra-tall.jpg&quot;
          alt=&quot;Ultra tall image&quot;
          originalWidth={500}
          originalHeight={4000}
          maxDisplayHeight={600}
        />
      )

      const image = screen.getByRole(&apos;img&apos;)
      fireEvent.load(image)

      // Assert
      await waitFor(() => {
        expect(image.style.maxHeight).toBe(&apos;600px&apos;)
        expect(image.style.aspectRatio).toBe(&apos;500/4000&apos;)
      })
    })
  })
})

// These tests must FAIL initially as per TDD requirements
// The ResponsiveImage component needs to be implemented to handle
// adaptive sizing with CSS custom properties and proper responsive behavior