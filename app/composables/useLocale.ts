import {computed} from 'vue';
import {localeTag as tagOf, parseLocale, type Locale} from '@otosanayide/core/i18n';
import {setApiLocale} from '~/lib/api';
import {mergeLocaleFiles, translateText, type Translate} from '~/lib/i18n';

const COOKIE = 'otosanayide-locale';

/** Languages offered in the header and footer pickers; each name is written in its own language. */
export const localeOptions: readonly {value: Locale; label: string; short: string}[] = [
  {value: 'tr', label: 'Türkçe', short: 'TR'},
  {value: 'en', label: 'English', short: 'EN'},
];
/** English for strings this repo adds; one JSON file per screen group (rules in app/lib/i18n.ts). */
const extra: Record<string, string> = mergeLocaleFiles(import.meta.glob<Record<string, string>>('../locales/*.json', {eager: true, import: 'default'}));

export function useLocale() {
  const cookie = useCookie(COOKIE, {readonly: true});
  const locale = useState<Locale>('locale', () => parseLocale(cookie.value));
  const localeTag = computed(() => tagOf(locale.value));

  function setLocale(next: Locale) {
    const value = parseLocale(next);
    locale.value = value;
    document.cookie = `${COOKIE}=${value}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
    setApiLocale(value);
    void refreshNuxtData();
  }

  /** Reactive: reads `locale`, so templates and computeds re-render when the language changes. */
  const t: Translate = (source, params) => translateText(locale.value, source, params, extra);

  return {locale, setLocale, localeTag, t};
}
