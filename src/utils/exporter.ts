import {
  ASPECT_RATIO_SPECS,
  ExportResolution,
  GeneratedDesign,
  GrainScale,
  Point,
  StudioConfig,
} from '../types/studio';
import { SeededRNG } from './prng';

export function computeLinearGradientCoords(width: number, height: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const halfSpan = (Math.abs(width * cos) + Math.abs(height * sin)) / 2;
  const cx = width / 2;
  const cy = height / 2;
  return {
    x1: cx - cos * halfSpan,
    y1: cy - sin * halfSpan,
    x2: cx + cos * halfSpan,
    y2: cy + sin * halfSpan,
  };
}

/**
 * Generates clean, standards-compliant Editable Vector SVG XML.
 * Every torn paper / paint shape is preserved as an editable <path> node.
 * Optional grain, drop shadow, and linear/radial gradients are written as standard SVG <defs>.
 */
export type FreepikJpegBg = 'white' | 'checker' | 'charcoal';

export function buildEditableSvgString(
  design: GeneratedDesign,
  config: StudioConfig,
  targetResolution?: ExportResolution
): string {
  const { viewBoxWidth: W, viewBoxHeight: H, layers, designId } = design;
  const spec = ASPECT_RATIO_SPECS[design.aspectRatio];
  const outW =
    targetResolution === '8k' ? spec.width8k : targetResolution === '4k' ? spec.width4k : W;
  const outH =
    targetResolution === '8k' ? spec.height8k : targetResolution === '4k' ? spec.height4k : H;

  const grainFreqMap: Record<GrainScale, string> = {
    fine: '0.85',
    medium: '0.52',
    coarse: '0.28',
  };

  const grainSeed = (design.seedWords[0] % 997) + 1;
  const grainOpacity = (config.grainIntensity / 100) * 0.34;
  const shadowSlope = (config.shadowOpacity / 100).toFixed(3);
  const gradId = `paper-grad-${designId}`;

  const defsItems: string[] = [];

  if (config.colorMode === 'gradient') {
    if (config.gradientType === 'linear') {
      const { x1, y1, x2, y2 } = computeLinearGradientCoords(W, H, config.gradientAngle);
      defsItems.push(`    <linearGradient id="${gradId}" gradientUnits="userSpaceOnUse" x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}">
      <stop offset="0%" stop-color="${config.color}" />
      <stop offset="100%" stop-color="${config.gradientColor2}" />
    </linearGradient>`);
    } else {
      const r = Math.max(W, H) * 0.62;
      defsItems.push(`    <radialGradient id="${gradId}" gradientUnits="userSpaceOnUse" cx="${(W / 2).toFixed(2)}" cy="${(H / 2).toFixed(2)}" r="${r.toFixed(2)}">
      <stop offset="0%" stop-color="${config.color}" />
      <stop offset="100%" stop-color="${config.gradientColor2}" />
    </radialGradient>`);
    }
  }

  if (config.grainEnabled) {
    defsItems.push(`    <filter id="paper-grain-${designId}" x="0%" y="0%" width="100%" height="100%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="${grainFreqMap[config.grainScale]}" numOctaves="3" seed="${grainSeed}" result="noise" />
      <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 ${grainOpacity.toFixed(3)} 0" in="noise" result="alphaNoise" />
      <feComposite operator="in" in="alphaNoise" in2="SourceGraphic" result="clippedGrain" />
      <feBlend mode="multiply" in="SourceGraphic" in2="clippedGrain" />
    </filter>`);
  }

  if (config.shadowEnabled) {
    defsItems.push(`    <filter id="paper-shadow-${designId}" x="-15%" y="-15%" width="130%" height="130%" color-interpolation-filters="sRGB">
      <feGaussianBlur in="SourceAlpha" stdDeviation="${config.shadowBlur}" result="blur" />
      <feComponentTransfer in="blur" result="shadowAlpha">
        <feFuncA type="linear" slope="${shadowSlope}" />
      </feComponentTransfer>
      <feMerge>
        <feMergeNode in="shadowAlpha" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>`);
  }

  const defsBlock = defsItems.length > 0 ? `  <defs>\n${defsItems.join('\n')}\n  </defs>\n` : '';

  const layersMarkup = layers
    .map((layer) => {
      const isDeckle = layer.id.includes('deckle');
      const fillVal = !isDeckle && config.colorMode === 'gradient' ? `url(#${gradId})` : layer.fill;
      const attrs = [
        `id="${layer.id}"`,
        `d="${layer.pathData}"`,
        `fill="${fillVal}"`,
        layer.fillRule ? `fill-rule="${layer.fillRule}"` : '',
        layer.opacity !== undefined && layer.opacity < 1 ? `fill-opacity="${layer.opacity}"` : '',
      ]
        .filter(Boolean)
        .join(' ');
      return `      <path ${attrs} />`;
    })
    .join('\n');

  const grainAttr = config.grainEnabled ? ` filter="url(#paper-grain-${designId})"` : '';
  const shadowAttr = config.shadowEnabled ? ` filter="url(#paper-shadow-${designId})"` : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${outW}" height="${outH}">
  <title>${designId} - Kagoj &amp; Rong Studio</title>
${defsBlock}  <g id="shadow-wrapper-${designId}"${shadowAttr}>
    <g id="artwork-${designId}"${grainAttr}>
${layersMarkup}
    </g>
  </g>
</svg>
`;
}

/**
 * Generates a tileable offscreen grain noise canvas seeded deterministically
 * by the current design seed so PNG exports match the tactile aesthetic crisply at 4K & 8K.
 */
function createGrainTileCanvas(
  seedWords: [number, number, number, number],
  intensity: number,
  grainScale: GrainScale
): HTMLCanvasElement {
  const tileSize = grainScale === 'fine' ? 384 : grainScale === 'medium' ? 256 : 192;
  const tile = document.createElement('canvas');
  tile.width = tileSize;
  tile.height = tileSize;
  const tctx = tile.getContext('2d');
  if (!tctx) return tile;

  const imgData = tctx.createImageData(tileSize, tileSize);
  const data = imgData.data;
  const rng = new SeededRNG(seedWords);
  const alphaMax = Math.round((intensity / 100) * 68);

  for (let i = 0; i < data.length; i += 4) {
    const v = rng.next();
    if (v > 0.5) {
      data[i] = 20;
      data[i + 1] = 18;
      data[i + 2] = 15;
      data[i + 3] = Math.round((v - 0.5) * 2 * alphaMax);
    } else {
      data[i] = 250;
      data[i + 1] = 248;
      data[i + 2] = 242;
      data[i + 3] = Math.round((0.5 - v) * 2 * (alphaMax * 0.72));
    }
  }
  tctx.putImageData(imgData, 0, 0);
  return tile;
}

function traceRingsOnCanvas(ctx: CanvasRenderingContext2D, rings: Point[][], scaleX: number, scaleY: number) {
  ctx.beginPath();
  for (const ring of rings) {
    if (ring.length === 0) continue;
    ctx.moveTo(ring[0].x * scaleX, ring[0].y * scaleY);
    for (let i = 1; i < ring.length; i++) {
      ctx.lineTo(ring[i].x * scaleX, ring[i].y * scaleY);
    }
    ctx.closePath();
  }
}

function createCheckerboardTile(scaleMultiplier: number): HTMLCanvasElement {
  const sq = Math.max(24, Math.round(28 * scaleMultiplier));
  const tile = document.createElement('canvas');
  tile.width = sq * 2;
  tile.height = sq * 2;
  const tctx = tile.getContext('2d');
  if (!tctx) return tile;
  tctx.fillStyle = '#F2F1EC';
  tctx.fillRect(0, 0, sq * 2, sq * 2);
  tctx.fillStyle = '#E2E0D8';
  tctx.fillRect(sq, 0, sq, sq);
  tctx.fillRect(0, sq, sq, sq);
  return tile;
}

function renderDesignOnCanvas(
  ctx: CanvasRenderingContext2D,
  design: GeneratedDesign,
  config: StudioConfig,
  resolution: ExportResolution,
  targetWidth: number,
  targetHeight: number
) {
  const scaleX = targetWidth / design.viewBoxWidth;
  const scaleY = targetHeight / design.viewBoxHeight;

  // Pass 1: Optional smooth drop shadow rendered via offscreen-translated source so shadow never muddies white deckle fibers
  if (config.shadowEnabled) {
    const blurPx = config.shadowBlur * 1.9 * scaleX;
    const offscreenShift = targetWidth * 2 + Math.ceil(blurPx * 4) + 200;
    ctx.save();
    ctx.shadowColor = `rgba(0, 0, 0, ${(config.shadowOpacity / 100).toFixed(3)})`;
    ctx.shadowBlur = blurPx;
    ctx.shadowOffsetX = offscreenShift;
    ctx.shadowOffsetY = 0;
    ctx.translate(-offscreenShift, 0);

    for (const layer of design.layers) {
      ctx.save();
      ctx.globalAlpha = layer.opacity ?? 1;
      ctx.fillStyle = '#000000';
      traceRingsOnCanvas(ctx, layer.pointsList, scaleX, scaleY);
      ctx.fill(layer.fillRule === 'evenodd' ? 'evenodd' : 'nonzero');
      ctx.restore();
    }
    ctx.restore();
  }

  // Pass 2: Prepare gradient fill if enabled
  let gradientFill: CanvasGradient | null = null;
  if (config.colorMode === 'gradient') {
    if (config.gradientType === 'linear') {
      const { x1, y1, x2, y2 } = computeLinearGradientCoords(
        targetWidth,
        targetHeight,
        config.gradientAngle
      );
      gradientFill = ctx.createLinearGradient(x1, y1, x2, y2);
    } else {
      const r = Math.max(targetWidth, targetHeight) * 0.62;
      gradientFill = ctx.createRadialGradient(
        targetWidth / 2,
        targetHeight / 2,
        0,
        targetWidth / 2,
        targetHeight / 2,
        r
      );
    }
    gradientFill.addColorStop(0, config.color);
    gradientFill.addColorStop(1, config.gradientColor2);
  }

  // Pass 3: Draw crisp solid/gradient vector layers & clipped paper grain
  let grainPattern: CanvasPattern | null = null;
  if (config.grainEnabled) {
    const grainTile = createGrainTileCanvas(design.seedWords, config.grainIntensity, config.grainScale);
    const grainScaleMultiplier =
      (resolution === '8k' ? 2.4 : 1.35) *
      (config.grainScale === 'coarse' ? 2.2 : config.grainScale === 'medium' ? 1.4 : 1.0);
    grainPattern = ctx.createPattern(grainTile, 'repeat');
    if (grainPattern && typeof grainPattern.setTransform === 'function') {
      grainPattern.setTransform(new DOMMatrix().scale(grainScaleMultiplier, grainScaleMultiplier));
    }
  }

  for (const layer of design.layers) {
    const isDeckle = layer.id.includes('deckle');
    const fillRule = layer.fillRule === 'evenodd' ? 'evenodd' : 'nonzero';
    ctx.save();
    ctx.globalAlpha = layer.opacity ?? 1;
    ctx.fillStyle = !isDeckle && gradientFill ? gradientFill : layer.fill;
    traceRingsOnCanvas(ctx, layer.pointsList, scaleX, scaleY);
    ctx.fill(fillRule);

    if (grainPattern && !isDeckle) {
      ctx.clip(fillRule);
      ctx.fillStyle = grainPattern;
      ctx.fillRect(0, 0, targetWidth, targetHeight);
    }
    ctx.restore();
  }
}

/**
 * Renders 100% True Transparent 4K or 8K PNG directly from exact vector geometry.
 * Pixels outside the torn paper / shadow silhouette remain strictly alpha = 0.
 */
export async function renderTransparentPngBlob(
  design: GeneratedDesign,
  config: StudioConfig,
  resolution: ExportResolution
): Promise<{ blob: Blob; width: number; height: number }> {
  const spec = ASPECT_RATIO_SPECS[design.aspectRatio];
  const targetWidth = resolution === '8k' ? spec.width8k : spec.width4k;
  const targetHeight = resolution === '8k' ? spec.height8k : spec.height4k;

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) {
    throw new Error('ক্যানভাস রেন্ডারিং কনটেক্সট তৈরি করা যায়নি।');
  }

  // Ensure completely transparent background (alpha = 0)
  ctx.clearRect(0, 0, targetWidth, targetHeight);
  renderDesignOnCanvas(ctx, design, config, resolution, targetWidth, targetHeight);

  // Yield briefly so UI remains responsive before PNG encoding
  await new Promise((resolve) => setTimeout(resolve, 20));

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error('PNG ফাইল এনকোডিং ব্যর্থ হয়েছে।'));
      },
      'image/png',
      1.0
    );
  });

  canvas.width = 0;
  canvas.height = 0;

  return { blob, width: targetWidth, height: targetHeight };
}

/**
 * Renders high-quality 4K or 8K JPEG for Freepik paired vector submission.
 */
export async function renderFreepikJpegBlob(
  design: GeneratedDesign,
  config: StudioConfig,
  resolution: ExportResolution,
  background: FreepikJpegBg
): Promise<{ blob: Blob; width: number; height: number }> {
  const spec = ASPECT_RATIO_SPECS[design.aspectRatio];
  const targetWidth = resolution === '8k' ? spec.width8k : spec.width4k;
  const targetHeight = resolution === '8k' ? spec.height8k : spec.height4k;

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) {
    throw new Error('ক্যানভাস রেন্ডারিং কনটেক্সট তৈরি করা যায়নি।');
  }

  if (background === 'checker') {
    const checkerTile = createCheckerboardTile(resolution === '8k' ? 2.2 : 1.15);
    const pat = ctx.createPattern(checkerTile, 'repeat');
    ctx.fillStyle = pat || '#F2F1EC';
    ctx.fillRect(0, 0, targetWidth, targetHeight);
  } else {
    ctx.fillStyle = background === 'charcoal' ? '#181715' : '#FFFFFF';
    ctx.fillRect(0, 0, targetWidth, targetHeight);
  }

  renderDesignOnCanvas(ctx, design, config, resolution, targetWidth, targetHeight);

  await new Promise((resolve) => setTimeout(resolve, 20));

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error('JPEG ফাইল এনকোডিং ব্যর্থ হয়েছে।'));
      },
      'image/jpeg',
      0.96
    );
  });

  canvas.width = 0;
  canvas.height = 0;

  return { blob, width: targetWidth, height: targetHeight };
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
