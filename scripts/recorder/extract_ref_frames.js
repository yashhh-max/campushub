const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const outDir = path.resolve(__dirname, 'reference_frames');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const times = [1, 3, 6, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 58];
for (const t of times) {
  const p = path.join(outDir, `ref_frame_${String(t).padStart(2, '0')}s.jpg`);
  const cmd = `ffmpeg -y -ss ${t} -i "c:/Users/yashw/Downloads/campushub.mp4" -vframes 1 -update 1 "${p}"`;
  execSync(cmd);
  console.log('Extracted ' + p);
}
