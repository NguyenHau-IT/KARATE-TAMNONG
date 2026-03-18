const express = require('express');

const supabase = require('../config/supabase');

const router = express.Router();

function parseId(value) {
  const id = Number.parseInt(value, 10);
  return Number.isNaN(id) ? null : id;
}

function normalizeText(value) {
  return (value || '').trim();
}

function normalizeOptionalNumber(value) {
  const normalized = normalizeText(value);

  if (!normalized) {
    return null;
  }

  const number = Number.parseInt(normalized, 10);
  return Number.isNaN(number) ? NaN : number;
}

function normalizePayload(body) {
  return {
    hoTen: normalizeText(body.ho_ten),
    gioiTinh: normalizeText(body.gioi_tinh),
    namSinh: normalizeOptionalNumber(body.nam_sinh),
    diaChi: normalizeText(body.dia_chi),
    bacDaiId: normalizeOptionalNumber(body.bac_dai_id),
    soDienThoai: normalizeText(body.so_dien_thoai),
    hoTenPhuHuynh: normalizeText(body.ho_ten_phu_huynh),
    soDienThoaiPhuHuynh: normalizeText(body.so_dien_thoai_phu_huynh)
  };
}

function validatePayload(payload) {
  if (!payload.hoTen) {
    return 'Vui lòng nhập họ tên võ sinh';
  }

  if (Number.isNaN(payload.namSinh)) {
    return 'Năm sinh không hợp lệ';
  }

  if (Number.isNaN(payload.bacDaiId)) {
    return 'Bậc đai không hợp lệ';
  }

  if (payload.namSinh !== null) {
    const currentYear = new Date().getFullYear();

    if (payload.namSinh < 1900 || payload.namSinh > currentYear) {
      return 'Năm sinh không hợp lệ';
    }
  }

  return null;
}

async function loadBacDaiList() {
  const { data, error } = await supabase
    .from('bac_dai')
    .select('id, ten_bac_dai')
    .order('id', { ascending: true });

  if (error) {
    throw error;
  }

  return data || [];
}

async function loadVoSinhList() {
  const { data, error } = await supabase
    .from('vo_sinh')
    .select('*')
    .order('id', { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
}

router.get('/', async function(req, res, next) {
  try {
    const [voSinhList, bacDaiList] = await Promise.all([loadVoSinhList(), loadBacDaiList()]);

    res.render('vo-sinh', {
      title: 'Quản lý võ sinh',
      voSinhList,
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
      .from('vo_sinh')
      .insert({
        ho_ten: payload.hoTen,
        gioi_tinh: payload.gioiTinh || null,
        nam_sinh: payload.namSinh,
        dia_chi: payload.diaChi || null,
        bac_dai_id: payload.bacDaiId,
        so_dien_thoai: payload.soDienThoai || null,
        ho_ten_phu_huynh: payload.hoTenPhuHuynh || null,
        so_dien_thoai_phu_huynh: payload.soDienThoaiPhuHuynh || null
      })
      .select('*')
      .single();

    if (error) {
      return res.status(400).json({ message: error.message });
    }

    return res.json({
      message: 'Thêm võ sinh thành công',
      item: data
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
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
      .from('vo_sinh')
      .update({
        ho_ten: payload.hoTen,
        gioi_tinh: payload.gioiTinh || null,
        nam_sinh: payload.namSinh,
        dia_chi: payload.diaChi || null,
        bac_dai_id: payload.bacDaiId,
        so_dien_thoai: payload.soDienThoai || null,
        ho_ten_phu_huynh: payload.hoTenPhuHuynh || null,
        so_dien_thoai_phu_huynh: payload.soDienThoaiPhuHuynh || null,
        ngay_cap_nhat: new Date().toISOString()
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      return res.status(400).json({ message: error.message });
    }

    return res.json({
      message: 'Cập nhật võ sinh thành công',
      item: data
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.delete('/api/:id', async function(req, res) {
  try {
    const id = parseId(req.params.id);

    if (!id) {
      return res.status(400).json({ message: 'ID không hợp lệ' });
    }

    const { error } = await supabase.from('vo_sinh').delete().eq('id', id);

    if (error) {
      return res.status(400).json({ message: error.message });
    }

    return res.json({
      message: 'Xóa võ sinh thành công',
      id
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

module.exports = router;
