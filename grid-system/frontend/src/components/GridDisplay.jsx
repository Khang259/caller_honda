
import React, { useState, useEffect, useRef } from 'react';
import { Card, Modal, Button } from 'react-bootstrap';
import { useHistory } from '../contexts/HistoryContext';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { useTasks } from '../contexts/TaskContext';
import TaskList from './TaskList';
import { fetchTaskData } from '../services/grid';
import { sendTaskSignal, cancelTaskSignal } from '../services/task';
import { sendData } from '../services/api';
import { formatCellLabel } from '../utils/format';
import { fetchConfig } from '../services/config';
import ContextMenu from './ContextMenu';

const GridDisplay = ({ gridData }) => {
  const { currentUser, isAdmin } = useAuth();
  const { serverIPs, SupplyAndDemandConfig, SupplyConfig, DemandConfig, activeKhu } = useSettings();
  const { sentTasks, addTask, toggleTask, removeTask } = useTasks();
  const { addHistory } = useHistory();

  const [cellStates, setCellStates] = useState({});
  const [isSending, setIsSending] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedCell, setSelectedCell] = useState(null);
  const [sendResult, setSendResult] = useState({ success: false, message: '' });
  const [cancelResult, setCancelResult] = useState({ success: false, message: '' });
  const [taskData, setTaskData] = useState(gridData || []);
  const [loading, setLoading] = useState(true);
  const [isConfigLoading, setIsConfigLoading] = useState(true);
  const [error, setError] = useState(null);
  const [gridConfig, setGridConfig] = useState(null);
  const [contextMenu, setContextMenu] = useState({
    show: false,
    cellData: null,
    position: { x: 0, y: 0 }
  });

  const latestKhuRef = useRef(activeKhu);
  const validKhus = ['SupplyAndDemand', 'Supply', 'Demand'];
  const currentKhu = validKhus.includes(activeKhu) ? activeKhu : 'SupplyAndDemand';
  const effectiveServerIP = serverIPs && serverIPs.length > 0 ? serverIPs[0] : null;

  const config = currentKhu === 'SupplyAndDemand' ? SupplyAndDemandConfig :
                 currentKhu === 'Supply' ? SupplyConfig : DemandConfig;

  const khuMap = {
    'SupplyAndDemand': 'CẤP&TRẢ HÀNG',
    'Supply': 'CẤP HÀNG',
    'Demand': 'TRẢ TRỐNG'
  };

  const khuColors = {
    'SupplyAndDemand': '#823333',
    'Supply': '#14a65f',
    'Demand': '#3247b3'
  };

  useEffect(() => {
    setCellStates({}); // Reset cellStates để tránh giữ màu từ khu trước
  }, [activeKhu]);

  useEffect(() => {
    const loadTaskData = async () => {
      const khuAtStart = currentKhu;
      latestKhuRef.current = currentKhu;
      setLoading(true);
      setError(null);

      let finalServerIP = effectiveServerIP;
      if (!serverIPs || serverIPs.length === 0) {
        const savedConfig = JSON.parse(localStorage.getItem('userConfig') || '{}');
        if (savedConfig.serverIPs && savedConfig.serverIPs.length > 0) {
          finalServerIP = savedConfig.serverIPs[0];
          setIsConfigLoading(false);
        } else {
          setError('Không có IP server hợp lệ. Vui lòng kiểm tra cấu hình.');
          setIsConfigLoading(false);
          setLoading(false);
          return;
        }
      } else {
        setIsConfigLoading(false);
      }

      try {
        // Load config từ MongoDB
        if (finalServerIP && !gridConfig) {
          try {
            const configData = await fetchConfig(finalServerIP);
            setGridConfig(configData);
            console.log('✅ Config từ MongoDB:', configData);
          } catch (configError) {
            console.warn('⚠️ Không thể load config từ MongoDB, sử dụng config local:', configError);
            // Fallback to local config
            const localConfig = {
              SupplyAndDemandConfig: { cells: 22 },
              SupplyConfig: { cells: 30 },
              DemandConfig: { cells: 24 }
            };
            setGridConfig(localConfig);
          }
        }

        const data = await fetchTaskData(finalServerIP, currentKhu);
        if (latestKhuRef.current === khuAtStart) {
          setTaskData(data);
          console.log(`✅ Dữ liệu từ MongoDB (${currentKhu}):`, data);
        }
      } catch (error) {
        console.error(`❌ Lỗi khi tải dữ liệu từ MongoDB (${khuAtStart}):`, error);
        if (latestKhuRef.current === khuAtStart) {
          setError(`Không thể tải dữ liệu từ MongoDB: ${error.message}`);
          setTaskData([]);
        }
      } finally {
        if (latestKhuRef.current === khuAtStart) {
          setLoading(false);
        }
      }
    };

    loadTaskData();
  }, [currentKhu, serverIPs, gridConfig]);

  const handleCellClick = (cellNumber) => {
    console.log(`🖱️ Ô được chọn: cell-${cellNumber}`);
    setSelectedCell(cellNumber);
    setShowModal(true);
  };

  const handleCellRightClick = (e, cellNumber) => {
    e.preventDefault();
    const cellData = taskData.find(item => item.cell === `cell-${cellNumber}`);
    
    setContextMenu({
      show: true,
      cellData: cellData,
      position: { x: e.clientX, y: e.clientY }
    });
  };

  const handleContextMenuHide = () => {
    setContextMenu(prev => ({ ...prev, show: false }));
  };

  const handleUpdateSuccess = () => {
    // Reload data after update/delete
    const loadTaskData = async () => {
      try {
        const data = await fetchTaskData(effectiveServerIP, currentKhu);
        setTaskData(data);
        console.log(`✅ Dữ liệu đã được cập nhật (${currentKhu}):`, data);
      } catch (error) {
        console.error(`❌ Lỗi khi reload dữ liệu:`, error);
      }
    };
    loadTaskData();
  };

  const handleClose = () => {
    setShowModal(false);
    setSendResult({ success: false, message: '' });
  };

  const handleCloseCancelModal = () => {
    setShowCancelModal(false);
    setCancelResult({ success: false, message: '' });
  };

  const handleSendSignal = async () => {
    if (isSending) return;
    setIsSending(true);

    try {
      const selectedData = taskData.find(item => item.cell === `cell-${selectedCell}`);
      if (!selectedData) {
        // Kiểm tra xem có dữ liệu nào trong taskData không
        if (taskData.length === 0) {
          throw new Error(`Không có dữ liệu trong MongoDB cho khu vực ${currentKhu}. Vui lòng kiểm tra lại sau.`);
        } else {
          throw new Error(`Không tìm thấy dữ liệu cho ô ${selectedCell} trong MongoDB. Có thể ô này chưa được cập nhật.`);
        }
      }

      const result = await sendTaskSignal(
        serverIPs,
        selectedData,
        selectedCell,
        currentKhu,
        addTask,
        addHistory,
        setCellStates,
        handleClose,
        khuColors,
        handleClose
      );
      setSendResult(result);
    } catch (error) {
      setSendResult({ success: false, message: `Lỗi: ${error.message}` });
      setCellStates(prev => ({ ...prev, [selectedCell]: 'bg-danger' }));
      setTimeout(() => handleClose(), 2000);
      setTimeout(() => {
        setCellStates(prev => ({ ...prev, [selectedCell]: khuColors[currentKhu] }));
      }, 4000);
    } finally {
      setIsSending(false);
    }
  };

  const handleCancelSignal = async (taskIndex) => {
    const taskToCancel = sentTasks[taskIndex];
    if (!taskToCancel.completed) {
      setCancelResult({ success: false, message: 'Nhiệm vụ chưa hoàn thành, không thể hủy!' });
      setShowCancelModal(true);
      return;
    }
  
    try {
      if (serverIPs.length < 2) {
        throw new Error('Cần ít nhất hai địa chỉ IP server để hủy nhiệm vụ!');
      }
  
      const orderId = taskToCancel.sent_data.orderId;
  
      // Dữ liệu và server cho URL1
      const data1 = { orderId, status: '3' };
      const servers1 = [{ serverIP: serverIPs[0], endpoint: '/submit-data' }];
  
      // Dữ liệu và server cho URL2
      const data2 = { orderId };
      const servers2 = [{ serverIP: serverIPs[1], endpoint: '/ics/out/endTask' }];
  
      // Gửi yêu cầu POST và lấy phản hồi
      const response1 = await sendData(data1, null, null, null, servers1);
      const response2 = await sendData(data2, null, null, null, servers2);
  
      // Log để debug
      console.log('Response1:', response1);
      console.log('Response2:', response2);
  
      // Kiểm tra phản hồi từ server1
      if (!response1 || response1.length === 0 || !response1[0].success) {
        throw new Error(
          `Server1 thất bại: ${
            response1 && response1[0] ? response1[0].error || 'Không có phản hồi' : 'Không có phản hồi'
          }`
        );
      }
      const responseMyServer = response1[0].result;
      const isServer1Valid = responseMyServer && responseMyServer.status === 'success';
  
      // Kiểm tra phản hồi từ server2
      if (!response2 || response2.length === 0 || !response2[0].success) {
        throw new Error(
          `Server2 thất bại: ${
            response2 && response2[0] ? response2[0].error || 'Không có phản hồi' : 'Không có phản hồi'
          }`
        );
      }
      const responseRcsServer = response2[0].result;
      const isServer2Valid = responseRcsServer && responseRcsServer.code === 1000;
  
      // Kiểm tra cả hai phản hồi
      if (isServer1Valid && isServer2Valid) {
        // Xóa nhiệm vụ khỏi sentTasks
        removeTask(taskIndex);
  
        // Thông báo thành công
        setCancelResult({ success: true, message: 'Hủy nhiệm vụ thành công!' });
        setShowCancelModal(true);
      } else {
        throw new Error(
          `Phản hồi không hợp lệ: Server1 (${
            responseMyServer ? responseMyServer.status || 'undefined' : 'undefined'
          }), Server2 (${
            responseRcsServer ? responseRcsServer.code || 'undefined' : 'undefined'
          })`
        );
      }
    } catch (error) {
      console.error('Lỗi khi hủy nhiệm vụ:', error.message);
      setCancelResult({ success: false, message: `Lỗi khi hủy nhiệm vụ: ${error.message}` });
      setShowCancelModal(true);
    }
  };

  const handleTaskToggle = (index) => {
    toggleTask(index);
  };

  const renderGrid = () => {
    if (loading) return <div className="text-center">Đang tải dữ liệu từ MongoDB...</div>;
    if (error) return <div className="text-danger text-center">Lỗi: {error}</div>;
    if (!taskData || taskData.length === 0) {
      return (
        <div className="text-center text-muted">
          <div className="mb-2">
            <i className="bi bi-database-x fs-1"></i>
          </div>
          <div>Không có dữ liệu trong MongoDB cho khu vực {khuMap[currentKhu]}</div>
          <div className="small">Dữ liệu sẽ được hiển thị khi có hoạt động trong khu vực này</div>
        </div>
      );
    }

    const cells = [];
    
    // Lấy số ô từ config MongoDB hoặc fallback về giá trị mặc định
    let totalCellsToShow = 22; // Default fallback
    if (gridConfig) {
      if (currentKhu === 'SupplyAndDemand' && gridConfig.SupplyAndDemandConfig) {
        totalCellsToShow = gridConfig.SupplyAndDemandConfig.cells || 22;
      } else if (currentKhu === 'Supply' && gridConfig.SupplyConfig) {
        totalCellsToShow = gridConfig.SupplyConfig.cells || 30;
      } else if (currentKhu === 'Demand' && gridConfig.DemandConfig) {
        totalCellsToShow = gridConfig.DemandConfig.cells || 24;
      }
    } else {
      // Fallback to hardcoded values if no config
      totalCellsToShow = currentKhu === 'SupplyAndDemand' ? 22 :
                        currentKhu === 'Supply' ? 30 : 24;
    }

    const disabledCells = { 'SupplyAndDemand': [], 'Supply': [], 'Demand': [] };

    for (let i = 1; i <= totalCellsToShow; i++) {
      const cellState = cellStates[i] || khuColors[currentKhu];
      const cellData = taskData.find(item => item.cell === `cell-${i}`);
      const cellLabel = formatCellLabel(i, currentKhu); // Sử dụng formatCellLabel
      let isDisabled = disabledCells[currentKhu]?.includes(i) || false;

      cells.push(
        <div className="col-6 col-sm-4 col-md-3 col-lg-2 col-xl-2" key={i}>
          <div
            id={`cell-${i}`}
            className={`text-white grid-cell ${isDisabled ? 'disabled' : ''}`}
            onClick={() => !isDisabled && handleCellClick(i)}
            onContextMenu={(e) => !isDisabled && handleCellRightClick(e, i)}
            style={{
              backgroundColor: cellState.startsWith('bg-') ? undefined : cellState,
              height: '80px',
              margin: '5px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              borderRadius: '8px',
              fontWeight: 'bold',
              fontSize: '16px',
              cursor: isDisabled ? 'not-allowed' : 'pointer',
              opacity: isDisabled ? 0.5 : 1,
              ...(cellState.startsWith('bg-') && { className: `${cellState} text-white grid-cell ${isDisabled ? 'disabled' : ''}` })
            }}
          >
            <div>{cellLabel}</div>
          </div>
        </div>
      );
    }
    return cells;
  };

  if (isConfigLoading) {
    return <div className="text-center mt-3">Đang tải cấu hình...</div>;
  }

  return (
    <div className="w-100">
      <Card className="w-100">
        <Card.Header className="bg-light">
          <h5 className="mb-0">KHU VỰC {khuMap[currentKhu]}</h5>
        </Card.Header>
        <Card.Body>
          <div className="mb-3">
            <strong>Server:</strong> {effectiveServerIP || 'Chưa cấu hình'}
            {taskData && taskData.length > 0 && (
              <span className="badge bg-success ms-2">
                {taskData.length} ô có dữ liệu
              </span>
            )}
            {(!taskData || taskData.length === 0) && !loading && !error && (
              <span className="badge bg-warning ms-2">
                Chưa có dữ liệu
              </span>
            )}
          </div>
          {currentUser && (
            <div className="mb-3">
              <strong>Đăng nhập với:</strong> {currentUser.username}
              {isAdmin() && <span className="badge bg-danger ms-2">Admin</span>}
            </div>
          )}
          <div className="bg-light p-3 rounded">
            <div className="row">
              {renderGrid()}
            </div>
          </div>
          {sentTasks.length > 0 && (
            <TaskList
              tasks={sentTasks}
              onTaskToggle={handleTaskToggle}
              onCancel={handleCancelSignal}
              currentKhu={currentKhu}
            />
          )}
        </Card.Body>
      </Card>

      <Modal show={showModal} onHide={handleClose}>
        <Modal.Header closeButton>
          <Modal.Title>Xác nhận - Ô số {selectedCell}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {sendResult.message ? (
            <div className={`alert ${sendResult.success ? 'alert-success' : 'alert-danger'}`}>
              {sendResult.message}
            </div>
          ) : (
            <p>Bạn có chắc chắn muốn gửi tín hiệu từ ô số {selectedCell} không?</p>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose}>
            Đóng
          </Button>
          {!sendResult.message && (
            <Button
              variant="primary"
              onClick={handleSendSignal}
              disabled={isSending}
            >
              {isSending ? 'Đang gửi...' : 'Gửi tín hiệu'}
            </Button>
          )}
        </Modal.Footer>
      </Modal>

      <Modal show={showCancelModal} onHide={handleCloseCancelModal}>
        <Modal.Header closeButton>
          <Modal.Title>Kết quả hủy nhiệm vụ</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className={`alert ${cancelResult.success ? 'alert-success' : 'alert-danger'}`}>
            {cancelResult.message}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseCancelModal}>
            Đóng
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Context Menu */}
      <ContextMenu
        show={contextMenu.show}
        onHide={handleContextMenuHide}
        cellData={contextMenu.cellData}
        currentKhu={currentKhu}
        serverIPs={serverIPs}
        onUpdateSuccess={handleUpdateSuccess}
        position={contextMenu.position}
      />
    </div>
  );
};

export default GridDisplay;