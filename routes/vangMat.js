const express = require('express');

const supabase = require('../config/supabase');

const router = express.Router();

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

async function loadBuoiHocList() {
  const { data, error } = await supabase
    .from('buoi_hoc')
    .select('id, ngay_hoc, gio_bat_dau, gio_ket_thuc, lop_vo_id, lop_vo:lop_vo_id(id, ten_lop)')
    .order('ngay_hoc', { ascending: false })
    .order('gio_bat_dau', { ascending: false })
    .limit(200);

  if (error) {
    throw error;
  }

  return data || [];
}

async function loadVangMatList(buoiHocId) {
  const { data, error } = await supabase
    .from('diem_danh')
    .select('id, buoi_hoc_id, vo_sinh_id, loai_vang, ly_do, ngay_cap_nhat, vo_sinh:vo_sinh_id(id, ho_ten, so_dien_thoai)')
    .eq('buoi_hoc_id', buoiHocId)
    .eq('trang_thai_diem_danh', 'vang')
    .order('ngay_cap_nhat', { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
}

function applyFilters(items, filters) {
  return items.filter(function(item) {
    if (filters.loaiVang && item.loai_vang !== filters.loaiVang) {
      return false;
    }

    if (filters.q) {
      const keyword = filters.q.toLowerCase();
      const hoTen = item.vo_sinh && item.vo_sinh.ho_ten ? item.vo_sinh.ho_ten.toLowerCase() : '';
      const voSinhId = String(item.vo_sinh_id || '');

      if (!hoTen.includes(keyword) && !voSinhId.includes(keyword)) {
        return false;
      }
    }

    return true;
  });
}

function buildSummary(items) {
  const summary = {
    tong_vang: items.length,
    vang_co_phep: 0,
    vang_khong_phep: 0
  };

  items.forEach(function(item) {
    if (item.loai_vang === LOAI_VANG.CO_PHEP) {
      summary.vang_co_phep += 1;
      return;
    }

    if (item.loai_vang === LOAI_VANG.KHONG_PHEP) {
      summary.vang_khong_phep += 1;
    }
  });

  return summary;
}

router.get('/', async function(req, res, next) {
  try {
    const selectedBuoiHocId = parsePositiveInt(req.query.buoi_hoc_id);
    const filters = {
      loaiVang: normalizeText(req.query.loai_vang) || null,
      q: normalizeText(req.query.q) || null
    };

    const buoiHocList = await loadBuoiHocList();

    let selectedBuoiHoc = null;
    let vangMatList = [];
    let summary = {
      tong_vang: 0,
      vang_co_phep: 0,
      vang_khong_phep: 0
    };
    let errorMessage = req.query.error || '';

    if (selectedBuoiHocId) {
      selectedBuoiHoc = buoiHocList.find(function(item) {
        return item.id === selectedBuoiHocId;
      });

      if (!selectedBuoiHoc) {
        errorMessage = errorMessage || 'Không tìm thấy buổi học';
      } else {
        const rawList = await loadVangMatList(selectedBuoiHocId);
        summary = buildSummary(rawList);
        vangMatList = applyFilters(rawList, filters);
      }
    }

    return res.render('vang-mat', {
      title: 'Tab vắng mặt',
      activePage: 'vang-mat',
      buoiHocList,
      selectedBuoiHocId: selectedBuoiHocId || null,
      selectedBuoiHoc,
      vangMatList,
      summary,
      filters,
      message: req.query.message || '',
      errorMessage
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
