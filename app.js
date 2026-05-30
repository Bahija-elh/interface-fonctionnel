// ════════════════════════════════════════════
// CONFIG
// ════════════════════════════════════════════
const PALETTES = {
  normal:  { bg: '#7F77DD', border: '#534AB7', txt: '#fff'     },
  compare: { bg: '#FCEBEB', border: '#E24B4A', txt: '#791F1F'  },
  swap:    { bg: '#FAEEDA', border: '#EF9F27', txt: '#633806'  },
  sorted:  { bg: '#E1F5EE', border: '#1D9E75', txt: '#085041'  },
  pivot:   { bg: '#FAEEDA', border: '#EF9F27', txt: '#633806'  }
};
const DELAYS = [1200, 600, 250, 80, 20]; // ms par niveau de vitesse
const INFOS  = {
  bubble:    'Bubble Sort — compare les paires adjacentes. O(n²)',
  selection: 'Selection Sort — cherche le minimum à chaque tour. O(n²)',
  insertion: 'Insertion Sort — insère chaque élément à sa place. O(n²)',
  quick:     'Quick Sort — divise autour d\'un pivot. O(n log n) moy.',
  merge:     'Merge Sort — divise, trie, fusionne. O(n log n) garanti'
};

// ════════════════════════════════════════════
// VARIABLES GLOBALES
// ════════════════════════════════════════════
let arr = [];
let steps = [], stepIdx = 0, timer = null;
let comps = 0, swps = 0;
let currentAlgo = 'bubble';
let circles = [];         // tableau des <div> cercles DOM
let logicToCircle = [];   // logicToCircle[i] = index du cercle DOM qui est à la position i
let R = 36, COLS = 0, arenaW = 0;

const arena = document.getElementById('arena');

// ════════════════════════════════════════════
// INITIALISATION
// ════════════════════════════════════════════
function init() {
  stopSort();
  const n = parseInt(document.getElementById('sz').value);

  // Créer un tableau de n nombres aléatoires
  arr = Array.from({ length: n }, () => Math.floor(Math.random() * 89) + 10);

  buildLayout(n);   // calculer rayon et colonnes
  buildCircles(n);  // créer les <div> dans l'arena
  positionAll(true);// placer instantanément
  setAllState('normal');

  comps = swps = stepIdx = 0;
  updateStats();
  document.getElementById('st').textContent = 'En attente';
  document.getElementById('info').textContent = INFOS[currentAlgo];
}

function onSz(v) {
  document.getElementById('szV').textContent = v;
  init();
}

function setAlgo(name, btn) {
  currentAlgo = name;
  document.querySelectorAll('.algo-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  init();
}

// ════════════════════════════════════════════
// LAYOUT : calcul de la grille
// ════════════════════════════════════════════
function buildLayout(n) {
  arenaW = arena.clientWidth || 640;
  R = Math.max(20, Math.min(40, Math.floor((arenaW - 24) / (n * 2.4))));
  COLS = Math.floor((arenaW - 16) / (R * 2 + 10));
  const rows = Math.ceil(n / COLS);
  arena.style.height = (rows * (R * 2 + 14) + 24) + 'px';
}

// Retourne {x, y} = centre du cercle à la position logique i
function gridPos(i) {
  const gap    = R * 2 + 10;
  const cols   = Math.min(arr.length, COLS);
  const totalW = cols * gap - 10;
  const startX = (arenaW - totalW) / 2 + R;
  return {
    x: startX + (i % COLS) * gap,
    y: 16 + R + Math.floor(i / COLS) * (R * 2 + 14)
  };
}

// ════════════════════════════════════════════
// CRÉATION DES CERCLES DOM
// ════════════════════════════════════════════
function buildCircles(n) {
  arena.innerHTML = '';  // vider l'arena
  circles = [];
  logicToCircle = Array.from({ length: n }, (_, i) => i);
  // Au départ : le cercle i est à la position i

  for (let i = 0; i < n; i++) {
    const div = document.createElement('div');
    div.style.cssText = `
      position: absolute;
      width: ${R * 2}px;
      height: ${R * 2}px;
      border-radius: 50%;
      border: 2.5px solid #534AB7;
      background: #7F77DD;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: ${R > 30 ? 14 : 12}px;
      font-weight: 500;
      font-family: 'Segoe UI', sans-serif;
      user-select: none;
    `;
    div.innerHTML = `<span>${arr[i]}</span>`;
    arena.appendChild(div);
    circles.push(div);
  }
}

// Placer un cercle DOM à (x, y) avec ou sans animation
function placeCircle(circleIdx, x, y, instant, dur) {
  const c = circles[circleIdx];
  if (!c) return;
  const d = dur || (instant ? 0 : getDelay() * 0.85);
  c.style.transition = `left ${d}ms cubic-bezier(.4,0,.2,1), top ${d}ms cubic-bezier(.4,0,.2,1)`;
  c.style.left = (x - R) + 'px';
  c.style.top  = (y - R) + 'px';
}

function positionAll(instant) {
  for (let i = 0; i < arr.length; i++) {
    const p = gridPos(i);
    placeCircle(i, p.x, p.y, instant);
  }
}

// Changer la couleur d'un cercle DOM
function setCircleState(circleIdx, state) {
  const c = circles[circleIdx];
  if (!c) return;
  const pal = PALETTES[state] || PALETTES.normal;
  c.style.background   = pal.bg;
  c.style.borderColor  = pal.border;
  c.style.color        = pal.txt;
  c.style.zIndex       = (state === 'compare' || state === 'swap') ? '10' : '1';
}

function setAllState(state) {
  circles.forEach((_, i) => setCircleState(i, state));
}

// ════════════════════════════════════════════
// GÉNÉRATION DES STEPS
// Un step = une action enregistrée pendant le tri
// ════════════════════════════════════════════
function rec(type, i, j, a, ss) {
  steps.push({ type, i, j, arr: [...a], ss: [...(ss || [])] });
}

function bubbleSort() {
  const a = [...arr], n = a.length, ss = [];
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < n - i - 1; j++) {
      rec('compare', j, j + 1, a, ss);
      if (a[j] > a[j + 1]) {
        [a[j], a[j + 1]] = [a[j + 1], a[j]];
        rec('swap', j, j + 1, a, ss);
      }
    }
    ss.push(n - 1 - i);
  }
  ss.push(0);
  rec('done', -1, -1, a, Array.from({ length: n }, (_, k) => k));
}

function selectionSort() {
  const a = [...arr], n = a.length, ss = [];
  for (let i = 0; i < n - 1; i++) {
    let m = i;
    for (let j = i + 1; j < n; j++) {
      rec('compare', m, j, a, ss);
      if (a[j] < a[m]) m = j;
    }
    if (m !== i) { [a[i], a[m]] = [a[m], a[i]]; rec('swap', i, m, a, ss); }
    ss.push(i);
  }
  ss.push(n - 1);
  rec('done', -1, -1, a, Array.from({ length: n }, (_, k) => k));
}

function insertionSort() {
  const a = [...arr], n = a.length, ss = [0];
  for (let i = 1; i < n; i++) {
    let j = i;
    while (j > 0) {
      rec('compare', j - 1, j, a, ss);
      if (a[j - 1] > a[j]) {
        [a[j - 1], a[j]] = [a[j], a[j - 1]];
        rec('swap', j - 1, j, a, ss);
        j--;
      } else break;
    }
    ss.push(i);
  }
  rec('done', -1, -1, a, Array.from({ length: n }, (_, k) => k));
}

function quickSort() {
  const a = [...arr], ss = [];
  function qs(lo, hi) {
    if (lo >= hi) { if (lo === hi) ss.push(lo); return; }
    let p = hi, i = lo - 1;
    rec('pivot', p, -1, a, ss);
    for (let j = lo; j < hi; j++) {
      rec('compare', j, p, a, ss);
      if (a[j] <= a[p]) { i++; if (i !== j) { [a[i], a[j]] = [a[j], a[i]]; rec('swap', i, j, a, ss); } }
    }
    i++; if (i !== p) { [a[i], a[p]] = [a[p], a[i]]; rec('swap', i, p, a, ss); }
    ss.push(i);
    qs(lo, i - 1); qs(i + 1, hi);
  }
  qs(0, a.length - 1);
  rec('done', -1, -1, a, Array.from({ length: a.length }, (_, k) => k));
}

function mergeSort() {
  const a = [...arr], ss = [];
  function ms(lo, hi) {
    if (lo >= hi) return;
    let mid = Math.floor((lo + hi) / 2);
    ms(lo, mid);
    ms(mid + 1, hi);
    let i = lo, j = mid + 1;
    while (i <= mid && j <= hi) {
      rec('compare', i, j, a, ss);
      if (a[i] <= a[j]) {
        i++;
      } else {
        // Amener a[j] à la position i par swaps successifs (déplacement réel)
        for (let k = j; k > i; k--) {
          [a[k], a[k - 1]] = [a[k - 1], a[k]];
          rec('swap', k, k - 1, a, ss);
        }
        i++;
        mid++;
        j++;
      }
    }
    for (let k = lo; k <= hi; k++) if (!ss.includes(k)) ss.push(k);
  }
  ms(0, a.length - 1);
  rec('done', -1, -1, a, Array.from({ length: a.length }, (_, k) => k));
}

// ════════════════════════════════════════════
// MOTEUR D'ANIMATION
// ════════════════════════════════════════════
function startSort() {
  if (timer) return;
  steps = []; stepIdx = 0; comps = swps = 0;

  // Remettre chaque cercle DOM à sa position de départ
  logicToCircle = Array.from({ length: arr.length }, (_, i) => i);
  positionAll(true);
  setAllState('normal');

  // Générer tous les steps
  if      (currentAlgo === 'bubble')    bubbleSort();
  else if (currentAlgo === 'selection') selectionSort();
  else if (currentAlgo === 'insertion') insertionSort();
  else if (currentAlgo === 'quick')     quickSort();
  else                                  mergeSort();

  document.getElementById('startBtn').disabled = true;
  document.getElementById('stopBtn').disabled  = false;
  document.getElementById('st').textContent = 'En cours...';
  runStep();
}

function getDelay() {
  return DELAYS[parseInt(document.getElementById('spd').value) - 1];
}

function runStep() {
  if (stepIdx >= steps.length) { finish(); return; }
  const s     = steps[stepIdx++];
  const delay = getDelay();

  // 1. Réinitialiser les couleurs (sauf triés)
  logicToCircle.forEach(ci => setCircleState(ci, 'normal'));
  if (s.ss) s.ss.forEach(pos => {
    if (pos >= 0 && pos < logicToCircle.length)
      setCircleState(logicToCircle[pos], 'sorted');
  });

  // 2. Appliquer l'action du step
  if (s.type === 'compare') {
    comps++;
    setCircleState(logicToCircle[s.i], 'compare');
    setCircleState(logicToCircle[s.j], 'compare');

  } else if (s.type === 'swap' && s.j >= 0 && s.i !== s.j) {
    // ── ANIMATION DE SWAP : les cercles se croisent en arc ──
    swps++;
    const ciA = logicToCircle[s.i];   // cercle DOM qui est à la position i
    const ciB = logicToCircle[s.j];   // cercle DOM qui est à la position j
    const posA = gridPos(s.i);
    const posB = gridPos(s.j);
    const arc  = R * 2.2;             // hauteur de l'arc de croisement
    const ph   = delay * 0.38;        // durée de chaque phase

    setCircleState(ciA, 'swap');
    setCircleState(ciB, 'swap');

    // Phase 1 : A monte, B descend
    circles[ciA].style.transition = `left ${ph}ms ease, top ${ph}ms ease`;
    circles[ciB].style.transition = `left ${ph}ms ease, top ${ph}ms ease`;
    circles[ciA].style.top  = (posA.y - R - arc) + 'px';
    circles[ciB].style.top  = (posB.y - R + arc) + 'px';

    // Phase 2 : déplacement horizontal
    setTimeout(() => {
      circles[ciA].style.transition = `left ${ph}ms ease, top ${ph}ms ease`;
      circles[ciB].style.transition = `left ${ph}ms ease, top ${ph}ms ease`;
      circles[ciA].style.left = (posB.x - R) + 'px';
      circles[ciB].style.left = (posA.x - R) + 'px';
    }, ph);

    // Phase 3 : A descend à la place de B, B monte à la place de A
    setTimeout(() => {
      circles[ciA].style.transition = `left ${ph}ms ease, top ${ph}ms ease`;
      circles[ciB].style.transition = `left ${ph}ms ease, top ${ph}ms ease`;
      circles[ciA].style.top = (posB.y - R) + 'px';
      circles[ciB].style.top = (posA.y - R) + 'px';
      // Mettre à jour le mapping logique ↔ DOM
      logicToCircle[s.i] = ciB;
      logicToCircle[s.j] = ciA;
    }, ph * 2);

  } else if (s.type === 'pivot') {
    setCircleState(logicToCircle[s.i], 'pivot');
  }

  updateStats();
  timer = setTimeout(runStep, delay);
}

function finish() {
  timer = null;
  setAllState('sorted');
  document.getElementById('startBtn').disabled = false;
  document.getElementById('stopBtn').disabled  = true;
  document.getElementById('st').textContent = 'Terminé ✓';
  document.getElementById('info').textContent =
    `Terminé — ${comps} comparaisons, ${swps} échanges.`;
}

function stopSort() {
  if (timer) { clearTimeout(timer); timer = null; }
  document.getElementById('startBtn').disabled = false;
  document.getElementById('stopBtn').disabled  = true;
  if (stepIdx > 0) document.getElementById('st').textContent = 'Pausé';
}

function updateStats() {
  document.getElementById('sc').textContent = comps;
  document.getElementById('ss').textContent = swps;
  document.getElementById('se').textContent = stepIdx;
}

window.addEventListener('resize', () => {
  if (!timer) { buildLayout(arr.length); positionAll(true); }
});

init();