const express = require('express');

const supabase = require('../config/supabase');
const attendanceSessionStore = require('../utils/attendanceSessionStore');
const { checkInLimiter } = require('../middlewares/rateLimit');
const { getPublicViewErrorMessage } = require('../utils/publicError');
const { logInfo, logWarn, logError } = require('../utils/appLogger');

const router = express.Router();

function getCheckInActorContext(req) {
  return {
    accountId: req.currentUser ? req.currentUser.accountId : null,
    role: req.currentUser ? req.currentUser.role : null,
    linkedVoSinhId: req.currentUser ? req.currentUser.linkedVoSinhId : null
  };
}

function logCheckInEvent(req, level, action, status, meta) {
  const payload = {
    event: 'checkin_operation',
    module: 'checkIn',
    action,
    status,
    requestId: req.requestId || null,
    actor: getCheckInActorContext(req),
    meta: meta || {}
  };

  if (level === 'warn') {
    logWarn(payload);
    return;
  }

  if (level === 'error') {
    logError(payload);
    return;
  }

  logInfo(payload);
}

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
  const startedAt = Date.now();

  try {
    const inputToken = normalizeText(req.query.token);
    const selectedBuoiHocIdParam = parsePositiveInt(req.query.buoi_hoc_id);
    const tokenVerify = inputToken ? attendanceSessionStore.verifyToken(inputToken) : null;

    logCheckInEvent(req, 'info', 'view_load', 'started', {
      hasToken: Boolean(inputToken),
      selectedBuoiHocIdParam
    });

    const buoiHocList = await loadBuoiHocList();

    let selectedBuoiHocId = selectedBuoiHocIdParam;
    let errorMessage = req.query.error || '';

    if (tokenVerify && tokenVerify.ok) {
      selectedBuoiHocId = tokenVerify.sessionId;
    }

    if (inputToken && (!tokenVerify || !tokenVerify.ok)) {
      logCheckInEvent(req, 'warn', 'view_load', 'validation_failed', {
        reason: tokenVerify ? tokenVerify.reason : 'invalid_qr_token'
      });

      errorMessage = errorMessage || (tokenVerify ? tokenVerify.reason : 'QR token không hợp lệ');
    }

    let selectedBuoiHoc = null;
    let voSinhOptions = [];

    if (selectedBuoiHocId) {
      selectedBuoiHoc = buoiHocList.find(function(item) {
        return item.id === selectedBuoiHocId;
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

    logCheckInEvent(req, 'info', 'view_load', 'succeeded', {
      selectedBuoiHocId: selectedBuoiHocId || null,
      voSinhOptions: voSinhOptions.length,
      tokenValid: Boolean(tokenVerify && tokenVerify.ok),
      durationMs: Date.now() - startedAt
    });

    return res.render('check-in', {
      title: 'Điểm danh võ sinh',
      activePage: 'check-in',
      token: inputToken,
      tokenValid: Boolean(tokenVerify && tokenVerify.ok),
      buoiHocList,
      selectedBuoiHoc,
      selectedBuoiHocId: selectedBuoiHocId || null,
      voSinhOptions,
      forceVoSinhId: req.currentUser && req.currentUser.role === 'vo_sinh' ? req.currentUser.linkedVoSinhId : null,
      message: req.query.message || '',
      errorMessage
    });
  } catch (error) {
    logCheckInEvent(req, 'error', 'view_load', 'failed', {
      durationMs: Date.now() - startedAt,
      errorCode: error.code || null
    });

    return next(error);
  }
});

router.post('/', checkInLimiter, async function(req, res) {
  const startedAt = Date.now();

  try {
    const token = normalizeText(req.body.token);
    const pin = normalizeText(req.body.pin_code);
    const selectedBuoiHocId = parsePositiveInt(req.body.buoi_hoc_id);
    const requestedVoSinhId = parsePositiveInt(req.body.vo_sinh_id);
    const voSinhId =
      req.currentUser && req.currentUser.role === 'vo_sinh' ? req.currentUser.linkedVoSinhId : requestedVoSinhId;

    logCheckInEvent(req, 'info', 'submit', 'started', {
      hasToken: Boolean(token),
      hasPin: Boolean(pin),
      selectedBuoiHocId,
      requestedVoSinhId,
      effectiveVoSinhId: voSinhId
    });

    if (!voSinhId) {
      logCheckInEvent(req, 'warn', 'submit', 'validation_failed', {
        reason: 'missing_vo_sinh_id'
      });

      return res.redirect(createRedirectWithMessage('/check-in', '', 'Thiếu thông tin võ sinh'));
    }

    let buoiHocId = selectedBuoiHocId;
    let method = '';

    if (token) {
      const tokenVerify = attendanceSessionStore.verifyToken(token);

      if (!tokenVerify.ok) {
        logCheckInEvent(req, 'warn', 'submit', 'validation_failed', {
          voSinhId,
          reason: tokenVerify.reason || 'invalid_qr_token'
        });

        return res.redirect(createRedirectWithMessage('/check-in', '', tokenVerify.reason));
      }

      buoiHocId = tokenVerify.sessionId;
      method = 'checkin_qr';
    } else {
      if (!buoiHocId || !pin) {
        logCheckInEvent(req, 'warn', 'submit', 'validation_failed', {
          voSinhId,
          selectedBuoiHocId,
          reason: 'missing_buoi_hoc_or_pin'
        });

        return res.redirect(createRedirectWithMessage('/check-in', '', 'Thiếu buổi học hoặc mã PIN'));
      }

      const pinVerify = attendanceSessionStore.verifyPin(buoiHocId, pin);

      if (!pinVerify.ok) {
        logCheckInEvent(req, 'warn', 'submit', 'validation_failed', {
          voSinhId,
          buoiHocId,
          reason: pinVerify.reason || 'invalid_pin'
        });

        return res.redirect(createRedirectWithMessage(`/check-in?buoi_hoc_id=${buoiHocId}`, '', pinVerify.reason));
      }

      method = 'checkin_pin';
    }

    if (!buoiHocId) {
      logCheckInEvent(req, 'warn', 'submit', 'validation_failed', {
        voSinhId,
        reason: 'missing_effective_buoi_hoc_id'
      });

      return res.redirect(createRedirectWithMessage('/check-in', '', 'Không xác định được buổi học điểm danh'));
    }

    const { data: buoiHoc, error: buoiHocError } = await supabase
      .from('buoi_hoc')
      .select('id, lop_vo_id')
      .eq('id', buoiHocId)
      .maybeSingle();

    if (buoiHocError) {
      return res.redirect(createRedirectWithMessage('/check-in', '', getPublicViewErrorMessage(buoiHocError, 'Không thể kiểm tra buổi học lúc này')));
    }

    if (!buoiHoc) {
      return res.redirect(createRedirectWithMessage('/check-in', '', 'Không tìm thấy buổi học'));
    }

    const { data: relation, error: relationError } = await supabase
      .from('vo_sinh_lop')
      .select('id')
      .eq('lop_vo_id', buoiHoc.lop_vo_id)
      .eq('vo_sinh_id', voSinhId)
      .maybeSingle();

    if (relationError) {
      return res.redirect(createRedirectWithMessage('/check-in', '', getPublicViewErrorMessage(relationError, 'Không thể kiểm tra liên kết võ sinh và lớp lúc này')));
    }

    if (!relation) {
      logCheckInEvent(req, 'warn', 'submit', 'failed', {
        voSinhId,
        buoiHocId,
        reason: 'vo_sinh_not_in_class',
        durationMs: Date.now() - startedAt
      });

      return res.redirect(createRedirectWithMessage('/check-in', '', 'Võ sinh không thuộc lớp của buổi học'));
    }

    const result = await markAttendancePresent(buoiHocId, voSinhId, method);

    if (!result.ok) {
      logCheckInEvent(req, 'warn', 'submit', 'failed', {
        voSinhId,
        buoiHocId,
        method,
        reason: result.reason || 'mark_attendance_failed',
        durationMs: Date.now() - startedAt
      });

      return res.redirect(createRedirectWithMessage(`/check-in?buoi_hoc_id=${buoiHocId}`, '', result.reason));
    }

    logCheckInEvent(req, 'info', 'submit', 'succeeded', {
      voSinhId,
      buoiHocId,
      method,
      durationMs: Date.now() - startedAt
    });

    return res.redirect(createRedirectWithMessage(`/check-in?buoi_hoc_id=${buoiHocId}`, 'Điểm danh thành công', ''));
  } catch (error) {
    logCheckInEvent(req, 'error', 'submit', 'failed', {
      reason: 'checkin_exception',
      durationMs: Date.now() - startedAt,
      errorCode: error.code || null
    });

    return res.redirect(createRedirectWithMessage('/check-in', '', getPublicViewErrorMessage(error, 'Không thể xử lý điểm danh lúc này')));
  }
});

module.exports = router;
