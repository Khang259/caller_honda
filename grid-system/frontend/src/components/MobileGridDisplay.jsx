import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button, Form, Alert, Spinner } from 'react-bootstrap';
import { useHistory } from '../contexts/HistoryContext';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { useTasks } from '../contexts/TaskContext';
import { sendTaskSignal } from '../services/task';
import { sendData } from '../services/api';
import { fetchConfig } from '../services/config';

// Constants
const KHU_CONFIG = {
  // SupplyAndDemand: {
  //   label: 'CẤP&TRẢ HÀNG',
  //   collection: 'task_path_supply', // Sửa collection name
  //   maxElements: 4
  // },
  Supply: {
    label: 'CẤP HÀNG',
    collection: 'task_path_supply', // Sửa collection name
    maxElements: 2
  },
  Demand: {
    label: 'TRẢ TRỐNG',
    collection: 'task_path_supply', // Sửa collection name
    maxElements: 2
  }
};

const MobileGridDisplay = () => {
  // Context hooks
  const { currentUser, isAdmin } = useAuth();
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

  // Thêm state cho popup
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Derived values
  const effectiveServerIP = serverIPs && serverIPs.length > 0 ? serverIPs[0] : null;
  const effectiveServerIPICS = serverIPs && serverIPs.length > 1 ? serverIPs[1] : null;
  const currentKhuConfig = selectedKhu ? KHU_CONFIG[selectedKhu] : null;
  // Sửa logic isSetupComplete - chỉ cần kiểm tra khu và elements
  const isSetupComplete = selectedKhu && 
    taskPathElements.length > 0 && 
    Object.keys(selectedElements).length === taskPathElements.length &&
    Object.values(selectedElements).every(value => value.trim() !== ''); // Kiểm tra tất cả values không rỗng

  // Load task path elements when khu changes
  useEffect(() => {
    if (selectedKhu && currentKhuConfig) {
      loadTaskPathElements();
    }
  }, [selectedKhu]);

  // Reset selections when khu changes
  useEffect(() => {
    setTaskPathElements([]);
    setSelectedElements({});
    setSelectedCell('');
    setAvailableCells([]);
    setCheckResult(null);
    setSendResult(null);
  }, [selectedKhu]);

  // Thêm debug log cho state changes
  useEffect(() => {
    console.log('🔍 Debug - selectedKhu changed:', selectedKhu);
    console.log('🔍 Debug - currentKhuConfig:', currentKhuConfig);
  }, [selectedKhu, currentKhuConfig]);

  useEffect(() => {
    console.log('🔍 Debug - taskPathElements changed:', taskPathElements);
    console.log('🔍 Debug - selectedElements changed:', selectedElements);
  }, [taskPathElements, selectedElements]);

  // Load task path elements from database
  const loadTaskPathElements = useCallback(async () => {
    if (!effectiveServerIP || !currentKhuConfig) return;

    setIsLoading(true);
    try {
      const apiUrl = `http://${effectiveServerIP}/api/grid/options/${selectedKhu}`;
      console.log('🔗 API URL:', apiUrl);
      
      const response = await fetch(apiUrl);
      console.log(' Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Response error:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const optionsData = await response.json();
      console.log('📊 Raw options data:', optionsData);
      
      if (optionsData.status === "success" && optionsData.data && optionsData.data.steps) {
        console.log('✅ Data structure is valid');
        
        const elements = Object.entries(optionsData.data.steps).map(([stepKey, stepData], index) => {
          console.log(`📋 Processing ${stepKey}:`, stepData);
          return {
            id: index + 1,
            value: '',
            label: stepData.label || `Bước ${index + 1}`,
            options: stepData.options || []
          };
        });
        
        console.log('🔧 Setting taskPathElements:', elements);
        setTaskPathElements(elements);
        
        // Reset selectedElements khi thay đổi khu
        setSelectedElements({});
        
        console.log(`✅ Tạo ${elements.length} dropdown cho khu ${selectedKhu}`);
      } else {
        throw new Error(`Dữ liệu options không hợp lệ - status: ${optionsData.status}, data: ${!!optionsData.data}`);
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
  }, [selectedKhu, currentKhuConfig, effectiveServerIP]);

  // Thêm debug log để kiểm tra taskPathElements
  useEffect(() => {
    console.log('🔍 Debug - taskPathElements changed:', taskPathElements);
    console.log('🔍 Debug - taskPathElements.length:', taskPathElements.length);
  }, [taskPathElements]);

  // Thêm error boundary và retry logic
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  // Cập nhật checkSetupAvailability để gửi payload đúng format
  const checkSetupAvailability = useCallback(async () => {
    if (!effectiveServerIPICS || !currentKhuConfig || !isSetupComplete) return;

    setIsChecking(true);
    setCheckResult(null);

    try {
      // Xác định modelProcessCode dựa trên khu được chọn
      let modelProcessCode = "1302"; // Default cho Supply và Demand
      if (selectedKhu === "SupplyAndDemand") {
        modelProcessCode = "1301"; // Cho CẤP&TRẢ HÀNG
      }

      // Lấy orderCount từ server IP đầu tiên và tạo orderId
      if (!effectiveServerIP) {
        throw new Error('Thiếu server IP đầu tiên để lấy orderCount');
      }
      const countResp = await fetch(`http://${effectiveServerIP}/getOrderCount`);
      if (!countResp.ok) {
        const text = await countResp.text();
        throw new Error(`Không thể lấy orderCount: HTTP ${countResp.status} - ${text}`);
      }
      const countJson = await countResp.json();
      if (countJson.status === 'error') {
        throw new Error(`Lỗi từ server getOrderCount: ${countJson.message || 'Không xác định'}`);
      }
      const { orderCount } = countJson;
      if (typeof orderCount === 'undefined') {
        throw new Error('Phản hồi getOrderCount không chứa orderCount');
      }
      const newOrderId = `Superlification_${orderCount}`;

      // Prepare payload đúng format như yêu cầu (giống GridDisplay)
      const payload = {
        modelProcessCode: modelProcessCode,
        fromSystem: "thadosoft",
        orderId: newOrderId,
        taskOrderDetail: [
          {
            taskPath: Object.values(selectedElements).join(',')
          }
        ]
      };

      // Gọi API /ics/taskOrder/addTask với server IP thứ hai
      const apiUrl = `http://${effectiveServerIPICS}/ics/taskOrder/addTask`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      console.log(' Response status:', response.status);
      console.log('📡 Response headers:', response.headers);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Response error:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('📊 Response data:', result);

      // Kiểm tra response code 1000 (thành công)
      if (result.code === 1000) {
        // Thành công - hiển thị popup
        setSuccessMessage('Gửi lệnh thành công!');
        setShowSuccessModal(true);
        
        // Reset form sau khi thành công
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
        // Thất bại - hiển thị lỗi
        setCheckResult({ 
          success: false, 
          message: `Lỗi từ server: ${result.message || 'Không xác định'}` 
        });
      }

    } catch (error) {
      console.error('❌ Lỗi khi gửi request:', error);
      setCheckResult({ 
        success: false, 
        message: `Lỗi: ${error.message}` 
      });
    } finally {
      setIsChecking(false);
    }
  }, [effectiveServerIP, effectiveServerIPICS, currentKhuConfig, isSetupComplete, selectedElements, selectedKhu]);

  // Send task signal
  const handleSendSignal = useCallback(async () => {
    if (!selectedCell || !isSetupComplete) return;

    setIsSending(true);
    setSendResult(null);

    try {
      // Prepare payload
      const payload = {
        cell: selectedCell,
        khu: selectedKhu,
        taskPath: Object.values(selectedElements).join(','),
        collection: currentKhuConfig.collection,
        timestamp: new Date().toISOString()
      };

      // Send to API
      const result = await sendTaskSignal(
        serverIPs,
        payload,
        selectedCell,
        selectedKhu,
        addTask,
        addHistoryRecord,
        () => {}, // setCellStates not needed for mobile
        () => {}, // handleClose not needed for mobile
        { [selectedKhu]: '#007bff' }, // default color
        () => {} // handleClose not needed for mobile
      );

      setSendResult(result);
      
      if (result.success) {
        // Reset form on success
        setSelectedKhu('');
        setTaskPathElements([]);
        setSelectedElements({});
        setSelectedCell('');
        setAvailableCells([]);
        setCheckResult(null);
      }
    } catch (error) {
      setSendResult({ success: false, message: `Lỗi: ${error.message}` });
    } finally {
      setIsSending(false);
    }
  }, [selectedCell, isSetupComplete, selectedKhu, selectedElements, currentKhuConfig, serverIPs, addTask, addHistoryRecord]);

  // Handle element selection
  const handleElementChange = useCallback((elementId, value) => {
    setSelectedElements(prev => ({
      ...prev,
      [elementId]: value
    }));
  }, []);

  // Handle cell selection
  const handleCellChange = useCallback((cell) => {
    setSelectedCell(cell);
  }, []);

  // Cải thiện render logic
  const renderCheckButton = useCallback(() => {
    if (!isSetupComplete) return null;
    
    return (
      <div className="mb-3">
        <Button
          variant="success" // Đổi màu thành success
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

  // Sửa render logic để đảm bảo dropdown hiển thị
  const renderTaskPathElements = useCallback(() => {
    console.log(' Debug - renderTaskPathElements called');
    console.log('🔍 Debug - taskPathElements in render:', taskPathElements);
    console.log('🔍 Debug - taskPathElements.length in render:', taskPathElements.length);
    
    if (!taskPathElements || taskPathElements.length === 0) {
      console.log('❌ No taskPathElements to render');
      return null;
    }
    
    console.log('✅ Rendering taskPathElements:', taskPathElements);
    
    return (
      <div className="mb-3">
        <Form.Label><strong>Chọn Task Path Elements:</strong></Form.Label>
        {taskPathElements.map((element) => {
          console.log('🔍 Rendering element:', element);
          return (
            <Form.Group key={element.id} className="mb-2">
              <Form.Label>{element.label}:</Form.Label>
              <Form.Select
                value={selectedElements[element.id] || ''}
                onChange={(e) => handleElementChange(element.id, e.target.value)}
              >
                <option value="">-- Chọn {element.label} --</option>
                {element.options && element.options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          );
        })}
      </div>
    );
  }, [taskPathElements, selectedElements, handleElementChange]);

  const renderSendButton = useCallback(() => {
    // Button hiển thị khi: có cell được chọn VÀ check thành công
    if (!selectedCell || !checkResult?.success) return null;
    
    return (
      <div className="mb-3">
        <Button
          variant="success"
          onClick={handleSendSignal}
          disabled={isSending}
          className="w-100"
        >
          {isSending ? (
            <>
              <Spinner animation="border" size="sm" className="me-2" />
              Đang gửi tín hiệu...
            </>
          ) : (
            `Gửi tín hiệu đến ${selectedCell}`
          )}
        </Button>
      </div>
    );
  }, [selectedCell, checkResult?.success, isSending, handleSendSignal]);

  // Thêm Success Modal
  const renderSuccessModal = useCallback(() => (
    <div
      className="modal fade show"
      style={{ display: showSuccessModal ? 'block' : 'none' }}
      tabIndex="-1"
    >
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header bg-success text-white">
            <h5 className="modal-title">
              <i className="bi bi-check-circle me-2"></i>
              Thành công!
            </h5>
            <button
              type="button"
              className="btn-close btn-close-white"
              onClick={() => setShowSuccessModal(false)}
            ></button>
          </div>
          <div className="modal-body text-center">
            <div className="mb-3">
              <i className="bi bi-check-circle text-success" style={{ fontSize: '3rem' }}></i>
            </div>
            <h6 className="text-success">{successMessage}</h6>
            <p className="text-muted">
              Task Path: {Object.values(selectedElements).join(', ')}
            </p>
          </div>
          <div className="modal-footer">
            <Button
              variant="success"
              onClick={() => setShowSuccessModal(false)}
              className="w-100"
            >
              Đóng
            </Button>
          </div>
        </div>
      </div>
      {/* Backdrop */}
      {showSuccessModal && (
        <div
          className="modal-backdrop fade show"
          onClick={() => setShowSuccessModal(false)}
        ></div>
      )}
    </div>
  ), [showSuccessModal, successMessage, selectedElements]);

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
              {Object.entries(KHU_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.label}
                </option>
              ))}
            </Form.Select>
          </Form.Group>

          {/* Task Path Elements */}
          {renderTaskPathElements()}

          {/* Debug Info */}
          {isSetupComplete && (
            <Alert variant="info" className="mb-3">
              <strong>Setup hoàn thành:</strong> {Object.values(selectedElements).join(', ')}
            </Alert>
          )}

          {/* Gửi lệnh Button (thay thế Kiểm tra Setup) */}
          {renderCheckButton()}

          {/* Check Result (chỉ hiển thị lỗi) */}
          {checkResult && !checkResult.success && (
            <Alert variant="danger" className="mb-3">
              {checkResult.message}
            </Alert>
          )}

          {/* Success Modal */}
          {renderSuccessModal()}
        </Card.Body>
      </Card>
    </div>
  );
};

export default MobileGridDisplay; 