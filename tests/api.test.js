import test from 'node:test';
import assert from 'node:assert/strict';
import { createApi } from '../src/api/vrchatApi.js';
import { sessionRequest } from '../src/api/sessionRequest.js';
import { createAccessoryLookup, normalizeAccessory } from '../src/models/accessory.js';
import { mergeLookAvatars, normalizeAvatar } from '../src/models/avatar.js';
const look = id => ({ id: `inv_${id}`, name: 'Look', metadata: { avatarId: 'avtr_test', attachments: [] } });
const avatar = id => ({ id: `avtr_${id}`, name: `Avatar ${id}`, imageUrl: `https://example.com/${id}.png` });
const accessory = id => ({ id: `avp_${id}`, name: `Accessory ${id}`, imageUrl: `https://example.com/${id}.png` });
test('pagination fetches beyond 100 and stops at total count', async () => {
  const offsets = [];
  const api = createApi(async (_, offset) => { offsets.push(offset); return { ok: true, data: { data: offset ? [look(100)] : Array.from({ length: 100 }, (_, i) => look(i)), totalCount: 101 } }; });
  assert.equal((await api.getAllAvatarLooks()).length, 101);
  assert.deepEqual(offsets, [0, 100]);
});
test('repeated pages reject instead of looping', async () => {
  const api = createApi(async () => ({ ok: true, data: { data: [look(1)] } }));
  await assert.rejects(api.getAllAvatarLooks(), /repeated/);
});
test('empty inventory terminates without more requests', async () => {
  let calls = 0;
  const api = createApi(async () => { calls++; return { ok: true, data: { data: [] } }; });
  assert.deepEqual(await api.getAllAvatarLooks(), []); assert.equal(calls, 1);
});
test('avatar pagination loads all own avatars', async () => {
  const offsets = [];
  const api = createApi(async (_, offset) => { offsets.push(offset); return { ok: true, data: offset ? [avatar('100')] : Array.from({ length: 100 }, (_, i) => avatar(i)) }; });
  assert.equal((await api.getAllAvatars()).length, 101);
  assert.deepEqual(offsets, [0, 100]);
});
test('accessory pagination loads inventory accessory metadata', async () => {
  const offsets = [];
  const api = createApi(async (_, offset) => { offsets.push(offset); return { ok: true, data: { data: offset ? [accessory('100')] : Array.from({ length: 100 }, (_, i) => accessory(i)), totalCount: 101 } }; });
  assert.equal((await api.getAllAccessories()).length, 101);
  assert.deepEqual(offsets, [0, 100]);
});
test('accessory normalization keeps label and preview fields only', () => {
  assert.deepEqual(normalizeAccessory({ id: 'inv_accessory', metadata: { partId: 'avp_watch', name: 'Watch', imageUrl: 'preview' }, secret: 'drop' }), { id: 'inv_accessory', partId: 'avp_watch', name: 'Watch', imageUrl: 'preview', thumbnailImageUrl: null });
});
test('accessory normalization supports VRChat avatarPartId metadata shape', () => {
  assert.deepEqual(normalizeAccessory({ id: 'inv_afcf2b5c-4303-4896-8481-ee954101410d', name: 'G-SHOCK DW5600 Black', imageUrl: 'https://api.vrchat.cloud/api/1/image/file_0a809430-c361-4b83-89b1-eb59880cf51e/1/256', metadata: { avatarPartId: 'avp_a866a7a5-6791-46ab-864a-5598202d8d20', fileId: 'file_0de438d2' } }), { id: 'inv_afcf2b5c-4303-4896-8481-ee954101410d', partId: 'avp_a866a7a5-6791-46ab-864a-5598202d8d20', name: 'G-SHOCK DW5600 Black', imageUrl: 'https://api.vrchat.cloud/api/1/image/file_0a809430-c361-4b83-89b1-eb59880cf51e/1/256', thumbnailImageUrl: null });
});
test('accessory lookup resolves by inventory id and part id', () => {
  const lookup = createAccessoryLookup([normalizeAccessory({ id: 'inv_accessory', partId: 'avp_watch', name: 'Watch' })]);
  assert.equal(lookup.get('inv_accessory').name, 'Watch');
  assert.equal(lookup.get('avp_watch').name, 'Watch');
});
test('avatar normalization keeps display fields only', () => {
  assert.deepEqual(normalizeAvatar({ ...avatar('test'), thumbnailImageUrl: 'thumb', assetUrl: 'secret' }), { id: 'avtr_test', name: 'Avatar test', imageUrl: 'https://example.com/test.png', thumbnailImageUrl: 'thumb' });
});
test('look avatars are merged when avatar list misses them', () => {
  assert.deepEqual(mergeLookAvatars([normalizeAvatar(avatar('known'))], [{ metadata: { avatarId: 'avtr_missing' } }]).map(a => a.id), ['avtr_known', 'avtr_missing']);
});
test('attachment display names are kept for UI but not serialized', async () => {
  const api = createApi(async () => ({ ok: true, data: { data: [{ id: 'inv_label', name: 'Look', metadata: { avatarId: 'avtr_test', attachments: [{ partId: 'avp_watch', displayName: 'Wrist Watch', path: 'bone', position: [0, 0, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] }] } }], totalCount: 1 } }));
  const [look] = await api.getAllAvatarLooks();
  assert.equal(look.metadata.attachments[0].displayName, 'Wrist Watch');
  assert.equal(JSON.stringify(look.metadata.attachments[0]).includes('Wrist Watch'), false);
});
test('429 surfaces without retry', async () => {
  let calls = 0;
  const api = createApi(async () => { calls++; return { status: 429 }; });
  await assert.rejects(api.getCurrentUser(), /Rate limited/); assert.equal(calls, 1);
});
test('invalid create never reaches transport', async () => {
  let calls = 0;
  const api = createApi(async () => { calls++; });
  assert.throws(() => api.createAvatarLook({}), /name/); assert.equal(calls, 0);
});
test('session bridge uses same-origin credentials and returns only safe user fields', async () => {
  const original = globalThis.fetch;
  globalThis.location = { origin: 'https://vrchat.com' };
  delete globalThis.__accessoryTransferState;
  globalThis.fetch = async (url, options) => {
    assert.equal(url, '/api/1/auth/user'); assert.equal(options.credentials, 'include'); assert.equal(options.redirect, 'error');
    return { status: 200, ok: true, json: async () => ({ id: 'usr_test', displayName: 'Test', authToken: 'must-not-return' }) };
  };
  try { assert.deepEqual((await sessionRequest('user')).data, { id: 'usr_test', displayName: 'Test' }); }
  finally { globalThis.fetch = original; delete globalThis.location; delete globalThis.__accessoryTransferState; }
});
test('session bridge uses the own avatars endpoint', async () => {
  const original = globalThis.fetch;
  globalThis.location = { origin: 'https://vrchat.com' };
  delete globalThis.__accessoryTransferState;
  globalThis.fetch = async (url) => {
    assert.equal(url, '/api/1/avatars?n=100&offset=0&sort=updated&order=descending&releaseStatus=all&user=me');
    return { status: 200, ok: true, json: async () => [] };
  };
  try { assert.deepEqual((await sessionRequest('avatars', 0)).data, []); }
  finally { globalThis.fetch = original; delete globalThis.location; delete globalThis.__accessoryTransferState; }
});
test('session bridge uses the accessory inventory endpoint', async () => {
  const original = globalThis.fetch;
  globalThis.location = { origin: 'https://vrchat.com' };
  delete globalThis.__accessoryTransferState;
  globalThis.fetch = async (url) => {
    assert.equal(url, '/api/1/inventory?n=100&offset=0&order=newest&types=accessory');
    return { status: 200, ok: true, json: async () => ({ data: [], totalCount: 0 }) };
  };
  try { assert.deepEqual((await sessionRequest('accessories', 0)).data, { data: [], totalCount: 0 }); }
  finally { globalThis.fetch = original; delete globalThis.location; delete globalThis.__accessoryTransferState; }
});
test('session bridge enforces cooldown and sends a create only once', async () => {
  const original = globalThis.fetch;
  globalThis.location = { origin: 'https://vrchat.com' };
  delete globalThis.__accessoryTransferState;
  let calls = 0;
  globalThis.fetch = async (url, options) => {
    calls++; assert.equal(url, '/api/1/avatar-look'); assert.equal(options.method, 'POST');
    return { status: 429, ok: false, headers: { get: () => '120' }, json: async () => ({}) };
  };
  try {
    assert.equal((await sessionRequest('create', {})).status, 429);
    assert.equal((await sessionRequest('create', {})).status, 429);
    assert.equal(calls, 1);
    assert.ok(globalThis.__accessoryTransferState.next > Date.now() + 110000);
  } finally { globalThis.fetch = original; delete globalThis.location; delete globalThis.__accessoryTransferState; }
});
