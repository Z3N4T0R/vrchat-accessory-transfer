export function normalizeAvatar(raw) {
  if (!raw || typeof raw.id !== 'string' || !raw.id.startsWith('avtr_')) {
    throw new Error('An avatar has missing metadata. Loading stopped to avoid incomplete targets.');
  }
  return {
    id: raw.id,
    name: typeof raw.name === 'string' && raw.name.trim() ? raw.name : raw.id,
    imageUrl: typeof raw.imageUrl === 'string' ? raw.imageUrl : null,
    thumbnailImageUrl: typeof raw.thumbnailImageUrl === 'string' ? raw.thumbnailImageUrl : null
  };
}

export function mergeLookAvatars(avatars, looks) {
  const byId = new Map(avatars.map(avatar => [avatar.id, avatar]));
  for (const look of looks) {
    const id = look?.metadata?.avatarId;
    if (typeof id === 'string' && id.startsWith('avtr_') && !byId.has(id)) {
      byId.set(id, { id, name: id, imageUrl: null, thumbnailImageUrl: null });
    }
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}
