import React, { createContext, useContext, useState, useEffect } from 'react';

type FontScaleOption = 'sm' | 'normal' | 'lg';
type LanguageOption = 'en' | 'hi';

interface AccessibilityContextType {
  fontScale: FontScaleOption;
  setFontScale: (scale: FontScaleOption) => void;
  isHighContrast: boolean;
  toggleHighContrast: () => void;
  language: LanguageOption;
  setLanguage: (lang: LanguageOption) => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export const AccessibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [fontScale, setFontScaleState] = useState<FontScaleOption>('normal');
  const [isHighContrast, setIsHighContrast] = useState<boolean>(false);
  const [language, setLanguage] = useState<LanguageOption>('en');

  const setFontScale = (scale: FontScaleOption) => {
    setFontScaleState(scale);
    let numericScale = 1;
    if (scale === 'sm') numericScale = 0.9;
    if (scale === 'lg') numericScale = 1.15;
    document.documentElement.style.setProperty('--font-scale', numericScale.toString());
  };

  const toggleHighContrast = () => {
    setIsHighContrast((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add('high-contrast');
      } else {
        document.documentElement.classList.remove('high-contrast');
      }
      return next;
    });
  };

  return (
    <AccessibilityContext.Provider
      value={{
        fontScale,
        setFontScale,
        isHighContrast,
        toggleHighContrast,
        language,
        setLanguage,
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
};

export const useAccessibility = (): AccessibilityContextType => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
};
