import React, { useState, useEffect } from 'react';
import { Card, Modal, Button, Form } from 'react-bootstrap';
import { useHistory } from '../contexts/HistoryContext';
import { useAuth } from '../contexts/AuthContext';
import { sendData, defaultServers } from '../services/api.js';
import { useSettings } from "../contexts/SettingsContext";

const GridDisplay = ({ gridData }) => {
    const { currentUser, isAdmin } = useAuth();
    const { serverIPs, SupplyAndDemandConfig, SupplyConfig, DemandConfig, activeKhu } = useSettings();
    // Đảm bảo currentKhu luôn là một giá trị hợp lệ
    const validKhus = ['SupplyAndDemand', 'Supply', 'Demand'];
    const currentKhu = validKhus.includes(activeKhu) ? activeKhu : 'SupplyAndDemand';
    const { addHistory } = useHistory();

    const [cellStates, setCellStates] = useState({});
    const [isSending, setIsSending] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [selectedCell, setSelectedCell] = useState(null);
    const [sendResult, setSendResult] = useState({ success: false, message: '' });
    const [taskData, setTaskData] = useState([]); // State để lưu dữ liệu từ file JSON
    const [loading, setLoading] = useState(true); // State để kiểm tra trạng thái load file JSON
    const [error, setError] = useState(null); // State để lưu lỗi nếu load file JSON thất bại

    // Sửa cú pháp chọn config
    const config = currentKhu === 'SupplyAndDemand' ? SupplyAndDemandConfig : 
                   currentKhu === 'Supply' ? SupplyConfig : DemandConfig;

    // Object mapping cho khu vực
    const khuMap = {
        'SupplyAndDemand': 'CẤP&TRẢ HÀNG',
        'Supply': 'CẤP HÀNG',
        'Demand': 'TRẢ HÀNG'
    };

    // Tải dữ liệu từ file JSON tương ứng dựa trên currentKhu
    useEffect(() => {
        const fetchTaskData = async () => {
            setLoading(true); // Bắt đầu load
            setError(null); // Reset lỗi

            let jsonFile;
            if (currentKhu === 'SupplyAndDemand') {
                jsonFile = '/task_path_supply_demand.json';
            } else if (currentKhu === 'Supply') {
                jsonFile = '/task_path_supply.json';
            } else if (currentKhu === 'Demand') {
                jsonFile = '/task_path_demand.json';
            }

            try {
                const response = await fetch(jsonFile);
                if (!response.ok) {
                    throw new Error(`Không thể tải file JSON: ${response.statusText}`);
                }
                const data = await response.json();
                if (!Array.isArray(data)) {
                    throw new Error('Dữ liệu từ file JSON không phải là một mảng');
                }
                setTaskData(data);
                console.log(`✅ Dữ liệu từ ${jsonFile}:`, data);
            } catch (error) {
                console.error(`❌ Lỗi khi tải dữ liệu từ ${jsonFile}:`, error.message);
                setError(error.message);
                setTaskData([]);
            } finally {
                setLoading(false); // Kết thúc load
            }
        };

        fetchTaskData();
    }, [currentKhu]); // Gọi lại khi currentKhu thay đổi

    const handleCellClick = (cellNumber) => {
        console.log(`🖱️ Ô được chọn: cell-${cellNumber}`); // Log khi chọn ô
        setSelectedCell(cellNumber);
        setShowModal(true);
    };

    const handleClose = () => {
        setShowModal(false);
        setSendResult({ success: false, message: '' });
    };

    const handleSendSignal = async () => {
        console.log('🚀 Bắt đầu gửi tín hiệu...'); // Log khi nhấn nút "Gửi tín hiệu"
        console.log('📍 Ô được chọn:', selectedCell);
        console.log('📊 Dữ liệu taskData:', taskData);

        if (isSending) {
            console.log('⏳ Đang gửi, bỏ qua...');
            return;
        }

        try {
            setIsSending(true);
            console.log('🔍 Tìm dữ liệu cho ô:', `cell-${selectedCell}`);

            // Tìm dữ liệu tương ứng với ô được chọn từ taskData
            const selectedData = taskData.find(item => item.cell === `cell-${selectedCell}`);
            console.log('📦 Dữ liệu tìm thấy:', selectedData);

            if (!selectedData) {
                throw new Error(`Không tìm thấy dữ liệu cho ô ${selectedCell} trong file JSON`);
            }

            // Lấy giá trị của "value" từ object trong file JSON
            const jsonData = selectedData.value;
            console.log('📋 Dữ liệu JSON từ file:', jsonData);

            const orderCount = parseInt(localStorage.getItem("orderCount") || "1", 10);
            const newOrderId = `thadosoft_${orderCount}`;
            localStorage.setItem("orderCount", orderCount + 1);
            console.log('🆔 Order ID mới:', newOrderId);

            // Sử dụng trực tiếp giá trị "value" từ file JSON và thêm orderId
            const reorderedData = {
                ...jsonData,
                orderId: newOrderId
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
                console.log('✅ Gửi thành công!');
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
        let totalCellsToShow;

        // Xác định số ô cần hiển thị dựa trên currentKhu
        if (currentKhu === 'SupplyAndDemand' || currentKhu === 'Demand') {
            totalCellsToShow = 23; // Hiển thị 23 ô cho SupplyAndDemand và Demand
        } else {
            totalCellsToShow = 26; // Hiển thị 26 ô cho Supply
        }

        // Danh sách các ô bị vô hiệu hóa dựa trên currentKhu dựa trên Index
        const disabledCells = {
            'SupplyAndDemand': [1, 2, 8, 9, 10, 11],
            'Supply': [3, 4, 5, 6, 7, 12, 13, 14, 20, 21],
            'Demand': [3, 4, 5, 6, 7, 11, 12, 13, 14, 17, 18]
        };

        for (let i = 1; i <= totalCellsToShow; i++) {
            const cellState = cellStates[i] || 'bg-info';
            // Tìm dữ liệu tương ứng với ô từ taskData
            const cellData = taskData.find(item => item.cell === `cell-${i}`);
            const cellValue = cellData ? cellData.value.taskOrderDetail[0]?.taskPath : i; // Hiển thị taskPath hoặc số ô nếu không có dữ liệu

            let cellLabel;
            let isDisabled = disabledCells[currentKhu] ? disabledCells[currentKhu].includes(i) : false;

            // Logic hiển thị label cho từng khu vực
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
                            {/* <div style={{ fontSize: '12px' }}>{cellValue}</div> {} */}
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