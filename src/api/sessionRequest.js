// Self-contained: Chrome serializes this function into the VRChat tab's isolated world.
export async function sessionRequest(operation, input) {
  if (location.origin !== 'https://vrchat.com') return { status: 0, message: 'The VRChat tab navigated away. Reload looks.' };
  const state = globalThis.__accessoryTransferState ??= { busy: false, next: 0 };
  if (state.busy) return { status: 0, message: 'Another request is running. Please wait.' };
  if (Date.now() < state.next) return { status: 429, message: `Please wait ${Math.ceil((state.next - Date.now()) / 1000)} seconds before trying again.` };
  let path;
  if (operation === 'user') path = '/api/1/auth/user';
  else if (operation === 'looks' && Number.isInteger(input) && input >= 0 && input <= 9900) path = `/api/1/inventory?n=100&offset=${input}&order=newest&types=avatarlook`;
  else if (operation === 'accessories' && Number.isInteger(input) && input >= 0 && input <= 9900) path = `/api/1/inventory?n=100&offset=${input}&order=newest&types=accessory`;
  else if (operation === 'avatars' && Number.isInteger(input) && input >= 0 && input <= 9900) path = `/api/1/avatars?n=100&offset=${input}&sort=updated&order=descending&releaseStatus=all&user=me`;
  else if (operation === 'create') path = '/api/1/avatar-look';
  else return { status: 0, message: 'Unsupported request.' };
  state.busy = true;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);
  try {
    const response = await fetch(path, {
      method: operation === 'create' ? 'POST' : 'GET', credentials: 'include',
      redirect: 'error', cache: 'no-store', signal: controller.signal,
      ...(operation === 'create' ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) } : {})
    });
    if (response.status === 429) {
      const retry = response.headers.get('Retry-After');
      const delay = retry && /^\d+$/.test(retry) ? Number(retry) * 1000 : Date.parse(retry) - Date.now();
      state.next = Date.now() + Math.max(60000, Number.isFinite(delay) ? delay : 60000);
    }
    let body;
    try { body = await response.json(); } catch { return { status: response.status, ok: false, message: 'VRChat returned an unreadable response.' }; }
    if (!response.ok) {
      const validationMessage = typeof body?.error === 'string' ? body.error : body?.error?.message;
      return { status: response.status, ok: false, message: response.status === 400 && typeof validationMessage === 'string' ? validationMessage.slice(0, 400) : undefined };
    }
    if (operation === 'user') {
      if (!body?.id?.startsWith('usr_')) return { status: 401, ok: false };
      body = { id: body.id, displayName: body.displayName };
    }
    // No headers, cookies, or session fields cross the bridge.
    return { status: response.status, ok: true, data: operation === 'create' ? { id: typeof body?.id === 'string' ? body.id : null } : body };
  } catch {
    return { status: 0, ok: false, message: 'Network request failed or timed out. Check the VRChat tab and your connection.' };
  } finally {
    clearTimeout(timer);
    state.busy = false;
    state.next = Math.max(state.next, Date.now() + 750);
  }
}
