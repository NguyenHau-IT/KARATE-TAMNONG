const express = require('express');

const supabase = require('../config/supabase');
const attendanceQrStore = require('../utils/attendanceQrStore');

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

async function markAttendancePresent(buoiHocId, voSinhId, method) {
  const { data: existing, error: existingError } = await supabase
    .from('diem_danh')
    .select('id, trang_thai_diem_danh')
    .eq('buoi_hoc_id', buoiHocId)
    .eq('vo_sinh_id', voSinhId)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existing && existing.trang_thai_diem_danh === 'co_mat') {
    return {
      ok: false,
      reason: 'Võ sinh đã điểm danh có mặt trước đó'
    };
  }

  if (existing) {
    const { error } = await supabase
      .from('diem_danh')
      .update({
        trang_thai_diem_danh: 'co_mat',
        loai_vang: null,
        ly_do: method,
        ngay_cap_nhat: new Date().toISOString()
      })
      .eq('id', existing.id);

    if (error) {
      throw error;
    }

    return { ok: true };
  }

  const { error } = await supabase.from('diem_danh').insert({
    buoi_hoc_id: buoiHocId,
    vo_sinh_id: voSinhId,
    trang_thai_diem_danh: 'co_mat',
    loai_vang: null,
    ly_do: method,
    ngay_cap_nhat: new Date().toISOString()
  });

  if (error) {
    throw error;
  }

  return { ok: true };
}

router.get('/', async function(req, res, next) {
  try {
    const inputToken = normalizeText(req.query.token);
    const selectedBuoiHocId = parsePositiveInt(req.query.buoi_hoc_id);

    let tokenVerify = null;

    if (inputToken) {
      tokenVerify = attendanceQrStore.verifyToken(inputToken);
    }

    const buoiHocList = await loadBuoiHocList();

    let effectiveBuoiHocId = selectedBuoiHocId;
    let errorMessage = req.query.error || '';

    if (tokenVerify && tokenVerify.ok) {
      effectiveBuoiHocId = tokenVerify.sessionId;
    }

    if (inputToken && (!tokenVerify || !tokenVerify.ok)) {
      errorMessage = errorMessage || (tokenVerify ? tokenVerify.reason : 'QR token không hợp lệ');
    }

    let selectedBuoiHoc = null;
    let voSinhOptions = [];

    if (effectiveBuoiHocId) {
      selectedBuoiHoc = buoiHocList.find(function(item) {
        return item.id === effectiveBuoiHocId;
      });

      if (!selectedBuoiHoc) {
        errorMessage = errorMessage || 'Không tìm thấy buổi học';
      } else {
        const rawVoSinhOptions = await loadVoSinhOptionsByBuoiHoc(selectedBuoiHoc);

        if (req.currentUser && req.currentUser.role === 'vo_sinh') {
          voSinhOptions = rawVoSinhOptions.filter(function(item) {
            return item.vo_sinh_id === req.currentUser.linkedVoSinhId;
          });
        } else {
          voSinhOptions = rawVoSinhOptions;
        }
      }
    }

    return res.render('check-in-qr', {
      title: 'Check-in bằng QR',
      activePage: 'check-in-qr',
      token: inputToken,
      tokenValid: Boolean(tokenVerify && tokenVerify.ok),
      buoiHocList,
      selectedBuoiHoc,
      selectedBuoiHocId: effectiveBuoiHocId || null,
      voSinhOptions,
      forceVoSinhId: req.currentUser && req.currentUser.role === 'vo_sinh' ? req.currentUser.linkedVoSinhId : null,
      message: req.query.message || '',
      errorMessage
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/', async function(req, res) {
  try {
    const token = normalizeText(req.body.token);
    const requestedVoSinhId = parsePositiveInt(req.body.vo_sinh_id);
    const voSinhId =
      req.currentUser && req.currentUser.role === 'vo_sinh' ? req.currentUser.linkedVoSinhId : requestedVoSinhId;

    if (!token || !voSinhId) {
      return res.redirect(createRedirectWithMessage('/check-in-qr', '', 'Thiếu QR token hoặc võ sinh'));
    }

    const tokenVerify = attendanceQrStore.verifyToken(token);

    if (!tokenVerify.ok) {
      return res.redirect(createRedirectWithMessage('/check-in-qr', '', tokenVerify.reason));
    }

    const buoiHocId = tokenVerify.sessionId;
    const redirectBase = `/check-in-qr?token=${encodeURIComponent(token)}`;

    const { data: buoiHoc, error: buoiHocError } = await supabase
      .from('buoi_hoc')
      .select('id, lop_vo_id')
      .eq('id', buoiHocId)
      .maybeSingle();

    if (buoiHocError) {
      return res.redirect(createRedirectWithMessage(redirectBase, '', buoiHocError.message));
    }

    if (!buoiHoc) {
      return res.redirect(createRedirectWithMessage('/check-in-qr', '', 'Không tìm thấy buổi học'));
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

    const markResult = await markAttendancePresent(buoiHocId, voSinhId, 'checkin_qr');

    if (!markResult.ok) {
      return res.redirect(createRedirectWithMessage(redirectBase, '', markResult.reason));
    }

    return res.redirect(createRedirectWithMessage(redirectBase, 'Check-in QR thành công', ''));
  } catch (error) {
    return res.redirect(createRedirectWithMessage('/check-in-qr', '', error.message));
  }
});

module.exports = router;
