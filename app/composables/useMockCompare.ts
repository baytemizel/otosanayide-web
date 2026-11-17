import {computed} from 'vue';
import {findBusiness} from '~/data/mock/catalog';

/** Mock comparison selection (up to 3 services) shared by the home page, search results and /karsilastir. */
export function useMockCompare() {
  const ids = useState<string[]>('v2-mock-compare', () => []);
  const max = 3;
  const items = computed(() => ids.value.map((id) => findBusiness(id)).filter((b) => b !== undefined));
  return {
    ids,
    items,
    max,
    has: (id: string) => ids.value.includes(id),
    toggle(id: string, on?: boolean) {
      const present = ids.value.includes(id);
      const want = on ?? !present;
      if (want && !present && ids.value.length < max) ids.value = [...ids.value, id];
      if (!want && present) ids.value = ids.value.filter((x) => x !== id);
    },
    clear: () => { ids.value = []; },
    href: computed(() => `/karsilastir?ids=${ids.value.join(',')}`),
  };
}
