const express = require('express');

const supabase = require('../config/supabase');

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

router.post('/', async function(req, res) {
  try {
    const payload = normalizeCreatePayload(req.body);
    const errors = validateCreatePayload(payload);

    if (errors.length) {
      return res.status(400).json({
        message: 'Dữ liệu không hợp lệ',
        errors
      });
    }

    const { data: lopVo, error: lopVoError } = await supabase
      .from('lop_vo')
      .select('id')
      .eq('id', payload.lop_vo_id)
      .maybeSingle();

    if (lopVoError) {
      return res.status(500).json({ message: lopVoError.message });
    }

    if (!lopVo) {
      return res.status(404).json({ message: 'Không tìm thấy lớp võ' });
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
      return res.status(500).json({ message: duplicateError.message });
    }

    if (duplicateRows && duplicateRows.length) {
      return res.status(409).json({ message: 'Buổi học đã tồn tại với lớp, ngày và khung giờ này' });
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
      return res.status(500).json({ message: error.message });
    }

    return res.status(201).json({
      message: 'Tạo buổi học thành công',
      data
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.get('/:id', async function(req, res) {
  try {
    const id = parsePositiveInt(req.params.id);

    if (!id) {
      return res.status(400).json({
        message: 'Dữ liệu không hợp lệ',
        errors: [{ field: 'id', reason: 'id phải là số nguyên dương' }]
      });
    }

    const { data, error } = await supabase.from('buoi_hoc').select('*').eq('id', id).maybeSingle();

    if (error) {
      return res.status(500).json({ message: error.message });
    }

    if (!data) {
      return res.status(404).json({ message: 'Không tìm thấy buổi học' });
    }

    return res.json({
      message: 'Lấy chi tiết buổi học thành công',
      data
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

module.exports = router;
