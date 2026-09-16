import React from 'react';
import { useAccessibility } from '../context/AccessibilityContext';
import { Eye, Volume2 } from 'lucide-react';

export const AccessibilityControls: React.FC = () => {
  const { fontScale, setFontScale, isHighContrast, toggleHighContrast, language, setLanguage } =
    useAccessibility();

  const handleScreenReaderClick = () => {
    const mainEl = document.getElementById('main-content');
    if (mainEl) {
      mainEl.focus();
      mainEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
      {/* Screen Reader Skip Link */}
      <button
        onClick={handleScreenReaderClick}
        className="hidden md:flex items-center gap-1 hover:text-amber-300 transition-colors pr-2 border-r border-slate-700"
        title="Skip to Main Content"
        aria-label="Skip to main content"
      >
        <Volume2 className="h-3.5 w-3.5 text-amber-400" />
        <span className="text-[11px]">Screen Reader</span>
      </button>

      {/* Font Size Controls: A- A A+ */}
      <div className="flex items-center gap-1 px-2 border-r border-slate-700">
        <span className="text-[10px] text-slate-400 mr-1 hidden sm:inline">Text Size:</span>
        <button
          onClick={() => setFontScale('sm')}
          className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all ${
            fontScale === 'sm'
              ? 'bg-amber-500 text-slate-950 shadow-xs'
              : 'hover:bg-slate-800 text-slate-300'
          }`}
          aria-label="Small Text"
          title="Decrease Font Size"
        >
          A-
        </button>
        <button
          onClick={() => setFontScale('normal')}
          className={`px-1.5 py-0.5 rounded text-[11px] font-bold transition-all ${
            fontScale === 'normal'
              ? 'bg-amber-500 text-slate-950 shadow-xs'
              : 'hover:bg-slate-800 text-slate-300'
          }`}
          aria-label="Default Text Size"
          title="Default Font Size"
        >
          A
        </button>
        <button
          onClick={() => setFontScale('lg')}
          className={`px-1.5 py-0.5 rounded text-[12px] font-bold transition-all ${
            fontScale === 'lg'
              ? 'bg-amber-500 text-slate-950 shadow-xs'
              : 'hover:bg-slate-800 text-slate-300'
          }`}
          aria-label="Large Text"
          title="Increase Font Size"
        >
          A+
        </button>
      </div>

      {/* High Contrast Mode Toggle */}
      <button
        onClick={toggleHighContrast}
        className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border transition-colors ${
          isHighContrast
            ? 'bg-amber-400 text-slate-950 border-amber-300'
            : 'border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white'
        }`}
        title="Toggle High Contrast Mode"
        aria-label="Toggle High Contrast Mode"
      >
        <Eye className="h-3 w-3" />
        <span className="hidden sm:inline">High Contrast</span>
      </button>

      {/* Language Selector: English | हिन्दी */}
      <div className="flex items-center gap-1 pl-2 border-l border-slate-700 text-[11px]">
        <button
          onClick={() => setLanguage('en')}
          className={`hover:text-amber-300 font-bold transition-colors ${
            language === 'en' ? 'text-amber-400 underline decoration-2' : 'text-slate-400'
          }`}
          aria-label="English Language"
        >
          English
        </button>
        <span className="text-slate-600">|</span>
        <button
          onClick={() => setLanguage('hi')}
          className={`hover:text-amber-300 font-bold transition-colors ${
            language === 'hi' ? 'text-amber-400 underline decoration-2' : 'text-slate-400'
          }`}
          aria-label="Hindi Language"
        >
          हिन्दी
        </button>
      </div>
    </div>
  );
};
