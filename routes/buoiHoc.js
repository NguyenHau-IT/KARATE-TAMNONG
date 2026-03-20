const express = require('express');

const supabase = require('../config/supabase');
const attendancePinStore = require('../utils/attendancePinStore');

const router = express.Router();

function parsePositiveInt(value) {
  const parsed = Number.parseInt(value, 10);

  if (Number.isNaN(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function normalizeText(value) {
  return (value || '').trim();
}

function createRedirectWithMessage(path, message, error) {
  const searchParams = new URLSearchParams();

  if (message) {
    searchParams.set('message', message);
  }

  if (error) {
    searchParams.set('error', error);
  }

  const query = searchParams.toString();
  if (!query) {
    return path;
  }

  return path.includes('?') ? `${path}&${query}` : `${path}?${query}`;
}

function isValidDateString(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isValidTimeString(value) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function validateCreatePayload(payload) {
  const errors = [];

  if (!payload.lop_vo_id) {
    errors.push({ field: 'lop_vo_id', reason: 'lop_vo_id là bắt buộc và phải là số nguyên dương' });
  }

  if (!payload.ngay_hoc) {
    errors.push({ field: 'ngay_hoc', reason: 'ngay_hoc là bắt buộc' });
  } else if (!isValidDateString(payload.ngay_hoc)) {
    errors.push({ field: 'ngay_hoc', reason: 'ngay_hoc không đúng định dạng YYYY-MM-DD' });
  }

  if (payload.gio_bat_dau && !isValidTimeString(payload.gio_bat_dau)) {
    errors.push({ field: 'gio_bat_dau', reason: 'gio_bat_dau không đúng định dạng HH:mm' });
  }

  if (payload.gio_ket_thuc && !isValidTimeString(payload.gio_ket_thuc)) {
    errors.push({ field: 'gio_ket_thuc', reason: 'gio_ket_thuc không đúng định dạng HH:mm' });
  }

  if (payload.gio_bat_dau && payload.gio_ket_thuc && payload.gio_bat_dau >= payload.gio_ket_thuc) {
    errors.push({ field: 'gio_ket_thuc', reason: 'Giờ kết thúc phải lớn hơn giờ bắt đầu' });
  }

  if (payload.ghi_chu && payload.ghi_chu.length > 255) {
    errors.push({ field: 'ghi_chu', reason: 'ghi_chu tối đa 255 ký tự' });
  }

  return errors;
}

function normalizeCreatePayload(body) {
  return {
    lop_vo_id: parsePositiveInt(body.lop_vo_id),
    ngay_hoc: normalizeText(body.ngay_hoc),
    gio_bat_dau: normalizeText(body.gio_bat_dau) || null,
    gio_ket_thuc: normalizeText(body.gio_ket_thuc) || null,
    ghi_chu: normalizeText(body.ghi_chu) || null
  };
}

async function loadLopVoList() {
  const { data, error } = await supabase.from('lop_vo').select('id, ten_lop').order('id', { ascending: true });

  if (error) {
    throw error;
  }

  return data || [];
}

async function loadBuoiHocList() {
  const { data, error } = await supabase
    .from('buoi_hoc')
    .select('id, lop_vo_id, ngay_hoc, gio_bat_dau, gio_ket_thuc, ghi_chu, ngay_tao, ngay_cap_nhat, lop_vo:lop_vo_id(id, ten_lop)')
    .order('ngay_hoc', { ascending: false })
    .order('gio_bat_dau', { ascending: false })
    .limit(100);

  if (error) {
    throw error;
  }

  return data || [];
}

router.get('/', async function(req, res, next) {
  try {
    const [lopVoList, buoiHocList] = await Promise.all([loadLopVoList(), loadBuoiHocList()]);
    const activePinMap = attendancePinStore.getActivePinMap(
      buoiHocList.map(function(item) {
        return item.id;
      })
    );

    return res.render('buoi-hoc', {
      title: 'Quản lý buổi học',
      activePage: 'buoi-hoc',
      lopVoList,
      buoiHocList,
      activePinMap,
      message: req.query.message || '',
      errorMessage: req.query.error || ''
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/tao', async function(req, res) {
  try {
    const payload = normalizeCreatePayload(req.body);
    const errors = validateCreatePayload(payload);

    if (errors.length) {
      return res.redirect(createRedirectWithMessage('/buoi-hoc', '', errors[0].reason));
    }

    const { data: lopVo, error: lopVoError } = await supabase
      .from('lop_vo')
      .select('id')
      .eq('id', payload.lop_vo_id)
      .maybeSingle();

    if (lopVoError) {
      return res.redirect(createRedirectWithMessage('/buoi-hoc', '', lopVoError.message));
    }

    if (!lopVo) {
      return res.redirect(createRedirectWithMessage('/buoi-hoc', '', 'Không tìm thấy lớp võ'));
    }

    let duplicateQuery = supabase
      .from('buoi_hoc')
      .select('id')
      .eq('lop_vo_id', payload.lop_vo_id)
      .eq('ngay_hoc', payload.ngay_hoc);

    duplicateQuery = payload.gio_bat_dau
      ? duplicateQuery.eq('gio_bat_dau', payload.gio_bat_dau)
      : duplicateQuery.is('gio_bat_dau', null);

    duplicateQuery = payload.gio_ket_thuc
      ? duplicateQuery.eq('gio_ket_thuc', payload.gio_ket_thuc)
      : duplicateQuery.is('gio_ket_thuc', null);

    const { data: duplicateRows, error: duplicateError } = await duplicateQuery.limit(1);

    if (duplicateError) {
      return res.redirect(createRedirectWithMessage('/buoi-hoc', '', duplicateError.message));
    }

    if (duplicateRows && duplicateRows.length) {
      return res.redirect(
        createRedirectWithMessage('/buoi-hoc', '', 'Buổi học đã tồn tại với lớp, ngày và khung giờ này')
      );
    }

    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('buoi_hoc')
      .insert({
        lop_vo_id: payload.lop_vo_id,
        ngay_hoc: payload.ngay_hoc,
        gio_bat_dau: payload.gio_bat_dau,
        gio_ket_thuc: payload.gio_ket_thuc,
        ghi_chu: payload.ghi_chu,
        ngay_cap_nhat: now
      })
      .select('*')
      .single();

    if (error) {
      return res.redirect(createRedirectWithMessage('/buoi-hoc', '', error.message));
    }

    return res.redirect(createRedirectWithMessage('/buoi-hoc', 'Tạo buổi học thành công', ''));
  } catch (error) {
    return res.redirect(createRedirectWithMessage('/buoi-hoc', '', error.message));
  }
});

router.post('/xoa/:id', async function(req, res) {
  try {
    const id = parsePositiveInt(req.params.id);

    if (!id) {
      return res.redirect(createRedirectWithMessage('/buoi-hoc', '', 'ID buổi học không hợp lệ'));
    }

    const { error } = await supabase.from('buoi_hoc').delete().eq('id', id);

    if (error) {
      return res.redirect(createRedirectWithMessage('/buoi-hoc', '', error.message));
    }

    return res.redirect(createRedirectWithMessage('/buoi-hoc', 'Xóa buổi học thành công', ''));
  } catch (error) {
    return res.redirect(createRedirectWithMessage('/buoi-hoc', '', error.message));
  }
});

router.post('/tao-pin/:id', async function(req, res) {
  try {
    const buoiHocId = parsePositiveInt(req.params.id);
    const safeTtlMinutes = 1;

    if (!buoiHocId) {
      return res.redirect(createRedirectWithMessage('/buoi-hoc', '', 'ID buổi học không hợp lệ'));
    }

    const { data: buoiHoc, error } = await supabase.from('buoi_hoc').select('id').eq('id', buoiHocId).maybeSingle();

    if (error) {
      return res.redirect(createRedirectWithMessage('/buoi-hoc', '', error.message));
    }

    if (!buoiHoc) {
      return res.redirect(createRedirectWithMessage('/buoi-hoc', '', 'Không tìm thấy buổi học'));
    }

    const pinData = attendancePinStore.generatePin(buoiHocId, safeTtlMinutes);

    return res.redirect(
      createRedirectWithMessage(
        '/buoi-hoc',
        `Đã tạo PIN ${pinData.pin} cho buổi #${buoiHocId} (hết hạn lúc ${new Date(pinData.expiresAt).toLocaleTimeString('vi-VN')})`,
        ''
      )
    );
  } catch (error) {
    return res.redirect(createRedirectWithMessage('/buoi-hoc', '', error.message));
  }
});

module.exports = router;
