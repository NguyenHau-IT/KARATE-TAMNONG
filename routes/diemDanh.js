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

module.exports = router;
