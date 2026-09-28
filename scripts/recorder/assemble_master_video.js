const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

async function assembleMasterVideo() {
  const clipsDir = path.resolve(__dirname, 'clips');
  const outputDir = path.resolve(__dirname, 'output');
  const masterMp4 = path.resolve(outputDir, 'kprit_campushub_product_walkthrough.mp4');

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const segments = [
    { name: '00_intro_card', file: 'card_0_intro.webm', title: 'Intro Title Card' },
    { name: '01_ch1_card', file: 'card_1_ch1.webm', title: 'Chapter 1 Title Card' },
    { name: '02_student', file: 'clip_1_student.webm', title: 'Student Experience Walkthrough' },
    { name: '03_transition_card', file: 'card_2_transition.webm', title: 'Transition Card' },
    { name: '04_ch2_card', file: 'card_3_ch2.webm', title: 'Chapter 2 Title Card' },
    { name: '05_admin', file: 'clip_2_admin.webm', title: 'Administration Experience Walkthrough' },
    { name: '06_ch3_card', file: 'card_4_ch3.webm', title: 'Chapter 3 Title Card' },
    { name: '07_tpo', file: 'clip_3_tpo.webm', title: 'TPO Placement Experience Walkthrough' },
    { name: '08_ch4_card', file: 'card_5_ch4.webm', title: 'RBAC Security Title Card' },
    { name: '09_rbac', file: 'clip_4_rbac.webm', title: 'RBAC Security Verification' },
    { name: '10_outro_card', file: 'card_6_outro.webm', title: 'Institutional Outro Card' },
  ];

  console.log('--- Step 1: Verifying Segment Files ---');
  for (const seg of segments) {
    const p = path.join(clipsDir, seg.file);
    if (!fs.existsSync(p)) {
      throw new Error(`Missing segment file: ${seg.file} at ${p}`);
    }
    console.log(`Found: ${seg.file} (${seg.title})`);
  }

  console.log('\n--- Step 2: Normalizing Segments to 1080p 30fps MP4 ---');
  const normalizedFiles = [];
  const concatListLines = [];

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const src = path.join(clipsDir, seg.file);
    const normFile = path.join(clipsDir, `norm_${String(i).padStart(2, '0')}_${seg.name}.mp4`);
    normalizedFiles.push(normFile);

    console.log(`[${i + 1}/${segments.length}] Encoding ${seg.name}...`);
    const cmd = `ffmpeg -y -i "${src}" -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=48000 ` +
      `-filter_complex "[0:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,format=yuv420p,fps=30[v]" ` +
      `-map "[v]" -map 1:a -c:v libx264 -preset fast -crf 20 -c:a aac -b:a 192k -shortest "${normFile}"`;

    execSync(cmd, { stdio: 'inherit' });
    concatListLines.push(`file '${normFile.replace(/\\/g, '/')}'`);
  }

  console.log('\n--- Step 3: Concatenating All Segments into Master Video ---');
  const concatListPath = path.join(clipsDir, 'concat_list.txt');
  fs.writeFileSync(concatListPath, concatListLines.join('\n'), 'utf8');

  const concatCmd = `ffmpeg -y -f concat -safe 0 -i "${concatListPath}" -c copy -movflags +faststart "${masterMp4}"`;
  execSync(concatCmd, { stdio: 'inherit' });

  console.log('\n--- Step 4: Probing Master Video ---');
  const probeOutput = execSync(`ffprobe -v error -show_entries format=duration,size,bit_rate -show_entries stream=width,height,r_frame_rate,codec_name -of default=noprint_wrappers=1 "${masterMp4}"`).toString();
  console.log(probeOutput);

  // Copy to workspace root for easy user access as well
  const rootMp4 = path.resolve(__dirname, '../../kprit_campushub_product_walkthrough.mp4');
  fs.copyFileSync(masterMp4, rootMp4);

  // Copy to artifacts directory
  const artifactMp4 = `C:/Users/yashw/.gemini/antigravity-ide/brain/cfa4582e-f12d-43fd-bde6-4a166bb25a03/kprit_campushub_product_walkthrough.mp4`;
  fs.copyFileSync(masterMp4, artifactMp4);

  console.log(`Master Video created at:`);
  console.log(`1. ${masterMp4}`);
  console.log(`2. ${rootMp4}`);
  console.log(`3. ${artifactMp4}`);
}

assembleMasterVideo().catch(err => {
  console.error('Assembly error:', err);
  process.exit(1);
});
