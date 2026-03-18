var express = require('express');
var supabase = require('../config/supabase');

var router = express.Router();

router.get('/', async function(req, res, next) {
  try {
    const [{ count, error: countError }, { data: latestBacDai, error: latestError }] = await Promise.all([
      supabase.from('bac_dai').select('*', { count: 'exact', head: true }),
      supabase
        .from('bac_dai')
        .select('id, ten_bac_dai, mo_ta, ngay_tao, ngay_cap_nhat')
        .order('ngay_tao', { ascending: false })
        .limit(5)
    ]);

    if (countError) {
      throw countError;
    }

    if (latestError) {
      throw latestError;
    }

    res.render('index', {
      title: 'Bảng điều khiển',
      activePage: 'dashboard',
      stats: {
        totalBacDai: count || 0,
        latestUpdatedAt:
          latestBacDai && latestBacDai.length && latestBacDai[0].ngay_cap_nhat
            ? latestBacDai[0].ngay_cap_nhat
            : null,
        moduleCount: 1
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
        }
      ]
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
