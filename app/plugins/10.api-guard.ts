import {assertApiConfiguration} from '~/lib/api';

/** Runs after module plugins so that a misconfigured deployment reaches the error page. */
export default defineNuxtPlugin({
  name: 'otosanayide-api-guard',
  setup() {
    assertApiConfiguration();
  },
});
