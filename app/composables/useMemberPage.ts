import {onMounted, watch} from 'vue';
import {useApp} from '~/composables/useApp';
import {demoMode} from '~/lib/env';

/**
 * Member-only page. Live: once the session is known, a guest is sent to /giris with a return address.
 * Demo: the local preview signs in by itself so every screen can be reviewed.
 */
export function useMemberPage() {
  const app = useApp();
  const route = useRoute();
  function check() {
    if (!app.ready || app.member) return;
    if (demoMode()) app.loginDemo();
    else void navigateTo({path: '/giris', query: {donus: route.fullPath}}, {replace: true});
  }
  onMounted(() => {
    check();
    watch(() => [app.ready, app.member], check);
  });
  return app;
}
