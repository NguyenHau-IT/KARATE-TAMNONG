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

async function loadBuoiHocList() {
  const { data, error } = await supabase
    .from('buoi_hoc')
    .select('id, lop_vo_id, ngay_hoc, gio_bat_dau, gio_ket_thuc, lop_vo:lop_vo_id(id, ten_lop)')
    .order('ngay_hoc', { ascending: false })
    .order('gio_bat_dau', { ascending: false })
    .limit(200);

  if (error) {
    throw error;
  }

  return data || [];
}

async function loadVoSinhOptionsByBuoiHoc(buoiHoc) {
  const { data, error } = await supabase
    .from('vo_sinh_lop')
    .select('vo_sinh_id, vo_sinh:vo_sinh_id(id, ho_ten)')
    .eq('lop_vo_id', buoiHoc.lop_vo_id)
    .order('vo_sinh_id', { ascending: true });

  if (error) {
    throw error;
  }

  return (data || []).map(function(item) {
    return {
      vo_sinh_id: item.vo_sinh_id,
      ho_ten: item.vo_sinh ? item.vo_sinh.ho_ten : null
    };
  });
}

router.get('/', async function(req, res, next) {
  try {
    const selectedBuoiHocId = parsePositiveInt(req.query.buoi_hoc_id);
    const buoiHocList = await loadBuoiHocList();

    let selectedBuoiHoc = null;
    let voSinhOptions = [];
    let activePin = null;
    let errorMessage = req.query.error || '';

    if (selectedBuoiHocId) {
      selectedBuoiHoc = buoiHocList.find(function(item) {
        return item.id === selectedBuoiHocId;
      });

      if (!selectedBuoiHoc) {
        errorMessage = errorMessage || 'Không tìm thấy buổi học';
      } else {
        voSinhOptions = await loadVoSinhOptionsByBuoiHoc(selectedBuoiHoc);
        activePin = attendancePinStore.getActivePin(selectedBuoiHocId);
      }
    }

    return res.render('check-in-pin', {
      title: 'Check-in bằng PIN',
      activePage: 'check-in-pin',
      buoiHocList,
      selectedBuoiHocId: selectedBuoiHocId || null,
      selectedBuoiHoc,
      voSinhOptions,
      activePin,
      message: req.query.message || '',
      errorMessage
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/', async function(req, res) {
  try {
    const buoiHocId = parsePositiveInt(req.body.buoi_hoc_id);
    const voSinhId = parsePositiveInt(req.body.vo_sinh_id);
    const pin = normalizeText(req.body.pin_code);

    if (!buoiHocId || !voSinhId || !pin) {
      return res.redirect(createRedirectWithMessage('/check-in-pin', '', 'Thiếu buổi học, võ sinh hoặc mã PIN'));
    }

    const redirectBase = `/check-in-pin?buoi_hoc_id=${buoiHocId}`;

    const pinVerify = attendancePinStore.verifyPin(buoiHocId, pin);

    if (!pinVerify.ok) {
      return res.redirect(createRedirectWithMessage(redirectBase, '', pinVerify.reason));
    }

    const { data: buoiHoc, error: buoiHocError } = await supabase
      .from('buoi_hoc')
      .select('id, lop_vo_id')
      .eq('id', buoiHocId)
      .maybeSingle();

    if (buoiHocError) {
      return res.redirect(createRedirectWithMessage(redirectBase, '', buoiHocError.message));
    }

    if (!buoiHoc) {
      return res.redirect(createRedirectWithMessage(redirectBase, '', 'Không tìm thấy buổi học'));
    }

    const { data: relation, error: relationError } = await supabase
      .from('vo_sinh_lop')
      .select('id')
      .eq('lop_vo_id', buoiHoc.lop_vo_id)
      .eq('vo_sinh_id', voSinhId)
      .maybeSingle();

    if (relationError) {
      return res.redirect(createRedirectWithMessage(redirectBase, '', relationError.message));
    }

    if (!relation) {
      return res.redirect(createRedirectWithMessage(redirectBase, '', 'Võ sinh không thuộc lớp của buổi học'));
    }

    const { data: existing, error: existingError } = await supabase
      .from('diem_danh')
      .select('id, trang_thai_diem_danh')
      .eq('buoi_hoc_id', buoiHocId)
      .eq('vo_sinh_id', voSinhId)
      .maybeSingle();

    if (existingError) {
      return res.redirect(createRedirectWithMessage(redirectBase, '', existingError.message));
    }

    if (existing && existing.trang_thai_diem_danh === 'co_mat') {
      return res.redirect(createRedirectWithMessage(redirectBase, '', 'Võ sinh đã điểm danh có mặt trước đó'));
    }

    if (existing) {
      const { error } = await supabase
        .from('diem_danh')
        .update({
          trang_thai_diem_danh: 'co_mat',
          loai_vang: null,
          ly_do: 'checkin_pin',
          ngay_cap_nhat: new Date().toISOString()
        })
        .eq('id', existing.id);

      if (error) {
        return res.redirect(createRedirectWithMessage(redirectBase, '', error.message));
      }

      return res.redirect(createRedirectWithMessage(redirectBase, 'Check-in PIN thành công', ''));
    }

    const { error } = await supabase.from('diem_danh').insert({
      buoi_hoc_id: buoiHocId,
      vo_sinh_id: voSinhId,
      trang_thai_diem_danh: 'co_mat',
      loai_vang: null,
      ly_do: 'checkin_pin',
      ngay_cap_nhat: new Date().toISOString()
    });

    if (error) {
      return res.redirect(createRedirectWithMessage(redirectBase, '', error.message));
    }

    return res.redirect(createRedirectWithMessage(redirectBase, 'Check-in PIN thành công', ''));
  } catch (error) {
    return res.redirect(createRedirectWithMessage('/check-in-pin', '', error.message));
  }
});

module.exports = router;
