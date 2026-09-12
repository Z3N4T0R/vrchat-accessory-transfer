import test from 'node:test';
import assert from 'node:assert/strict';
import { buildEditableAttachment, buildTransferredLook } from '../src/services/transferService.js';
const source = (partId = 'avp_watch') => ({ partId, path: '~HumanBone:LeftLowerArm', position: [0.00125345587730408, 0.255962818861008, 0.00362658873200417], rotation: [0.123746864497662, -0.119149714708328, -0.683502376079559, 0.709446728229523], scale: [1.193608045578, 1.19360792636871, 1.19360816478729], isEnabled: false, variables: [{ name: 'color', value: [1, 2, 3] }] });
const target = attachments => ({ id: 'inv_target', metadata: { avatarId: 'avtr_target', attachments } });
const build = overrides => buildTransferredLook({ sourceAttachment: source(), targetAvatarId: 'avtr_target', newName: 'Copied watch', ...overrides });
test('copies exact source numbers, quaternion order, disabled state and nested variables', () => assert.deepEqual(build().metadata.attachments[0], source()));
test('transfers multiple accessories in one new look', () => {
  const watch = source('avp_watch'), hat = source('avp_hat');
  const result = build({ sourceAttachments: [watch, hat] });
  assert.deepEqual(result.metadata.attachments, [watch, hat]);
});
test('target look avatar takes precedence and existing attachments survive', () => {
  const other = source('avp_hat');
  const result = build({ targetLook: target([other]), targetAvatarId: 'avtr_wrong' });
  assert.equal(result.metadata.avatarId, 'avtr_target');
  assert.deepEqual(result.metadata.attachments, [other, source()]);
});
test('source avatar and inventory IDs never enter payload; target inventory IDs also removed', () => {
  const a = { ...source(), avatarId: 'avtr_source', inventoryItemId: 'inv_secret', inventoryItemTemplateId: 'invt_secret' };
  const result = build({ sourceAttachment: a, targetLook: target([{ ...a, partId: 'avp_other' }]) });
  assert.equal(result.metadata.avatarId, 'avtr_target');
  for (const item of result.metadata.attachments) for (const key of ['avatarId', 'inventoryItemId', 'inventoryItemTemplateId']) assert.equal(key in item, false);
});
test('replace removes all same-part matches and preserves unrelated attachments', () => {
  const old = { ...source(), position: [9, 9, 9] }, other = { ...source(), partId: 'avp_other' };
  assert.deepEqual(build({ targetLook: target([old, other, old]) }).metadata.attachments, [other, source()]);
});
test('keep both appends', () => assert.equal(build({ targetLook: target([source()]), duplicateBehavior: 'keep-both' }).metadata.attachments.length, 2));
test('cancel rejects duplicate, permits no conflict', () => {
  assert.throws(() => build({ targetLook: target([source()]), duplicateBehavior: 'cancel' }), /cancelled/);
  assert.equal(build({ duplicateBehavior: 'cancel' }).metadata.attachments.length, 1);
});
test('source and target are never mutated or aliased', () => {
  const a = source(), t = target([{ ...source(), partId: 'avp_hat' }]);
  const before = structuredClone({ a, t });
  const result = build({ sourceAttachment: a, targetLook: t });
  result.metadata.attachments[1].variables[0].value[0] = 42;
  result.metadata.attachments[0].position[0] = 42;
  assert.deepEqual({ a, t }, before);
});
test('field selection can keep existing transform fields from the target duplicate', () => {
  const existing = { ...source(), path: '~HumanBone:Head', position: [9, 9, 9], rotation: [0, 0, 0, 1], scale: [2, 2, 2] };
  const result = build({ targetLook: target([existing]), selectedFields: ['position'], duplicateBehavior: 'keep-both' });
  assert.deepEqual(result.metadata.attachments[1], { ...source(), path: existing.path, rotation: existing.rotation, scale: existing.scale });
});
test('editable values override copied values and preserve exact numbers', () => {
  const result = buildEditableAttachment({ sourceAttachment: source(), values: { path: '~HumanBone:RightHand', position: [1.25, 2.5, 3.75], rotation: [0.1, 0.2, 0.3, 0.4], scale: [0.5, 0.6, 0.7] } });
  assert.equal(result.path, '~HumanBone:RightHand');
  assert.deepEqual(result.position, [1.25, 2.5, 3.75]);
  assert.deepEqual(result.rotation, [0.1, 0.2, 0.3, 0.4]);
  assert.deepEqual(result.scale, [0.5, 0.6, 0.7]);
});
test('requires at least one selected accessory', () => assert.throws(() => build({ sourceAttachments: [] }), /at least one/));
for (const [field, invalids] of Object.entries({ position: [[1, 2], ['1', 2, 3], [NaN, 0, 0]], rotation: [[0, 0, 1], [0, 0, Infinity, 1]], scale: [[1, 1], [1, -Infinity, 1]] })) {
  for (const [index, value] of invalids.entries()) test(`rejects invalid ${field} case ${index}`, () => assert.throws(() => build({ sourceAttachment: { ...source(), [field]: value } }), /finite numbers/));
}
test('invalid preserved target attachment rejects whole creation', () => assert.throws(() => build({ targetLook: target([{ ...source(), partId: 'avp_other', path: null }]) }), /path/));
test('validates name, avatar, part, boolean, variables and duplicate mode', () => {
  for (const override of [{ newName: '  ' }, { targetAvatarId: 'wrong' }, { duplicateBehavior: 'wrong' }, ...[{ partId: 'wrong' }, { isEnabled: 'true' }, { variables: {} }, { variables: [NaN] }].map(fields => ({ sourceAttachment: { ...source(), ...fields } }))]) assert.throws(() => build(override));
});
