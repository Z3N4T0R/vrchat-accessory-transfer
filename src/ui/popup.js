import { connectApi } from '../api/vrchatApi.js';
import { createAccessoryLookup } from '../models/accessory.js';
import { mergeLookAvatars } from '../models/avatar.js';
import { buildTransferredLook } from '../services/transferService.js';

const $ = id => document.getElementById(id);
let api, avatars = [], looks = [], accessories = [], accessoryLookup = new Map(), reviewed, busy = false;
const log = [];
const fieldIds = { path: 'copyPath', position: 'copyPosition', rotation: 'copyRotation', scale: 'copyScale' };

function status(message, error = false) { $('status').textContent = message; $('status').classList.toggle('error', error); }
function avatarName(id) { return avatars.find(avatar => avatar.id === id)?.name ?? id; }
function accessoryMeta(attachment) { return accessoryLookup.get(attachment?.partId) ?? null; }
function accessoryName(attachment, index) { return accessoryMeta(attachment)?.name ?? attachment?.displayName ?? attachment?.partId ?? `Accessory ${index + 1}`; }
function accessoryImage(attachment) {
  const meta = accessoryMeta(attachment);
  return meta?.thumbnailImageUrl ?? meta?.imageUrl ?? null;
}
function options(id, entries) {
  $(id).replaceChildren(...entries.map(([value, text]) => { const option = document.createElement('option'); option.value = value; option.textContent = text; return option; }));
}
const findLook = id => looks.find(look => look.id === $(id).value);
const findAvatarById = id => avatars.find(avatar => avatar.id === id);
const findAvatar = id => findAvatarById($(id).value);
const sourceAttachments = () => [...document.querySelectorAll('[name="accessory"]:checked')].map(input => findLook('sourceLook')?.metadata.attachments[Number(input.value)]).filter(Boolean);
const selectedFields = () => Object.entries(fieldIds).filter(([, id]) => $(id).checked).map(([field]) => field);

function updateAvatarPreview(avatar, imageId, nameId) {
  const imageUrl = avatar?.thumbnailImageUrl ?? avatar?.imageUrl;
  $(nameId).textContent = avatar?.name ?? 'Unknown avatar';
  $(imageId).hidden = !imageUrl;
  if (imageUrl) $(imageId).src = imageUrl;
  $(imageId).alt = avatar ? `${avatar.name} preview` : '';
}
function numberInput(partId, field, index, value) {
  const input = document.createElement('input');
  input.type = 'number'; input.step = 'any'; input.value = String(value);
  input.disabled = !$(fieldIds[field]).checked;
  input.dataset.partId = partId; input.dataset.field = field; input.dataset.index = String(index);
  input.setAttribute('aria-label', `${field} ${index + 1}`);
  return input;
}
function renderEditor() {
  const selected = sourceAttachments();
  $('review').disabled = !selected.length;
  $('editor').replaceChildren(...selected.map((attachment, index) => {
    const section = document.createElement('section');
    section.className = 'editBlock';
    const heading = document.createElement('div');
    heading.className = 'accessoryHeading';
    const image = document.createElement('img');
    const imageUrl = accessoryImage(attachment);
    if (imageUrl) image.src = imageUrl;
    image.alt = imageUrl ? `${accessoryName(attachment, index)} preview` : '';
    const title = document.createElement('h3');
    title.textContent = accessoryName(attachment, index);
    heading.append(image, title);
    const path = document.createElement('label');
    path.textContent = 'Path';
    const pathInput = document.createElement('input');
    pathInput.value = attachment.path ?? '';
    pathInput.disabled = !$('copyPath').checked;
    pathInput.dataset.partId = attachment.partId; pathInput.dataset.field = 'path';
    path.append(pathInput);
    section.append(heading, path);
    for (const field of ['position', 'rotation', 'scale']) {
      const row = document.createElement('div');
      row.className = `vector vector${attachment[field].length}`;
      const label = document.createElement('span');
      label.textContent = field;
      row.append(label, ...attachment[field].map((value, i) => numberInput(attachment.partId, field, i, value)));
      section.append(row);
    }
    return section;
  }));
}
function editedValues() {
  const values = {};
  const enabled = new Set(selectedFields());
  for (const input of $('editor').querySelectorAll('input')) {
    if (!enabled.has(input.dataset.field)) continue;
    const part = values[input.dataset.partId] ??= {};
    if (input.dataset.field === 'path') part.path = input.value;
    else {
      const vector = part[input.dataset.field] ??= [];
      vector[Number(input.dataset.index)] = Number(input.value);
    }
  }
  return values;
}
function updateDetails() {
  const sourceAvatarId = findLook('sourceLook')?.metadata.avatarId;
  updateAvatarPreview(findAvatarById(sourceAvatarId), 'sourcePreview', 'sourceAvatarName');
  updateAvatarPreview(findAvatar('targetAvatar'), 'targetPreview', 'targetAvatarName');
  $('warning').hidden = !sourceAvatarId || sourceAvatarId === $('targetAvatar').value;
  renderEditor();
}
function sourceLookChanged() {
  const entries = (findLook('sourceLook')?.metadata.attachments ?? []).map((a, i) => {
    const label = document.createElement('label');
    label.className = 'accessoryItem';
    const input = document.createElement('input');
    input.type = 'checkbox'; input.name = 'accessory'; input.value = String(i);
    const image = document.createElement('img');
    const imageUrl = accessoryImage(a);
    if (imageUrl) image.src = imageUrl;
    image.alt = imageUrl ? `${accessoryName(a, i)} preview` : '';
    const span = document.createElement('span');
    span.textContent = `${accessoryName(a, i)} - ${a.path ?? 'Missing bone'}`;
    label.append(input, image, span);
    return label;
  });
  const empty = document.createElement('p');
  empty.className = 'hint'; empty.textContent = 'This look has no accessories.';
  $('accessories').replaceChildren(...(entries.length ? entries : [empty]));
  updateDetails();
}
function targetLookChanged() {
  const target = findLook('targetLook');
  const attachments = target?.metadata.attachments ?? [];
  $('existing').replaceChildren(...(attachments.length ? attachments.map((a, i) => `${accessoryName(a, i)} - ${a.path ?? 'Missing bone'}`) : ['No existing accessories - start with the selected accessories.']).map(text => { const li = document.createElement('li'); li.textContent = text; return li; }));
  $('name').value = `${target?.name ?? avatarName($('targetAvatar').value)} + accessory copy`;
  updateDetails();
}
function targetAvatarChanged() {
  options('targetLook', [['', 'New look - selected accessories only'], ...looks.filter(l => l.metadata.avatarId === $('targetAvatar').value).map(l => [l.id, l.name])]);
  targetLookChanged();
}
function stopReview() { reviewed = undefined; $('confirmation').hidden = true; $('controls').disabled = !looks.length; }

$('load').addEventListener('click', async () => {
  if (busy) return;
  busy = true; looks = []; avatars = []; accessories = []; accessoryLookup = new Map(); stopReview(); $('load').disabled = true; $('account').textContent = 'Connecting...'; status('Checking login and loading avatars, looks and accessories...');
  try {
    api = await connectApi(message => { log.push(message); $('debug').textContent = log.slice(-100).join('\n'); });
    const user = await api.getCurrentUser();
    looks = await api.getAllAvatarLooks();
    try { accessories = await api.getAllAccessories(); accessoryLookup = createAccessoryLookup(accessories); }
    catch (error) { status(`Accessory labels failed, using part IDs. ${error.message}`, true); }
    try { avatars = mergeLookAvatars(await api.getAllAvatars(), looks); }
    catch (error) { avatars = mergeLookAvatars([], looks); status(`Avatar list failed, using avatars found in looks. ${error.message}`, true); }
    $('account').textContent = `Signed in as ${user.displayName ?? user.id} - ${avatars.length} avatars - ${looks.length} looks - ${accessories.length} accessories`;
    const avatarOptions = avatars.map(avatar => [avatar.id, avatar.name]);
    options('sourceLook', looks.map(look => [look.id, `${look.name} (${avatarName(look.metadata.avatarId)})`]));
    options('targetAvatar', avatarOptions);
    sourceLookChanged(); targetAvatarChanged();
    $('controls').disabled = !looks.length || !avatars.length;
    if (looks.length && avatars.length && !$('status').classList.contains('error')) status('Avatars and looks loaded. Choose one or more source accessories and a target.');
    else if (!looks.length) status('No Avatar Looks found. Save a look with an accessory in VRChat, then reload.');
  } catch (error) { status(error.message, true); $('account').textContent = 'Not connected'; }
  finally { busy = false; $('load').disabled = false; $('load').textContent = 'Reload Avatars and Looks'; }
});
$('sourceLook').addEventListener('change', sourceLookChanged);
$('targetAvatar').addEventListener('change', targetAvatarChanged);
$('targetLook').addEventListener('change', targetLookChanged);
$('accessories').addEventListener('change', renderEditor);
for (const id of Object.values(fieldIds)) $(id).addEventListener('change', renderEditor);
$('form').addEventListener('submit', event => {
  event.preventDefault();
  try {
    reviewed = buildTransferredLook({ sourceAttachments: sourceAttachments(), targetLook: findLook('targetLook'), targetAvatarId: $('targetAvatar').value, newName: $('name').value, duplicateBehavior: $('duplicate').value, selectedFields: selectedFields(), valuesByPartId: editedValues() });
    $('payload').textContent = JSON.stringify(reviewed, null, 2);
    $('controls').disabled = true; $('confirmation').hidden = false; $('create').disabled = false;
    $('create').focus(); status('Review the exact payload, then create the new look.');
  } catch (error) { status(error.message, true); }
});
$('cancel').addEventListener('click', stopReview);
$('create').addEventListener('click', async () => {
  if (busy || !reviewed) return;
  busy = true; $('create').disabled = true; $('cancel').disabled = true; $('load').disabled = true;
  status('Creating one new Avatar Look...');
  try {
    const result = await api.createAvatarLook(reviewed);
    status(`New Avatar Look created${result?.id ? ` (${result.id})` : ''}. Reload looks to inspect it. Existing looks were preserved.`);
  } catch (error) {
    status(`${error.message} Creation may have reached the server. Reload and inspect saved looks before trying again.`, true);
  } finally {
    busy = false; reviewed = undefined; $('confirmation').hidden = true; $('cancel').disabled = false; $('load').disabled = false;
    $('controls').disabled = true;
  }
});
