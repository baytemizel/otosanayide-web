import {computed, onBeforeMount, onBeforeUnmount} from 'vue';
import {z} from 'zod';
import {businessPhotoItem} from '@otosanayide/core/business-photos';
import {useApp} from '~/composables/useApp';
import {useLocale} from '~/composables/useLocale';
import {apiFetch, apiOrigin} from '~/lib/api';

export type MediaOptions = {
  origin: string;
  locale: string;
  token: () => Promise<string>;
  guard: () => void;
  request: typeof fetch;
};

export const queue = z
  .object({
    items: z.array(businessPhotoItem.safeExtend({businessId: z.string().regex(/^[A-Za-z0-9_-]{1,120}$/)}).strict()).max(20),
    next: z.string().uuid().nullable(),
  })
  .strict();

export type ModerationQueue = z.infer<typeof queue>;
export type ModerationItem = ModerationQueue['items'][number];

export function useMediaSession() {
  const app = useApp();
  const {locale} = useLocale();
  let active = false;
  const check = computed<() => void>(() => {
    const user = app.user;
    return user
      ? app.accountGuard(user.uid)
      : () => {
          throw Error('session_changed');
        };
  });
  // Children's useClientEffect (onMounted) run before this component's onMounted, and they call guard synchronously.
  onBeforeMount(() => {
    active = true;
  });
  onBeforeUnmount(() => {
    active = false;
  });
  const guard = computed(() => {
    const current = check.value;
    return () => {
      if (!active) throw Error('session_changed');
      current();
    };
  });
  const options = computed<MediaOptions>(() => {
    const user = app.user;
    return {
      origin: typeof window === 'undefined' ? '' : apiOrigin(),
      locale: locale.value,
      token: () => user!.getIdToken(),
      guard: guard.value,
      request: apiFetch,
    };
  });
  return {locale, guard, options};
}
