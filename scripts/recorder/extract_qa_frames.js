const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const artifactDir = 'C:/Users/yashw/.gemini/antigravity-ide/brain/cfa4582e-f12d-43fd-bde6-4a166bb25a03';
const videoPath = path.resolve(__dirname, '../../kprit_campushub_product_walkthrough.mp4');

const frames = [
  { time: '00:00:03', name: 'qa_01_intro.jpg' },
  { time: '00:00:25', name: 'qa_02_student_dash.jpg' },
  { time: '00:01:05', name: 'qa_03_digital_pass.jpg' },
  { time: '00:01:55', name: 'qa_04_admin_dash.jpg' },
  { time: '00:02:40', name: 'qa_05_admin_depts.jpg' },
  { time: '00:03:45', name: 'qa_06_tpo_drives.jpg' },
  { time: '00:04:45', name: 'qa_07_rbac_enforce.jpg' },
  { time: '00:05:18', name: 'qa_08_outro.jpg' },
];

for (const f of frames) {
  const dest = path.join(artifactDir, f.name);
  const cmd = `ffmpeg -y -ss ${f.time} -i "${videoPath}" -vframes 1 -update 1 "${dest}"`;
  execSync(cmd);
  console.log(`Extracted: ${f.name} (${f.time}) -> ${fs.existsSync(dest) ? 'OK' : 'FAIL'}`);
}
