/**
 * Generate PWA icons from favicon
 * Run: node scripts/generate-icons.js
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const faviconPath = path.join(__dirname, '../app/favicon.ico');
const publicDir = path.join(__dirname, '../public');

async function generateIcons() {
  console.log('🎨 Generating PWA icons from favicon.ico...\n');

  if (!fs.existsSync(faviconPath)) {
    console.error('❌ Error: favicon.ico not found at', faviconPath);
    process.exit(1);
  }

  // Generate standard icons
  for (const size of sizes) {
    const outputPath = path.join(publicDir, `icon-${size}x${size}.png`);

    try {
      await sharp(faviconPath)
        .resize(size, size)
        .toFile(outputPath);

      console.log(`✅ Generated icon-${size}x${size}.png`);
    } catch (error) {
      console.error(`❌ Failed to generate ${size}x${size}:`, error.message);
    }
  }

  // Generate maskable icon (with safe zone padding)
  const maskableSize = 512;
  const contentSize = Math.floor(maskableSize * 0.6); // 60% content, 40% safe zone
  const padding = (maskableSize - contentSize) / 2;

  try {
    await sharp(faviconPath)
      .resize(contentSize, contentSize)
      .extend({
        top: Math.floor(padding),
        bottom: Math.ceil(padding),
        left: Math.floor(padding),
        right: Math.ceil(padding),
        background: { r: 136, g: 96, b: 208, alpha: 1 } // #8860d0
      })
      .toFile(path.join(publicDir, 'icon-maskable-512x512.png'));

    console.log('✅ Generated icon-maskable-512x512.png (with safe zone)');
  } catch (error) {
    console.error('❌ Failed to generate maskable icon:', error.message);
  }

  // Generate Apple touch icon
  try {
    await sharp(faviconPath)
      .resize(180, 180)
      .toFile(path.join(publicDir, 'apple-touch-icon.png'));

    console.log('✅ Generated apple-touch-icon.png');
  } catch (error) {
    console.error('❌ Failed to generate Apple touch icon:', error.message);
  }

  console.log('\n🎉 Icon generation complete!');
  console.log('📁 Icons saved to /public/');
}

generateIcons().catch(console.error);
