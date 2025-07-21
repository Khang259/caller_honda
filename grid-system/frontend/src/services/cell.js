// src/services/cell.js
// Service để quản lý cell data (update, delete)

export const updateCellData = async (serverIP, khu, cellData) => {
  if (!serverIP) {
    throw new Error('Không có IP server hợp lệ.');
  }

  const url = `http://${serverIP}/update-cell/${khu}`;
  const response = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cellData)
  });

  if (!response.ok) {
    throw new Error(`HTTP error! Status: ${response.status}`);
  }

  const result = await response.json();
  if (result.status !== 'success') {
    throw new Error(result.message || 'Không thể cập nhật dữ liệu');
  }

  return result.data;
};

export const deleteCellData = async (serverIP, khu, cellId) => {
  if (!serverIP) {
    throw new Error('Không có IP server hợp lệ.');
  }

  const url = `http://${serverIP}/delete-cell/${khu}?cell_id=${encodeURIComponent(cellId)}`;
  const response = await fetch(url, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' }
  });

  if (!response.ok) {
    throw new Error(`HTTP error! Status: ${response.status}`);
  }

  const result = await response.json();
  if (result.status !== 'success') {
    throw new Error(result.message || 'Không thể xóa dữ liệu');
  }

  return result.data;
}; 