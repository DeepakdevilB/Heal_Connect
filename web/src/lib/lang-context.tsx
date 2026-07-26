'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { translations, Lang, T } from './i18n';

const LangContext = createContext<{
  lang: Lang;
  setLang: (l: Lang) => void;
  t: T;
}>({ lang: 'en', setLang: () => {}, t: translations.en });

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('en');
  return (
    <LangContext.Provider value={{ lang, setLang, t: translations[lang] }}>
      {children}
    </LangContext.Provider>
  );
}

export const useLang = () => useContext(LangContext);
