// Preloads all game images before the first frame is drawn.
// Returns a plain object keyed by asset name; value is a loaded HTMLImageElement
// or null if the load failed (callers fall back to procedural drawing).

const MANIFEST = {
  background:    'assets/background/kerala-background.png',
  groundTile:    'assets/ground/ground-tile.png',
  performerRun:  'assets/characters/kathakali-run.png',
  performerJump: 'assets/characters/kathakali-jump.png',
  fallenTree:    'assets/obstacles/fallen-tree.png',
  elephant:      'assets/obstacles/elephant.png',
  crow:          'assets/obstacles/crow.png',
};

export async function loadAssets() {
  const entries = await Promise.all(
    Object.entries(MANIFEST).map(([key, src]) =>
      new Promise(resolve => {
        const img    = new Image();
        img.onload   = () => resolve([key, img]);
        img.onerror  = () => {
          console.warn(`[AssetLoader] Failed to load "${src}" — procedural fallback active`);
          resolve([key, null]);
        };
        img.src = src;
      }),
    ),
  );
  const assets = Object.fromEntries(entries);
  const loaded = entries.filter(([, img]) => img !== null).length;
  console.log(`[AssetLoader] ${loaded}/${entries.length} assets loaded`);
  return assets;
}
