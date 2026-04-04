function normalizeCode(error) {
  return String((error && error.code) || '').trim();
}

function getPublicApiErrorMessage(error, fallbackMessage) {
  const code = normalizeCode(error);

  if (code === '23505') {
    return 'Dữ liệu bị trùng, vui lòng kiểm tra lại';
  }

  if (code === '23503') {
    return 'Dữ liệu liên kết không hợp lệ';
  }

  if (code === '22P02') {
    return 'Dữ liệu đầu vào không hợp lệ';
  }

  return fallbackMessage || 'Không thể xử lý yêu cầu lúc này';
}

function getPublicViewErrorMessage(error, fallbackMessage) {
  return getPublicApiErrorMessage(error, fallbackMessage || 'Có lỗi xảy ra, vui lòng thử lại sau');
}

module.exports = {
  getPublicApiErrorMessage,
  getPublicViewErrorMessage
};
