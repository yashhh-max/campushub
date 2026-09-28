const path = require('path');
const fs = require('fs');
const { chromium } = require('C:/Users/yashw/AppData/Roaming/npm/node_modules/playwright');
const { injectCaption, smoothScroll } = require('./utils');

async function recordTpoExperience() {
  const clipsDir = path.resolve(__dirname, 'clips');
  const tempDir = path.resolve(clipsDir, 'temp_tpo');
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  fs.mkdirSync(tempDir, { recursive: true });

  console.log('Launching browser for TPO Experience recording...');
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true
  });

  const context = await browser.newContext({
    recordVideo: { dir: tempDir, size: { width: 1920, height: 1080 } },
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();

  // 1. TPO Sign-In
  console.log('1. Recording TPO Login...');
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
  await injectCaption(page, 'Institutional Authentication', 'TPO Placement Cell Sign-In');
  await page.waitForTimeout(1500);

  await page.fill('input[type="email"], input[name="email"], #email', 'tpo@kpritech.ac.in');
  await page.waitForTimeout(600);
  await page.fill('input[type="password"], input[name="password"], #password', 'Kprit@2026');
  await page.waitForTimeout(800);
  await page.click('button[type="submit"]');

  await page.waitForTimeout(2500);

  // 2. TPO Dashboard
  console.log('2. Recording TPO Dashboard...');
  await page.goto('http://localhost:3000/tpo/dashboard', { waitUntil: 'networkidle' });
  await injectCaption(page, '03 — Training & Placement Operations', 'Placement Cell Command Center & Key Telemetry');
  await page.waitForTimeout(4000);
  await smoothScroll(page, 500, 1800);
  await page.waitForTimeout(3000);
  await smoothScroll(page, 0, 1000);
  await page.waitForTimeout(1500);

  // 3. Corporate Partners
  console.log('3. Recording Corporate Companies...');
  await page.goto('http://localhost:3000/tpo/companies', { waitUntil: 'networkidle' });
  await injectCaption(page, 'Corporate Recruiting Partners', 'Industry Domains, Corporate Tiers & Active Engagement');
  await page.waitForTimeout(4000);
  await smoothScroll(page, 450, 1500);
  await page.waitForTimeout(3000);

  // 4. Recruitment Drives
  console.log('4. Recording Placement Drives...');
  await page.goto('http://localhost:3000/tpo/drives', { waitUntil: 'networkidle' });
  await injectCaption(page, 'Recruitment Drives', 'Roles, Packages, Deadlines & Target Batches');
  await page.waitForTimeout(4000);
  await smoothScroll(page, 450, 1500);
  await page.waitForTimeout(3000);

  // 5. Automated Eligibility Details
  console.log('5. Demonstrating Automated Eligibility Criteria...');
  await injectCaption(page, 'Automated Eligibility Enforcement', 'Database CGPA Cutoffs, Backlog Limits & Eligible Branches');
  await page.waitForTimeout(4500);

  // 6. Student Placement Master Registry
  console.log('6. Recording Student Placement Master...');
  await page.goto('http://localhost:3000/tpo/students', { waitUntil: 'networkidle' });
  await injectCaption(page, 'Student Placement Registry', 'Readiness Status, Resumes, CGPA & Backlog Verification');
  await page.waitForTimeout(4000);
  await smoothScroll(page, 450, 1500);
  await page.waitForTimeout(3000);

  // 7. Placement Analytics & Reports
  console.log('7. Recording Placement Reports...');
  await page.goto('http://localhost:3000/tpo/reports', { waitUntil: 'networkidle' });
  await injectCaption(page, 'Placement Reports & Analytics', 'Department Placement Percentages & Salary Tier Distribution');
  await page.waitForTimeout(4500);
  await smoothScroll(page, 450, 1500);
  await page.waitForTimeout(3000);

  await context.close();
  await browser.close();

  const files = fs.readdirSync(tempDir).filter(f => f.endsWith('.webm'));
  if (files.length > 0) {
    const src = path.join(tempDir, files[0]);
    const dest = path.join(clipsDir, 'clip_3_tpo.webm');
    fs.copyFileSync(src, dest);
    fs.rmSync(tempDir, { recursive: true, force: true });
    console.log(`Saved Chapter 3 TPO Experience to: ${dest}`);
  }
}

recordTpoExperience().catch(err => {
  console.error('Error in recordTpoExperience:', err);
  process.exit(1);
});
