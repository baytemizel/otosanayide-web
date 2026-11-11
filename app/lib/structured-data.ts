import type {Business} from '@otosanayide/core';
import {weekRows, type OpeningHours} from './opening-hours';

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/**
 * schema.org data for a business profile, built only from fields the API returned.
 * No rating is ever emitted (reviews load in the browser, and an absent rating is not
 * zero); sample businesses get none at all.
 */
export function businessJsonLd(business: Business, options: {url?: string; openingHours?: OpeningHours} = {}) {
  if (business.sample) return null;
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'AutoRepair',
    name: business.name,
    address: {
      '@type': 'PostalAddress',
      streetAddress: business.address,
      addressLocality: business.district,
      addressRegion: business.city,
      addressCountry: 'TR',
    },
  };
  if (options.url) data.url = options.url;
  if (business.phone) data.telephone = business.phone;
  if (business.website) data.sameAs = [business.website];
  if (business.coordinateStatus === 'verified' && business.latitude !== undefined && business.longitude !== undefined) {
    data.geo = {'@type': 'GeoCoordinates', latitude: business.latitude, longitude: business.longitude};
  }
  if (options.openingHours) {
    data.openingHoursSpecification = weekRows(options.openingHours).flatMap(row =>
      row.intervals.map(i => ({'@type': 'OpeningHoursSpecification', dayOfWeek: `https://schema.org/${days[row.day - 1]}`, opens: i.open, closes: i.close})),
    );
  }
  return data;
}

/** Safe inside a <script> element: no `</script>` or HTML comment can be formed. */
export function serializeJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}
