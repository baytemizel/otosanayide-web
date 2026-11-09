import {parseLocale} from '@otosanayide/core/i18n';
import {setApiLocale} from '~/lib/api';
import {configureEnv} from '~/lib/env';

export default defineNuxtPlugin({
  name: 'otosanayide-config',
  enforce: 'pre',
  setup() {
    configureEnv(useRuntimeConfig().public);
    if (import.meta.client) setApiLocale(parseLocale(useCookie('otosanayide-locale', {readonly: true}).value));
  },
});
