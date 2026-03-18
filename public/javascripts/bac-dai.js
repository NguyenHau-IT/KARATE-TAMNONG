(function() {
  const form = document.getElementById('bacDaiForm');
  const formTitle = document.getElementById('bacDaiFormTitle');
  const submitButton = document.getElementById('submitButton');
  const cancelEditButton = document.getElementById('cancelEditButton');
  const tenBacDaiInput = document.getElementById('ten_bac_dai');
  const moTaInput = document.getElementById('mo_ta');
  const editingIdInput = document.getElementById('editing_id');
  const tableBody = document.getElementById('bacDaiTableBody');
  const emptyState = document.getElementById('emptyState');
  const counter = document.getElementById('bacDaiCounter');
  const initialItems = Array.isArray(window.__BAC_DAI_DATA__) ? window.__BAC_DAI_DATA__ : [];
  const flash = window.__BAC_DAI_FLASH__ || {};

  if (!form || !tableBody) {
    return;
  }

  const dateFormatter = new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'medium'
  });

  function formatDate(value) {
    return value ? dateFormatter.format(new Date(value)) : '';
  }

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
      return window.confirm('Xóa bậc đai này?');
    }

    const result = await swal.fire({
      title: 'Xóa bậc đai?',
      text: 'Dữ liệu đã xóa sẽ không thể khôi phục.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Xóa',
      cancelButtonText: 'Hủy',
      reverseButtons: true
    });

    return result.isConfirmed;
  }

  function resetForm() {
    form.reset();
    editingIdInput.value = '';
    formTitle.textContent = 'Thêm bậc đai mới';
    submitButton.textContent = 'Thêm bậc đai';
    cancelEditButton.classList.add('d-none');
    tenBacDaiInput.focus();
  }

  function setEditMode(item) {
    editingIdInput.value = item.id;
    tenBacDaiInput.value = item.ten_bac_dai || '';
    moTaInput.value = item.mo_ta || '';
    formTitle.textContent = 'Cập nhật bậc đai';
    submitButton.textContent = 'Lưu thay đổi';
    cancelEditButton.classList.remove('d-none');
    tenBacDaiInput.focus();
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

    const idCell = document.createElement('td');
    idCell.textContent = item.id;

    const tenCell = document.createElement('td');
    tenCell.className = 'fw-semibold';
    tenCell.textContent = item.ten_bac_dai;

    const moTaCell = document.createElement('td');
    moTaCell.textContent = item.mo_ta || 'Chưa có mô tả';

    const ngayTaoCell = document.createElement('td');
    ngayTaoCell.textContent = formatDate(item.ngay_tao);

    const ngayCapNhatCell = document.createElement('td');
    ngayCapNhatCell.textContent = formatDate(item.ngay_cap_nhat);

    const actionCell = document.createElement('td');
    const actionWrap = document.createElement('div');
    actionWrap.className = 'd-flex flex-wrap gap-2';
    actionWrap.appendChild(createActionButton('Sửa', 'btn btn-sm btn-outline-primary', 'edit', item.id));
    actionWrap.appendChild(createActionButton('Xóa', 'btn btn-sm btn-outline-danger', 'delete', item.id));
    actionCell.appendChild(actionWrap);

    row.appendChild(idCell);
    row.appendChild(tenCell);
    row.appendChild(moTaCell);
    row.appendChild(ngayTaoCell);
    row.appendChild(ngayCapNhatCell);
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
      ten_bac_dai: tenBacDaiInput.value,
      mo_ta: moTaInput.value
    };

    submitButton.disabled = true;
    cancelEditButton.disabled = true;

    try {
      const result = await request(
        editingId ? `/bac-dai/api/${editingId}` : '/bac-dai/api',
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
      const result = await request(`/bac-dai/api/${item.id}`, {
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
