/**
 * Create placeholder PWA icons
 * Run: node scripts/create-placeholder-icons.js
 */

const sharp = require('sharp');
const path = require('path');

const publicDir = path.join(__dirname, '../public');
const brandColor = { r: 136, g: 96, b: 208 }; // #8860d0

async function createPlaceholderIcon(size, filename) {
  // Create a solid color square
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" fill="rgb(${brandColor.r}, ${brandColor.g}, ${brandColor.b})"/>
      <text
        x="50%"
        y="50%"
        text-anchor="middle"
        dominant-baseline="middle"
        font-family="Arial, sans-serif"
        font-size="${size * 0.3}"
        font-weight="bold"
        fill="white">
        hex
      </text>
    </svg>
  `;

  const buffer = Buffer.from(svg);

  await sharp(buffer)
    .png()
    .toFile(path.join(publicDir, filename));

  console.log(`✅ Created ${filename}`);
}

async function createIcons() {
  console.log('🎨 Creating placeholder PWA icons...\n');

  const sizes = [
    { size: 72, name: 'icon-72x72.png' },
    { size: 96, name: 'icon-96x96.png' },
    { size: 128, name: 'icon-128x128.png' },
    { size: 144, name: 'icon-144x144.png' },
    { size: 152, name: 'icon-152x152.png' },
    { size: 192, name: 'icon-192x192.png' },
    { size: 384, name: 'icon-384x384.png' },
    { size: 512, name: 'icon-512x512.png' },
    { size: 512, name: 'icon-maskable-512x512.png' },
    { size: 180, name: 'apple-touch-icon.png' },
  ];

  for (const { size, name } of sizes) {
    try {
      await createPlaceholderIcon(size, name);
    } catch (error) {
      console.error(`❌ Failed to create ${name}:`, error.message);
    }
  }

  console.log('\n🎉 Placeholder icons created!');
  console.log('📁 Icons saved to /public/');
  console.log('⚠️  These are placeholders - replace with your actual logo later!');
}

createIcons().catch(console.error);
