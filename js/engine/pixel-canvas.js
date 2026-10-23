/**
 * PIXEL-CANVAS.JS - Authentic 16-Bit RPG Pixel-Art Office Engine
 * Standalone Engine (Compatible with file:/// protocol, zero CORS issue)
 */

window.PixelOfficeEngine = class PixelOfficeEngine {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) {
      console.error("Canvas element not found:", canvasId);
      return;
    }
    this.ctx = this.canvas.getContext('2d');

    // World & Viewport Configuration
    this.worldWidth = 1200;
    this.worldHeight = 760;

    // Camera State
    this.camera = {
      x: 0,
      y: 0,
      targetX: 0,
      targetY: 0,
      zoom: 1.0,
      targetZoom: 1.0,
      minZoom: 0.65,
      maxZoom: 1.75
    };

    // Interaction State
    this.isDragging = false;
    this.startX = 0;
    this.startY = 0;
    this.animFrame = 0;
    this.currentState = 'idle';

    // Agent Coordinates in World
    this.agents = {
      nova: {
        x: 210,
        y: 200,
        name: 'NOVA',
        role: 'PM & ARCHITECT',
        zone: 'Dev Lab (Desk 1)',
        speech: 'Directive standing by!',
        isTyping: false
      },
      spark: {
        x: 470,
        y: 200,
        name: 'SPARK',
        role: 'DEV BUILDER',
        zone: 'Dev Lab (Desk 2)',
        speech: 'Ready to write code.',
        isTyping: true
      },
      echo: {
        x: 210,
        y: 450,
        name: 'ECHO',
        role: 'QA & AUDIT',
        zone: 'Dev Lab (Desk 3)',
        speech: 'Diagnostics online.',
        isTyping: false
      },
      cat: {
        x: 880,
        y: 560,
        name: 'MOCHI',
        role: 'OFFICE CAT (WHITE)',
        zone: 'Lounge Cushion',
        speech: 'Meow~',
        isTyping: false
      }
    };

    this.init();
  }

  init() {
    this.resizeCanvas();
    window.addEventListener('resize', () => {
      this.resizeCanvas();
    });

    this.setupControls();
    this.centerCamera();
    this.startLoop();
  }

  resizeCanvas() {
    const parent = this.canvas.parentElement;
    const w = parent && parent.clientWidth > 0 ? parent.clientWidth : window.innerWidth;
    const h = parent && parent.clientHeight > 0 ? parent.clientHeight : (window.innerHeight - 56);
    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx.imageSmoothingEnabled = false;
  }

  centerCamera() {
    this.camera.targetX = (this.worldWidth - this.canvas.width / this.camera.zoom) / 2;
    this.camera.targetY = (this.worldHeight - this.canvas.height / this.camera.zoom) / 2;
    this.camera.x = this.camera.targetX;
    this.camera.y = this.camera.targetY;
  }

  setupControls() {
    // Mouse Drag Panning
    this.canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.startX = e.clientX;
      this.startY = e.clientY;
      this.canvas.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      const dx = (e.clientX - this.startX) / this.camera.zoom;
      const dy = (e.clientY - this.startY) / this.camera.zoom;
      this.camera.targetX -= dx;
      this.camera.targetY -= dy;
      this.startX = e.clientX;
      this.startY = e.clientY;
      this.clampCamera();
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
      this.canvas.style.cursor = 'grab';
    });

    // Touchpad & Wheel Zoom / Pan
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (e.ctrlKey || Math.abs(e.deltaY) > 60) {
        // Zoom
        const zoomDelta = e.deltaY * -0.0015;
        this.camera.targetZoom = Math.min(
          this.camera.maxZoom,
          Math.max(this.camera.minZoom, this.camera.targetZoom + zoomDelta)
        );
      } else {
        // Pan via 2-finger scroll
        this.camera.targetX += e.deltaX * 0.8;
        this.camera.targetY += e.deltaY * 0.8;
        this.clampCamera();
      }
    }, { passive: false });
  }

  clampCamera() {
    const maxPanX = this.worldWidth - (this.canvas.width / this.camera.zoom) * 0.2;
    const maxPanY = this.worldHeight - (this.canvas.height / this.camera.zoom) * 0.2;
    const minPanX = -this.canvas.width * 0.4;
    const minPanY = -this.canvas.height * 0.4;

    this.camera.targetX = Math.max(minPanX, Math.min(this.camera.targetX, maxPanX));
    this.camera.targetY = Math.max(minPanY, Math.min(this.camera.targetY, maxPanY));
  }

  jumpToAgent(agentKey) {
    const agent = this.agents[agentKey];
    if (!agent) return;
    this.camera.targetX = agent.x - (this.canvas.width / this.camera.zoom) / 2 + 50;
    this.camera.targetY = agent.y - (this.canvas.height / this.camera.zoom) / 2 + 30;
    this.camera.targetZoom = 1.15;
  }

  setZoom(delta) {
    this.camera.targetZoom = Math.min(
      this.camera.maxZoom,
      Math.max(this.camera.minZoom, this.camera.targetZoom + delta)
    );
  }

  resetView() {
    this.camera.targetZoom = 1.0;
    this.centerCamera();
  }

  setState(stateName) {
    this.currentState = stateName;
    const speechMap = {
      idle: {
        nova: 'Directive standing by!',
        spark: 'Code compiler ready.',
        echo: 'Sensors calibrated.'
      },
      thinking: {
        nova: 'Analyzing system spec & architecture...',
        spark: 'Drafting data models & state...',
        echo: 'Constructing edge-case matrix...'
      },
      typing: {
        nova: 'Dispatching tasks to Spark (Dev)...',
        spark: 'Writing gravity calculation logic...',
        echo: 'Standing by for pull request...'
      },
      speaking: {
        nova: 'Echo, please audit the orbital formula.',
        spark: 'PR #01 submitted for inspection.',
        echo: 'Audit complete! Zero division patched.'
      }
    };

    if (speechMap[stateName]) {
      this.agents.nova.speech = speechMap[stateName].nova;
      this.agents.spark.speech = speechMap[stateName].spark;
      this.agents.echo.speech = speechMap[stateName].echo;
    }
  }

  startLoop() {
    const render = () => {
      this.update();
      this.draw();
      requestAnimationFrame(render);
    };
    requestAnimationFrame(render);
  }

  update() {
    this.animFrame++;

    // Smooth Camera Lerp
    this.camera.x += (this.camera.targetX - this.camera.x) * 0.12;
    this.camera.y += (this.camera.targetY - this.camera.y) * 0.12;
    this.camera.zoom += (this.camera.targetZoom - this.camera.zoom) * 0.12;
  }

  /* ===================================================================
     DRAWING ROUTINES (Pixel-Art 16-Bit Engine)
     =================================================================== */
  draw() {
    const { ctx, canvas, camera } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply Camera Transform
    ctx.save();
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);

    // 1. Draw Floors for All 3 Zones
    this.drawFloors();

    // 2. Draw Partition Walls & Architecture
    this.drawWalls();

    // 3. Draw Zone Labels & Rugs
    this.drawRoomAccents();

    // 4. Draw Furniture (Desks, Computers, Bookshelves, Pantry, Sofas)
    this.drawFurniture();

    // 5. Draw Chibi Agents (Nova, Spark, Echo)
    this.drawAgents();

    // 6. Draw Collaboration Flow & Dialogue Bubbles
    this.drawOverlays();

    ctx.restore();
  }

  // --- 1. FLOORS ---
  drawFloors() {
    const { ctx } = this;

    // ZONE A: Dev Lab - Warm Wood Parquet Floor (X: 0 to 670, Y: 0 to 760)
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, 670, 760);
    ctx.clip(); // CLIPPING AMAN: Mencegah pattern merembes keluar batas

    ctx.fillStyle = '#b45309';
    ctx.fillRect(0, 0, 670, 760);

    // Wood Plank Grid Details (strictly within 0 to 670)
    const plankH = 24;
    const plankW = 72;
    for (let y = 0; y < 760; y += plankH) {
      // Horizontal seam
      ctx.fillStyle = '#92400e';
      ctx.fillRect(0, y, 670, 2);

      // Alternating vertical plank seams
      const offset = (Math.floor(y / plankH) % 2) * (plankW / 2);
      for (let x = -plankW; x < 670 + plankW; x += plankW) {
        const px = x + offset;
        if (px >= 0 && px < 670) {
          ctx.fillStyle = '#78350f';
          ctx.fillRect(px, y, 2, plankH);

          // Subtle wood grain lines (only if fully within floor)
          if (px + 30 < 670) {
            ctx.fillStyle = '#d97706';
            ctx.fillRect(px + 12, y + 6, 18, 1);
            ctx.fillRect(px + 20, y + 14, 14, 1);
          }
        }
      }
    }
    ctx.restore();

    // ZONE B: Pantry / Breakroom - White Glossy Tiles (X: 688 to 1188, Y: 0 to 332)
    ctx.save();
    ctx.beginPath();
    ctx.rect(688, 0, 500, 332);
    ctx.clip();

    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(688, 0, 500, 332);

    const tileSize = 32;
    ctx.fillStyle = '#cbd5e1';
    for (let x = 688; x < 1188; x += tileSize) {
      ctx.fillRect(x, 0, 2, 332);
    }
    for (let y = 0; y < 332; y += tileSize) {
      ctx.fillRect(688, y, 500, 2);
    }
    ctx.restore();

    // ZONE C: Lounge & Discussion - Navy Carpet (X: 688 to 1188, Y: 348 to 748)
    ctx.save();
    ctx.beginPath();
    ctx.rect(688, 348, 500, 400);
    ctx.clip();

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(688, 348, 500, 400);

    // Navy Carpet Inner Pattern
    ctx.fillStyle = '#25354e';
    ctx.fillRect(706, 366, 464, 364);
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.strokeRect(714, 374, 448, 348);
    ctx.restore();
  }

  // --- 2. WALLS, PERIMETER & WINDOWS ---
  drawWalls() {
    const { ctx } = this;

    // Top Outer Wall (Full width 0 to 1200)
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 1200, 40);
    ctx.fillStyle = '#334155';
    ctx.fillRect(0, 36, 1200, 4);

    // Left Outer Wall (Enclosing room cleanly)
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 14, 760);
    ctx.fillStyle = '#334155';
    ctx.fillRect(12, 0, 2, 760);

    // Right Outer Wall
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(1186, 0, 14, 760);
    ctx.fillStyle = '#334155';
    ctx.fillRect(1186, 0, 2, 760);

    // Bottom Outer Wall
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 746, 1200, 14);
    ctx.fillStyle = '#334155';
    ctx.fillRect(0, 746, 1200, 2);

    // Vertical Divider Wall (Separating Dev Lab and Pantry/Lounge)
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(670, 0, 18, 760);
    ctx.fillStyle = '#475569';
    ctx.fillRect(670, 0, 4, 760);
    ctx.fillRect(684, 0, 4, 760);

    // Horizontal Divider Wall (Between Pantry and Lounge)
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(680, 332, 520, 16);
    ctx.fillStyle = '#334155';
    ctx.fillRect(680, 332, 520, 3);
    ctx.fillRect(680, 345, 520, 3);

    // Doorway cutouts in divider wall
    ctx.fillStyle = '#b45309';
    ctx.fillRect(670, 240, 18, 70); // Doorway to pantry
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(670, 480, 18, 70); // Doorway to lounge

    // ==========================================
    // JENDELA DI SETIAP RUANGAN (WINDOWS IN EACH ROOM)
    // ==========================================
    // 1. Jendela Ruangan Dev Lab (Top Wall)
    this.drawWindow(ctx, 330, 4, 84, 28, 'space');
    this.drawWindow(ctx, 470, 4, 84, 28, 'space');

    // 2. Jendela Ruangan Pantry (Top Wall)
    this.drawWindow(ctx, 730, 4, 60, 28, 'sky');
    this.drawWindow(ctx, 1070, 4, 64, 28, 'sky');

    // 3. Jendela Ruangan Lounge (Right Wall Panoramic Window)
    this.drawWindow(ctx, 1140, 440, 42, 80, 'panoramic');
  }

  // 16-Bit Pixel Window Drawing Routine
  drawWindow(ctx, x, y, w, h, type) {
    // Window Outer Frame
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#475569';
    ctx.fillRect(x + 2, y + 2, w - 4, h - 4);

    // Sky / Cosmic View
    ctx.fillStyle = '#050811';
    ctx.fillRect(x + 4, y + 4, w - 8, h - 8);

    // Twinkling Pixel Stars
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + 8, y + 8, 2, 2);
    ctx.fillRect(x + w - 16, y + 10, 2, 2);
    ctx.fillRect(x + Math.floor(w * 0.4), y + h - 10, 1, 1);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(x + Math.floor(w * 0.7), y + 14, 2, 2);

    // Distant glowing Moon/Planet
    ctx.fillStyle = type === 'space' ? '#38bdf8' : '#fde047';
    ctx.fillRect(x + 14, y + 8, 6, 6);

    // Window Panes Divider Cross (+)
    ctx.fillStyle = '#64748b';
    const midX = Math.floor(x + w / 2);
    const midY = Math.floor(y + h / 2);
    ctx.fillRect(midX - 1, y + 4, 2, h - 8);
    ctx.fillRect(x + 4, midY - 1, w - 8, 2);

    // Glass Reflection Slant Line
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.beginPath();
    ctx.moveTo(x + 8, y + 4);
    ctx.lineTo(x + 18, y + 4);
    ctx.lineTo(x + 6, y + h - 4);
    ctx.lineTo(x + 4, y + h - 4);
    ctx.fill();
  }

  // --- 3. ROOM ACCENTS ---
  drawRoomAccents() {
    const { ctx } = this;

    // Room Name Badges on Floors
    this.drawPixelBadge(ctx, 40, 52, '💻 DEV LAB & CORE WORKSPACE');
    this.drawPixelBadge(ctx, 720, 52, '☕ BREAKROOM & PANTRY');
    this.drawPixelBadge(ctx, 720, 380, '🛋️ BRAINSTORM LOUNGE');

    // Wall Art Painting in Lounge
    ctx.fillStyle = '#78350f';
    ctx.fillRect(880, 336, 90, 44);
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(884, 340, 82, 36);
    // Sun & Mountain in Painting
    ctx.fillStyle = '#fde047';
    ctx.fillRect(940, 346, 12, 12);
    ctx.fillStyle = '#16a34a';
    ctx.beginPath();
    ctx.moveTo(886, 376);
    ctx.lineTo(916, 354);
    ctx.lineTo(940, 376);
    ctx.fill();
  }

  drawPixelBadge(ctx, x, y, text) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(x, y, text.length * 7 + 16, 20);
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, text.length * 7 + 16, 20);

    ctx.fillStyle = '#f8fafc';
    ctx.font = '9px monospace';
    ctx.fillText(text, x + 8, y + 14);
  }

  // --- 4. DETAILED FURNITURE ---
  drawFurniture() {
    const { ctx } = this;

    // Bookshelves & Storage (Top Left Dev Lab)
    this.drawBookshelf(ctx, 40, 56, 110, 68);
    this.drawBookshelf(ctx, 160, 56, 110, 68);
    this.drawCardboardBoxes(ctx, 280, 68);

    // 4 Workstation Desks in Dev Lab
    this.drawWorkstation(ctx, 150, 160, 'NOVA', true, '#00f2fe');
    this.drawWorkstation(ctx, 410, 160, 'SPARK', true, '#f59e0b');
    this.drawWorkstation(ctx, 150, 410, 'ECHO', true, '#a855f7');
    this.drawWorkstation(ctx, 410, 410, 'AGENT_4', false, '#64748b');

    // Potted Plants in Corners
    this.drawPottedPlant(ctx, 40, 360);
    this.drawPottedPlant(ctx, 40, 670);
    this.drawPottedPlant(ctx, 620, 670);
    this.drawPottedPlant(ctx, 720, 670);
    this.drawPottedPlant(ctx, 1130, 670);

    // Pantry Furniture (Zone B)
    this.drawWaterDispenser(ctx, 730, 80);
    this.drawVendingMachine(ctx, 800, 64);
    this.drawKitchenCounter(ctx, 920, 64, 180, 50);
    this.drawTrashCan(ctx, 1120, 84);

    // Lounge Furniture (Zone C)
    this.drawLoungeSectional(ctx, 760, 450);
    this.drawCoffeeTable(ctx, 920, 480);
    this.drawLoungeArmchair(ctx, 1060, 460);

    // Hewan Peliharaan Kantor: Kucing Putih Mochi
    this.drawCat(ctx, 880, 560);
  }

  // 16-Bit Pixel Art White Cat (Kucing Putih)
  drawCat(ctx, x, y) {
    const breathe = Math.sin(this.animFrame * 0.08) * 1;
    const tailSway = Math.sin(this.animFrame * 0.1) * 3;
    const isBlink = (Math.floor(this.animFrame / 70) % 6 === 0);

    // Round Pet Cushion / Bed (Teal & Sky Blue)
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.ellipse(x + 14, y + 26, 20, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.ellipse(x + 14, y + 25, 17, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Soft Shadow Under Cat
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.beginPath();
    ctx.ellipse(x + 14, y + 24, 13, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Cat Body (Pure White with Light Shading)
    ctx.fillStyle = '#f1f5f9'; // Shading
    ctx.fillRect(x + 6, y + 12 + breathe, 18, 12);
    ctx.fillStyle = '#ffffff'; // Pure White Fur
    ctx.fillRect(x + 7, y + 11 + breathe, 16, 12);

    // Cat Head
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + 14, y + 4 + breathe, 14, 12);

    // White Pointy Ears with Pink Inner
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + 15, y + breathe, 4, 5);
    ctx.fillRect(x + 23, y + breathe, 4, 5);
    ctx.fillStyle = '#f472b6'; // Pink inside ear
    ctx.fillRect(x + 16, y + 2 + breathe, 2, 3);
    ctx.fillRect(x + 24, y + 2 + breathe, 2, 3);

    // Cat Eyes (Emerald Green with Black Pupil)
    if (!isBlink) {
      ctx.fillStyle = '#10b981';
      ctx.fillRect(x + 18, y + 8 + breathe, 3, 3);
      ctx.fillRect(x + 23, y + 8 + breathe, 3, 3);
      ctx.fillStyle = '#022c22'; // Pupils
      ctx.fillRect(x + 19, y + 9 + breathe, 1, 2);
      ctx.fillRect(x + 24, y + 9 + breathe, 1, 2);
    } else {
      // Happy Sleeping/Blinking Eyes (^ ^)
      ctx.fillStyle = '#64748b';
      ctx.fillRect(x + 18, y + 9 + breathe, 3, 1);
      ctx.fillRect(x + 23, y + 9 + breathe, 3, 1);
    }

    // Pink Nose & Cute Whiskers
    ctx.fillStyle = '#f472b6';
    ctx.fillRect(x + 21, y + 12 + breathe, 2, 1);
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(x + 15, y + 11 + breathe, 2, 1);
    ctx.fillRect(x + 27, y + 11 + breathe, 2, 1);

    // Red Collar with Golden Bell
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(x + 14, y + 15 + breathe, 12, 2);
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(x + 19, y + 16 + breathe, 3, 3);

    // Animated Curled Tail (Swaying gently)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + 3 + tailSway, y + 14, 4, 4);
    ctx.fillRect(x + 1 + tailSway * 1.4, y + 10, 4, 5);
    ctx.fillRect(x + 3 + tailSway * 1.7, y + 6, 4, 5);
    ctx.fillRect(x + 6 + tailSway * 1.9, y + 4, 4, 4);

    // Meow / Purr Speech Bubble (Blinking periodically)
    const isPurring = (this.animFrame % 220) < 70;
    if (isPurring) {
      const bubbleText = (this.animFrame % 440) < 220 ? '🐾 Meow~' : '💤 Purrr...';
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x + 18, y - 18, 56, 16);
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x + 18, y - 18, 56, 16);

      // Bubble Tail
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(x + 24, y - 2);
      ctx.lineTo(x + 28, y + 3);
      ctx.lineTo(x + 31, y - 2);
      ctx.fill();

      ctx.fillStyle = '#0f172a';
      ctx.font = '8px monospace';
      ctx.fillText(bubbleText, x + 22, y - 7);
    }
  }

  // Workstation Desk with Computers, Monitors, Keyboards, and Mugs
  drawWorkstation(ctx, x, y, label, isOccupied, color) {
    // Desk Surface (Wood)
    ctx.fillStyle = '#78350f';
    ctx.fillRect(x, y, 160, 74);
    ctx.fillStyle = '#92400e';
    ctx.fillRect(x + 2, y + 2, 156, 70);

    // Desk Legs / Shadows
    ctx.fillStyle = '#451a03';
    ctx.fillRect(x, y + 74, 8, 12);
    ctx.fillRect(x + 152, y + 74, 8, 12);

    // Desktop PC Tower (Left side)
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(x + 8, y + 10, 18, 38);
    ctx.fillStyle = color;
    ctx.fillRect(x + 14, y + 14, 4, 4); // LED

    // Main Monitor with Glowing Code Screen
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(x + 46, y + 8, 62, 38);
    ctx.fillStyle = '#020617';
    ctx.fillRect(x + 49, y + 11, 56, 32);

    // Live Glowing Code Lines on Monitor
    if (isOccupied) {
      const isBlink = Math.floor(this.animFrame / 20) % 2 === 0;
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(x + 52, y + 15, 36, 2);
      ctx.fillRect(x + 52, y + 20, 48, 2);
      ctx.fillRect(x + 52, y + 25, 28, 2);
      ctx.fillRect(x + 52, y + 30, 40, 2);
      if (isBlink) {
        ctx.fillStyle = color;
        ctx.fillRect(x + 94, y + 30, 4, 3);
      }
    }

    // Monitor Stand
    ctx.fillStyle = '#475569';
    ctx.fillRect(x + 72, y + 46, 10, 6);
    ctx.fillRect(x + 66, y + 52, 22, 3);

    // Second Monitor / Tablet
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(x + 114, y + 12, 34, 32);
    ctx.fillStyle = '#020617';
    ctx.fillRect(x + 116, y + 14, 30, 28);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(x + 120, y + 20, 20, 2);
    ctx.fillRect(x + 120, y + 26, 14, 2);

    // Keyboard & Mousepad
    ctx.fillStyle = '#334155';
    ctx.fillRect(x + 56, y + 58, 42, 12);
    ctx.fillStyle = '#cbd5e1';
    for (let k = 0; k < 4; k++) {
      ctx.fillRect(x + 60 + k * 9, y + 61, 7, 6);
    }
    // Mouse
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(x + 106, y + 60, 8, 10);

    // Coffee Mug with Steam
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + 126, y + 56, 10, 12);
    ctx.fillStyle = color;
    ctx.fillRect(x + 128, y + 58, 6, 8);
    // Steam animation
    if (this.animFrame % 60 < 30) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.fillRect(x + 130, y + 51, 2, 3);
    }

    // Swivel Office Chair (Below Desk)
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(x + 60, y + 84, 36, 12); // Seat
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(x + 64, y + 96, 28, 6);  // Base
    ctx.fillStyle = '#64748b';
    ctx.fillRect(x + 62, y + 102, 6, 4); // Wheel L
    ctx.fillRect(x + 84, y + 102, 6, 4); // Wheel R
  }

  // Bookshelf with Colorful 16-Bit Books
  drawBookshelf(ctx, x, y, w, h) {
    ctx.fillStyle = '#573012';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#3d1d07';
    ctx.fillRect(x + 2, y + 2, w - 4, h - 4);

    const shelfH = 28;
    const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
    for (let sy = y + 8; sy < y + h - 10; sy += shelfH) {
      // Shelf Plank
      ctx.fillStyle = '#78350f';
      ctx.fillRect(x + 4, sy + shelfH - 4, w - 8, 4);

      // Books on shelf
      let bx = x + 8;
      let ci = 0;
      while (bx < x + w - 16) {
        const bw = 5 + (ci % 3);
        const bh = 14 + (ci % 8);
        ctx.fillStyle = colors[ci % colors.length];
        ctx.fillRect(bx, sy + shelfH - 4 - bh, bw, bh);
        bx += bw + 2;
        ci++;
      }
    }
  }

  // Cardboard Archive Boxes
  drawCardboardBoxes(ctx, x, y) {
    ctx.fillStyle = '#d97706';
    ctx.fillRect(x, y + 14, 34, 26);
    ctx.fillStyle = '#b45309';
    ctx.fillRect(x + 4, y + 18, 26, 4); // Tape

    ctx.fillStyle = '#d97706';
    ctx.fillRect(x + 36, y + 8, 30, 32);
    ctx.fillStyle = '#b45309';
    ctx.fillRect(x + 40, y + 12, 22, 4);
  }

  // Potted Ficus Office Plant
  drawPottedPlant(ctx, x, y) {
    // Ceramic Pot
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(x + 8, y + 22, 24, 20);
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(x + 10, y + 24, 20, 16);

    // Leaves
    ctx.fillStyle = '#15803d';
    ctx.fillRect(x, y + 6, 18, 18);
    ctx.fillRect(x + 22, y + 6, 18, 18);
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(x + 8, y, 24, 20);
    ctx.fillRect(x + 14, y + 4, 12, 12);
  }

  // Water Dispenser Cooler
  drawWaterDispenser(ctx, x, y) {
    // White Body
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(x, y + 26, 26, 46);
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(x + 2, y + 28, 22, 42);

    // Inverted Blue Water Jug
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(x + 4, y, 18, 26);
    ctx.fillStyle = '#7dd3fc';
    ctx.fillRect(x + 6, y + 2, 4, 22); // Highlight

    // Red/Blue Spigots
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(x + 7, y + 40, 4, 4);
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(x + 15, y + 40, 4, 4);
  }

  // Beverage Vending Machine
  drawVendingMachine(ctx, x, y) {
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(x, y, 54, 84);
    ctx.fillStyle = '#991b1b';
    ctx.fillRect(x + 2, y + 2, 50, 80);

    // Glass Display Window
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(x + 8, y + 10, 38, 44);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(x + 10, y + 12, 34, 40);

    // Soda Cans Rows
    const canColors = ['#f59e0b', '#22c55e', '#ef4444', '#a855f7'];
    for (let cy = y + 16; cy < y + 48; cy += 12) {
      for (let cx = x + 12; cx < x + 40; cx += 8) {
        ctx.fillStyle = canColors[(cx + cy) % canColors.length];
        ctx.fillRect(cx, cy, 6, 8);
      }
    }

    // Retrieval Slot
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(x + 10, y + 64, 34, 12);
  }

  // Kitchen Pantry Counter
  drawKitchenCounter(ctx, x, y, w, h) {
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(x + 2, y + 2, w - 4, 16); // Marble top

    // Sink
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(x + 20, y + 6, 32, 10);
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(x + 34, y + 2, 4, 6); // Faucet

    // Microwave / Coffee Maker
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(x + 80, y - 18, 36, 20);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(x + 84, y - 14, 20, 12);
  }

  drawTrashCan(ctx, x, y) {
    ctx.fillStyle = '#64748b';
    ctx.fillRect(x, y, 18, 26);
    ctx.fillStyle = '#475569';
    ctx.fillRect(x + 2, y + 2, 14, 22);
  }

  // Lounge Sofas & Coffee Table
  drawLoungeSectional(ctx, x, y) {
    // Burgundy Plush Sofa
    ctx.fillStyle = '#991b1b';
    ctx.fillRect(x, y, 120, 48);
    ctx.fillStyle = '#b91c1c';
    ctx.fillRect(x + 4, y + 4, 112, 40);

    // Cushions
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(x + 8, y + 10, 50, 30);
    ctx.fillRect(x + 62, y + 10, 50, 30);
  }

  drawCoffeeTable(ctx, x, y) {
    ctx.fillStyle = '#78350f';
    ctx.fillRect(x, y, 76, 44);
    ctx.fillStyle = '#92400e';
    ctx.fillRect(x + 2, y + 2, 72, 40);

    // Laptop Open on Table
    ctx.fillStyle = '#475569';
    ctx.fillRect(x + 24, y + 10, 28, 20);
    ctx.fillStyle = '#00f2fe';
    ctx.fillRect(x + 26, y + 12, 24, 16);
  }

  drawLoungeArmchair(ctx, x, y) {
    ctx.fillStyle = '#991b1b';
    ctx.fillRect(x, y, 48, 48);
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(x + 6, y + 6, 36, 36);
  }

  // --- 5. CHIBI AGENTS (Nova, Spark, Echo) ---
  drawAgents() {
    const { ctx } = this;
    const breathe = Math.sin(this.animFrame * 0.08) * 1.5;

    // Nova (Commander / PM at Desk 1)
    this.drawAgentSprite(ctx, this.agents.nova.x, this.agents.nova.y + breathe, 'nova');

    // Spark (Dev Builder at Desk 2)
    this.drawAgentSprite(ctx, this.agents.spark.x, this.agents.spark.y + breathe, 'spark');

    // Echo (QA Reviewer at Desk 3)
    this.drawAgentSprite(ctx, this.agents.echo.x, this.agents.echo.y + breathe, 'echo');
  }

  drawAgentSprite(ctx, x, y, key) {
    const isTyping = this.currentState === 'typing';
    const typingArmOffset = isTyping && Math.floor(this.animFrame / 8) % 2 === 0 ? 2 : 0;

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(x + 12, y + 34, 12, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    if (key === 'nova') {
      // Nova: Blue Business Suit & Red Tie
      ctx.fillStyle = '#78350f'; // Brown Hair
      ctx.fillRect(x + 4, y, 16, 8);
      ctx.fillRect(x + 2, y + 4, 20, 6);

      ctx.fillStyle = '#fed7aa'; // Skin
      ctx.fillRect(x + 6, y + 8, 12, 10);
      ctx.fillStyle = '#0f172a'; // Eyes
      ctx.fillRect(x + 8, y + 11, 2, 3);
      ctx.fillRect(x + 14, y + 11, 2, 3);

      ctx.fillStyle = '#1e3a8a'; // Blue Suit Jacket
      ctx.fillRect(x + 4, y + 18, 16, 12);
      ctx.fillStyle = '#ffffff'; // White Shirt
      ctx.fillRect(x + 10, y + 18, 4, 6);
      ctx.fillStyle = '#ef4444'; // Red Tie
      ctx.fillRect(x + 11, y + 20, 2, 7);

      // Clipboard in hand
      ctx.fillStyle = '#d97706';
      ctx.fillRect(x + 18, y + 18 - typingArmOffset, 6, 8);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x + 19, y + 19 - typingArmOffset, 4, 6);

      ctx.fillStyle = '#172554'; // Pants
      ctx.fillRect(x + 6, y + 30, 12, 5);
    } 
    else if (key === 'spark') {
      // Spark: Green Hoodie & Headset
      ctx.fillStyle = '#1e293b'; // Headset
      ctx.fillRect(x + 2, y + 5, 20, 3);
      ctx.fillRect(x + 1, y + 7, 3, 5);
      ctx.fillRect(x + 20, y + 7, 3, 5);

      ctx.fillStyle = '#92400e'; // Hair
      ctx.fillRect(x + 4, y, 16, 7);

      ctx.fillStyle = '#fcd34d'; // Skin
      ctx.fillRect(x + 6, y + 7, 12, 9);
      ctx.fillStyle = '#78350f'; // Eyes
      ctx.fillRect(x + 8, y + 10, 2, 2);
      ctx.fillRect(x + 14, y + 10, 2, 2);

      ctx.fillStyle = '#16a34a'; // Green Hoodie
      ctx.fillRect(x + 4, y + 16, 16, 14);
      ctx.fillStyle = '#f59e0b'; // Badge
      ctx.fillRect(x + 6, y + 18, 2, 2);

      // Typing Arms moving
      ctx.fillStyle = '#15803d';
      ctx.fillRect(x + 1, y + 18 + typingArmOffset, 4, 6);
      ctx.fillRect(x + 19, y + 18 - typingArmOffset, 4, 6);

      ctx.fillStyle = '#1e293b'; // Jeans
      ctx.fillRect(x + 6, y + 30, 12, 5);
    } 
    else if (key === 'echo') {
      // Echo: Lilac Hair, Glasses, Violet Blazer
      ctx.fillStyle = '#c084fc'; // Lilac Hair
      ctx.fillRect(x + 3, y, 18, 8);
      ctx.fillRect(x + 2, y + 5, 20, 7);

      ctx.fillStyle = '#fed7aa'; // Skin
      ctx.fillRect(x + 6, y + 8, 12, 9);

      // Glasses / Monocle
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(x + 7, y + 10, 4, 3);
      ctx.fillRect(x + 13, y + 10, 4, 3);
      ctx.fillRect(x + 11, y + 11, 2, 1);

      ctx.fillStyle = '#7e22ce'; // Violet Blazer
      ctx.fillRect(x + 4, y + 17, 16, 13);
      ctx.fillStyle = '#f3e8ff'; // Shirt
      ctx.fillRect(x + 9, y + 17, 6, 6);

      ctx.fillStyle = '#3b0764'; // Pants
      ctx.fillRect(x + 6, y + 30, 12, 5);
    }
  }

  // --- 6. OVERLAYS, ARROWS & SPEECH BUBBLES ---
  drawOverlays() {
    const { ctx } = this;

    // Collaboration Flow Arrows (like Image 1) when active
    if (this.currentState === 'typing' || this.currentState === 'speaking') {
      this.drawTaskFlowArrow(ctx, this.agents.nova.x + 80, this.agents.nova.y + 10, this.agents.spark.x - 30, this.agents.spark.y + 10, 'ASSIGN TASK');
      this.drawTaskFlowArrow(ctx, this.agents.spark.x - 40, this.agents.spark.y + 80, this.agents.echo.x + 60, this.agents.echo.y - 20, 'AUDIT PR');
    }

    // Speech Bubbles above agents
    if (this.currentState !== 'idle') {
      this.drawSpeechBubble(ctx, this.agents.nova.x - 20, this.agents.nova.y - 36, this.agents.nova.speech, '#00f2fe');
      this.drawSpeechBubble(ctx, this.agents.spark.x - 20, this.agents.spark.y - 36, this.agents.spark.speech, '#f59e0b');
      this.drawSpeechBubble(ctx, this.agents.echo.x - 20, this.agents.echo.y - 36, this.agents.echo.speech, '#a855f7');
    }
  }

  drawTaskFlowArrow(ctx, x1, y1, x2, y2, label) {
    ctx.strokeStyle = '#00f2fe';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Midpoint Label
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(midX - 35, midY - 10, 70, 16);
    ctx.strokeStyle = '#00f2fe';
    ctx.lineWidth = 1;
    ctx.strokeRect(midX - 35, midY - 10, 70, 16);

    ctx.fillStyle = '#00f2fe';
    ctx.font = '8px monospace';
    ctx.fillText(label, midX - 28, midY + 1);
  }

  drawSpeechBubble(ctx, x, y, text, accentColor) {
    const textWidth = Math.min(240, text.length * 6.5 + 16);
    const bubbleH = 22;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x, y, textWidth, bubbleH);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, textWidth, bubbleH);

    // Accent line
    ctx.fillStyle = accentColor;
    ctx.fillRect(x + 2, y + 2, 4, bubbleH - 4);

    // Bubble Tail
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(x + 20, y + bubbleH);
    ctx.lineTo(x + 26, y + bubbleH + 6);
    ctx.lineTo(x + 30, y + bubbleH);
    ctx.fill();

    // Text
    ctx.fillStyle = '#0f172a';
    ctx.font = '9px monospace';
    const displayStr = text.length > 32 ? text.substring(0, 30) + '...' : text;
    ctx.fillText(displayStr, x + 10, y + 14);
  }
};
