// scripts/generate-pwa-icons.js
// Generates PWA icons from D20 design using sharp

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// SVG representation of the D20 dice with white wireframe
const d20SVG = `
<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      .d20-bg { fill: #1a1a1a; }
      .d20-edge { stroke: #ffffff; stroke-width: 2.5; stroke-linecap: round; fill: none; }
    </style>
  </defs>

  <!-- Background circle for maskable icon -->
  <circle cx="100" cy="100" r="100" class="d20-bg"/>

  <!-- D20 wireframe edges (simplified for icon clarity) -->
  <!-- Top pyramid -->
  <path d="M100 30 L70 50 L100 50 Z" class="d20-edge"/>
  <path d="M100 30 L130 50 L100 50 Z" class="d20-edge"/>
  <path d="M100 30 L70 50 L50 70 Z" class="d20-edge"/>
  <path d="M100 30 L130 50 L150 70 Z" class="d20-edge"/>

  <!-- Middle band -->
  <path d="M50 70 L70 50 L100 50 L70 90 Z" class="d20-edge"/>
  <path d="M150 70 L130 50 L100 50 L130 90 Z" class="d20-edge"/>
  <path d="M50 70 L30 100 L70 90 Z" class="d20-edge"/>
  <path d="M150 70 L170 100 L130 90 Z" class="d20-edge"/>

  <!-- Center -->
  <path d="M70 90 L100 100 L130 90" class="d20-edge"/>
  <path d="M70 90 L100 100 L70 110" class="d20-edge"/>
  <path d="M130 90 L100 100 L130 110" class="d20-edge"/>

  <!-- Bottom band -->
  <path d="M30 100 L50 130 L70 110 L70 90 Z" class="d20-edge"/>
  <path d="M170 100 L150 130 L130 110 L130 90 Z" class="d20-edge"/>
  <path d="M70 110 L100 100 L100 150 Z" class="d20-edge"/>
  <path d="M130 110 L100 100 L100 150 Z" class="d20-edge"/>

  <!-- Bottom pyramid -->
  <path d="M100 170 L70 150 L100 150 Z" class="d20-edge"/>
  <path d="M100 170 L130 150 L100 150 Z" class="d20-edge"/>
  <path d="M100 170 L70 150 L50 130 Z" class="d20-edge"/>
  <path d="M100 170 L130 150 L150 130 Z" class="d20-edge"/>

  <!-- Additional structural lines for visual clarity -->
  <line x1="50" y1="70" x2="50" y2="130" class="d20-edge"/>
  <line x1="150" y1="70" x2="150" y2="130" class="d20-edge"/>
  <line x1="30" y1="100" x2="70" y2="90" class="d20-edge"/>
  <line x1="170" y1="100" x2="130" y2="90" class="d20-edge"/>
  <line x1="30" y1="100" x2="70" y2="110" class="d20-edge"/>
  <line x1="170" y1="100" x2="130" y2="110" class="d20-edge"/>
  <line x1="50" y1="130" x2="70" y2="150" class="d20-edge"/>
  <line x1="150" y1="130" x2="130" y2="150" class="d20-edge"/>
</svg>
`;

// Maskable icon - safe area 80% (10% padding all around)
const d20MaskableSVG = `
<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      .d20-bg { fill: #1a1a1a; }
      .d20-edge { stroke: #ffffff; stroke-width: 3; stroke-linecap: round; fill: none; }
    </style>
  </defs>

  <!-- Full background for maskable -->
  <rect width="200" height="200" class="d20-bg"/>

  <!-- D20 centered and scaled to 80% (safe area) -->
  <g transform="translate(100, 100) scale(0.8) translate(-100, -100)">
    <!-- Top pyramid -->
    <path d="M100 30 L70 50 L100 50 Z" class="d20-edge"/>
    <path d="M100 30 L130 50 L100 50 Z" class="d20-edge"/>
    <path d="M100 30 L70 50 L50 70 Z" class="d20-edge"/>
    <path d="M100 30 L130 50 L150 70 Z" class="d20-edge"/>

    <!-- Middle band -->
    <path d="M50 70 L70 50 L100 50 L70 90 Z" class="d20-edge"/>
    <path d="M150 70 L130 50 L100 50 L130 90 Z" class="d20-edge"/>
    <path d="M50 70 L30 100 L70 90 Z" class="d20-edge"/>
    <path d="M150 70 L170 100 L130 90 Z" class="d20-edge"/>

    <!-- Center -->
    <path d="M70 90 L100 100 L130 90" class="d20-edge"/>
    <path d="M70 90 L100 100 L70 110" class="d20-edge"/>
    <path d="M130 90 L100 100 L130 110" class="d20-edge"/>

    <!-- Bottom band -->
    <path d="M30 100 L50 130 L70 110 L70 90 Z" class="d20-edge"/>
    <path d="M170 100 L150 130 L130 110 L130 90 Z" class="d20-edge"/>
    <path d="M70 110 L100 100 L100 150 Z" class="d20-edge"/>
    <path d="M130 110 L100 100 L100 150 Z" class="d20-edge"/>

    <!-- Bottom pyramid -->
    <path d="M100 170 L70 150 L100 150 Z" class="d20-edge"/>
    <path d="M100 170 L130 150 L100 150 Z" class="d20-edge"/>
    <path d="M100 170 L70 150 L50 130 Z" class="d20-edge"/>
    <path d="M100 170 L130 150 L150 130 Z" class="d20-edge"/>

    <!-- Additional structural lines -->
    <line x1="50" y1="70" x2="50" y2="130" class="d20-edge"/>
    <line x1="150" y1="70" x2="150" y2="130" class="d20-edge"/>
    <line x1="30" y1="100" x2="70" y2="90" class="d20-edge"/>
    <line x1="170" y1="100" x2="130" y2="90" class="d20-edge"/>
    <line x1="30" y1="100" x2="70" y2="110" class="d20-edge"/>
    <line x1="170" y1="100" x2="130" y2="110" class="d20-edge"/>
    <line x1="50" y1="130" x2="70" y2="150" class="d20-edge"/>
    <line x1="150" y1="130" x2="130" y2="150" class="d20-edge"/>
  </g>
</svg>
`;

async function generateIcons() {
  const publicDir = path.join(__dirname, '..', 'public');

  try {
    console.log('🎲 Generating PWA icons from D20 design...\n');

    // Generate standard icon (192x192)
    console.log('📱 Generating icon-192.png (192x192)...');
    await sharp(Buffer.from(d20SVG))
      .resize(192, 192)
      .png()
      .toFile(path.join(publicDir, 'icon-192.png'));
    console.log('✅ icon-192.png created');

    // Generate large icon (512x512)
    console.log('📱 Generating icon-512.png (512x512)...');
    await sharp(Buffer.from(d20SVG))
      .resize(512, 512)
      .png()
      .toFile(path.join(publicDir, 'icon-512.png'));
    console.log('✅ icon-512.png created');

    // Generate maskable icon (192x192) with safe area
    console.log('📱 Generating icon-192-maskable.png (192x192, safe area)...');
    await sharp(Buffer.from(d20MaskableSVG))
      .resize(192, 192)
      .png()
      .toFile(path.join(publicDir, 'icon-192-maskable.png'));
    console.log('✅ icon-192-maskable.png created');

    // Generate maskable icon (512x512) with safe area
    console.log('📱 Generating icon-512-maskable.png (512x512, safe area)...');
    await sharp(Buffer.from(d20MaskableSVG))
      .resize(512, 512)
      .png()
      .toFile(path.join(publicDir, 'icon-512-maskable.png'));
    console.log('✅ icon-512-maskable.png created');

    // Replace the old 80-byte icon.png with proper icon
    console.log('📱 Replacing icon.png (fallback icon)...');
    await sharp(Buffer.from(d20SVG))
      .resize(192, 192)
      .png()
      .toFile(path.join(publicDir, 'icon.png'));
    console.log('✅ icon.png replaced');

    // Generate apple-touch-icon (180x180) - iOS requirement
    console.log('📱 Generating apple-touch-icon.png (180x180)...');
    await sharp(Buffer.from(d20SVG))
      .resize(180, 180)
      .png()
      .toFile(path.join(publicDir, 'apple-touch-icon.png'));
    console.log('✅ apple-touch-icon.png created');

    // Get file sizes
    const icon192Size = fs.statSync(path.join(publicDir, 'icon-192.png')).size;
    const icon512Size = fs.statSync(path.join(publicDir, 'icon-512.png')).size;
    const maskable192Size = fs.statSync(path.join(publicDir, 'icon-192-maskable.png')).size;
    const maskable512Size = fs.statSync(path.join(publicDir, 'icon-512-maskable.png')).size;
    const iconSize = fs.statSync(path.join(publicDir, 'icon.png')).size;
    const appleSize = fs.statSync(path.join(publicDir, 'apple-touch-icon.png')).size;

    console.log('\n📊 Icon Sizes:');
    console.log(`  icon-192.png: ${(icon192Size / 1024).toFixed(1)} KB`);
    console.log(`  icon-512.png: ${(icon512Size / 1024).toFixed(1)} KB`);
    console.log(`  icon-192-maskable.png: ${(maskable192Size / 1024).toFixed(1)} KB`);
    console.log(`  icon-512-maskable.png: ${(maskable512Size / 1024).toFixed(1)} KB`);
    console.log(`  icon.png: ${(iconSize / 1024).toFixed(1)} KB (was 80 bytes)`);
    console.log(`  apple-touch-icon.png: ${(appleSize / 1024).toFixed(1)} KB`);

    console.log('\n✅ All PWA icons generated successfully!');
    console.log('\n📝 Next steps:');
    console.log('  1. Update public/manifest.json to reference new maskable icons');
    console.log('  2. Add apple-touch-icon link to app/layout.tsx');
    console.log('  3. Test icons on mobile devices');

  } catch (error) {
    console.error('❌ Error generating icons:', error);
    process.exit(1);
  }
}

generateIcons();
