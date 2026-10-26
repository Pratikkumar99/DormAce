// validate({ body: schema, query: schema, params: schema }) -> replaces req parts with parsed values
export const validate = (schemas) => (req, _res, next) => {
  try {
    for (const key of ['params', 'query', 'body']) {
      if (schemas[key]) {
        const parsed = schemas[key].parse(req[key]);
        if (key === 'query') req.validQuery = parsed;
        else req[key] = parsed;
      }
    }
    next();
  } catch (e) {
    next(e);
  }
};
