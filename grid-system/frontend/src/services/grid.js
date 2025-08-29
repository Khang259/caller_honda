// Xử lý logic liên quan đến lưới ô (fetch dữ liệu, gửi tín hiệu).

// src/services/grid.js
export const fetchTaskData = async (serverIP, khu, username) => {
  if (!serverIP) {
    throw new Error('Không có IP server hợp lệ.');
  }

  const qs = username ? `?username=${encodeURIComponent(username)}` : '';
  const url = `http://${serverIP}/get-task-data/${khu}${qs}`;
  console.log('[fetchTaskData] URL:', url);
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });

  if (!response.ok) {
    throw new Error(`HTTP error! Status: ${response.status}`);
  }

  const result = await response.json();
  console.log('[fetchTaskData] status:', result.status, '| records:', Array.isArray(result.data) ? result.data.length : 'n/a');
  if (result.status !== 'success') {
    throw new Error(result.message || 'Không có dữ liệu từ server');
  }

  return result.data;
};
