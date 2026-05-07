export const getPagination = (page = 1, limit = 10) => {
  const currentPage = Number(page) > 0 ? Number(page) : 1;
  const currentLimit = Number(limit) > 0 ? Number(limit) : 10;

  return {
    page: currentPage,
    limit: currentLimit,
    skip: (currentPage - 1) * currentLimit,
  };
};

export const buildPaginationMeta = ({ totalItems, page, limit }) => {
  const totalPages = Math.ceil(totalItems / limit) || 1;

  return {
    totalItems,
    totalPages,
    currentPage: page,
    perPage: limit,
  };
};
