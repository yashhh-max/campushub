const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const { chromium } = require('C:/Users/yashw/AppData/Roaming/npm/node_modules/playwright');

async function recordCinematicFilm() {
  const cinematicDir = path.resolve(__dirname);
  const tempDir = path.resolve(cinematicDir, 'temp_raw_video');
  const showcaseHtml = path.resolve(cinematicDir, 'cinematic_showcase.html');
  const audioWav = path.resolve(cinematicDir, 'cinematic_soundtrack.wav');
  const finalMp4 = path.resolve(cinematicDir, 'kprit_campushub_cinematic_walkthrough.mp4');
  const rootMp4 = path.resolve(__dirname, '../../../kprit_campushub_cinematic_walkthrough.mp4');
  const artifactMp4 = 'C:/Users/yashw/.gemini/antigravity-ide/brain/cfa4582e-f12d-43fd-bde6-4a166bb25a03/kprit_campushub_cinematic_walkthrough.mp4';

  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  fs.mkdirSync(tempDir, { recursive: true });

  console.log('--- Step 1: Recording Cinematic 3D Presentation (210s) ---');
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true
  });

  const context = await browser.newContext({
    recordVideo: { dir: tempDir, size: { width: 1920, height: 1080 } },
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();
  const fileUrl = 'file:///' + showcaseHtml.replace(/\\/g, '/');
  console.log(`Loading showcase: ${fileUrl}`);
  await page.goto(fileUrl, { waitUntil: 'networkidle' });

  // Record 210 seconds + 2 second buffer
  console.log('Recording 212 seconds of choreographed cinematic sequence...');
  await page.waitForTimeout(212000);

  await context.close();
  await browser.close();

  const files = fs.readdirSync(tempDir).filter(f => f.endsWith('.webm'));
  if (files.length === 0) {
    throw new Error('No webm video recorded!');
  }
  const rawVideoPath = path.join(tempDir, files[0]);
  console.log(`Raw video saved: ${rawVideoPath} (${fs.statSync(rawVideoPath).size} bytes)`);

  console.log('\n--- Step 2: Muxing Synchronized Cinematic Soundtrack + SFX ---');
  if (!fs.existsSync(audioWav)) {
    throw new Error(`Audio file missing: ${audioWav}`);
  }

  // FFmpeg command to mux video and audio, transcode to high-profile H.264 MP4 with AAC audio
  const cmd = `ffmpeg -y -i "${rawVideoPath}" -i "${audioWav}" ` +
    `-filter_complex "[0:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,format=yuv420p,fps=30[v]" ` +
    `-map "[v]" -map 1:a -c:v libx264 -preset fast -crf 19 -c:a aac -b:a 256k -shortest -movflags +faststart "${finalMp4}"`;

  execSync(cmd, { stdio: 'inherit' });
  console.log(`Final Cinematic Master MP4 created: ${finalMp4}`);

  // Copy to root workspace and artifact directory
  fs.copyFileSync(finalMp4, rootMp4);
  fs.copyFileSync(finalMp4, artifactMp4);
  console.log(`Copied to workspace root: ${rootMp4}`);
  console.log(`Copied to artifacts directory: ${artifactMp4}`);

  // Cleanup temp dir
  fs.rmSync(tempDir, { recursive: true, force: true });

  // Probe
  const probe = execSync(`ffprobe -v error -show_entries format=duration,size,bit_rate -show_entries stream=width,height,r_frame_rate,codec_name -of default=noprint_wrappers=1 "${finalMp4}"`).toString();
  console.log('\n--- Cinematic Master Probe ---');
  console.log(probe);
}

recordCinematicFilm().catch(err => {
  console.error('Error in recordCinematicFilm:', err);
  process.exit(1);
});
