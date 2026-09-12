const fields = ['partId', 'isEnabled', 'path', 'position', 'rotation', 'scale', 'variables'];
export function normalizeAttachment(raw) {
  if (!raw || typeof raw !== 'object') throw new Error('Malformed attachment in API response.');
  return Object.fromEntries(fields.filter(key => raw[key] !== undefined).map(key => [key, structuredClone(raw[key])]));
}
