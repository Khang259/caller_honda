import React, { useState } from 'react';
import { Card, Modal, Button, Form } from 'react-bootstrap';
//import { useSettings } from '../contexts/SettingsComponent';
import { useHistory } from '../contexts/HistoryContext';
import { useAuth } from '../contexts/AuthContext';
import { sendData, defaultServers, checkServerConnection } from '../services/api.js';
import { useSettings } from "../contexts/SettingsContext";

const GridDisplay = ({ gridData }) => {
    const { currentUser, isAdmin } = useAuth();
    const { serverIPs, khu4Config, khu5Config, activeKhu } = useSettings();
    const currentKhu = activeKhu || 'khu4';
    const { addHistory } = useHistory();

    const [cellStates, setCellStates] = useState({});
    const [isSending, setIsSending] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [selectedCell, setSelectedCell] = useState(null);
    const [sendResult, setSendResult] = useState({ success: false, message: '' });
    const [cellData, setCellData] = useState({});

    const config = currentKhu === 'khu4' ? khu4Config : khu5Config;

    const handleCellClick = (cellNumber) => {
        setSelectedCell(cellNumber);
        setShowModal(true);
    };

    const handleClose = () => {
        setShowModal(false);
        setSendResult({ success: false, message: '' });
    };

    const handleSendSignal = async () => {
        if (isSending) return;
    
        try {
            setIsSending(true);
    
            const savedData = localStorage.getItem("khu4GridData");
            let parsedGridData = savedData ? JSON.parse(savedData) : [];
    
            if (!Array.isArray(parsedGridData) || parsedGridData.length === 0) {
                throw new Error("Dữ liệu trong localStorage trống hoặc không hợp lệ.");
            }
    
            const rows = parsedGridData.length;
            const columns = parsedGridData[0].length;
    
            const rowIndex = Math.floor((selectedCell - 1) / columns);
            const colIndex = (selectedCell - 1) % columns;
    
            if (rowIndex >= rows || colIndex >= columns) {
                throw new Error("Vị trí ô không hợp lệ trong gridData.");
            }
    
            const selectedData = parsedGridData[rowIndex][colIndex];
            let jsonString = selectedData?.value || '{}';
    
            let jsonData;
            try {
                jsonData = JSON.parse(jsonString);
            } catch (error) {
                throw new Error("Dữ liệu không phải JSON hợp lệ.");
            }
    
            const orderCount = parseInt(localStorage.getItem("orderCount") || "1", 10);
            const newOrderId = `thado_${orderCount}`;
            localStorage.setItem("orderCount", orderCount + 1);
    
            const reorderedData = {
                modelProcessCode: jsonData.modelProcessCode || "test2",
                fromSystem: jsonData.fromSystem || "MS_2",
                orderId: newOrderId,
                taskOrderDetail: jsonData.taskOrderDetail || [
                    {
                        taskPath: "10000000",
                        shelfNumber: "WAGON 1"
                    }
                ]
            };
    
            console.log("🚀 Dữ liệu chuẩn bị gửi:", reorderedData);
            console.log(`📩 Ô đang gửi: ${selectedCell} - Vị trí [${rowIndex}][${colIndex}]`);
    
            const servers = serverIPs.map((ip, index) => {
                if (index === 0) {
                    return { serverIP: ip, endpoint: defaultServers[0].endpoint };
                } else {
                    return { serverIP: ip, endpoint: defaultServers[1].endpoint };
                }
            });
    
            const activeServers = [];
            for (const server of servers) {
                const { serverIP, endpoint } = server;
                const isConnected = await checkServerConnection(serverIP, endpoint, 'HEAD');
                if (isConnected) {
                    activeServers.push(server);
                } else {
                    console.warn(`Server ${serverIP} không hoạt động, bỏ qua.`);
                }
            }
    
            if (activeServers.length === 0) {
                throw new Error('Không có server nào hoạt động để gửi dữ liệu.');
            }
    
            // Truyền serverIPs vào sendData
            const results = await sendData(reorderedData, null, null, null, activeServers, serverIPs);
    
            const serverList = activeServers.map(s => `${s.serverIP}${s.endpoint}`).join(', ');
            addHistory(`Đã gửi tín hiệu: Ô ${selectedCell} - Dữ liệu: ${JSON.stringify(reorderedData)} - Đến: ${serverList}`, currentKhu);
    
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
        }
    };

    const renderGrid = () => {
        const cells = [];

        for (let i = 1; i <= config.cells; i++) {
            const cellState = cellStates[i] || 'bg-info';

            const cellValue = gridData && gridData.flat()[i - 1]?.value ? gridData.flat()[i - 1].value : i;

            let cellLabel;
            if (i <= 15) {
                cellLabel = `MS_${i.toString().padStart(2, '0')}`;
            } else {
                const ptIndex = i - 15;
                cellLabel = `PT_${ptIndex.toString().padStart(2, '0')}`;
            }

            cells.push(
                <div className="col-6 col-sm-4 col-md-3 col-lg-2 col-xl-2" key={i}>
                    <div
                        id={`cell-${i}`}
                        className={`${cellState} text-white grid-cell`}
                        onClick={() => handleCellClick(i)}
                        style={{
                            height: '80px',
                            margin: '5px',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            borderRadius: '8px',
                            fontWeight: 'bold',
                            fontSize: '16px',
                            cursor: 'pointer'
                        }}
                    >
                        {cellLabel}
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
                    <h5 className="mb-0">KHU {currentKhu === 'khu4' ? '4' : '5'} - HIỂN THỊ LƯỚI</h5>
                </Card.Header>
                <Card.Body>
                    <div className="mb-3">
                        <strong>Cấu hình:</strong> {config.cells} ô
                    </div>
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