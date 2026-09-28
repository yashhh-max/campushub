const { execSync } = require('child_process');
const path = require('path');

const artifactDir = 'C:/Users/yashw/.gemini/antigravity-ide/brain/cfa4582e-f12d-43fd-bde6-4a166bb25a03';
const videoPath = path.resolve(__dirname, '../../../kprit_campushub_cinematic_walkthrough.mp4');

const frames = [
  { t: '00:00:04', name: 'cinematic_01_intro.jpg' },
  { t: '00:00:20', name: 'cinematic_02_student_dash.jpg' },
  { t: '00:00:32', name: 'cinematic_03_qr_pass.jpg' },
  { t: '00:01:10', name: 'cinematic_04_admin_command.jpg' },
  { t: '00:02:08', name: 'cinematic_05_tpo_partners.jpg' },
  { t: '00:02:46', name: 'cinematic_06_rbac_security.jpg' },
  { t: '00:03:22', name: 'cinematic_07_finale.jpg' }
];

for (const f of frames) {
  const dest = path.join(artifactDir, f.name);
  const cmd = `ffmpeg -y -ss ${f.t} -i "${videoPath}" -vframes 1 -update 1 "${dest}"`;
  execSync(cmd);
  console.log(`Extracted: ${f.name}`);
}
