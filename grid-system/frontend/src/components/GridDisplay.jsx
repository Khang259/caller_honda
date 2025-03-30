import React, { useState, useEffect } from 'react';
import { Card, Modal, Button, Form } from 'react-bootstrap';
import { useHistory } from '../contexts/HistoryContext';
import { useAuth } from '../contexts/AuthContext';
import { sendData, defaultServers } from '../services/api.js';
import { useSettings } from "../contexts/SettingsContext";

const GridDisplay = ({ gridData }) => {
    const { currentUser, isAdmin } = useAuth();
    const { serverIPs, SupplyAndDemandConfig, SupplyConfig, DemandConfig, activeKhu } = useSettings();
    const validKhus = ['SupplyAndDemand', 'Supply', 'Demand'];
    const currentKhu = validKhus.includes(activeKhu) ? activeKhu : 'SupplyAndDemand';
    const { addHistory } = useHistory();

    const [cellStates, setCellStates] = useState({});
    const [isSending, setIsSending] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [selectedCell, setSelectedCell] = useState(null);
    const [sendResult, setSendResult] = useState({ success: false, message: '' });
    const [taskData, setTaskData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const config = currentKhu === 'SupplyAndDemand' ? SupplyAndDemandConfig : 
                   currentKhu === 'Supply' ? SupplyConfig : DemandConfig;

    const khuMap = {
        'SupplyAndDemand': 'CẤP&TRẢ HÀNG',
        'Supply': 'CẤP HÀNG',
        'Demand': 'TRẢ HÀNG'
    };

    // Tải dữ liệu từ FastAPI (Redis) thay vì file JSON
    useEffect(() => {
        const fetchTaskData = async () => {
            setLoading(true);
            setError(null);
            const startTime = Date.now();
        
            try {
                const response = await fetch(`http://192.168.1.5:8000/get-task-data/${currentKhu}`, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' },
                });
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                const result = await response.json();
                const duration = (Date.now() - startTime) / 1000; // Giây
                console.log(`📦 Kết quả từ server (mất ${duration.toFixed(3)}s):`, result);
                if (result.status === 'success') {
                    setTaskData(result.data);
                    console.log(`✅ Dữ liệu từ Redis (${currentKhu}):`);
                } else {
                    throw new Error(result.message);
                }
            } catch (error) {
                console.error(`❌ Lỗi khi tải dữ liệu từ Redis (${currentKhu}):`, error);
                setError(error.message);
                setTaskData([]);
            } finally {
                const duration = (Date.now() - startTime) / 1000;
                console.log(`🏁 Hoàn tất fetchTaskData, tổng thời gian: ${duration.toFixed(3)}s`);
                setLoading(false);
            }
        };
    
        fetchTaskData();
    }, [currentKhu]);

    const handleCellClick = (cellNumber) => {
        console.log(`🖱️ Ô được chọn: cell-${cellNumber}`);
        setSelectedCell(cellNumber);
        setShowModal(true);
    };

    const handleClose = () => {
        setShowModal(false);
        setSendResult({ success: false, message: '' });
    };

    const handleSendSignal = async () => {
        console.log('📊 Dữ liệu taskData:', taskData);
    
        if (isSending) {
            console.log('⏳ Đang gửi, bỏ qua...');
            return;
        }
    
        try {
            setIsSending(true);
            console.log('🔍 Tìm dữ liệu cho ô:', `cell-${selectedCell}`);
    
            const selectedData = taskData.find(item => item.cell === `cell-${selectedCell}`);
            console.log('📦 Dữ liệu tìm thấy:', selectedData);
    
            if (!selectedData) {
                throw new Error(`Không thể tìm thấy dữ liệu cho ô ${selectedCell} trong dữ liệu từ Redis`);
            }
    
            const jsonData = selectedData.value;
            console.log('📋 Dữ liệu JSON từ Redis:', jsonData);
    
            const response = await fetch('http://192.168.1.5:8000/getOrderCount');
            if (!response.ok) {
                throw new Error('Không thể lấy orderCount từ server');
            }
            const { orderCount } = await response.json();
            const newOrderId = `Sptech_${orderCount}`;
            console.log('🆔 Order ID mới:', newOrderId);
    
            const reorderedData = {
                modelProcessCode: jsonData.modelProcessCode || "1302",
                fromSystem: jsonData.fromSystem || "thadosoft",
                orderId: newOrderId,
                taskOrderDetail: jsonData.taskOrderDetail || [
                    {
                        taskPath: ""
                    }
                ]
            };
            console.log("🚀 Dữ liệu chuẩn bị gửi:", reorderedData);
    
            const servers = serverIPs.map((ip, index) => {
                if (index === 0) {
                    return { serverIP: ip, endpoint: defaultServers[0].endpoint };
                } else {
                    return { serverIP: ip, endpoint: defaultServers[1].endpoint };
                }
            });
            console.log('🌐 Danh sách server:', servers);
    
            const results = await sendData(reorderedData, null, null, null, servers, serverIPs);
            console.log('📤 Kết quả gửi:', results);
    
            const serverList = servers.map(s => `${s.serverIP}${s.endpoint}`).join(', ');
            addHistory(`Đã gửi tín hiệu: Ô ${selectedCell} - Dữ liệu: ${JSON.stringify(reorderedData)} - Đến: ${serverList}`, currentKhu);
    
            // Lưu lịch sử vào grid_history (Redis và MongoDB)
            const cellLabel = currentKhu === 'SupplyAndDemand' && selectedCell <= 14
                ? `MS_${selectedCell.toString().padStart(2, '0')}`
                : `MS_${selectedCell}`; // Điều chỉnh cellLabel theo logic của bạn
            await fetch('http://192.168.1.5:8000/submit-data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cell: cellLabel,
                    action: 'clicked',
                    timestamp: new Date().toISOString()
                })
            });
    
            const allSuccess = results.every(result => result.success);
            if (allSuccess) {
                setSendResult({
                    success: true,
                    message: `Đã gửi tín hiệu từ ô ${selectedCell} thành công đến tất cả server!`
                });
    
                setCellStates(prev => ({
                    ...prev,
                    [selectedCell]: 'bg-success'
                }));
            } else {
                const failedServers = results
                    .filter(result => !result.success)
                    .map(result => `${result.serverIP}${result.endpoint}: ${result.error}`)
                    .join(', ');
    
                setSendResult({
                    success: false,
                    message: `Gửi thất bại đến một số server: ${failedServers}`
                });
    
                setCellStates(prev => ({
                    ...prev,
                    [selectedCell]: 'bg-danger'
                }));
                console.log('❌ Gửi thất bại:', failedServers);
            }
    
            setTimeout(() => {
                handleClose();
            }, 2000);
    
            setTimeout(() => {
                setCellStates(prev => ({
                    ...prev,
                    [selectedCell]: 'bg-info'
                }));
            }, 4000);
    
        } catch (error) {
            setSendResult({
                success: false,
                message: `Lỗi: ${error.message}`
            });
    
            console.error("❌ Lỗi khi gửi dữ liệu:", error);
            setCellStates(prev => ({
                ...prev,
                [selectedCell]: 'bg-danger'
            }));
    
            setTimeout(() => {
                handleClose();
            }, 2000);
    
            setTimeout(() => {
                setCellStates(prev => ({
                    ...prev,
                    [selectedCell]: 'bg-info'
                }));
            }, 4000);
        } finally {
            setIsSending(false);
            console.log('🏁 Kết thúc gửi tín hiệu');
        }
    };

    const renderGrid = () => {
        if (loading) {
            return <div>Đang tải dữ liệu...</div>;
        }

        if (error) {
            return <div>Lỗi: {error}</div>;
        }

        const cells = [];

        let totalCellsToShow; // Khai báo biến trước
        if (currentKhu === 'SupplyAndDemand') {
            totalCellsToShow = 22;
        } else if (currentKhu === 'Supply') { // Thay bằng điều kiện cụ thể nếu có
            totalCellsToShow = 26;
        } else if (currentKhu === 'Demand') {
            totalCellsToShow = 23;
        }

        const disabledCells = {
            'SupplyAndDemand': [],  // 1, 2, 8, 9, 10, 11
            'Supply': [], // 3, 4, 5, 6, 7, 12, 13, 14, 20, 21
            'Demand': []  // 3, 4, 5, 6, 7, 11, 12, 13, 14, 17, 18
        };

        for (let i = 1; i <= totalCellsToShow; i++) {
            const cellState = cellStates[i] || 'bg-info';
            const cellData = taskData.find(item => item.cell === `cell-${i}`);
            const cellValue = cellData ? cellData.value.taskOrderDetail[0]?.taskPath : i;

            let cellLabel;
            let isDisabled = disabledCells[currentKhu] ? disabledCells[currentKhu].includes(i) : false;

            if (currentKhu === 'SupplyAndDemand') {
                if (i <= 14) {
                    cellLabel = `MS_${i.toString().padStart(2, '0')}`;
                } else if (i === 15) {
                    cellLabel = `MS_15`;
                } else if (i === 16 || i === 17) {
                    cellLabel = `MS_${i}`;
                } else {
                    const ptIndex = i - 17;
                    cellLabel = `PA_${ptIndex.toString().padStart(2, '0')}`;
                }
            } else if (currentKhu === 'Demand') {
                if (i <= 14) {
                    cellLabel = `MS_${i.toString().padStart(2, '0')}`;
                } else if (i >= 15 && i <= 16) {
                    const j = i - 14;
                    cellLabel = `MS_15_${j}`;
                } else if (i === 17 || i === 18) {
                    const msIndex = i - 1;
                    cellLabel = `MS_${msIndex}`;
                } else {
                    const ptIndex = i - 18;
                    cellLabel = `PA_${ptIndex.toString().padStart(2, '0')}`;
                }
            } else {
                if (i <= 14) {
                    cellLabel = `MS_${i.toString().padStart(2, '0')}`;
                } else if (i >= 15 && i <= 19) {
                    const j = i - 14;
                    cellLabel = `MS_15_${j}`;
                } else if (i === 20 || i === 21) {
                    const msIndex = i - 4;
                    cellLabel = `MS_${msIndex}`;
                } else {
                    const ptIndex = i - 21;
                    cellLabel = `PA_${ptIndex.toString().padStart(2, '0')}`;
                }
            }

            cells.push(
                <div className="col-6 col-sm-4 col-md-3 col-lg-2 col-xl-2" key={i}>
                    <div
                        id={`cell-${i}`}
                        className={`${cellState} text-white grid-cell ${isDisabled ? 'disabled' : ''}`}
                        onClick={() => !isDisabled && handleCellClick(i)}
                        style={{
                            height: '80px',
                            margin: '5px',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            borderRadius: '8px',
                            fontWeight: 'bold',
                            fontSize: '16px',
                            cursor: isDisabled ? 'not-allowed' : 'pointer',
                            opacity: isDisabled ? 0.5 : 1
                        }}
                    >
                        <div>
                            <div>{cellLabel}</div>
                        </div>
                    </div>
                </div>
            );
        }

        return cells;
    };

    return (
        <div className="w-100">
            <Card className="w-100">
                <Card.Header className="bg-light">
                    <h5 className="mb-0">KHU VỰC {khuMap[currentKhu]}</h5>
                </Card.Header>
                <Card.Body>
                    <div className="mb-3">
                        <strong>Server:</strong> {serverIPs.join(', ')}
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
                        <>
                            <p>Bạn có chắc chắn muốn gửi tín hiệu từ ô số {selectedCell} không?</p>
                        </>
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
        </div>
    );
};

export default GridDisplay;