import {useAppStore} from '~/stores/app';

/** Read state as `app.user`, `app.data`…; destructuring loses reactivity. */
export const useApp = () => useAppStore();
