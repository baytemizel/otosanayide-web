import {computed} from 'vue';
import {useLocale} from '~/composables/useLocale';

/** Site-wide metadata; error.vue replaces app.vue, so both need it. */
export function useAppHead() {
  const {t, locale} = useLocale();
  const defaultTitle = computed(() => t('Otosanayide — Aracına iyi gelecek bir yer'));
  useHead({
    htmlAttrs: {lang: locale},
    titleTemplate: title => (title ? `${title} | Otosanayide` : defaultTitle.value),
    meta: [
      {name: 'description', content: computed(() => t('41 ilde özel oto servis, oto kuaför, kaporta ve bakım işletmelerini keşfet.'))},
      {name: 'robots', content: 'noindex, nofollow'},
    ],
  });
}
