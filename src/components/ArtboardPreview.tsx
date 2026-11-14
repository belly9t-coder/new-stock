import React from 'react';
import {
  ASPECT_RATIO_SPECS,
  GeneratedDesign,
  GrainScale,
  PAINT_STYLES,
  PreviewBackdrop,
  StudioConfig,
  TORN_PAPER_STYLES,
} from '../types/studio';
import { computeLinearGradientCoords } from '../utils/exporter';

interface ArtboardPreviewProps {
  design: GeneratedDesign;
  config: StudioConfig;
}

export const ArtboardPreview: React.FC<ArtboardPreviewProps> = ({ design, config }) => {
  const spec = ASPECT_RATIO_SPECS[design.aspectRatio];
  const grainFilterId = `live-grain-${design.designId}`;
  const shadowFilterId = `live-shadow-${design.designId}`;
  const gradId = `live-grad-${design.designId}`;

  const grainFreqMap: Record<GrainScale, string> = {
    fine: '0.85',
    medium: '0.52',
    coarse: '0.28',
  };

  const grainSeed = (design.seedWords[0] % 997) + 1;
  const grainOpacity = (config.grainIntensity / 100) * 0.34;
  const shadowSlope = (config.shadowOpacity / 100).toFixed(3);
  const linearCoords = computeLinearGradientCoords(
    design.viewBoxWidth,
    design.viewBoxHeight,
    config.gradientAngle
  );
  const radialRadius = Math.max(design.viewBoxWidth, design.viewBoxHeight) * 0.62;

  const backdropClassMap: Record<PreviewBackdrop, string> = {
    'checker-light': 'checkerboard-bg',
    'checker-dark': 'checkerboard-dark-bg',
    white: 'bg-white',
    charcoal: 'bg-[#181715]',
  };

  const styleNameBn =
    design.mode === 'torn-paper'
      ? TORN_PAPER_STYLES.find((s) => s.id === design.style)?.nameBn ?? design.style
      : PAINT_STYLES.find((s) => s.id === design.style)?.nameBn ?? design.style;

  const hasDefs =
    config.grainEnabled || config.shadowEnabled || config.colorMode === 'gradient';
  const ratio = design.viewBoxWidth / design.viewBoxHeight;

  return (
    <div className="flex flex-col items-center w-full h-full min-h-0">
      <div
        className="flex-1 min-h-0 w-full flex items-center justify-center"
        style={{ containerType: 'size' }}
      >
        <div
          className={`relative border border-[#D8D4C9] rounded-lg overflow-hidden flex items-center justify-center transition-colors ${backdropClassMap[config.backdrop]}`}
          style={{
            width: `min(100cqw, calc(100cqh * ${ratio}))`,
            height: `min(100cqh, calc(100cqw / ${ratio}))`,
          }}
        >
          <svg
            viewBox={`0 0 ${design.viewBoxWidth} ${design.viewBoxHeight}`}
            className="w-full h-full block"
            role="img"
            aria-label={`${styleNameBn} - ${design.designId}`}
          >
            {hasDefs && (
              <defs>
                {config.colorMode === 'gradient' &&
                  (config.gradientType === 'linear' ? (
                    <linearGradient
                      id={gradId}
                      gradientUnits="userSpaceOnUse"
                      x1={linearCoords.x1}
                      y1={linearCoords.y1}
                      x2={linearCoords.x2}
                      y2={linearCoords.y2}
                    >
                      <stop offset="0%" stopColor={config.color} />
                      <stop offset="100%" stopColor={config.gradientColor2} />
                    </linearGradient>
                  ) : (
                    <radialGradient
                      id={gradId}
                      gradientUnits="userSpaceOnUse"
                      cx={design.viewBoxWidth / 2}
                      cy={design.viewBoxHeight / 2}
                      r={radialRadius}
                    >
                      <stop offset="0%" stopColor={config.color} />
                      <stop offset="100%" stopColor={config.gradientColor2} />
                    </radialGradient>
                  ))}
                {config.grainEnabled && (
                  <filter
                    id={grainFilterId}
                    x="0%"
                    y="0%"
                    width="100%"
                    height="100%"
                    colorInterpolationFilters="sRGB"
                  >
                    <feTurbulence
                      type="fractalNoise"
                      baseFrequency={grainFreqMap[config.grainScale]}
                      numOctaves={3}
                      seed={grainSeed}
                      result="noise"
                    />
                    <feColorMatrix
                      type="matrix"
                      values={`0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 ${grainOpacity.toFixed(3)} 0`}
                      in="noise"
                      result="alphaNoise"
                    />
                    <feComposite
                      operator="in"
                      in="alphaNoise"
                      in2="SourceGraphic"
                      result="clippedGrain"
                    />
                    <feBlend mode="multiply" in="SourceGraphic" in2="clippedGrain" />
                  </filter>
                )}
                {config.shadowEnabled && (
                  <filter
                    id={shadowFilterId}
                    x="-15%"
                    y="-15%"
                    width="130%"
                    height="130%"
                    colorInterpolationFilters="sRGB"
                  >
                    <feGaussianBlur
                      in="SourceAlpha"
                      stdDeviation={config.shadowBlur}
                      result="blur"
                    />
                    <feComponentTransfer in="blur" result="shadowAlpha">
                      <feFuncA type="linear" slope={shadowSlope} />
                    </feComponentTransfer>
                    <feMerge>
                      <feMergeNode in="shadowAlpha" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                )}
              </defs>
            )}

            <g filter={config.shadowEnabled ? `url(#${shadowFilterId})` : undefined}>
              <g filter={config.grainEnabled ? `url(#${grainFilterId})` : undefined}>
                {design.layers.map((layer) => {
                  const isDeckle = layer.id.includes('deckle');
                  const fillVal =
                    !isDeckle && config.colorMode === 'gradient'
                      ? `url(#${gradId})`
                      : layer.fill;
                  return (
                    <path
                      key={layer.id}
                      d={layer.pathData}
                      fill={fillVal}
                      fillOpacity={layer.opacity ?? 1}
                      fillRule={layer.fillRule}
                    />
                  );
                })}
              </g>
            </g>
          </svg>
        </div>
      </div>

      {/* Clean unboxed tabular metadata line below artboard */}
      <div className="shrink-0 mt-2.5 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-0.5 text-[11px] text-[#6B675E]">
        <span className="font-mono-tabular font-medium text-[#171614]">{design.designId}</span>
        <span aria-hidden="true">·</span>
        <span>{styleNameBn}</span>
        <span aria-hidden="true">·</span>
        <span className="font-mono-tabular">
          4K: {spec.width4k}×{spec.height4k}
        </span>
        <span aria-hidden="true">·</span>
        <span className="font-mono-tabular">
          8K: {spec.width8k}×{spec.height8k}
        </span>
        <span aria-hidden="true">·</span>
        <span className="font-mono-tabular">{design.nodeCount} নোড</span>
      </div>
    </div>
  );
};
