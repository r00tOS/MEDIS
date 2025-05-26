// jest.config.js
module.exports = {
  projects: [
    {
      displayName: 'unit',
      testEnvironment: 'jsdom',
      // Alle normalen Tests
      testMatch: ['<rootDir>/tests/**/*.test.js'],
      // Aber IGNORIERE alles unter tests/e2e/
      testPathIgnorePatterns: ['/tests/e2e/'],
    },
    {
      displayName: 'e2e',
      preset: 'jest-puppeteer',
      testEnvironment: 'jest-environment-puppeteer',
      testMatch: ['<rootDir>/tests/e2e/**/*.test.js'],
    },
  ],
};
