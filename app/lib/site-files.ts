/**
 * robots.txt and sitemap.xml. Until the site is released (indexing flag off or no site
 * origin) every crawler is told to stay out and there is no sitemap. Business profiles
 * are not listed: there is no listing endpoint, and the full catalogue is not handed out
 * in one file (product-plan "Güvenlik": toplu çıkarımı zorlaştırmak).
 */
export const privatePaths = ['/giris', '/hesabim', '/araclarim', '/kaydedilenler', '/taleplerim', '/yorumlarim', '/basvurularim', '/bildirimler', '/yonetim', '/talep', '/yasal/'];
export const sitemapPaths = ['/', '/hakkinda'];

export function robotsTxt(options: {indexingEnabled: boolean; siteOrigin: string}) {
  if (!options.indexingEnabled || !options.siteOrigin) return 'User-agent: *\nDisallow: /\n';
  return ['User-agent: *', 'Allow: /', ...privatePaths.map(p => 'Disallow: ' + p), '', `Sitemap: ${options.siteOrigin}/sitemap.xml`, ''].join('\n');
}

const escapeXml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function sitemapXml(siteOrigin: string) {
  const urls = sitemapPaths.map(p => `  <url><loc>${escapeXml(siteOrigin + p)}</loc></url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}
