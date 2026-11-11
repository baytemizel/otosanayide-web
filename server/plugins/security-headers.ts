import {normalizeEnv} from '../../app/lib/env';
import {contentSecurityPolicy} from '../../app/lib/csp';

/**
 * CSP on rendered HTML in production builds. Development keeps Vite's HMR client working
 * without it. routeRules add the other security headers.
 */
export default defineNitroPlugin(nitroApp => {
  if (import.meta.dev) return;
  nitroApp.hooks.hook('render:response', (response, {event}) => {
    const env = normalizeEnv(useRuntimeConfig(event).public);
    response.headers = {...response.headers, 'Content-Security-Policy': contentSecurityPolicy(env)};
  });
});
