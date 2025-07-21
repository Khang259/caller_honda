// src/services/task.js
import { sendData, defaultServers } from './api';
import { format } from 'date-fns';
import { formatCellLabel } from '../utils/format';

export const sendTaskSignal = async (
  serverIPs,
  taskData,
  selectedCell,
  currentKhu,
  addTask,
  addHistory,
  setCellStates,
  handleClose,
  khuColors
) => {
  const jsonData = taskData.value;
  console.log('jsonData:', jsonData);

  // Lấy orderCount
  const response = await fetch(`http://${serverIPs[0]}/getOrderCount`);
  console.log('Response received from getOrderCount:', response);

  if (!response.ok) {
    throw new Error(`Không thể lấy orderCount từ server: HTTP ${response.status}`);
  }

  const json = await response.json();
  console.log('JSON từ getOrderCount:', json);

  if (json.status === 'error') {
    throw new Error(`Lỗi từ server: ${json.message}`);
  }

  const { orderCount } = json;
  if (typeof orderCount === 'undefined') {
    throw new Error('Phản hồi từ server không chứa orderCount');
  }

  const newOrderId = `Superlification_${orderCount}`;

  const reorderedData = {
    modelProcessCode: jsonData.modelProcessCode || 'None',
    fromSystem: jsonData.fromSystem || 'None',
    orderId: newOrderId,
    taskOrderDetail: jsonData.taskOrderDetail || [{ taskPath: '' }],
  };

  const cellLabel = formatCellLabel(selectedCell, currentKhu);

  const historyData = {
    cell: cellLabel,
    currentKhu: currentKhu, // Thêm currentKhu vào historyData
    timestamp: format(new Date(), 'dd/MM/yyyy HH:mm:ss'),
    sent_data: reorderedData,
    area: currentKhu,
    user: 'admin', // Cần truyền currentUser nếu có
    completed: false,
  };

  const servers = serverIPs.map((ip, index) => ({
    serverIP: ip,
    endpoint: defaultServers[index % defaultServers.length].endpoint,
  }));

  try {
    const results = await sendData(reorderedData, null, null, null, servers, serverIPs);
    const allSuccess = results.every((result) => result.success);
    if (!allSuccess) {
      const failedServers = results
        .filter((result) => !result.success)
        .map((result) => `${result.serverIP}${result.endpoint}`)
        .join(', ');
      throw new Error(`Gửi thất bại đến: ${failedServers}`);
    }

    addTask(historyData);
    const serverList = servers.map((s) => `${s.serverIP}${s.endpoint}`).join(', ');
    addHistory(
      `Đã gửi tín hiệu: Ô ${selectedCell} - Dữ liệu: ${JSON.stringify(reorderedData)} - Đến: ${serverList}`,
      currentKhu
    );

    setCellStates((prev) => ({ ...prev, [selectedCell]: 'bg-success' }));
    setTimeout(() => handleClose(), 2000);
    setTimeout(() => {
      setCellStates((prev) => ({ ...prev, [selectedCell]: khuColors[currentKhu] }));
    }, 2000);

    return {
      success: true,
      message: `Đã gửi tín hiệu từ ô ${selectedCell} thành công tới tất cả server!`,
    };
  } catch (error) {
    console.error('Lỗi khi gửi dữ liệu:', error);
    throw error;
  }
};

// Giữ nguyên cancelTaskSignal
export const cancelTaskSignal = async (serverIP, task, currentKhu, addHistory) => {
  const response = await fetch(`http://${serverIP}/cancel-task`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      orderId: task.sent_data.orderId,
      area: currentKhu,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to cancel task');
  }

  addHistory(`Đã hủy tín hiệu: Ô ${task.cell} - Order: ${task.sent_data.orderId}`, currentKhu);
  return { success: true, message: `Đã hủy task ${task.sent_data.orderId}` };
};