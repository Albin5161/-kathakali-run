import { CANVAS_WIDTH, CANVAS_HEIGHT, GROUND_Y, DEBUG_HITBOXES, ELEPHANT_TEST_MODE } from '../config.js';
import { STATE }           from './GameState.js';
import { PERFORMER_STATE } from '../entities/Performer.js';

// Ground tile display dimensions.
// Source tile is 1774×887. Displayed at 60 px tall → width = 1774×(60/887) ≈ 120 px.
// The tile is drawn 10 px above GROUND_Y so the grass crown overlaps the scene edge.
const GROUND_TILE_W = 120;
const GROUND_TILE_H =  60;
const GROUND_TILE_Y = GROUND_Y - 10; // y=240: grass crown 10 px above ground line

// Performer sprite display dimensions.
// Hitbox is 40×60. Sprite is drawn larger (64×86) centred on the hitbox,
// with 26 px overhead for the headdress and 12 px overhang on each side for costume.
const SPRITE_RUN_W = 64;
const SPRITE_RUN_H = 86;

export class Renderer {
  constructor(ctx, assets = {}) {
    this._ctx      = ctx;
    this._assets   = assets;
    this._groundX  = 0;  // scrolling offset for the ground tile (px, increases when playing)
  }

  // Called every frame regardless of game state.
  // delta (seconds) and speed (px/s) are used only to advance the ground scroll.
  draw(gameState, performer, obstacles, score, highScore, delta = 0, speed = 0) {
    const ctx = this._ctx;

    // ── Advance ground scroll ─────────────────────────────────────────────────
    if (gameState.state === STATE.PLAYING) {
      this._groundX = (this._groundX + speed * delta) % GROUND_TILE_W;
    }

    // ── Clear ─────────────────────────────────────────────────────────────────
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // ── Background ────────────────────────────────────────────────────────────
    const bgImg = this._assets.background;
    if (bgImg) {
      // Scale to canvas width; centre-crop the height.
      // kerala-background.png is 1672×941 (aspect 1.78:1).
      // Canvas is 800×300 (aspect 2.67:1) — much wider — so the image is
      // scaled to 800 px wide (height becomes ~450 px) and the top/bottom
      // are cropped equally to fit the 300 px canvas.
      const scaledH = Math.round(bgImg.naturalHeight * CANVAS_WIDTH / bgImg.naturalWidth);
      const cropY   = Math.round((scaledH - CANVAS_HEIGHT) / 2);
      ctx.drawImage(bgImg, 0, -cropY, CANVAS_WIDTH, scaledH);
    } else {
      ctx.fillStyle = '#dff0f8';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }

    // ── Ground ────────────────────────────────────────────────────────────────
    const groundImg = this._assets.groundTile;
    if (groundImg) {
      // Tile the ground strip. startX is negative so the first tile is
      // partially off-screen left, creating seamless infinite scroll.
      const startX = -(this._groundX % GROUND_TILE_W);
      for (let x = startX; x < CANVAS_WIDTH; x += GROUND_TILE_W) {
        ctx.drawImage(groundImg, x, GROUND_TILE_Y, GROUND_TILE_W, GROUND_TILE_H);
      }
    } else {
      // Procedural fallback
      ctx.fillStyle = '#c4a96b';
      ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_Y);
      ctx.save();
      ctx.strokeStyle = '#5a3e1b';
      ctx.lineWidth   = 2;
      ctx.beginPath();
      ctx.moveTo(0, GROUND_Y);
      ctx.lineTo(CANVAS_WIDTH, GROUND_Y);
      ctx.stroke();
      ctx.restore();
    }

    // ── Obstacles ─────────────────────────────────────────────────────────────
    this._drawObstacles(ctx, obstacles);

    // ── Performer ─────────────────────────────────────────────────────────────
    this._drawPerformer(ctx, performer);

    // ── UI overlays (always drawn on top; gated by state) ────────────────────
    if (gameState.state === STATE.PLAYING) {
      this._drawHUD(ctx, score, highScore);
    } else if (gameState.state === STATE.IDLE) {
      this._drawStartScreen(ctx, highScore);
    } else if (gameState.state === STATE.GAME_OVER) {
      this._drawGameOverScreen(ctx, score, highScore);
    }
  }

  // ── Performer ───────────────────────────────────────────────────────────────

  _drawPerformer(ctx, performer) {
    ctx.save();

    const hb  = performer.hitbox;
    const cx  = hb.x + hb.width / 2;   // horizontal centre of hitbox
    const bot = hb.y + hb.height;       // bottom of hitbox = GROUND_Y

    if (performer.state === PERFORMER_STATE.DUCKING) {
      // No duck sprite available — procedural fallback always used here.
      this._drawDucking(ctx, cx, bot);
    } else {
      const jumping = performer.state === PERFORMER_STATE.JUMPING;
      const imgKey  = jumping ? 'performerJump' : 'performerRun';
      const img     = this._assets[imgKey];

      if (img) {
        // Centre the sprite on the hitbox horizontally; pin its bottom to GROUND_Y.
        // The extra height above the hitbox (SPRITE_RUN_H − hitbox.height = 26 px)
        // holds the headdress, which is visual-only and does not affect collision.
        ctx.drawImage(
          img,
          cx - SPRITE_RUN_W / 2,
          bot - SPRITE_RUN_H,
          SPRITE_RUN_W,
          SPRITE_RUN_H,
        );
      } else {
        this._drawStanding(ctx, hb.y, cx, bot, jumping);
      }
    }

    if (DEBUG_HITBOXES) {
      ctx.strokeStyle = 'rgba(0, 255, 0, 0.7)';
      ctx.lineWidth   = 1;
      ctx.strokeRect(hb.x, hb.y, hb.width, hb.height);
    }

    ctx.restore();
  }

  // ── Obstacles ───────────────────────────────────────────────────────────────

  _drawObstacles(ctx, obstacles) {
    if (!obstacles || obstacles.length === 0) return;
    ctx.save();

    for (const obs of obstacles) {
      const { id, hitbox, visualWidth, visualHeight, spriteKey } = obs.type;
      const img = this._assets[spriteKey];

      if (id === 'fallen-tree') {
        if (img) {
          // fallen-tree.png has no alpha channel (RGB only). The multiply blend
          // mode makes white pixels transparent: white × any = any.
          // This is the cleanest code-only fix without re-exporting the asset.
          ctx.save();
          ctx.globalCompositeOperation = 'multiply';
          ctx.drawImage(img, obs.x, obs.y, visualWidth, visualHeight);
          ctx.restore();
        } else {
          this._drawCoconutTree(ctx, obs.x, obs.y);
        }

      } else if (id === 'festival-elephant') {
        if (img) {
          ctx.drawImage(img, obs.x, obs.y, visualWidth, visualHeight);
        } else {
          this._drawFestivalElephant(ctx, obs.x, obs.y);
        }

      } else if (id === 'crow') {
        if (img) {
          ctx.drawImage(img, obs.x, obs.y, visualWidth, visualHeight);
        } else {
          this._drawCrow(ctx, obs.x, obs.y);
        }
      }

      if (DEBUG_HITBOXES) {
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.7)';
        ctx.lineWidth   = 1;
        ctx.strokeRect(obs.x + hitbox.offsetX, obs.y + hitbox.offsetY, hitbox.width, hitbox.height);
      }
    }

    ctx.restore();
  }

  // ── Procedural fallback: crow ────────────────────────────────────────────────
  // Used when crow.png fails to load. Visual bounding box: 90×60 px.

  _drawCrow(ctx, ox, oy) {
    ctx.fillStyle = '#1a1a1a';

    // Body
    ctx.beginPath();
    ctx.ellipse(ox + 50, oy + 36, 18, 11, -0.15, 0, Math.PI * 2);
    ctx.fill();

    // Near wing (left, toward performer)
    ctx.beginPath();
    ctx.moveTo(ox + 34, oy + 30);
    ctx.lineTo(ox + 5,  oy + 12);
    ctx.lineTo(ox + 28, oy + 38);
    ctx.closePath();
    ctx.fill();

    // Far wing (right)
    ctx.beginPath();
    ctx.moveTo(ox + 64, oy + 28);
    ctx.lineTo(ox + 88, oy + 14);
    ctx.lineTo(ox + 72, oy + 38);
    ctx.closePath();
    ctx.fill();

    // Head
    ctx.beginPath();
    ctx.arc(ox + 24, oy + 33, 10, 0, Math.PI * 2);
    ctx.fill();

    // Gold hat (Kerala touch on the procedural fallback)
    ctx.fillStyle = '#F1C40F';
    ctx.beginPath();
    ctx.moveTo(ox + 18, oy + 24);
    ctx.lineTo(ox + 24, oy + 14);
    ctx.lineTo(ox + 30, oy + 24);
    ctx.closePath();
    ctx.fill();

    // Beak
    ctx.fillStyle = '#8B8000';
    ctx.beginPath();
    ctx.moveTo(ox + 14, oy + 33);
    ctx.lineTo(ox + 2,  oy + 29);
    ctx.lineTo(ox + 14, oy + 38);
    ctx.closePath();
    ctx.fill();
  }

  // ── Procedural fallback: coconut tree (kept for fallen-tree fallback) ────────

  _drawCoconutTree(ctx, ox, oy) {
    const tcx = ox + 16;

    ctx.strokeStyle = '#7D5A2C';
    ctx.lineWidth   = 9;
    ctx.lineCap     = 'round';
    ctx.beginPath();
    ctx.moveTo(tcx + 1, oy + 60);
    ctx.quadraticCurveTo(tcx + 5, oy + 38, tcx - 2, oy + 22);
    ctx.stroke();

    ctx.strokeStyle = '#A07840';
    ctx.lineWidth   = 3;
    ctx.beginPath();
    ctx.moveTo(tcx - 1, oy + 60);
    ctx.quadraticCurveTo(tcx + 2, oy + 38, tcx - 4, oy + 22);
    ctx.stroke();

    const fx = tcx - 2;
    const fy = oy + 22;

    ctx.strokeStyle = '#388E3C';
    ctx.lineWidth   = 2.5;
    ctx.lineCap     = 'round';

    ctx.beginPath(); ctx.moveTo(fx, fy); ctx.quadraticCurveTo(ox,      oy + 10, ox,      oy + 24); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(fx, fy); ctx.quadraticCurveTo(ox + 5,  oy + 5,  ox + 7,  oy + 16); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(fx, fy); ctx.quadraticCurveTo(fx - 2,  oy + 6,  fx + 2,  oy);      ctx.stroke();
    ctx.beginPath(); ctx.moveTo(fx, fy); ctx.quadraticCurveTo(ox + 24, oy + 6,  ox + 26, oy + 16); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(fx, fy); ctx.quadraticCurveTo(ox + 28, oy + 12, ox + 32, oy + 24); ctx.stroke();

    ctx.fillStyle = '#4E2A04';
    ctx.beginPath(); ctx.arc(fx - 3, fy + 6, 4,   0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(fx + 4, fy + 5, 3.5, 0, Math.PI * 2); ctx.fill();
  }

  // ── Procedural fallback: festival elephant ──────────────────────────────────

  _drawFestivalElephant(ctx, ox, oy) {
    ctx.fillStyle = '#4A4A4A';
    ctx.fillRect(ox + 38, oy + 74, 11, 24);
    ctx.fillRect(ox + 51, oy + 75, 10, 23);

    ctx.fillStyle = '#6E6E6E';
    ctx.beginPath();
    ctx.ellipse(ox + 36, oy + 58, 22, 25, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#4A4A4A';
    ctx.lineWidth   = 3;
    ctx.lineCap     = 'round';
    ctx.beginPath();
    ctx.moveTo(ox + 57, oy + 60);
    ctx.quadraticCurveTo(ox + 63, oy + 68, ox + 58, oy + 78);
    ctx.stroke();

    ctx.fillStyle = '#4A4A4A';
    ctx.fillRect(ox + 7,  oy + 73, 11, 25);
    ctx.fillRect(ox + 21, oy + 74, 10, 24);

    ctx.fillStyle = '#7E7E7E';
    ctx.beginPath();
    ctx.ellipse(ox + 9, oy + 52, 9, 15, -0.25, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#6E6E6E';
    ctx.beginPath();
    ctx.arc(ox + 18, oy + 51, 16, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#4A4A4A';
    ctx.lineWidth   = 7;
    ctx.lineCap     = 'round';
    ctx.beginPath();
    ctx.moveTo(ox + 5,  oy + 60);
    ctx.quadraticCurveTo(ox + 1, oy + 74, ox + 8, oy + 85);
    ctx.stroke();

    ctx.fillStyle = '#C0392B';
    ctx.beginPath();
    ctx.moveTo(ox + 20, oy + 40);
    ctx.lineTo(ox + 58, oy + 36);
    ctx.lineTo(ox + 58, oy + 66);
    ctx.lineTo(ox + 20, oy + 70);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#F1C40F';
    ctx.lineWidth   = 2;
    ctx.stroke();

    ctx.fillStyle = '#F1C40F';
    ctx.beginPath(); ctx.arc(ox + 39, oy + 53, 5,   0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#C0392B';
    ctx.beginPath(); ctx.arc(ox + 39, oy + 53, 2.5, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#F1C40F';
    ctx.beginPath();
    ctx.moveTo(ox + 10, oy + 37);
    ctx.lineTo(ox + 5,  oy + 20);
    ctx.lineTo(ox + 13, oy + 24);
    ctx.lineTo(ox + 18, oy + 12);
    ctx.lineTo(ox + 23, oy + 24);
    ctx.lineTo(ox + 31, oy + 20);
    ctx.lineTo(ox + 26, oy + 37);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#D4AC0D';
    ctx.lineWidth   = 0.8;
    ctx.stroke();

    ctx.fillStyle = '#F1C40F';
    ctx.fillRect(ox + 9, oy + 35, 18, 5);

    ctx.fillStyle = '#E74C3C';
    ctx.beginPath(); ctx.arc(ox + 18, oy + 20, 3, 0, Math.PI * 2); ctx.fill();
  }

  // ── Procedural performer: standing / running / jumping ──────────────────────

  _drawStanding(ctx, top, cx, bot, jumping) {
    ctx.fillStyle = '#E67E22';
    ctx.beginPath();
    ctx.moveTo(cx - 8,  top + 32);
    ctx.lineTo(cx - 24, bot);
    ctx.lineTo(cx + 24, bot);
    ctx.lineTo(cx + 8,  top + 32);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#D4AC0D';
    ctx.fillRect(cx - 24, bot - 6, 48, 6);

    ctx.strokeStyle = '#C0540A';
    ctx.lineWidth   = 1;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(cx + i * 4,  top + 32);
      ctx.lineTo(cx + i * 17, bot - 6);
      ctx.stroke();
    }

    ctx.fillStyle = '#C0392B';
    ctx.fillRect(cx - 6, top + 18, 12, 14);

    ctx.fillStyle = '#F1C40F';
    ctx.fillRect(cx - 6, top + 23, 12, 3);

    const armRootY = top + 23;
    const armTipY  = jumping ? armRootY - 5 : armRootY + 3;

    ctx.strokeStyle = '#96281B';
    ctx.lineWidth   = 3;
    ctx.lineCap     = 'round';

    ctx.beginPath(); ctx.moveTo(cx - 6, armRootY); ctx.lineTo(cx - 17, armTipY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + 6, armRootY); ctx.lineTo(cx + 17, armTipY); ctx.stroke();

    const headCY = top + 10;
    ctx.fillStyle = '#27AE60';
    ctx.beginPath(); ctx.arc(cx, headCY, 8, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#1E8449'; ctx.lineWidth = 1; ctx.stroke();

    ctx.fillStyle = '#ECF0F1';
    ctx.fillRect(cx - 6, headCY - 2, 4, 3);
    ctx.fillRect(cx + 2, headCY - 2, 4, 3);

    ctx.fillStyle = '#1A252F';
    ctx.beginPath();
    ctx.arc(cx - 4, headCY - 1, 1.5, 0, Math.PI * 2);
    ctx.arc(cx + 4, headCY - 1, 1.5, 0, Math.PI * 2);
    ctx.fill();

    const crownBase = top - 1;
    ctx.fillStyle   = '#F1C40F';

    ctx.beginPath(); ctx.moveTo(cx - 4, crownBase); ctx.lineTo(cx, crownBase - 20); ctx.lineTo(cx + 4, crownBase); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(cx - 2, crownBase); ctx.lineTo(cx - 14, crownBase - 12); ctx.lineTo(cx - 7, crownBase - 7); ctx.lineTo(cx - 1, crownBase); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(cx + 2, crownBase); ctx.lineTo(cx + 14, crownBase - 12); ctx.lineTo(cx + 7, crownBase - 7); ctx.lineTo(cx + 1, crownBase); ctx.closePath(); ctx.fill();

    ctx.strokeStyle = '#D4AC0D'; ctx.lineWidth = 0.8; ctx.stroke();
    ctx.fillStyle   = '#E74C3C';
    ctx.beginPath(); ctx.arc(cx, crownBase - 10, 2.5, 0, Math.PI * 2); ctx.fill();
  }

  // ── Procedural performer: ducking ────────────────────────────────────────────

  _drawDucking(ctx, cx, bot) {
    const top = bot - 30;

    ctx.fillStyle = '#E67E22';
    ctx.beginPath();
    ctx.moveTo(cx - 5,  top + 8);
    ctx.lineTo(cx - 32, bot);
    ctx.lineTo(cx + 32, bot);
    ctx.lineTo(cx + 5,  top + 8);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#D4AC0D';
    ctx.fillRect(cx - 32, bot - 6, 64, 6);

    ctx.strokeStyle = '#C0540A';
    ctx.lineWidth   = 1;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(cx + i * 4,  top + 8);
      ctx.lineTo(cx + i * 24, bot - 6);
      ctx.stroke();
    }

    ctx.fillStyle = '#C0392B';
    ctx.fillRect(cx - 5, top + 3, 10, 7);

    const headCX = cx + 5;
    const headCY = top + 5;

    ctx.fillStyle = '#27AE60';
    ctx.beginPath(); ctx.arc(headCX, headCY, 7, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#1E8449'; ctx.lineWidth = 1; ctx.stroke();

    ctx.fillStyle = '#ECF0F1';
    ctx.fillRect(headCX + 1, headCY - 2, 4, 3);

    ctx.fillStyle = '#1A252F';
    ctx.beginPath(); ctx.arc(headCX + 3, headCY - 1, 1.5, 0, Math.PI * 2); ctx.fill();
  }

  // ── UI overlays ─────────────────────────────────────────────────────────────

  _drawHUD(ctx, score, highScore) {
    ctx.save();
    ctx.font         = 'bold 16px monospace';
    ctx.textBaseline = 'top';

    // Legible on any background: white text with dark shadow
    ctx.shadowColor   = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur    = 4;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
    ctx.fillStyle     = '#ffffff';

    ctx.textAlign = 'left';
    if (ELEPHANT_TEST_MODE) {
      ctx.fillStyle = '#E74C3C';
      ctx.fillText('ELEPHANT TEST MODE', 16, 12);
      ctx.fillStyle = '#ffffff';
    } else {
      ctx.fillText(`HI  ${fmt(highScore)}`, 16, 12);
    }

    ctx.textAlign = 'right';
    ctx.fillText(fmt(score), CANVAS_WIDTH - 16, 12);

    ctx.restore();
  }

  _drawStartScreen(ctx, highScore) {
    ctx.save();

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = '#fff';
    ctx.font      = 'bold 30px monospace';
    ctx.fillText('KATHAKALI RUN', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 36);

    if (highScore > 0) {
      ctx.font      = '13px monospace';
      ctx.fillStyle = '#F1C40F';
      ctx.fillText(`BEST  ${fmt(highScore)}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 10);
    }

    ctx.font      = '14px monospace';
    ctx.fillStyle = '#fff';
    ctx.fillText('Press Space or Enter to start', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 14);

    ctx.fillStyle = '#ccc';
    ctx.font      = '12px monospace';
    ctx.fillText('↑ / Space — Jump     ↓ — Duck', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 36);

    ctx.restore();
  }

  _drawGameOverScreen(ctx, score, highScore) {
    ctx.save();

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    const mid = CANVAS_HEIGHT / 2;

    ctx.fillStyle = '#fff';
    ctx.font      = 'bold 30px monospace';
    ctx.fillText('GAME OVER', CANVAS_WIDTH / 2, mid - 34);

    ctx.font = '15px monospace';
    ctx.fillText(`SCORE  ${fmt(score)}`, CANVAS_WIDTH / 2, mid - 4);

    const isNewBest = Math.floor(score) >= highScore && highScore > 0;
    ctx.fillStyle = isNewBest ? '#F1C40F' : '#ccc';
    ctx.fillText(
      isNewBest ? `NEW BEST!  ${fmt(highScore)}` : `HI  ${fmt(highScore)}`,
      CANVAS_WIDTH / 2,
      mid + 20,
    );

    ctx.fillStyle = '#fff';
    ctx.font      = '13px monospace';
    ctx.fillText('Press Space or Enter to restart', CANVAS_WIDTH / 2, mid + 46);

    ctx.restore();
  }
}

function fmt(n) {
  return String(Math.floor(n)).padStart(5, '0');
}
