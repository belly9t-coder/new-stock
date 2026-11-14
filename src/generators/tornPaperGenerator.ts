import {
  ASPECT_RATIO_SPECS,
  AspectRatioPreset,
  GeneratedDesign,
  Point,
  TornPaperStyle,
  VectorLayer,
} from '../types/studio';
import { build1DNoiseField, SeededRNG } from '../utils/prng';

export interface TornPaperParams {
  designId: string;
  seedWords: [number, number, number, number];
  style: TornPaperStyle;
  color: string;
  roughness: number; // 15-100
  detailDensity: number; // 20-100
  thickness: number; // 12-88
  deckleHighlight: boolean;
  deckleOpacity: number; // 10-100
  aspectRatio: AspectRatioPreset;
}

function roundCoord(n: number): string {
  return (Math.round(n * 100) / 100).toString();
}

export function pointsToClosedPath(points: Point[]): string {
  if (points.length === 0) return '';
  const parts: string[] = [`M ${roundCoord(points[0].x)} ${roundCoord(points[0].y)}`];
  for (let i = 1; i < points.length; i++) {
    parts.push(`L ${roundCoord(points[i].x)} ${roundCoord(points[i].y)}`);
  }
  parts.push('Z');
  return parts.join(' ');
}

export function multiRingsToPath(rings: Point[][]): string {
  return rings.map(pointsToClosedPath).join(' ');
}

/**
 * Generates an organic torn paper edge between two endpoints (p0 -> p1)
 * with authentic macro waves, jagged paper snapping plateaus, and micro fibers.
 */
function generateTornSegment(
  p0: Point,
  p1: Point,
  rng: SeededRNG,
  roughnessNorm: number,
  detailNorm: number,
  amplitudePx: number,
  includeStart = true
): Point[] {
  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;
  const len = Math.hypot(dx, dy);
  if (len < 1) return includeStart ? [p0, p1] : [p1];

  // Unit normal perpendicular to edge
  const nx = -dy / len;
  const ny = dx / len;

  const noise = build1DNoiseField(rng, 256);
  const stepPx = Math.max(2.6, 10.5 - detailNorm * 6.8);
  const steps = Math.max(18, Math.round(len / stepPx));

  const phaseOffset = rng.range(0, 50);
  const freqScale = rng.range(1.6, 3.4);
  const skew = rng.range(-0.35, 0.35);

  // Occasional dramatic tear notches where paper grain catches
  const notchCount = rng.int(1, 4);
  const notches: { center: number; width: number; depth: number }[] = [];
  for (let i = 0; i < notchCount; i++) {
    notches.push({
      center: rng.range(0.08, 0.92),
      width: rng.range(0.025, 0.085),
      depth: rng.range(0.45, 1.15) * rng.sign() * amplitudePx * (0.4 + roughnessNorm * 0.7),
    });
  }

  const pts: Point[] = [];
  const startIdx = includeStart ? 0 : 1;

  for (let i = startIdx; i <= steps; i++) {
    const t = i / steps;
    // Taper displacement right at corners only slightly so corners feel torn naturally
    const edgeEnvelope = Math.sin(Math.min(1, t * 7) * (Math.PI / 2)) * Math.sin(Math.min(1, (1 - t) * 7) * (Math.PI / 2));

    const baseN = noise(phaseOffset + t * freqScale);
    // Non-linear shaping gives sharp paper-snap crests and flatter tear shelves
    const shaped = Math.sign(baseN) * Math.pow(Math.abs(baseN), 0.78);

    // Fine toothy cellulose fiber jitter
    const fiberTooth =
      (rng.next() - 0.5) * amplitudePx * 0.24 * (0.35 + roughnessNorm * 0.85) +
      (rng.next() < 0.09 * detailNorm ? (rng.next() - 0.5) * amplitudePx * 0.42 : 0);

    let notchOffset = 0;
    for (const notch of notches) {
      const dist = Math.abs(t - notch.center);
      if (dist < notch.width) {
        const k = 1 - dist / notch.width;
        notchOffset += notch.depth * Math.pow(k, 1.6);
      }
    }

    // Subtle lateral tangental jitter for ragged fiber tips
    const tangentJitter = (rng.next() - 0.5) * (len / steps) * 0.42 * detailNorm;

    const displacement =
      (shaped * amplitudePx * (0.55 + roughnessNorm * 0.85) + notchOffset + fiberTooth + skew * amplitudePx * 0.15) *
      (0.35 + 0.65 * edgeEnvelope);

    const bx = p0.x + dx * t + (dx / len) * (i === 0 || i === steps ? 0 : tangentJitter);
    const by = p0.y + dy * t + (dy / len) * (i === 0 || i === steps ? 0 : tangentJitter);

    pts.push({
      x: bx + nx * displacement,
      y: by + ny * displacement,
    });
  }

  return pts;
}

/**
 * Adjusts hex color brightness slightly for subtle deckle fiber edge or layered strips
 */
function adjustHexTone(hex: string, amount: number): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return hex;
  const num = parseInt(clean, 16);
  const r = Math.min(255, Math.max(0, ((num >> 16) & 0xff) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount));
  const b = Math.min(255, Math.max(0, (num & 0xff) + amount));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
}

function getLuminance(hex: string): number {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return 128;
  const num = parseInt(clean, 16);
  const r = (num >> 16) & 0xff;
  const g = (num >> 8) & 0xff;
  const b = num & 0xff;
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function buildDeckleEdgeLip(
  tornPoints: Point[],
  offsetNormal: { nx: number; ny: number },
  lipThickness: number,
  color: string,
  deckleOpacityNorm: number,
  rng: SeededRNG
): VectorLayer {
  const outer = tornPoints;
  const inner: Point[] = [];
  const noise = build1DNoiseField(rng, 128);
  const len = tornPoints.length;

  for (let i = len - 1; i >= 0; i--) {
    const p = tornPoints[i];
    const t = i / Math.max(1, len - 1);
    const n = Math.abs(noise(t * 14 + 3.2));
    const thickness = lipThickness * (0.28 + n * 1.45 + rng.next() * 0.45);
    inner.push({
      x: p.x + offsetNormal.nx * thickness,
      y: p.y + offsetNormal.ny * thickness,
    });
  }
  const ring = [...outer, ...inner];
  const lum = getLuminance(color);
  // Dark / mid colors reveal bright white/off-white torn paper cellulose core; very light colors reveal soft warm gray core
  const lipColor = lum > 205 ? adjustHexTone(color, -26) : '#F9F8F4';

  return {
    id: `deckle-lip-${Math.round(rng.next() * 99999)}`,
    label: 'কাগজের প্রান্তের আঁশ (Deckle Edge)',
    pathData: pointsToClosedPath(ring),
    pointsList: [ring],
    fill: lipColor,
    opacity: Math.max(0.05, Math.min(1, deckleOpacityNorm)),
  };
}

export function generateTornPaperDesign(params: TornPaperParams): GeneratedDesign {
  const spec = ASPECT_RATIO_SPECS[params.aspectRatio];
  const W = spec.viewBoxWidth;
  const H = spec.viewBoxHeight;
  const rng = new SeededRNG(params.seedWords);

  const roughnessNorm = params.roughness / 100;
  const detailNorm = params.detailDensity / 100;
  const thicknessNorm = Math.min(1, Math.max(0, (params.thickness - 12) / (88 - 12)));
  const deckleOpacityNorm = Math.min(1, Math.max(0.05, params.deckleOpacity / 100));
  const baseScale = Math.min(W, H);
  const amp = baseScale * (0.025 + roughnessNorm * 0.048);

  const layers: VectorLayer[] = [];

  if (params.style === 'split-gap') {
    // Top & Bottom torn sheets with transparent center gap controlled by thickness
    // Higher thickness = thicker top & bottom paper (smaller gap); lower thickness = thinner paper (wider gap)
    const bandRatio = 0.14 + thicknessNorm * 0.29; // 14% to 43% per side -> center gap 72% down to 14%
    const topTearY = H * bandRatio + rng.range(-0.018, 0.018) * H;
    const botTearY = H * (1 - bandRatio) + rng.range(-0.018, 0.018) * H;

    // Top sheet: (0,0) -> (W,0) -> torn right-to-left along topTearY -> back to (0,0)
    const topLeftCorner: Point = { x: 0, y: 0 };
    const topRightCorner: Point = { x: W, y: 0 };
    const topTearRight: Point = { x: W, y: topTearY + rng.range(-0.02, 0.02) * H };
    const topTearLeft: Point = { x: 0, y: topTearY + rng.range(-0.02, 0.02) * H };

    const topTornEdge = generateTornSegment(
      topTearRight,
      topTearLeft,
      rng,
      roughnessNorm * 1.05,
      detailNorm,
      amp * 1.05,
      false
    );
    const topRing = [topLeftCorner, topRightCorner, topTearRight, ...topTornEdge];

    // Bottom sheet: torn left-to-right along botTearY -> (W,H) -> (0,H) -> back
    const botTearLeft: Point = { x: 0, y: botTearY + rng.range(-0.02, 0.02) * H };
    const botTearRight: Point = { x: W, y: botTearY + rng.range(-0.02, 0.02) * H };
    const botRightCorner: Point = { x: W, y: H };
    const botLeftCorner: Point = { x: 0, y: H };

    const botTornEdge = generateTornSegment(
      botTearLeft,
      botTearRight,
      rng,
      roughnessNorm * 1.05,
      detailNorm,
      amp * 1.05,
      true
    );
    const botRing = [...botTornEdge, botRightCorner, botLeftCorner];

    if (params.deckleHighlight) {
      // Protrude slightly into the transparent middle gap
      layers.push(buildDeckleEdgeLip(topTornEdge, { nx: 0, ny: 1 }, baseScale * 0.013, params.color, deckleOpacityNorm, rng));
      layers.push(buildDeckleEdgeLip(botTornEdge, { nx: 0, ny: -1 }, baseScale * 0.013, params.color, deckleOpacityNorm, rng));
    }

    layers.push({
      id: 'split-gap-top',
      label: 'উপরের ছেঁড়া কাগজ',
      pathData: pointsToClosedPath(topRing),
      pointsList: [topRing],
      fill: params.color,
    });

    layers.push({
      id: 'split-gap-bottom',
      label: 'নিচের ছেঁড়া কাগজ',
      pathData: pointsToClosedPath(botRing),
      pointsList: [botRing],
      fill: params.color,
    });
  } else if (params.style === 'horizontal-strip') {
    const marginX = W * rng.range(0.05, 0.11);
    const bandHeight = H * (0.14 + thicknessNorm * 0.52);
    const centerY = H * rng.range(0.46, 0.54);
    const tilt = rng.range(-0.045, 0.045) * H;

    const tl: Point = { x: marginX, y: centerY - bandHeight / 2 + tilt };
    const tr: Point = { x: W - marginX, y: centerY - bandHeight / 2 - tilt };
    const br: Point = { x: W - marginX - rng.range(-18, 18), y: centerY + bandHeight / 2 - tilt };
    const bl: Point = { x: marginX + rng.range(-18, 18), y: centerY + bandHeight / 2 + tilt };

    const topEdge = generateTornSegment(tl, tr, rng, roughnessNorm, detailNorm, amp, true);
    const rightEdge = generateTornSegment(tr, br, rng, roughnessNorm * 0.45, detailNorm * 0.7, amp * 0.38, false);
    const bottomEdge = generateTornSegment(br, bl, rng, roughnessNorm, detailNorm, amp, false);
    const leftEdge = generateTornSegment(bl, tl, rng, roughnessNorm * 0.45, detailNorm * 0.7, amp * 0.38, false);

    const ring = [...topEdge, ...rightEdge, ...bottomEdge, ...leftEdge];

    layers.push({
      id: 'torn-strip-main',
      label: 'ছেঁড়া কাগজের মূল স্তর',
      pathData: pointsToClosedPath(ring),
      pointsList: [ring],
      fill: params.color,
    });

    if (params.deckleHighlight) {
      layers.push(buildDeckleEdgeLip(topEdge, { nx: 0, ny: 1 }, baseScale * 0.007, params.color, deckleOpacityNorm, rng));
      layers.push(buildDeckleEdgeLip(bottomEdge, { nx: 0, ny: -1 }, baseScale * 0.007, params.color, deckleOpacityNorm, rng));
    }
  } else if (params.style === 'ripped-edge') {
    // 3 crisp straight sides + 1 dramatically torn edge (randomly top, bottom, left, or right)
    const side = rng.int(0, 3);
    const padX = W * 0.1;
    const padY = H * 0.1;
    const reach = 0.28 + thicknessNorm * 0.56;
    let ring: Point[] = [];
    let tornEdge: Point[] = [];
    let normal = { nx: 0, ny: 1 };

    if (side === 0) {
      // Bottom ripped sheet
      const ripY = padY + (H - padY * 2) * reach;
      const tl: Point = { x: padX, y: padY };
      const tr: Point = { x: W - padX, y: padY };
      const br: Point = { x: W - padX, y: ripY + rng.range(-20, 20) };
      const bl: Point = { x: padX, y: ripY + rng.range(-20, 20) };
      tornEdge = generateTornSegment(br, bl, rng, roughnessNorm * 1.15, detailNorm, amp * 1.25, false);
      ring = [tl, tr, br, ...tornEdge];
      normal = { nx: 0, ny: -1 };
    } else if (side === 1) {
      // Top ripped sheet
      const ripY = H - padY - (H - padY * 2) * reach;
      const tl: Point = { x: padX, y: ripY + rng.range(-20, 20) };
      const tr: Point = { x: W - padX, y: ripY + rng.range(-20, 20) };
      const br: Point = { x: W - padX, y: H - padY };
      const bl: Point = { x: padX, y: H - padY };
      tornEdge = generateTornSegment(tl, tr, rng, roughnessNorm * 1.15, detailNorm, amp * 1.25, true);
      ring = [...tornEdge, br, bl];
      normal = { nx: 0, ny: 1 };
    } else if (side === 2) {
      // Right ripped sheet
      const ripX = padX + (W - padX * 2) * reach;
      const tl: Point = { x: padX, y: padY };
      const tr: Point = { x: ripX + rng.range(-20, 20), y: padY };
      const br: Point = { x: ripX + rng.range(-20, 20), y: H - padY };
      const bl: Point = { x: padX, y: H - padY };
      tornEdge = generateTornSegment(tr, br, rng, roughnessNorm * 1.15, detailNorm, amp * 1.25, false);
      ring = [tl, tr, ...tornEdge, bl];
      normal = { nx: -1, ny: 0 };
    } else {
      // Left ripped sheet
      const ripX = W - padX - (W - padX * 2) * reach;
      const tl: Point = { x: ripX + rng.range(-20, 20), y: padY };
      const tr: Point = { x: W - padX, y: padY };
      const br: Point = { x: W - padX, y: H - padY };
      const bl: Point = { x: ripX + rng.range(-20, 20), y: H - padY };
      tornEdge = generateTornSegment(bl, tl, rng, roughnessNorm * 1.15, detailNorm, amp * 1.25, false);
      ring = [tl, tr, br, bl, ...tornEdge];
      normal = { nx: 1, ny: 0 };
    }

    layers.push({
      id: 'ripped-sheet-main',
      label: 'এক প্রান্ত ছেঁড়া কাগজ',
      pathData: pointsToClosedPath(ring),
      pointsList: [ring],
      fill: params.color,
    });

    if (params.deckleHighlight) {
      layers.push(buildDeckleEdgeLip(tornEdge, normal, baseScale * 0.008, params.color, deckleOpacityNorm, rng));
    }
  } else if (params.style === 'irregular-scrap') {
    // Organic 5 to 8 vertex torn paper polygon scrap
    const verticesCount = rng.int(5, 8);
    const cx = W * 0.5;
    const cy = H * 0.5;
    const scaleBias = 0.72 + thicknessNorm * 0.45;
    const rx = W * rng.range(0.30, 0.37) * scaleBias;
    const ry = H * rng.range(0.30, 0.37) * scaleBias;
    const startAngle = rng.range(0, Math.PI * 2);

    const corners: Point[] = [];
    for (let i = 0; i < verticesCount; i++) {
      const angle = startAngle + (i / verticesCount) * Math.PI * 2 + rng.range(-0.18, 0.18);
      const rScale = rng.range(0.76, 1.08);
      corners.push({
        x: cx + Math.cos(angle) * rx * rScale,
        y: cy + Math.sin(angle) * ry * rScale,
      });
    }

    const ring: Point[] = [];
    for (let i = 0; i < corners.length; i++) {
      const a = corners[i];
      const b = corners[(i + 1) % corners.length];
      const seg = generateTornSegment(a, b, rng, roughnessNorm, detailNorm, amp * 0.92, i === 0);
      ring.push(...seg);
    }

    layers.push({
      id: 'paper-scrap-main',
      label: 'অর্গানিক কাগজের টুকরো',
      pathData: pointsToClosedPath(ring),
      pointsList: [ring],
      fill: params.color,
    });

    if (params.deckleHighlight) {
      const innerRing = ring.map((pt) => {
        const vx = cx - pt.x;
        const vy = cy - pt.y;
        const d = Math.hypot(vx, vy) || 1;
        const shift = baseScale * 0.0065 * rng.range(0.6, 1.3);
        return { x: pt.x + (vx / d) * shift, y: pt.y + (vy / d) * shift };
      });
      const isLight = getLuminance(params.color) > 205;
      layers.push({
        id: 'paper-scrap-deckle',
        label: 'কাগজের প্রান্তের আঁশ',
        pathData: multiRingsToPath([ring, [...innerRing].reverse()]),
        pointsList: [ring, [...innerRing].reverse()],
        fill: isLight ? adjustHexTone(params.color, -24) : '#F9F8F4',
        opacity: deckleOpacityNorm,
        fillRule: 'evenodd',
      });
    }
  } else if (params.style === 'diagonal-cut') {
    const flip = rng.next() > 0.5;
    const thickness = baseScale * (0.14 + thicknessNorm * 0.44);
    const pA: Point = flip ? { x: W * 0.08, y: H * 0.78 } : { x: W * 0.08, y: H * 0.22 };
    const pB: Point = flip ? { x: W * 0.92, y: H * 0.22 } : { x: W * 0.92, y: H * 0.78 };

    const dx = pB.x - pA.x;
    const dy = pB.y - pA.y;
    const len = Math.hypot(dx, dy);
    const nx = (-dy / len) * (thickness / 2);
    const ny = (dx / len) * (thickness / 2);

    const c1 = { x: pA.x + nx, y: pA.y + ny };
    const c2 = { x: pB.x + nx, y: pB.y + ny };
    const c3 = { x: pB.x - nx, y: pB.y - ny };
    const c4 = { x: pA.x - nx, y: pA.y - ny };

    const e1 = generateTornSegment(c1, c2, rng, roughnessNorm * 1.1, detailNorm, amp * 1.1, true);
    const e2 = generateTornSegment(c2, c3, rng, roughnessNorm * 0.55, detailNorm * 0.8, amp * 0.5, false);
    const e3 = generateTornSegment(c3, c4, rng, roughnessNorm * 1.1, detailNorm, amp * 1.1, false);
    const e4 = generateTornSegment(c4, c1, rng, roughnessNorm * 0.55, detailNorm * 0.8, amp * 0.5, false);

    const ring = [...e1, ...e2, ...e3, ...e4];
    layers.push({
      id: 'diagonal-tear-main',
      label: 'তির্যক ছেঁড়া কাগজ',
      pathData: pointsToClosedPath(ring),
      pointsList: [ring],
      fill: params.color,
    });

    if (params.deckleHighlight) {
      layers.push(buildDeckleEdgeLip(e1, { nx: dy / len, ny: -dx / len }, baseScale * 0.008, params.color, deckleOpacityNorm, rng));
      layers.push(buildDeckleEdgeLip(e3, { nx: -dy / len, ny: dx / len }, baseScale * 0.008, params.color, deckleOpacityNorm, rng));
    }
  } else if (params.style === 'layered-strips') {
    const stripCount = 3;
    const isLight = getLuminance(params.color) > 150;
    const toneOffsets = isLight ? [-30, -14, 0] : [36, 18, 0];

    for (let idx = 0; idx < stripCount; idx++) {
      const yCenter = H * (0.28 + idx * 0.22) + rng.range(-H * 0.03, H * 0.03);
      const bandH = H * (0.14 + thicknessNorm * 0.24);
      const marginX = W * rng.range(0.06, 0.14);
      const tilt = rng.range(-0.05, 0.05) * H;

      const tl: Point = { x: marginX, y: yCenter - bandH / 2 + tilt };
      const tr: Point = { x: W - marginX, y: yCenter - bandH / 2 - tilt };
      const br: Point = { x: W - marginX, y: yCenter + bandH / 2 - tilt };
      const bl: Point = { x: marginX, y: yCenter + bandH / 2 + tilt };

      const eTop = generateTornSegment(tl, tr, rng, roughnessNorm, detailNorm, amp * 0.85, true);
      const eRight = generateTornSegment(tr, br, rng, roughnessNorm * 0.4, detailNorm * 0.7, amp * 0.35, false);
      const eBot = generateTornSegment(br, bl, rng, roughnessNorm, detailNorm, amp * 0.85, false);
      const eLeft = generateTornSegment(bl, tl, rng, roughnessNorm * 0.4, detailNorm * 0.7, amp * 0.35, false);

      const ring = [...eTop, ...eRight, ...eBot, ...eLeft];
      layers.push({
        id: `layered-strip-${idx + 1}`,
        label: `কাগজের স্তর ${idx + 1}`,
        pathData: pointsToClosedPath(ring),
        pointsList: [ring],
        fill: adjustHexTone(params.color, toneOffsets[idx]),
      });
    }
  } else {
    // 'torn-frame': Outer paper border with organic torn inner window cutout (evenodd)
    const padX = W * 0.04;
    const padY = H * 0.04;
    const outerRing: Point[] = [
      { x: padX, y: padY },
      { x: W - padX, y: padY },
      { x: W - padX, y: H - padY },
      { x: padX, y: H - padY },
    ];

    const winPadX = W * (0.10 + thicknessNorm * 0.24);
    const winPadY = H * (0.10 + thicknessNorm * 0.24);

    // Reverse winding for hole clarity
    const i1: Point = { x: winPadX, y: winPadY };
    const i2: Point = { x: winPadX, y: H - winPadY };
    const i3: Point = { x: W - winPadX, y: H - winPadY };
    const i4: Point = { x: W - winPadX, y: winPadY };

    const ie1 = generateTornSegment(i1, i2, rng, roughnessNorm, detailNorm, amp * 0.95, true);
    const ie2 = generateTornSegment(i2, i3, rng, roughnessNorm, detailNorm, amp * 0.95, false);
    const ie3 = generateTornSegment(i3, i4, rng, roughnessNorm, detailNorm, amp * 0.95, false);
    const ie4 = generateTornSegment(i4, i1, rng, roughnessNorm, detailNorm, amp * 0.95, false);

    const innerRing = [...ie1, ...ie2, ...ie3, ...ie4];

    layers.push({
      id: 'torn-frame-main',
      label: 'ছেঁড়া কাগজের ফ্রেম',
      pathData: multiRingsToPath([outerRing, innerRing]),
      pointsList: [outerRing, innerRing],
      fill: params.color,
      fillRule: 'evenodd',
    });
  }

  const nodeCount = layers.reduce(
    (acc, layer) => acc + layer.pointsList.reduce((s, ring) => s + ring.length, 0),
    0
  );

  return {
    designId: params.designId,
    seedWords: params.seedWords,
    mode: 'torn-paper',
    style: params.style,
    aspectRatio: params.aspectRatio,
    viewBoxWidth: W,
    viewBoxHeight: H,
    layers,
    nodeCount,
    createdAt: Date.now(),
  };
}
