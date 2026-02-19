// scripts/generate-icons.js
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const ASSETS_DIR = path.join(__dirname, '../assets/images');

// Helper: draw a rounded rectangle path (no fill/stroke — caller does that)
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// Draw the design onto ctx in 512x512 logical space.
// variant: 'full' | 'foreground' | 'background' | 'monochrome'
function drawDesign(ctx, variant) {
  const W = 512, H = 512;

  // --- Background ---
  if (variant === 'full' || variant === 'background') {
    ctx.fillStyle = '#0D1B2A';
    ctx.fillRect(0, 0, W, H);
  } else if (variant === 'monochrome') {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, W, H);
  }
  // 'foreground': transparent — canvas is already transparent

  if (variant === 'background') return; // just a flat fill

  // --- Glow (full only) ---
  if (variant === 'full') {
    const glow = ctx.createRadialGradient(256, 295, 10, 256, 295, 140);
    glow.addColorStop(0, 'rgba(96, 165, 250, 0.45)');
    glow.addColorStop(1, 'rgba(96, 165, 250, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.ellipse(256, 295, 140, 90, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- Color helpers ---
  const mono = variant === 'monochrome';

  function trayFill() {
    if (mono) return '#ffffff';
    const g = ctx.createLinearGradient(0, 172, 0, 438);
    g.addColorStop(0, '#2D4A6A');
    g.addColorStop(1, '#1A2D42');
    return g;
  }
  const highlight  = mono ? 'rgba(255,255,255,0.4)' : '#4A7099';
  const innerFloor = mono ? '#333333' : '#111E2E';

  // --- Tray: left wall ---
  ctx.fillStyle = trayFill();
  roundRect(ctx, 72, 172, 46, 266, 6);
  ctx.fill();
  ctx.fillStyle = highlight;
  roundRect(ctx, 72, 172, 5, 266, 2);
  ctx.fill();

  // --- Tray: right wall ---
  ctx.fillStyle = trayFill();
  roundRect(ctx, 394, 172, 46, 266, 6);
  ctx.fill();
  ctx.fillStyle = highlight;
  roundRect(ctx, 435, 172, 5, 266, 2);
  ctx.fill();

  // --- Tray: bottom bar ---
  ctx.fillStyle = trayFill();
  roundRect(ctx, 72, 392, 368, 46, 6);
  ctx.fill();
  ctx.fillStyle = highlight;
  roundRect(ctx, 72, 431, 368, 5, 2);
  ctx.fill();

  // --- Tray: inner floor ---
  ctx.fillStyle = innerFloor;
  ctx.fillRect(118, 392, 276, 42);

  // --- Tray: top rim caps ---
  ctx.fillStyle = highlight;
  roundRect(ctx, 72, 172, 46, 8, 3);
  ctx.fill();
  roundRect(ctx, 394, 172, 46, 8, 3);
  ctx.fill();

  // --- Envelope body ---
  let envFill;
  if (mono) {
    envFill = '#ffffff';
  } else {
    envFill = ctx.createLinearGradient(0, 214, 0, 380);
    envFill.addColorStop(0, '#F8FAFF');
    envFill.addColorStop(1, '#C8D8EE');
  }
  ctx.fillStyle = envFill;
  roundRect(ctx, 138, 214, 236, 166, 5);
  ctx.fill();

  // --- Envelope flap (V-fold at top) ---
  ctx.fillStyle = mono ? 'rgba(0,0,0,0.3)' : 'rgba(192, 206, 222, 0.75)';
  ctx.beginPath();
  ctx.moveTo(138, 214);
  ctx.lineTo(256, 304);
  ctx.lineTo(374, 214);
  ctx.closePath();
  ctx.fill();

  // --- Envelope fold lines (bottom corners to center) ---
  ctx.strokeStyle = mono ? 'rgba(0,0,0,0.4)' : 'rgba(154, 170, 187, 0.55)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(138, 380);
  ctx.lineTo(256, 300);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(374, 380);
  ctx.lineTo(256, 300);
  ctx.stroke();
}

function saveIcon(filename, size, variant) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  // Scale 512x512 reference coordinates to target size
  ctx.scale(size / 512, size / 512);
  drawDesign(ctx, variant);
  fs.writeFileSync(path.join(ASSETS_DIR, filename), canvas.toBuffer('image/png'));
  console.log(`✓ ${filename} (${size}×${size}, ${variant})`);
}

saveIcon('icon.png',                      1024, 'full');
saveIcon('android-icon-foreground.png',    432, 'foreground');
saveIcon('android-icon-background.png',    432, 'background');
saveIcon('android-icon-monochrome.png',    432, 'monochrome');
saveIcon('splash-icon.png',                512, 'full');
saveIcon('favicon.png',                     64, 'full');

console.log('\nAll icons generated.');
