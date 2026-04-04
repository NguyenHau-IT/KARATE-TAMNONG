const express = require('express');

const supabase = require('../config/supabase');
const { getPublicViewErrorMessage } = require('../utils/publicError');

const router = express.Router();

const TRANG_THAI = {
  CO_MAT: 'co_mat',
  VANG: 'vang'
};

const LOAI_VANG = {
  CO_PHEP: 'co_phep',
  KHONG_PHEP: 'khong_phep'
};

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

function normalizeNullableText(value) {
  const normalized = normalizeText(value);
  return normalized || null;
}

function normalizeFilterValue(value) {
  const normalized = normalizeText(value);
  return normalized || null;
}

function parsePositiveIntArray(values) {
  if (!Array.isArray(values)) {
    return [];
  }

  return Array.from(
    new Set(
      values
        .map(function(item) {
          return parsePositiveInt(item);
        })
        .filter(Boolean)
    )
  );
}

function parseIsoToTimestamp(value) {
  if (!value) {
    return null;
  }

  const normalized = String(value).trim();
  const withT = normalized.includes(' ') && !normalized.includes('T') ? normalized.replace(' ', 'T') : normalized;
  const compactFraction = withT.replace(/\.(\d{3})\d+(?=(Z|[+-]\d{2}:?\d{2})?$)/, '.$1');
  const parsed = Date.parse(compactFraction);

  if (Number.isNaN(parsed)) {
    return null;
  }

  return parsed;
}

function normalizeVersionString(value) {
  const normalized = normalizeNullableText(value);

  if (!normalized) {
    return null;
  }

  return normalized.replace(' ', 'T');
}

function hasVersionConflict(expectedRaw, currentRaw, options) {
  const opts = options || {};
  const allowMissingExpected = Boolean(opts.allowMissingExpected);
  const expectedNormalized = normalizeVersionString(expectedRaw);
  const currentNormalized = normalizeVersionString(currentRaw);

  if (!expectedNormalized && allowMissingExpected) {
    return false;
  }

  const expectedTimestamp = parseIsoToTimestamp(expectedNormalized);
  const currentTimestamp = parseIsoToTimestamp(currentNormalized);

  if (expectedTimestamp !== null && currentTimestamp !== null) {
    return expectedTimestamp !== currentTimestamp;
  }

  if (expectedTimestamp === null && currentTimestamp === null) {
    return expectedNormalized !== currentNormalized;
  }

  return true;
}

function hasVersionConflictForRestore(expectedRaw, currentRaw) {
  const expectedNormalized = normalizeVersionString(expectedRaw);
  const currentNormalized = normalizeVersionString(currentRaw);

  if (!expectedNormalized) {
    return false;
  }

  if (expectedNormalized === currentNormalized) {
    return false;
  }

  const expectedTimestamp = parseIsoToTimestamp(expectedNormalized);
  const currentTimestamp = parseIsoToTimestamp(currentNormalized);

  if (expectedTimestamp !== null && currentTimestamp !== null) {
    return expectedTimestamp !== currentTimestamp;
  }

  // Lenient fallback for undo flow: avoid false-positive conflicts caused by format drift.
  return false;
}

function mapAttendanceToJsonPayload(record, voSinhId) {
  return {
    vo_sinh_id: voSinhId,
    trang_thai_diem_danh: record ? record.trang_thai_diem_danh : null,
    loai_vang: record ? record.loai_vang : null,
    ly_do: record ? record.ly_do : null,
    ngay_cap_nhat: record ? record.ngay_cap_nhat : null
  };
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

function validateStatusPayload(payload) {
  const errors = [];

  if (![TRANG_THAI.CO_MAT, TRANG_THAI.VANG].includes(payload.trang_thai_diem_danh)) {
    errors.push({
      field: 'trang_thai_diem_danh',
      reason: "Giá trị phải là 'co_mat' hoặc 'vang'"
    });
  }

  if (payload.trang_thai_diem_danh === TRANG_THAI.CO_MAT && payload.loai_vang !== null) {
    errors.push({
      field: 'loai_vang',
      reason: "Không được truyền loai_vang khi trạng thái là 'co_mat'"
    });
  }

  if (payload.trang_thai_diem_danh === TRANG_THAI.VANG) {
    if (![LOAI_VANG.CO_PHEP, LOAI_VANG.KHONG_PHEP].includes(payload.loai_vang)) {
      errors.push({
        field: 'loai_vang',
        reason: "Bắt buộc là 'co_phep' hoặc 'khong_phep' khi trạng thái là 'vang'"
      });
    }
  }

  if (payload.ly_do && payload.ly_do.length > 255) {
    errors.push({
      field: 'ly_do',
      reason: 'ly_do tối đa 255 ký tự'
    });
  }

  return errors;
}

async function getBuoiHocById(buoiHocId) {
  const { data, error } = await supabase
    .from('buoi_hoc')
    .select('id, lop_vo_id')
    .eq('id', buoiHocId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function loadBuoiHocList() {
  const { data, error } = await supabase
    .from('buoi_hoc')
    .select('id, ngay_hoc, gio_bat_dau, gio_ket_thuc, lop_vo:lop_vo_id(id, ten_lop)')
    .order('ngay_hoc', { ascending: false })
    .order('gio_bat_dau', { ascending: false })
    .limit(200);

  if (error) {
    throw error;
  }

  return data || [];
}

async function loadDanhSachDiemDanh(buoiHoc) {
  const [{ data: classStudents, error: classStudentsError }, { data: attendanceRows, error: attendanceError }] =
    await Promise.all([
      supabase
        .from('vo_sinh_lop')
        .select('vo_sinh_id, vo_sinh:vo_sinh_id(id, ho_ten, bac_dai_id, gioi_tinh, nam_sinh)')
        .eq('lop_vo_id', buoiHoc.lop_vo_id),
      supabase
        .from('diem_danh')
        .select('id, buoi_hoc_id, vo_sinh_id, trang_thai_diem_danh, loai_vang, ly_do, ngay_cap_nhat')
        .eq('buoi_hoc_id', buoiHoc.id)
    ]);

  if (classStudentsError) {
    throw classStudentsError;
  }

  if (attendanceError) {
    throw attendanceError;
  }

  const attendanceMap = new Map();

  (attendanceRows || []).forEach(function(item) {
    if (!attendanceMap.has(item.vo_sinh_id)) {
      attendanceMap.set(item.vo_sinh_id, item);
    }
  });

  return (classStudents || []).map(function(item) {
    const attendance = attendanceMap.get(item.vo_sinh_id);

    return {
      id: attendance ? attendance.id : null,
      buoi_hoc_id: buoiHoc.id,
      vo_sinh_id: item.vo_sinh_id,
      ho_ten: item.vo_sinh ? item.vo_sinh.ho_ten : null,
      bac_dai: null,
      trang_thai_diem_danh: attendance ? attendance.trang_thai_diem_danh : null,
      loai_vang: attendance ? attendance.loai_vang : null,
      ly_do: attendance ? attendance.ly_do : null,
      ngay_cap_nhat: attendance ? attendance.ngay_cap_nhat : null
    };
  });
}

async function upsertAttendanceRows(rows) {
  if (!rows.length) {
    return;
  }

  const { error: upsertError } = await supabase.from('diem_danh').upsert(rows, {
    onConflict: 'buoi_hoc_id,vo_sinh_id'
  });

  if (!upsertError) {
    return;
  }

  if (upsertError.code !== '42P10') {
    throw upsertError;
  }

  for (const row of rows) {
    const { data: existing, error: existingError } = await supabase
      .from('diem_danh')
      .select('id')
      .eq('buoi_hoc_id', row.buoi_hoc_id)
      .eq('vo_sinh_id', row.vo_sinh_id)
      .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    if (existing) {
      const { error: updateError } = await supabase
        .from('diem_danh')
        .update({
          trang_thai_diem_danh: row.trang_thai_diem_danh,
          loai_vang: row.loai_vang,
          ly_do: row.ly_do,
          ngay_cap_nhat: row.ngay_cap_nhat
        })
        .eq('id', existing.id);

      if (updateError) {
        throw updateError;
      }

      continue;
    }

    const { error: insertError } = await supabase.from('diem_danh').insert(row);

    if (insertError) {
      throw insertError;
    }
  }
}

function buildSummary(danhSach) {
  const summary = {
    tong_vo_sinh: danhSach.length,
    da_diem_danh: 0,
    co_mat: 0,
    vang_co_phep: 0,
    vang_khong_phep: 0,
    chua_cap_nhat: 0
  };

  danhSach.forEach(function(item) {
    if (!item.trang_thai_diem_danh) {
      summary.chua_cap_nhat += 1;
      return;
    }

    summary.da_diem_danh += 1;

    if (item.trang_thai_diem_danh === TRANG_THAI.CO_MAT) {
      summary.co_mat += 1;
      return;
    }

    if (item.trang_thai_diem_danh === TRANG_THAI.VANG && item.loai_vang === LOAI_VANG.CO_PHEP) {
      summary.vang_co_phep += 1;
      return;
    }

    if (item.trang_thai_diem_danh === TRANG_THAI.VANG && item.loai_vang === LOAI_VANG.KHONG_PHEP) {
      summary.vang_khong_phep += 1;
    }
  });

  return summary;
}

function applyDanhSachFilters(danhSach, filters) {
  return danhSach.filter(function(item) {
    if (filters.q) {
      const keyword = filters.q.toLowerCase();
      const hoTen = (item.ho_ten || '').toLowerCase();
      const voSinhId = String(item.vo_sinh_id || '');

      if (!hoTen.includes(keyword) && !voSinhId.includes(keyword)) {
        return false;
      }
    }

    if (filters.trangThai) {
      if (filters.trangThai === 'chua_cap_nhat') {
        if (item.trang_thai_diem_danh) {
          return false;
        }
      } else if (item.trang_thai_diem_danh !== filters.trangThai) {
        return false;
      }
    }

    if (filters.loaiVang) {
      if (item.loai_vang !== filters.loaiVang) {
        return false;
      }
    }

    return true;
  });
}

function buildRedirectBaseForDiemDanh(buoiHocId, filters) {
  const searchParams = new URLSearchParams();
  searchParams.set('buoi_hoc_id', String(buoiHocId));

  if (filters.q) {
    searchParams.set('q', filters.q);
  }

  if (filters.trangThai) {
    searchParams.set('trang_thai', filters.trangThai);
  }

  if (filters.loaiVang) {
    searchParams.set('loai_vang', filters.loaiVang);
  }

  return `/diem-danh?${searchParams.toString()}`;
}

router.get('/', async function(req, res, next) {
  try {
    const selectedBuoiHocId = parsePositiveInt(req.query.buoi_hoc_id);
    const filters = {
      q: normalizeFilterValue(req.query.q),
      trangThai: normalizeFilterValue(req.query.trang_thai),
      loaiVang: normalizeFilterValue(req.query.loai_vang)
    };
    const buoiHocList = await loadBuoiHocList();

    let buoiHoc = null;
    let danhSachDiemDanh = [];
    let summary = {
      tong_vo_sinh: 0,
      da_diem_danh: 0,
      co_mat: 0,
      vang_co_phep: 0,
      vang_khong_phep: 0,
      chua_cap_nhat: 0
    };
    let errorMessage = req.query.error || '';

    if (selectedBuoiHocId) {
      buoiHoc = await getBuoiHocById(selectedBuoiHocId);

      if (!buoiHoc) {
        errorMessage = errorMessage || 'Không tìm thấy buổi học';
      } else {
        const rawDanhSachDiemDanh = await loadDanhSachDiemDanh(buoiHoc);
        summary = buildSummary(rawDanhSachDiemDanh);
        danhSachDiemDanh = applyDanhSachFilters(rawDanhSachDiemDanh, filters);
      }
    }

    return res.render('diem-danh', {
      title: 'Điểm danh buổi học',
      activePage: 'diem-danh',
      buoiHocList,
      selectedBuoiHocId: selectedBuoiHocId || null,
      buoiHoc,
      danhSachDiemDanh,
      summary,
      filters,
      message: req.query.message || '',
      errorMessage
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/cap-nhat', async function(req, res) {
  try {
    const buoiHocId = parsePositiveInt(req.body.buoi_hoc_id);
    const voSinhId = parsePositiveInt(req.body.vo_sinh_id);
    const filters = {
      q: normalizeFilterValue(req.body.q),
      trangThai: normalizeFilterValue(req.body.trang_thai),
      loaiVang: normalizeFilterValue(req.body.loai_vang_filter)
    };

    if (!buoiHocId || !voSinhId) {
      return res.redirect(createRedirectWithMessage('/diem-danh', '', 'Thiếu thông tin buổi học hoặc võ sinh'));
    }

    const redirectBase = buildRedirectBaseForDiemDanh(buoiHocId, filters);

    const payload = {
      trang_thai_diem_danh: normalizeText(req.body.trang_thai_diem_danh),
      loai_vang: normalizeNullableText(req.body.loai_vang),
      ly_do: normalizeNullableText(req.body.ly_do)
    };

    const errors = validateStatusPayload(payload);

    if (errors.length) {
      return res.redirect(createRedirectWithMessage(redirectBase, '', errors[0].reason));
    }

    const buoiHoc = await getBuoiHocById(buoiHocId);

    if (!buoiHoc) {
      return res.redirect(createRedirectWithMessage(redirectBase, '', 'Không tìm thấy buổi học'));
    }

    const [{ data: voSinh, error: voSinhError }, { data: relation, error: relationError }] = await Promise.all([
      supabase.from('vo_sinh').select('id').eq('id', voSinhId).maybeSingle(),
      supabase
        .from('vo_sinh_lop')
        .select('id')
        .eq('vo_sinh_id', voSinhId)
        .eq('lop_vo_id', buoiHoc.lop_vo_id)
        .maybeSingle()
    ]);

    if (voSinhError || relationError) {
      return res.redirect(
        createRedirectWithMessage(
          redirectBase,
          '',
          getPublicViewErrorMessage(voSinhError || relationError, 'Không thể kiểm tra dữ liệu võ sinh/lớp lúc này')
        )
      );
    }

    if (!voSinh) {
      return res.redirect(createRedirectWithMessage(redirectBase, '', 'Không tìm thấy võ sinh'));
    }

    if (!relation) {
      return res.redirect(createRedirectWithMessage(redirectBase, '', 'Võ sinh không thuộc lớp của buổi học'));
    }

    const { data: existing, error: existingError } = await supabase
      .from('diem_danh')
      .select('*')
      .eq('buoi_hoc_id', buoiHocId)
      .eq('vo_sinh_id', voSinhId)
      .maybeSingle();

    if (existingError) {
      return res.redirect(
        createRedirectWithMessage(
          redirectBase,
          '',
          getPublicViewErrorMessage(existingError, 'Không thể kiểm tra dữ liệu điểm danh lúc này')
        )
      );
    }

    const now = new Date().toISOString();

    if (existing) {
      const { error } = await supabase
        .from('diem_danh')
        .update({
          trang_thai_diem_danh: payload.trang_thai_diem_danh,
          loai_vang: payload.trang_thai_diem_danh === TRANG_THAI.CO_MAT ? null : payload.loai_vang,
          ly_do: payload.ly_do,
          ngay_cap_nhat: now
        })
        .eq('id', existing.id);

      if (error) {
        return res.redirect(
          createRedirectWithMessage(redirectBase, '', getPublicViewErrorMessage(error, 'Không thể cập nhật điểm danh lúc này'))
        );
      }

      return res.redirect(createRedirectWithMessage(redirectBase, 'Cập nhật trạng thái điểm danh thành công', ''));
    }

    const { error } = await supabase
      .from('diem_danh')
      .insert({
        buoi_hoc_id: buoiHocId,
        vo_sinh_id: voSinhId,
        trang_thai_diem_danh: payload.trang_thai_diem_danh,
        loai_vang: payload.trang_thai_diem_danh === TRANG_THAI.CO_MAT ? null : payload.loai_vang,
        ly_do: payload.ly_do,
        ngay_cap_nhat: now
      });

    if (error) {
      return res.redirect(
        createRedirectWithMessage(redirectBase, '', getPublicViewErrorMessage(error, 'Không thể tạo điểm danh lúc này'))
      );
    }

    return res.redirect(createRedirectWithMessage(redirectBase, 'Tạo điểm danh thành công', ''));
  } catch (error) {
    return res.redirect(createRedirectWithMessage('/diem-danh', '', getPublicViewErrorMessage(error, 'Không thể xử lý điểm danh lúc này')));
  }
});

router.post('/cap-nhat-json', async function(req, res) {
  try {
    const buoiHocId = parsePositiveInt(req.body.buoi_hoc_id);
    const voSinhId = parsePositiveInt(req.body.vo_sinh_id);
    const expectedNgayCapNhat = normalizeNullableText(req.body.expected_ngay_cap_nhat);

    if (!buoiHocId || !voSinhId) {
      return res.status(400).json({
        success: false,
        error: 'Thiếu thông tin buổi học hoặc võ sinh'
      });
    }

    const payload = {
      trang_thai_diem_danh: normalizeText(req.body.trang_thai_diem_danh),
      loai_vang: normalizeNullableText(req.body.loai_vang),
      ly_do: normalizeNullableText(req.body.ly_do)
    };

    const errors = validateStatusPayload(payload);

    if (errors.length) {
      return res.status(400).json({
        success: false,
        error: errors[0].reason
      });
    }

    const buoiHoc = await getBuoiHocById(buoiHocId);

    if (!buoiHoc) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy buổi học'
      });
    }

    const [{ data: voSinh, error: voSinhError }, { data: relation, error: relationError }] = await Promise.all([
      supabase.from('vo_sinh').select('id').eq('id', voSinhId).maybeSingle(),
      supabase
        .from('vo_sinh_lop')
        .select('id')
        .eq('vo_sinh_id', voSinhId)
        .eq('lop_vo_id', buoiHoc.lop_vo_id)
        .maybeSingle()
    ]);

    if (voSinhError || relationError) {
      return res.status(500).json({
        success: false,
        error: getPublicViewErrorMessage(voSinhError || relationError, 'Không thể kiểm tra dữ liệu võ sinh/lớp lúc này')
      });
    }

    if (!voSinh) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy võ sinh'
      });
    }

    if (!relation) {
      return res.status(400).json({
        success: false,
        error: 'Võ sinh không thuộc lớp của buổi học'
      });
    }

    const { data: existing, error: existingError } = await supabase
      .from('diem_danh')
      .select('*')
      .eq('buoi_hoc_id', buoiHocId)
      .eq('vo_sinh_id', voSinhId)
      .maybeSingle();

    if (existingError) {
      return res.status(500).json({
        success: false,
        error: getPublicViewErrorMessage(existingError, 'Không thể kiểm tra dữ liệu điểm danh lúc này')
      });
    }

    const hasConflict = hasVersionConflict(expectedNgayCapNhat, existing ? existing.ngay_cap_nhat : null);

    if (hasConflict) {
      return res.status(409).json({
        success: false,
        code: 'attendance_conflict',
        error: 'Dữ liệu đã được cập nhật bởi thao tác khác. Vui lòng kiểm tra trạng thái mới nhất.',
        data: mapAttendanceToJsonPayload(existing, voSinhId)
      });
    }

    const now = new Date().toISOString();
    const loaiVangForSave = payload.trang_thai_diem_danh === TRANG_THAI.CO_MAT ? null : payload.loai_vang;
    const lyDoForSave = payload.trang_thai_diem_danh === TRANG_THAI.CO_MAT ? null : payload.ly_do;

    if (existing) {
      const { error } = await supabase
        .from('diem_danh')
        .update({
          trang_thai_diem_danh: payload.trang_thai_diem_danh,
          loai_vang: loaiVangForSave,
          ly_do: lyDoForSave,
          ngay_cap_nhat: now
        })
        .eq('id', existing.id);

      if (error) {
        return res.status(500).json({
          success: false,
          error: getPublicViewErrorMessage(error, 'Không thể cập nhật điểm danh lúc này')
        });
      }

      return res.json({
        success: true,
        message: 'Cập nhật trạng thái điểm danh thành công',
        data: {
          vo_sinh_id: voSinhId,
          trang_thai_diem_danh: payload.trang_thai_diem_danh,
          loai_vang: loaiVangForSave,
          ly_do: lyDoForSave,
          ngay_cap_nhat: now
        }
      });
    }

    const { error } = await supabase
      .from('diem_danh')
      .insert({
        buoi_hoc_id: buoiHocId,
        vo_sinh_id: voSinhId,
        trang_thai_diem_danh: payload.trang_thai_diem_danh,
        loai_vang: loaiVangForSave,
        ly_do: lyDoForSave,
        ngay_cap_nhat: now
      });

    if (error) {
      return res.status(500).json({
        success: false,
        error: getPublicViewErrorMessage(error, 'Không thể tạo điểm danh lúc này')
      });
    }

    return res.json({
      success: true,
      message: 'Tạo điểm danh thành công',
      data: {
        vo_sinh_id: voSinhId,
        trang_thai_diem_danh: payload.trang_thai_diem_danh,
        loai_vang: loaiVangForSave,
        ly_do: lyDoForSave,
        ngay_cap_nhat: now
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: getPublicViewErrorMessage(error, 'Không thể xử lý điểm danh lúc này')
    });
  }
});

router.post('/cap-nhat-nhanh-json', async function(req, res) {
  try {
    const buoiHocId = parsePositiveInt(req.body.buoi_hoc_id);
    const action = normalizeText(req.body.bulk_action);
    const filters = {
      q: normalizeFilterValue(req.body.q),
      trangThai: normalizeFilterValue(req.body.trang_thai),
      loaiVang: normalizeFilterValue(req.body.loai_vang_filter)
    };
    const targetVoSinhIds = parsePositiveIntArray(req.body.target_vo_sinh_ids);
    const expectedVersions = req.body.expected_versions && typeof req.body.expected_versions === 'object'
      ? req.body.expected_versions
      : {};

    if (!buoiHocId) {
      return res.status(400).json({
        success: false,
        error: 'Thiếu thông tin buổi học'
      });
    }

    const allowedActions = ['all_co_mat', 'all_vang_co_phep', 'all_vang_khong_phep'];

    if (!allowedActions.includes(action)) {
      return res.status(400).json({
        success: false,
        error: 'Thao tác nhanh không hợp lệ'
      });
    }

    const buoiHoc = await getBuoiHocById(buoiHocId);

    if (!buoiHoc) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy buổi học'
      });
    }

    const danhSachRaw = await loadDanhSachDiemDanh(buoiHoc);
    let targets = [];

    if (targetVoSinhIds.length) {
      const allowedSet = new Set(
        danhSachRaw
          .map(function(item) {
            return item.vo_sinh_id;
          })
          .filter(Boolean)
      );

      targets = targetVoSinhIds.filter(function(voSinhId) {
        return allowedSet.has(voSinhId);
      });
    } else {
      targets = applyDanhSachFilters(danhSachRaw, filters)
        .map(function(item) {
          return item.vo_sinh_id;
        })
        .filter(Boolean);
    }

    const uniqueTargets = Array.from(new Set(targets));

    if (!uniqueTargets.length) {
      return res.status(400).json({
        success: false,
        error: 'Không có võ sinh phù hợp để cập nhật'
      });
    }

    let trangThai = TRANG_THAI.CO_MAT;
    let loaiVang = null;

    if (action === 'all_vang_co_phep') {
      trangThai = TRANG_THAI.VANG;
      loaiVang = LOAI_VANG.CO_PHEP;
    }

    if (action === 'all_vang_khong_phep') {
      trangThai = TRANG_THAI.VANG;
      loaiVang = LOAI_VANG.KHONG_PHEP;
    }

    const now = new Date().toISOString();
    const lyDoBulk = normalizeNullableText(req.body.bulk_ly_do);

    const { data: existingRows, error: existingRowsError } = await supabase
      .from('diem_danh')
      .select('id, buoi_hoc_id, vo_sinh_id, trang_thai_diem_danh, loai_vang, ly_do, ngay_cap_nhat')
      .eq('buoi_hoc_id', buoiHocId)
      .in('vo_sinh_id', uniqueTargets);

    if (existingRowsError) {
      return res.status(500).json({
        success: false,
        error: getPublicViewErrorMessage(existingRowsError, 'Không thể kiểm tra dữ liệu điểm danh lúc này')
      });
    }

    const existingMap = new Map();

    (existingRows || []).forEach(function(row) {
      existingMap.set(row.vo_sinh_id, row);
    });

    const rowsToUpsert = [];
    const conflicts = [];

    uniqueTargets.forEach(function(voSinhId) {
      const existing = existingMap.get(voSinhId) || null;
      const expectedRaw = expectedVersions[String(voSinhId)] || expectedVersions[voSinhId] || null;
      const hasConflict = hasVersionConflict(normalizeNullableText(expectedRaw), existing ? existing.ngay_cap_nhat : null);

      if (hasConflict) {
        conflicts.push(mapAttendanceToJsonPayload(existing, voSinhId));
        return;
      }

      rowsToUpsert.push({
        buoi_hoc_id: buoiHocId,
        vo_sinh_id: voSinhId,
        trang_thai_diem_danh: trangThai,
        loai_vang: loaiVang,
        ly_do: trangThai === TRANG_THAI.CO_MAT ? null : lyDoBulk,
        ngay_cap_nhat: now
      });
    });

    if (rowsToUpsert.length) {
      await upsertAttendanceRows(rowsToUpsert);
    }

    const updated = rowsToUpsert.map(function(row) {
      return {
        vo_sinh_id: row.vo_sinh_id,
        trang_thai_diem_danh: row.trang_thai_diem_danh,
        loai_vang: row.loai_vang,
        ly_do: row.ly_do,
        ngay_cap_nhat: row.ngay_cap_nhat
      };
    });

    return res.json({
      success: true,
      message: `Đã cập nhật ${updated.length}/${uniqueTargets.length} võ sinh`,
      stats: {
        total: uniqueTargets.length,
        updated: updated.length,
        conflicts: conflicts.length
      },
      data: {
        updated,
        conflicts
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: getPublicViewErrorMessage(error, 'Không thể cập nhật nhanh điểm danh lúc này')
    });
  }
});

router.post('/cap-nhat-restore-json', async function(req, res) {
  try {
    const buoiHocId = parsePositiveInt(req.body.buoi_hoc_id);
    const restoreRows = Array.isArray(req.body.restore_rows) ? req.body.restore_rows : [];
    const undoMode = normalizeNullableText(req.body.undo_mode);
    const skipConflictCheck = undoMode === 'immediate';

    if (!buoiHocId) {
      return res.status(400).json({
        success: false,
        error: 'Thiếu thông tin buổi học'
      });
    }

    if (!restoreRows.length) {
      return res.status(400).json({
        success: false,
        error: 'Không có dữ liệu hoàn tác'
      });
    }

    const voSinhIds = parsePositiveIntArray(
      restoreRows.map(function(item) {
        return item ? item.vo_sinh_id : null;
      })
    );

    if (!voSinhIds.length) {
      return res.status(400).json({
        success: false,
        error: 'Dữ liệu hoàn tác không hợp lệ'
      });
    }

    const buoiHoc = await getBuoiHocById(buoiHocId);

    if (!buoiHoc) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy buổi học'
      });
    }

    const { data: existingRows, error: existingRowsError } = await supabase
      .from('diem_danh')
      .select('id, buoi_hoc_id, vo_sinh_id, trang_thai_diem_danh, loai_vang, ly_do, ngay_cap_nhat')
      .eq('buoi_hoc_id', buoiHocId)
      .in('vo_sinh_id', voSinhIds);

    if (existingRowsError) {
      return res.status(500).json({
        success: false,
        error: getPublicViewErrorMessage(existingRowsError, 'Không thể kiểm tra dữ liệu điểm danh lúc này')
      });
    }

    const existingMap = new Map();

    (existingRows || []).forEach(function(row) {
      existingMap.set(row.vo_sinh_id, row);
    });

    const rowsToUpsert = [];
    const rowsToDelete = [];
    const rowsAlreadyAligned = [];
    const conflicts = [];
    const invalid = [];

    restoreRows.forEach(function(item) {
      const voSinhId = parsePositiveInt(item ? item.vo_sinh_id : null);

      if (!voSinhId) {
        return;
      }

      const existing = existingMap.get(voSinhId) || null;
      const restoreStatusRaw = normalizeNullableText(item.trang_thai_diem_danh);
      const restoreLoaiVang = normalizeNullableText(item.loai_vang);
      const restoreLyDo = normalizeNullableText(item.ly_do);

      const desiredStatus = restoreStatusRaw;
      const desiredLoaiVang = desiredStatus === TRANG_THAI.CO_MAT ? null : restoreLoaiVang;
      const desiredLyDo = desiredStatus === TRANG_THAI.CO_MAT ? null : restoreLyDo;

      const hasConflict = skipConflictCheck
        ? false
        : hasVersionConflictForRestore(
          normalizeNullableText(item.expected_ngay_cap_nhat),
          existing ? existing.ngay_cap_nhat : null
        );

      const isAlreadyInDesiredState = !desiredStatus
        ? !existing
        : Boolean(existing)
          && existing.trang_thai_diem_danh === desiredStatus
          && (existing.loai_vang || null) === (desiredLoaiVang || null)
          && (existing.ly_do || null) === (desiredLyDo || null);

      if (hasConflict && !isAlreadyInDesiredState) {
        conflicts.push(mapAttendanceToJsonPayload(existing, voSinhId));
        return;
      }

      if (hasConflict && isAlreadyInDesiredState) {
        rowsAlreadyAligned.push(mapAttendanceToJsonPayload(existing, voSinhId));
        return;
      }

      if (!restoreStatusRaw) {
        if (existing) {
          rowsToDelete.push(voSinhId);
        }

        return;
      }

      if (![TRANG_THAI.CO_MAT, TRANG_THAI.VANG].includes(restoreStatusRaw)) {
        invalid.push({ vo_sinh_id: voSinhId, reason: 'Dữ liệu trạng thái không hợp lệ' });
        return;
      }

      const restoreStatus = restoreStatusRaw;

      if (restoreStatus === TRANG_THAI.VANG && ![LOAI_VANG.CO_PHEP, LOAI_VANG.KHONG_PHEP].includes(restoreLoaiVang)) {
        invalid.push({ vo_sinh_id: voSinhId, reason: 'Dữ liệu loại vắng không hợp lệ' });
        return;
      }

      rowsToUpsert.push({
        buoi_hoc_id: buoiHocId,
        vo_sinh_id: voSinhId,
        trang_thai_diem_danh: restoreStatus,
        loai_vang: restoreStatus === TRANG_THAI.CO_MAT ? null : restoreLoaiVang,
        ly_do: restoreStatus === TRANG_THAI.CO_MAT ? null : restoreLyDo,
        ngay_cap_nhat: new Date().toISOString()
      });
    });

    if (rowsToDelete.length) {
      const { error: deleteError } = await supabase
        .from('diem_danh')
        .delete()
        .eq('buoi_hoc_id', buoiHocId)
        .in('vo_sinh_id', rowsToDelete);

      if (deleteError) {
        return res.status(500).json({
          success: false,
          error: getPublicViewErrorMessage(deleteError, 'Không thể hoàn tác dữ liệu điểm danh lúc này')
        });
      }
    }

    if (rowsToUpsert.length) {
      await upsertAttendanceRows(rowsToUpsert);
    }

    const updated = [];

    rowsAlreadyAligned.forEach(function(row) {
      updated.push({
        vo_sinh_id: row.vo_sinh_id,
        trang_thai_diem_danh: row.trang_thai_diem_danh,
        loai_vang: row.loai_vang,
        ly_do: row.ly_do,
        ngay_cap_nhat: row.ngay_cap_nhat
      });
    });

    rowsToUpsert.forEach(function(row) {
      updated.push({
        vo_sinh_id: row.vo_sinh_id,
        trang_thai_diem_danh: row.trang_thai_diem_danh,
        loai_vang: row.loai_vang,
        ly_do: row.ly_do,
        ngay_cap_nhat: row.ngay_cap_nhat
      });
    });

    rowsToDelete.forEach(function(voSinhId) {
      updated.push({
        vo_sinh_id: voSinhId,
        trang_thai_diem_danh: null,
        loai_vang: null,
        ly_do: null,
        ngay_cap_nhat: null
      });
    });

    return res.json({
      success: true,
      message: `Hoàn tác ${updated.length}/${voSinhIds.length} võ sinh`,
      stats: {
        total: voSinhIds.length,
        restored: updated.length,
        conflicts: conflicts.length,
        invalid: invalid.length,
        aligned: rowsAlreadyAligned.length
      },
      data: {
        updated,
        conflicts,
        invalid
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: getPublicViewErrorMessage(error, 'Không thể hoàn tác điểm danh lúc này')
    });
  }
});

router.post('/cap-nhat-nhanh', async function(req, res) {
  try {
    const buoiHocId = parsePositiveInt(req.body.buoi_hoc_id);
    const action = normalizeText(req.body.bulk_action);
    const filters = {
      q: normalizeFilterValue(req.body.q),
      trangThai: normalizeFilterValue(req.body.trang_thai),
      loaiVang: normalizeFilterValue(req.body.loai_vang_filter)
    };

    if (!buoiHocId) {
      return res.redirect(createRedirectWithMessage('/diem-danh', '', 'Thiếu thông tin buổi học'));
    }

    const redirectBase = buildRedirectBaseForDiemDanh(buoiHocId, filters);
    const allowedActions = ['all_co_mat', 'all_vang_co_phep', 'all_vang_khong_phep'];

    if (!allowedActions.includes(action)) {
      return res.redirect(createRedirectWithMessage(redirectBase, '', 'Thao tác nhanh không hợp lệ'));
    }

    const buoiHoc = await getBuoiHocById(buoiHocId);

    if (!buoiHoc) {
      return res.redirect(createRedirectWithMessage(redirectBase, '', 'Không tìm thấy buổi học'));
    }

    const danhSachRaw = await loadDanhSachDiemDanh(buoiHoc);
    const danhSachFiltered = applyDanhSachFilters(danhSachRaw, filters);

    if (!danhSachFiltered.length) {
      return res.redirect(createRedirectWithMessage(redirectBase, '', 'Không có võ sinh phù hợp bộ lọc để cập nhật'));
    }

    const now = new Date().toISOString();
    const lyDoBulk = normalizeNullableText(req.body.bulk_ly_do);

    let trangThai = TRANG_THAI.CO_MAT;
    let loaiVang = null;

    if (action === 'all_vang_co_phep') {
      trangThai = TRANG_THAI.VANG;
      loaiVang = LOAI_VANG.CO_PHEP;
    }

    if (action === 'all_vang_khong_phep') {
      trangThai = TRANG_THAI.VANG;
      loaiVang = LOAI_VANG.KHONG_PHEP;
    }

    const uniqueVoSinhIds = Array.from(
      new Set(
        danhSachFiltered
          .map(function(item) {
            return item.vo_sinh_id;
          })
          .filter(Boolean)
      )
    );

    const rows = uniqueVoSinhIds.map(function(voSinhId) {
      return {
        buoi_hoc_id: buoiHocId,
        vo_sinh_id: voSinhId,
        trang_thai_diem_danh: trangThai,
        loai_vang: loaiVang,
        ly_do: trangThai === TRANG_THAI.CO_MAT ? null : lyDoBulk,
        ngay_cap_nhat: now
      };
    });

    await upsertAttendanceRows(rows);

    return res.redirect(
      createRedirectWithMessage(
        redirectBase,
        `Đã cập nhật nhanh ${rows.length} võ sinh`,
        ''
      )
    );
  } catch (error) {
    return res.redirect(
      createRedirectWithMessage('/diem-danh', '', getPublicViewErrorMessage(error, 'Không thể cập nhật nhanh điểm danh lúc này'))
    );
  }
});

module.exports = router;
