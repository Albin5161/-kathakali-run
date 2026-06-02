# Kathakali Run

A browser-based endless runner celebrating Kerala culture. Inspired by the Chrome Dinosaur Game, featuring a Kathakali performer dodging culturally-themed obstacles across Kerala landscapes.

---

## Running the project

This project uses ES modules. Browsers block `import` statements when a page is opened directly via `file://` due to CORS restrictions. **You must serve the project from a local HTTP server.**

### Option 1 — Python (no install required)

```bash
cd kathakali-run
python3 -m http.server 8080
```

Open: **http://localhost:8080**

### Option 2 — Node.js (npx, no install required)

```bash
cd kathakali-run
npx serve .
```

### Option 3 — VS Code Live Server

Install the **Live Server** extension, right-click `index.html` in the Explorer panel, and choose **Open with Live Server**.

---

## Controls

| Action           | Key                  |
|------------------|----------------------|
| Start / Restart  | `Space` or `Enter`   |
| Jump             | `↑` Arrow or `Space` |
| Duck (hold)      | `↓` Arrow            |

---

## Project status

| Phase | Tasks      | Status      |
|-------|-----------|-------------|
| 1     | TASK-01 to TASK-07 | In progress |
| 2     | Obstacles & Collision | Not started |
| 3     | Scoring & Difficulty  | Not started |
| 4     | Art & Environments    | Not started |
| 5     | Polish & NFR          | Not started |
| 6     | Audio (v1.1)          | Not started |
| 7     | Gesture Controls (v2) | Not started |

See `docs/tasks.md` for the full task breakdown and `docs/architecture.md` for system design.

---

## Project structure

```
kathakali-run/
├── index.html          # HTML shell — canvas + module entry point
├── src/
│   ├── main.js         # Wiring: creates all objects, starts the loop
│   ├── config.js       # All tunable constants (speeds in px/s, hitboxes, keys)
│   ├── core/
│   │   ├── GameLoop.js     # requestAnimationFrame driver
│   │   ├── GameState.js    # FSM: IDLE → PLAYING → GAME_OVER
│   │   └── Renderer.js     # Canvas draw calls
│   ├── entities/
│   │   └── Performer.js    # Character physics & hitbox
│   └── input/
│       ├── InputBus.js     # Normalised action event emitter
│       └── KeyboardInput.js# Keyboard → InputBus adapter
└── data/
    ├── obstacles.js    # Obstacle definitions (Phase 2)
    └── environments.js # Environment definitions (Phase 4)
```
