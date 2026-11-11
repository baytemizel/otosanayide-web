import assert from 'node:assert/strict';
import {test} from 'node:test';
import {sampleBusinesses, type Business} from '@otosanayide/core';
import {contentSecurityPolicy} from '../app/lib/csp';
import {istanbulClock, openState, openingHoursSchema, weekRows, type OpeningHours} from '../app/lib/opening-hours';
import {decodeBusiness, decodeSearchPage} from '../app/lib/search-response';
import {robotsTxt, sitemapXml} from '../app/lib/site-files';
import {businessJsonLd, serializeJsonLd} from '../app/lib/structured-data';

const live = (id: string, extra: Record<string, unknown> = {}) => ({
  id, name: 'Usta Oto ' + id, city: 'İstanbul', district: 'Kadıköy', address: 'Örnek Sokak No 1 Kadıköy',
  categories: ['mechanical'], services: ['Periyodik bakım'], brands: ['BMW'], coordinateStatus: 'unverified',
  ownership: 'unclaimed', features: {quotes: false, appointments: false}, ownerReady: false, published: true, ...extra,
});
const hours: OpeningHours = {timezone: 'Europe/Istanbul', week: [{day: 1, intervals: [{open: '09:00', close: '12:00'}, {open: '13:00', close: '18:30'}]}, {day: 6, intervals: [{open: '10:00', close: '14:00'}]}]};

test('the live search page keeps today\'s core shape and reads optional extensions separately', () => {
  const page = decodeSearchPage({
    items: [live('a1', {openingHours: hours, reviewSummary: {count: 3, average: 4.3}, cash: true}), live('a2')],
    districts: ['Kadıköy'], mode: 'live', sponsored: [],
    nextCursor: 'abc.DEF_1', total: {value: 57, exact: true}, facets: {services: {'Periyodik bakım': 2}},
  }, 'live');
  assert.deepEqual(page.items.map(b => b.id), ['a1', 'a2']);
  assert.equal('openingHours' in page.items[0]!, false, 'the core object stays the core shape');
  assert.deepEqual(page.extras.a1?.reviewSummary, {count: 3, average: 4.3});
  assert.equal(page.extras.a1?.openingHours?.week.length, 2);
  assert.deepEqual(page.extras.a2, {});
  assert.equal(page.nextCursor, 'abc.DEF_1');
  assert.deepEqual(page.total, {value: 57, exact: true});
  assert.deepEqual(page.facets, {services: {'Periyodik bakım': 2}});
  assert.equal(page.dropped, 0);
});

test('today\'s API answer without extensions decodes with empty paging data', () => {
  const page = decodeSearchPage({items: [], districts: [], sponsored: [], mode: 'live'}, 'live');
  assert.deepEqual([page.items, page.nextCursor, page.total, page.facets], [[], null, null, null]);
});

test('one malformed item is left out instead of failing the page; malformed extensions are ignored', () => {
  const page = decodeSearchPage({
    items: [live('ok1', {reviewSummary: {count: 0, average: 4}, openingHours: {timezone: 'UTC', week: []}}), {id: 'bad'}, live('ok1')],
    districts: [], mode: 'live', nextCursor: '<script>', total: {value: -1, exact: true},
  }, 'live');
  assert.deepEqual(page.items.map(b => b.id), ['ok1']);
  assert.equal(page.dropped, 2, 'the broken item and the duplicate');
  assert.deepEqual(page.extras.ok1, {});
  assert.equal(page.nextCursor, null);
  assert.equal(page.total, null);
});

test('a live page refuses demo data and the wrong mode', () => {
  assert.throws(() => decodeSearchPage({items: [], districts: [], mode: 'demo'}, 'live'));
  const sample = decodeSearchPage({items: [sampleBusinesses[0]], districts: [], mode: 'live'}, 'live');
  assert.equal(sample.items.length, 0, 'a sample business never shows as live data');
  assert.throws(() => decodeSearchPage('nope', 'live'));
});

test('a profile with extensions decodes; one without them is unchanged', () => {
  const withHours = decodeBusiness(live('p1', {openingHours: hours}), 'live');
  assert.equal(withHours.business.id, 'p1');
  assert.ok(withHours.extras.openingHours);
  assert.deepEqual(decodeBusiness(live('p2'), 'live').extras, {});
});

test('open state uses Istanbul time, split intervals and exceptions; unknown is never open', () => {
  // 2026-11-09 is a Monday. 07:30 UTC is 10:30 in Istanbul.
  assert.deepEqual(istanbulClock(new Date('2026-11-09T07:30:00Z')), {day: 1, date: '2026-11-09', time: '10:30'});
  assert.deepEqual(openState(hours, new Date('2026-11-09T07:30:00Z')), {open: true, until: '12:00'});
  assert.deepEqual(openState(hours, new Date('2026-11-09T09:30:00Z')), {open: false, opensAt: '13:00'});
  assert.deepEqual(openState(hours, new Date('2026-11-09T15:30:00Z')), {open: false, opensAt: null}, '18:30 closes');
  assert.deepEqual(openState(hours, new Date('2026-11-10T08:00:00Z')), {open: false, opensAt: null}, 'Tuesday is not listed');
  const holiday = {...hours, exceptions: [{date: '2026-11-09', intervals: []}]};
  assert.deepEqual(openState(holiday, new Date('2026-11-09T07:30:00Z')), {open: false, opensAt: null});
  assert.equal(weekRows(hours).length, 7);
  assert.equal(openingHoursSchema.safeParse({...hours, week: [{day: 1, intervals: [{open: '18:00', close: '09:00'}]}]}).success, false);
  assert.equal(openingHoursSchema.safeParse({...hours, week: [{day: 1, intervals: []}, {day: 1, intervals: []}]}).success, false);
});

test('JSON-LD uses only returned fields, never a rating, and nothing for samples', () => {
  const b = decodeBusiness(live('j1', {phone: '+902161234567', coordinateStatus: 'verified', latitude: 40.99, longitude: 29.03}), 'live').business;
  const ld = businessJsonLd(b, {url: 'https://otosanayide.example/servis/j1', openingHours: hours})!;
  assert.equal(ld['@type'], 'AutoRepair');
  assert.equal(ld.telephone, '+902161234567');
  assert.deepEqual(ld.geo, {'@type': 'GeoCoordinates', latitude: 40.99, longitude: 29.03});
  assert.equal((ld.openingHoursSpecification as unknown[]).length, 3);
  assert.equal('aggregateRating' in ld, false);
  const bare = businessJsonLd(decodeBusiness(live('j2'), 'live').business)!;
  assert.deepEqual(Object.keys(bare).sort(), ['@context', '@type', 'address', 'name']);
  assert.equal(businessJsonLd(sampleBusinesses[0] as Business), null);
  assert.equal(serializeJsonLd({name: '</script><b>&'}), '{"name":"\\u003c/script\\u003e\\u003cb\\u003e\\u0026"}');
});

test('robots.txt blocks everything and there is no sitemap until indexing is enabled', () => {
  assert.equal(robotsTxt({indexingEnabled: false, siteOrigin: 'https://otosanayide.example'}), 'User-agent: *\nDisallow: /\n');
  assert.equal(robotsTxt({indexingEnabled: true, siteOrigin: ''}), 'User-agent: *\nDisallow: /\n');
  const open = robotsTxt({indexingEnabled: true, siteOrigin: 'https://otosanayide.example'});
  assert.match(open, /Disallow: \/hesabim/);
  assert.match(open, /Sitemap: https:\/\/otosanayide\.example\/sitemap\.xml/);
  assert.match(sitemapXml('https://otosanayide.example'), /<loc>https:\/\/otosanayide\.example\/<\/loc>/);
});

test('CSP allows the API origin only in live mode and maps origins only with a key', () => {
  const live = contentSecurityPolicy({appMode: 'live', apiOrigin: 'https://api.otosanayide.com', googleMapsKey: ''});
  assert.match(live, /connect-src 'self' https:\/\/api\.otosanayide\.com;/);
  assert.match(live, /frame-ancestors 'none'/);
  assert.match(live, /object-src 'none'/);
  assert.doesNotMatch(live, /googleapis/);
  const demo = contentSecurityPolicy({appMode: 'demo', apiOrigin: 'https://api.otosanayide.com', googleMapsKey: ''});
  assert.match(demo, /connect-src 'self';/);
  assert.match(contentSecurityPolicy({appMode: 'live', apiOrigin: 'https://api.otosanayide.com', googleMapsKey: 'k'}), /script-src 'self' 'unsafe-inline' https:\/\/maps\.googleapis\.com/);
  assert.match(contentSecurityPolicy({appMode: 'live', apiOrigin: 'https://api.otosanayide.com/x', googleMapsKey: ''}), /connect-src 'self';/);
});
