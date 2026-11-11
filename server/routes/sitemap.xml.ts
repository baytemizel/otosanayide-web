import {normalizeEnv} from '../../app/lib/env';
import {sitemapXml} from '../../app/lib/site-files';

export default defineEventHandler(event => {
  const env = normalizeEnv(useRuntimeConfig(event).public);
  if (!env.indexingEnabled || !env.siteOrigin) throw createError({statusCode: 404, statusMessage: 'Not Found'});
  setHeader(event, 'Content-Type', 'application/xml; charset=utf-8');
  setHeader(event, 'Cache-Control', 'public, max-age=3600');
  return sitemapXml(env.siteOrigin);
});
