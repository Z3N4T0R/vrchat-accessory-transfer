import { normalizeAttachment } from '../models/attachment.js';
import { validatePayload, validateAttachment } from '../utils/validation.js';
const copyFields = ['path', 'position', 'rotation', 'scale'];
export function buildEditableAttachment({ sourceAttachment, baseAttachment, selectedFields = copyFields, values = {} }) {
  validateAttachment(sourceAttachment);
  const selected = new Set(selectedFields);
  if (![...selected].every(field => copyFields.includes(field))) throw new Error('Unknown copy field.');
  const base = baseAttachment ? normalizeAttachment(baseAttachment) : normalizeAttachment(sourceAttachment);
  const source = normalizeAttachment(sourceAttachment);
  const result = {
    partId: source.partId,
    isEnabled: source.isEnabled,
    variables: source.variables,
    path: selected.has('path') ? source.path : base.path,
    position: selected.has('position') ? source.position : base.position,
    rotation: selected.has('rotation') ? source.rotation : base.rotation,
    scale: selected.has('scale') ? source.scale : base.scale
  };
  for (const [key, value] of Object.entries(values)) {
    if (!copyFields.includes(key)) throw new Error('Unknown editable field.');
    result[key] = structuredClone(value);
  }
  validateAttachment(result);
  return normalizeAttachment(result);
}
export function buildTransferredLook({ sourceAttachment, sourceAttachments, targetLook, targetAvatarId, newName, duplicateBehavior = 'replace', selectedFields, valuesByPartId = {}, valuesBySourceKey = {}, sourceKeys = [] }) {
  const selectedSources = sourceAttachments ?? [sourceAttachment];
  if (!Array.isArray(selectedSources) || !selectedSources.length) throw new Error('Select at least one accessory.');
  selectedSources.forEach(validateAttachment);
  if (!['replace', 'keep-both', 'cancel'].includes(duplicateBehavior)) throw new Error('Unknown duplicate behavior.');
  const avatarId = targetLook ? targetLook.metadata.avatarId : targetAvatarId;
  const targetAttachments = targetLook ? targetLook.metadata.attachments.map(normalizeAttachment) : [];
  const selectedPartIds = new Set(selectedSources.map(source => source.partId));
  const targetDuplicates = targetAttachments.filter(target => selectedPartIds.has(target.partId));
  if (targetDuplicates.length && duplicateBehavior === 'cancel') throw new Error('Transfer cancelled: at least one accessory already exists in the target.');
  let attachments = duplicateBehavior === 'replace' ? targetAttachments.filter(target => !selectedPartIds.has(target.partId)) : [...targetAttachments];
  for (const [index, source] of selectedSources.entries()) {
    const existing = targetDuplicates.find(a => a.partId === source.partId);
    const sourceKey = sourceKeys[index];
    attachments.push(buildEditableAttachment({ sourceAttachment: source, baseAttachment: existing, selectedFields, values: valuesBySourceKey[sourceKey] ?? valuesByPartId[source.partId] }));
  }
  return validatePayload({ name: typeof newName === 'string' ? newName.trim() : newName, metadata: { avatarId, attachments } });
}
