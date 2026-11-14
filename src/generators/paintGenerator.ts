import {
  ASPECT_RATIO_SPECS,
  AspectRatioPreset,
  GeneratedDesign,
  PaintStyle,
  Point,
  VectorLayer,
} from '../types/studio';
import { build1DNoiseField, SeededRNG } from '../utils/prng';
import { multiRingsToPath, pointsToClosedPath } from './tornPaperGenerator';

export interface PaintParams {
  designId: string;
  seedWords: [number, number, number, number];
  style: PaintStyle;
  color: string;
  roughness: number; // 15-100
  detailDensity: number; // 20-100
  aspectRatio: AspectRatioPreset;
}

function generateBlobRing(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  rng: SeededRNG,
  irregularity: number,
  steps = 72
): Point[] {
  const noise = build1DNoiseField(rng, 128);
  const phase = rng.range(0, 40);
  const ring: Point[] = [];
  for (let i = 0; i < steps; i++) {
    const angle = (i / steps) * Math.PI * 2;
    const n = noise(phase + Math.cos(angle) * 1.4 + Math.sin(angle) * 1.4);
    const radialScale = 1 + n * irregularity + (rng.next() - 0.5) * irregularity * 0.25;
    ring.push({
      x: cx + Math.cos(angle) * rx * radialScale,
      y: cy + Math.sin(angle) * ry * radialScale,
    });
  }
  return ring;
}

export function generatePaintDesign(params: PaintParams): GeneratedDesign {
  const spec = ASPECT_RATIO_SPECS[params.aspectRatio];
  const W = spec.viewBoxWidth;
  const H = spec.viewBoxHeight;
  const rng = new SeededRNG(params.seedWords);

  const roughNorm = params.roughness / 100;
  const detailNorm = params.detailDensity / 100;
  const baseScale = Math.min(W, H);

  const layers: VectorLayer[] = [];

  if (params.style === 'dry-brush') {
    const bristleBands = 4 + Math.round(detailNorm * 4);
    const rings: Point[][] = [];
    const tilt = rng.range(-0.12, 0.12);
    const startX = W * rng.range(0.08, 0.14);
    const endX = W * rng.range(0.86, 0.92);
    const centerY = H * 0.5;
    const totalHeight = H * rng.range(0.28, 0.42);

    for (let b = 0; b < bristleBands; b++) {
      const frac = b / Math.max(1, bristleBands - 1) - 0.5;
      const bandY = centerY + frac * totalHeight;
      const bandThickness = (totalHeight / bristleBands) * rng.range(0.55, 1.15);
      const localStart = startX + rng.range(-0.04, 0.08) * W;
      const localEnd = endX - rng.range(-0.04, 0.08) * W;

      const noiseTop = build1DNoiseField(rng, 128);
      const noiseBot = build1DNoiseField(rng, 128);
      const segs = 90;
      const topPts: Point[] = [];
      const botPts: Point[] = [];

      for (let i = 0; i <= segs; i++) {
        const t = i / segs;
        const x = localStart + (localEnd - localStart) * t;
        const yTilt = (t - 0.5) * W * tilt;
        const taper = Math.sin(Math.pow(t, 0.7) * Math.PI);
        const hMod = bandThickness * (0.35 + 0.65 * taper);

        const n1 = noiseTop(t * 5 + b * 7) * hMod * (0.4 + roughNorm * 0.6);
        const n2 = noiseBot(t * 5 + b * 11) * hMod * (0.4 + roughNorm * 0.6);

        topPts.push({ x, y: bandY + yTilt - hMod * 0.5 + n1 });
        botPts.unshift({ x, y: bandY + yTilt + hMod * 0.5 + n2 });
      }
      rings.push([...topPts, ...botPts]);
    }

    layers.push({
      id: 'paint-dry-brush',
      label: 'ড্রাই ব্রাশ স্ট্রোক',
      pathData: multiRingsToPath(rings),
      pointsList: rings,
      fill: params.color,
    });
  } else if (params.style === 'ink-splatter') {
    const cx = W * rng.range(0.42, 0.58);
    const cy = H * rng.range(0.42, 0.58);
    const coreR = baseScale * rng.range(0.16, 0.24);
    const rings: Point[][] = [];

    // Main splash with radial spikes
    const noise = build1DNoiseField(rng, 256);
    const steps = 160;
    const coreRing: Point[] = [];
    const spikes = rng.int(10, 20);
    const spikeAngles = Array.from({ length: spikes }, () => rng.range(0, Math.PI * 2));

    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      let spikeBoost = 0;
      for (const sa of spikeAngles) {
        const diff = Math.atan2(Math.sin(a - sa), Math.cos(a - sa));
        if (Math.abs(diff) < 0.14) {
          spikeBoost += Math.pow(1 - Math.abs(diff) / 0.14, 2.2) * coreR * rng.range(0.4, 1.15);
        }
      }
      const r = coreR * (1 + noise(a * 3.1) * (0.28 + roughNorm * 0.35)) + spikeBoost;
      coreRing.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
    }
    rings.push(coreRing);

    // Satellite droplets
    const dropletCount = Math.round(18 + detailNorm * 34);
    for (let d = 0; d < dropletCount; d++) {
      const angle = rng.range(0, Math.PI * 2);
      const dist = coreR * rng.range(1.15, 2.35);
      const dx = cx + Math.cos(angle) * dist;
      const dy = cy + Math.sin(angle) * dist;
      if (dx < 30 || dx > W - 30 || dy < 30 || dy > H - 30) continue;
      const dr = baseScale * rng.range(0.006, 0.032) * (rng.next() < 0.2 ? 1.8 : 1);
      rings.push(generateBlobRing(dx, dy, dr, dr * rng.range(0.75, 1.35), rng, 0.22, 18));
    }

    layers.push({
      id: 'paint-ink-splatter',
      label: 'ইংক স্প্ল্যাটার',
      pathData: multiRingsToPath(rings),
      pointsList: rings,
      fill: params.color,
    });
  } else if (params.style === 'palette-knife') {
    const padX = W * rng.range(0.12, 0.18);
    const padY = H * rng.range(0.26, 0.34);
    const skew = rng.range(-0.08, 0.08) * W;

    const tl: Point = { x: padX + skew, y: padY };
    const tr: Point = { x: W - padX + skew, y: padY + rng.range(-25, 25) };
    const br: Point = { x: W - padX - skew, y: H - padY };
    const bl: Point = { x: padX - skew, y: H - padY + rng.range(-25, 25) };

    const noise = build1DNoiseField(rng, 128);
    const ring: Point[] = [];
    const edgeSteps = 48;

    const addScrapedEdge = (a: Point, b: Point, roughAmp: number) => {
      for (let i = 0; i < edgeSteps; i++) {
        const t = i / edgeSteps;
        const n = noise(t * 8 + a.x * 0.01);
        const step = Math.round(n * 4) / 4; // Chiseled knife step
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len;
        const ny = dx / len;
        ring.push({
          x: a.x + dx * t + nx * step * roughAmp,
          y: a.y + dy * t + ny * step * roughAmp,
        });
      }
    };

    const rAmp = baseScale * (0.015 + roughNorm * 0.032);
    addScrapedEdge(tl, tr, rAmp * 0.6);
    addScrapedEdge(tr, br, rAmp * 1.4);
    addScrapedEdge(br, bl, rAmp * 0.6);
    addScrapedEdge(bl, tl, rAmp * 1.4);

    layers.push({
      id: 'paint-palette-knife',
      label: 'প্যালেট নাইফ স্মিয়ার',
      pathData: pointsToClosedPath(ring),
      pointsList: [ring],
      fill: params.color,
    });
  } else if (params.style === 'watercolor-edge') {
    const ring = generateBlobRing(
      W * 0.5,
      H * 0.5,
      W * rng.range(0.32, 0.39),
      H * rng.range(0.30, 0.38),
      rng,
      0.24 + roughNorm * 0.25,
      140
    );
    layers.push({
      id: 'paint-watercolor-wash',
      label: 'জলরঙের অর্গানিক ছাপ',
      pathData: pointsToClosedPath(ring),
      pointsList: [ring],
      fill: params.color,
    });
  } else {
    // 'paint-drip': Upper paint pool with smooth hanging gravity drips
    const topY = H * rng.range(0.14, 0.20);
    const basePoolY = H * rng.range(0.36, 0.44);
    const leftX = W * 0.1;
    const rightX = W * 0.9;
    const noise = build1DNoiseField(rng, 128);

    const ring: Point[] = [];
    // Top organic edge
    const topSteps = 60;
    for (let i = 0; i <= topSteps; i++) {
      const t = i / topSteps;
      ring.push({
        x: leftX + (rightX - leftX) * t,
        y: topY + noise(t * 4) * baseScale * 0.03,
      });
    }

    // Bottom edge with drips going right -> left
    const dripCount = rng.int(5, 9);
    const dripCenters = Array.from({ length: dripCount }, (_, i) => ({
      t: (i + 0.5) / dripCount + rng.range(-0.04, 0.04),
      width: rng.range(0.025, 0.055),
      length: H * rng.range(0.14, 0.42) * (0.65 + roughNorm * 0.5),
    }));

    const botSteps = 180;
    for (let i = botSteps; i >= 0; i--) {
      const t = i / botSteps;
      let dripY = 0;
      for (const d of dripCenters) {
        const dist = Math.abs(t - d.t);
        if (dist < d.width) {
          const u = 1 - dist / d.width;
          // Rounded viscous bulb profile
          dripY = Math.max(dripY, d.length * Math.pow(Math.sin(u * (Math.PI / 2)), 1.5));
        }
      }
      ring.push({
        x: leftX + (rightX - leftX) * t,
        y: basePoolY + noise(t * 7 + 12) * baseScale * 0.02 + dripY,
      });
    }

    layers.push({
      id: 'paint-drip-main',
      label: 'পেইন্ট ড্রিপ স্ট্রোক',
      pathData: pointsToClosedPath(ring),
      pointsList: [ring],
      fill: params.color,
    });
  }

  const nodeCount = layers.reduce(
    (acc, layer) => acc + layer.pointsList.reduce((s, ring) => s + ring.length, 0),
    0
  );

  return {
    designId: params.designId,
    seedWords: params.seedWords,
    mode: 'paint',
    style: params.style,
    aspectRatio: params.aspectRatio,
    viewBoxWidth: W,
    viewBoxHeight: H,
    layers,
    nodeCount,
    createdAt: Date.now(),
  };
}
