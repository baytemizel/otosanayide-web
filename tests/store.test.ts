import assert from 'node:assert/strict';
import {beforeEach, test} from 'node:test';
import {createPinia, setActivePinia} from 'pinia';
import {configureEnv} from '../app/lib/env';
import {useAppStore} from '../app/stores/app';

const memory = new Map<string, string>();
Object.assign(globalThis, {
  localStorage: {getItem: (key: string) => memory.get(key) ?? null, setItem: (key: string, value: string) => void memory.set(key, value)},
});

beforeEach(() => {
  memory.clear();
  configureEnv({appMode: 'demo'});
  setActivePinia(createPinia());
});

const settled = () => new Promise(resolve => setTimeout(resolve, 0));
const vehicle = {brand: 'Fiat', model: 'Egea', year: 2020, fuel: 'Benzin', mileage: 1000};

test('demo starts signed out and becomes ready without any session service', async () => {
  const store = useAppStore();
  store.start();
  await settled();
  assert.equal(store.ready, true);
  assert.equal(store.member, false);
  assert.equal(store.user, null);
});

test('demo login persists preview data locally and logout keeps it', async () => {
  const store = useAppStore();
  store.start();
  await settled();
  store.loginDemo();
  assert.equal(store.member, true);
  await store.save('vehicles', vehicle);
  assert.equal(store.data.vehicles.length, 1);
  await store.logout();
  assert.equal(store.member, false);
  assert.equal(store.data.vehicles.length, 1);
});

test('writes are refused for a visitor who is not a member', async () => {
  const store = useAppStore();
  store.start();
  await settled();
  await assert.rejects(store.save('vehicles', vehicle), /giriş yap/);
});

test('only one account write can run at a time', async () => {
  const store = useAppStore();
  store.start();
  await settled();
  store.loginDemo();
  const first = store.save('vehicles', vehicle);
  await assert.rejects(store.save('vehicles', vehicle), /işlem sürüyor/);
  await first;
});

test('accountGuard rejects once the session has changed', () => {
  const store = useAppStore();
  store.start();
  const guard = store.accountGuard('u1');
  assert.throws(guard, /Oturum değişti/);
});

test('stop raises the session fence for captured guards', () => {
  const store = useAppStore();
  store.start();
  const guard = store.accountGuard('u1');
  store.stop();
  assert.throws(guard, /Oturum değişti/);
});

test('v2 garage fields: plate is kept, a null clear drops it, a record can be edited and deleted', async () => {
  const store = useAppStore();
  store.start();
  await settled();
  store.loginDemo();
  await store.save('vehicles', {...vehicle, plate: '34 ABC 123', transmission: 'manual'});
  const car = store.data.vehicles[0]!;
  assert.equal(car.plate, '34 ABC 123');
  await store.update('vehicles', car.id, {...vehicle, plate: null, transmission: 'automatic'});
  assert.equal('plate' in store.data.vehicles[0]!, false);
  assert.equal(store.data.vehicles[0]!.transmission, 'automatic');

  const record = {vehicleId: car.id, title: 'Yağ değişimi', date: '2026-01-10', mileage: 1200, amount: 900, note: '', type: 'oil', providerName: 'Örnek Garaj'};
  await store.save('maintenance', record);
  const id = store.data.maintenance[0]!.id;
  await store.update('maintenance', id, {...record, amount: 950, providerName: null, documentKind: 'invoice'});
  assert.equal(store.data.maintenance[0]!.amount, 950);
  assert.equal(store.data.maintenance[0]!.documentKind, 'invoice');
  assert.equal('providerName' in store.data.maintenance[0]!, false);
  await assert.rejects(store.update('maintenance', id, {...record, vehicleId: 'other'}), /araç değiştirilemez/);
  await store.remove('maintenance', id);
  assert.equal(store.data.maintenance.length, 0);
  await assert.rejects(store.remove('maintenance', id), /Kayıt bulunamadı/);
});
