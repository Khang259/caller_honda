// Xử lý logic liên quan đến lưới ô (fetch dữ liệu, gửi tín hiệu).

// src/services/grid.js
export const fetchTaskData = async (serverIP, khu) => {
  if (!serverIP) {
    throw new Error('Không có IP server hợp lệ.');
  }

  const url = `http://${serverIP}/get-task-data/${khu}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });

  if (!response.ok) {
    throw new Error(`HTTP error! Status: ${response.status}`);
  }

  const result = await response.json();
  if (result.status !== 'success') {
    throw new Error(result.message || 'Không có dữ liệu từ server');
  }

  return result.data;
};
