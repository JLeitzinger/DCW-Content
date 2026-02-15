import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import archiver from 'archiver';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.join(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');
const moduleId = 'dcw-content';

// Files and directories to include in the release
const includePatterns = [
  'module.json',
  'LICENSE',
  'README.md',
  'packs/**/*'
];

// Files and directories to exclude
const excludePatterns = [
  'node_modules',
  'scripts',
  'src',
  'data',
  '.git',
  '.gitignore',
  'package.json',
  'package-lock.json',
  'dist'
];

async function buildRelease() {
  console.log('Building module release package...\n');

  // Read version from module.json
  const moduleJsonPath = path.join(projectRoot, 'module.json');
  const moduleJson = JSON.parse(fs.readFileSync(moduleJsonPath, 'utf8'));
  const version = moduleJson.version;

  console.log(`Module: ${moduleJson.title}`);
  console.log(`Version: ${version}\n`);

  // Create dist directory
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  const outputPath = path.join(distDir, `${moduleId}-v${version}.zip`);

  // Create zip archive
  const output = fs.createWriteStream(outputPath);
  const archive = archiver('zip', {
    zlib: { level: 9 } // Maximum compression
  });

  return new Promise((resolve, reject) => {
    output.on('close', () => {
      const sizeInMB = (archive.pointer() / 1024 / 1024).toFixed(2);
      console.log(`\n✓ Release package created: ${outputPath}`);
      console.log(`✓ Total size: ${sizeInMB} MB`);
      console.log(`\nUpload this file to a GitHub Release tagged v${version}`);
      resolve();
    });

    archive.on('error', (err) => {
      reject(err);
    });

    archive.pipe(output);

    // Add module.json
    archive.file(path.join(projectRoot, 'module.json'), { name: 'module.json' });

    // Add LICENSE
    archive.file(path.join(projectRoot, 'LICENSE'), { name: 'LICENSE' });

    // Add README.md
    archive.file(path.join(projectRoot, 'README.md'), { name: 'README.md' });

    // Add packs directory
    archive.directory(path.join(projectRoot, 'packs'), 'packs');

    archive.finalize();
  });
}

buildRelease().catch(console.error);
