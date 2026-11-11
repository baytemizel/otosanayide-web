import {useApp} from '~/composables/useApp';
import {errorStatus} from '~/lib/api-read';
import {listsApi, type SavedList} from '~/lib/member-api';

/** web-13 named lists and saved comparisons, shared by Kaydedilenler and the comparison panel. */
export function useSavedLists() {
  const app = useApp();
  const lists = useState<SavedList[]>('saved-lists', () => []);
  const error = useState('saved-lists-error', () => '');
  const busy = useState('saved-lists-busy', () => false);
  const token = () => app.user!.getIdToken();
  const live = () => !!app.user && !app.demo;

  async function run<T>(task: () => Promise<T>): Promise<T | undefined> {
    if (!live() || busy.value) return undefined;
    busy.value = true;
    error.value = '';
    try {
      return await task();
    } catch (e) {
      const status = errorStatus(e);
      error.value = status === 409 ? 'Liste başka bir yerde değişti ya da sınıra ulaştı. Yenileyip tekrar dene.' : status === 403 ? 'Önce e-posta adresini doğrula.' : e instanceof Error ? e.message : 'Liste işlemi tamamlanamadı.';
      return undefined;
    } finally {
      busy.value = false;
    }
  }
  const replace = (next: SavedList) => {
    lists.value = lists.value.some(l => l.id === next.id) ? lists.value.map(l => (l.id === next.id ? next : l)) : [...lists.value, next];
  };
  return {
    lists, error, busy,
    load: () => run(async () => {
      lists.value = await listsApi.read(token);
    }),
    create: (name: string, kind: 'list' | 'comparison', businessIds: string[] = []) => run(async () => {
      const created = await listsApi.create(token, {name: name.trim(), kind, businessIds}, crypto.randomUUID());
      replace(created);
      return created;
    }),
    add: (list: SavedList, businessId: string) => run(async () => replace(await listsApi.change(token, {id: list.id, expectedVersion: list.version, add: [businessId]}))),
    drop: (list: SavedList, businessId: string) => run(async () => replace(await listsApi.change(token, {id: list.id, expectedVersion: list.version, remove: [businessId]}))),
    remove: (list: SavedList) => run(async () => {
      await listsApi.remove(token, list.id);
      lists.value = lists.value.filter(l => l.id !== list.id);
    }),
  };
}
