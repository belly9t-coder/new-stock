import React, { useMemo, useState } from 'react';
import { ArrowRight, RefreshCw } from 'lucide-react';
import { generateTornPaperDesign } from '../generators/tornPaperGenerator';
import { GeneratedDesign } from '../types/studio';

interface ModeSelectorProps {
  onSelectMode: (mode: 'torn-paper' | 'paint') => void;
  lifetimeMintCount: number;
}

export const ModeSelector: React.FC<ModeSelectorProps> = ({
  onSelectMode,
  lifetimeMintCount,
}) => {
  const [previewTick, setPreviewTick] = useState(0);

  const tornPreview: GeneratedDesign = useMemo(() => {
    return generateTornPaperDesign({
      designId: `PREVIEW-TP-${previewTick}`,
      seedWords: [
        0x4a1f9c21 + previewTick * 173,
        0x8b3e7d19 + previewTick * 911,
        0x19c4e822 + previewTick * 439,
        0x7712b403 + previewTick * 617,
      ],
      style: previewTick % 2 === 0 ? 'split-gap' : 'irregular-scrap',
      color: '#2B2A27',
      roughness: 68,
      detailDensity: 75,
      thickness: 50,
      deckleHighlight: true,
      deckleOpacity: 92,
      aspectRatio: '16:9',
    });
  }, [previewTick]);

  return (
    <main className="max-w-[1280px] mx-auto px-6 py-6 md:py-8">
      {/* Hero Title Section */}
      <div className="max-w-3xl mb-6">
        <div className="flex flex-wrap items-center gap-2 text-xs text-[#6B675E] mb-2">
          <span>প্রসিডিউরাল অ্যাসেট স্টুডিও</span>
          <span aria-hidden="true">·</span>
          <span>লাইফটাইম ইউনিক জেনারেটর</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono-tabular">4K / 8K Transparent PNG &amp; Editable SVG</span>
          {lifetimeMintCount > 0 && (
            <>
              <span aria-hidden="true">·</span>
              <span className="font-mono-tabular">এ পর্যন্ত তৈরি: {lifetimeMintCount}টি</span>
            </>
          )}
        </div>

        <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-[#171614] leading-[1.15] [text-wrap:balance] mb-2">
          আপনার ডিজাইনের ধরন নির্বাচন করুন
        </h1>
        <p className="text-sm md:text-base text-[#57544D] leading-relaxed max-w-2xl">
          প্রতি ক্লিকে তৈরি হবে সম্পূর্ণ নতুন ও অদ্বিতীয় ডিজাইন — সলিড বা গ্রেডিয়েন্ট কালার, গ্রেইনি টেক্সচার এবং ৪কে/৮কে ট্রান্সপারেন্ট PNG ও এডিটেবল ভেক্টর SVG এক্সপোর্টসহ।
        </p>
      </div>

      {/* Primary Two-Option Choice Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Option 1: Torn Paper */}
        <section className="group bg-white border border-[#E3E0D7] rounded-xl p-5 sm:p-6 flex flex-col justify-between transition-colors hover:border-[#171614]">
          <div>
            <div className="flex items-center justify-between gap-4 mb-3">
              <div className="text-xs font-medium text-[#6B675E]">
                <span>অপশন ০১</span>
                <span className="mx-2" aria-hidden="true">·</span>
                <span>৭টি আলাদা স্টাইল</span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewTick((t) => t + 1)}
                title="নতুন প্রিভিউ দেখুন"
                className="p-1.5 rounded-md text-[#6B675E] hover:text-[#171614] hover:bg-[#F6F5F1] transition-colors cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            <div
              onClick={() => onSelectMode('torn-paper')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectMode('torn-paper');
                }
              }}
              className="checkerboard-bg border border-[#E3E0D7] rounded-lg aspect-[16/9] w-full overflow-hidden mb-4 flex items-center justify-center cursor-pointer"
            >
              <svg
                viewBox={`0 0 ${tornPreview.viewBoxWidth} ${tornPreview.viewBoxHeight}`}
                className="w-full h-full transition-transform duration-300 group-hover:scale-[1.02]"
              >
                {tornPreview.layers.map((layer) => (
                  <path
                    key={layer.id}
                    d={layer.pathData}
                    fill={layer.fill}
                    fillOpacity={layer.opacity ?? 1}
                    fillRule={layer.fillRule}
                  />
                ))}
              </svg>
            </div>

            <h2 className="font-display text-xl font-bold text-[#171614] mb-1.5">
              Torn Paper (ছেঁড়া কাগজ)
            </h2>
            <p className="text-sm text-[#57544D] leading-relaxed mb-4">
              উপর-নিচ ছেঁড়া (মাঝে ফাঁকা ও পুরুত্ব নিয়ন্ত্রণসহ), আনুভূমিক ফালি, এক প্রান্ত ছেঁড়া পাতা, এলোমেলো টুকরো ও ছেঁড়া ফ্রেম — এক ক্লিকেই তৈরি করুন।
            </p>
          </div>

          <div className="pt-4 border-t border-[#ECEAE3] flex items-center justify-between gap-4">
            <span className="text-xs text-[#6B675E]">
              সলিড ও গ্রেডিয়েন্ট · গ্রেইন · 4K/8K &amp; SVG
            </span>
            <button
              type="button"
              onClick={() => onSelectMode('torn-paper')}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#171614] hover:bg-[#D94826] rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>Torn Paper খুলুন</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </section>

        {/* Option 2: Paint (Intentionally Empty) */}
        <section className="group bg-white border border-[#E3E0D7] rounded-xl p-5 sm:p-6 flex flex-col justify-between transition-colors hover:border-[#ABA69B]">
          <div>
            <div className="flex items-center justify-between gap-4 mb-3">
              <div className="text-xs font-medium text-[#6B675E]">
                <span>অপশন ০২</span>
                <span className="mx-2" aria-hidden="true">·</span>
                <span>খালি রাখা হয়েছে</span>
              </div>
            </div>

            <div
              onClick={() => onSelectMode('paint')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectMode('paint');
                }
              }}
              className="border border-dashed border-[#D8D4C9] bg-[#FAF9F6] rounded-lg aspect-[16/9] w-full overflow-hidden mb-4 flex flex-col items-center justify-center text-center px-6 cursor-pointer"
            >
              <span className="text-sm font-medium text-[#6B675E]">
                পেইন্ট ক্যানভাস খালি রাখা হয়েছে
              </span>
              <span className="text-xs text-[#8C877D] mt-1">
                পরবর্তীতে নতুন ফিচার যুক্ত করা হবে
              </span>
            </div>

            <h2 className="font-display text-xl font-bold text-[#171614] mb-1.5">
              Paint (পেইন্ট)
            </h2>
            <p className="text-sm text-[#57544D] leading-relaxed mb-4">
              এই অপশনটি বর্তমানে খালি রাখা হয়েছে। আপাতত Torn Paper স্টুডিও থেকে সব ধরনের ছেঁড়া কাগজের ডিজাইন তৈরি ও এক্সপোর্ট করতে পারবেন।
            </p>
          </div>

          <div className="pt-4 border-t border-[#ECEAE3] flex items-center justify-between gap-4">
            <span className="text-xs text-[#6B675E]">
              খালি স্টেট · শীঘ্রই আসছে
            </span>
            <button
              type="button"
              onClick={() => onSelectMode('paint')}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-[#171614] bg-[#F3F1EB] hover:bg-[#E7E4DC] border border-[#D8D4C9] rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>Paint দেখুন</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </section>
      </div>

      {/* Capabilities Strip (Compact 3-column proof) */}
      <div className="mt-7 pt-5 border-t border-[#E3E0D7] grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <h3 className="text-xs font-semibold text-[#171614] mb-1">
            ০১. লাইফটাইম ইউনিক গ্যারান্টি
          </h3>
          <p className="text-xs text-[#57544D] leading-relaxed">
            ১২৮-বিট ক্রিপ্টোগ্রাফিক সিড ও লোকাল ফিঙ্গারপ্রিন্ট রেজিস্ট্রি — একবার তৈরি হওয়া আকৃতি আর কখনো রিপিট হয় না।
          </p>
        </div>
        <div>
          <h3 className="text-xs font-semibold text-[#171614] mb-1">
            ০২. সলিড / গ্রেডিয়েন্ট ও গ্রেইন
          </h3>
          <p className="text-xs text-[#57544D] leading-relaxed">
            সলিড বা গ্রেডিয়েন্ট কালার, সাদা আঁশ, ছায়া ও ঐচ্ছিক গ্রেইনি টেক্সচার রিয়েলটাইমে নিয়ন্ত্রণ করুন।
          </p>
        </div>
        <div>
          <h3 className="text-xs font-semibold text-[#171614] mb-1">
            ০৩. ৪কে/৮কে ট্রান্সপারেন্ট PNG ও ভেক্টর
          </h3>
          <p className="text-xs text-[#57544D] leading-relaxed">
            ১০০% স্বচ্ছ ব্যাকগ্রাউন্ডে 4K ও 8K PNG এবং Illustrator / Figma-তে এডিটযোগ্য পরিষ্কার SVG ভেক্টর ডাউনলোড করুন।
          </p>
        </div>
      </div>
    </main>
  );
};
