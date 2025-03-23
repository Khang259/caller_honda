import React, { useState } from 'react';
import { Card, Nav, Tab, Alert, Modal, Button } from 'react-bootstrap';
//import { useSettings } from '../contexts/SettingsComponent';
import { useSettings } from "../contexts/SettingsContext";
import { sendData,defaultServers, checkServerConnection } from '../services/api';

const AllKhuDisplay = () => {
    const { khu4Config, khu5Config, serverIPs, inputServerIP, setAlertMessage, setShowAlert } = useSettings();
    const effectiveServerIPs = Array.isArray(serverIPs) && serverIPs.length > 0
        ? serverIPs.filter(ip => ip && typeof ip === 'string')
        : ['127.0.0.1:8000'];
    const effectiveServers = effectiveServerIPs.map((ip, index) => ({
        serverIP: ip,
        endpoint: index === 0 ? '/submit-data' : '/ics/taskOrder/addTask'
    }));

    const isConfigSaved = inputServerIP === effectiveServerIPs.join(', ');
    const [selectedCell, setSelectedCell] = useState(null);
    const [selectedKhu, setSelectedKhu] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [sendResult, setSendResult] = useState({ success: false, message: '' });
    const [cellStates, setCellStates] = useState({});

    const handleCellClick = (cellNumber, khu) => {
        console.log(`✅ Ô ${cellNumber} (${khu}) được nhấn`);
        if (!isConfigSaved) {
            setAlertMessage('Vui lòng lưu cấu hình server trước khi gửi dữ liệu!');
            setShowAlert(true);
            return;
        }

        setSelectedCell(cellNumber);
        setSelectedKhu(khu);
        setShowModal(true);

        console.log("📌 Trước khi gọi `handleSubmit`");
        handleSubmit(); // Kiểm tra nếu `handleSubmit` được gọi
    };

    const handleClose = () => {
        setShowModal(false);
        setSendResult({ success: false, message: '' });
    };

    const handleSubmit = async () => {
        console.log("📤 Đang gửi dữ liệu...");
        if (isSending) return;
    
        setIsSending(true);
        try {
            const config = selectedKhu === "khu4" ? khu4Config : khu5Config;
            const key = selectedKhu === "khu4" ? "khu4GridData" : "khu5GridData";
            const savedData = localStorage.getItem(key);
            const gridData = savedData ? JSON.parse(savedData) : [];
    
            const columns = config.columns || (selectedKhu === "khu4" ? 4 : 5);
            const rowIndex = Math.floor((selectedCell - 1) / columns);
            const colIndex = (selectedCell - 1) % columns;
    
            let cellData;
            if (gridData[rowIndex] && gridData[rowIndex][colIndex]) {
                cellData = JSON.parse(gridData[rowIndex][colIndex].value);
            } else {
                cellData = {
                    modelProcessCode: "a",
                    fromSystem: "MS_2",
                    orderId: `thado_${selectedCell}`,
                    taskOrderDetail: [
                        {
                            taskPath: "10000007",
                            shelfNumber: "WAGON 1"
                        }
                    ]
                };
            }
    
            const orderCount = parseInt(localStorage.getItem("orderCount") || "1", 10);
            cellData.orderId = `thado_${orderCount}`;
            localStorage.setItem("orderCount", orderCount + 1);
    
            // Kiểm tra kết nối server trước khi gửi
            const activeServers = [];
            for (const server of effectiveServers) {
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
    
            // Gửi dữ liệu với activeServers
            await sendDataWrapper(cellData, selectedCell, selectedKhu, null, activeServers);
    
            setCellStates(prev => ({
                ...prev,
                [`${selectedKhu}-${selectedCell}`]: 'bg-success'
            }));
    
            setTimeout(() => {
                handleClose();
            }, 2000);
    
            setTimeout(() => {
                setCellStates(prev => ({
                    ...prev,
                    [`${selectedKhu}-${selectedCell}`]: 'bg-info'
                }));
            }, 4000);
        } catch (error) {
            console.error("❌ Lỗi khi gửi dữ liệu:", error);
            setSendResult({
                success: false,
                message: `Lỗi: ${error.message}`
            });
            setCellStates(prev => ({
                ...prev,
                [`${selectedKhu}-${selectedCell}`]: 'bg-danger'
            }));
    
            setTimeout(() => {
                handleClose();
            }, 2000);
    
            setTimeout(() => {
                setCellStates(prev => ({
                    ...prev,
                    [`${selectedKhu}-${selectedCell}`]: 'bg-info'
                }));
            }, 4000);
        } finally {
            setIsSending(false);
        }
    };
    
    const sendDataWrapper = async (data, cellNumber, khu, extraData, servers) => {
        try {
            const results = await sendData(data, cellNumber, khu, extraData, servers);
    
            const allSuccess = results.every(result => result.success);
            if (allSuccess) {
                setSendResult({
                    success: true,
                    message: `Gửi dữ liệu ô ${cellNumber} (${khu}) thành công đến tất cả server!`
                });
            } else {
                const failedServers = results
                    .filter(result => !result.success)
                    .map(result => `${result.serverIP}${result.endpoint}: ${result.error}`)
                    .join(', ');
                setSendResult({
                    success: false,
                    message: `Gửi thất bại đến một số server: ${failedServers}`
                });
            }
        } catch (error) {
            setSendResult({
                success: false,
                message: `Lỗi: ${error.message}`
            });
        }
    };
    
    

    const renderKhu4Grid = () => {
        const gridRows = khu4Config.rows || 4;
        const gridCols = khu4Config.columns || 4;
        const totalCells = khu4Config.cells || gridRows * gridCols;

        const gridItems = [];
        for (let i = 1; i <= Math.min(totalCells, gridRows * gridCols); i++) {
            const cellState = cellStates[`khu4-${i}`] || 'bg-info';
            gridItems.push(
                <div className="col-6 col-sm-4 col-md-3 col-lg-2 col-xl-2" key={i}>
                    <div
                        className={`${cellState} text-white grid-cell`}
                        onClick={() => handleCellClick(i, 'khu4')}
                        style={{ height: '80px', margin: '5px', display: 'flex', justifyContent: 'center', alignItems: 'center', borderRadius: '8px', fontWeight: 'bold', fontSize: '18px', cursor: 'pointer' }}
                    >
                        {i}
                    </div>
                </div>
            );
        }
        return gridItems;
    };

    const renderKhu5Grid = () => {
        const gridRows = khu5Config.rows || 5;
        const gridCols = khu5Config.columns || 5;
        const totalCells = khu5Config.cells || gridRows * gridCols;

        const gridItems = [];
        for (let i = 1; i <= Math.min(totalCells, gridRows * gridCols); i++) {
            const cellState = cellStates[`khu5-${i}`] || 'bg-success';
            gridItems.push(
                <div className="col-6 col-sm-4 col-md-3 col-lg-2 col-xl-2" key={i}>
                    <div
                        className={`${cellState} text-white grid-cell`}
                        onClick={() => handleCellClick(i, 'khu5')}
                        style={{ height: '80px', margin: '5px', display: 'flex', justifyContent: 'center', alignItems: 'center', borderRadius: '8px', fontWeight: 'bold', fontSize: '18px', cursor: 'pointer' }}
                    >
                        {i}
                    </div>
                </div>
            );
        }
        return gridItems;
    };

    return (
        <div className="w-100">
            <Card className="w-100">
                <Card.Header className="bg-light">
                    <h5 className="mb-0">HIỂN THỊ TẤT CẢ KHU</h5>
                </Card.Header>
                <Card.Body>
                    <div className="mb-3">
                        <strong>Server:</strong> {effectiveServerIPs.join(', ')}
                        {!isConfigSaved && (
                            <Alert variant="warning" className="mt-2">
                                Cảnh báo: Bạn đã thay đổi địa chỉ server nhưng chưa lưu cấu hình!
                            </Alert>
                        )}
                    </div>

                    <Tab.Container id="khu-tabs" defaultActiveKey="khu4">
                        <Nav variant="tabs" className="mb-3">
                            <Nav.Item>
                                <Nav.Link eventKey="khu4">KHU 4</Nav.Link>
                            </Nav.Item>
                            <Nav.Item>
                                <Nav.Link eventKey="khu5">KHU 5</Nav.Link>
                            </Nav.Item>
                        </Nav>
                        <Tab.Content>
                            <Tab.Pane eventKey="khu4">
                                <div className="bg-light p-3 rounded">
                                    <div className="mb-3">
                                        <strong>Cấu hình KHU 4:</strong> {khu4Config.rows} hàng × {khu4Config.columns} cột ({khu4Config.cells} ô)
                                    </div>
                                    <div className="row">
                                        {renderKhu4Grid()}
                                    </div>
                                </div>
                            </Tab.Pane>
                            <Tab.Pane eventKey="khu5">
                                <div className="bg-light p-3 rounded">
                                    <div className="mb-3">
                                        <strong>Cấu hình KHU 5:</strong> {khu5Config.rows} hàng × {khu5Config.columns} cột ({khu5Config.cells} ô)
                                    </div>
                                    <div className="row">
                                        {renderKhu5Grid()}
                                    </div>
                                </div>
                            </Tab.Pane>
                        </Tab.Content>
                    </Tab.Container>
                </Card.Body>
            </Card>

            <Modal show={showModal} onHide={handleClose}>
                <Modal.Header closeButton>
                    <Modal.Title>Xác nhận - Ô số {selectedCell} ({selectedKhu?.toUpperCase()})</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {sendResult.message ? (
                        <div className={`alert ${sendResult.success ? 'alert-success' : 'alert-danger'}`}>
                            {sendResult.message}
                        </div>
                    ) : (
                        <p>Bạn có chắc chắn muốn gửi dữ liệu từ ô số {selectedCell} ({selectedKhu?.toUpperCase()}) không?</p>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleClose}>
                        Đóng
                    </Button>
                    {!sendResult.message && (
                        <Button
                            variant="primary"
                            onClick={handleSubmit}
                            disabled={isSending}
                        >
                            {isSending ? 'Đang gửi...' : 'Gửi dữ liệu'}
                        </Button>
                    )}
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default AllKhuDisplay;