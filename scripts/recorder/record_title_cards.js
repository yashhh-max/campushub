const path = require('path');
const fs = require('fs');
const { chromium } = require('C:/Users/yashw/AppData/Roaming/npm/node_modules/playwright');

async function recordCards() {
  const cardsDir = path.resolve(__dirname, 'cards');
  const clipsDir = path.resolve(__dirname, 'clips');
  if (!fs.existsSync(clipsDir)) {
    fs.mkdirSync(clipsDir, { recursive: true });
  }

  const cards = [
    { id: 'intro', duration: 5500, filename: 'card_0_intro' },
    { id: 'ch1', duration: 4500, filename: 'card_1_ch1' },
    { id: 'transition', duration: 4500, filename: 'card_2_transition' },
    { id: 'ch2', duration: 4500, filename: 'card_3_ch2' },
    { id: 'ch3', duration: 4500, filename: 'card_4_ch3' },
    { id: 'ch4', duration: 4500, filename: 'card_5_ch4' },
    { id: 'outro', duration: 6000, filename: 'card_6_outro' },
  ];

  console.log('Starting title cards recording...');

  for (const card of cards) {
    console.log(`Recording title card: ${card.id}...`);
    const cardVideoDir = path.resolve(clipsDir, `temp_${card.id}`);
    if (fs.existsSync(cardVideoDir)) {
      fs.rmSync(cardVideoDir, { recursive: true, force: true });
    }
    fs.mkdirSync(cardVideoDir, { recursive: true });

    const browser = await chromium.launch({
      executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      headless: true
    });

    const context = await browser.newContext({
      recordVideo: { dir: cardVideoDir, size: { width: 1920, height: 1080 } },
      viewport: { width: 1920, height: 1080 }
    });

    const page = await context.newPage();
    const fileUrl = 'file:///' + path.resolve(cardsDir, 'title_cards.html').replace(/\\/g, '/') + `?card=${card.id}`;
    await page.goto(fileUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(card.duration);

    await context.close();
    await browser.close();

    // Find the recorded webm file and rename it
    const files = fs.readdirSync(cardVideoDir).filter(f => f.endsWith('.webm'));
    if (files.length > 0) {
      const srcPath = path.join(cardVideoDir, files[0]);
      const destPath = path.join(clipsDir, `${card.filename}.webm`);
      fs.copyFileSync(srcPath, destPath);
      fs.rmSync(cardVideoDir, { recursive: true, force: true });
      console.log(`Saved: ${destPath}`);
    }
  }

  console.log('All title cards recorded successfully!');
}

recordCards().catch(err => {
  console.error('Error recording title cards:', err);
  process.exit(1);
});
