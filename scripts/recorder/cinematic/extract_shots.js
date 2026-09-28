const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const artifactDir = path.resolve(__dirname, 'assets');
const videoPath = path.resolve(__dirname, '../../../kprit_campushub_product_walkthrough.mp4');

if (!fs.existsSync(artifactDir)) fs.mkdirSync(artifactDir, { recursive: true });

const shots = [
  { t: '00:00:28', name: 'student_dashboard.jpg' },
  { t: '00:00:46', name: 'student_events.jpg' },
  { t: '00:01:05', name: 'student_pass.jpg' },
  { t: '00:01:18', name: 'student_clubs.jpg' },
  { t: '00:01:52', name: 'admin_dashboard.jpg' },
  { t: '00:02:15', name: 'admin_students.jpg' },
  { t: '00:02:40', name: 'admin_depts.jpg' },
  { t: '00:03:05', name: 'admin_approvals.jpg' },
  { t: '00:03:38', name: 'tpo_dashboard.jpg' },
  { t: '00:03:52', name: 'tpo_companies.jpg' },
  { t: '00:04:05', name: 'tpo_drives.jpg' },
  { t: '00:04:18', name: 'tpo_students.jpg' },
  { t: '00:04:40', name: 'rbac_restricted.jpg' },
  { t: '00:04:52', name: 'rbac_admin_granted.jpg' },
  { t: '00:05:08', name: 'rbac_tpo_granted.jpg' }
];

for (const s of shots) {
  const p = path.join(artifactDir, s.name);
  const cmd = `ffmpeg -y -ss ${s.t} -i "${videoPath}" -vframes 1 -update 1 "${p}"`;
  execSync(cmd);
  console.log(`Saved shot: ${s.name} from ${s.t}`);
}
