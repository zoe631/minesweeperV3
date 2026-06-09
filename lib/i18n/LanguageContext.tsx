"use client"

import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations, Language } from './translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, ...args: any[]) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  t: (key: string) => key,
});

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [language, setLanguage] = useState<Language>('en');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedLang = localStorage.getItem('minesweeper_lang') as Language;
    if (savedLang && (savedLang === 'en' || savedLang === 'ru')) {
      setLanguage(savedLang);
    } else {
      const browserLang = navigator.language.startsWith('ru') ? 'ru' : 'en';
      setLanguage(browserLang);
    }
  }, []);

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('minesweeper_lang', lang);
  };

  const t = (key: string, ...args: any[]) => {
    if (!mounted) return "";
    let str = translations[language][key as keyof typeof translations['en']] || key;
    args.forEach((arg, index) => {
      str = str.replace(`{${index}}`, String(arg));
    });
    return str;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => useContext(LanguageContext);
