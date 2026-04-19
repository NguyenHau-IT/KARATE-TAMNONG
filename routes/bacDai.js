const express = require('express');

const supabase = require('../config/supabase');
const { getPublicApiErrorMessage } = require('../utils/publicError');

const router = express.Router();

function parseId(value) {
  const id = Number.parseInt(value, 10);
  return Number.isNaN(id) ? null : id;
}

function normalizePayload(body) {
  return {
    tenBacDai: (body.ten_bac_dai || '').trim(),
    moTa: (body.mo_ta || '').trim()
  };
}

function validatePayload(payload) {
  if (!payload.tenBacDai) {
    return 'Vui lòng nhập tên bậc đai';
  }

  return null;
}

async function loadBacDaiList() {
  const { data, error } = await supabase
    .from('bac_dai')
    .select('*')
    .order('id', { ascending: true });

  if (error) {
    throw error;
  }

  return data || [];
}

router.get('/', async function(req, res, next) {
  try {
    const bacDaiList = await loadBacDaiList();

    res.render('bac-dai', {
      title: 'Quản lý bậc đai',
      bacDaiList,
      message: req.query.message || '',
      errorMessage: req.query.error || ''
    });
  } catch (error) {
    next(error);
  }
});

router.post('/api', async function(req, res) {
  try {
    const payload = normalizePayload(req.body);
    const validationError = validatePayload(payload);

    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const { data, error } = await supabase
      .from('bac_dai')
      .insert({
        ten_bac_dai: payload.tenBacDai,
        mo_ta: payload.moTa || null
      })
      .select('*')
      .single();

    if (error) {
      return res.status(400).json({ message: getPublicApiErrorMessage(error, 'Không thể thêm bậc đai') });
    }

    return res.json({
      message: 'Thêm bậc đai thành công',
      item: data
    });
  } catch (error) {
    return res.status(500).json({ message: getPublicApiErrorMessage(error, 'Không thể thêm bậc đai lúc này') });
  }
});

router.put('/api/:id', async function(req, res) {
  try {
    const id = parseId(req.params.id);
    const payload = normalizePayload(req.body);

    if (!id) {
      return res.status(400).json({ message: 'ID không hợp lệ' });
    }

    const validationError = validatePayload(payload);

    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const { data, error } = await supabase
      .from('bac_dai')
      .update({
        ten_bac_dai: payload.tenBacDai,
        mo_ta: payload.moTa || null,
        ngay_cap_nhat: new Date().toISOString()
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      return res.status(400).json({ message: getPublicApiErrorMessage(error, 'Không thể cập nhật bậc đai') });
    }

    return res.json({
      message: 'Cập nhật bậc đai thành công',
      item: data
    });
  } catch (error) {
    return res.status(500).json({ message: getPublicApiErrorMessage(error, 'Không thể cập nhật bậc đai lúc này') });
  }
});

router.delete('/api/:id', async function(req, res) {
  try {
    const id = parseId(req.params.id);

    if (!id) {
      return res.status(400).json({ message: 'ID không hợp lệ' });
    }

    const { error } = await supabase.from('bac_dai').delete().eq('id', id);

    if (error) {
      return res.status(400).json({ message: getPublicApiErrorMessage(error, 'Không thể xóa bậc đai') });
    }

    return res.json({
      message: 'Xóa bậc đai thành công',
      id
    });
  } catch (error) {
    return res.status(500).json({ message: getPublicApiErrorMessage(error, 'Không thể xóa bậc đai lúc này') });
  }
});

module.exports = router;
