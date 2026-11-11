import {computed, toValue, type MaybeRefOrGetter} from 'vue';
import {useLocale} from '~/composables/useLocale';
import {publicEnv} from '~/lib/env';

/**
 * Title, description, canonical and Open Graph for a server-rendered page. The canonical
 * URL exists only when NUXT_PUBLIC_SITE_ORIGIN is set; query strings never become canonical.
 */
export function usePageSeo(input: {title?: MaybeRefOrGetter<string | undefined>; description?: MaybeRefOrGetter<string | undefined>; path?: MaybeRefOrGetter<string>; image?: string}) {
  const route = useRoute();
  const {locale} = useLocale();
  const site = publicEnv().siteOrigin;
  const canonical = computed(() => (site ? site + (toValue(input.path) ?? route.path) : undefined));
  const image = input.image ? (site ? site + input.image : undefined) : site ? site + '/figma/discovery/hero.webp' : undefined;
  useSeoMeta({
    title: () => toValue(input.title),
    description: () => toValue(input.description),
    ogTitle: () => toValue(input.title) ?? 'Otosanayide',
    ogDescription: () => toValue(input.description),
    ogType: 'website',
    ogSiteName: 'Otosanayide',
    ogLocale: () => (locale.value === 'en' ? 'en_GB' : 'tr_TR'),
    ogUrl: () => canonical.value,
    ogImage: image,
    twitterCard: 'summary_large_image',
  });
  useHead({link: () => (canonical.value ? [{rel: 'canonical', href: canonical.value}] : [])});
  return {canonical};
}
