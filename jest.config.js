// jest.config.js
module.exports = {
  projects: [
    {
      displayName: 'unit',
      testEnvironment: 'jsdom',
      // Alle normalen Tests (inkl. Unit- und Integration), außer E2E
      testMatch: ['<rootDir>/tests/**/*.test.js'],
      testPathIgnorePatterns: ['/tests/e2e/'],
    },
    {
      displayName: 'e2e',
      preset: 'jest-puppeteer',
      testEnvironment: 'jest-environment-puppeteer',
      testMatch: ['<rootDir>/tests/e2e/**/*.test.js'],
      // Puppeteer-Flags und Dev-Server konfigurieren
      globals: {
        'jest-puppeteer': {
          launch: {
            headless: true,
            args: [
              '--no-sandbox',
              '--disable-setuid-sandbox',
              '--disable-dev-shm-usage',
              '--disable-gpu'
            ]
          },
          server: {
            command: 'http-server . -p 3000',
            port: 3000,
            launchTimeout: 10000,
            debug: true
          }
        }
      },
    }
  ]
}
