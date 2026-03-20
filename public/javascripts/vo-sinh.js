(function() {
  const form = document.getElementById('voSinhForm');
  const formTitle = document.getElementById('voSinhFormTitle');
  const submitButton = document.getElementById('voSinhSubmitButton');
  const cancelEditButton = document.getElementById('cancelVoSinhEditButton');
  const editingIdInput = document.getElementById('vo_sinh_editing_id');
  const tableBody = document.getElementById('voSinhTableBody');
  const emptyState = document.getElementById('voSinhEmptyState');
  const counter = document.getElementById('voSinhCounter');
  const flash = window.__VO_SINH_FLASH__ || {};
  const initialItems = Array.isArray(window.__VO_SINH_DATA__) ? window.__VO_SINH_DATA__ : [];
  const bacDaiOptions = Array.isArray(window.__BAC_DAI_OPTIONS__) ? window.__BAC_DAI_OPTIONS__ : [];

  if (!form || !tableBody) {
    return;
  }

  const fields = {
    hoTen: document.getElementById('ho_ten'),
    gioiTinh: document.getElementById('gioi_tinh'),
    namSinh: document.getElementById('nam_sinh'),
    diaChi: document.getElementById('dia_chi'),
    bacDaiId: document.getElementById('bac_dai_id'),
    soDienThoai: document.getElementById('so_dien_thoai'),
    hoTenPhuHuynh: document.getElementById('ho_ten_phu_huynh'),
    soDienThoaiPhuHuynh: document.getElementById('so_dien_thoai_phu_huynh')
  };

  const dateFormatter = new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'medium'
  });

  function getSwal() {
    return window.Swal && typeof window.Swal.fire === 'function' ? window.Swal : null;
  }

  function showToast(message, icon) {
    if (!message) {
      return Promise.resolve();
    }

    const swal = getSwal();

    if (!swal) {
      window.alert(message);
      return Promise.resolve();
    }

    return swal.fire({
      toast: true,
      position: 'top-end',
      icon: icon,
      title: message,
      showConfirmButton: false,
      timer: 2500,
      timerProgressBar: true
    });
  }

  async function confirmDelete() {
    const swal = getSwal();

    if (!swal) {
      return window.confirm('Xóa võ sinh này?');
    }

    const result = await swal.fire({
      title: 'Xóa võ sinh?',
      text: 'Dữ liệu đã xóa sẽ không thể khôi phục.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Xóa',
      cancelButtonText: 'Hủy',
      reverseButtons: true
    });

    return result.isConfirmed;
  }

  function formatDate(value) {
    return value ? dateFormatter.format(new Date(value)) : '';
  }

  function getBacDaiLabel(id) {
    const numericId = Number.parseInt(id, 10);

    if (Number.isNaN(numericId)) {
      return 'Chưa phân bậc đai';
    }

    const item = bacDaiOptions.find(function(option) {
      return option.id === numericId;
    });

    return item ? item.ten_bac_dai : 'Chưa phân bậc đai';
  }

  function resetForm() {
    form.reset();
    editingIdInput.value = '';
    formTitle.textContent = 'Thêm võ sinh mới';
    submitButton.textContent = 'Thêm võ sinh';
    cancelEditButton.classList.add('d-none');
    fields.hoTen.focus();
  }

  function setEditMode(item) {
    editingIdInput.value = item.id;
    fields.hoTen.value = item.ho_ten || '';
    fields.gioiTinh.value = item.gioi_tinh || '';
    fields.namSinh.value = item.nam_sinh || '';
    fields.diaChi.value = item.dia_chi || '';
    fields.bacDaiId.value = item.bac_dai_id || '';
    fields.soDienThoai.value = item.so_dien_thoai || '';
    fields.hoTenPhuHuynh.value = item.ho_ten_phu_huynh || '';
    fields.soDienThoaiPhuHuynh.value = item.so_dien_thoai_phu_huynh || '';
    formTitle.textContent = 'Cập nhật võ sinh';
    submitButton.textContent = 'Lưu thay đổi';
    cancelEditButton.classList.remove('d-none');
    fields.hoTen.focus();
  }

  function syncEmptyState() {
    const hasRows = tableBody.querySelector('tr') !== null;
    emptyState.classList.toggle('d-none', hasRows);
  }

  function updateCounter() {
    counter.textContent = `${tableBody.querySelectorAll('tr').length} mục`;
  }

  function createActionButton(label, className, action, itemId) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = className;
    button.dataset.action = action;
    button.dataset.id = itemId;
    button.textContent = label;
    return button;
  }

  function buildRow(item) {
    const row = document.createElement('tr');
    row.dataset.id = item.id;

    const values = [
      String(item.id),
      item.ho_ten,
      item.gioi_tinh || 'Chưa cập nhật',
      item.nam_sinh || '',
      getBacDaiLabel(item.bac_dai_id),
      item.so_dien_thoai || 'Chưa có',
      '',
      item.dia_chi || 'Chưa có',
      formatDate(item.ngay_cap_nhat)
    ];

    values.forEach(function(value, index) {
      const cell = document.createElement('td');

      if (index === 1) {
        cell.className = 'fw-semibold';
      }

      if (index === 6) {
        const parentName = document.createElement('div');
        parentName.textContent = item.ho_ten_phu_huynh || 'Chưa có';
        const parentPhone = document.createElement('div');
        parentPhone.className = 'text-secondary small';
        parentPhone.textContent = item.so_dien_thoai_phu_huynh || '';
        cell.appendChild(parentName);
        cell.appendChild(parentPhone);
      } else {
        cell.textContent = value;
      }

      row.appendChild(cell);
    });

    const actionCell = document.createElement('td');
    const actionWrap = document.createElement('div');
    actionWrap.className = 'd-flex flex-wrap gap-2';
    actionWrap.appendChild(createActionButton('Sửa', 'btn btn-sm btn-outline-primary', 'edit', item.id));
    actionWrap.appendChild(createActionButton('Xóa', 'btn btn-sm btn-outline-danger', 'delete', item.id));
    actionCell.appendChild(actionWrap);
    row.appendChild(actionCell);

    row._item = item;

    return row;
  }

  function upsertRow(item) {
    const existingRow = tableBody.querySelector(`tr[data-id="${item.id}"]`);
    const newRow = buildRow(item);

    if (existingRow) {
      existingRow.replaceWith(newRow);
    } else {
      tableBody.prepend(newRow);
    }

    syncEmptyState();
    updateCounter();
  }

  function removeRow(id) {
    const row = tableBody.querySelector(`tr[data-id="${id}"]`);

    if (row) {
      row.remove();
    }

    syncEmptyState();
    updateCounter();
  }

  function getItemFromRow(button) {
    const row = button.closest('tr');
    return row ? row._item : null;
  }

  function hydrateInitialRows() {
    initialItems.forEach(function(item) {
      const row = tableBody.querySelector(`tr[data-id="${item.id}"]`);
      if (row) {
        row._item = item;
      }
    });
  }

  async function request(url, options) {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      ...options
    });

    const payload = await response.json().catch(function() {
      return { message: 'Không đọc được phản hồi từ máy chủ' };
    });

    if (!response.ok) {
      throw new Error(payload.message || 'Yêu cầu thất bại');
    }

    return payload;
  }

  form.addEventListener('submit', async function(event) {
    event.preventDefault();

    const editingId = editingIdInput.value;
    const body = {
      ho_ten: fields.hoTen.value,
      gioi_tinh: fields.gioiTinh.value,
      nam_sinh: fields.namSinh.value,
      dia_chi: fields.diaChi.value,
      bac_dai_id: fields.bacDaiId.value,
      so_dien_thoai: fields.soDienThoai.value,
      ho_ten_phu_huynh: fields.hoTenPhuHuynh.value,
      so_dien_thoai_phu_huynh: fields.soDienThoaiPhuHuynh.value
    };

    submitButton.disabled = true;
    cancelEditButton.disabled = true;

    try {
      const result = await request(
        editingId ? `/vo-sinh/api/${editingId}` : '/vo-sinh/api',
        {
          method: editingId ? 'PUT' : 'POST',
          body: JSON.stringify(body)
        }
      );

      upsertRow(result.item);
      resetForm();
      await showToast(result.message, 'success');
    } catch (error) {
      await showToast(error.message, 'error');
    } finally {
      submitButton.disabled = false;
      cancelEditButton.disabled = false;
    }
  });

  cancelEditButton.addEventListener('click', function() {
    resetForm();
  });

  tableBody.addEventListener('click', async function(event) {
    const button = event.target.closest('button[data-action]');

    if (!button) {
      return;
    }

    const item = getItemFromRow(button);

    if (!item) {
      return;
    }

    if (button.dataset.action === 'edit') {
      setEditMode(item);
      return;
    }

    if (button.dataset.action !== 'delete') {
      return;
    }

    const confirmed = await confirmDelete();

    if (!confirmed) {
      return;
    }

    button.disabled = true;

    try {
      const result = await request(`/vo-sinh/api/${item.id}`, {
        method: 'DELETE'
      });

      removeRow(item.id);

      if (editingIdInput.value === String(item.id)) {
        resetForm();
      }

      await showToast(result.message, 'success');
    } catch (error) {
      await showToast(error.message, 'error');
    } finally {
      button.disabled = false;
    }
  });

  hydrateInitialRows();
  syncEmptyState();
  updateCounter();

  if (flash.message) {
    showToast(flash.message, 'success');
  }

  if (flash.errorMessage) {
    showToast(flash.errorMessage, 'error');
  }
})();
