import {normalizeEnv} from '../../app/lib/env';
import {robotsTxt} from '../../app/lib/site-files';

export default defineEventHandler(event => {
  const env = normalizeEnv(useRuntimeConfig(event).public);
  setHeader(event, 'Content-Type', 'text/plain; charset=utf-8');
  setHeader(event, 'Cache-Control', 'public, max-age=3600');
  return robotsTxt(env);
});
