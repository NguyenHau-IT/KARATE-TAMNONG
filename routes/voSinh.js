const express = require('express');
const multer = require('multer');
const { parse } = require('csv-parse/sync');

const supabase = require('../config/supabase');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024
  }
});

function parseId(value) {
  const id = Number.parseInt(value, 10);
  return Number.isNaN(id) ? null : id;
}

function normalizeText(value) {
  return (value || '').trim();
}

function normalizeHeaderKey(value) {
  return normalizeText(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function normalizeOptionalNumber(value) {
  const normalized = normalizeText(value);

  if (!normalized) {
    return null;
  }

  const number = Number.parseInt(normalized, 10);
  return Number.isNaN(number) ? NaN : number;
}

function normalizeOptionalYear(value) {
  const normalized = normalizeText(value);

  if (!normalized) {
    return null;
  }

  const year = Number.parseInt(normalized, 10);
  return Number.isNaN(year) ? NaN : year;
}

function normalizeMaVoSinh(value) {
  return normalizeText(value).toUpperCase();
}

function isValidMaVoSinh(value) {
  return /^K\d{2}-\d{5}$/.test(value);
}

function buildMaVoSinhPrefix(year) {
  const yy = String(year).slice(-2);
  return `K${yy}-`;
}

function extractSequenceFromMa(maVoSinh, prefix) {
  if (!maVoSinh || !prefix || !maVoSinh.startsWith(prefix)) {
    return null;
  }

  const raw = maVoSinh.slice(prefix.length);
  const parsed = Number.parseInt(raw, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

async function getNextMaVoSinhByYear(khoaNhapHoc) {
  const safeYear = khoaNhapHoc || new Date().getFullYear();
  const prefix = buildMaVoSinhPrefix(safeYear);

  const { data, error } = await supabase
    .from('vo_sinh')
    .select('ma_vo_sinh')
    .ilike('ma_vo_sinh', `${prefix}%`)
    .order('ma_vo_sinh', { ascending: false })
    .limit(1);

  if (error) {
    throw error;
  }

  const latest = data && data.length ? normalizeMaVoSinh(data[0].ma_vo_sinh) : null;
  const latestSequence = extractSequenceFromMa(latest, prefix) || 0;
  const nextSequence = latestSequence + 1;

  return `${prefix}${String(nextSequence).padStart(5, '0')}`;
}

function normalizePayload(body) {
  return {
    maVoSinh: normalizeMaVoSinh(body.ma_vo_sinh),
    khoaNhapHoc: normalizeOptionalYear(body.khoa_nhap_hoc),
    hoTen: normalizeText(body.ho_ten),
    gioiTinh: normalizeText(body.gioi_tinh),
    namSinh: normalizeOptionalNumber(body.nam_sinh),
    diaChi: normalizeText(body.dia_chi),
    bacDaiId: normalizeOptionalNumber(body.bac_dai_id),
    soDienThoai: normalizeText(body.so_dien_thoai),
    hoTenPhuHuynh: normalizeText(body.ho_ten_phu_huynh),
    soDienThoaiPhuHuynh: normalizeText(body.so_dien_thoai_phu_huynh)
  };
}

function getCsvValue(row, aliases) {
  for (let index = 0; index < aliases.length; index += 1) {
    const key = aliases[index];

    if (Object.prototype.hasOwnProperty.call(row, key)) {
      return row[key];
    }
  }

  return '';
}

function parseCsvRows(csvContent) {
  const firstLine = String(csvContent || '').split(/\r?\n/, 1)[0] || '';
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const delimiter = semicolonCount > commaCount ? ';' : ',';

  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
    delimiter,
    relax_column_count: true
  });

  return (records || []).map(function(row) {
    return Object.keys(row || {}).reduce(function(acc, key) {
      const normalizedKey = normalizeHeaderKey(key);

      if (normalizedKey) {
        acc[normalizedKey] = row[key];
      }

      return acc;
    }, {});
  });
}

function toInsertRow(payload) {
  return {
    ma_vo_sinh: payload.maVoSinh,
    ho_ten: payload.hoTen,
    gioi_tinh: payload.gioiTinh || null,
    nam_sinh: payload.namSinh,
    dia_chi: payload.diaChi || null,
    bac_dai_id: payload.bacDaiId,
    so_dien_thoai: payload.soDienThoai || null,
    ho_ten_phu_huynh: payload.hoTenPhuHuynh || null,
    so_dien_thoai_phu_huynh: payload.soDienThoaiPhuHuynh || null
  };
}

function chunkArray(items, size) {
  const chunks = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

function validatePayload(payload) {
  if (payload.maVoSinh && !isValidMaVoSinh(payload.maVoSinh)) {
    return "Mã võ sinh không hợp lệ (định dạng đúng: K26-00001)";
  }

  if (Number.isNaN(payload.khoaNhapHoc)) {
    return 'Khóa nhập học không hợp lệ';
  }

  if (payload.khoaNhapHoc !== null && (payload.khoaNhapHoc < 2000 || payload.khoaNhapHoc > 2100)) {
    return 'Khóa nhập học phải nằm trong khoảng 2000-2100';
  }

  if (!payload.hoTen) {
    return 'Vui lòng nhập họ tên võ sinh';
  }

  if (Number.isNaN(payload.namSinh)) {
    return 'Năm sinh không hợp lệ';
  }

  if (Number.isNaN(payload.bacDaiId)) {
    return 'Bậc đai không hợp lệ';
  }

  if (payload.namSinh !== null) {
    const currentYear = new Date().getFullYear();

    if (payload.namSinh < 1900 || payload.namSinh > currentYear) {
      return 'Năm sinh không hợp lệ';
    }
  }

  return null;
}

async function loadBacDaiList() {
  const { data, error } = await supabase
    .from('bac_dai')
    .select('id, ten_bac_dai')
    .order('id', { ascending: true });

  if (error) {
    throw error;
  }

  return data || [];
}

async function loadVoSinhList() {
  const { data, error } = await supabase
    .from('vo_sinh')
    .select('*')
    .order('id', { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
}

router.get('/', async function(req, res, next) {
  try {
    const [voSinhList, bacDaiList] = await Promise.all([loadVoSinhList(), loadBacDaiList()]);

    res.render('vo-sinh', {
      title: 'Quản lý võ sinh',
      voSinhList,
      bacDaiList,
      message: req.query.message || '',
      errorMessage: req.query.error || ''
    });
  } catch (error) {
    next(error);
  }
});

router.post('/import-csv', function(req, res) {
  upload.single('csv_file')(req, res, async function(uploadError) {
    try {
      if (uploadError) {
        return res.redirect(`/vo-sinh?error=${encodeURIComponent('Upload file thất bại hoặc file quá lớn (tối đa 2MB)')}`);
      }

      if (!req.file || !req.file.buffer) {
        return res.redirect(`/vo-sinh?error=${encodeURIComponent('Vui lòng chọn file CSV')}`);
      }

      const csvText = req.file.buffer.toString('utf8');
      const rows = parseCsvRows(csvText);

      if (!rows.length) {
        return res.redirect(`/vo-sinh?error=${encodeURIComponent('File CSV không có dữ liệu hợp lệ')}`);
      }

      const bacDaiList = await loadBacDaiList();
      const bacDaiByName = bacDaiList.reduce(function(acc, item) {
        acc[normalizeHeaderKey(item.ten_bac_dai)] = item.id;
        return acc;
      }, {});
      const bacDaiIdSet = new Set(
        bacDaiList.map(function(item) {
          return item.id;
        })
      );

      const insertRows = [];
      const errors = [];
      const warnings = [];
      const sequenceCacheByYear = {};

      for (let index = 0; index < rows.length; index += 1) {
        const row = rows[index];
        const bacDaiIdCell = normalizeText(
          getCsvValue(row, ['bac_dai_id', 'bac_daiid', 'bac_dai_ma', 'bac_dai'])
        );
        const bacDaiIdRaw = normalizeOptionalNumber(
          getCsvValue(row, ['bac_dai_id', 'bac_daiid', 'bac_dai_ma', 'bac_dai'])
        );
        const bacDaiName = normalizeText(getCsvValue(row, ['ten_bac_dai', 'bac_dai_ten', 'bac_dai_name']));

        let bacDaiId = bacDaiIdRaw;

        if (bacDaiId === null && bacDaiName) {
          bacDaiId = bacDaiByName[normalizeHeaderKey(bacDaiName)] || NaN;
        }

        if (Number.isNaN(bacDaiId) && bacDaiIdCell) {
          const mappedFromCell = bacDaiByName[normalizeHeaderKey(bacDaiIdCell)] || null;
          bacDaiId = mappedFromCell;
        }

        if (bacDaiId !== null && !Number.isNaN(bacDaiId) && !bacDaiIdSet.has(bacDaiId)) {
          warnings.push(`Dòng ${index + 2}: bac_dai_id=${bacDaiId} không tồn tại, hệ thống gán rỗng`);
          bacDaiId = null;
        }

        if (Number.isNaN(bacDaiId)) {
          warnings.push(`Dòng ${index + 2}: không map được bậc đai, hệ thống gán rỗng`);
          bacDaiId = null;
        }

        const khoaNhapHoc = normalizeOptionalYear(
          getCsvValue(row, ['khoa_nhap_hoc', 'khoa', 'nien_khoa'])
        );
        const safeKhoa = Number.isNaN(khoaNhapHoc) || !khoaNhapHoc ? new Date().getFullYear() : khoaNhapHoc;
        const maVoSinhRaw = normalizeMaVoSinh(getCsvValue(row, ['ma_vo_sinh', 'ma_hoc_vien', 'student_code']));

        let maVoSinh = maVoSinhRaw;

        if (!maVoSinh) {
          if (!Object.prototype.hasOwnProperty.call(sequenceCacheByYear, safeKhoa)) {
            const nextCode = await getNextMaVoSinhByYear(safeKhoa);
            const prefix = buildMaVoSinhPrefix(safeKhoa);
            sequenceCacheByYear[safeKhoa] = extractSequenceFromMa(nextCode, prefix) || 1;
          }

          const prefix = buildMaVoSinhPrefix(safeKhoa);
          maVoSinh = `${prefix}${String(sequenceCacheByYear[safeKhoa]).padStart(5, '0')}`;
          sequenceCacheByYear[safeKhoa] += 1;
        }

        const payload = {
          maVoSinh,
          khoaNhapHoc: safeKhoa,
          hoTen: normalizeText(getCsvValue(row, ['ho_ten', 'hoten', 'ten_vo_sinh', 'ten'])),
          gioiTinh: normalizeText(getCsvValue(row, ['gioi_tinh', 'gioitinh', 'gender'])),
          namSinh: normalizeOptionalNumber(getCsvValue(row, ['nam_sinh', 'namsinh', 'year_of_birth'])),
          diaChi: normalizeText(getCsvValue(row, ['dia_chi', 'diachi', 'address'])),
          bacDaiId,
          soDienThoai: normalizeText(getCsvValue(row, ['so_dien_thoai', 'sdt', 'phone'])),
          hoTenPhuHuynh: normalizeText(getCsvValue(row, ['ho_ten_phu_huynh', 'ten_phu_huynh', 'phu_huynh'])),
          soDienThoaiPhuHuynh: normalizeText(
            getCsvValue(row, ['so_dien_thoai_phu_huynh', 'sdt_phu_huynh', 'phone_parent'])
          )
        };

        const validationError = validatePayload(payload);

        if (validationError) {
          errors.push(`Dòng ${index + 2}: ${validationError}`);
          continue;
        }

        insertRows.push(toInsertRow(payload));
      }

      if (!insertRows.length) {
        const reason = errors[0] || 'Không có dòng hợp lệ để import';
        return res.redirect(`/vo-sinh?error=${encodeURIComponent(reason)}`);
      }

      const chunks = chunkArray(insertRows, 200);

      for (let index = 0; index < chunks.length; index += 1) {
        const { error } = await supabase.from('vo_sinh').insert(chunks[index]);

        if (error) {
          return res.redirect(`/vo-sinh?error=${encodeURIComponent(`Import thất bại: ${error.message}`)}`);
        }
      }

      const summary = [
        `Import thành công ${insertRows.length} võ sinh`,
        errors.length ? `(bỏ qua ${errors.length} dòng lỗi)` : '',
        warnings.length ? `(gán rỗng bậc đai cho ${warnings.length} dòng)` : ''
      ]
        .filter(Boolean)
        .join(' ');

      return res.redirect(`/vo-sinh?message=${encodeURIComponent(summary)}`);
    } catch (error) {
      return res.redirect(`/vo-sinh?error=${encodeURIComponent(error.message)}`);
    }
  });
});

router.post('/api', async function(req, res) {
  try {
    const payload = normalizePayload(req.body);
    const validationError = validatePayload(payload);

    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

      if (!payload.maVoSinh) {
        payload.maVoSinh = await getNextMaVoSinhByYear(payload.khoaNhapHoc || new Date().getFullYear());
      }

    const { data, error } = await supabase
      .from('vo_sinh')
      .insert({
          ma_vo_sinh: payload.maVoSinh,
        ho_ten: payload.hoTen,
        gioi_tinh: payload.gioiTinh || null,
        nam_sinh: payload.namSinh,
        dia_chi: payload.diaChi || null,
        bac_dai_id: payload.bacDaiId,
        so_dien_thoai: payload.soDienThoai || null,
        ho_ten_phu_huynh: payload.hoTenPhuHuynh || null,
        so_dien_thoai_phu_huynh: payload.soDienThoaiPhuHuynh || null
      })
      .select('*')
      .single();

    if (error) {
      return res.status(400).json({ message: error.message });
    }

    return res.json({
      message: 'Thêm võ sinh thành công',
      item: data
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.put('/api/:id', async function(req, res) {
  try {
    const id = parseId(req.params.id);
    const payload = normalizePayload(req.body);

    if (!id) {
      return res.status(400).json({ message: 'ID không hợp lệ' });
    }

    const validationError = validatePayload(payload);

    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    if (!payload.maVoSinh) {
      payload.maVoSinh = await getNextMaVoSinhByYear(payload.khoaNhapHoc || new Date().getFullYear());
    }

    const { data, error } = await supabase
      .from('vo_sinh')
      .update({
        ma_vo_sinh: payload.maVoSinh,
        ho_ten: payload.hoTen,
        gioi_tinh: payload.gioiTinh || null,
        nam_sinh: payload.namSinh,
        dia_chi: payload.diaChi || null,
        bac_dai_id: payload.bacDaiId,
        so_dien_thoai: payload.soDienThoai || null,
        ho_ten_phu_huynh: payload.hoTenPhuHuynh || null,
        so_dien_thoai_phu_huynh: payload.soDienThoaiPhuHuynh || null,
        ngay_cap_nhat: new Date().toISOString()
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      return res.status(400).json({ message: error.message });
    }

    return res.json({
      message: 'Cập nhật võ sinh thành công',
      item: data
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.delete('/api/:id', async function(req, res) {
  try {
    const id = parseId(req.params.id);

    if (!id) {
      return res.status(400).json({ message: 'ID không hợp lệ' });
    }

    const { error } = await supabase.from('vo_sinh').delete().eq('id', id);

    if (error) {
      return res.status(400).json({ message: error.message });
    }

    return res.json({
      message: 'Xóa võ sinh thành công',
      id
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

module.exports = router;
