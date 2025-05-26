// jest-puppeteer.config.js
module.exports = {
  server: {
    // statt './sites' jetzt das gesamte Projekt
    command: 'http-server . -p 3000',
    port: 3000,
    launchTimeout: 10000,
    debug: true,
  },
  launch: {
    headless: true,
  },
};
