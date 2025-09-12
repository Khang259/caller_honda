// src/components/MobileGridDisplay.jsx
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Card, Button, Form, Alert, Spinner, Modal } from 'react-bootstrap';
import { useHistory } from '../contexts/HistoryContext';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { useTasks } from '../contexts/TaskContext';
import { sendTaskSignal } from '../services/task';
import { fetchConfig } from '../services/config';
import { formatSupplyCellLabel, formatDemandCellLabel } from '../utils/format';
import ContextMenu from './ContextMenu';
import '../styles/GridDisplay.css';

// Constants
const KHU_CONFIG = {
  Supply: {
    label: 'CẤP HÀNG',
    collection: 'task_path_supply',
    maxElements: 2,
    defaultCells: 9
  },
  Demand: {
    label: 'TRẢ TRỐNG',
    collection: 'task_path_demand',
    maxElements: 2,
    defaultCells: 10
  }
};

const MobileGridDisplay = () => {
  // Context hooks
  const { currentUser, isAdmin, isUserAE3, isUserAE4, isUserMainOvh } = useAuth();
  const { serverIPs } = useSettings();
  const { addTask, addHistory } = useTasks();
  const { addHistory: addHistoryRecord } = useHistory();

  // Local state
  const [selectedKhu, setSelectedKhu] = useState('');
  const [taskPathElements, setTaskPathElements] = useState([]);
  const [selectedElements, setSelectedElements] = useState({});
  const [availableCells, setAvailableCells] = useState([]);
  const [selectedCell, setSelectedCell] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [cellStates, setCellStates] = useState({});
  const [taskData, setTaskData] = useState([]);
  const [gridConfig, setGridConfig] = useState(null);
  const [contextMenu, setContextMenu] = useState({
    show: false,
    cellData: null,
    position: { x: 0, y: 0 }
  });

  // Ref để theo dõi trạng thái tải dữ liệu
  const isTaskDataLoaded = useRef(false);
  const isGridConfigLoaded = useRef(false);

  // Memo hóa dynamicKhuConfig để tránh tạo mới
  const dynamicKhuConfig = useMemo(() => {
    if (!currentUser) return {};
    console.log('🔍 Debug - Tạo dynamicKhuConfig');
    const cellCount = isUserAE3() ? 9 : isUserAE4() ? 10 : 9; // 9 for user_ae3, 10 for user_ae4, 9 for others
    return {
      Supply: {
        label: 'CẤP HÀNG',
        collection: isUserAE3() ? 'task_path_supply_ae3' : isUserAE4() ? 'task_path_supply_ae4' : 'task_path_supply',
        maxElements: 2,
        defaultCells: cellCount
      },
      Demand: {
        label: 'TRẢ TRỐNG',
        collection: isUserAE3() ? 'task_path_demand_ae3' : isUserAE4() ? 'task_path_demand_ae4' : 'task_path_demand',
        maxElements: 2,
        defaultCells: cellCount
      }
    };
  }, [currentUser, isUserAE3, isUserAE4]);

  // Derived values
  const effectiveServerIP = serverIPs && serverIPs.length > 0 ? serverIPs[0] : null;
  const effectiveServerIPICS = serverIPs && serverIPs.length > 1 ? serverIPs[1] : null; // Giữ var này để dùng sau
  const currentKhuConfig = selectedKhu ? dynamicKhuConfig[selectedKhu] : null;

  // Load grid configuration
  const loadGridConfig = useCallback(async () => {
    if (!effectiveServerIP || isGridConfigLoaded.current) {
      return;
    }
    setIsLoading(true);
    try {
      const configData = await fetchConfig(effectiveServerIP);
      setGridConfig(configData);
      isGridConfigLoaded.current = true;
      console.log('✅ Config từ MongoDB:', configData);
    } catch (error) {
      console.warn('⚠️ Không thể load config từ MongoDB, sử dụng config local:', error);
      setGridConfig({
        SupplyConfig: { cells: 9 },
        DemandConfig: { cells: 10 }
      });
      isGridConfigLoaded.current = true;
    } finally {
      setIsLoading(false);
    }
  }, [effectiveServerIP]);

  // Load task path elements
  const loadTaskPathElements = useCallback(async () => {
    if (!effectiveServerIP || !currentKhuConfig || !currentUser) {
      return;
    }
    setIsLoading(true);
    try {
      const apiUrl = `http://192.168.1.7:1838/api/grid/options/${selectedKhu}?username=${currentUser.username}`;
      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
    } finally {
      setIsLoading(false);
    }
  }, [selectedKhu, currentKhuConfig, effectiveServerIP, currentUser]);

  // Load task data for grid
  const loadTaskData = useCallback(async () => {
    if (!effectiveServerIP || !selectedKhu || !currentUser || isTaskDataLoaded.current) {
      return;
    }
    setIsLoading(true);
    try {
      const apiUrl = `http://192.168.1.7:1838/get-task-data/${selectedKhu}?username=${currentUser.username}`;
      console.log('🔗 Fetching task data from:', apiUrl);
      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      // if (data.status === 'success' && Array.isArray(data.data)) {
      if (Array.isArray(data.data)) {
        if (JSON.stringify(data.data) !== JSON.stringify(taskData)) {
          setTaskData(data.data);
          console.log(`✅ Dữ liệu từ MongoDB (${selectedKhu}):`, data.data);
        } else {
        }
        isTaskDataLoaded.current = true;
      } else {
        throw new Error('Dữ liệu task không hợp lệ');
      }
    } catch (error) {
      console.error('❌ Lỗi khi tải task data:', error);
      setTaskData([]);
    } finally {
      setIsLoading(false);
    }
  }, [effectiveServerIP, selectedKhu, currentUser, taskData]);

  // Load config và task data khi khu thay đổi
  useEffect(() => {
    console.log('🔍 Debug - useEffect cho selectedKhu:', selectedKhu);
    if (selectedKhu && currentKhuConfig) {
      isTaskDataLoaded.current = false;
      isGridConfigLoaded.current = false;
      loadTaskPathElements();
      // if (selectedKhu === 'Supply') {
      //   loadGridConfig();
      // }
      loadTaskData(); // Load task data cho cả Supply và Demand
    }
  }, [selectedKhu, currentKhuConfig, loadTaskPathElements, loadGridConfig, loadTaskData]);

  // Reset selections khi khu thay đổi
  useEffect(() => {
    console.log('🔍 Debug - Reset state khi selectedKhu thay đổi');
    setTaskPathElements([]);
    setSelectedElements({});
    setSelectedCell('');
    setAvailableCells([]);
    setSendResult(null);
    setCellStates({});
    setTaskData([]);
    setContextMenu({ show: false, cellData: null, position: { x: 0, y: 0 } });
    isTaskDataLoaded.current = false;
    isGridConfigLoaded.current = false;
  }, [selectedKhu]);

  // Get total cells cho grid
  const getTotalCells = () => {
    console.log('🔍 Debug - getTotalCells called for khu:', selectedKhu);
    if (!selectedKhu || !currentKhuConfig) {
      console.log('🔍 Debug - Fallback to 9 cells due to missing selectedKhu or currentKhuConfig');
      return 9; // Default fallback
    }
    const totalCells = currentKhuConfig.defaultCells; // Enforce 9 for Supply, 10 for Demand
    console.log('🔍 Debug - Total cells:', totalCells, 'for config:', currentKhuConfig);
    return totalCells;
  };

  // Handle cell click cho grid
  const handleCellClick = useCallback((cellNumber) => {
    console.log(`🖱️ Ô được chọn: cell-${cellNumber} cho khu ${selectedKhu}`);
    setSelectedCell(cellNumber);
    setSendResult(null);
    setShowSuccessModal(true);
  }, [selectedKhu]);

  // Handle context menu hide
  const handleContextMenuHide = useCallback(() => {
    setContextMenu(prev => ({ ...prev, show: false }));
  }, []);


  // Send task signal cho grid (cho cả Supply và Demand)
  const handleSendSignalGrid = useCallback(async () => {
    if (isSending) {
      console.log('Debug - Bỏ qua handleSendSignalGrid: đang gửi');
      return;
    }
    setIsSending(true);
    setSendResult(null);
    try {
      console.log('Debug - Bắt đầu handleSendSignalGrid cho khu:', selectedKhu);
      const selectedData = taskData.find(item => item.cell === `cell-${selectedCell}`);
      if (!selectedData) {
        if (taskData.length === 0) {
          throw new Error(`Không có dữ liệu trong MongoDB cho khu vực ${currentKhuConfig?.label}. Vui lòng kiểm tra lại sau.`);
        } else {
          throw new Error(`Không tìm thấy dữ liệu cho ô ${selectedCell} trong MongoDB. Có thể ô này chưa được cập nhật.`);
        }
      }
      
      let taskPath = '';
      if (selectedKhu === 'Supply') {
        taskPath = selectedData.value?.taskOrderDetail?.[0]?.taskPath || '';
        if (!taskPath) {
          throw new Error(`Không tìm thấy taskPath cho ô ${selectedCell}`);
        }
      } else if (selectedKhu === 'Demand') {
        // Cho Demand, lấy taskPath từ selectedData hoặc tạo từ taskPathElements
        taskPath = selectedData.value?.taskOrderDetail?.[0]?.taskPath || '';
        if (!taskPath) {
          throw new Error(`Không tìm thấy taskPath cho ô ${selectedCell}`);
        }
      }  

      const payload = {
        modelProcessCode: selectedKhu === 'Supply' ? "capxeAE3" : "capxeAE3",
        fromSystem: "thadosoft",
        cell: selectedCell,
        khu: selectedKhu,
        taskPath: taskPath,
        collection: currentKhuConfig?.collection,
        timestamp: new Date().toISOString(),
        taskOrderDetail: [{ taskPath: taskPath }]
      };
      
      const apiUrl = serverIPs.map((ip, index) => {
        const endpoint = index === 0 ? '/submit-data' : '/ics/out/endTask';
        return `http://${ip}${endpoint}`;
      });
      
      console.log('🔍 Debug - handleSendSignalGrid API:', {
        apiUrls: apiUrl,
        endpoints: serverIPs.map((_, index) => index === 0 ? '/submit-data' : '/ics/out/endTask'),
        payload: JSON.stringify(payload)
      });
      
      const result = await sendTaskSignal(
        serverIPs,
        payload,
        selectedCell,
        selectedKhu,
        addTask,
        addHistoryRecord,
        setCellStates,
        () => setShowSuccessModal(false),
        { [selectedKhu]: '#14a65f' }
      );
      setSendResult(result);
    } catch (error) {
      console.error('❌ Lỗi handleSendSignalGrid:', error);
      setSendResult({ success: false, message: `Lỗi: ${error.message}` });
      setCellStates(prev => ({ ...prev, [selectedCell]: 'bg-danger' }));
      setTimeout(() => setShowSuccessModal(false), 2000);
      setTimeout(() => {
        setCellStates(prev => ({ ...prev, [selectedCell]: '#14a65f' }));
      }, 4000);
    } finally {
      setIsSending(false);
    }
  }, [isSending, taskData, selectedCell, currentKhuConfig, serverIPs, addTask, addHistoryRecord, selectedKhu, taskPathElements, isUserAE3, isUserAE4]);

  // Render grid cell
  const renderGridCell = useCallback((cellNumber) => {
    const cellState = cellStates[cellNumber] || '#14a65f';
    const cellData = taskData.find(item => item.cell === `cell-${cellNumber}`);

    // Thêm logic màu đỏ cho Demand với isUserMainOvh
    let backgroundColor = cellState;
    if (selectedKhu === 'Demand' && isUserMainOvh() && !cellState.startsWith('bg-')) {
      backgroundColor = '#dc3545'; // Màu đỏ Bootstrap
    }

    let cellLabel;
    if (selectedKhu === 'Supply') {
      cellLabel = formatSupplyCellLabel(cellNumber, selectedKhu, isUserAE3(), isUserAE4(), isUserMainOvh());
    } else if (selectedKhu === 'Demand') {
      cellLabel = formatDemandCellLabel(cellNumber, selectedKhu, isUserAE3(), isUserAE4(), isUserMainOvh());
    }

    return (
      <div className="col-4 col-sm-3" key={cellNumber}>
        <div
          id={`cell-${cellNumber}`}
          className="text-white grid-cell"
          onClick={() => handleCellClick(cellNumber)}
          // onContextMenu={(e) => handleCellRightClick(e, cellNumber)}
          style={{
            backgroundColor: cellState.startsWith('bg-') ? undefined : backgroundColor,
            height: '60px',
            margin: '5px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            borderRadius: '6px',
            fontWeight: 'bold',
            fontSize: '0.9rem',
            cursor: 'pointer',
            ...(cellState.startsWith('bg-') && { className: `${cellState} text-white grid-cell` })
          }}
        >
          <div>{cellLabel}</div>
        </div>
      </div>
    );
  }, [cellStates, taskData, handleCellClick, selectedKhu, isUserAE3, isUserAE4, isUserMainOvh]);

  // Render grid cho Supply và Demand
  const renderGrid = useCallback(() => {
    if (isLoading) return <div className="text-center">Đang tải dữ liệu ...</div>;
    if (!taskData || taskData.length === 0) {
      return (
        <div className="text-center text-muted">
          <div className="mb-2">
            <i className="bi bi-database-x fs-1"></i>
          </div>
          <div>Không có dữ liệu cho khu vực {currentKhuConfig?.label}</div>
        </div>
      );
    }
    const totalCells = getTotalCells();
    return Array.from({ length: totalCells }, (_, index) => renderGridCell(index + 1));
  }, [isLoading, taskData, currentKhuConfig, selectedKhu, renderGridCell]);


  // Render success modal
  const renderSuccessModal = useCallback(() => (
    <Modal
      show={showSuccessModal}
      onHide={() => setShowSuccessModal(false)}
      centered
    >
      <Modal.Header closeButton className="bg-success text-white">
        <Modal.Title>
          <i className="bi bi-check-circle me-2"></i>
          {selectedKhu === 'Supply' || selectedKhu === 'Demand' ? `Xác nhận - Ô số ${selectedCell}` : 'Thành công!'}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="text-center">
        {selectedKhu === 'Supply' || selectedKhu === 'Demand' ? (
          <>
            <p>Bạn có chắc chắn muốn gửi tín hiệu từ ô số {selectedCell} không?</p>
            {sendResult && (
              <div className={`alert ${sendResult.success ? 'alert-success' : 'alert-danger'}`}>
                {sendResult.message}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="mb-3">
              <i className="bi bi-check-circle text-success" style={{ fontSize: '3rem' }}></i>
            </div>
            <h6 className="text-success">{successMessage}</h6>
            <p className="text-muted">
              Task Path: {Object.values(selectedElements).join(', ')}
            </p>
          </>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button
          variant="secondary"
          onClick={() => setShowSuccessModal(false)}
          className="w-100"
        >
          Đóng
        </Button>
        {(selectedKhu === 'Supply' || selectedKhu === 'Demand') && !sendResult?.message && (
          <Button
            variant="primary"
            onClick={handleSendSignalGrid}
            disabled={isSending}
            className="w-100 mt-2"
          >
            {isSending ? 'Đang gửi...' : 'Gửi tín hiệu'}
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  ), [showSuccessModal, successMessage, selectedKhu, selectedCell, sendResult, isSending, handleSendSignalGrid]);

  // Vùng này là phần trả về (return) của component MobileGridDisplay.
  // Nó chịu trách nhiệm hiển thị giao diện chính cho người dùng trên thiết bị di động.
  // Cụ thể:
  // - Hiển thị thông tin server hiện tại và số lượng ô có dữ liệu nếu đang ở khu Supply.
  // - Hiển thị thông tin người dùng đang đăng nhập, kèm badge Admin nếu là admin.
  // - Cho phép chọn khu vực (Supply, Demand, v.v.) bằng giao diện dạng lưới, mỗi khu là một ô bấm.
  // - Nếu chọn Supply hoặc Demand thì hiển thị lưới các ô (grid) tương ứng để thao tác.
  // - Hiển thị modal thông báo thành công khi thao tác thành công.
  // - Hiển thị context menu khi người dùng thao tác chuột phải hoặc giữ lâu trên một ô trong grid.
  // Tóm lại, vùng này là UI chính cho việc chọn khu vực, thao tác với grid và xử lý các tương tác liên quan.

  return (
    <div className="w-100">
      <Card className="w-100">
        <Card.Header className="bg-light">
          <h5 className="mb-0">CHỌN KHU VỰC VÀ TASK PATH</h5>
        </Card.Header>
        <Card.Body>
          {/* Server Info */}
          <div className="mb-3">
            <strong>Server:</strong> {effectiveServerIP || 'Chưa cấu hình'}
            {selectedKhu === 'Supply' && taskData?.length > 0 && (
              <span className="badge bg-success ms-2">
                {taskData.length} ô có dữ liệu
              </span>
            )}
          </div>

          {/* User Info */}
          {currentUser && (
            <div className="mb-3">
              <strong>Đăng nhập với:</strong> {currentUser.username}
              {isAdmin() && <span className="badge bg-danger ms-2">Admin</span>}
            </div>
          )}

          {/* Khu Selection as Grid */}
          <Form.Label><strong>Chọn Khu Vực:</strong></Form.Label>
          <div className="m">
            <div className="row">
              {Object.entries(dynamicKhuConfig).map(([key, config]) => (
                <div className="col-6 col-sm-5" key={key}>
                  <div
                    className={`text-white grid-task ${selectedKhu === key ? 'bg-primary' : ''}`}
                    onClick={() => setSelectedKhu(key)}
                    style={{
                      backgroundColor: selectedKhu === key ? '#007bff' : '#14a65f',
                      height: '60px',
                      marginLeft: '20px',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      borderRadius: '6px',
                      fontWeight: 'bold',
                      fontSize: '1.3rem',
                      cursor: 'pointer'
                    }}
                  >
                    <div>{config.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Hiển thị grid cho cả Supply và Demand */}
          {(selectedKhu === 'Supply' || selectedKhu === 'Demand') && (
            <div className="bg-light p-3 rounded">
              <div className="row">{renderGrid()}</div>
            </div>
          )}
          
          {/* Success Modal */}
          {renderSuccessModal()}

          {/* Context Menu cho Grid */}
          {(selectedKhu === 'Supply' || selectedKhu === 'Demand') && (
            <ContextMenu
              show={contextMenu.show}
              onHide={handleContextMenuHide}
              cellData={contextMenu.cellData}
              currentKhu={selectedKhu}
              serverIPs={serverIPs}
              onUpdateSuccess={loadTaskData}
              position={contextMenu.position}
            />
          )}
        </Card.Body>
      </Card>
    </div>
  );
};

export default MobileGridDisplay;