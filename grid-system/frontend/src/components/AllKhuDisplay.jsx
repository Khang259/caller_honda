import React, { useState } from 'react';
import { Card, Nav, Tab, Alert, Modal, Button } from 'react-bootstrap';
import { useSettings } from "../contexts/SettingsContext";
import { sendData, defaultServers } from '../services/api';

const AllKhuDisplay = () => {
    const { SupplyAndDemandConfig, SupplyConfig, DemandConfig, serverIPs, inputServerIP, setAlertMessage, setShowAlert } = useSettings();
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
            const config = selectedKhu === "SupplyAndDemand" ? SupplyAndDemandConfig : selectedKhu === "Supply" ? SupplyConfig : DemandConfig;
            const key = selectedKhu === "SupplyAndDemand" ? "SupplyAndDemandGridData" : selectedKhu === "Supply" ? "SupplyGridData" : "DemandGridData";
            const savedData = localStorage.getItem(key);
            const gridData = savedData ? JSON.parse(savedData) : [];

            const columns = config.columns || (selectedKhu === "SupplyAndDemand" ? 4 : 5);
            const rowIndex = Math.floor((selectedCell - 1) / columns);
            const colIndex = (selectedCell - 1) % columns;

            let cellData;
            if (gridData[rowIndex] && gridData[rowIndex][colIndex]) {
                cellData = JSON.parse(gridData[rowIndex][colIndex].value);
            } else {
                cellData = {
                    modelProcessCode: "1301",
                    fromSystem: "thadosoft",
                    orderId: `thadosoft_${selectedCell}`,
                    taskOrderDetail: [
                        {
                            taskPath: "",
                        }
                    ]
                };
            }

            const orderCount = parseInt(localStorage.getItem("orderCount") || "1", 10);
            cellData.orderId = `thado_${orderCount}`;
            localStorage.setItem("orderCount", orderCount + 1);

            // Gửi dữ liệu trực tiếp bằng sendData mà không kiểm tra kết nối
            const results = await sendData(cellData, selectedCell, selectedKhu, null, effectiveServers);

            const serverList = effectiveServers.map(s => `${s.serverIP}${s.endpoint}`).join(', ');

            const allSuccess = results.every(result => result.success);
            if (allSuccess) {
                setSendResult({
                    success: true,
                    message: `Gửi dữ liệu ô ${selectedCell} thành công đến tất cả server!`
                });
                setCellStates(prev => ({
                    ...prev,
                    [`${selectedKhu}-${selectedCell}`]: 'bg-success'
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
                    [`${selectedKhu}-${selectedCell}`]: 'bg-danger'
                }));
            }

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

    const getCellLabel = (i) => {
        if (i <= 17) {
            return `MS_${i.toString().padStart(2, '0')}`;
        } else {
            const ptIndex = i - 17;
            return `PA_${ptIndex.toString().padStart(2, '0')}`;
        }
    };

    const renderSupplyAndDemandGrid = () => {
        const gridRows = SupplyAndDemandConfig.rows || 4;
        const gridCols = SupplyAndDemandConfig.columns || 4;
        const totalCells = SupplyAndDemandConfig.cells || gridRows * gridCols;

        const gridItems = [];
        for (let i = 1; i <= Math.min(totalCells, gridRows * gridCols); i++) {
            const cellState = cellStates[`SupplyAndDemand-${i}`] || 'bg-info';
            const cellLabel = getCellLabel(i);
            gridItems.push(
                <div className="col-6 col-sm-4 col-md-3 col-lg-2 col-xl-2" key={i}>
                    <div
                        className={`${cellState} text-white grid-cell`}
                        onClick={() => handleCellClick(i, 'SupplyAndDemand')}
                        style={{ height: '80px', margin: '5px', display: 'flex', justifyContent: 'center', alignItems: 'center', borderRadius: '8px', fontWeight: 'bold', fontSize: '18px', cursor: 'pointer' }}
                    >
                        {cellLabel}
                    </div>
                </div>
            );
        }
        return gridItems;
    };

    const renderSupplyGrid = () => {
        const gridRows = SupplyConfig.rows || 5;
        const gridCols = SupplyConfig.columns || 5;
        const totalCells = SupplyConfig.cells || gridRows * gridCols;

        const gridItems = [];
        for (let i = 1; i <= Math.min(totalCells, gridRows * gridCols); i++) {
            const cellState = cellStates[`Supply-${i}`] || 'bg-info';
            const cellLabel = getCellLabel(i);
            gridItems.push(
                <div className="col-6 col-sm-4 col-md-3 col-lg-2 col-xl-2" key={i}>
                    <div
                        className={`${cellState} text-white grid-cell`}
                        onClick={() => handleCellClick(i, 'Supply')}
                        style={{ height: '80px', margin: '5px', display: 'flex', justifyContent: 'center', alignItems: 'center', borderRadius: '8px', fontWeight: 'bold', fontSize: '18px', cursor: 'pointer' }}
                    >
                        {cellLabel}
                    </div>
                </div>
            );
        }
        return gridItems;
    };

    const renderDemandGrid = () => {
        const gridRows = DemandConfig.rows || 5;
        const gridCols = DemandConfig.columns || 5;
        const totalCells = DemandConfig.cells || gridRows * gridCols;

        const gridItems = [];
        for (let i = 1; i <= Math.min(totalCells, gridRows * gridCols); i++) {
            const cellState = cellStates[`Demand-${i}`] || 'bg-info';
            const cellLabel = getCellLabel(i);
            gridItems.push(
                <div className="col-6 col-sm-4 col-md-3 col-lg-2 col-xl-2" key={i}>
                    <div
                        className={`${cellState} text-white grid-cell`}
                        onClick={() => handleCellClick(i, 'Demand')}
                        style={{ height: '80px', margin: '5px', display: 'flex', justifyContent: 'center', alignItems: 'center', borderRadius: '8px', fontWeight: 'bold', fontSize: '18px', cursor: 'pointer' }}
                    >
                        {cellLabel}
                    </div>
                </div>
            );
        }
        return gridItems;
    };

    const getSelectedCellLabel = () => {
        if (!selectedCell) return '';
        return getCellLabel(selectedCell);
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

                        <Tab.Container id="khu-tabs" defaultActiveKey="SupplyAndDemand">
                            <Nav variant="tabs" className="mb-3">
                                <Nav.Item>
                                    <Nav.Link eventKey="SupplyAndDemand">CẤP&TRẢ HÀNG</Nav.Link>
                                </Nav.Item>
                                <Nav.Item>
                                    <Nav.Link eventKey="Supply">CẤP HÀNG</Nav.Link>
                                </Nav.Item>
                                <Nav.Item>
                                    <Nav.Link eventKey="Demand">TRẢ HÀNG</Nav.Link>
                                </Nav.Item>
                            </Nav>
                            <Tab.Content>
                                <Tab.Pane eventKey="SupplyAndDemand">
                                    <div className="bg-light p-3 rounded">
                                        <div className="mb-3">
                                            <strong>CẤP&TRẢ HÀNG</strong>
                                        </div>
                                        <div className="row">
                                            {renderSupplyAndDemandGrid()}
                                        </div>
                                    </div>
                                </Tab.Pane>
                                <Tab.Pane eventKey="Supply">
                                    <div className="bg-light p-3 rounded">
                                        <div className="mb-3">
                                            <strong>CẤP HÀNG</strong>
                                        </div>
                                        <div className="row">
                                            {renderSupplyGrid()}
                                        </div>
                                    </div>
                                </Tab.Pane>
                                <Tab.Pane eventKey="Demand">
                                    <div className="bg-light p-3 rounded">
                                        <div className="mb-3">
                                            <strong>TRẢ HÀNG</strong>
                                        </div>
                                        <div className="row">
                                            {renderDemandGrid()}
                                        </div>
                                    </div>
                                </Tab.Pane>
                            </Tab.Content>
                        </Tab.Container>
                    </div>
                </Card.Body>
            </Card>

                <Modal show={showModal} onHide={handleClose}>
                    <Modal.Header closeButton>
                        <Modal.Title>Xác nhận - Ô {getSelectedCellLabel()} ({selectedKhu?.toUpperCase()})</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        {sendResult.message ? (
                            <div className={`alert ${sendResult.success ? 'alert-success' : 'alert-danger'}`}>
                                {sendResult.message}
                            </div>
                        ) : (
                            <p>Bạn có chắc chắn muốn gửi dữ liệu từ ô {getSelectedCellLabel()} không?</p>
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