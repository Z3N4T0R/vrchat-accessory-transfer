import { sessionRequest } from './sessionRequest.js';
import { normalizeAccessory } from '../models/accessory.js';
import { normalizeAvatar } from '../models/avatar.js';
import { normalizeAvatarLook } from '../models/avatarLook.js';
import { validatePayload } from '../utils/validation.js';
const messages = { 401: 'Please log in to vrchat.com first.', 403: 'VRChat denied access. Check account permissions and API access.', 400: 'VRChat rejected the look.', 404: 'The VRChat endpoint or resource was not found.', 429: 'Rate limited. Wait at least a minute before trying again.' };
export function createApi(transport) {
  let lastRequest = 0;
  async function request(operation, input) {
    await new Promise(resolve => setTimeout(resolve, Math.max(0, 850 - (Date.now() - lastRequest))));
    let result;
    try { result = await transport(operation, input); }
    catch { throw new Error('Cannot reach the VRChat tab. Keep it open, then reload looks.'); }
    finally { lastRequest = Date.now(); }
    if (!result?.ok) {
      const message = messages[result?.status] ?? (result?.status >= 500 ? 'Temporary VRChat server issue. Try again later.' : 'Request failed.');
      throw new Error(`${message}${result?.message ? ` ${result.message}` : ''}`);
    }
    return result.data;
  }
  const getAvatarLooks = (offset = 0) => request('looks', offset);
  const getAccessories = (offset = 0) => request('accessories', offset);
  const getAvatars = (offset = 0) => request('avatars', offset);
  return {
    getCurrentUser: () => request('user'),
    getAccessories,
    async getAllAccessories() {
      const accessories = new Map();
      for (let page = 0; page < 100; page++) {
        const response = await getAccessories(page * 100);
        if (!Array.isArray(response?.data)) throw new Error('Unexpected accessory inventory response. No accessory labels loaded.');
        if (!response.data.length) return [...accessories.values()];
        const before = accessories.size;
        for (const raw of response.data) {
          const accessory = normalizeAccessory(raw);
          accessories.set(accessory.id ?? accessory.partId, accessory);
        }
        if (accessories.size === before) throw new Error('Accessory pagination repeated a page. Reload accessories.');
        if (Number.isFinite(response.totalCount) && accessories.size >= response.totalCount) return [...accessories.values()];
      }
      throw new Error('Accessory inventory exceeded the 100-page safety limit. No partial labels were loaded.');
    },
    getAvatars,
    async getAllAvatars() {
      const avatars = new Map();
      for (let page = 0; page < 100; page++) {
        const response = await getAvatars(page * 100);
        if (!Array.isArray(response)) throw new Error('Unexpected avatar response. No avatars loaded.');
        if (!response.length) return [...avatars.values()];
        const before = avatars.size;
        for (const raw of response) { const avatar = normalizeAvatar(raw); avatars.set(avatar.id, avatar); }
        if (avatars.size === before) throw new Error('Avatar pagination repeated a page. Reload avatars.');
        if (response.length < 100) return [...avatars.values()];
      }
      throw new Error('Avatar list exceeded the 100-page safety limit. No partial list was loaded.');
    },
    getAvatarLooks,
    async getAllAvatarLooks() {
      const looks = new Map();
      for (let page = 0; page < 100; page++) {
        const response = await getAvatarLooks(page * 100);
        if (!Array.isArray(response?.data)) throw new Error('Unexpected inventory response. No looks loaded.');
        if (!response.data.length) return [...looks.values()];
        const before = looks.size;
        for (const raw of response.data) { const look = normalizeAvatarLook(raw); looks.set(look.id, look); }
        if (looks.size === before) throw new Error('Inventory pagination repeated a page. Reload looks.');
        if (Number.isFinite(response.totalCount) && looks.size >= response.totalCount) return [...looks.values()];
      }
      throw new Error('Inventory exceeded the 100-page safety limit. No partial list was loaded.');
    },
    createAvatarLook: payload => request('create', validatePayload(payload))
  };
}
export async function connectApi(debug = () => {}) {
  const tabs = await chrome.tabs.query({ url: 'https://vrchat.com/*' });
  const tab = tabs.sort((a, b) => (b.lastAccessed ?? 0) - (a.lastAccessed ?? 0))[0];
  if (!tab) throw new Error('Open vrchat.com and log in first, then reload looks.');
  return createApi(async (operation, input) => {
    const results = await chrome.scripting.executeScript({ target: { tabId: tab.id }, world: 'ISOLATED', func: sessionRequest, args: [operation, input ?? null] });
    const result = results[0]?.result;
    debug(`${operation}: HTTP ${result?.status ?? 'unavailable'}`);
    return result;
  });
}
