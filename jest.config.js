module.exports = {
  // Test environment
  testEnvironment: "node",

  // Coverage configuration
  collectCoverageFrom: [
    "src/**/*.js",
    "!src/**/*.test.js",
    "!src/**/__tests__/**",
    "!node_modules/**",
  ],

  // Coverage threshold
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },

  // Test match patterns
  testMatch: [
    "**/__tests__/**/*.test.js",
    "**/?(*.)+(spec|test).js",
  ],

  // Setup files
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],

  // Ignore patterns
  testPathIgnorePatterns: [
    "/node_modules/",
    "/dist/",
    "/build/",
  ],

  // Verbose output
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,

  // Reset mocks between tests
  resetMocks: true,

  // Restore mocks between tests
  restoreMocks: true,
};
