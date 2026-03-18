var express = require('express');
var supabase = require('../config/supabase');

var router = express.Router();

router.get('/', async function(req, res, next) {
  try {
    const [
      { count: bacDaiCount, error: countError },
      { data: latestBacDai, error: latestError },
      { count: voSinhCount, error: voSinhCountError },
      { data: latestVoSinh, error: latestVoSinhError }
    ] = await Promise.all([
      supabase.from('bac_dai').select('*', { count: 'exact', head: true }),
      supabase
        .from('bac_dai')
        .select('id, ten_bac_dai, mo_ta, ngay_tao, ngay_cap_nhat')
        .order('ngay_tao', { ascending: false })
        .limit(5),
      supabase.from('vo_sinh').select('*', { count: 'exact', head: true }),
      supabase.from('vo_sinh').select('id, ngay_cap_nhat').order('ngay_cap_nhat', { ascending: false }).limit(1)
    ]);

    if (countError) {
      throw countError;
    }

    if (latestError) {
      throw latestError;
    }

    if (voSinhCountError) {
      throw voSinhCountError;
    }

    if (latestVoSinhError) {
      throw latestVoSinhError;
    }

    const latestBacDaiUpdatedAt =
      latestBacDai && latestBacDai.length && latestBacDai[0].ngay_cap_nhat
        ? latestBacDai[0].ngay_cap_nhat
        : null;
    const latestVoSinhUpdatedAt =
      latestVoSinh && latestVoSinh.length && latestVoSinh[0].ngay_cap_nhat
        ? latestVoSinh[0].ngay_cap_nhat
        : null;
    const latestUpdatedAt = [latestBacDaiUpdatedAt, latestVoSinhUpdatedAt]
      .filter(Boolean)
      .sort(function(a, b) {
        return new Date(b) - new Date(a);
      })[0] || null;

    res.render('index', {
      title: 'Bảng điều khiển',
      activePage: 'dashboard',
      stats: {
        totalBacDai: bacDaiCount || 0,
        totalVoSinh: voSinhCount || 0,
        latestUpdatedAt,
        moduleCount: 2
      },
      latestBacDai: latestBacDai || [],
      quickLinks: [
        {
          title: 'Quản lý bậc đai',
          description: 'Thêm, sửa, xoá và theo dõi danh sách bậc đai.',
          href: '/bac-dai',
          action: 'Mở danh sách'
        },
        {
          title: 'Thêm bậc đai mới',
          description: 'Đi tới form tạo mới để bổ sung dữ liệu nhanh.',
          href: '/bac-dai',
          action: 'Tạo dữ liệu'
        },
        {
          title: 'Quản lý võ sinh',
          description: 'Quản lý hồ sơ võ sinh, liên hệ và bậc đai hiện tại.',
          href: '/vo-sinh',
          action: 'Mở danh sách'
        }
      ]
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
