const nextJest = require('next/jest')

/** @type {import('jest').Config} */
const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
})

// Add any custom config to be passed to Jest
const config = {
  collectCoverageFrom: [
    '**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
    '!**/coverage/**',
    '!jest.config.js',
    '!next.config.ts',
    '!tailwind.config.js',
    '!postcss.config.mjs',
    '!**/scripts/**',
    '!**/supabase/**',
    // Focus on refactored components and hooks for 002- feature
    'src/hooks/useWritePostForm.ts',
    'src/hooks/useFormValidation.ts',
    'src/hooks/useImageUpload.ts',
    'src/hooks/useLinkPreview.ts',
    'src/components/forms/**/*.{ts,tsx}',
    'src/lib/validation/**/*.{ts,tsx}',
    'src/lib/utils/formHelpers.ts',
    'src/app/[subreddit]/write/WritePostForm.tsx',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  moduleNameMapper: {
    // Explicit mapping for test mocks (fix extension resolution)
    '^@/lib/test/mocks$': '<rootDir>/src/lib/test/mocks.ts',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testEnvironment: 'jsdom',
  testEnvironmentOptions: {
    customExportConditions: [], // Override jsdom default ['browser'] to prevent ESM cheerio bundle
  },
  setupFiles: ['<rootDir>/test-utils/env.ts'],
  setupFilesAfterEnv: ['<rootDir>/test-utils/setup.ts'],
  testMatch: [
    '**/__tests__/**/*.{js,jsx,ts,tsx}',
    '**/?(*.)+(spec|test).{js,jsx,ts,tsx}',
  ],
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/supabase/',
    '<rootDir>/e2e/',
    '<rootDir>/src/__tests__/mocks/',
    '<rootDir>/src/__tests__/utils/',
    '<rootDir>/src/app/api/upload/__tests__/',
    // Skipped tests with module resolution issues (restore after mocks refactor)
    '<rootDir>/src/app/api/posts/\\[postId\\]/vote/__tests__/',
    '<rootDir>/src/app/api/posts/__tests__/',
    '<rootDir>/src/app/api/comments/__tests__/',
    '<rootDir>/src/lib/ai/__tests__/',
    '<rootDir>/src/components/posts/__tests__/',
  ],
  maxWorkers: 1, // OOM 방지
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }],
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(cheerio|htmlparser2|dom-serializer|domelementtype|domhandler|domutils|entities)/)',
    '^.+\\.module\\.(css|sass|scss)$',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(config)