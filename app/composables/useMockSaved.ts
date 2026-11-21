import {computed} from 'vue';
import {useApp} from '~/composables/useApp';
import {useLocale} from '~/composables/useLocale';
import {demoMode} from '~/lib/env';

/**
 * Saved services (heart) shared by cards, profiles and /kaydedilenler.
 * Live: the member's favorites in the app store (POST /api/me resource=favorites); a guest is sent to sign in.
 * Demo: in-memory list seeded with three mock services.
 */
export function useMockSaved() {
  const app = useApp();
  const route = useRoute();
  const {t} = useLocale();
  const demoIds = useState<string[]>('v2-mock-saved', () => ['ornek-atasehir-ekspertiz', 'ornek-klima-servis', 'ornek-lastik-rot']);
  const ids = computed(() => (demoMode() ? demoIds.value : app.data.favorites));
  return {
    ids,
    has: (id: string) => ids.value.includes(id),
    toggle(id: string, on?: boolean) {
      const present = ids.value.includes(id);
      const want = on ?? !present;
      if (want === present) return;
      if (demoMode()) {
        demoIds.value = want ? [...demoIds.value, id] : demoIds.value.filter((x) => x !== id);
        return;
      }
      if (!app.member) {
        void navigateTo({path: '/giris', query: {donus: route.fullPath}});
        return;
      }
      app.toggleFavorite(id).catch((error: unknown) => app.notify(error instanceof Error ? t(error.message) : t('Kaydedilemedi.')));
    },
  };
}
