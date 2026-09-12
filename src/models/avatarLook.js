import { normalizeAttachment } from './attachment.js';
function normalizeLookAttachment(raw) {
  const attachment = normalizeAttachment(raw);
  const label = raw?.displayName ?? raw?.name ?? raw?.partName;
  if (typeof label === 'string' && label.trim()) {
    Object.defineProperty(attachment, 'displayName', { value: label.trim(), enumerable: false });
  }
  return attachment;
}
export function normalizeAvatarLook(raw) {
  if (typeof raw?.id !== 'string' || typeof raw.metadata?.avatarId !== 'string' || !Array.isArray(raw.metadata.attachments)) {
    throw new Error('An Avatar Look has missing metadata. Loading stopped to avoid incomplete targets.');
  }
  return { id: raw.id, name: typeof raw.name === 'string' ? raw.name : 'Unnamed look', metadata: {
    avatarId: raw.metadata.avatarId, attachments: raw.metadata.attachments.map(normalizeLookAttachment)
  } };
}
