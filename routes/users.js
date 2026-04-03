const express = require('express');
const bcrypt = require('bcryptjs');

const supabase = require('../config/supabase');

const router = express.Router();

const SUPPORTED_CREATE_ROLES = ['huan_luyen_vien', 'vo_sinh'];

function normalizeText(value) {
  return (value || '').trim();
}

function normalizeUsername(value) {
  return normalizeText(value).toLowerCase();
}

function parsePositiveInt(value) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
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
  return query ? `${path}?${query}` : path;
}

function isValidUsername(value) {
  return /^[a-z0-9._-]{3,50}$/.test(value);
}

function validateCreatePayload(payload) {
  if (!payload.username) {
    return 'Tên đăng nhập là bắt buộc';
  }

  if (!isValidUsername(payload.username)) {
    return 'Tên đăng nhập chỉ gồm chữ thường, số, dấu chấm, gạch dưới hoặc gạch ngang (3-50 ký tự)';
  }

  if (!payload.password || payload.password.length < 6) {
    return 'Mật khẩu tạm phải có ít nhất 6 ký tự';
  }

  if (!SUPPORTED_CREATE_ROLES.includes(payload.role)) {
    return 'Vai trò không hợp lệ';
  }

  if (payload.role === 'vo_sinh' && !payload.voSinhId) {
    return 'Vai trò võ sinh bắt buộc chọn hồ sơ võ sinh';
  }

  if (payload.role !== 'vo_sinh' && payload.voSinhId) {
    return 'Chỉ tài khoản võ sinh mới được liên kết hồ sơ võ sinh';
  }

  return null;
}

async function loadAccountList() {
  const { data, error } = await supabase
    .from('tai_khoan')
    .select('id, ten_dang_nhap, vai_tro, vo_sinh_id, is_active, lan_dang_nhap_cuoi, ngay_tao, vo_sinh:vo_sinh_id(id, ma_vo_sinh, ho_ten)')
    .order('id', { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
}

async function loadVoSinhOptions() {
  const [{ data: voSinhList, error: voSinhError }, { data: linkedRows, error: linkedError }] = await Promise.all([
    supabase.from('vo_sinh').select('id, ma_vo_sinh, ho_ten').order('id', { ascending: true }),
    supabase.from('tai_khoan').select('vo_sinh_id').eq('vai_tro', 'vo_sinh').not('vo_sinh_id', 'is', null)
  ]);

  if (voSinhError || linkedError) {
    throw voSinhError || linkedError;
  }

  const linkedSet = new Set(
    (linkedRows || []).map(function(item) {
      return item.vo_sinh_id;
    })
  );

  return (voSinhList || []).map(function(item) {
    return {
      id: item.id,
      ma_vo_sinh: item.ma_vo_sinh || '',
      ho_ten: item.ho_ten || '',
      isLinked: linkedSet.has(item.id)
    };
  });
}

router.get('/', async function(req, res, next) {
  try {
    const [accountList, voSinhOptions] = await Promise.all([loadAccountList(), loadVoSinhOptions()]);

    return res.render('users', {
      title: 'Quản lý tài khoản',
      activePage: 'users',
      accountList,
      voSinhOptions,
      message: req.query.message || '',
      errorMessage: req.query.error || ''
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/tao-tai-khoan', async function(req, res) {
  try {
    const payload = {
      username: normalizeUsername(req.body.ten_dang_nhap),
      password: normalizeText(req.body.mat_khau_tam),
      role: normalizeText(req.body.vai_tro),
      voSinhId: parsePositiveInt(req.body.vo_sinh_id)
    };

    const validationError = validateCreatePayload(payload);

    if (validationError) {
      return res.redirect(createRedirectWithMessage('/users', '', validationError));
    }

    const { data: existedUsername, error: existedUsernameError } = await supabase
      .from('tai_khoan')
      .select('id')
      .eq('ten_dang_nhap', payload.username)
      .maybeSingle();

    if (existedUsernameError) {
      return res.redirect(createRedirectWithMessage('/users', '', 'Không thể kiểm tra tên đăng nhập'));
    }

    if (existedUsername) {
      return res.redirect(createRedirectWithMessage('/users', '', 'Tên đăng nhập đã tồn tại'));
    }

    if (payload.role === 'vo_sinh') {
      const [{ data: voSinh, error: voSinhError }, { data: linkedAccount, error: linkedError }] = await Promise.all([
        supabase.from('vo_sinh').select('id, ma_vo_sinh, ho_ten').eq('id', payload.voSinhId).maybeSingle(),
        supabase.from('tai_khoan').select('id').eq('vo_sinh_id', payload.voSinhId).maybeSingle()
      ]);

      if (voSinhError || linkedError) {
        return res.redirect(createRedirectWithMessage('/users', '', 'Không thể kiểm tra liên kết hồ sơ võ sinh'));
      }

      if (!voSinh) {
        return res.redirect(createRedirectWithMessage('/users', '', 'Không tìm thấy hồ sơ võ sinh để liên kết'));
      }

      if (linkedAccount) {
        return res.redirect(createRedirectWithMessage('/users', '', 'Hồ sơ võ sinh này đã có tài khoản'));
      }
    }

    const passwordHash = await bcrypt.hash(payload.password, 10);

    const { error: createError } = await supabase.from('tai_khoan').insert({
      ten_dang_nhap: payload.username,
      mat_khau_hash: passwordHash,
      vai_tro: payload.role,
      vo_sinh_id: payload.role === 'vo_sinh' ? payload.voSinhId : null,
      is_active: true,
      must_change_password: true
    });

    if (createError) {
      return res.redirect(createRedirectWithMessage('/users', '', 'Không thể tạo tài khoản mới'));
    }

    return res.redirect(createRedirectWithMessage('/users', 'Tạo tài khoản thành công', ''));
  } catch (error) {
    return res.redirect(createRedirectWithMessage('/users', '', 'Không thể tạo tài khoản lúc này'));
  }
});

router.post('/toggle-active/:id', async function(req, res) {
  try {
    const accountId = parsePositiveInt(req.params.id);

    if (!accountId) {
      return res.redirect(createRedirectWithMessage('/users', '', 'ID tài khoản không hợp lệ'));
    }

    const { data: account, error: accountError } = await supabase
      .from('tai_khoan')
      .select('id, ten_dang_nhap, is_active, vai_tro')
      .eq('id', accountId)
      .maybeSingle();

    if (accountError || !account) {
      return res.redirect(createRedirectWithMessage('/users', '', 'Không tìm thấy tài khoản'));
    }

    if (account.ten_dang_nhap === 'admin') {
      return res.redirect(createRedirectWithMessage('/users', '', 'Không thể khóa tài khoản admin gốc'));
    }

    const nextActive = !account.is_active;

    const { error: updateError } = await supabase
      .from('tai_khoan')
      .update({
        is_active: nextActive,
        ngay_cap_nhat: new Date().toISOString()
      })
      .eq('id', account.id);

    if (updateError) {
      return res.redirect(createRedirectWithMessage('/users', '', 'Không thể cập nhật trạng thái tài khoản'));
    }

    return res.redirect(
      createRedirectWithMessage('/users', nextActive ? 'Đã mở khóa tài khoản' : 'Đã khóa tài khoản', '')
    );
  } catch (error) {
    return res.redirect(createRedirectWithMessage('/users', '', 'Không thể cập nhật trạng thái tài khoản'));
  }
});

module.exports = router;
