// Scena desenată de pe Acasă: dealuri pe straturi, piese de joc uriașe, zaruri, cărți și jucători pe creastă.
// Culorile vin din CSS (clasele sc-*), ca scena să urmeze tema închisă sau deschisă.
import { spring, finePointer, reduced } from '../fx/motion.js';

// un jucător mic, în picioare pe creastă; `up` = cu brațele ridicate
const person = (x, y, s = 1, up = false) => `
  <g transform="translate(${x} ${y}) scale(${s})">
    <circle cx="0" cy="-46" r="8"/>
    <path d="M-10 -36 H10 L13 -8 H7 L6 6 H1 L0 -6 L-1 6 H-6 L-7 -8 H-13 Z"/>
    ${up ? '<path d="M-10 -34 L-22 -58 L-17 -60 L-6 -38 Z M10 -34 L22 -58 L17 -60 L6 -38 Z"/>'
         : '<path d="M-10 -34 L-18 -12 L-13 -11 L-7 -28 Z M10 -34 L18 -12 L13 -11 L7 -28 Z"/>'}
  </g>`;

// un zar văzut din față, rotit, cu punctele „găurite” în culoarea cerului
const die = (x, y, size, rot, pips) => {
  const p = size / 4;
  const spots = { 3: [[-p, -p], [0, 0], [p, p]], 5: [[-p, -p], [p, -p], [0, 0], [-p, p], [p, p]], 2: [[-p, -p], [p, p]] }[pips];
  return `<g transform="translate(${x} ${y}) rotate(${rot})">
    <rect class="sc-mid" x="${-size / 2}" y="${-size / 2}" width="${size}" height="${size}" rx="${size / 6}"/>
    ${spots.map(([a, b]) => `<circle class="sc-pip" cx="${a}" cy="${b}" r="${size / 11}"/>`).join('')}
  </g>`;
};

// un evantai de trei cărți de joc
const cards = (x, y) => `<g transform="translate(${x} ${y})">
  ${[-18, 0, 18].map((r) => `<g transform="rotate(${r}) translate(0 -60)"><rect class="sc-mid" x="-34" y="-50" width="68" height="100" rx="8"/><rect class="sc-pip" x="-24" y="-40" width="48" height="80" rx="4" opacity="0.35"/></g>`).join('')}
</g>`;

const SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 720" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
  <defs>
    <linearGradient id="sc-sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" class="sc-sky-top"/>
      <stop offset="1" class="sc-sky-bot"/>
    </linearGradient>
    <radialGradient id="sc-glow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" class="sc-glow-in"/>
      <stop offset="1" class="sc-glow-out"/>
    </radialGradient>
  </defs>
  <rect class="sc-skyrect" width="1600" height="720" fill="url(#sc-sky)"/>
  <ellipse cx="800" cy="560" rx="760" ry="360" fill="url(#sc-glow)"/>
  <g class="sc-stars">
    ${[[120, 80], [260, 150], [410, 60], [560, 120], [1040, 90], [1180, 160], [1320, 70], [1470, 130], [700, 40], [900, 140], [1560, 40], [40, 190]]
      .map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${i % 3 ? 1.6 : 2.4}" style="--i:${i}"/>`).join('')}
  </g>

  <g class="sc-rise" style="--i:0"><g class="sc-layer" data-depth="0.12">
    <path class="sc-far" d="M-80 520 L60 470 L180 500 L320 428 L460 486 L600 444 L760 474 L920 418 L1080 470 L1220 430 L1360 482 L1500 446 L1680 470 V720 H-80 Z"/>
  </g></g>

  <g class="sc-rise" style="--i:1"><g class="sc-layer" data-depth="0.28">
    <g class="sc-giant" transform="translate(400 0)">
      <path d="M-120 610 H120 V580 Q120 562 98 558 H-98 Q-120 562 -120 580 Z"/>
      <path d="M-86 560 L-58 338 H58 L86 560 Z"/>
      <rect x="-74" y="306" width="148" height="36" rx="10"/>
      <path d="M-60 310 Q-74 236 0 210 Q74 236 60 310 Z"/>
      <rect x="-48" y="192" width="96" height="24" rx="7"/>
      <rect x="-11" y="118" width="22" height="78" rx="4"/>
      <rect x="-36" y="138" width="72" height="22" rx="4"/>
    </g>
    <g class="sc-giant" transform="translate(1210 0)">
      <path d="M-128 610 L-62 476 L-166 436 Q-192 424 -176 398 L-156 366 Q-144 350 -122 354 L-56 370 Q-78 332 -78 300 Q-78 222 0 222 Q78 222 78 300 Q78 332 56 370 L122 354 Q144 350 156 366 L176 398 Q192 424 166 436 L62 476 L128 610 L36 610 L0 528 L-36 610 Z"/>
    </g>
  </g></g>

  <g class="sc-rise" style="--i:2"><g class="sc-layer" data-depth="0.5">
    <path class="sc-mid" d="M-80 606 Q160 538 420 578 T840 562 T1240 584 T1680 552 V720 H-80 Z"/>
    ${die(560, 548, 74, -14, 5)}
    ${die(650, 572, 50, 18, 3)}
    ${die(960, 566, 58, 12, 2)}
    ${cards(1060, 612)}
  </g></g>

  <g class="sc-embers">
    ${[[300, 600], [520, 640], [760, 610], [980, 650], [1220, 620], [1420, 600], [660, 660], [1100, 680]]
      .map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${i % 2 ? 2 : 3}" style="--i:${i}"/>`).join('')}
  </g>

  <g class="sc-rise" style="--i:3"><g class="sc-layer" data-depth="0.8">
    <g class="sc-front">
      <path d="M-80 662 L60 640 L150 656 L240 628 L330 652 L420 632 L520 648 L640 622 L760 644 L860 626 L980 646 L1100 624 L1220 652 L1320 634 L1440 654 L1520 636 L1680 650 V720 H-80 Z"/>
      ${person(330, 632, 1, true)}${person(376, 640, 0.9)}${person(418, 648, 0.85)}
      ${person(1150, 628, 1)}${person(1196, 640, 0.95, true)}${person(1242, 646, 0.85)}
    </g>
  </g></g>
</svg>`;

/** Construiește scena; pe mouse, straturile se mișcă ușor în funcție de adâncime (paralaxă). */
export function heroScene() {
  const svg = new DOMParser().parseFromString(SVG, 'image/svg+xml').documentElement;
  const el = document.importNode(svg, true);
  el.classList.add('hero-scene');
  // pe telefon scena nu se mai decupează pe centru: se vede de la rege la meeple, micșorată, jos în ecran
  const narrow = matchMedia('(max-width: 599px)');
  const frame = () => {
    el.setAttribute('viewBox', narrow.matches ? '230 0 1140 720' : '0 0 1600 720');
    el.setAttribute('preserveAspectRatio', narrow.matches ? 'xMidYMax meet' : 'xMidYMax slice');
  };
  frame();
  narrow.addEventListener('change', frame);
  if (finePointer() && !reduced()) {
    const layers = [...el.querySelectorAll('.sc-layer')].map((g) => {
      const depth = Number(g.dataset.depth);
      let x = 0; let y = 0;
      const apply = () => { g.style.transform = `translate(${x}px, ${y}px)`; };
      return { depth, sx: spring((v) => { x = v; apply(); }, { response: 0.6 }), sy: spring((v) => { y = v; apply(); }, { response: 0.6 }) };
    });
    const onMove = (e) => {
      if (!el.isConnected) { removeEventListener('pointermove', onMove); return; }
      const dx = e.clientX / innerWidth - 0.5; const dy = e.clientY / innerHeight - 0.5;
      for (const l of layers) { l.sx.set(-dx * 40 * l.depth); l.sy.set(-dy * 14 * l.depth); }
    };
    addEventListener('pointermove', onMove, { passive: true });
  }
  return el;
}
