const path = require('path');
const fs = require('fs');
const { chromium } = require('C:/Users/yashw/AppData/Roaming/npm/node_modules/playwright');
const { injectCaption, smoothScroll } = require('./utils');

async function recordStudentExperience() {
  const clipsDir = path.resolve(__dirname, 'clips');
  const tempDir = path.resolve(clipsDir, 'temp_student');
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  fs.mkdirSync(tempDir, { recursive: true });

  console.log('Launching browser for Student Experience recording...');
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true
  });

  const context = await browser.newContext({
    recordVideo: { dir: tempDir, size: { width: 1920, height: 1080 } },
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();

  // 1. Landing Page
  console.log('1. Recording Landing Page...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await injectCaption(page, '01 — Student Experience', 'KPRIT Institutional Digital Campus Platform');
  await page.waitForTimeout(3000);
  await smoothScroll(page, 700, 1800);
  await page.waitForTimeout(2500);
  await smoothScroll(page, 0, 1200);
  await page.waitForTimeout(1500);

  // 2. Student Login
  console.log('2. Recording Student Login...');
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
  await injectCaption(page, 'Institutional Authentication', 'Secure Student Portal Sign-In');
  await page.waitForTimeout(1500);

  await page.fill('input[type="email"], input[name="email"], #email', '22K81A0501@kpritech.ac.in');
  await page.waitForTimeout(600);
  await page.fill('input[type="password"], input[name="password"], #password', 'Student@123');
  await page.waitForTimeout(800);
  await page.click('button[type="submit"]');

  await page.waitForTimeout(2500);

  // 3. Student Dashboard
  console.log('3. Recording Student Dashboard...');
  await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle' });
  await injectCaption(page, 'Student Dashboard', 'Personalized Campus Telemetry & Activities');
  await page.waitForTimeout(3500);
  await smoothScroll(page, 550, 1800);
  await page.waitForTimeout(3000);
  await smoothScroll(page, 0, 1000);
  await page.waitForTimeout(1500);

  // 4. Events Discovery
  console.log('4. Recording Events Discovery...');
  await page.goto('http://localhost:3000/events', { waitUntil: 'networkidle' });
  await injectCaption(page, 'Campus Events', 'Discovery, Schedules & Instant Registration');
  await page.waitForTimeout(3500);
  await smoothScroll(page, 500, 1500);
  await page.waitForTimeout(2500);

  // 5. Digital Event Tickets & Pass
  console.log('5. Recording Digital Event Tickets...');
  await page.goto('http://localhost:3000/dashboard/tickets', { waitUntil: 'networkidle' });
  await injectCaption(page, 'Digital Event Pass', 'Verified QR Admission Pass & Credentials');
  await page.waitForTimeout(4000);
  await smoothScroll(page, 350, 1200);
  await page.waitForTimeout(2500);

  // 6. Clubs & Societies
  console.log('6. Recording Clubs & Societies...');
  await page.goto('http://localhost:3000/clubs', { waitUntil: 'networkidle' });
  await injectCaption(page, 'Clubs & Societies', 'Technical Chapters & Campus Communities');
  await page.waitForTimeout(3500);
  await smoothScroll(page, 500, 1500);
  await page.waitForTimeout(2500);

  // 7. Opportunities & Internships
  console.log('7. Recording Opportunities...');
  await page.goto('http://localhost:3000/opportunities', { waitUntil: 'networkidle' });
  await injectCaption(page, 'Campus Opportunities', 'Internships, Hackathons & Technical Challenges');
  await page.waitForTimeout(3500);
  await smoothScroll(page, 450, 1500);
  await page.waitForTimeout(2500);

  // 8. Campus Notifications Center
  console.log('8. Recording Notifications...');
  await page.goto('http://localhost:3000/notifications', { waitUntil: 'networkidle' });
  await injectCaption(page, 'Notice Center', 'Institutional Circulars, Exam Updates & Bulletins');
  await page.waitForTimeout(3500);
  await smoothScroll(page, 400, 1200);
  await page.waitForTimeout(2500);

  // 9. Profile & Academic Settings
  console.log('9. Recording Student Profile...');
  await page.goto('http://localhost:3000/settings', { waitUntil: 'networkidle' });
  await injectCaption(page, 'Student Academic Profile', 'KPRIT Institutional Credentials & Preferences');
  await page.waitForTimeout(3500);
  await smoothScroll(page, 350, 1200);
  await page.waitForTimeout(2500);

  await context.close();
  await browser.close();

  const files = fs.readdirSync(tempDir).filter(f => f.endsWith('.webm'));
  if (files.length > 0) {
    const src = path.join(tempDir, files[0]);
    const dest = path.join(clipsDir, 'clip_1_student.webm');
    fs.copyFileSync(src, dest);
    fs.rmSync(tempDir, { recursive: true, force: true });
    console.log(`Saved Chapter 1 Student Experience to: ${dest}`);
  }
}

recordStudentExperience().catch(err => {
  console.error('Error in recordStudentExperience:', err);
  process.exit(1);
});
