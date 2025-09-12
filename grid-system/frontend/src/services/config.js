// src/services/config.js
// Service để quản lý cấu hình từ MongoDB

export const fetchConfig = async (serverIP) => {
  if (!serverIP) {
    throw new Error('Không có IP server hợp lệ.');
  }

  const url = `http://${serverIP}/config`;
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });

  if (!response.ok) {
    throw new Error(`HTTP error! Status: ${response.status}`);
  }

  const result = await response.json();
  console.log('Debug result from config:', result);
  if (result.status !== 'success') {
    throw new Error(result.message || 'Không thể lấy cấu hình từ server');
  }

  return result.data;
};

export const saveConfig = async (serverIP, configData) => {
  console.log('Debug serverIP:', serverIP);
  console.log('Debug configData:', configData);
  if (!serverIP) {
    throw new Error('Không có IP server hợp lệ.');
  }

  const url = `http://${serverIP}/config`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({configData})
  });

  if (!response.ok) {
    console.log('Debug response:', await response.text());
    throw new Error(`HTTP error! Status: ${response.status}`);
  }

  const result = await response.json();
  if (result.status !== 'success') {
    throw new Error(result.message || 'Không thể lưu cấu hình');
  }

  return result.data;
}; 