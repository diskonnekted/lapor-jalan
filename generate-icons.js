/**
 * Generate PWA icons using canvas
 */
const fs = require('fs');
const path = require('path');

// Simple PNG generation using a minimal approach
// Create a blue square with white text

function createIcon(size, outputPath) {
  // We'll create a simple PNG using a data URL approach
  // Since we can't use canvas without native deps, we'll use a pre-made approach
  
  // Create SVG-based icon and convert to PNG would need sharp/canvas
  // For now, create a placeholder that works
  
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" rx="${size * 0.15}" fill="#1976D2"/>
    <text x="${size/2}" y="${size * 0.6}" text-anchor="middle" fill="white" font-size="${size * 0.5}" font-family="sans-serif">🗺️</text>
  </svg>`;
  
  fs.writeFileSync(outputPath, svg);
  console.log(`Created: ${outputPath}`);
}

const iconsDir = path.join(__dirname, '../frontend/public/icons');

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

createIcon(192, path.join(iconsDir, 'icon-192.svg'));
createIcon(512, path.join(iconsDir, 'icon-512.svg'));

console.log('Icons created! Note: For production, convert SVG to PNG using a tool like sharp.');
