import assert from 'node:assert/strict';
import test from 'node:test';
import {reminderCalendar} from '@otosanayide/core/calendar';
import type {Maintenance, Reminder, Vehicle} from '@otosanayide/core';
import {AccountRequestError, parseAccountData} from '@otosanayide/core/account-client';
import {accountUpdateSchema} from '@otosanayide/core/account-update';
import {ApiError} from '../app/lib/api-read';
import {SessionRequestError} from '../app/lib/session';
import {authErrorMessage, credentialErrors, returnPath} from '../app/lib/v2/auth';
import {
  addDays, checkPlate, daysBetween, formatDay, garageErrorMessage, inspectionView, istanbulToday, liveRecord, liveReminder, liveVehicle, maintenanceInput,
  maskEmail, notifyText, parseAmount, parseWhole, reminderInput, reminderPayload, reminderToggle, reminderTopicFor, remainingText, ringProgress, vehicleInput,
} from '../app/lib/v2/garage';
import {accusative, eachLimited, listErrorMessage, listNameError, liveChips, replaceList} from '../app/lib/v2/saved';

const bmw: Vehicle = {id: 'v1', brand: 'BMW', model: '320i', year: 2019, fuel: 'Benzin', mileage: 86400, inspectionDueDate: '2027-03-12'};

test('v1 vehicle maps to the W11 card without plate or transmission', () => {
  const view = liveVehicle(bmw);
  assert.equal(view.model, 'BMW 320i');
  assert.equal(view.km, 86400);
  assert.equal(view.plate, null);
  assert.equal(view.transmission, '');
  assert.equal(view.inspectionDueDate, '2027-03-12');
  assert.equal(view.source, bmw);
});

test('live maintenance record keeps note and mileage in the detail line', () => {
  const row = liveRecord({id: 'm1', vehicleId: 'v1', title: 'Periyodik bakım', date: '2026-10-12', mileage: 84000, amount: 7850, note: 'Örnek Teknik Garaj'});
  assert.equal(row.detail, 'Örnek Teknik Garaj · 84.000 km');
  assert.equal(row.kind, 'bakim');
  assert.equal(row.document, null);
  assert.equal(liveRecord({id: 'm2', vehicleId: 'v1', title: 'Lastik', date: '2026-03-05', mileage: 81200, amount: 2400, note: ''}).detail, '81.200 km');
  assert.equal(liveRecord({id: 'm3', vehicleId: 'v1', title: 'Fatura', date: '2026-03-05', mileage: 1, amount: 1, note: '', attachmentIds: ['0d3c6a2e-8b5b-4b9e-9f63-8c1b0a3c1f10']}).document, 'Belge');
});

test('remaining text and ring follow the mock rules', () => {
  assert.equal(remainingText(-2), '2 gün geçti');
  assert.equal(remainingText(0), 'Bugün');
  assert.equal(remainingText(14), '14 gün');
  assert.equal(remainingText(60), '60 gün');
  assert.equal(remainingText(93), '3 ay');
  assert.equal(ringProgress(0, 180), 1);
  assert.equal(ringProgress(-5, 180), 1);
  assert.equal(ringProgress(180, 180), 0.04);
  assert.equal(ringProgress(90, 180), 0.5);
});

test('dated reminder: days from today in Türkiye, tone and completed state', () => {
  const r: Reminder = {id: 'r1', vehicleId: 'v1', title: 'Muayene', dueDate: '2026-12-01', channels: ['email'], advanceDays: 7};
  const view = liveReminder(r, bmw, '2026-11-18');
  assert.equal(view.remaining, '13 gün');
  assert.equal(view.tone, 'orange');
  assert.equal(view.dateText, formatDay('2026-12-01'));
  assert.equal(view.notifyText, '7 gün önce');
  assert.deepEqual([view.push, view.email, view.active], [false, true, true]);
  assert.equal(view.sort, 13);
  const later = liveReminder({...r, dueDate: '2027-06-01'}, bmw, '2026-11-18');
  assert.equal(later.tone, 'green');
  const done = liveReminder({...r, completed: true}, bmw, '2026-11-18');
  assert.equal(done.active, false);
  assert.equal(done.tone, 'muted');
  assert.equal(done.offText, 'Tamamlandı');
  // advanceDays missing → the core default of 1 day.
  assert.equal(liveReminder({...r, advanceDays: undefined}, bmw, '2026-11-18').notifyText, '1 gün önce');
});

test('km reminder: remaining km from the last recorded mileage, sorted after dated ones', () => {
  const r: Reminder = {id: 'r2', vehicleId: 'v1', title: 'Yağ değişimi', dueKm: 94000};
  const view = liveReminder(r, bmw, '2026-11-18');
  assert.equal(view.remaining, '7.600 km');
  assert.equal(view.dateText, 'Hedef 94.000 km');
  assert.equal(view.tone, 'green');
  assert.ok(view.sort > 1_000_000);
  const due = liveReminder({...r, dueKm: 86000}, bmw, '2026-11-18');
  assert.equal(due.remaining, 'Eşik geldi');
  assert.equal(due.tone, 'orange');
  assert.equal(due.progress, 1);
});

test('inspection date becomes a read-only summary card', () => {
  const view = inspectionView(liveVehicle(bmw), '2026-11-18');
  assert.ok(view);
  assert.equal(view.label, 'Muayene');
  assert.equal(view.remaining, '4 ay');
  assert.equal(inspectionView(liveVehicle({...bmw, inspectionDueDate: undefined}), '2026-11-18'), null);
});

test('dates in Türkiye time', () => {
  assert.equal(istanbulToday(new Date('2026-11-17T22:30:00Z')), '2026-11-18');
  assert.equal(daysBetween('2026-11-18', '2026-12-01'), 13);
  assert.equal(addDays('2026-11-18', 30), '2026-12-18');
  assert.equal(formatDay('2026-12-01'), '1 Aralık 2026');
});

test('amount and whole-number parsing', () => {
  assert.equal(parseAmount('2400'), 2400);
  assert.equal(parseAmount('2.400'), 2400);
  assert.equal(parseAmount('2.400,50'), 2400.5);
  assert.equal(parseAmount('2400,5'), 2400.5);
  assert.equal(parseAmount('12.5'), 12.5);
  assert.equal(parseAmount(''), null);
  assert.equal(parseAmount('12,345,6'), null);
  assert.equal(parseAmount('-5'), null);
  assert.equal(parseWhole('86.400'), 86400);
  assert.equal(parseWhole('86400'), 86400);
  assert.equal(parseWhole('8,6'), null);
});

const draftVehicle = {brand: 'Renault', model: 'Clio', year: 2020, km: 72500, fuel: 'Dizel', transmission: '', plate: null, plateHidden: false, inspectionDueDate: ''};

test('form drafts become strict account-model values', () => {
  const photoId = '0d3c6a2e-8b5b-4b9e-9f63-8c1b0a3c1f10';
  // A demo transmission label is not an API value and is not sent.
  const vehicle = vehicleInput({...draftVehicle, transmission: 'Manuel'}, {...bmw, photoId});
  assert.deepEqual(vehicle, {brand: 'Renault', model: 'Clio', year: 2020, fuel: 'Dizel', mileage: 72500, photoId});
  assert.throws(() => vehicleInput({...draftVehicle, km: 1, fuel: 'Elektrik'}));

  const record = maintenanceInput({vehicleId: 'v1', title: 'Yağ değişimi', place: 'Örnek Garaj', kind: 'bakim', amount: 1200.5, date: '2026-11-01', document: 'Fatura', mileage: 86000, type: 'oil', documentKind: 'invoice', note: 'Filtre'});
  assert.deepEqual(record, {vehicleId: 'v1', title: 'Yağ değişimi', date: '2026-11-01', mileage: 86000, amount: 1200.5, note: 'Filtre', type: 'oil', providerName: 'Örnek Garaj', documentKind: 'invoice'});
  assert.throws(() => maintenanceInput({vehicleId: 'v1', title: 'Gelecek', place: '', kind: 'bakim', amount: 1, date: '2999-01-01', document: '', mileage: 1}));

  const reminder = reminderInput({vehicleId: 'v1', topic: 'Araç muayenesi', date: '2027-01-10', dueKm: null, notify: [3], push: true, email: false});
  assert.deepEqual(reminder, {vehicleId: 'v1', title: 'Araç muayenesi', completed: false, enabled: true, topic: 'inspection', dueDate: '2027-01-10', channels: ['push'], advanceDays: 3, advanceDaysList: [3]});
  const kmOnly = reminderInput({vehicleId: 'v1', topic: 'Yağ değişimi', date: '', dueKm: 95000, notify: [], push: false, email: true});
  assert.deepEqual(kmOnly, {vehicleId: 'v1', title: 'Yağ değişimi', completed: false, enabled: true, topic: 'oil', dueKm: 95000, channels: ['email'], advanceDays: 0, advanceDaysList: [0]});
  assert.throws(() => reminderInput({vehicleId: 'v1', topic: 'Boş', date: '', dueKm: null, notify: [1], push: false, email: false}));
});

test('v2 vehicle: plate is normalised, transmission sent as the API value, cleared plate becomes null', () => {
  assert.deepEqual(checkPlate(' 34abc123 '), {plate: '34 ABC 123', error: ''});
  assert.deepEqual(checkPlate(''), {plate: null, error: ''});
  assert.equal(checkPlate('34 ÖRN 1').error, 'Plakayı 34 ABC 123 biçiminde yaz.');
  assert.equal(checkPlate('99 AB 123').error, 'Plakayı 34 ABC 123 biçiminde yaz.');
  const created = vehicleInput({...draftVehicle, transmission: 'semi_automatic', plate: '06 ab 4567'});
  assert.equal(created.plate, '06 AB 4567');
  assert.equal(created.transmission, 'semi_automatic');
  // Edit without plate/transmission while the stored vehicle has them: null clears them (PATCH).
  const stored: Vehicle = {...bmw, plate: '34 ABC 123', transmission: 'automatic', vin: 'WBA8E9G50GNU12345'};
  const cleared = vehicleInput(draftVehicle, stored);
  assert.equal(cleared.plate, null);
  assert.equal(cleared.transmission, null);
  assert.equal('vin' in cleared, false, 'VIN has no web field: left out, so the API keeps it');
  assert.ok(accountUpdateSchema.safeParse({resource: 'vehicles', id: 'v1', value: cleared}).success);
  // A new vehicle never sends null.
  assert.equal('plate' in vehicleInput(draftVehicle), false);
});

test('v2 vehicle and record map to the W11 plate, transmission, kind, icon and document', () => {
  const view = liveVehicle({...bmw, plate: '34 ABC 123', transmission: 'automatic'});
  assert.equal(view.plate, '34 ABC 123');
  assert.equal(view.transmission, 'Otomatik');
  assert.equal(view.plateHidden, false);
  const base: Maintenance = {id: 'm1', vehicleId: 'v1', title: 'Trafik sigortası', date: '2026-02-18', mileage: 79000, amount: 750, note: 'Poliçe yenileme'};
  const insurance = liveRecord({...base, type: 'insurance', documentKind: 'policy', providerName: 'Örnek Sigorta'});
  assert.deepEqual([insurance.kind, insurance.icon, insurance.document, insurance.detail], ['gider', 'shield', 'Poliçe', 'Örnek Sigorta · Poliçe yenileme · 79.000 km']);
  const oil = liveRecord({...base, type: 'oil', documentKind: 'other', note: ''});
  assert.deepEqual([oil.kind, oil.icon, oil.document, oil.detail], ['bakim', 'droplet', 'Belge', '79.000 km']);
  assert.equal(liveRecord({...base, note: '', businessId: 'ornek-isletme'}).detail, 'Kayıtlı servis · 79.000 km');
  assert.equal(liveRecord({...base, type: 'tyre'}).icon, 'tyre');
});

test('v2 record edit sends the whole record; cleared provider and document become null, businessId is kept by omission', () => {
  const stored: Maintenance = {id: 'm1', vehicleId: 'v1', title: 'Bakım', date: '2026-10-12', mileage: 84000, amount: 7850, note: '', type: 'periodic', providerName: 'Örnek Garaj', documentKind: 'invoice', businessId: 'ornek-isletme'};
  const value = maintenanceInput({id: 'm1', vehicleId: 'v1', title: 'Bakım', place: '', kind: 'bakim', amount: 7900, date: '2026-10-12', document: '', mileage: 84000, type: 'repair', documentKind: '', note: 'Düzeltildi'}, stored);
  assert.deepEqual(value, {vehicleId: 'v1', title: 'Bakım', date: '2026-10-12', mileage: 84000, amount: 7900, note: 'Düzeltildi', type: 'repair', providerName: null, documentKind: null});
  const parsed = accountUpdateSchema.parse({resource: 'maintenance', id: 'm1', value, expectedGarageRevision: 3});
  assert.equal(parsed.resource, 'maintenance');
  assert.equal(accountUpdateSchema.safeParse({resource: 'maintenance', id: 'm1', value: {...value, title: null}}).success, false);
  assert.equal(accountUpdateSchema.safeParse({resource: 'maintenance', id: 'm1', value: {...value, date: '2999-01-01'}}).success, false);
});

test('v2 reminder: several notice days, topic and on/off', () => {
  const r: Reminder = {id: 'r1', vehicleId: 'v1', title: 'Araç muayenesi', dueDate: '2026-12-01', channels: ['email'], advanceDays: 7, advanceDaysList: [0, 1, 7], topic: 'inspection', enabled: true};
  const view = liveReminder(r, bmw, '2026-11-18');
  assert.equal(view.notifyText, 'Hedef gün, 1 gün önce, 7 gün önce');
  assert.equal(view.label, 'Muayene');
  assert.equal(view.active, true);
  const off = liveReminder({...r, enabled: false}, bmw, '2026-11-18');
  assert.deepEqual([off.active, off.offText, off.tone], [false, 'Kapalı', 'muted']);
  assert.equal(liveReminder({...r, completed: true}, bmw, '2026-11-18').offText, 'Tamamlandı');
  assert.equal(liveReminder({...r, topic: 'insurance', title: 'Kasko'}, bmw, '2026-11-18').label, 'Kasko');

  const days = reminderInput({vehicleId: 'v1', topic: 'Kasko', date: '2027-01-10', dueKm: null, notify: [7, 0, 1, 3], push: false, email: true});
  assert.deepEqual([days.advanceDaysList, days.advanceDays, days.topic], [[0, 1, 3], 3, 'insurance']);
  assert.equal(reminderTopicFor('Bilinmeyen'), 'other');
});

test('reminder switch: off sends enabled false, on also clears completed; stored v2 fields go along', () => {
  const stored: Reminder = {id: 'r1', vehicleId: 'v1', title: 'Muayene', dueDate: '2026-12-01', channels: ['email'], advanceDays: 7, advanceDaysList: [1, 7], topic: 'inspection', completed: true};
  assert.deepEqual(reminderToggle(stored, false), {vehicleId: 'v1', title: 'Muayene', dueDate: '2026-12-01', dueKm: undefined, channels: ['email'], advanceDays: 7, completed: true, enabled: false, topic: 'inspection', advanceDaysList: [1, 7]});
  const on = reminderToggle(stored, true);
  assert.deepEqual([on.enabled, on.completed], [true, false]);
  assert.ok(accountUpdateSchema.safeParse({resource: 'reminders', id: 'r1', value: on}).success);
  // An old reminder without v2 fields: enabled defaults to true, nothing else is invented.
  const old = reminderPayload({id: 'r2', vehicleId: 'v1', title: 'Yağ', dueKm: 90000});
  assert.deepEqual([old.enabled, old.topic, old.advanceDaysList], [true, undefined, undefined]);
});

test('GET /api/me?v=2 data passes the strict core parser; unknown fields still fail', () => {
  const data = {
    vehicles: [{id: 'v1', brand: 'BMW', model: '320i', year: 2019, fuel: 'Benzin', mileage: 86400, plate: '34 ABC 123', transmission: 'automatic', vin: 'WBA8E9G50GNU12345'}],
    maintenance: [{id: 'm1', vehicleId: 'v1', title: 'Bakım', date: '2026-10-12', mileage: 84000, amount: 7850, note: '', type: 'periodic', businessId: 'ornek-isletme', providerName: 'Örnek', documentKind: 'invoice'}],
    reminders: [{id: 'r1', vehicleId: 'v1', title: 'Muayene', dueDate: '2026-12-01', advanceDays: 7, enabled: false, topic: 'inspection', advanceDaysList: [0, 7], nextCheckAtMs: 1, createdAt: {_seconds: 1, _nanoseconds: 0}}],
    favorites: [],
    garageShared: false,
    garageRevision: null,
  };
  const parsed = parseAccountData(data);
  assert.equal(parsed.vehicles[0]!.plate, '34 ABC 123');
  assert.equal(parsed.maintenance[0]!.documentKind, 'invoice');
  assert.deepEqual([parsed.reminders[0]!.enabled, parsed.reminders[0]!.advanceDaysList], [false, [0, 7]]);
  assert.throws(() => parseAccountData({...data, vehicles: [{...data.vehicles[0], plateHidden: true}]}));
  assert.throws(() => parseAccountData({...data, maintenance: [{...data.maintenance[0], type: 'wash'}]}));
  assert.throws(() => parseAccountData({...data, reminders: [{...data.reminders[0], advanceDaysList: [0, 1, 3, 7]}]}));
});

test('.ics from the core calendar for a live draft', () => {
  const value = reminderInput({vehicleId: 'v1', topic: 'Araç muayenesi', date: '2027-01-10', dueKm: null, notify: [7], push: false, email: false});
  const ics = reminderCalendar({...value, id: 'x1'} as Reminder, bmw, new Date('2026-11-18T08:00:00Z'));
  assert.match(ics, /DTSTART:20270110T060000Z/);
  assert.match(ics, /TRIGGER:-PT168H/);
  assert.match(ics, /SUMMARY:Araç muayenesi · BMW 320i/);
});

test('notify text, e-mail mask and garage errors', () => {
  assert.equal(notifyText([0, 7]), 'Hedef gün, 7 gün önce');
  assert.equal(maskEmail('deniz@example.com'), 'd***@example.com');
  assert.equal(maskEmail(''), '');
  assert.match(garageErrorMessage(new AccountRequestError(403, 'x')), /doğrula/);
  assert.match(garageErrorMessage(new AccountRequestError(401, 'x')), /Oturum/);
  assert.equal(garageErrorMessage(new AccountRequestError(409, 'Hesap kayıtları değişti.')), 'Hesap kayıtları değişti.');
  assert.equal(garageErrorMessage(Error('[{"code":"too_small"}]')), 'Bilgileri kontrol edip tekrar dene.');
  assert.equal(garageErrorMessage(Error('session_changed')), 'Bilgileri kontrol edip tekrar dene.');
  assert.equal(garageErrorMessage(Error('Önce ücretsiz hesabına giriş yap.')), 'Önce ücretsiz hesabına giriş yap.');
});

test('auth: return path, field errors and messages by status', () => {
  assert.equal(returnPath('/araclarim?arac=1'), '/araclarim?arac=1');
  assert.equal(returnPath('//evil.example'), null);
  assert.equal(returnPath('/\\evil.example'), null);
  assert.equal(returnPath('https://evil.example'), null);
  assert.equal(returnPath(['/x']), null);
  assert.deepEqual(credentialErrors('deniz@example.com', '123456789', true), {email: '', password: 'Şifre en az 10 karakter olmalı.'});
  assert.deepEqual(credentialErrors('deniz@example.com', '1', false), {email: '', password: ''});
  assert.equal(credentialErrors('deniz', 'x', false).email, 'Geçerli bir e-posta adresi yaz (ör. deniz@ornek.com).');
  assert.equal(authErrorMessage('login', new SessionRequestError(401)), 'E-posta adresi veya şifre hatalı.');
  assert.match(authErrorMessage('login', new SessionRequestError(429)), /Çok fazla/);
  assert.match(authErrorMessage('login', new TypeError('fetch failed')), /bağlantını/);
  assert.match(authErrorMessage('register', new SessionRequestError(400)), /10 karakter/);
  assert.match(authErrorMessage('mfa', new SessionRequestError(400)), /Kod doğrulanamadı/);
  assert.match(authErrorMessage('reset', new SessionRequestError(400)), /süresi dolmuş/);
  assert.equal(authErrorMessage('register', new SessionRequestError(501)), 'Bu işlem henüz kullanılamıyor.');
});

test('saved lists: names, chips, replace, errors', async () => {
  assert.equal(listNameError('  '), 'Listeye bir ad ver.');
  assert.equal(listNameError('x'.repeat(61)), 'Liste adı en çok 60 karakter olabilir.');
  assert.equal(listNameError('Kış'), '');
  const base = {businessIds: ['a'], unavailableIds: [], version: 1, createdAtMs: 1, updatedAtMs: 1};
  const lists = [
    {...base, id: '11111111-1111-4111-8111-111111111111', name: 'Kış', kind: 'list' as const},
    {...base, id: '22222222-2222-4222-8222-222222222222', name: 'Karşılaştırma', kind: 'comparison' as const},
  ];
  assert.deepEqual(liveChips(lists).map((c) => c.name), ['Kış']);
  const renamed = replaceList(lists, {...lists[0]!, name: 'Yaz', version: 2});
  assert.equal(renamed[0]!.name, 'Yaz');
  assert.equal(replaceList([], lists[0]!).length, 1);
  assert.match(listErrorMessage(new ApiError(409, 'x')), /sınıra/);
  assert.match(listErrorMessage(new ApiError(403, 'x')), /doğrula/);
  assert.equal(listErrorMessage(new ApiError(500, 'Sunucu hatası.')), 'Sunucu hatası.');
  let inFlight = 0;
  let peak = 0;
  const seen: number[] = [];
  await eachLimited([1, 2, 3, 4, 5, 6], 2, async (n) => {
    inFlight++;
    peak = Math.max(peak, inFlight);
    await new Promise((r) => setTimeout(r, 2));
    seen.push(n);
    inFlight--;
  });
  assert.equal(peak, 2);
  assert.deepEqual(seen.sort(), [1, 2, 3, 4, 5, 6]);
  assert.equal(accusative(1), 'i');
  assert.equal(accusative(3), 'ü');
  assert.equal(accusative(40), 'ı');
});
