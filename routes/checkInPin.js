const express = require('express');

const router = express.Router();

router.use(function(req, res) {
  const params = new URLSearchParams();

  Object.entries(req.query || {}).forEach(function(entry) {
    if (entry[1] !== null && entry[1] !== undefined && entry[1] !== '') {
      params.set(entry[0], entry[1]);
    }
  });

  if (!params.get('message')) {
    params.set('message', 'Check-in bằng PIN đã ngừng hỗ trợ. Vui lòng dùng QR');
  }

  const query = params.toString();
  return res.redirect(query ? `/check-in?${query}` : '/check-in');
});

module.exports = router;
