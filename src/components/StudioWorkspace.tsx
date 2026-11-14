import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowLeftRight,
  Check,
  Copy,
  Download,
  FileCode2,
  Loader2,
  Package,
  Sparkles,
  X,
} from 'lucide-react';
import {
  ASPECT_RATIO_SPECS,
  AspectRatioPreset,
  ExportResolution,
  GeneratedDesign,
  GRADIENT_PRESETS,
  GradientType,
  GrainScale,
  PreviewBackdrop,
  SOLID_SWATCHES,
  StudioConfig,
  TORN_PAPER_STYLES,
  TornPaperStyle,
} from '../types/studio';
import {
  buildEditableSvgString,
  downloadBlob,
  FreepikJpegBg,
  renderFreepikJpegBlob,
  renderTransparentPngBlob,
} from '../utils/exporter';
import { ArtboardPreview } from './ArtboardPreview';

interface StudioWorkspaceProps {
  config: StudioConfig;
  currentDesign: GeneratedDesign;
  sessionHistory: GeneratedDesign[];
  lifetimeMintCount: number;
  onUpdateConfig: (patch: Partial<StudioConfig>, regenerate?: boolean) => void;
  onGenerateNew: () => void;
  onSelectHistoryItem: (item: GeneratedDesign) => void;
  onSwitchMode: (mode: 'torn-paper' | 'paint') => void;
  onBackHome: () => void;
}

export const StudioWorkspace: React.FC<StudioWorkspaceProps> = ({
  config,
  currentDesign,
  sessionHistory,
  lifetimeMintCount,
  onUpdateConfig,
  onGenerateNew,
  onSelectHistoryItem,
  onSwitchMode,
  onBackHome,
}) => {
  const [exportingRes, setExportingRes] = useState<ExportResolution | null>(null);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [copiedSvg, setCopiedSvg] = useState(false);

  const [freepikModalOpen, setFreepikModalOpen] = useState(false);
  const [freepikRes, setFreepikRes] = useState<ExportResolution>('4k');
  const [freepikBaseName, setFreepikBaseName] = useState(currentDesign.designId.toLowerCase());
  const [freepikBg, setFreepikBg] = useState<FreepikJpegBg>('white');
  const [freepikExporting, setFreepikExporting] = useState(false);

  const spec = ASPECT_RATIO_SPECS[config.aspectRatio];

  useEffect(() => {
    setFreepikBaseName(currentDesign.designId.toLowerCase());
  }, [currentDesign.designId]);

  useEffect(() => {
    if (!freepikModalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !freepikExporting) {
        setFreepikModalOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [freepikModalOpen, freepikExporting]);

  const sanitizedFreepikName =
    freepikBaseName
      .trim()
      .replace(/[^a-zA-Z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '') || currentDesign.designId.toLowerCase();

  const openFreepikModal = () => {
    setFreepikBaseName(currentDesign.designId.toLowerCase());
    setFreepikModalOpen(true);
  };

  const handleFreepikExport = async () => {
    if (freepikExporting) return;
    setFreepikExporting(true);
    setExportMessage(null);
    try {
      const { blob: jpegBlob } = await renderFreepikJpegBlob(
        currentDesign,
        config,
        freepikRes,
        freepikBg
      );
      const svgText = buildEditableSvgString(currentDesign, config, freepikRes);
      const svgBlob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });

      downloadBlob(jpegBlob, `${sanitizedFreepikName}.jpg`);
      await new Promise((resolve) => setTimeout(resolve, 220));
      downloadBlob(svgBlob, `${sanitizedFreepikName}.svg`);

      setFreepikModalOpen(false);
      setExportMessage(
        `Freepik (${freepikRes.toUpperCase()}): ${sanitizedFreepikName}.jpg ও .svg এক্সপোর্ট হয়েছে`
      );
      setTimeout(() => setExportMessage(null), 4500);
    } catch (err) {
      setExportMessage(err instanceof Error ? err.message : 'Freepik এক্সপোর্ট ব্যর্থ হয়েছে।');
    } finally {
      setFreepikExporting(false);
    }
  };

  const handlePngExport = async (resolution: ExportResolution) => {
    if (exportingRes) return;
    setExportingRes(resolution);
    setExportMessage(null);
    try {
      const { blob, width, height } = await renderTransparentPngBlob(
        currentDesign,
        config,
        resolution
      );
      const extName = `${currentDesign.designId.toLowerCase()}-${resolution}-${width}x${height}.png`;
      downloadBlob(blob, extName);
      setExportMessage(`${resolution.toUpperCase()} (${width}×${height}) ডাউনলোড হয়েছে`);
      setTimeout(() => setExportMessage(null), 3500);
    } catch (err) {
      setExportMessage(err instanceof Error ? err.message : 'এক্সপোর্ট করতে সমস্যা হয়েছে।');
    } finally {
      setExportingRes(null);
    }
  };

  const handleSvgDownload = () => {
    const svgText = buildEditableSvgString(currentDesign, config);
    const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
    downloadBlob(blob, `${currentDesign.designId.toLowerCase()}-editable-vector.svg`);
    setExportMessage('এডিটেবল SVG ভেক্টর ডাউনলোড হয়েছে');
    setTimeout(() => setExportMessage(null), 3500);
  };

  const handleCopySvg = async () => {
    const svgText = buildEditableSvgString(currentDesign, config);
    try {
      await navigator.clipboard.writeText(svgText);
      setCopiedSvg(true);
      setTimeout(() => setCopiedSvg(false), 2000);
    } catch {
      setExportMessage('ক্লিপবোর্ডে কপি করা যায়নি।');
    }
  };

  const handleHexInput = (val: string, target: 'color' | 'gradientColor2' = 'color') => {
    const formatted = val.startsWith('#') ? val : `#${val}`;
    onUpdateConfig({ [target]: formatted });
  };

  if (config.mode === 'paint') {
    return (
      <div className="max-w-[960px] mx-auto px-6 py-12 h-full flex items-center justify-center">
        <div className="bg-white border border-[#E3E0D7] rounded-xl p-10 sm:p-12 text-center w-full">
          <p className="text-xs font-medium text-[#6B675E] mb-2">
            পেইন্ট স্টুডিও · খালি রাখা হয়েছে
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#171614] mb-3">
            Paint অপশনটি আপাতত খালি রাখা হয়েছে
          </h1>
          <p className="text-sm text-[#57544D] max-w-md mx-auto mb-7 leading-relaxed">
            এখনই আপনি Torn Paper স্টুডিও থেকে সকল ধরনের ছেঁড়া কাগজের ডিজাইন (উপর-নিচ ছেঁড়া ও মাঝে ফাঁকাসহ) ৪কে/৮কে এবং ভেক্টরে তৈরি করতে পারবেন।
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => onSwitchMode('torn-paper')}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-[#171614] hover:bg-[#D94826] rounded-lg transition-colors cursor-pointer"
            >
              Torn Paper স্টুডিওতে যান
            </button>
            <button
              type="button"
              onClick={onBackHome}
              className="px-5 py-2.5 text-sm font-medium text-[#171614] bg-[#F3F1EB] hover:bg-[#E7E4DC] border border-[#D8D4C9] rounded-lg transition-colors cursor-pointer"
            >
              হোমে ফিরুন
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1440px] w-full mx-auto px-4 py-3 lg:h-full lg:overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-[288px_1fr_292px] gap-4 lg:h-full min-h-0">
        {/* LEFT RAIL: Mode, 1-Click Generator, Styles, Geometry, Aspect Ratio */}
        <aside className="bg-white border border-[#E3E0D7] rounded-xl p-4 flex flex-col justify-between gap-3.5 lg:h-full lg:overflow-y-auto min-h-0">
          <div className="space-y-3.5">
            {/* Back + Mint Count */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={onBackHome}
                className="inline-flex items-center gap-1 text-xs font-medium text-[#57544D] hover:text-[#171614] cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>অপশন নির্বাচন</span>
              </button>
              <span className="text-[11px] font-mono-tabular text-[#6B675E]">
                মোট: {lifetimeMintCount}
              </span>
            </div>

            {/* Mode Segmented Switcher */}
            <div className="grid grid-cols-2 gap-1 p-1 bg-[#F3F1EB] rounded-lg">
              <button
                type="button"
                onClick={() => onSwitchMode('torn-paper')}
                className="py-1.5 px-2 text-xs font-semibold rounded-md bg-white text-[#171614] shadow-xs whitespace-nowrap cursor-pointer"
              >
                ছেঁড়া কাগজ
              </button>
              <button
                type="button"
                onClick={() => onSwitchMode('paint')}
                className="py-1.5 px-2 text-xs font-semibold rounded-md text-[#57544D] hover:text-[#171614] transition-colors whitespace-nowrap cursor-pointer"
              >
                পেইন্ট (খালি)
              </button>
            </div>

            {/* 1-Click Unique Generator */}
            <div>
              <button
                type="button"
                onClick={onGenerateNew}
                className="w-full py-2.5 px-3 bg-[#D94826] hover:bg-[#BC391B] active:scale-[0.99] text-white text-xs sm:text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>১-ক্লিকে নতুন ইউনিক তৈরি</span>
              </button>
              <p className="text-[10px] text-[#6B675E] text-center mt-1">
                কী-বোর্ড শর্টকাট: <kbd className="font-mono-tabular px-1 bg-[#F3F1EB] rounded text-[#171614]">Space</kbd>
              </p>
            </div>

            <hr className="border-[#ECEAE3]" />

            {/* Torn Paper Styles */}
            <div>
              <h2 className="text-xs font-semibold text-[#171614] mb-2">
                ছেঁড়া কাগজের স্টাইল
              </h2>
              <div className="grid grid-cols-2 gap-1.5">
                {TORN_PAPER_STYLES.map((style) => {
                  const active = config.tornStyle === style.id;
                  return (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() =>
                        onUpdateConfig({ tornStyle: style.id as TornPaperStyle }, true)
                      }
                      title={style.descriptionBn}
                      className={`text-left px-2.5 py-2 rounded-lg border text-[11px] transition-colors cursor-pointer ${
                        active
                          ? 'border-[#171614] bg-[#171614] text-white font-semibold'
                          : 'border-[#E3E0D7] bg-[#FAF9F6] text-[#171614] hover:border-[#ABA69B]'
                      } ${style.id === 'split-gap' ? 'col-span-2' : ''}`}
                    >
                      <span className="block truncate">{style.nameBn}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <hr className="border-[#ECEAE3]" />

            {/* Geometry & Thickness Sliders */}
            <div className="space-y-2.5">
              <h2 className="text-xs font-semibold text-[#171614]">আকৃতি ও পুরুত্ব</h2>

              <div>
                <div className="flex justify-between text-[11px] text-[#57544D] mb-1">
                  <span>
                    {config.tornStyle === 'split-gap'
                      ? 'কাগজের পুরুত্ব (মাঝের ফাঁকা)'
                      : 'কাগজের পুরুত্ব'}
                  </span>
                  <span className="font-mono-tabular">{config.thickness}%</span>
                </div>
                <input
                  type="range"
                  min={12}
                  max={88}
                  value={config.thickness}
                  onChange={(e) => onUpdateConfig({ thickness: Number(e.target.value) })}
                  className="w-full studio-slider"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-[#57544D] mb-1">
                  <span>ছেঁড়ার গভীরতা</span>
                  <span className="font-mono-tabular">{config.roughness}%</span>
                </div>
                <input
                  type="range"
                  min={15}
                  max={100}
                  value={config.roughness}
                  onChange={(e) => onUpdateConfig({ roughness: Number(e.target.value) })}
                  className="w-full studio-slider"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-[#57544D] mb-1">
                  <span>প্রান্তের সূক্ষ্মতা</span>
                  <span className="font-mono-tabular">{config.detailDensity}%</span>
                </div>
                <input
                  type="range"
                  min={20}
                  max={100}
                  value={config.detailDensity}
                  onChange={(e) => onUpdateConfig({ detailDensity: Number(e.target.value) })}
                  className="w-full studio-slider"
                />
              </div>
            </div>
          </div>

          {/* Aspect Ratio at bottom of Left Rail */}
          <div className="pt-2 border-t border-[#ECEAE3]">
            <h2 className="text-xs font-semibold text-[#171614] mb-2">ক্যানভাস অনুপাত</h2>
            <div className="grid grid-cols-2 gap-1.5">
              {(Object.keys(ASPECT_RATIO_SPECS) as AspectRatioPreset[]).map((ratio) => {
                const active = config.aspectRatio === ratio;
                return (
                  <button
                    key={ratio}
                    type="button"
                    onClick={() => onUpdateConfig({ aspectRatio: ratio })}
                    className={`py-1.5 px-2 rounded-md border text-[11px] transition-colors cursor-pointer ${
                      active
                        ? 'border-[#171614] bg-[#171614] text-white font-semibold'
                        : 'border-[#E3E0D7] bg-[#FAF9F6] text-[#171614] hover:border-[#ABA69B]'
                    }`}
                  >
                    {ASPECT_RATIO_SPECS[ratio].label}
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* CENTER VIEWPORT: Live Auto-Fit Artboard + Export Bar + Compact History */}
        <section className="bg-white border border-[#E3E0D7] rounded-xl p-4 flex flex-col justify-between gap-3 lg:h-full min-h-[480px] lg:min-h-0">
          {/* Top Backdrop Switcher */}
          <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[#ECEAE3]">
            <div className="text-xs text-[#57544D]">
              <span className="font-semibold text-[#171614]">লাইভ ক্যানভাস</span>
              <span className="mx-1.5" aria-hidden="true">·</span>
              <span className="hidden sm:inline">PNG এক্সপোর্ট ১০০% স্বচ্ছ (Transparent)</span>
            </div>

            <div className="flex items-center gap-1 p-0.5 bg-[#F3F1EB] rounded-lg">
              {(
                [
                  { id: 'checker-light', label: 'স্বচ্ছ' },
                  { id: 'checker-dark', label: 'ডার্ক' },
                  { id: 'white', label: 'সাদা' },
                  { id: 'charcoal', label: 'কালো' },
                ] as { id: PreviewBackdrop; label: string }[]
              ).map((bg) => (
                <button
                  key={bg.id}
                  type="button"
                  onClick={() => onUpdateConfig({ backdrop: bg.id })}
                  className={`px-2.5 py-1 text-[11px] rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                    config.backdrop === bg.id
                      ? 'bg-white text-[#171614] font-semibold shadow-xs'
                      : 'text-[#57544D] hover:text-[#171614]'
                  }`}
                >
                  {bg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Central Auto-Fit Artboard */}
          <div className="flex-1 min-h-0 flex items-center justify-center py-1">
            <ArtboardPreview design={currentDesign} config={config} />
          </div>

          {/* Bottom Export Dock + Optional Compact History */}
          <div className="shrink-0 pt-3 border-t border-[#ECEAE3] space-y-2.5">
            {sessionHistory.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <span className="text-[11px] font-medium text-[#6B675E] shrink-0">
                  সাম্প্রতিক ({sessionHistory.length}):
                </span>
                <div className="flex items-center gap-1.5">
                  {sessionHistory.slice(0, 10).map((item) => {
                    const isCurrent = item.designId === currentDesign.designId;
                    return (
                      <button
                        key={item.designId}
                        type="button"
                        onClick={() => onSelectHistoryItem(item)}
                        title={item.designId}
                        className={`w-12 h-8 shrink-0 rounded border overflow-hidden checkerboard-bg transition-all cursor-pointer ${
                          isCurrent
                            ? 'border-[#D94826] ring-1 ring-[#D94826]'
                            : 'border-[#E3E0D7] hover:border-[#171614]'
                        }`}
                      >
                        <svg
                          viewBox={`0 0 ${item.viewBoxWidth} ${item.viewBoxHeight}`}
                          className="w-full h-full"
                        >
                          {item.layers.map((layer) => (
                            <path
                              key={layer.id}
                              d={layer.pathData}
                              fill={layer.fill}
                              fillOpacity={layer.opacity ?? 1}
                              fillRule={layer.fillRule}
                            />
                          ))}
                        </svg>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={exportingRes !== null}
                  onClick={() => handlePngExport('4k')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#171614] hover:bg-[#312F2B] disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                >
                  {exportingRes === '4k' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  <span>4K PNG ({spec.width4k}×{spec.height4k})</span>
                </button>

                <button
                  type="button"
                  disabled={exportingRes !== null}
                  onClick={() => handlePngExport('8k')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#D94826] hover:bg-[#BC391B] disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                >
                  {exportingRes === '8k' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  <span>8K PNG ({spec.width8k}×{spec.height8k})</span>
                </button>

                <button
                  type="button"
                  onClick={handleSvgDownload}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#171614] bg-[#F3F1EB] hover:bg-[#E7E4DC] border border-[#D8D4C9] rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                >
                  <FileCode2 className="w-3.5 h-3.5" />
                  <span>Editable Vector (SVG)</span>
                </button>

                <button
                  type="button"
                  onClick={openFreepikModal}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#0B63CE] hover:bg-[#094FA6] rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                >
                  <Package className="w-3.5 h-3.5" />
                  <span>Freepik</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopySvg}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#57544D] hover:text-[#171614] bg-white hover:bg-[#FAF9F6] border border-[#E3E0D7] rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                >
                  {copiedSvg ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#16A34A]" />
                      <span>কপি হয়েছে</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>SVG কপি</span>
                    </>
                  )}
                </button>
              </div>

              {exportMessage && (
                <span className="text-xs font-medium text-[#16A34A]" role="status">
                  {exportMessage}
                </span>
              )}
            </div>
          </div>
        </section>

        {/* RIGHT RAIL: Color (Solid/Gradient), Grain, Deckle Edge, Drop Shadow */}
        <aside className="bg-white border border-[#E3E0D7] rounded-xl p-4 space-y-3.5 lg:h-full lg:overflow-y-auto min-h-0">
          {/* Color Picker (Solid & Gradient) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-[#171614]">রঙ (Color)</h2>
              <div className="grid grid-cols-2 gap-0.5 p-0.5 bg-[#F3F1EB] rounded-md">
                <button
                  type="button"
                  onClick={() => onUpdateConfig({ colorMode: 'solid' })}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded transition-colors cursor-pointer ${
                    config.colorMode === 'solid'
                      ? 'bg-white text-[#171614] shadow-xs'
                      : 'text-[#57544D] hover:text-[#171614]'
                  }`}
                >
                  সলিড
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateConfig({ colorMode: 'gradient' })}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded transition-colors cursor-pointer ${
                    config.colorMode === 'gradient'
                      ? 'bg-white text-[#171614] shadow-xs'
                      : 'text-[#57544D] hover:text-[#171614]'
                  }`}
                >
                  গ্রেডিয়েন্ট
                </button>
              </div>
            </div>

            {config.colorMode === 'solid' ? (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[#57544D]">সলিড হেক্স</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      aria-label="কাস্টম কালার বেছে নিন"
                      value={/^#[0-9A-Fa-f]{6}$/.test(config.color) ? config.color : '#141413'}
                      onChange={(e) => onUpdateConfig({ color: e.target.value.toUpperCase() })}
                      className="w-6 h-6 rounded border border-[#D8D4C9] cursor-pointer bg-transparent p-0"
                    />
                    <input
                      type="text"
                      aria-label="হেক্স কালার কোড"
                      value={config.color}
                      onChange={(e) => handleHexInput(e.target.value, 'color')}
                      maxLength={7}
                      className="w-20 px-2 py-1 text-xs font-mono-tabular border border-[#E3E0D7] rounded bg-[#FAF9F6] text-[#171614] focus:outline-none focus:border-[#171614]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-6 gap-1.5">
                  {SOLID_SWATCHES.map((swatch) => {
                    const isSelected = config.color.toUpperCase() === swatch.hex.toUpperCase();
                    return (
                      <button
                        key={swatch.hex}
                        type="button"
                        title={`${swatch.name} (${swatch.hex})`}
                        onClick={() => onUpdateConfig({ color: swatch.hex })}
                        className={`h-7 rounded border transition-transform cursor-pointer ${
                          isSelected
                            ? 'border-[#171614] ring-2 ring-[#D94826] scale-95'
                            : 'border-[#D8D4C9] hover:scale-105'
                        }`}
                        style={{ backgroundColor: swatch.hex }}
                      />
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="grid grid-cols-4 gap-1.5">
                  {GRADIENT_PRESETS.map((preset) => {
                    const active =
                      config.color.toUpperCase() === preset.c1.toUpperCase() &&
                      config.gradientColor2.toUpperCase() === preset.c2.toUpperCase();
                    return (
                      <button
                        key={preset.name}
                        type="button"
                        title={preset.name}
                        onClick={() =>
                          onUpdateConfig({ color: preset.c1, gradientColor2: preset.c2 })
                        }
                        className={`h-7 rounded border transition-transform cursor-pointer ${
                          active
                            ? 'border-[#171614] ring-2 ring-[#D94826] scale-95'
                            : 'border-[#D8D4C9] hover:scale-105'
                        }`}
                        style={{
                          background: `linear-gradient(135deg, ${preset.c1}, ${preset.c2})`,
                        }}
                      />
                    );
                  })}
                </div>

                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5">
                  <div className="flex items-center gap-1 border border-[#E3E0D7] rounded px-1.5 py-1 bg-[#FAF9F6]">
                    <input
                      type="color"
                      aria-label="প্রথম রঙ"
                      value={/^#[0-9A-Fa-f]{6}$/.test(config.color) ? config.color : '#686662'}
                      onChange={(e) => onUpdateConfig({ color: e.target.value.toUpperCase() })}
                      className="w-4 h-4 rounded border border-[#D8D4C9] cursor-pointer bg-transparent p-0 shrink-0"
                    />
                    <input
                      type="text"
                      aria-label="প্রথম হেক্স কোড"
                      value={config.color}
                      onChange={(e) => handleHexInput(e.target.value, 'color')}
                      maxLength={7}
                      className="w-full text-[11px] font-mono-tabular bg-transparent text-[#171614] focus:outline-none"
                    />
                  </div>

                  <button
                    type="button"
                    title="রঙ অদলবদল করুন"
                    onClick={() =>
                      onUpdateConfig({
                        color: config.gradientColor2,
                        gradientColor2: config.color,
                      })
                    }
                    className="p-1 rounded border border-[#E3E0D7] text-[#57544D] hover:text-[#171614] hover:bg-[#FAF9F6] cursor-pointer"
                  >
                    <ArrowLeftRight className="w-3 h-3" />
                  </button>

                  <div className="flex items-center gap-1 border border-[#E3E0D7] rounded px-1.5 py-1 bg-[#FAF9F6]">
                    <input
                      type="color"
                      aria-label="দ্বিতীয় রঙ"
                      value={
                        /^#[0-9A-Fa-f]{6}$/.test(config.gradientColor2)
                          ? config.gradientColor2
                          : '#232220'
                      }
                      onChange={(e) =>
                        onUpdateConfig({ gradientColor2: e.target.value.toUpperCase() })
                      }
                      className="w-4 h-4 rounded border border-[#D8D4C9] cursor-pointer bg-transparent p-0 shrink-0"
                    />
                    <input
                      type="text"
                      aria-label="দ্বিতীয় হেক্স কোড"
                      value={config.gradientColor2}
                      onChange={(e) => handleHexInput(e.target.value, 'gradientColor2')}
                      maxLength={7}
                      className="w-full text-[11px] font-mono-tabular bg-transparent text-[#171614] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1 p-0.5 bg-[#F3F1EB] rounded-md">
                  {(
                    [
                      { id: 'linear', label: 'Linear' },
                      { id: 'radial', label: 'Radial' },
                    ] as { id: GradientType; label: string }[]
                  ).map((gType) => (
                    <button
                      key={gType.id}
                      type="button"
                      onClick={() => onUpdateConfig({ gradientType: gType.id })}
                      className={`py-1 text-[11px] rounded transition-colors cursor-pointer ${
                        config.gradientType === gType.id
                          ? 'bg-white text-[#171614] font-semibold shadow-xs'
                          : 'text-[#57544D] hover:text-[#171614]'
                      }`}
                    >
                      {gType.label}
                    </button>
                  ))}
                </div>

                {config.gradientType === 'linear' && (
                  <div>
                    <div className="flex justify-between text-[11px] text-[#57544D] mb-1">
                      <span>গ্রেডিয়েন্ট অ্যাঙ্গেল</span>
                      <span className="font-mono-tabular">{config.gradientAngle}°</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={360}
                      value={config.gradientAngle}
                      onChange={(e) =>
                        onUpdateConfig({ gradientAngle: Number(e.target.value) })
                      }
                      className="w-full studio-slider"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <hr className="border-[#ECEAE3]" />

          {/* Optional Grainy Effect */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xs font-semibold text-[#171614]">গ্রেইনি ইফেক্ট (Grain)</h2>
                <p className="text-[10px] text-[#6B675E]">দানাদার কাগজের টেক্সচার</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={config.grainEnabled}
                onClick={() => onUpdateConfig({ grainEnabled: !config.grainEnabled })}
                className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                  config.grainEnabled ? 'bg-[#171614]' : 'bg-[#D8D4C9]'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition-transform ${
                    config.grainEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {config.grainEnabled && (
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-[11px] text-[#57544D] mb-1">
                    <span>গ্রেইনের ঘনত্ব</span>
                    <span className="font-mono-tabular">{config.grainIntensity}%</span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={100}
                    value={config.grainIntensity}
                    onChange={(e) =>
                      onUpdateConfig({ grainIntensity: Number(e.target.value) })
                    }
                    className="w-full studio-slider"
                  />
                </div>

                <div className="grid grid-cols-3 gap-1 p-0.5 bg-[#F3F1EB] rounded-md">
                  {(
                    [
                      { id: 'fine', label: 'সূক্ষ্ম' },
                      { id: 'medium', label: 'মাঝারি' },
                      { id: 'coarse', label: 'মোটা' },
                    ] as { id: GrainScale; label: string }[]
                  ).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onUpdateConfig({ grainScale: item.id })}
                      className={`py-1 text-[11px] rounded transition-colors cursor-pointer ${
                        config.grainScale === item.id
                          ? 'bg-white text-[#171614] font-semibold shadow-xs'
                          : 'text-[#57544D] hover:text-[#171614]'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <hr className="border-[#ECEAE3]" />

          {/* Deckle Edge Control */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xs font-semibold text-[#171614]">প্রান্তে সাদা আঁশ (Deckle)</h2>
                <p className="text-[10px] text-[#6B675E]">ছেঁড়া কিনারায় কাগজের আঁশ</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={config.deckleHighlight}
                onClick={() =>
                  onUpdateConfig({ deckleHighlight: !config.deckleHighlight })
                }
                className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                  config.deckleHighlight ? 'bg-[#171614]' : 'bg-[#D8D4C9]'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition-transform ${
                    config.deckleHighlight ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {config.deckleHighlight && (
              <div>
                <div className="flex justify-between text-[11px] text-[#57544D] mb-1">
                  <span>সাদা আঁশের অপাসিটি</span>
                  <span className="font-mono-tabular">{config.deckleOpacity}%</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={100}
                  value={config.deckleOpacity}
                  onChange={(e) =>
                    onUpdateConfig({ deckleOpacity: Number(e.target.value) })
                  }
                  className="w-full studio-slider"
                />
              </div>
            )}
          </div>

          <hr className="border-[#ECEAE3]" />

          {/* Drop Shadow Control */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xs font-semibold text-[#171614]">কাগজের ছায়া (Shadow)</h2>
                <p className="text-[10px] text-[#6B675E]">ছেঁড়া প্রান্তে নরম ড্রপ শ্যাডো</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={config.shadowEnabled}
                onClick={() =>
                  onUpdateConfig({ shadowEnabled: !config.shadowEnabled })
                }
                className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                  config.shadowEnabled ? 'bg-[#171614]' : 'bg-[#D8D4C9]'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition-transform ${
                    config.shadowEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {config.shadowEnabled && (
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-[11px] text-[#57544D] mb-1">
                    <span>ছায়ার অপাসিটি</span>
                    <span className="font-mono-tabular">{config.shadowOpacity}%</span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={100}
                    value={config.shadowOpacity}
                    onChange={(e) =>
                      onUpdateConfig({ shadowOpacity: Number(e.target.value) })
                    }
                    className="w-full studio-slider"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-[#57544D] mb-1">
                    <span>ছায়ার বিস্তৃতি (Blur)</span>
                    <span className="font-mono-tabular">{config.shadowBlur}px</span>
                  </div>
                  <input
                    type="range"
                    min={4}
                    max={48}
                    value={config.shadowBlur}
                    onChange={(e) =>
                      onUpdateConfig({ shadowBlur: Number(e.target.value) })
                    }
                    className="w-full studio-slider"
                  />
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Freepik Paired JPEG + Editable Vector Export Modal */}
      {freepikModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#171614]/50 backdrop-blur-[2px] flex items-center justify-center p-4"
          onClick={() => {
            if (!freepikExporting) setFreepikModalOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="freepik-modal-title"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white border border-[#E3E0D7] rounded-2xl shadow-xl p-5 space-y-4"
          >
            <div className="flex items-start justify-between gap-3 border-b border-[#ECEAE3] pb-3">
              <div>
                <h2
                  id="freepik-modal-title"
                  className="font-display text-base font-bold text-[#171614]"
                >
                  Freepik এক্সপোর্ট (JPEG + Editable Vector)
                </h2>
                <p className="text-xs text-[#57544D] mt-0.5">
                  একই নামে JPEG ও Editable Vector (SVG) একসাথে ডাউনলোড হবে
                </p>
              </div>
              <button
                type="button"
                disabled={freepikExporting}
                onClick={() => setFreepikModalOpen(false)}
                aria-label="বন্ধ করুন"
                className="p-1.5 rounded-lg text-[#57544D] hover:text-[#171614] hover:bg-[#F3F1EB] transition-colors cursor-pointer disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 4K / 8K Resolution Selector */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#171614]">
                রেজোলিউশন নির্বাচন করুন
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFreepikRes('4k')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    freepikRes === '4k'
                      ? 'border-[#0B63CE] bg-[#EFF6FF] text-[#171614]'
                      : 'border-[#E3E0D7] bg-[#FAF9F6] text-[#57544D] hover:border-[#ABA69B]'
                  }`}
                >
                  <div className="text-sm font-bold text-[#171614]">4K কোয়ালিটি</div>
                  <div className="text-[11px] font-mono-tabular text-[#57544D] mt-0.5">
                    {spec.width4k} × {spec.height4k} px
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setFreepikRes('8k')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    freepikRes === '8k'
                      ? 'border-[#0B63CE] bg-[#EFF6FF] text-[#171614]'
                      : 'border-[#E3E0D7] bg-[#FAF9F6] text-[#57544D] hover:border-[#ABA69B]'
                  }`}
                >
                  <div className="text-sm font-bold text-[#171614]">8K আল্ট্রা HD</div>
                  <div className="text-[11px] font-mono-tabular text-[#57544D] mt-0.5">
                    {spec.width8k} × {spec.height8k} px
                  </div>
                </button>
              </div>
            </div>

            {/* Shared Filename Input + Live Pair Preview */}
            <div className="space-y-1.5">
              <label
                htmlFor="freepik-filename"
                className="block text-xs font-semibold text-[#171614]"
              >
                ফাইলের নাম (দুটি ফাইলেই একই নাম থাকবে)
              </label>
              <input
                id="freepik-filename"
                type="text"
                value={freepikBaseName}
                onChange={(e) => setFreepikBaseName(e.target.value)}
                placeholder={currentDesign.designId.toLowerCase()}
                className="w-full px-3 py-2 text-xs font-mono-tabular border border-[#D8D4C9] rounded-lg bg-[#FAF9F6] text-[#171614] focus:outline-none focus:border-[#0B63CE]"
              />
              <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-mono-tabular text-[#57544D]">
                <span className="px-2 py-0.5 rounded bg-[#F3F1EB] border border-[#E3E0D7] text-[#171614]">
                  {sanitizedFreepikName}.jpg
                </span>
                <span>+</span>
                <span className="px-2 py-0.5 rounded bg-[#F3F1EB] border border-[#E3E0D7] text-[#171614]">
                  {sanitizedFreepikName}.svg
                </span>
              </div>
            </div>

            {/* JPEG Background Selector */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[#171614]">
                  JPEG ব্যাকগ্রাউন্ড
                </label>
                <span className="text-[10px] text-[#6B675E]">
                  SVG ভেক্টরটি স্বচ্ছ (Transparent) থাকবে
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#F3F1EB] rounded-lg">
                {(
                  [
                    { id: 'white', label: 'সাদা' },
                    { id: 'checker', label: 'চেকারবোর্ড' },
                    { id: 'charcoal', label: 'কালো' },
                  ] as { id: FreepikJpegBg; label: string }[]
                ).map((bg) => (
                  <button
                    key={bg.id}
                    type="button"
                    onClick={() => setFreepikBg(bg.id)}
                    className={`py-1.5 px-2 text-xs rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                      freepikBg === bg.id
                        ? 'bg-white text-[#171614] font-semibold shadow-xs'
                        : 'text-[#57544D] hover:text-[#171614]'
                    }`}
                  >
                    {bg.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#ECEAE3]">
              <button
                type="button"
                disabled={freepikExporting}
                onClick={() => setFreepikModalOpen(false)}
                className="px-3.5 py-2 text-xs font-medium text-[#57544D] hover:text-[#171614] bg-[#F3F1EB] hover:bg-[#E7E4DC] rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                বাতিল
              </button>
              <button
                type="button"
                disabled={freepikExporting}
                onClick={handleFreepikExport}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0B63CE] hover:bg-[#094FA6] disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              >
                {freepikExporting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>এক্সপোর্ট হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    <span>{freepikRes.toUpperCase()} JPEG + SVG ডাউনলোড</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
