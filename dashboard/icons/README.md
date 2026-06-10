# Mission Control - PWA Icon Generator

This directory contains the PWA icons for Mission Control.

## Generating Icons

Since we're in a text-based environment, actual PNG files cannot be generated directly. You have several options:

### Option 1: Use the Icon Generator HTML (Recommended)
Open `generate-icons.html` in a browser to generate all required PNG sizes.

### Option 2: Use ImageMagick
```bash
# Install ImageMagick first
# Then run:
convert favicon.svg -resize 48x48 icons/icon-48.png
convert favicon.svg -resize 72x72 icons/icon-72.png
convert favicon.svg -resize 96x96 icons/icon-96.png
convert favicon.svg -resize 128x128 icons/icon-128.png
convert favicon.svg -resize 144x144 icons/icon-144.png
convert favicon.svg -resize 152x152 icons/icon-152.png
convert favicon.svg -resize 192x192 icons/icon-192.png
convert favicon.svg -resize 384x384 icons/icon-384.png
convert favicon.svg -resize 512x512 icons/icon-512.png
```

### Option 3: Use Online Tools
Upload `favicon.svg` to:
- https://realfavicongenerator.net/
- https://www.pwabuilder.com/imageGenerator

## Required Icon Sizes (per manifest.json)

| Size | File | Purpose |
|------|------|---------|
| 48x48 | icon-48.png | Small icon |
| 72x72 | icon-72.png | Small icon |
| 96x96 | icon-96.png | Small icon |
| 128x128 | icon-128.png | Medium icon |
| 144x144 | icon-144.png | Medium icon |
| 152x152 | icon-152.png | iOS Safari |
| 192x192 | icon-192.png | Android/Chrome |
| 384x384 | icon-384.png | Large icon |
| 512x512 | icon-512.png | Large icon / Splash |

## Notes
- All icons should be square PNG files
- Use transparent background
- The favicon.svg is used as the base for all sizes
- For maskable icons, ensure the logo fits within a safe zone (80% of the image)
- Test icons on both light and dark backgrounds

## Generated Files Checklist
- [ ] icons/icon-48.png
- [ ] icons/icon-72.png
- [ ] icons/icon-96.png
- [ ] icons/icon-128.png
- [ ] icons/icon-144.png
- [ ] icons/icon-152.png
- [ ] icons/icon-192.png
- [ ] icons/icon-384.png
- [ ] icons/icon-512.png
- [ ] apple-touch-icon.png (192x192 for iOS)

## Verification
After generating, verify:
1. All icons load correctly in browser dev tools
2. PWA installs correctly on mobile/desktop
3. Icons appear correctly in home screen/start menu
4. Icons work in both light and dark themes