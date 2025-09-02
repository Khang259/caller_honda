import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Card, Button, Form, Alert, Spinner, Modal } from 'react-bootstrap';
import { useHistory } from '../contexts/HistoryContext';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { useTasks } from '../contexts/TaskContext';
import { sendTaskSignal } from '../services/task';
import { fetchConfig } from '../services/config';
import { formatCellLabel } from '../utils/format';
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
  const { currentUser, isAdmin, isUserAE3, isUserAE4 } = useAuth();
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
  const [isChecking, setIsChecking] = useState(false);
  const [checkResult, setCheckResult] = useState(null);
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
  const effectiveServerIPICS = serverIPs && serverIPs.length > 1 ? serverIPs[1] : null;
  const currentKhuConfig = selectedKhu ? dynamicKhuConfig[selectedKhu] : null;
  const isSetupComplete = useMemo(() => {
    // Chỉ cần chọn 1 option là đủ để hiển thị nút gửi
    const result = selectedKhu && 
      taskPathElements.length > 0 && 
      Object.keys(selectedElements).length > 0 &&
      Object.values(selectedElements).some(value => value.trim() !== '');
    console.log('🔍 Debug - isSetupComplete:', {
      selectedKhu,
      hasTaskPathElements: taskPathElements.length > 0,
      selectedElementsCount: Object.keys(selectedElements).length,
      taskPathElementsCount: taskPathElements.length,
      hasAnyElementSelected: Object.values(selectedElements).some(value => value.trim() !== ''),
      result
    });
    return result;
  }, [selectedKhu, taskPathElements, selectedElements]);

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
      const apiUrl = `http://${effectiveServerIP}/api/grid/options/${selectedKhu}?username=${currentUser.username}`;
      console.log('🔗 API URL:', apiUrl);
      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const optionsData = await response.json();
      console.log('Dữ liệu optionsData là:',optionsData)
      if (optionsData.data && optionsData.data.steps) {
        const elements = Object.entries(optionsData.data.steps).map(([stepKey, stepData], index) => ({
          id: index + 1,
          value: '',
          label: stepData.label || `Bước ${index + 1}`,
          options: stepData.options || []
        }));
        setTaskPathElements(elements);
        setSelectedElements({});
        console.log('✅ Đã tải taskPathElements:', elements);
      } else {
        throw new Error('Dữ liệu options không hợp lệ');
      }
    } catch (error) {
      console.error('❌ Lỗi khi tải task path elements:', error);
      const elements = Array.from({ length: currentKhuConfig.maxElements }, (_, index) => ({
        id: index + 1,
        value: '',
        label: `Bước ${index + 1}`,
        options: []
      }));
      setTaskPathElements(elements);
    } finally {
      setIsLoading(false);
    }
  }, [selectedKhu, currentKhuConfig, effectiveServerIP, currentUser]);

  // Load task data for grid
  const loadTaskData = useCallback(async () => {
    if (!effectiveServerIP || !selectedKhu || selectedKhu !== 'Supply' || !currentUser || isTaskDataLoaded.current) {
      return;
    }
    setIsLoading(true);
    try {
      const apiUrl = `http://${effectiveServerIP}/get-task-data/${selectedKhu}?username=${currentUser.username}`;
      console.log('🔗 Fetching task data from:', apiUrl);
      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (data.status === 'success' && Array.isArray(data.data)) {
        if (JSON.stringify(data.data) !== JSON.stringify(taskData)) {
          setTaskData(data.data);
          console.log(`✅ Dữ liệu từ MongoDB (${selectedKhu}):`, data.data);
        } else {
          console.log('🔍 Debug - taskData không thay đổi, bỏ qua setTaskData');
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
      if (selectedKhu === 'Supply') {
        loadGridConfig();
        loadTaskData();
      }
    }
  }, [selectedKhu, currentKhuConfig, loadTaskPathElements, loadGridConfig, loadTaskData]);

  // Reset selections khi khu thay đổi
  useEffect(() => {
    console.log('🔍 Debug - Reset state khi selectedKhu thay đổi');
    setTaskPathElements([]);
    setSelectedElements({});
    setSelectedCell('');
    setAvailableCells([]);
    setCheckResult(null);
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
    console.log(`🖱️ Ô được chọn: cell-${cellNumber}`);
    setSelectedCell(cellNumber);
    setSendResult(null);
    setShowSuccessModal(true);
  }, []);

  // Handle right-click cho context menu
  const handleCellRightClick = useCallback((e, cellNumber) => {
    e.preventDefault();
    const cellData = taskData.find(item => item.cell === `cell-${cellNumber}`);
    setContextMenu({
      show: true,
      cellData: cellData,
      position: { x: e.clientX, y: e.clientY }
    });
  }, [taskData]);

  // Handle context menu hide
  const handleContextMenuHide = useCallback(() => {
    setContextMenu(prev => ({ ...prev, show: false }));
  }, []);

  // Check setup availability (cho chế độ dropdown)
  const checkSetupAvailability = useCallback(async () => {
    if (!effectiveServerIPICS || !currentKhuConfig || !isSetupComplete || !currentUser) {
      console.log('🔍 Debug - Bỏ qua checkSetupAvailability: thiếu điều kiện', {
        effectiveServerIPICS,
        currentKhuConfig,
        isSetupComplete,
        currentUser
      });
      return;
    }
    setIsChecking(true);
    setCheckResult(null);
    try {
      console.log('🔍 Debug - Bắt đầu checkSetupAvailability');
      const countResp = await fetch(`http://${effectiveServerIP}/getOrderCount`);
      if (!countResp.ok) throw new Error(`HTTP ${countResp.status}`);
      const countJson = await countResp.json();
      if (countJson.status === 'error') throw new Error(countJson.message);
      const newOrderId = `Superlification_${countJson.orderCount}`;

      let taskPath = Object.values(selectedElements).join(',');

      if (isUserAE3()) {
        taskPath += ', 10000671';
        console.log('🔍 Debug - User AE3: thêm 10000671 vào taskPath');
      } else if (isUserAE4()) {
        taskPath += ', 10000670';
        console.log('🔍 Debug - User AE4: thêm 10000670 vào taskPath');
      }
      const payload = {
        modelProcessCode: "capxeAE34",
        fromSystem: "thadosoft",
        orderId: newOrderId,
        taskOrderDetail: [{ taskPath: Object.values(selectedElements).join(',') }]
      };
      const apiUrl = `http://${effectiveServerIPICS}/ics/taskOrder/addTask`;
      console.log('🔍 Debug - checkSetupAvailability API:', { apiUrl, payload: JSON.stringify(payload) });
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      if (response.code === 200) {
        setSuccessMessage('Gửi lệnh thành công!');
        setShowSuccessModal(true);
        setTimeout(() => {
          setSelectedKhu('');
          setTaskPathElements([]);
          setSelectedElements({});
          setSelectedCell('');
          setAvailableCells([]);
          setCheckResult(null);
          setShowSuccessModal(false);
        }, 2000);
      } else {
        setCheckResult({ success: false, message: `Lỗi từ server: ${result.message}` });
      }
    } catch (error) {
      console.error('❌ Lỗi checkSetupAvailability:', error);
      setCheckResult({ success: false, message: `Lỗi: ${error.message}` });
    } finally {
      setIsChecking(false);
    }
  }, [effectiveServerIP, effectiveServerIPICS, currentKhuConfig, isSetupComplete, selectedElements, selectedKhu, currentUser, isUserAE3, isUserAE4]);

  // Send task signal cho grid (mới, giống GridDisplay.jsx)
  const handleSendSignalGrid = useCallback(async () => {
    if (isSending) {
      console.log('🔍 Debug - Bỏ qua handleSendSignalGrid: đang gửi');
      return;
    }
    setIsSending(true);
    setSendResult(null);
    try {
      console.log('🔍 Debug - Bắt đầu handleSendSignalGrid');
      const selectedData = taskData.find(item => item.cell === `cell-${selectedCell}`);
      if (!selectedData) {
        if (taskData.length === 0) {
          throw new Error(`Không có dữ liệu trong MongoDB cho khu vực ${currentKhuConfig.label}. Vui lòng kiểm tra lại sau.`);
        } else {
          throw new Error(`Không tìm thấy dữ liệu cho ô ${selectedCell} trong MongoDB. Có thể ô này chưa được cập nhật.`);
        }
      }
      const taskPath = selectedData.value?.taskOrderDetail?.[0]?.taskPath || '';
      if (!taskPath) {
        throw new Error(`Không tìm thấy taskPath cho ô ${selectedCell}`);
      }
      const payload = {
        cell: selectedCell,
        khu: selectedKhu,
        taskPath: taskPath,
        collection: currentKhuConfig.collection,
        timestamp: new Date().toISOString()
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
        currentKhuConfig.khu,
        addTask,
        addHistoryRecord,
        setCellStates,
        () => setShowSuccessModal(false),
        { [currentKhuConfig.khu]: '#14a65f' }
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
  }, [isSending, taskData, selectedCell, currentKhuConfig, serverIPs, addTask, addHistoryRecord]);

  // Send task signal cho dropdown (giữ nguyên cho Demand)
  const handleSendSignal = useCallback(async () => {
    console.log('🔍 Debug - handleSendSignal called', {
      selectedCell,
      isSetupComplete,
      selectedKhu,
      taskPathElements,
      selectedElements
    });
    if (!selectedCell || !isSetupComplete || selectedKhu !== 'Demand') {
      console.log('🔍 Debug - Bỏ qua handleSendSignal: thiếu điều kiện', {
        selectedCell,
        isSetupComplete,
        selectedKhu
      });
      return;
    }
    setIsSending(true);
    setSendResult(null);
    try {
      console.log('🔍 Debug - Bắt đầu handleSendSignal');
      const selectedData = taskData.find(item => item.cell === `cell-${selectedCell}`);
      if (!selectedData) throw new Error(`Không tìm thấy dữ liệu cho ô ${selectedCell}`);
      const payload = {
        cell: selectedCell,
        khu: selectedKhu,
        taskPath: Object.values(selectedElements).join(','),
        collection: currentKhuConfig.collection,
        timestamp: new Date().toISOString()
      };
      const apiUrl = serverIPs.map((ip, index) => {
        const endpoint = index === 0 ? '/submit-data' : '/ics/out/endTask';
        return `http://${ip}${endpoint}`;
      });
      console.log('🔍 Debug - handleSendSignal API:', {
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
      if (result.success) {
        setSelectedKhu('');
        setTaskPathElements([]);
        setSelectedElements({});
        setSelectedCell('');
        setAvailableCells([]);
        setCheckResult(null);
      }
    } catch (error) {
      console.error('❌ Lỗi handleSendSignal:', error);
      setSendResult({ success: false, message: `Lỗi: ${error.message}` });
    } finally {
      setIsSending(false);
    }
  }, [selectedCell, isSetupComplete, selectedKhu, selectedElements, currentKhuConfig, serverIPs, addTask, addHistoryRecord, taskData]);

  // Handle element selection cho dropdown
  const handleElementChange = useCallback((elementId, value) => {
    console.log('🔍 Debug - handleElementChange:', { elementId, value });
    setSelectedElements(prev => ({ ...prev, [elementId]: value }));
  }, []);

  // Render grid cell
  const renderGridCell = useCallback((cellNumber) => {
    const cellState = cellStates[cellNumber] || '#14a65f';
    const cellData = taskData.find(item => item.cell === `cell-${cellNumber}`);
    const cellLabel = formatCellLabel(cellNumber, selectedKhu);

    return (
      <div className="col-4 col-sm-3" key={cellNumber}>
        <div
          id={`cell-${cellNumber}`}
          className="text-white grid-cell"
          onClick={() => handleCellClick(cellNumber)}
          onContextMenu={(e) => handleCellRightClick(e, cellNumber)}
          style={{
            backgroundColor: cellState.startsWith('bg-') ? undefined : cellState,
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
  }, [cellStates, taskData, handleCellClick, handleCellRightClick, selectedKhu]);

  // Render grid cho Supply
  const renderGrid = useCallback(() => {
    console.log('🔍 Debug - renderGrid called');
    if (isLoading) return <div className="text-center">Đang tải dữ liệu ...</div>;
    if (!taskData || taskData.length === 0) {
      return (
        <div className="text-center text-muted">
          <div className="mb-2">
            <i className="bi bi-database-x fs-1"></i>
          </div>
          <div>Không có dữ liệu cho khu vực {currentKhuConfig.label}</div>
        </div>
      );
    }
    const totalCells = getTotalCells();
    console.log('🔍 Debug - totalCells:', totalCells);
    return Array.from({ length: totalCells }, (_, index) => renderGridCell(index + 1));
  }, [isLoading, taskData, currentKhuConfig, renderGridCell]);

  // Render task path elements cho dropdown (chỉ cho Demand)
  const renderTaskPathElements = useCallback(() => {
    if (!taskPathElements || taskPathElements.length === 0) return null;
    
    // Tạo options từ tất cả các bước
    const allOptions = taskPathElements.map((element, index) => {
      const firstOption = element.options && element.options.length > 0 ? element.options[0] : '';
      return {
        value: firstOption,
        label: `${element.label}: ${firstOption}`
      };
    });
    
    // Giá trị mặc định là phần tử đầu tiên của bước đầu tiên
    const defaultValue = allOptions.length > 0 ? allOptions[0].value : '';
    
    return (
      <div className="mb-3">
        <Form.Label><strong>Chọn vị trí trả trống:</strong></Form.Label>
        <Form.Group className="mb-2">
          <Form.Label>Vị trí:</Form.Label>
          <Form.Select
            value={selectedElements[1] || defaultValue}
            onChange={(e) => handleElementChange(1, e.target.value)}
          >
            <option value="">Vị trí lấy xe trả trống</option>
            {allOptions.map((option, index) => (
              <option key={index} value={option.value}>
                {option.label}
              </option>
            ))}
          </Form.Select>
        </Form.Group>
      </div>
    );
  }, [taskPathElements, selectedElements, handleElementChange]);

  // Render check button (cho Demand)
  const renderCheckButton = useCallback(() => {
    if (!isSetupComplete) return null;
    console.log('🔍 Debug - renderCheckButton called');
    return (
      <div className="mb-3">
        <Button
          variant="success"
          onClick={checkSetupAvailability}
          disabled={isChecking}
          className="w-100"
        >
          {isChecking ? (
            <>
              <Spinner animation="border" size="sm" className="me-2" />
              Đang gửi lệnh...
            </>
          ) : (
            `Gửi lệnh với Task Path: ${Object.values(selectedElements).join(',')}`
          )}
        </Button>
      </div>
    );
  }, [isSetupComplete, isChecking, selectedElements, checkSetupAvailability]);

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
          {selectedKhu === 'Supply' ? `Xác nhận - Ô số ${selectedCell}` : 'Thành công!'}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="text-center">
        {selectedKhu === 'Supply' ? (
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
        {selectedKhu === 'Supply' && !sendResult?.message && (
          <Button
            variant="primary"
            onClick={handleSendSignalGrid}
            disabled={isSending}
            className="w-100 mt-2"
          >
            {isSending ? 'Đang gửi...' : 'Gửi tín hiệu'}
          </Button>
        )}
        {selectedKhu === 'Demand' && !sendResult?.message && (
          <Button
            variant="primary"
            onClick={checkSetupAvailability}
            disabled={isChecking}
            className="w-100 mt-2"
          >
            {isChecking ? 'Đang gửi...' : 'Gửi lệnh'}
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  ), [showSuccessModal, successMessage, selectedElements, selectedKhu, selectedCell, sendResult, isSending, isChecking, checkSetupAvailability, handleSendSignalGrid]);

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

          {/* Khu Selection */}
          <Form.Group className="mb-3">
            <Form.Label><strong>Chọn Khu Vực:</strong></Form.Label>
            <Form.Select
              value={selectedKhu}
              onChange={(e) => setSelectedKhu(e.target.value)}
              disabled={isLoading}
            >
              <option value="">-- Chọn khu vực --</option>
              {Object.entries(dynamicKhuConfig).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.label}
                </option>
              ))}
            </Form.Select>
          </Form.Group>

          {/* Hiển thị dropdown chỉ cho Demand */}
          {selectedKhu === 'Demand' && renderTaskPathElements()}

          {/* Hiển thị grid cho Supply */}
          {selectedKhu === 'Supply' && (
            <div className="bg-light p-3 rounded">
              <div className="row">{renderGrid()}</div>
            </div>
          )}

          {/* Debug Info */}
          {/* {isSetupComplete && selectedKhu === 'Demand' && (
            <Alert variant="info" className="mb-3">
              <strong>Setup hoàn thành:</strong> {Object.values(selectedElements).join(', ')}
            </Alert>
          )} */}

          {/* Gửi lệnh Button (cho dropdown mode, chỉ hiển thị khi Demand) */}
          {selectedKhu === 'Demand' && renderCheckButton()}

          {/* Check Result (chỉ hiển thị lỗi) */}
          {checkResult && !checkResult.success && (
            <Alert variant="danger" className="mb-3">
              {checkResult.message}
            </Alert>
          )}

          {/* Success Modal */}
          {renderSuccessModal()}

          {/* Context Menu cho Grid */}
          {selectedKhu === 'Supply' && (
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