const puppeteer = require('puppeteer');

(async () => {
  try {
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--ignore-certificate-errors'] });
    const page = await browser.newPage();
    
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
    
    await page.goto('https://localhost:5173', { waitUntil: 'networkidle0', timeout: 10000 });
    await browser.close();
  } catch(e) {
    console.log("PUPPETEER ERROR:", e.toString());
    process.exit(1);
  }
})();
