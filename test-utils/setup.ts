import '@testing-library/jest-dom'

// OpenAI Node.js shims for API testing
import 'openai/shims/node'

// Override fetch with Jest mock for testing (env.ts provides polyfill for MSW)
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>

// MSW setup
import { server } from '@/__tests__/mocks/server'

// Establish API mocking before all tests
beforeAll(() => {
  server.listen({
    onUnhandledRequest: 'error',
  })
})

// Reset any request handlers that we may add during the tests,
// so they don't affect other tests
afterEach(() => {
  server.resetHandlers()
})

// Clean up after the tests are finished
afterAll(() => {
  server.close()
})

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(),
    getAll: jest.fn(),
    has: jest.fn(),
    keys: jest.fn(),
    values: jest.fn(),
    entries: jest.fn(),
    forEach: jest.fn(),
    toString: jest.fn(),
  }),
  usePathname: () => '/',
  useParams: () => ({}),
}))

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation((props) => {
    return props
  }),
}))

// Mock Next.js Link component
jest.mock('next/link', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(({ children }) => {
    return children
  }),
}))

// fetch is now mocked by Jest for test purposes

// Mock window.alert
Object.defineProperty(window, 'alert', {
  writable: true,
  value: jest.fn(),
})

// Mock window.confirm
Object.defineProperty(window, 'confirm', {
  writable: true,
  value: jest.fn(() => true),
})

// Mock matchMedia for responsive components
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock HTMLCanvasElement for image processing tests
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: jest.fn().mockReturnValue({
    drawImage: jest.fn(),
    getImageData: jest.fn(() => ({ data: new Uint8ClampedArray(4) })),
    putImageData: jest.fn(),
    measureText: jest.fn(() => ({ width: 0 })),
    fillText: jest.fn(),
    clearRect: jest.fn(),
  }),
})

Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', {
  value: jest.fn((callback) => {
    callback(new Blob(['test'], { type: 'image/jpeg' }))
  }),
})

Object.defineProperty(HTMLCanvasElement.prototype, 'toDataURL', {
  value: jest.fn(() => 'data:image/jpeg;base64,test'),
})

// Mock ClipboardEvent
class MockClipboardEvent extends Event {
  clipboardData: {
    items: any[]
    getData: jest.Mock
  }

  constructor(type: string, options?: any) {
    super(type, options)
    this.clipboardData = {
      items: options?.clipboardData?.items || [],
      getData: jest.fn(),
    }
  }
}
global.ClipboardEvent = MockClipboardEvent as any

// Mock LocalizationProvider globally
jest.mock('@/providers/LocalizationProvider', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  LocalizationProvider: ({ children }: { children: any }) => children
}))

// Reset all mocks after each test
afterEach(() => {
  jest.clearAllMocks()
})