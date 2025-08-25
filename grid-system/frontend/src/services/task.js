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
  const response = await fetch(`http://${serverIPs[0]}/getOrderCount`);

  if (!response.ok) {
    throw new Error(`Không thể lấy orderCount từ server: HTTP ${response.status}`);
  }

  const json = await response.json();

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
  console.log('📦 Dữ liệu đã được format:', reorderedData);

  // Payload riêng cho addTask khi khu là SupplyAndDemand
  const rawTaskPath = Array.isArray(jsonData.taskOrderDetail) && jsonData.taskOrderDetail.length > 0
    ? jsonData.taskOrderDetail[0].taskPath
    : '';

  const addTaskPayload = {
    modelProcessCode: reorderedData.modelProcessCode,
    fromSystem: reorderedData.fromSystem,
    orderId: reorderedData.orderId,
    taskOrderDetail: rawTaskPath
      ? [
          { taskPath: rawTaskPath },
          { taskPath: rawTaskPath },
        ]
      : (reorderedData.taskOrderDetail || [{ taskPath: '' }, { taskPath: '' }])
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
  
  console.log('🔗 Danh sách servers và endpoints sẽ gọi:');
  servers.forEach((server, index) => {
    console.log(`   ${index + 1}. Server: ${server.serverIP}, Endpoint: ${server.endpoint}`);
  });
  console.log('📋 Default servers config:', defaultServers);

  try {
    console.log('🚀 Bắt đầu gửi dữ liệu đến tất cả servers...');
    
    // Gọi API chính đến tất cả servers với endpoint /submit-data
    const results = await sendData(reorderedData, null, null, null, servers, serverIPs);
    console.log('📤 Kết quả gửi dữ liệu chính:', results);
    
    // Gọi thêm API mới đến serverIPs[1] với endpoint /ics/taskOrder/addTask
    if (serverIPs.length >= 2) {
      console.log('🆕 Gọi thêm API /ics/taskOrder/addTask đến server:', serverIPs[1]);
      try {
        const payloadForAddTask = currentKhu === 'SupplyAndDemand' ? addTaskPayload : reorderedData;
        const additionalApiResponse = await fetch(`http://${serverIPs[1]}/ics/taskOrder/addTask`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payloadForAddTask),
        });
        
        if (!additionalApiResponse.ok) {
          const errorText = await additionalApiResponse.text();
          console.warn(`⚠️ Cảnh báo: API /ics/taskOrder/addTask thất bại: HTTP ${additionalApiResponse.status}`, errorText);
        } else {
          const additionalApiResult = await additionalApiResponse.json();
          console.log('✅ API /ics/taskOrder/addTask thành công:', additionalApiResult);
        }
      } catch (additionalApiError) {
        console.warn(`⚠️ Cảnh báo: Lỗi khi gọi API /ics/taskOrder/addTask:`, additionalApiError.message);
      }
    }
    
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
    const additionalApiInfo = serverIPs.length >= 2 ? ` + ${serverIPs[1]}/ics/taskOrder/addTask` : '';
    console.log('✅ Gửi thành công đến tất cả servers:', serverList + additionalApiInfo);
    
    addHistory(
      `Đã gửi tín hiệu: Ô ${selectedCell} - Dữ liệu: ${JSON.stringify(reorderedData)} - Đến: ${serverList}${additionalApiInfo}`,
      currentKhu
    );

    setCellStates((prev) => ({ ...prev, [selectedCell]: 'bg-success' }));
    setTimeout(() => handleClose(), 2000);
    setTimeout(() => {
      setCellStates((prev) => ({ ...prev, [selectedCell]: khuColors[currentKhu] }));
    }, 2000);

    const successMessage = `Gửi tín hiệu thành công`;
    console.log('🎉 Kết quả cuối cùng:', successMessage);
    
    return {
      success: true,
      message: successMessage,
    };
  } catch (error) {
    console.error('❌ Lỗi khi gửi dữ liệu:', error);
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