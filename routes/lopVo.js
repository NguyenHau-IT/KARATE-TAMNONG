const express = require('express');

const supabase = require('../config/supabase');
const { getPublicViewErrorMessage } = require('../utils/publicError');

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

function buildLopVoPath(lopVoId, message, error) {
  const searchParams = new URLSearchParams();

  if (lopVoId) {
    searchParams.set('lop_vo_id', String(lopVoId));
  }

  if (message) {
    searchParams.set('message', message);
  }

  if (error) {
    searchParams.set('error', error);
  }

  const query = searchParams.toString();
  return query ? `/lop-vo?${query}` : '/lop-vo';
}

async function loadLopVoList() {
  const { data, error } = await supabase
    .from('lop_vo')
    .select('id, ten_lop, lich_hoc, huan_luyen_vien, ngay_tao, ngay_cap_nhat')
    .order('id', { ascending: true });

  if (error) {
    throw error;
  }

  return data || [];
}

async function loadVoSinhList() {
  const { data, error } = await supabase
    .from('vo_sinh')
    .select('id, ho_ten, gioi_tinh, nam_sinh, so_dien_thoai')
    .order('id', { ascending: true });

  if (error) {
    throw error;
  }

  return data || [];
}

async function loadThanhVienByLop(lopVoId) {
  const { data, error } = await supabase
    .from('vo_sinh_lop')
    .select('id, vo_sinh_id, lop_vo_id, ngay_vao_lop, trang_thai, ngay_cap_nhat, vo_sinh:vo_sinh_id(id, ho_ten, gioi_tinh, nam_sinh, so_dien_thoai)')
    .eq('lop_vo_id', lopVoId)
    .order('id', { ascending: true });

  if (error) {
    throw error;
  }

  return data || [];
}

router.get('/', async function(req, res, next) {
  try {
    const selectedLopVoId = parsePositiveInt(req.query.lop_vo_id);
    const [lopVoList, voSinhList] = await Promise.all([loadLopVoList(), loadVoSinhList()]);

    let thanhVienList = [];
    let selectedLopVo = null;
    let errorMessage = req.query.error || '';

    if (selectedLopVoId) {
      selectedLopVo = lopVoList.find(function(item) {
        return item.id === selectedLopVoId;
      });

      if (!selectedLopVo) {
        errorMessage = errorMessage || 'Không tìm thấy lớp võ';
      } else {
        thanhVienList = await loadThanhVienByLop(selectedLopVoId);
      }
    }

    const thanhVienIds = new Set(
      thanhVienList.map(function(item) {
        return item.vo_sinh_id;
      })
    );

    const voSinhChuaVaoLop = voSinhList.filter(function(item) {
      return !thanhVienIds.has(item.id);
    });

    return res.render('lop-vo', {
      title: 'Quản lý lớp võ',
      activePage: 'lop-vo',
      lopVoList,
      selectedLopVoId: selectedLopVoId || null,
      selectedLopVo,
      voSinhChuaVaoLop,
      thanhVienList,
      message: req.query.message || '',
      errorMessage
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/tao', async function(req, res) {
  try {
    const tenLop = normalizeText(req.body.ten_lop);
    const lichHoc = normalizeText(req.body.lich_hoc);
    const huanLuyenVien = normalizeText(req.body.huan_luyen_vien);

    if (!tenLop) {
      return res.redirect(createRedirectWithMessage('/lop-vo', '', 'Vui lòng nhập tên lớp'));
    }

    const { data, error } = await supabase
      .from('lop_vo')
      .insert({
        ten_lop: tenLop,
        lich_hoc: lichHoc || null,
        huan_luyen_vien: huanLuyenVien || null,
        ngay_cap_nhat: new Date().toISOString()
      })
      .select('id')
      .single();

    if (error) {
      return res.redirect(createRedirectWithMessage('/lop-vo', '', getPublicViewErrorMessage(error, 'Không thể tạo lớp võ lúc này')));
    }

    return res.redirect(buildLopVoPath(data.id, 'Tạo lớp võ thành công', ''));
  } catch (error) {
    return res.redirect(createRedirectWithMessage('/lop-vo', '', getPublicViewErrorMessage(error, 'Không thể tạo lớp võ lúc này')));
  }
});

router.post('/xoa/:id', async function(req, res) {
  try {
    const id = parsePositiveInt(req.params.id);

    if (!id) {
      return res.redirect(createRedirectWithMessage('/lop-vo', '', 'ID lớp võ không hợp lệ'));
    }

    const { error } = await supabase.from('lop_vo').delete().eq('id', id);

    if (error) {
      return res.redirect(createRedirectWithMessage('/lop-vo', '', getPublicViewErrorMessage(error, 'Không thể xóa lớp võ lúc này')));
    }

    return res.redirect(createRedirectWithMessage('/lop-vo', 'Xóa lớp võ thành công', ''));
  } catch (error) {
    return res.redirect(createRedirectWithMessage('/lop-vo', '', getPublicViewErrorMessage(error, 'Không thể xóa lớp võ lúc này')));
  }
});

router.post('/them-vo-sinh', async function(req, res) {
  try {
    const lopVoId = parsePositiveInt(req.body.lop_vo_id);
    const voSinhId = parsePositiveInt(req.body.vo_sinh_id);
    const ngayVaoLop = normalizeText(req.body.ngay_vao_lop) || null;
    const trangThai = normalizeText(req.body.trang_thai) || 'dang_hoc';

    if (!lopVoId || !voSinhId) {
      return res.redirect(buildLopVoPath(lopVoId, '', 'Thiếu lớp võ hoặc võ sinh'));
    }

    const { data: existing, error: existingError } = await supabase
      .from('vo_sinh_lop')
      .select('id')
      .eq('lop_vo_id', lopVoId)
      .eq('vo_sinh_id', voSinhId)
      .maybeSingle();

    if (existingError) {
      return res.redirect(buildLopVoPath(lopVoId, '', getPublicViewErrorMessage(existingError, 'Không thể kiểm tra thành viên lớp lúc này')));
    }

    if (existing) {
      return res.redirect(buildLopVoPath(lopVoId, '', 'Võ sinh đã thuộc lớp này'));
    }

    const { error } = await supabase.from('vo_sinh_lop').insert({
      lop_vo_id: lopVoId,
      vo_sinh_id: voSinhId,
      ngay_vao_lop: ngayVaoLop,
      trang_thai: trangThai,
      ngay_cap_nhat: new Date().toISOString()
    });

    if (error) {
      return res.redirect(buildLopVoPath(lopVoId, '', getPublicViewErrorMessage(error, 'Không thể thêm võ sinh vào lớp lúc này')));
    }

    return res.redirect(buildLopVoPath(lopVoId, 'Thêm võ sinh vào lớp thành công', ''));
  } catch (error) {
    return res.redirect(createRedirectWithMessage('/lop-vo', '', getPublicViewErrorMessage(error, 'Không thể thêm võ sinh vào lớp lúc này')));
  }
});

router.post('/cap-nhat-thanh-vien/:id', async function(req, res) {
  try {
    const relationId = parsePositiveInt(req.params.id);
    const lopVoId = parsePositiveInt(req.body.lop_vo_id);
    const ngayVaoLop = normalizeText(req.body.ngay_vao_lop) || null;
    const trangThai = normalizeText(req.body.trang_thai) || null;

    if (!relationId || !lopVoId) {
      return res.redirect(createRedirectWithMessage('/lop-vo', '', 'Thông tin thành viên không hợp lệ'));
    }

    const { error } = await supabase
      .from('vo_sinh_lop')
      .update({
        ngay_vao_lop: ngayVaoLop,
        trang_thai: trangThai,
        ngay_cap_nhat: new Date().toISOString()
      })
      .eq('id', relationId);

    if (error) {
      return res.redirect(buildLopVoPath(lopVoId, '', getPublicViewErrorMessage(error, 'Không thể cập nhật thành viên lớp lúc này')));
    }

    return res.redirect(buildLopVoPath(lopVoId, 'Cập nhật thành viên lớp thành công', ''));
  } catch (error) {
    return res.redirect(createRedirectWithMessage('/lop-vo', '', getPublicViewErrorMessage(error, 'Không thể cập nhật thành viên lớp lúc này')));
  }
});

router.post('/xoa-thanh-vien/:id', async function(req, res) {
  try {
    const relationId = parsePositiveInt(req.params.id);
    const lopVoId = parsePositiveInt(req.body.lop_vo_id);

    if (!relationId || !lopVoId) {
      return res.redirect(createRedirectWithMessage('/lop-vo', '', 'Thông tin thành viên không hợp lệ'));
    }

    const { error } = await supabase.from('vo_sinh_lop').delete().eq('id', relationId);

    if (error) {
      return res.redirect(buildLopVoPath(lopVoId, '', getPublicViewErrorMessage(error, 'Không thể xóa thành viên khỏi lớp lúc này')));
    }

    return res.redirect(buildLopVoPath(lopVoId, 'Xóa thành viên khỏi lớp thành công', ''));
  } catch (error) {
    return res.redirect(createRedirectWithMessage('/lop-vo', '', getPublicViewErrorMessage(error, 'Không thể xóa thành viên khỏi lớp lúc này')));
  }
});

module.exports = router;
