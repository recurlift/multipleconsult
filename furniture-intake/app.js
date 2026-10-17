(() => {
const { KEY, STATUSES, samples, missing, filterRequests, loadRecords } = globalThis.FurnitureModel;

const $ = id => document.getElementById(id);
let storage;
try { storage = localStorage; } catch { storage = null; }
let records = loadRecords(storage);
let photos = [];
let previewUrls = [];

function show(view) {
  for (const name of ['intake', 'queue']) {
    const selected = view === name;
    $(name).hidden = !selected;
    $(`${name}-tab`).classList.toggle('active', selected);
    $(`${name}-tab`).setAttribute('aria-pressed', String(selected));
  }
  if (view === 'queue') renderQueue();
  $(`${view}-title`).focus();
}

function currentRequest() {
  return { item: $('item').value, dimensions: { length: $('length').value, width: $('width').value, height: $('height').value }, work: $('work').value, photoCount: photos.length };
}

function renderChecklist() {
  const absent = missing(currentRequest());
  const labels = ['Item type', 'All three dimensions', 'Desired work', 'At least one photo'];
  $('checklist').replaceChildren(...labels.map(label => {
    const li = document.createElement('li');
    li.className = absent.includes(label) ? 'missing' : 'done';
    li.textContent = `${absent.includes(label) ? '○' : '✓'} ${label}`;
    return li;
  }));
  $('submit').disabled = absent.length > 0 || Boolean($('photo-error').textContent);
}

function clearPreviews() {
  previewUrls.forEach(URL.revokeObjectURL);
  previewUrls = [];
  $('previews').replaceChildren();
}

function onPhotos() {
  clearPreviews();
  const selected = Array.from($('photos').files);
  const invalid = selected.length > 4 || selected.some(f => !f.type.startsWith('image/') || f.size > 8 * 1024 * 1024);
  photos = invalid ? [] : selected;
  $('photo-error').textContent = invalid ? 'Choose no more than 4 image files, each 8 MB or smaller.' : '';
  for (const file of photos) {
    const url = URL.createObjectURL(file);
    previewUrls.push(url);
    const figure = document.createElement('figure');
    const img = document.createElement('img');
    img.src = url;
    img.alt = `Preview of ${file.name}`;
    const caption = document.createElement('figcaption');
    caption.textContent = file.name;
    figure.append(img, caption);
    $('previews').append(figure);
  }
  renderChecklist();
}

function save() {
  try { storage.setItem(KEY, JSON.stringify(records)); return true; }
  catch { $('form-message').textContent = 'Browser storage is unavailable; request was not added.'; return false; }
}

function cell(label, value) {
  const p = document.createElement('p');
  const strong = document.createElement('strong');
  strong.textContent = `${label}: `;
  p.append(strong, document.createTextNode(value));
  return p;
}

function renderQueue() {
  const shown = filterRequests(records, $('status-filter').value, $('readiness-filter').value);
  $('queue-count').textContent = `${shown.length} of ${records.length} requests`;
  $('cards').replaceChildren();
  if (!shown.length) { const p = document.createElement('p'); p.className = 'empty card'; p.textContent = 'No requests match these filters.'; $('cards').append(p); return; }
  for (const r of shown) {
    const article = document.createElement('article'); article.className = 'card request';
    const top = document.createElement('div'); top.className = 'request-top';
    const heading = document.createElement('h3'); heading.textContent = `${r.item || 'Unspecified item'} · ${r.id}`;
    const badge = document.createElement('span'); badge.className = `badge ${missing(r).length ? 'attention' : ''}`; badge.textContent = missing(r).length ? `Missing: ${missing(r).join(', ')}` : 'Details complete';
    top.append(heading, badge); article.append(top);
    const d = r.dimensions;
    article.append(cell('Size', [d.length, d.width, d.height].map(n => n || '?').join(' × ') + ' in'), cell('Work', r.work || 'Not described'), cell('Photos', `${r.photoCount} noted · files not retained`));
    const bottom = document.createElement('div'); bottom.className = 'request-bottom';
    const meta = document.createElement('small'); meta.textContent = r.created;
    const label = document.createElement('label'); label.textContent = `Status for ${r.id}`;
    const select = document.createElement('select'); select.setAttribute('aria-label', `Status for ${r.id}`);
    STATUSES.forEach(status => { const option = document.createElement('option'); option.value = status; option.textContent = status; select.append(option); }); select.value = r.status;
    select.addEventListener('change', () => { const old = r.status; r.status = select.value; if (!save()) { r.status = old; select.value = old; } renderQueue(); });
    label.append(select); bottom.append(meta, label); article.append(bottom); $('cards').append(article);
  }
}

$('intake-tab').addEventListener('click', () => show('intake'));
$('queue-tab').addEventListener('click', () => show('queue'));
for (const id of ['item', 'length', 'width', 'height', 'work']) $(id).addEventListener('input', renderChecklist);
$('photos').addEventListener('change', onPhotos);
$('request-form').addEventListener('submit', event => {
  event.preventDefault();
  if (missing(currentRequest()).length || $('photo-error').textContent) { renderChecklist(); $('form-message').textContent = 'Complete the readiness checklist first.'; return; }
  const data = currentRequest();
  const record = { id: `L-${Date.now()}`, item: data.item, dimensions: Object.fromEntries(Object.entries(data.dimensions).map(([k, v]) => [k, Number(v)])), work: data.work.trim(), photoCount: data.photoCount, status: 'New', created: 'Added in this browser' };
  records.unshift(record);
  if (!save()) { records.shift(); return; }
  $('request-form').reset(); photos = []; clearPreviews(); $('photo-error').textContent = ''; renderChecklist();
  $('form-message').textContent = `Added ${record.id} to the local queue. Photo files were discarded.`;
  show('queue');
});
for (const id of ['status-filter', 'readiness-filter']) $(id).addEventListener('change', renderQueue);
$('reset').addEventListener('click', () => { if (!confirm('Reset the queue to synthetic sample requests? Browser-local additions and status changes will be removed.')) return; records = structuredClone(samples); try { storage.removeItem(KEY); } catch {} renderQueue(); });
$('export').addEventListener('click', () => { const blob = new Blob([JSON.stringify({ prototype: true, exportedAt: new Date().toISOString(), requests: records }, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'furniture-estimate-demo.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); });
renderChecklist();
})();
