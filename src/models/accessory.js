function firstString(...values) {
  return values.find(value => typeof value === 'string' && value.trim())?.trim() ?? null;
}

export function normalizeAccessory(raw) {
  const id = firstString(raw?.id, raw?.inventoryItemId, raw?.item?.id, raw?.metadata?.id);
  const partId = firstString(raw?.partId, raw?.avatarPartId, raw?.metadata?.partId, raw?.metadata?.avatarPartId, raw?.item?.partId, raw?.item?.avatarPartId, raw?.itemId);
  const name = firstString(raw?.name, raw?.displayName, raw?.item?.name, raw?.metadata?.name, raw?.product?.name, id, partId);
  if (!id && !partId) throw new Error('An accessory has missing metadata. Loading stopped to avoid incomplete labels.');
  return {
    id,
    partId,
    name,
    imageUrl: firstString(raw?.imageUrl, raw?.thumbnailImageUrl, raw?.item?.imageUrl, raw?.item?.thumbnailImageUrl, raw?.metadata?.imageUrl, raw?.metadata?.thumbnailImageUrl),
    thumbnailImageUrl: firstString(raw?.thumbnailImageUrl, raw?.item?.thumbnailImageUrl, raw?.metadata?.thumbnailImageUrl)
  };
}

export function createAccessoryLookup(accessories) {
  const byId = new Map();
  for (const accessory of accessories) {
    if (accessory.id) byId.set(accessory.id, accessory);
    if (accessory.partId) byId.set(accessory.partId, accessory);
  }
  return byId;
}
