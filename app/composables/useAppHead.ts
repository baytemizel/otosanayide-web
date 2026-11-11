import {computed} from 'vue';
import {useLocale} from '~/composables/useLocale';
import {publicEnv} from '~/lib/env';

/** Site-wide metadata; error.vue replaces app.vue, so both need it. */
export function useAppHead() {
  const {t, locale} = useLocale();
  const defaultTitle = computed(() => t('Otosanayide — Aracına iyi gelecek bir yer'));
  useHead({
    htmlAttrs: {lang: locale},
    titleTemplate: title => (title ? `${title} | Otosanayide` : defaultTitle.value),
    meta: [
      {name: 'description', content: computed(() => t('41 ilde özel oto servis, oto kuaför, kaporta ve bakım işletmelerini keşfet.'))},
      // Indexing stays off until the site is released (NUXT_PUBLIC_INDEXING_ENABLED).
      {name: 'robots', content: publicEnv().indexingEnabled ? 'index, follow' : 'noindex, nofollow'},
      {name: 'theme-color', content: '#10243a'},
    ],
  });
}
