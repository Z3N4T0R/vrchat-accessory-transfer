let opening;
chrome.action.onClicked.addListener(() => {
  opening ??= (async () => {
    const url = chrome.runtime.getURL('src/ui/popup.html');
    const tabs = await chrome.tabs.query({});
    const existing = tabs.find(tab => tab.url === url);
    if (existing) {
      await chrome.tabs.update(existing.id, { active: true });
      await chrome.windows.update(existing.windowId, { focused: true });
    } else await chrome.tabs.create({ url });
  })().catch(() => console.warn('Could not open extension page.')).finally(() => { opening = undefined; });
});
