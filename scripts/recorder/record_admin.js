const path = require('path');
const fs = require('fs');
const { chromium } = require('C:/Users/yashw/AppData/Roaming/npm/node_modules/playwright');
const { injectCaption, smoothScroll } = require('./utils');

async function recordAdminExperience() {
  const clipsDir = path.resolve(__dirname, 'clips');
  const tempDir = path.resolve(clipsDir, 'temp_admin');
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  fs.mkdirSync(tempDir, { recursive: true });

  console.log('Launching browser for Administration Experience recording...');
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true
  });

  const context = await browser.newContext({
    recordVideo: { dir: tempDir, size: { width: 1920, height: 1080 } },
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();

  // 1. Admin Sign-In
  console.log('1. Recording Admin Login...');
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
  await injectCaption(page, 'Institutional Authentication', 'Administrative Sign-In (Principal Office)');
  await page.waitForTimeout(1500);

  await page.fill('input[type="email"], input[name="email"], #email', 'principal@kpritech.ac.in');
  await page.waitForTimeout(600);
  await page.fill('input[type="password"], input[name="password"], #password', 'Kprit@2026');
  await page.waitForTimeout(800);
  await page.click('button[type="submit"]');

  await page.waitForTimeout(2500);

  // 2. Admin Dashboard
  console.log('2. Recording Admin Dashboard...');
  await page.goto('http://localhost:3000/admin/dashboard', { waitUntil: 'networkidle' });
  await injectCaption(page, '02 — Administration Experience', 'College-Wide Governance & Live Campus Telemetry');
  await page.waitForTimeout(4000);
  await smoothScroll(page, 550, 1800);
  await page.waitForTimeout(3000);
  await smoothScroll(page, 0, 1000);
  await page.waitForTimeout(1500);

  // 3. Student Registry
  console.log('3. Recording Student Registry...');
  await page.goto('http://localhost:3000/admin/users/students', { waitUntil: 'networkidle' });
  await injectCaption(page, 'Student Master Registry', 'Enrolled Students, Roll Numbers, Branches & CGPA');
  await page.waitForTimeout(4000);
  await smoothScroll(page, 450, 1500);
  await page.waitForTimeout(3000);

  // 4. Faculty Directory
  console.log('4. Recording Faculty Directory...');
  await page.goto('http://localhost:3000/admin/users/faculty', { waitUntil: 'networkidle' });
  await injectCaption(page, 'Faculty Directory', 'Academic Chairs, Designations & Department Cabins');
  await page.waitForTimeout(4000);
  await smoothScroll(page, 400, 1500);
  await page.waitForTimeout(3000);

  // 5. Academic Departments
  console.log('5. Recording Departments...');
  await page.goto('http://localhost:3000/admin/departments', { waitUntil: 'networkidle' });
  await injectCaption(page, 'Academic Departments', '9 KPRIT Engineering & Management Branches');
  await page.waitForTimeout(4000);
  await smoothScroll(page, 500, 1500);
  await page.waitForTimeout(3000);

  // 6. Event Operations
  console.log('6. Recording Event Operations...');
  await page.goto('http://localhost:3000/admin/events', { waitUntil: 'networkidle' });
  await injectCaption(page, 'Campus Event Operations', '8 Lifecycle States, Attendee Rosters & Publishing');
  await page.waitForTimeout(4000);
  await smoothScroll(page, 400, 1500);
  await page.waitForTimeout(3000);

  // 7. Clubs Administration
  console.log('7. Recording Clubs Administration...');
  await page.goto('http://localhost:3000/admin/clubs', { waitUntil: 'networkidle' });
  await injectCaption(page, 'Student Society Governance', 'Club Charters, Faculty Advisors & Active Status');
  await page.waitForTimeout(4000);
  await smoothScroll(page, 400, 1500);
  await page.waitForTimeout(3000);

  // 8. Institutional Announcements
  console.log('8. Recording Announcements...');
  await page.goto('http://localhost:3000/admin/announcements', { waitUntil: 'networkidle' });
  await injectCaption(page, 'Institutional Announcements', 'Targeted Audience Segmentation, Priority & Bulletins');
  await page.waitForTimeout(4000);
  await smoothScroll(page, 450, 1500);
  await page.waitForTimeout(3000);

  // 9. Enterprise Approval Center
  console.log('9. Recording Approval Center...');
  await page.goto('http://localhost:3000/admin/approvals', { waitUntil: 'networkidle' });
  await injectCaption(page, 'Enterprise Approval Center', 'Multi-Tier Review, Verification & Workflow Actions');
  await page.waitForTimeout(4500);
  await smoothScroll(page, 400, 1500);
  await page.waitForTimeout(3000);

  // 10. Opportunities Management
  console.log('10. Recording Opportunities Management...');
  await page.goto('http://localhost:3000/admin/opportunities', { waitUntil: 'networkidle' });
  await injectCaption(page, 'Opportunities Management', 'Internships, Technical Programs & Institutional Postings');
  await page.waitForTimeout(4000);
  await smoothScroll(page, 400, 1500);
  await page.waitForTimeout(3000);

  await context.close();
  await browser.close();

  const files = fs.readdirSync(tempDir).filter(f => f.endsWith('.webm'));
  if (files.length > 0) {
    const src = path.join(tempDir, files[0]);
    const dest = path.join(clipsDir, 'clip_2_admin.webm');
    fs.copyFileSync(src, dest);
    fs.rmSync(tempDir, { recursive: true, force: true });
    console.log(`Saved Chapter 2 Admin Experience to: ${dest}`);
  }
}

recordAdminExperience().catch(err => {
  console.error('Error in recordAdminExperience:', err);
  process.exit(1);
});
