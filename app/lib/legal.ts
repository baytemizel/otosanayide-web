import {publicEnv} from './env';

/**
 * Legal page skeletons (K160 drafts, not lawyer-approved). Only titles and the source
 * document id live here: no draft text ships to the client. The pages exist only
 * while NUXT_PUBLIC_LEGAL_PAGES_ENABLED=true, and even then they say "draft".
 */
export const legalPages = {
  'kullanim-kosullari': {title: 'Kullanım koşulları', source: '01-terms'},
  gizlilik: {title: 'Gizlilik ve KVKK aydınlatma metni', source: '02-privacy'},
  cerezler: {title: 'Çerez politikası', source: '03-cookies'},
  'topluluk-kurallari': {title: 'Topluluk kuralları', source: '04-community'},
  'reklam-aciklamasi': {title: 'Reklam açıklaması', source: '08-advertising'},
  'siralama-aciklamasi': {title: 'Sıralama nasıl çalışır?', source: '10-ranking'},
} as const;

export type LegalSlug = keyof typeof legalPages;

export const isLegalSlug = (value: string): value is LegalSlug => Object.hasOwn(legalPages, value);

/** Route of a legal page, or null while the flag is off (the link then stays passive). */
export function legalPath(slug: LegalSlug): string | null {
  return publicEnv().legalPagesEnabled ? `/yasal/${slug}` : null;
}
