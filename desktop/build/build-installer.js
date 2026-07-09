/**
 * Build script for MyWorkspace Windows Desktop Installer.
 *
 * Usage:
 *   node build/build-installer.js [--publish]
 *
 * This script:
 *   1. Cleans previous builds
 *   2. Installs dependencies
 *   3. Runs electron-builder to produce MyWorkspaceSetup.exe
 *   4. Optionally publishes to the update server
 *
 * Prerequisites:
 *   - Node.js 18+
 *   - npm
 *   - Windows (for NSIS installer generation)
 *   - Code signing certificate (optional but recommended)
 */

const { execSync } = require("child_process");
const fs = require("fs-extra");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..");
const DIST_DIR = path.join(ROOT_DIR, "dist");
const PLATFORM = process.platform;

function run(cmd, opts = {}) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: "inherit", cwd: ROOT_DIR, ...opts });
}

async function build() {
  const args = process.argv.slice(2);
  const shouldPublish = args.includes("--publish");

  console.log("========================================");
  console.log("  MyWorkspace Windows Installer Builder");
  console.log("========================================\n");

  // Check platform
  if (PLATFORM !== "win32") {
    console.warn("⚠  Warning: Building Windows installer on non-Windows platform.");
    console.warn("   NSIS cross-compilation may have limited functionality.\n");
  }

  // Step 1: Ensure assets exist
  console.log("📦  Step 1/4: Verifying assets...");
  const requiredAssets = [
    "assets/icon.ico",
    "assets/icon.png",
    "assets/tray-icon.png",
    "assets/installer-sidebar.bmp",
    "assets/project-icon.ico",
    "assets/template-icon.ico",
    "LICENSES/LICENSE.txt",
  ];

  for (const asset of requiredAssets) {
    const assetPath = path.join(ROOT_DIR, asset);
    if (!fs.existsSync(assetPath)) {
      console.warn(`   ⚠  Missing: ${asset} (will be auto-generated)`);
    } else {
      console.log(`   ✓  Found: ${asset}`);
    }
  }

  // Step 2: Clean dist
  console.log("\n🧹  Step 2/4: Cleaning previous builds...");
  if (fs.existsSync(DIST_DIR)) {
    fs.removeSync(DIST_DIR);
    console.log("   ✓  Cleaned dist/ directory");
  }

  // Step 3: Install dependencies
  console.log("\n📥  Step 3/4: Installing dependencies...");
  run("npm install");

  // Step 4: Build with electron-builder
  console.log("\n🔨  Step 4/4: Building Windows installer...");
  const publishFlag = shouldPublish ? "--publish always" : "";
  run(`npx electron-builder --win ${publishFlag}`);

  // Verify
  console.log("\n========================================");
  if (fs.existsSync(DIST_DIR)) {
    const files = fs.readdirSync(DIST_DIR);
    const setupExe = files.find((f) => f.endsWith(".exe"));
    if (setupExe) {
      const stats = fs.statSync(path.join(DIST_DIR, setupExe));
      console.log(`  ✅  Build complete!`);
      console.log(`  📄  ${setupExe}`);
      console.log(`  📏  ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
      console.log(`  📂  ${DIST_DIR}`);
    } else {
      console.log("  ⚠️  Build completed but no .exe found in dist/");
    }
  } else {
    console.log("  ❌  Build failed - dist/ directory not created");
    process.exit(1);
  }
  console.log("========================================");
}

build().catch((err) => {
  console.error("\n❌ Build failed:", err.message);
  process.exit(1);
});
