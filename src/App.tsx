/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useState } from 'react';
import { Header } from './components/Header';
import { ModeSelector } from './components/ModeSelector';
import { StudioWorkspace } from './components/StudioWorkspace';
import { generatePaintDesign } from './generators/paintGenerator';
import { generateTornPaperDesign } from './generators/tornPaperGenerator';
import {
  GeneratedDesign,
  PaintStyle,
  StudioConfig,
  StudioMode,
  TornPaperStyle,
} from './types/studio';
import { getLifetimeMintCount, issueLifetimeUniqueSeed } from './utils/prng';

const INITIAL_CONFIG: StudioConfig = {
  mode: 'torn-paper',
  tornStyle: 'split-gap',
  paintStyle: 'dry-brush',
  colorMode: 'solid',
  color: '#2B2A27',
  gradientColor2: '#686662',
  gradientType: 'linear',
  gradientAngle: 180,
  grainEnabled: false,
  grainIntensity: 48,
  grainScale: 'medium',
  roughness: 62,
  detailDensity: 72,
  thickness: 52,
  deckleHighlight: true,
  deckleOpacity: 92,
  shadowEnabled: true,
  shadowOpacity: 38,
  shadowBlur: 18,
  aspectRatio: '16:9',
  backdrop: 'checker-light',
};

function buildGeometryFromSeed(
  designId: string,
  seedWords: [number, number, number, number],
  cfg: StudioConfig
): GeneratedDesign {
  if (cfg.mode === 'torn-paper') {
    return generateTornPaperDesign({
      designId,
      seedWords,
      style: cfg.tornStyle,
      color: cfg.color,
      roughness: cfg.roughness,
      detailDensity: cfg.detailDensity,
      thickness: cfg.thickness,
      deckleHighlight: cfg.deckleHighlight,
      deckleOpacity: cfg.deckleOpacity,
      aspectRatio: cfg.aspectRatio,
    });
  }
  return generatePaintDesign({
    designId,
    seedWords,
    style: cfg.paintStyle,
    color: cfg.color,
    roughness: cfg.roughness,
    detailDensity: cfg.detailDensity,
    aspectRatio: cfg.aspectRatio,
  });
}

export default function App() {
  const [viewMode, setViewMode] = useState<StudioMode>('home');
  const [config, setConfig] = useState<StudioConfig>(INITIAL_CONFIG);

  const [currentDesign, setCurrentDesign] = useState<GeneratedDesign>(() => {
    const initialSeed = issueLifetimeUniqueSeed('TP');
    return buildGeometryFromSeed(
      initialSeed.designId,
      initialSeed.seedWords,
      INITIAL_CONFIG
    );
  });

  const [lifetimeMintCount, setLifetimeMintCount] = useState<number>(() =>
    getLifetimeMintCount()
  );

  const [sessionHistory, setSessionHistory] = useState<GeneratedDesign[]>([]);

  const mintNewUniqueDesign = useCallback(
    (targetConfig: StudioConfig) => {
      if (targetConfig.mode === 'paint') return;
      const { designId, seedWords, mintNumber } = issueLifetimeUniqueSeed('TP');
      const nextDesign = buildGeometryFromSeed(designId, seedWords, targetConfig);
      setLifetimeMintCount(mintNumber);
      setCurrentDesign(nextDesign);
      setSessionHistory((prev) => [nextDesign, ...prev].slice(0, 24));
    },
    []
  );

  const handleEnterStudio = useCallback(
    (targetMode: 'torn-paper' | 'paint') => {
      const nextConfig: StudioConfig = {
        ...config,
        mode: targetMode,
      };
      setConfig(nextConfig);
      setViewMode(targetMode);
      if (targetMode === 'torn-paper') {
        mintNewUniqueDesign(nextConfig);
      }
    },
    [config, mintNewUniqueDesign]
  );

  const handleNavigate = useCallback(
    (target: StudioMode) => {
      if (target === 'home') {
        setViewMode('home');
      } else {
        handleEnterStudio(target);
      }
    },
    [handleEnterStudio]
  );

  const handleUpdateConfig = useCallback(
    (patch: Partial<StudioConfig>, regenerate = false) => {
      const next = { ...config, ...patch };
      setConfig(next);
      if (regenerate) {
        mintNewUniqueDesign(next);
      } else {
        const updated = buildGeometryFromSeed(
          currentDesign.designId,
          currentDesign.seedWords,
          next
        );
        setCurrentDesign(updated);
        setSessionHistory((hist) =>
          hist.map((h) => (h.designId === updated.designId ? updated : h))
        );
      }
    },
    [config, currentDesign, mintNewUniqueDesign]
  );

  const handleSelectHistoryItem = useCallback((item: GeneratedDesign) => {
    setCurrentDesign(item);
    setConfig((prev) => ({
      ...prev,
      mode: item.mode,
      aspectRatio: item.aspectRatio,
      color: item.layers[0]?.fill ?? prev.color,
      ...(item.mode === 'torn-paper'
        ? { tornStyle: item.style as TornPaperStyle }
        : { paintStyle: item.style as PaintStyle }),
    }));
    setViewMode(item.mode);
  }, []);

  // Spacebar shortcut inside studio workspace for effortless 1-click unique generation
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (viewMode === 'home') return;
      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'button') return;
      if (e.code === 'Space') {
        e.preventDefault();
        mintNewUniqueDesign(config);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [viewMode, config, mintNewUniqueDesign]);

  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden flex flex-col bg-[#F6F5F1] text-[#171614]">
      <Header
        activeMode={viewMode}
        onNavigate={handleNavigate}
        onQuickGenerate={() => {
          if (viewMode === 'home' || viewMode === 'paint') {
            handleEnterStudio('torn-paper');
          } else {
            mintNewUniqueDesign(config);
          }
        }}
      />

      <div className="flex-1 min-h-0 overflow-y-auto lg:overflow-hidden">
        {viewMode === 'home' ? (
          <ModeSelector
            onSelectMode={handleEnterStudio}
            lifetimeMintCount={lifetimeMintCount}
          />
        ) : (
          <StudioWorkspace
            config={config}
            currentDesign={currentDesign}
            sessionHistory={sessionHistory}
            lifetimeMintCount={lifetimeMintCount}
            onUpdateConfig={handleUpdateConfig}
            onGenerateNew={() => mintNewUniqueDesign(config)}
            onSelectHistoryItem={handleSelectHistoryItem}
            onSwitchMode={handleEnterStudio}
            onBackHome={() => setViewMode('home')}
          />
        )}
      </div>

      {viewMode === 'home' && (
        <footer className="shrink-0 border-t border-[#E3E0D7] bg-[#F6F5F1] py-3.5 px-6">
          <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#6B675E]">
            <span>কাগজ ও রঙ স্টুডিও · লাইফটাইম ইউনিক প্রসিডিউরাল ডিজাইন</span>
            <span>4K / 8K True Transparent PNG · Editable SVG Vector</span>
          </div>
        </footer>
      )}
    </div>
  );
}
