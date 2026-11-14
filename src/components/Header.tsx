import React from 'react';
import { StudioMode } from '../types/studio';

interface HeaderProps {
  activeMode: StudioMode;
  onNavigate: (mode: StudioMode) => void;
  onQuickGenerate: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeMode,
  onNavigate,
  onQuickGenerate,
}) => {
  return (
    <header className="shrink-0 z-30 bg-[#F6F5F1]/95 backdrop-blur-sm border-b border-[#E3E0D7]">
      <div className="max-w-[1440px] mx-auto px-5 h-14 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark (single line, no subtitle badges) */}
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="font-display text-lg font-bold tracking-tight text-[#171614] hover:text-[#D94826] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#171614]"
        >
          কাগজ ও রঙ স্টুডিও
        </button>

        {/* Zone 2: Clean single-line navigation links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#57544D]">
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeMode === 'home'
                ? 'border-[#171614] text-[#171614]'
                : 'border-transparent hover:text-[#171614]'
            }`}
          >
            হোম
          </button>
          <button
            type="button"
            onClick={() => onNavigate('torn-paper')}
            className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeMode === 'torn-paper'
                ? 'border-[#D94826] text-[#171614]'
                : 'border-transparent hover:text-[#171614]'
            }`}
          >
            ছেঁড়া কাগজ (Torn Paper)
          </button>
          <button
            type="button"
            onClick={() => onNavigate('paint')}
            className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeMode === 'paint'
                ? 'border-[#D94826] text-[#171614]'
                : 'border-transparent hover:text-[#171614]'
            }`}
          >
            পেইন্ট (Paint)
          </button>
        </nav>

        {/* Zone 3: Single Primary Action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onQuickGenerate}
            className="px-4 py-2 text-sm font-semibold text-white bg-[#171614] hover:bg-[#D94826] rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#171614]"
          >
            {activeMode === 'home' ? 'স্টুডিও শুরু করুন' : 'নতুন ইউনিক ডিজাইন'}
          </button>
        </div>
      </div>
    </header>
  );
};
