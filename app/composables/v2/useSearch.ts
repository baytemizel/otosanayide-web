import {computed, ref, shallowRef} from 'vue';
import type {AreaPoint} from '@otosanayide/core/coverage';
import {useClientEffect} from '~/composables/useClientEffect';
import {apiFetch} from '~/lib/api';
import {decodeSearchPage, type SearchPage} from '~/lib/search-response';
import type {CardBusiness} from '~/lib/v2/business-card';
import {appendCards, liveSearchParams, pageCards, searchErrorText, v1Params} from '~/lib/v2/search';
import type {SearchFilters} from '~/data/mock/search';

/**
 * Cards seen in live search results, by id, so the compare bars and /karsilastir can name a selected
 * business without asking again. Page memory only.
 */
export function useSearchCards() {
  const cards = useState<Record<string, CardBusiness>>('v2-search-cards', () => ({}));
  return {
    cards,
    remember(list: CardBusiness[]) {
      cards.value = {...cards.value, ...Object.fromEntries(list.map((c) => [c.id, c]))};
    },
  };
}

class SearchFailure extends Error {}

async function fetchPage(params: URLSearchParams, signal: AbortSignal): Promise<SearchPage> {
  let response: Response;
  try {
    response = await apiFetch(`/api/search?${params}`, {signal, headers: {Accept: 'application/json'}, cache: 'no-store'});
    // An API that does not know v2 answers 400 on the first page; the same search is asked in the v1 shape.
    if (response.status === 400 && !params.has('cursor')) {
      const fallback = await apiFetch(`/api/search?${v1Params(params)}`, {signal, headers: {Accept: 'application/json'}, cache: 'no-store'});
      if (fallback.ok) response = fallback;
    }
  } catch (error) {
    if (signal.aborted) throw error;
    throw new SearchFailure(searchErrorText(0));
  }
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    /* A non-JSON body (proxy page) reads as unavailable below. */
  }
  if (!response.ok) {
    const message = typeof (body as {error?: unknown})?.error === 'string' ? (body as {error: string}).error : '';
    throw new SearchFailure(searchErrorText(response.status, message));
  }
  try {
    return decodeSearchPage(body, 'live');
  } catch {
    throw new SearchFailure('Arama yanıtı okunamadı. Lütfen daha sonra tekrar dene.');
  }
}

/**
 * Live `GET /api/search?v=2` for a filter state. `criteria` returns null while there is nothing to ask
 * (demo mode, an uncovered province, "konum" before the device answered). A change of criteria starts
 * again from the first page; `more()` appends the next page with the cursor.
 */
export function useLiveSearch(criteria: () => {filters: SearchFilters; center: AreaPoint | null} | null) {
  const {remember} = useSearchCards();
  const cards = shallowRef<CardBusiness[]>([]);
  const total = shallowRef<SearchPage['total']>(null);
  const districts = shallowRef<string[]>([]);
  const nextCursor = ref<string | null>(null);
  const loading = ref(false);
  const loadingMore = ref(false);
  const error = ref('');
  const moreError = ref('');
  const loaded = ref(false);
  const retries = ref(0);
  let controller: AbortController | null = null;

  const key = computed(() => {
    const current = criteria();
    return current ? liveSearchParams(current.filters, current.center).toString() : '';
  });

  useClientEffect(() => [key.value, retries.value], () => {
    controller?.abort();
    cards.value = [];
    total.value = null;
    nextCursor.value = null;
    error.value = '';
    moreError.value = '';
    loaded.value = false;
    if (!key.value) {
      loading.value = false;
      return;
    }
    const own = new AbortController();
    controller = own;
    loading.value = true;
    fetchPage(new URLSearchParams(key.value), own.signal).then((page) => {
      if (own.signal.aborted) return;
      cards.value = pageCards(page);
      remember(cards.value);
      total.value = page.total;
      districts.value = page.districts;
      nextCursor.value = page.nextCursor;
      loaded.value = true;
    }).catch((e: unknown) => {
      if (!own.signal.aborted) error.value = e instanceof SearchFailure ? e.message : searchErrorText(0);
    }).finally(() => {
      if (!own.signal.aborted) loading.value = false;
    });
    return () => own.abort();
  });

  async function more() {
    const cursor = nextCursor.value;
    const own = controller;
    if (!cursor || !own || loadingMore.value) return;
    loadingMore.value = true;
    moreError.value = '';
    const params = new URLSearchParams(key.value);
    params.set('cursor', cursor);
    try {
      const page = await fetchPage(params, own.signal);
      if (own.signal.aborted) return;
      const next = pageCards({...page, sponsored: []});
      cards.value = appendCards(cards.value, next);
      remember(next);
      nextCursor.value = page.nextCursor;
    } catch (e) {
      if (!own.signal.aborted) moreError.value = e instanceof SearchFailure ? e.message : searchErrorText(0);
    } finally {
      loadingMore.value = false;
    }
  }

  return {cards, total, districts, nextCursor, loading, loadingMore, error, moreError, loaded, more, retry: () => { retries.value++; }};
}
