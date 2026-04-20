const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

dotenv.config();

const REQUIRED_ENV = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'AUTH_JWT_SECRET',
  'AUTH_ACCESS_COOKIE_NAME',
  'AUTH_REFRESH_COOKIE_NAME'
];

function printHeader(title) {
  console.log(`\n=== ${title} ===`);
}

function fail(message) {
  console.error(`❌ ${message}`);
}

function pass(message) {
  console.log(`✅ ${message}`);
}

function warn(message) {
  console.warn(`⚠️  ${message}`);
}

function checkEnv() {
  printHeader('Kiểm tra biến môi trường bắt buộc');

  const missing = REQUIRED_ENV.filter((key) => !process.env[key] || !String(process.env[key]).trim());

  if (missing.length) {
    missing.forEach((key) => fail(`Thiếu env: ${key}`));
    return false;
  }

  pass('Đã có đủ env bắt buộc');
  return true;
}

function checkSqlFileExists() {
  printHeader('Kiểm tra migration QR session');

  const sqlPath = path.join(process.cwd(), 'sql', '009_attendance_qr_session.sql');

  if (!fs.existsSync(sqlPath)) {
    fail('Không tìm thấy file sql/009_attendance_qr_session.sql');
    return false;
  }

  pass('Tìm thấy sql/009_attendance_qr_session.sql');
  return true;
}

async function checkSupabaseTable() {
  printHeader('Kiểm tra bảng attendance_qr_session trên Supabase');

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    fail('Không thể kiểm tra Supabase vì thiếu SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY');
    return false;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const { error } = await supabase
    .from('attendance_qr_session')
    .select('id', { head: true, count: 'exact' });

  if (error) {
    fail(`Không truy cập được bảng attendance_qr_session: ${error.message}`);
    return false;
  }

  pass('Bảng attendance_qr_session đã sẵn sàng');
  return true;
}

function checkRouteAliasConfig() {
  printHeader('Kiểm tra cấu hình route QR-only');

  const appPath = path.join(process.cwd(), 'app.js');

  if (!fs.existsSync(appPath)) {
    fail('Không tìm thấy app.js');
    return false;
  }

  const appContent = fs.readFileSync(appPath, 'utf8');

  const hasCheckIn = appContent.includes("app.use('/check-in'");
  const hasCheckInPinAlias = appContent.includes("app.use('/check-in-pin'");

  if (!hasCheckIn) {
    fail('Thiếu mount route /check-in trong app.js');
    return false;
  }

  if (!hasCheckInPinAlias) {
    warn('Không thấy alias /check-in-pin trong app.js. Nếu chủ động xóa alias thì có thể bỏ qua cảnh báo này.');
  } else {
    pass('Đã có alias /check-in-pin để redirect an toàn');
  }

  pass('Route /check-in đã được mount');
  return true;
}

async function main() {
  const results = [];

  results.push(checkEnv());
  results.push(checkSqlFileExists());
  results.push(checkRouteAliasConfig());

  const envReady = results.every(Boolean);

  if (envReady) {
    results.push(await checkSupabaseTable());
  } else {
    warn('Bỏ qua kiểm tra Supabase vì các bước nền chưa đạt');
  }

  const ok = results.every(Boolean);

  printHeader('Kết luận');

  if (!ok) {
    fail('Pre-deploy check chưa đạt. Vui lòng xử lý các mục ❌ trước khi deploy.');
    process.exitCode = 1;
    return;
  }

  pass('Pre-deploy check đạt. Có thể chuyển sang deploy staging.');
}

main().catch((error) => {
  fail(`Lỗi ngoài dự kiến: ${error.message}`);
  process.exitCode = 1;
});
