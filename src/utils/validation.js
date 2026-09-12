export function validateAttachment(a) {
  if (!a || typeof a.partId !== 'string' || !a.partId.startsWith('avp_')) throw new Error('Accessory partId must start with avp_.');
  if (typeof a.path !== 'string') throw new Error('Accessory bone/path must be a string.');
  for (const [key, size] of [['position', 3], ['rotation', 4], ['scale', 3]]) {
    if (!Array.isArray(a[key]) || a[key].length !== size || !a[key].every(Number.isFinite)) {
      throw new Error(`${key} must contain exactly ${size} finite numbers.`);
    }
  }
  if (a.isEnabled !== undefined && typeof a.isEnabled !== 'boolean') throw new Error('isEnabled must be boolean.');
  if (a.variables !== undefined && !Array.isArray(a.variables)) throw new Error('variables must be an array.');
  const inspect = value => {
    if (typeof value === 'number' && !Number.isFinite(value)) throw new Error('Variables cannot contain NaN or Infinity.');
    if (value && typeof value === 'object') Object.values(value).forEach(inspect);
  };
  inspect(a.variables);
}
export function validatePayload(payload) {
  if (typeof payload?.name !== 'string' || !payload.name.trim()) throw new Error('Enter a new look name.');
  if (typeof payload.metadata?.avatarId !== 'string' || !payload.metadata.avatarId.startsWith('avtr_')) throw new Error('Select a valid target avatar.');
  if (!Array.isArray(payload.metadata.attachments)) throw new Error('Attachments must be an array.');
  payload.metadata.attachments.forEach(validateAttachment);
  return payload;
}
