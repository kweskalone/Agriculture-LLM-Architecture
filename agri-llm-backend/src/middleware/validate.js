function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const details = result.error.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message,
      }));
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid request body.', details },
      });
    }
    req.validatedBody = result.data;
    return next();
  };
}

module.exports = validate;
