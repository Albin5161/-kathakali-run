import { CANVAS_WIDTH, CANVAS_HEIGHT, GROUND_Y, DEBUG_HITBOXES, ELEPHANT_TEST_MODE } from '../config.js';
import { STATE }           from './GameState.js';
import { PERFORMER_STATE } from '../entities/Performer.js';

export class Renderer {
  constructor(ctx) {
    this._ctx = ctx;
  }

  // Called every frame regardless of game state. All coordinates are logical pixels.
  // score / highScore are plain numbers passed in from ScoreManager.
  draw(gameState, performer, obstacles, score, highScore) {
    const ctx = this._ctx;

    // ── Clear ─────────────────────────────────────────────────────────────────
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // ── Sky ───────────────────────────────────────────────────────────────────
    ctx.fillStyle = '#dff0f8';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // ── Ground fill (below the line) ──────────────────────────────────────────
    ctx.fillStyle = '#c4a96b';
    ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_Y);

    // ── Ground line ───────────────────────────────────────────────────────────
    ctx.save();
    ctx.strokeStyle = '#5a3e1b';
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(CANVAS_WIDTH, GROUND_Y);
    ctx.stroke();
    ctx.restore();

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
    const cx  = hb.x + hb.width / 2;  // horizontal centre of hitbox
    const bot = hb.y + hb.height;      // bottom of hitbox = GROUND_Y

    if (performer.state === PERFORMER_STATE.DUCKING) {
      this._drawDucking(ctx, cx, bot);
    } else {
      const jumping = performer.state === PERFORMER_STATE.JUMPING;
      this._drawStanding(ctx, hb.y, cx, bot, jumping);
    }

    // Debug: outline the performer hitbox in green
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
      if (obs.type.id === 'coconut-tree') {
        this._drawCoconutTree(ctx, obs.x, obs.y);
      } else if (obs.type.id === 'festival-elephant') {
        this._drawFestivalElephant(ctx, obs.x, obs.y);
      }

      // Debug: outline the obstacle hitbox in red
      if (DEBUG_HITBOXES) {
        const h = obs.type.hitbox;
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.7)';
        ctx.lineWidth   = 1;
        ctx.strokeRect(obs.x + h.offsetX, obs.y + h.offsetY, h.width, h.height);
      }
    }

    ctx.restore();
  }

  // Procedural coconut palm tree (visual bounding box: 32 × 60 logical pixels).
  // ox, oy = top-left of the visual box; bottom edge sits on GROUND_Y.
  _drawCoconutTree(ctx, ox, oy) {
    const tcx = ox + 16; // trunk horizontal centre

    // ── Trunk ─────────────────────────────────────────────────────────────────
    // Slight rightward lean via a quadratic bezier for organic feel
    ctx.strokeStyle = '#7D5A2C';
    ctx.lineWidth   = 9;
    ctx.lineCap     = 'round';
    ctx.beginPath();
    ctx.moveTo(tcx + 1, oy + 60);                           // base (= GROUND_Y)
    ctx.quadraticCurveTo(tcx + 5, oy + 38, tcx - 2, oy + 22); // slight lean
    ctx.stroke();

    // Lighter highlight stripe on trunk
    ctx.strokeStyle = '#A07840';
    ctx.lineWidth   = 3;
    ctx.beginPath();
    ctx.moveTo(tcx - 1, oy + 60);
    ctx.quadraticCurveTo(tcx + 2, oy + 38, tcx - 4, oy + 22);
    ctx.stroke();

    // ── Palm fronds ───────────────────────────────────────────────────────────
    // Five quadratic-bezier strokes radiating from the trunk crown
    const fx = tcx - 2; // frond base x
    const fy = oy + 22; // frond base y

    ctx.strokeStyle = '#388E3C';
    ctx.lineWidth   = 2.5;
    ctx.lineCap     = 'round';

    // Far-left droop
    ctx.beginPath();
    ctx.moveTo(fx, fy);
    ctx.quadraticCurveTo(ox,      oy + 10, ox,      oy + 24);
    ctx.stroke();

    // Mid-left
    ctx.beginPath();
    ctx.moveTo(fx, fy);
    ctx.quadraticCurveTo(ox + 5,  oy + 5,  ox + 7,  oy + 16);
    ctx.stroke();

    // Upward centre frond
    ctx.beginPath();
    ctx.moveTo(fx, fy);
    ctx.quadraticCurveTo(fx - 2,  oy + 6,  fx + 2,  oy);
    ctx.stroke();

    // Mid-right
    ctx.beginPath();
    ctx.moveTo(fx, fy);
    ctx.quadraticCurveTo(ox + 24, oy + 6,  ox + 26, oy + 16);
    ctx.stroke();

    // Far-right droop
    ctx.beginPath();
    ctx.moveTo(fx, fy);
    ctx.quadraticCurveTo(ox + 28, oy + 12, ox + 32, oy + 24);
    ctx.stroke();

    // ── Coconuts ──────────────────────────────────────────────────────────────
    // Two dark-brown circles nestled at the frond base
    ctx.fillStyle = '#4E2A04';
    ctx.beginPath();
    ctx.arc(fx - 3, fy + 6, 4,   0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(fx + 4, fy + 5, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Procedural festival elephant (visual bounding box: 60 × 100 logical pixels).
  // Elephant faces left (toward the performer). Hitbox covers the upper body
  // and caparison (oy+5 to oy+68); legs below oy+68 are rendered but collision-free.
  _drawFestivalElephant(ctx, ox, oy) {
    // ── Rear legs ─────────────────────────────────────────────────────────────
    ctx.fillStyle = '#4A4A4A';
    ctx.fillRect(ox + 38, oy + 74, 11, 24);
    ctx.fillRect(ox + 51, oy + 75, 10, 23);

    // ── Body ──────────────────────────────────────────────────────────────────
    ctx.fillStyle = '#6E6E6E';
    ctx.beginPath();
    ctx.ellipse(ox + 36, oy + 58, 22, 25, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── Tail ──────────────────────────────────────────────────────────────────
    ctx.strokeStyle = '#4A4A4A';
    ctx.lineWidth   = 3;
    ctx.lineCap     = 'round';
    ctx.beginPath();
    ctx.moveTo(ox + 57, oy + 60);
    ctx.quadraticCurveTo(ox + 63, oy + 68, ox + 58, oy + 78);
    ctx.stroke();

    // ── Front legs ────────────────────────────────────────────────────────────
    ctx.fillStyle = '#4A4A4A';
    ctx.fillRect(ox + 7,  oy + 73, 11, 25);
    ctx.fillRect(ox + 21, oy + 74, 10, 24);

    // ── Ear ───────────────────────────────────────────────────────────────────
    ctx.fillStyle = '#7E7E7E';
    ctx.beginPath();
    ctx.ellipse(ox + 9, oy + 52, 9, 15, -0.25, 0, Math.PI * 2);
    ctx.fill();

    // ── Head ──────────────────────────────────────────────────────────────────
    ctx.fillStyle = '#6E6E6E';
    ctx.beginPath();
    ctx.arc(ox + 18, oy + 51, 16, 0, Math.PI * 2);
    ctx.fill();

    // ── Trunk ─────────────────────────────────────────────────────────────────
    ctx.strokeStyle = '#4A4A4A';
    ctx.lineWidth   = 7;
    ctx.lineCap     = 'round';
    ctx.beginPath();
    ctx.moveTo(ox + 5,  oy + 60);
    ctx.quadraticCurveTo(ox + 1, oy + 74, ox + 8, oy + 85);
    ctx.stroke();

    // ── Caparison (red festive cloth draped over the back) ────────────────────
    ctx.fillStyle = '#C0392B';
    ctx.beginPath();
    ctx.moveTo(ox + 20, oy + 40);   // front-top
    ctx.lineTo(ox + 58, oy + 36);   // back-top
    ctx.lineTo(ox + 58, oy + 66);   // back-bottom
    ctx.lineTo(ox + 20, oy + 70);   // front-bottom
    ctx.closePath();
    ctx.fill();

    // Gold border trim
    ctx.strokeStyle = '#F1C40F';
    ctx.lineWidth   = 2;
    ctx.stroke();

    // Central caparison ornament
    ctx.fillStyle = '#F1C40F';
    ctx.beginPath();
    ctx.arc(ox + 39, oy + 53, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#C0392B';
    ctx.beginPath();
    ctx.arc(ox + 39, oy + 53, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // ── Nettipattam (gold head ornament — the tallest part of the obstacle) ───
    // This fan extends above the head up to ~oy+12, well within the hitbox zone.
    ctx.fillStyle = '#F1C40F';
    ctx.beginPath();
    ctx.moveTo(ox + 10, oy + 37);   // left base
    ctx.lineTo(ox + 5,  oy + 20);   // outer-left spike
    ctx.lineTo(ox + 13, oy + 24);   // inner-left
    ctx.lineTo(ox + 18, oy + 12);   // top-centre spike (highest point)
    ctx.lineTo(ox + 23, oy + 24);   // inner-right
    ctx.lineTo(ox + 31, oy + 20);   // outer-right spike
    ctx.lineTo(ox + 26, oy + 37);   // right base
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#D4AC0D';
    ctx.lineWidth   = 0.8;
    ctx.stroke();

    // Forehead base band
    ctx.fillStyle = '#F1C40F';
    ctx.fillRect(ox + 9, oy + 35, 18, 5);

    // Crown jewel
    ctx.fillStyle = '#E74C3C';
    ctx.beginPath();
    ctx.arc(ox + 18, oy + 20, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Upright silhouette shared by RUNNING and JUMPING.
  // `jumping` nudges the arms upward for a subtle mid-air cue.
  // Decorative shapes (headdress, skirt hem) extend just beyond the hitbox
  // boundaries — they are visual only and do not affect collision.
  _drawStanding(ctx, top, cx, bot, jumping) {
    // ── Costume skirt ─────────────────────────────────────────────────────────
    // Trapezoid: narrow at waist (y+32), wide at hem (y+60 = bot).
    // Hem overhangs the hitbox by ±4 px — purely decorative.
    ctx.fillStyle = '#E67E22';
    ctx.beginPath();
    ctx.moveTo(cx - 8,  top + 32);
    ctx.lineTo(cx - 24, bot);
    ctx.lineTo(cx + 24, bot);
    ctx.lineTo(cx + 8,  top + 32);
    ctx.closePath();
    ctx.fill();

    // Gold hem band
    ctx.fillStyle = '#D4AC0D';
    ctx.fillRect(cx - 24, bot - 6, 48, 6);

    // Vertical pleat lines
    ctx.strokeStyle = '#C0540A';
    ctx.lineWidth   = 1;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(cx + i * 4,  top + 32);
      ctx.lineTo(cx + i * 17, bot - 6);
      ctx.stroke();
    }

    // ── Torso ─────────────────────────────────────────────────────────────────
    ctx.fillStyle = '#C0392B';
    ctx.fillRect(cx - 6, top + 18, 12, 14);

    // Gold sash across torso
    ctx.fillStyle = '#F1C40F';
    ctx.fillRect(cx - 6, top + 23, 12, 3);

    // ── Arms ──────────────────────────────────────────────────────────────────
    const armRootY = top + 23;
    const armTipY  = jumping ? armRootY - 5 : armRootY + 3;

    ctx.strokeStyle = '#96281B';
    ctx.lineWidth   = 3;
    ctx.lineCap     = 'round';

    ctx.beginPath();
    ctx.moveTo(cx - 6, armRootY);
    ctx.lineTo(cx - 17, armTipY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx + 6, armRootY);
    ctx.lineTo(cx + 17, armTipY);
    ctx.stroke();

    // ── Head ──────────────────────────────────────────────────────────────────
    const headCY = top + 10;

    ctx.fillStyle = '#27AE60';        // traditional Kathakali green make-up
    ctx.beginPath();
    ctx.arc(cx, headCY, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#1E8449';
    ctx.lineWidth   = 1;
    ctx.stroke();

    // Wide stylised eyes
    ctx.fillStyle = '#ECF0F1';
    ctx.fillRect(cx - 6, headCY - 2, 4, 3);
    ctx.fillRect(cx + 2, headCY - 2, 4, 3);

    ctx.fillStyle = '#1A252F';
    ctx.beginPath();
    ctx.arc(cx - 4, headCY - 1, 1.5, 0, Math.PI * 2);
    ctx.arc(cx + 4, headCY - 1, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // ── Headdress (Kireedam) — extends above the hitbox ───────────────────────
    // Purely visual; does not widen the collision area.
    const crownBase = top - 1;

    ctx.fillStyle = '#F1C40F';

    // Central spire
    ctx.beginPath();
    ctx.moveTo(cx - 4, crownBase);
    ctx.lineTo(cx,     crownBase - 20);
    ctx.lineTo(cx + 4, crownBase);
    ctx.closePath();
    ctx.fill();

    // Left wing
    ctx.beginPath();
    ctx.moveTo(cx - 2,  crownBase);
    ctx.lineTo(cx - 14, crownBase - 12);
    ctx.lineTo(cx - 7,  crownBase - 7);
    ctx.lineTo(cx - 1,  crownBase);
    ctx.closePath();
    ctx.fill();

    // Right wing
    ctx.beginPath();
    ctx.moveTo(cx + 2,  crownBase);
    ctx.lineTo(cx + 14, crownBase - 12);
    ctx.lineTo(cx + 7,  crownBase - 7);
    ctx.lineTo(cx + 1,  crownBase);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#D4AC0D';
    ctx.lineWidth   = 0.8;
    ctx.stroke();

    // Crown jewel
    ctx.fillStyle = '#E74C3C';
    ctx.beginPath();
    ctx.arc(cx, crownBase - 10, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Crouching silhouette for DUCKING.
  // Hitbox is 40 × 30; bottom still sits on GROUND_Y.
  // The wide-spread skirt is the most visually distinct Kathakali element
  // and reads clearly even at this compressed height.
  _drawDucking(ctx, cx, bot) {
    const top = bot - 30;   // hb.y when ducking

    // Skirt spreads wider when crouching
    ctx.fillStyle = '#E67E22';
    ctx.beginPath();
    ctx.moveTo(cx - 5,  top + 8);
    ctx.lineTo(cx - 32, bot);
    ctx.lineTo(cx + 32, bot);
    ctx.lineTo(cx + 5,  top + 8);
    ctx.closePath();
    ctx.fill();

    // Gold hem band
    ctx.fillStyle = '#D4AC0D';
    ctx.fillRect(cx - 32, bot - 6, 64, 6);

    // Pleat lines
    ctx.strokeStyle = '#C0540A';
    ctx.lineWidth   = 1;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(cx + i * 4,  top + 8);
      ctx.lineTo(cx + i * 24, bot - 6);
      ctx.stroke();
    }

    // Compressed torso
    ctx.fillStyle = '#C0392B';
    ctx.fillRect(cx - 5, top + 3, 10, 7);

    // Head pushed forward and low
    const headCX = cx + 5;
    const headCY = top + 5;

    ctx.fillStyle = '#27AE60';
    ctx.beginPath();
    ctx.arc(headCX, headCY, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#1E8449';
    ctx.lineWidth   = 1;
    ctx.stroke();

    // Single visible eye (face turned forward)
    ctx.fillStyle = '#ECF0F1';
    ctx.fillRect(headCX + 1, headCY - 2, 4, 3);

    ctx.fillStyle = '#1A252F';
    ctx.beginPath();
    ctx.arc(headCX + 3, headCY - 1, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── UI overlays ─────────────────────────────────────────────────────────────

  // Live score display shown only during PLAYING.
  // Layout mirrors classic endless runners: HI on the left, score on the right.
  _drawHUD(ctx, score, highScore) {
    ctx.save();

    ctx.font         = 'bold 16px monospace';
    ctx.textBaseline = 'top';
    ctx.fillStyle    = '#2c3e50';

    // Top-left: test mode label or high score
    ctx.textAlign = 'left';
    if (ELEPHANT_TEST_MODE) {
      ctx.fillStyle = '#E74C3C';
      ctx.fillText('ELEPHANT TEST MODE', 16, 12);
      ctx.fillStyle = '#2c3e50';
    } else {
      ctx.fillText(`HI  ${fmt(highScore)}`, 16, 12);
    }

    // Current score — top-right
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

    // Show personal best if one exists
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

    // Score row
    ctx.font = '15px monospace';
    ctx.fillText(`SCORE  ${fmt(score)}`, CANVAS_WIDTH / 2, mid - 4);

    // High score row — gold if this run set a new best
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

// Zero-pad score to 5 digits for a consistent display width.
function fmt(n) {
  return String(Math.floor(n)).padStart(5, '0');
}
