/**
 * Middleware to validate and sanitize pagination query parameters.
 * Sets req.pagination = { page, limit, skip }
 */
const validatePagination = (defaultLimit = 20, maxLimit = 50) => {
  return (req, res, next) => {
    let page = parseInt(req.query.page, 10);
    let limit = parseInt(req.query.limit, 10);

    if (isNaN(page) || page < 1) {
      page = 1;
    }

    if (isNaN(limit) || limit < 1) {
      limit = defaultLimit;
    } else if (limit > maxLimit) {
      limit = maxLimit;
    }

    req.pagination = {
      page,
      limit,
      skip: (page - 1) * limit
    };

    next();
  };
};

module.exports = {
  validatePagination
};
