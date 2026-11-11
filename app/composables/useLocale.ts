import {computed} from 'vue';
import {localeTag as tagOf, parseLocale, translate, type Locale} from '@otosanayide/core/i18n';
import {setApiLocale} from '~/lib/api';

const COOKIE = 'otosanayide-locale';
/** English for strings this repo adds; one JSON file per screen group. */
const extra: Record<string, string> = Object.assign({}, ...Object.values(import.meta.glob<Record<string, string>>('../locales/*.json', {eager: true, import: 'default'})));

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

  /** Strings added by this repo live outside the shared core dictionary. */
  function t(source: string, params?: Record<string, string | number>) {
    const key = source.trim();
    const own = locale.value === 'en' ? extra[key] : undefined;
    return translate(locale.value, own ?? source, params);
  }

  return {locale, setLocale, localeTag, t};
}
