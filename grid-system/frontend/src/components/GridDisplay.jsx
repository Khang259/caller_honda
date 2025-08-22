
import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import '../styles/GridDisplay.css';
import MobileGridDisplay from './MobileGridDisplay';

// Constants
const KHU_CONFIG = {
  SupplyAndDemand: {
    label: 'CẤP&TRẢ HÀNG',
    color: '#823333',
    defaultCells: 22
  },
  Supply: {
    label: 'CẤP HÀNG',
    color: '#14a65f',
    defaultCells: 30
  },
  Demand: {
    label: 'TRẢ TRỐNG',
    color: '#3247b3',
    defaultCells: 24
  }
};

const VALID_KHUS = Object.keys(KHU_CONFIG);

const BREAKPOINT_MOBILE = 768; // 768px for tablet/mobile breakpoint

// Custom hooks
const useGridConfig = (serverIPs, activeKhu) => {
  const [gridConfig, setGridConfig] = useState(null);
  const [isConfigLoading, setIsConfigLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadConfig = useCallback(async (serverIP) => {
    try {
      const configData = await fetchConfig(serverIP);
      setGridConfig(configData);
      console.log('✅ Config từ MongoDB:', configData);
    } catch (configError) {
      console.warn('⚠️ Không thể load config từ MongoDB, sử dụng config local:', configError);
      const localConfig = {
        SupplyAndDemandConfig: { cells: 22 },
        SupplyConfig: { cells: 30 },
        DemandConfig: { cells: 24 }
      };
      setGridConfig(localConfig);
    }
  }, []);

  const getEffectiveServerIP = useCallback(() => {
    if (serverIPs && serverIPs.length > 0) {
      return serverIPs[0];
    }
    
    const savedConfig = JSON.parse(localStorage.getItem('userConfig') || '{}');
    if (savedConfig.serverIPs && savedConfig.serverIPs.length > 0) {
      return savedConfig.serverIPs[0];
    }
    
    return null;
  }, [serverIPs]);

  useEffect(() => {
    const serverIP = getEffectiveServerIP();
    if (serverIP) {
      loadConfig(serverIP);
      setIsConfigLoading(false);
    } else {
      setError('Không có IP server hợp lệ. Vui lòng kiểm tra cấu hình.');
      setIsConfigLoading(false);
    }
  }, [serverIPs, loadConfig, getEffectiveServerIP]);

  return { gridConfig, isConfigLoading, error, loadConfig };
};

const useTaskData = (serverIPs, activeKhu, gridConfig) => {
  const [taskData, setTaskData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const latestKhuRef = useRef(activeKhu);

  const loadTaskData = useCallback(async () => {
    const khuAtStart = activeKhu;
    latestKhuRef.current = activeKhu;
    setLoading(true);
    setError(null);

    const serverIP = serverIPs && serverIPs.length > 0 ? serverIPs[0] : null;
    if (!serverIP) {
      const savedConfig = JSON.parse(localStorage.getItem('userConfig') || '{}');
      if (savedConfig.serverIPs && savedConfig.serverIPs.length > 0) {
        const finalServerIP = savedConfig.serverIPs[0];
        try {
          const data = await fetchTaskData(finalServerIP, activeKhu);
          if (latestKhuRef.current === khuAtStart) {
            setTaskData(data);
            console.log(`✅ Dữ liệu từ MongoDB (${activeKhu}):`, data);
          }
        } catch (error) {
          if (latestKhuRef.current === khuAtStart) {
            setError(`Không thể tải dữ liệu từ MongoDB: ${error.message}`);
            setTaskData([]);
          }
        }
      } else {
        setError('Không có IP server hợp lệ. Vui lòng kiểm tra cấu hình.');
        setTaskData([]);
      }
    } else {
      try {
        const data = await fetchTaskData(serverIP, activeKhu);
        if (latestKhuRef.current === khuAtStart) {
          setTaskData(data);
          console.log(`✅ Dữ liệu từ MongoDB (${activeKhu}):`, data);
        }
      } catch (error) {
        if (latestKhuRef.current === khuAtStart) {
          setError(`Không thể tải dữ liệu từ MongoDB: ${error.message}`);
          setTaskData([]);
        }
      }
    }

    if (latestKhuRef.current === khuAtStart) {
      setLoading(false);
    }
  }, [activeKhu, serverIPs]);

  useEffect(() => {
    loadTaskData();
  }, [loadTaskData]);

  return { taskData, loading, error, loadTaskData, setTaskData };
};

const useResponsive = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < BREAKPOINT_MOBILE);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  return { isMobile };
};

// Utility functions
const getCurrentKhuConfig = (activeKhu) => {
  const validKhu = VALID_KHUS.includes(activeKhu) ? activeKhu : 'SupplyAndDemand';
  return {
    khu: validKhu,
    ...KHU_CONFIG[validKhu]
  };
};

const getTotalCells = (gridConfig, currentKhu) => {
  if (!gridConfig) {
    return KHU_CONFIG[currentKhu].defaultCells;
  }

  const configKey = `${currentKhu}Config`;
  return gridConfig[configKey]?.cells || KHU_CONFIG[currentKhu].defaultCells;
};

const GridDisplay = ({ gridData }) => {
  // Context hooks
  const { currentUser, isAdmin } = useAuth();
  const { serverIPs, activeKhu } = useSettings();
  const { sentTasks, addTask, toggleTask, removeTask } = useTasks();
  const { addHistory } = useHistory();

  // Local state
  const [cellStates, setCellStates] = useState({});
  const [isSending, setIsSending] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedCell, setSelectedCell] = useState(null);
  const [sendResult, setSendResult] = useState({ success: false, message: '' });
  const [cancelResult, setCancelResult] = useState({ success: false, message: '' });
  const [contextMenu, setContextMenu] = useState({
    show: false,
    cellData: null,
    position: { x: 0, y: 0 }
  });

  // Custom hooks
  const { gridConfig, isConfigLoading, error: configError } = useGridConfig(serverIPs, activeKhu);
  const { taskData, loading, error: taskError, loadTaskData, setTaskData } = useTaskData(serverIPs, activeKhu, gridConfig);
  const { isMobile } = useResponsive();

  // Derived values
  const currentKhuConfig = getCurrentKhuConfig(activeKhu);
  const effectiveServerIP = serverIPs && serverIPs.length > 0 ? serverIPs[0] : null;
  const totalCells = getTotalCells(gridConfig, currentKhuConfig.khu);

  // Reset cell states when khu changes
  useEffect(() => {
    setCellStates({});
  }, [activeKhu]);

  // Event handlers
  const handleCellClick = useCallback((cellNumber) => {
    console.log(`🖱️ Ô được chọn: cell-${cellNumber}`);
    setSelectedCell(cellNumber);
    setShowModal(true);
  }, []);

  const handleCellRightClick = useCallback((e, cellNumber) => {
    e.preventDefault();
    const cellData = taskData.find(item => item.cell === `cell-${cellNumber}`);
    
    setContextMenu({
      show: true,
      cellData: cellData,
      position: { x: e.clientX, y: e.clientY }
    });
  }, [taskData]);

  const handleContextMenuHide = useCallback(() => {
    setContextMenu(prev => ({ ...prev, show: false }));
  }, []);

  const handleUpdateSuccess = useCallback(() => {
    loadTaskData();
  }, [loadTaskData]);

  const handleClose = useCallback(() => {
    setShowModal(false);
    setSendResult({ success: false, message: '' });
  }, []);

  const handleCloseCancelModal = useCallback(() => {
    setShowCancelModal(false);
    setCancelResult({ success: false, message: '' });
  }, []);

  const handleSendSignal = useCallback(async () => {
    if (isSending) return;
    setIsSending(true);

    try {
      const selectedData = taskData.find(item => item.cell === `cell-${selectedCell}`);
      if (!selectedData) {
        if (taskData.length === 0) {
          throw new Error(`Không có dữ liệu trong MongoDB cho khu vực ${currentKhuConfig.khu}. Vui lòng kiểm tra lại sau.`);
        } else {
          throw new Error(`Không tìm thấy dữ liệu cho ô ${selectedCell} trong MongoDB. Có thể ô này chưa được cập nhật.`);
        }
      }

      const result = await sendTaskSignal(
        serverIPs,
        selectedData,
        selectedCell,
        currentKhuConfig.khu,
        addTask,
        addHistory,
        setCellStates,
        handleClose,
        { [currentKhuConfig.khu]: currentKhuConfig.color },
        handleClose
      );
      setSendResult(result);
    } catch (error) {
      setSendResult({ success: false, message: `Lỗi: ${error.message}` });
      setCellStates(prev => ({ ...prev, [selectedCell]: 'bg-danger' }));
      setTimeout(() => handleClose(), 2000);
      setTimeout(() => {
        setCellStates(prev => ({ ...prev, [selectedCell]: currentKhuConfig.color }));
      }, 4000);
    } finally {
      setIsSending(false);
    }
  }, [isSending, taskData, selectedCell, currentKhuConfig, serverIPs, addTask, addHistory, handleClose]);

  const handleCancelSignal = useCallback(async (taskIndex) => {
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
  }, [sentTasks, serverIPs, removeTask]);

  const handleTaskToggle = useCallback((index) => {
    toggleTask(index);
  }, [toggleTask]);

  // Render functions
  const renderGridCell = useCallback((cellNumber) => {
    const cellState = cellStates[cellNumber] || currentKhuConfig.color;
    const cellData = taskData.find(item => item.cell === `cell-${cellNumber}`);
    const cellLabel = formatCellLabel(cellNumber, currentKhuConfig.khu);

    return (
      <div className="col-3 col-sm-4 col-md-3 col-lg-2 col-xl-2" key={cellNumber}>
        <div
          id={`cell-${cellNumber}`}
          className="text-white grid-cell"
          onClick={() => handleCellClick(cellNumber)}
          onContextMenu={(e) => handleCellRightClick(e, cellNumber)}
          style={{
            backgroundColor: cellState.startsWith('bg-') ? undefined : cellState,
            height: '80px',
            margin: '10px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            borderRadius: '8px',
            fontWeight: 'bold',
            fontSize: '1rem',
            cursor: 'pointer',
            ...(cellState.startsWith('bg-') && { className: `${cellState} text-white grid-cell` })
          }}
        >
          <div>{cellLabel}</div>
        </div>
      </div>
    );
  }, [cellStates, currentKhuConfig, taskData, handleCellClick, handleCellRightClick]);

  const renderGrid = useCallback(() => {
    if (loading) return <div className="text-center">Đang tải dữ liệu ...</div>;
    if (taskError) return <div className="text-danger text-center">Lỗi: {taskError}</div>;
    if (!taskData || taskData.length === 0) {
      return (
        <div className="text-center text-muted">
          <div className="mb-2">
            <i className="bi bi-database-x fs-1"></i>
          </div>
          <div>Không có dữ liệu cho khu vực {currentKhuConfig.label}</div>
          <div className="small">Dữ liệu sẽ được hiển thị khi có hoạt động trong khu vực này</div>
        </div>
      );
    }

    return Array.from({ length: totalCells }, (_, index) => renderGridCell(index + 1));
  }, [loading, taskError, taskData, currentKhuConfig, totalCells, renderGridCell]);

  const renderServerInfo = useCallback(() => (
    <div className="mb-3">
      <strong>Server:</strong> {effectiveServerIP || 'Chưa cấu hình'}
      {taskData && taskData.length > 0 && (
        <span className="badge bg-success ms-2">
          {taskData.length} ô có dữ liệu
        </span>
      )}
      {(!taskData || taskData.length === 0) && !loading && !taskError && (
        <span className="badge bg-warning ms-2">
          Chưa có dữ liệu
        </span>
      )}
    </div>
  ), [effectiveServerIP, taskData, loading, taskError]);

  const renderUserInfo = useCallback(() => (
    currentUser && (
      <div className="mb-3">
        <strong>Đăng nhập với:</strong> {currentUser.username}
        {isAdmin() && <span className="badge bg-danger ms-2">Admin</span>}
      </div>
    )
  ), [currentUser, isAdmin]);

  const renderTaskList = useCallback(() => (
    sentTasks.length > 0 && (
      <TaskList
        tasks={sentTasks}
        onTaskToggle={handleTaskToggle}
        onCancel={handleCancelSignal}
        currentKhu={currentKhuConfig.khu}
      />
    )
  ), [sentTasks, handleTaskToggle, handleCancelSignal, currentKhuConfig.khu]);

  // Early return for config loading
  if (isConfigLoading) {
    return <div className="text-center mt-3">Đang tải cấu hình...</div>;
  }

  // Early return for mobile devices
  if (isMobile) {
    return <MobileGridDisplay />;
  }

  return (
    <div className="w-100">
      <Card className="w-100">
        <Card.Header className="bg-light">
          <h5 className="mb-0">KHU VỰC {currentKhuConfig.label}</h5>
        </Card.Header>
        <Card.Body>
          {renderServerInfo()}
          {renderUserInfo()}
          <div className="bg-light p-3 rounded">
            <div className="row">
              {renderGrid()}
            </div>
          </div>
          {renderTaskList()}
        </Card.Body>
      </Card>

      {/* Send Signal Modal */}
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

      {/* Cancel Task Modal */}
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
        currentKhu={currentKhuConfig.khu}
        serverIPs={serverIPs}
        onUpdateSuccess={handleUpdateSuccess}
        position={contextMenu.position}
      />
    </div>
  );
};

export default GridDisplay;