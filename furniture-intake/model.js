const STATUSES = ['New', 'Needs details', 'Ready to review', 'Reviewed'];
const KEY = 'furniture-estimate-prototype-v1';

const samples = [
  { id: 'S-101', item: 'Chair', dimensions: { length: 22, width: 20, height: 34 }, work: 'Repair a loose front leg and refresh the worn seat finish.', photoCount: 2, status: 'New', created: 'Sample request' },
  { id: 'S-102', item: 'Cabinet', dimensions: { length: 42, width: null, height: 64 }, work: 'Repair a sticking door and blend a surface scratch.', photoCount: 1, status: 'Needs details', created: 'Sample request' },
  { id: 'S-103', item: 'Table', dimensions: { length: 60, width: 34, height: 29 }, work: 'Refinish the top after water marks.', photoCount: 3, status: 'Ready to review', created: 'Sample request' },
  { id: 'S-104', item: 'Dresser', dimensions: { length: 48, width: 18, height: 36 }, work: 'Repair one drawer runner.', photoCount: 2, status: 'Reviewed', created: 'Sample request' }
];

function missing(request) {
  const out = [];
  if (!request.item) out.push('Item type');
  const d = request.dimensions || {};
  if (![d.length, d.width, d.height].every(n => Number.isFinite(Number(n)) && Number(n) > 0 && Number(n) <= 999 && n !== null && n !== '')) out.push('All three dimensions');
  if (!request.work || !request.work.trim()) out.push('Desired work');
  if (!Number.isInteger(request.photoCount) || request.photoCount < 1) out.push('At least one photo');
  return out;
}

function filterRequests(requests, status, readiness) {
  return requests.filter(r => (status === 'all' || r.status === status) && (readiness === 'all' || (missing(r).length === 0) === (readiness === 'ready')));
}

function isValidRecord(r) {
  return r && typeof r.id === 'string' && typeof r.item === 'string' && typeof r.work === 'string' && r.dimensions && typeof r.dimensions === 'object' && Number.isInteger(r.photoCount) && r.photoCount >= 0 && STATUSES.includes(r.status) && typeof r.created === 'string';
}

function loadRecords(storage) {
  try {
    const raw = storage.getItem(KEY);
    if (!raw) return structuredClone(samples);
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.every(isValidRecord) ? parsed : structuredClone(samples);
  } catch { return structuredClone(samples); }
}

globalThis.FurnitureModel = { STATUSES, KEY, samples, missing, filterRequests, isValidRecord, loadRecords };
