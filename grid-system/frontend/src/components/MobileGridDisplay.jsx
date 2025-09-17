import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, Button, Form, Alert, Spinner, Modal, Dropdown } from 'react-bootstrap';
import { useHistory } from '../contexts/HistoryContext';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { useTasks } from '../contexts/TaskContext';
import { sendTaskSignal } from '../services/task';
import { fetchConfig } from '../services/config';
import { fetchTaskData } from '../services/grid';
import { formatSupplyCellLabel, formatDemandCellLabel } from '../utils/format';
import ContextMenu from './ContextMenu';
import '../styles/GridDisplay.css';
import '../styles/DropDownMenu.css';

const dynamicKhuConfig = {
  SupplyAndDemand: { label: 'CẤP & TRẢ', collection: 'supply_demand' },
  Supply: { label: 'CẤP', collection: 'supply' },
  Demand: { label: 'TRẢ', collection: 'demand' }
};

const useGridConfig = (serverIPs, username) => {
  const [gridConfig, setGridConfig] = useState(null);
  const [isConfigLoading, setIsConfigLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadConfig = useCallback(async () => {
    if (!serverIPs || serverIPs.length === 0 || !username) {
      setError('Không có IP server hoặc username hợp lệ.');
      setIsConfigLoading(false);
      return;
    }

    setIsConfigLoading(true);
    try {
      const configData = await fetchConfig(serverIPs[0], username);
      console.log('✅ Config từ MongoDB:', serverIPs[0], username);
      setGridConfig(configData);
    } catch (configError) {
      console.warn('⚠️ Không thể load cấu hình từ MongoDB', configError);
      setError(`Không thể tải cấu hình: ${configError.message}`);
    } finally {
      setIsConfigLoading(false);
    }
  }, [serverIPs, username]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  return { gridConfig, isConfigLoading, error };
};

const useTaskData = (serverIPs, activeKhu, username) => {
  const [supplyTaskData, setSupplyTaskData] = useState([]);
  const [demandTaskData, setDemandTaskData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const latestKhuRef = useRef(activeKhu);

  const loadTaskData = useCallback(async () => {
    if (!serverIPs || serverIPs.length === 0 || !activeKhu || !username) {
      setError('Không có IP server, khu vực, hoặc username hợp lệ.');
      setLoading(false);
      return;
    }

    const khuAtStart = activeKhu;
    latestKhuRef.current = activeKhu;
    setLoading(true);
    setError(null);

    try {
      if (activeKhu === 'SupplyAndDemand') {
        const supplyData = await fetchTaskData(serverIPs[0], 'Supply', username);
        const demandData = await fetchTaskData(serverIPs[0], 'Demand', username);
        if (latestKhuRef.current === khuAtStart) {
          setSupplyTaskData(supplyData);
          setDemandTaskData(demandData);
          console.log(`✅ Dữ liệu từ MongoDB (Supply):`, supplyData);
          console.log(`✅ Dữ liệu từ MongoDB (Demand):`, demandData);
        }
      } else {
        const data = await fetchTaskData(serverIPs[0], activeKhu, username);
        if (latestKhuRef.current === khuAtStart) {
          setSupplyTaskData(activeKhu === 'Supply' ? data : []);
          setDemandTaskData(activeKhu === 'Demand' ? data : []);
          console.log(`✅ Dữ liệu từ MongoDB (${activeKhu}):`, data);
        }
      }
    } catch (error) {
      if (latestKhuRef.current === khuAtStart) {
        setError(`Không thể tải dữ liệu từ MongoDB: ${error.message}`);
        setSupplyTaskData([]);
        setDemandTaskData([]);
      }
    } finally {
      if (latestKhuRef.current === khuAtStart) {
        setLoading(false);
      }
    }
  }, [serverIPs, activeKhu, username]);

  useEffect(() => {
    if (activeKhu) {
      loadTaskData();
    }
  }, [activeKhu, loadTaskData]);

  return { supplyTaskData, demandTaskData, loading, error, loadTaskData };
};

const MobileGridDisplay = () => {
  const { currentUser, isAdmin, isUserAE3, isUserAE4, isUserMainOvh } = useAuth();
  const { serverIPs } = useSettings();
  const { addTask, addHistory } = useTasks();
  const { addHistory: addHistoryRecord } = useHistory();
  const { gridConfig, isConfigLoading, error: configError } = useGridConfig(serverIPs, currentUser?.username);
  const [selectedKhu, setSelectedKhu] = useState('');
  const { supplyTaskData, demandTaskData, loading: taskLoading, error: taskError, loadTaskData } = useTaskData(
    serverIPs,
    selectedKhu,
    currentUser?.username
  );

  const [selectedCell, setSelectedCell] = useState('');
  const [selectedSupplyCell, setSelectedSupplyCell] = useState('');
  const [selectedDemandCell, setSelectedDemandCell] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [cellStates, setCellStates] = useState({});
  const [contextMenu, setContextMenu] = useState({
    show: false,
    cellData: null,
    position: { x: 0, y: 0 }
  });

  const effectiveServerIP = serverIPs && serverIPs.length > 0 ? serverIPs[0] : null;
  const currentKhuConfig = gridConfig && selectedKhu ? gridConfig[selectedKhu + 'Config'] : null;
  const totalCells = currentKhuConfig ? currentKhuConfig.cells : 0;

  const checkSetup = useCallback(() => {
    return selectedSupplyCell && selectedDemandCell;
  }, [selectedSupplyCell, selectedDemandCell]);

  const handleCellClick = useCallback(
    (cellNumber) => {
      console.log(`🖱️ Ô được chọn: cell-${cellNumber} cho khu ${selectedKhu}`);
      setSelectedCell(cellNumber);
      setSendResult(null);
      setShowSuccessModal(true);
    },
    [selectedKhu]
  );

  const handleContextMenuHide = useCallback(() => {
    setContextMenu((prev) => ({ ...prev, show: false }));
  }, []);

  const handleSendSignalGrid = useCallback(async (cellNumber, khu, taskData) => {
    if (isSending) {
      console.log('Debug - Bỏ qua handleSendSignalGrid: đang gửi');
      return { success: false, message: 'Đang gửi, vui lòng đợi.' };
    }
    setIsSending(true);
    setSendResult(null);
    try {
      console.log(`Debug - Bắt đầu handleSendSignalGrid cho khu: ${khu}, cell: ${cellNumber}`);
      const selectedData = taskData.find((item) => item.cell === `cell-${cellNumber}`);
      if (!selectedData) {
        if (taskData.length === 0) {
          throw new Error(`Không có dữ liệu trong MongoDB cho khu vực ${khu}. Vui lòng kiểm tra lại sau.`);
        } else {
          throw new Error(`Không tìm thấy dữ liệu cho ô ${cellNumber} trong MongoDB. Có thể ô này chưa được cập nhật.`);
        }
      }

      let taskPath = selectedData.value?.taskOrderDetail?.[0]?.taskPath || '';
      if (!taskPath) {
        throw new Error(`Không tìm thấy taskPath cho ô ${cellNumber}`);
      }

      const payload = {
        modelProcessCode: khu === 'Supply' ? 'capxeAE3' : 'capxeAE3',
        fromSystem: 'thadosoft',
        cell: cellNumber,
        khu: khu,
        taskPath: taskPath,
        collection: khu.toLowerCase(),
        timestamp: new Date().toISOString(),
        taskOrderDetail: [{ taskPath: taskPath }]
      };

      const apiUrl = serverIPs.map((ip, index) => {
        const endpoint = index === 0 ? '/submit-data' : '/ics/out/endTask';
        return `http://${ip}${endpoint}`;
      });

      console.log('🔍 Debug - handleSendSignalGrid API:', {
        apiUrls: apiUrl,
        endpoints: serverIPs.map((_, index) => (index === 0 ? '/submit-data' : '/ics/out/endTask')),
        payload: JSON.stringify(payload)
      });

      const result = await sendTaskSignal(
        serverIPs,
        payload,
        cellNumber,
        khu,
        addTask,
        addHistoryRecord,
        setCellStates,
        () => {},
        { [khu]: '#14a65f' }
      );

      if (result.success) {
        setSendResult(result);
        setTimeout(() => {
          setShowSuccessModal(false);
          setSendResult(null);
        }, 2000);
      }

      return result;
    } catch (error) {
      console.error(`❌ Lỗi handleSendSignalGrid (${khu}, cell-${cellNumber}):`, error);
      setCellStates((prev) => ({ ...prev, [`cell-${cellNumber}`]: 'bg-danger' }));
      setTimeout(() => {
        setCellStates((prev) => ({ ...prev, [`cell-${cellNumber}`]: '#14a65f' }));
      }, 4000);
      return { success: false, message: `Lỗi: ${error.message}` };
    } finally {
      setIsSending(false);
    }
  }, [isSending, serverIPs, addTask, addHistoryRecord]);

  const handleSendDoubleTask = useCallback(async () => {
    if (!checkSetup()) {
      setSendResult({ success: false, message: 'Vui lòng chọn cả ô Supply và Demand.' });
      return;
    }

    setIsSending(true);
    setSendResult(null);

    try {
      const supplyResult = await handleSendSignalGrid(selectedSupplyCell, 'Supply', supplyTaskData);
      if (!supplyResult.success) {
        setSendResult({ success: false, message: `Lỗi khi gửi task Supply: ${supplyResult.message}` });
        return;
      }

      const demandResult = await handleSendSignalGrid(selectedDemandCell, 'Demand', demandTaskData);
      if (!demandResult.success) {
        setSendResult({ success: false, message: `Lỗi khi gửi task Demand: ${demandResult.message}` });
        return;
      }

      setSendResult({ success: true, message: 'Gửi task Supply và Demand thành công!' });
    } catch (error) {
      console.error('❌ Lỗi handleSendDoubleTask:', error);
      setSendResult({ success: false, message: `Lỗi: ${error.message}` });
    } finally {
      setIsSending(false);
    }
  }, [selectedSupplyCell, selectedDemandCell, checkSetup, supplyTaskData, demandTaskData, handleSendSignalGrid]);

  const renderGridCell = useCallback(
    (cellNumber) => {
      const cellKey = `cell-${cellNumber}`;
      const cellState = cellStates[cellKey] || '#14a65f';
      const taskData = selectedKhu === 'Supply' ? supplyTaskData : demandTaskData;
      const cellData = taskData.find((item) => item.cell === cellKey);
      let cellLabel;
      if (selectedKhu === 'Supply') {
        cellLabel = formatSupplyCellLabel(cellNumber, selectedKhu, isUserAE3(), isUserAE4(), isUserMainOvh());
      } else if (selectedKhu === 'Demand') {
        cellLabel = formatDemandCellLabel(cellNumber, selectedKhu, isUserAE3(), isUserAE4(), isUserMainOvh());
      } else {
        cellLabel = cellData?.value?.taskOrderDetail?.[0]?.taskPath || `Cell ${cellNumber}`;
      }

      let backgroundColor = cellState;
      if (selectedKhu === 'Demand' && isUserMainOvh() && !cellState.startsWith('bg-')) {
        backgroundColor = '#dc3545';
      }

      return (
        <div className="col-4 col-sm-3" key={cellNumber}>
          <div
            id={cellKey}
            className="text-white grid-cell"
            onClick={() => handleCellClick(cellNumber)}
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
    },
    [cellStates, supplyTaskData, demandTaskData, selectedKhu, isUserMainOvh, handleCellClick]
  );

  const renderDropdownMenus = useCallback(() => {
    if (!gridConfig || !gridConfig.SupplyConfig || !gridConfig.DemandConfig) {
      return (
        <Alert variant="warning">
          Không có cấu hình cho khu vực Supply hoặc Demand
        </Alert>
      );
    }

    const supplyCells = Array.from({ length: gridConfig.SupplyConfig.cells }, (_, i) => i + 1);
    const demandCells = Array.from({ length: gridConfig.DemandConfig.cells }, (_, i) => i + 1);

    return (
      <div className="d-flex flex-column gap-4">
        <div className="dropdown-container">
          <Form.Label className="dropdown-label">
            <strong>Chọn điểm cấp hàng:</strong>
          </Form.Label>
          <Dropdown onSelect={(cell) => {
            setSelectedSupplyCell(cell);
            setSelectedCell(cell);
          }}>
            <Dropdown.Toggle 
              as="button" 
              variant="primary" 
              id="dropdown-supply"
              className="dropdown-toggle-custom"
            >
              <span>
                {selectedSupplyCell ? formatSupplyCellLabel(selectedSupplyCell, 'Supply', isUserAE3(), isUserAE4(), isUserMainOvh()) : 'Chọn điểm cấp hàng'}
              </span>
            </Dropdown.Toggle>
            <Dropdown.Menu className="dropdown-menu-custom">
              {supplyCells.map((cellNumber) => {
                const cellData = supplyTaskData.find((item) => item.cell === `cell-${cellNumber}`);
                const label = (() => {
                  const formatLabel = formatSupplyCellLabel(cellNumber, 'Supply', isUserAE3(), isUserAE4(), isUserMainOvh());
                  const taskPath = cellData?.value?.taskOrderDetail?.[0]?.taskPath;
                  return taskPath ? `${formatLabel} - ${taskPath}` : formatLabel;
                })(); 
                return (
                  <Dropdown.Item 
                    key={cellNumber} 
                    eventKey={cellNumber}
                    className="dropdown-item-custom"
                  >
                    {label}
                  </Dropdown.Item>
                );
              })}
            </Dropdown.Menu>
          </Dropdown>
        </div>

        <div className="dropdown-container">
          <Form.Label className="dropdown-label">
            <strong>Chọn điểm trả hàng:</strong>
          </Form.Label>
          <Dropdown onSelect={(cell) => {
            setSelectedDemandCell(cell);
            setSelectedCell(cell);
          }}>
            <Dropdown.Toggle 
              as="button" 
              variant="primary" 
              id="dropdown-demand"
              className="dropdown-toggle-custom"
            >
              <span>
                {selectedDemandCell ? formatDemandCellLabel(selectedDemandCell, 'Demand', isUserAE3(), isUserAE4(), isUserMainOvh()) : 'Chọn điểm trả hàng'}
              </span>
            </Dropdown.Toggle>
            <Dropdown.Menu className="dropdown-menu-custom">
              {demandCells.map((cellNumber) => {
                const cellData = demandTaskData.find((item) => item.cell === `cell-${cellNumber}`);
                const label = (() => {
                  const formatLabel = formatDemandCellLabel(cellNumber, 'Demand', isUserAE3(), isUserAE4(), isUserMainOvh());
                  const taskPath = cellData?.value?.taskOrderDetail?.[0]?.taskPath;
                  return taskPath ? `${formatLabel} - ${taskPath}` : formatLabel;
                })();
                return (
                  <Dropdown.Item 
                    key={cellNumber} 
                    eventKey={cellNumber}
                    className="dropdown-item-custom"
                  >
                    {label}
                  </Dropdown.Item>
                );
              })}
            </Dropdown.Menu>
          </Dropdown>
        </div>

        {checkSetup() && (
          <Button
            variant="success"
            onClick={handleSendDoubleTask}
            disabled={isSending}
            className="mt-3 w-100"
            style={{
              padding: '12px 24px',
              fontSize: '1rem',
              fontWeight: '600',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(40, 167, 69, 0.2)',
              transition: 'all 0.3s ease'
            }}
          >
            {isSending ? 'Đang gửi...' : 'Gửi lệnh'}
          </Button>
        )}

        {sendResult && (
          <Alert 
            variant={sendResult.success ? 'success' : 'danger'} 
            className="mt-3"
            style={{
              borderRadius: '8px',
              border: 'none',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
            }}
          >
            {sendResult.message}
          </Alert>
        )}
      </div>
    );
  }, [gridConfig, supplyTaskData, demandTaskData, selectedSupplyCell, selectedDemandCell, checkSetup, isSending, sendResult, isUserAE3, isUserAE4, isUserMainOvh]);

  const renderGrid = useCallback(() => {
    if (isConfigLoading || taskLoading) {
      return (
        <div className="text-center">
          <Spinner animation="border" />
          <div>Đang tải dữ liệu...</div>
        </div>
      );
    }
    if (configError || taskError) {
      return <Alert variant="danger">{configError || taskError}</Alert>;
    }
    if (!selectedKhu || !currentKhuConfig || totalCells === 0) {
      return (
        <div className="text-center text-muted">
          <div className="mb-2">
            <i className="bi bi-database-x fs-1"></i>
          </div>
          <div>Không có cấu hình cho khu vực {selectedKhu || 'chưa chọn'}</div>
        </div>
      );
    }

    if (selectedKhu === 'SupplyAndDemand') {
      return renderDropdownMenus();
    }

    return <div className="row">{Array.from({ length: totalCells }, (_, index) => renderGridCell(index + 1))}</div>;
  }, [isConfigLoading, taskLoading, configError, taskError, selectedKhu, currentKhuConfig, totalCells, renderGridCell, renderDropdownMenus]);

  const renderSuccessModal = useCallback(
    () => (
      <Modal show={showSuccessModal} onHide={() => setShowSuccessModal(false)} centered>
        <Modal.Header closeButton className="bg-success text-white">
          <Modal.Title>
            <i className="bi bi-check-circle me-2"></i>
            Xác nhận - Ô số {selectedCell}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center">
          <p>Bạn có chắc chắn muốn gửi tín hiệu từ ô số {selectedCell} không?</p>
          {sendResult && (
            <div className={`alert ${sendResult.success ? 'alert-success' : 'alert-danger'}`}>
              {sendResult.message}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowSuccessModal(false)} className="w-100">
            Đóng
          </Button>
          {!sendResult?.message && (
            <Button
              variant="primary"
              onClick={() => handleSendSignalGrid(selectedCell, selectedKhu, selectedKhu === 'Supply' ? supplyTaskData : demandTaskData)}
              disabled={isSending}
              className="w-100 mt-2"
            >
              {isSending ? 'Đang gửi...' : 'Gửi tín hiệu'}
            </Button>
          )}
        </Modal.Footer>
      </Modal>
    ),
    [showSuccessModal, selectedCell, sendResult, isSending, selectedKhu, supplyTaskData, demandTaskData, handleSendSignalGrid]
  );

  return (
    <div className="w-100">
      <Card className="w-100">
        <Card.Header className="bg-light">
          <h5 className="mb-0">CHỌN KHU VỰC VÀ TASK PATH</h5>
        </Card.Header>
        <Card.Body>
          <div className="mb-3">
            <strong>Server:</strong> {effectiveServerIP || 'Chưa cấu hình'}
            {selectedKhu && currentKhuConfig && (
              <span className="badge bg-info ms-2">{totalCells} ô</span>
            )}
          </div>

          {currentUser && (
            <div className="mb-3">
              <strong>Đăng nhập với:</strong> {currentUser.username}
              {isAdmin() && <span className="badge bg-danger ms-2">Admin</span>}
            </div>
          )}

          <Form.Label>
            <strong>Chọn Khu Vực:</strong>
          </Form.Label>
          <div className="mb-3">
            <div className="row">
              {Object.entries(dynamicKhuConfig).map(([key, config]) => (
                <div className="col-4 col-sm-5" key={key}>
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

          {selectedKhu && <div className="bg-light p-3 rounded">{renderGrid()}</div>}

          {renderSuccessModal()}

          {selectedKhu && (
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