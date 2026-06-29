export const normalizeDomainName = (value = '') => {
  let domain = String(value || '').trim().toLowerCase();

  if (!domain) return '';

  domain = domain.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '');
  domain = domain.split('/')[0];
  domain = domain.split('?')[0];
  domain = domain.split('#')[0];
  domain = domain.replace(/\.$/, '');
  domain = domain.replace(/^\[|\]$/g, '');

  if (!domain.includes('::')) {
    domain = domain.replace(/:\d+$/, '');
  }

  return domain;
};
