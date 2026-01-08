# PWA Icons Generation

The PWA requires icons in multiple sizes. These need to be generated from the existing favicon.ico.

## Required Sizes:
- 72x72
- 96x96
- 128x128
- 144x144
- 152x152
- 192x192
- 384x384
- 512x512
- 512x512 (maskable version with safe zone)

## How to Generate:

### Option 1: Use online tool
1. Go to https://realfavicongenerator.net/ or https://www.pwabuilder.com/imageGenerator
2. Upload `/app/favicon.ico`
3. Generate all sizes
4. Download and place in `/public/` directory

### Option 2: Use ImageMagick (command line)
```bash
# Install ImageMagick first
brew install imagemagick  # macOS
apt-get install imagemagick  # Ubuntu/Debian

# Generate icons
convert app/favicon.ico -resize 72x72 public/icon-72x72.png
convert app/favicon.ico -resize 96x96 public/icon-96x96.png
convert app/favicon.ico -resize 128x128 public/icon-128x128.png
convert app/favicon.ico -resize 144x144 public/icon-144x144.png
convert app/favicon.ico -resize 152x152 public/icon-152x152.png
convert app/favicon.ico -resize 192x192 public/icon-192x192.png
convert app/favicon.ico -resize 384x384 public/icon-384x384.png
convert app/favicon.ico -resize 512x512 public/icon-512x512.png

# For maskable icon (add padding for safe zone)
convert app/favicon.ico -resize 432x432 -background transparent -gravity center -extent 512x512 public/icon-maskable-512x512.png
```

### Option 3: Use PWA Asset Generator
```bash
npx pwa-asset-generator app/favicon.ico public/ --icon-only --background "#8860d0"
```

## Apple Touch Icons (for iOS)
Also generate these for iOS devices:
```bash
convert app/favicon.ico -resize 180x180 public/apple-touch-icon.png
convert app/favicon.ico -resize 152x152 public/apple-touch-icon-152x152.png
convert app/favicon.ico -resize 120x120 public/apple-touch-icon-120x120.png
```

## Maskable Icon Requirements
The maskable icon must have:
- 20% safe zone on all sides
- Important content centered in middle 60%
- Background should match theme color (#8860d0)
