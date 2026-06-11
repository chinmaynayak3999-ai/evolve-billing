const { createCanvas } = require('canvas');
const fs = require('fs');

function makeIcon(size, path) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Background
  ctx.fillStyle = '#1d4ed8';
  ctx.fillRect(0, 0, size, size);
  
  // Circle
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(size/2, size/2, size*0.38, 0, Math.PI*2);
  ctx.fill();
  
  // Letter E
  ctx.fillStyle = '#1d4ed8';
  ctx.font = `bold ${size*0.45}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('E', size/2, size/2 + size*0.03);
  
  fs.writeFileSync(path, canvas.toBuffer('image/png'));
  console.log('Created', path);
}

try {
  makeIcon(192, 'public/pwa-192.png');
  makeIcon(512, 'public/pwa-512.png');
} catch(e) {
  console.log('canvas not available, using fallback');
}
