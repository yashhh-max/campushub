const { execSync } = require('child_process');
const path = require('path');

function runScript(scriptName) {
  console.log(`\n======================================================`);
  console.log(`RUNNING: ${scriptName}`);
  console.log(`======================================================\n`);
  const fullPath = path.resolve(__dirname, scriptName);
  execSync(`node "${fullPath}"`, { stdio: 'inherit' });
}

async function main() {
  const startTime = Date.now();
  console.log('Starting KPRIT CampusHub Full Product Demo Video Production Pipeline...');

  // Step 1: Record Chapters
  runScript('record_student.js');
  runScript('record_admin.js');
  runScript('record_tpo.js');
  runScript('record_rbac.js');

  // Step 2: Assemble Video
  runScript('assemble_master_video.js');

  const elapsed = Math.round((Date.now() - startTime) / 1000);
  console.log(`\n======================================================`);
  console.log(`ALL DONE! Full production pipeline completed in ${elapsed}s`);
  console.log(`======================================================\n`);
}

main().catch(err => {
  console.error('Fatal error during video production:', err);
  process.exit(1);
});
