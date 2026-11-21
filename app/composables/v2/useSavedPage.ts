import {computed, ref, shallowRef} from 'vue';
import {useApp} from '~/composables/useApp';
import {useLocale} from '~/composables/useLocale';
import {useMockSaved} from '~/composables/useMockSaved';
import {findBusiness} from '~/data/mock/catalog';
import {useMockSavedLists} from '~/data/mock/garage';
import {demoMode} from '~/lib/env';
import {listsApi, type SavedList} from '~/lib/member-api';
import {readBusiness} from '~/lib/server-read';
import {toCardBusiness, type CardBusiness} from '~/lib/v2/business-card';
import {eachLimited, listErrorMessage, liveChips, replaceList, type SavedChip} from '~/lib/v2/saved';

export type SavedEntry =
  | {status: 'loading'}
  | {status: 'found'; card: CardBusiness}
  | {status: 'missing'}
  | {status: 'unavailable'};

/**
 * Data for /kaydedilenler (W13).
 * Live: saved services are the account favorites (app store, GET /api/me), each resolved with
 * GET /api/businesses/{id}; named lists come from /api/me/lists (web-13) and are created, renamed,
 * deleted and edited there. Demo: the mock catalog and in-memory lists, unchanged.
 * Cards and error messages are kept in Turkish; the page shows them in its language (localiseCard, t).
 */
export function useSavedPage() {
  const app = useApp();
  const live = !demoMode();
  const {locale} = useLocale();
  const saved = useMockSaved();
  const demoLists = useMockSavedLists();

  /* ---------- saved services → cards ---------- */
  const entries = ref<Record<string, SavedEntry>>({});

  function entry(id: string): SavedEntry {
    if (!live) {
      const business = findBusiness(id);
      return business ? {status: 'found', card: business} : {status: 'missing'};
    }
    return entries.value[id] ?? {status: 'loading'};
  }

  /** Reads the services not read yet (and, with `retry`, those that failed). */
  async function resolve(ids: string[], retry = false) {
    if (!live) return;
    const todo = [...new Set(ids)].filter((id) => {
      const current = entries.value[id];
      return !current || (retry && current.status === 'unavailable');
    });
    if (!todo.length) return;
    entries.value = {...entries.value, ...Object.fromEntries(todo.map((id) => [id, {status: 'loading'} as SavedEntry]))};
    await eachLimited(todo, 4, async (id) => {
      const read = await readBusiness(id, locale.value);
      const next: SavedEntry = read.status === 'found' ? {status: 'found', card: toCardBusiness(read.business, read.extras)} : {status: read.status};
      entries.value = {...entries.value, [id]: next};
    });
  }

  /** Saved ids for "Tümü". Demo keeps only those the mock catalog knows, as before. */
  const savedIds = computed(() => (live ? saved.ids.value : saved.ids.value.filter((id) => !!findBusiness(id))));

  /* ---------- named lists ---------- */
  const remoteLists = shallowRef<SavedList[]>([]);
  const listsState = ref<'idle' | 'loading' | 'ready' | 'error'>(live ? 'idle' : 'ready');
  const listsError = ref('');
  const busy = ref(false);
  const actionError = ref('');
  const token = () => {
    if (!app.user) throw Error('Oturum süresi doldu. Yeniden giriş yap.');
    return app.user.getIdToken();
  };

  const chips = computed<SavedChip[]>(() => (live
    ? liveChips(remoteLists.value)
    : demoLists.value.map((l) => ({id: l.id, name: l.name, ids: l.businessIds}))));

  /** Ids shown for a chip. Demo: saved services in the list (in saved order); live: the list's own order. */
  function idsFor(chipId: string) {
    if (chipId === 'all') return savedIds.value;
    const chip = chips.value.find((c) => c.id === chipId);
    if (!chip) return [];
    return live ? chip.ids : savedIds.value.filter((id) => chip.ids.includes(id));
  }
  /** Chip count. Demo: saved services in the list; live: services in the list. */
  const countFor = (chip: SavedChip) => (live ? chip.ids.length : chip.ids.filter((id) => saved.has(id)).length);

  async function loadLists() {
    if (!live || !app.user) return;
    listsState.value = 'loading';
    listsError.value = '';
    try {
      remoteLists.value = await listsApi.read(token);
      listsState.value = 'ready';
    } catch (error) {
      listsError.value = listErrorMessage(error);
      listsState.value = 'error';
    }
  }

  async function run<T>(task: () => Promise<T>): Promise<T | undefined> {
    if (busy.value) return undefined;
    busy.value = true;
    actionError.value = '';
    try {
      return await task();
    } catch (error) {
      actionError.value = listErrorMessage(error);
      return undefined;
    } finally {
      busy.value = false;
    }
  }

  /** Returns the new list's id, or undefined when it failed (actionError says why). */
  async function createList(name: string, businessIds: string[]) {
    if (!live) {
      const id = `liste-${Date.now()}`;
      demoLists.value = [...demoLists.value, {id, name, businessIds}];
      return id;
    }
    return run(async () => {
      const created = await listsApi.create(token, {name, kind: 'list', businessIds}, crypto.randomUUID());
      remoteLists.value = replaceList(remoteLists.value, created);
      return created.id;
    });
  }

  const sourceOf = (chipId: string) => remoteLists.value.find((l) => l.id === chipId);

  async function renameList(chipId: string, name: string) {
    if (!live) {
      demoLists.value = demoLists.value.map((l) => (l.id === chipId ? {...l, name} : l));
      return true;
    }
    const list = sourceOf(chipId);
    if (!list) return false;
    const ok = await run(async () => {
      remoteLists.value = replaceList(remoteLists.value, await listsApi.change(token, {id: list.id, expectedVersion: list.version, name}));
      return true;
    });
    return !!ok;
  }

  async function deleteList(chipId: string) {
    if (!live) {
      demoLists.value = demoLists.value.filter((l) => l.id !== chipId);
      return true;
    }
    const ok = await run(async () => {
      await listsApi.remove(token, chipId);
      remoteLists.value = remoteLists.value.filter((l) => l.id !== chipId);
      return true;
    });
    return !!ok;
  }

  async function addTo(chipId: string, businessId: string) {
    const list = sourceOf(chipId);
    if (!live || !list || list.businessIds.includes(businessId)) return;
    await run(async () => {
      remoteLists.value = replaceList(remoteLists.value, await listsApi.change(token, {id: list.id, expectedVersion: list.version, add: [businessId]}));
    });
  }

  async function removeFrom(chipId: string, businessId: string) {
    if (!live) {
      demoLists.value = demoLists.value.map((l) => (l.id === chipId ? {...l, businessIds: l.businessIds.filter((x) => x !== businessId)} : l));
      return;
    }
    const list = sourceOf(chipId);
    if (!list) return;
    await run(async () => {
      remoteLists.value = replaceList(remoteLists.value, await listsApi.change(token, {id: list.id, expectedVersion: list.version, remove: [businessId]}));
    });
  }

  /** Heart on a card. Demo: un-saving also drops the service from every list (as before). Live: favorites only. */
  function setSaved(id: string, on: boolean) {
    saved.toggle(id, on);
    if (!live && !on) demoLists.value = demoLists.value.map((l) => ({...l, businessIds: l.businessIds.filter((x) => x !== id)}));
  }

  // Demo: services that sit in a list are saved too.
  if (!live) for (const list of demoLists.value) for (const id of list.businessIds) saved.toggle(id, true);

  return {
    live, saved, savedIds, chips, idsFor, countFor, entry, resolve,
    listsState, listsError, loadLists, busy, actionError, createList, renameList, deleteList, addTo, removeFrom, setSaved,
    /** Live: list chips cannot load before the session is known. */
    ready: computed(() => !live || app.ready),
    member: computed(() => app.member),
  };
}
