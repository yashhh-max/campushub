const path = require('path');
const fs = require('fs');
const { chromium } = require('C:/Users/yashw/AppData/Roaming/npm/node_modules/playwright');
const { injectCaption, smoothScroll } = require('./utils');

async function recordRbacExperience() {
  const clipsDir = path.resolve(__dirname, 'clips');
  const tempDir = path.resolve(clipsDir, 'temp_rbac');
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  fs.mkdirSync(tempDir, { recursive: true });

  console.log('Launching browser for RBAC Security Demonstration recording...');
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true
  });

  const context = await browser.newContext({
    recordVideo: { dir: tempDir, size: { width: 1920, height: 1080 } },
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();

  // 1. Sign In as Student
  console.log('1. Signing in as student for RBAC test...');
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
  await injectCaption(page, 'Security Audit: Persona 1', 'Student Account Authenticated');
  await page.waitForTimeout(1500);

  await page.fill('input[type="email"], input[name="email"], #email', '22K81A0501@kpritech.ac.in');
  await page.fill('input[type="password"], input[name="password"], #password', 'Student@123');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2500);
  await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // 2. Student attempts Admin Portal
  console.log('2. Student attempting direct access to /admin/dashboard...');
  await page.goto('http://localhost:3000/admin/dashboard', { waitUntil: 'networkidle' });
  await injectCaption(page, 'RBAC Security Boundary', 'Unauthorized Persona Blocked: Institutional Access Restricted');
  await page.waitForTimeout(4500);

  // 3. Student attempts TPO Portal
  console.log('3. Student attempting direct access to /tpo/dashboard...');
  await page.goto('http://localhost:3000/tpo/dashboard', { waitUntil: 'networkidle' });
  await injectCaption(page, 'RBAC Security Boundary', 'Unauthorized Persona Blocked: TPO Console Restricted');
  await page.waitForTimeout(3500);

  // 4. Authorized Admin Login
  console.log('4. Authenticating as Authorized College Admin...');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
  await injectCaption(page, 'Security Audit: Persona 2', 'Authorized College Administrator Sign-In');
  await page.waitForTimeout(1500);

  await page.fill('input[type="email"], input[name="email"], #email', 'principal@kpritech.ac.in');
  await page.fill('input[type="password"], input[name="password"], #password', 'Kprit@2026');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2500);

  // 5. Authorized Admin Console
  console.log('5. Viewing Authorized Admin Console...');
  await page.goto('http://localhost:3000/admin/dashboard', { waitUntil: 'networkidle' });
  await injectCaption(page, 'RBAC Policy Verified', 'Administrative Privilege Granted: Full Institutional Console');
  await page.waitForTimeout(4000);
  await smoothScroll(page, 350, 1200);
  await page.waitForTimeout(2000);

  // 6. Authorized TPO Login
  console.log('6. Authenticating as Authorized TPO...');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
  await injectCaption(page, 'Security Audit: Persona 3', 'Authorized Placement Cell Officer Sign-In');
  await page.waitForTimeout(1500);

  await page.fill('input[type="email"], input[name="email"], #email', 'tpo@kpritech.ac.in');
  await page.fill('input[type="password"], input[name="password"], #password', 'Kprit@2026');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2500);

  // 7. Authorized TPO Console
  console.log('7. Viewing Authorized TPO Console...');
  await page.goto('http://localhost:3000/tpo/dashboard', { waitUntil: 'networkidle' });
  await injectCaption(page, 'RBAC Policy Verified', 'Placement Privilege Granted: Dedicated TPO Operations');
  await page.waitForTimeout(4000);
  await smoothScroll(page, 350, 1200);
  await page.waitForTimeout(2000);

  await context.close();
  await browser.close();

  const files = fs.readdirSync(tempDir).filter(f => f.endsWith('.webm'));
  if (files.length > 0) {
    const src = path.join(tempDir, files[0]);
    const dest = path.join(clipsDir, 'clip_4_rbac.webm');
    fs.copyFileSync(src, dest);
    fs.rmSync(tempDir, { recursive: true, force: true });
    console.log(`Saved RBAC Security Demo to: ${dest}`);
  }
}

recordRbacExperience().catch(err => {
  console.error('Error in recordRbacExperience:', err);
  process.exit(1);
});
