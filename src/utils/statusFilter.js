const RECORD_STATUSES = new Set(['active', 'inactive']);

export const normalizeStatusFilter = (status, fallback = 'active') => {
  const value = typeof status === 'string' ? status.trim().toLowerCase() : '';
  return RECORD_STATUSES.has(value) ? value : fallback;
};
