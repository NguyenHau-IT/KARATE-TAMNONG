const express = require('express');

const supabase = require('../config/supabase');

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

router.get('/', async function(req, res) {
  try {
    const buoiHocId = parsePositiveInt(req.query.buoi_hoc_id);

    if (!buoiHocId) {
      return res.status(400).json({
        message: 'Dữ liệu không hợp lệ',
        errors: [{ field: 'buoi_hoc_id', reason: 'buoi_hoc_id phải là số nguyên dương' }]
      });
    }

    const buoiHoc = await getBuoiHocById(buoiHocId);

    if (!buoiHoc) {
      return res.status(404).json({ message: 'Không tìm thấy buổi học' });
    }

    const [{ data: classStudents, error: classStudentsError }, { data: attendanceRows, error: attendanceError }] =
      await Promise.all([
        supabase
          .from('vo_sinh_lop')
          .select('vo_sinh_id, vo_sinh:vo_sinh_id(id, ho_ten)')
          .eq('lop_vo_id', buoiHoc.lop_vo_id),
        supabase
          .from('diem_danh')
          .select('id, buoi_hoc_id, vo_sinh_id, trang_thai_diem_danh, loai_vang, ly_do, ngay_cap_nhat')
          .eq('buoi_hoc_id', buoiHocId)
      ]);

    if (classStudentsError) {
      return res.status(500).json({ message: classStudentsError.message });
    }

    if (attendanceError) {
      return res.status(500).json({ message: attendanceError.message });
    }

    const attendanceMap = new Map();

    (attendanceRows || []).forEach(function(item) {
      if (!attendanceMap.has(item.vo_sinh_id)) {
        attendanceMap.set(item.vo_sinh_id, item);
      }
    });

    const data = (classStudents || []).map(function(item) {
      const attendance = attendanceMap.get(item.vo_sinh_id);

      return {
        id: attendance ? attendance.id : null,
        buoi_hoc_id: buoiHocId,
        vo_sinh_id: item.vo_sinh_id,
        ho_ten: item.vo_sinh ? item.vo_sinh.ho_ten : null,
        trang_thai_diem_danh: attendance ? attendance.trang_thai_diem_danh : null,
        loai_vang: attendance ? attendance.loai_vang : null,
        ly_do: attendance ? attendance.ly_do : null,
        ngay_cap_nhat: attendance ? attendance.ngay_cap_nhat : null
      };
    });

    return res.json({
      message: 'Lấy danh sách điểm danh thành công',
      data
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.get('/tong-hop', async function(req, res) {
  try {
    const buoiHocId = parsePositiveInt(req.query.buoi_hoc_id);

    if (!buoiHocId) {
      return res.status(400).json({
        message: 'Dữ liệu không hợp lệ',
        errors: [{ field: 'buoi_hoc_id', reason: 'buoi_hoc_id phải là số nguyên dương' }]
      });
    }

    const buoiHoc = await getBuoiHocById(buoiHocId);

    if (!buoiHoc) {
      return res.status(404).json({ message: 'Không tìm thấy buổi học' });
    }

    const [
      { count: totalVoSinh, error: totalError },
      { count: daDiemDanh, error: attendanceCountError },
      { count: coMat, error: coMatError },
      { count: vangCoPhep, error: vangCoPhepError },
      { count: vangKhongPhep, error: vangKhongPhepError }
    ] = await Promise.all([
      supabase.from('vo_sinh_lop').select('*', { count: 'exact', head: true }).eq('lop_vo_id', buoiHoc.lop_vo_id),
      supabase.from('diem_danh').select('*', { count: 'exact', head: true }).eq('buoi_hoc_id', buoiHocId),
      supabase
        .from('diem_danh')
        .select('*', { count: 'exact', head: true })
        .eq('buoi_hoc_id', buoiHocId)
        .eq('trang_thai_diem_danh', TRANG_THAI.CO_MAT),
      supabase
        .from('diem_danh')
        .select('*', { count: 'exact', head: true })
        .eq('buoi_hoc_id', buoiHocId)
        .eq('trang_thai_diem_danh', TRANG_THAI.VANG)
        .eq('loai_vang', LOAI_VANG.CO_PHEP),
      supabase
        .from('diem_danh')
        .select('*', { count: 'exact', head: true })
        .eq('buoi_hoc_id', buoiHocId)
        .eq('trang_thai_diem_danh', TRANG_THAI.VANG)
        .eq('loai_vang', LOAI_VANG.KHONG_PHEP)
    ]);

    const firstError = totalError || attendanceCountError || coMatError || vangCoPhepError || vangKhongPhepError;

    if (firstError) {
      return res.status(500).json({ message: firstError.message });
    }

    const tongVoSinh = totalVoSinh || 0;
    const da = daDiemDanh || 0;

    return res.json({
      message: 'Lấy tổng hợp điểm danh thành công',
      data: {
        buoi_hoc_id: buoiHocId,
        tong_vo_sinh: tongVoSinh,
        da_diem_danh: da,
        co_mat: coMat || 0,
        vang_co_phep: vangCoPhep || 0,
        vang_khong_phep: vangKhongPhep || 0,
        chua_cap_nhat: Math.max(tongVoSinh - da, 0)
      }
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.put('/:id/trang-thai', async function(req, res) {
  try {
    const id = parsePositiveInt(req.params.id);

    if (!id) {
      return res.status(400).json({
        message: 'Dữ liệu không hợp lệ',
        errors: [{ field: 'id', reason: 'id phải là số nguyên dương' }]
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
        message: 'Dữ liệu không hợp lệ',
        errors
      });
    }

    const { data: current, error: currentError } = await supabase
      .from('diem_danh')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (currentError) {
      return res.status(500).json({ message: currentError.message });
    }

    if (!current) {
      return res.status(404).json({ message: 'Không tìm thấy bản ghi điểm danh' });
    }

    if (
      current.trang_thai_diem_danh === payload.trang_thai_diem_danh &&
      (current.loai_vang || null) === payload.loai_vang &&
      (current.ly_do || null) === payload.ly_do
    ) {
      return res.json({
        message: 'Cập nhật trạng thái điểm danh thành công',
        data: current
      });
    }

    const { data, error } = await supabase
      .from('diem_danh')
      .update({
        trang_thai_diem_danh: payload.trang_thai_diem_danh,
        loai_vang: payload.trang_thai_diem_danh === TRANG_THAI.CO_MAT ? null : payload.loai_vang,
        ly_do: payload.ly_do,
        ngay_cap_nhat: new Date().toISOString()
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      return res.status(500).json({ message: error.message });
    }

    return res.json({
      message: 'Cập nhật trạng thái điểm danh thành công',
      data
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.post('/upsert', async function(req, res) {
  try {
    const buoiHocId = parsePositiveInt(req.body.buoi_hoc_id);
    const voSinhId = parsePositiveInt(req.body.vo_sinh_id);
    const payload = {
      trang_thai_diem_danh: normalizeText(req.body.trang_thai_diem_danh),
      loai_vang: normalizeNullableText(req.body.loai_vang),
      ly_do: normalizeNullableText(req.body.ly_do)
    };

    const errors = [];

    if (!buoiHocId) {
      errors.push({ field: 'buoi_hoc_id', reason: 'buoi_hoc_id phải là số nguyên dương' });
    }

    if (!voSinhId) {
      errors.push({ field: 'vo_sinh_id', reason: 'vo_sinh_id phải là số nguyên dương' });
    }

    errors.push.apply(errors, validateStatusPayload(payload));

    if (errors.length) {
      return res.status(400).json({ message: 'Dữ liệu không hợp lệ', errors });
    }

    const [buoiHoc, voSinh] = await Promise.all([
      getBuoiHocById(buoiHocId),
      supabase.from('vo_sinh').select('id').eq('id', voSinhId).maybeSingle()
    ]);

    if (!buoiHoc) {
      return res.status(404).json({ message: 'Không tìm thấy buổi học' });
    }

    if (voSinh.error) {
      return res.status(500).json({ message: voSinh.error.message });
    }

    if (!voSinh.data) {
      return res.status(404).json({ message: 'Không tìm thấy võ sinh' });
    }

    const { data: existing, error: existingError } = await supabase
      .from('diem_danh')
      .select('*')
      .eq('buoi_hoc_id', buoiHocId)
      .eq('vo_sinh_id', voSinhId)
      .maybeSingle();

    if (existingError) {
      return res.status(500).json({ message: existingError.message });
    }

    const now = new Date().toISOString();

    if (existing) {
      const { data, error } = await supabase
        .from('diem_danh')
        .update({
          trang_thai_diem_danh: payload.trang_thai_diem_danh,
          loai_vang: payload.trang_thai_diem_danh === TRANG_THAI.CO_MAT ? null : payload.loai_vang,
          ly_do: payload.ly_do,
          ngay_cap_nhat: now
        })
        .eq('id', existing.id)
        .select('*')
        .single();

      if (error) {
        return res.status(500).json({ message: error.message });
      }

      return res.json({ message: 'Cập nhật trạng thái điểm danh thành công', data });
    }

    const { data, error } = await supabase
      .from('diem_danh')
      .insert({
        buoi_hoc_id: buoiHocId,
        vo_sinh_id: voSinhId,
        trang_thai_diem_danh: payload.trang_thai_diem_danh,
        loai_vang: payload.trang_thai_diem_danh === TRANG_THAI.CO_MAT ? null : payload.loai_vang,
        ly_do: payload.ly_do,
        ngay_cap_nhat: now
      })
      .select('*')
      .single();

    if (error) {
      return res.status(500).json({ message: error.message });
    }

    return res.status(201).json({ message: 'Tạo điểm danh thành công', data });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

module.exports = router;
