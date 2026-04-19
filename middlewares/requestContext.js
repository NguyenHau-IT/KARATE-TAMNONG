const { randomUUID } = require('crypto');

function createRequestId() {
  return randomUUID();
}

function attachRequestContext(req, res, next) {
  const incomingRequestId = req.get('x-request-id');
  const requestId = incomingRequestId && String(incomingRequestId).trim()
    ? String(incomingRequestId).trim()
    : createRequestId();

  req.requestId = requestId;
  res.locals.requestId = requestId;
  res.setHeader('x-request-id', requestId);

  return next();
}

module.exports = {
  attachRequestContext
};
