const { join } = require('path');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  // Changes the cache location for Puppeteer so it points to a predictable path inside the project
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
};
