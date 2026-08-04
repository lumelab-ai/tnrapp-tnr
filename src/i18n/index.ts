import { en, type Dict } from "./en";
import { ptBR } from "./pt-BR";

const dicts: Record<string, Dict> = {
  en,
  "pt-BR": ptBR,
};

export const SUPPORTED_LANGUAGES = ["en", "pt-BR"] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number];

export function isSupportedLanguage(lang: string): lang is LanguageCode {
  return SUPPORTED_LANGUAGES.includes(lang as LanguageCode);
}

export function getDict(lang: string): Dict {
  return dicts[lang] ?? en;
}

export function t<Section extends keyof Dict>(
  lang: string,
  section: Section
): Dict[Section] {
  const dict = getDict(lang);
  return dict[section] ?? en[section];
}

export function toTMDBSearchLang(lang: string): string {
  if (lang === "pt-BR") return "pt-BR";
  return "en-US";
}
