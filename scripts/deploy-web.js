const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const distPath = path.join(__dirname, '..', 'dist');
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gh-pages-'));

console.log('Deploying to GitHub Pages using git directly...');
console.log('Temp directory:', tempDir);

try {
  // Get the repository URL
  const repoUrl = execSync('git remote get-url origin', { encoding: 'utf8' }).trim();
  console.log('Repository:', repoUrl);

  // Clone the gh-pages branch (or create it if it doesn't exist)
  console.log('\nCloning gh-pages branch...');
  try {
    execSync(`git clone --branch gh-pages --single-branch --depth 1 "${repoUrl}" "${tempDir}"`, {
      encoding: 'utf8',
      stdio: 'pipe'
    });
  } catch (err) {
    // Branch might not exist, create an orphan
    console.log('gh-pages branch does not exist, creating...');
    execSync(`git clone --depth 1 "${repoUrl}" "${tempDir}"`, { encoding: 'utf8', stdio: 'pipe' });
    execSync('git checkout --orphan gh-pages', { cwd: tempDir, encoding: 'utf8', stdio: 'pipe' });
    execSync('git rm -rf .', { cwd: tempDir, encoding: 'utf8', stdio: 'pipe' });
  }

  // Remove all existing files except .git
  console.log('Cleaning target directory...');
  const existingFiles = fs.readdirSync(tempDir);
  for (const file of existingFiles) {
    if (file !== '.git') {
      const filePath = path.join(tempDir, file);
      fs.rmSync(filePath, { recursive: true, force: true });
    }
  }

  // Copy all files from dist to temp directory
  console.log('Copying files from dist...');
  const copyRecursive = (src, dest) => {
    const stat = fs.statSync(src);
    if (stat.isDirectory()) {
      fs.mkdirSync(dest, { recursive: true });
      const files = fs.readdirSync(src);
      for (const file of files) {
        copyRecursive(path.join(src, file), path.join(dest, file));
      }
    } else {
      fs.copyFileSync(src, dest);
    }
  };

  const distFiles = fs.readdirSync(distPath);
  for (const file of distFiles) {
    copyRecursive(path.join(distPath, file), path.join(tempDir, file));
  }

  // Fix paths in index.html for GitHub Pages subdirectory deployment
  const indexPath = path.join(tempDir, 'index.html');
  if (fs.existsSync(indexPath)) {
    console.log('Fixing paths in index.html...');
    let html = fs.readFileSync(indexPath, 'utf8');
    // Replace root-absolute paths with subdirectory paths
    html = html.replace(/"\/_expo\//g, '"/mygmailexpo/_expo/');
    html = html.replace(/src="\/_expo\//g, 'src="/mygmailexpo/_expo/');
    html = html.replace(/href="\/_expo\//g, 'href="/mygmailexpo/_expo/');
    fs.writeFileSync(indexPath, html);

    // SPA fallback: GitHub Pages serves 404.html for any unmatched path,
    // so writing the fixed index.html content to 404.html lets the SPA
    // boot and client-side router resolve dynamic routes (e.g. /email/{id}).
    const notFoundPath = path.join(tempDir, '404.html');
    fs.writeFileSync(notFoundPath, html);
    console.log('Wrote SPA fallback 404.html');
  }

  // Create .nojekyll file
  fs.writeFileSync(path.join(tempDir, '.nojekyll'), '');

  // Check if assets were copied
  const assetsPath = path.join(tempDir, 'assets', 'node_modules');
  if (fs.existsSync(assetsPath)) {
    console.log('Assets/node_modules directory exists in temp');
    const fontPath = path.join(assetsPath, '@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts');
    if (fs.existsSync(fontPath)) {
      console.log('Font directory exists:', fs.readdirSync(fontPath));
    }
  } else {
    console.log('WARNING: Assets/node_modules directory NOT found in temp!');
  }

  // Add all files and commit
  console.log('\nAdding files to git...');
  execSync('git add -A', { cwd: tempDir, encoding: 'utf8', stdio: 'pipe' });

  // Check status
  const status = execSync('git status --short', { cwd: tempDir, encoding: 'utf8' });
  console.log('Git status:', status.split('\n').length, 'files changed');

  // Commit
  console.log('Committing...');
  try {
    execSync('git commit -m "Deploy to GitHub Pages"', { cwd: tempDir, encoding: 'utf8', stdio: 'pipe' });
  } catch (err) {
    console.log('No changes to commit');
  }

  // Push
  console.log('Pushing to gh-pages...');
  execSync('git push origin gh-pages --force', { cwd: tempDir, encoding: 'utf8', stdio: 'inherit' });

  console.log('\nDeployment complete!');

} catch (err) {
  console.error('Deployment failed:', err.message);
  if (err.stderr) console.error(err.stderr);
  process.exit(1);
} finally {
  // Cleanup temp directory
  console.log('Cleaning up temp directory...');
  fs.rmSync(tempDir, { recursive: true, force: true });
}
