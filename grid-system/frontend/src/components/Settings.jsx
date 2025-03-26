import React from 'react';
import { Card, Form, Button, Alert, Container } from 'react-bootstrap';
import { useSettings } from "../contexts/SettingsContext";

const Settings = () => {
    const {
        serverIPs,
        inputServerIP,
        setInputServerIP,
        SupplyAndDemandConfig, // Sửa tên biến cho nhất quán
        setSupplyAndDemandConfig,
        SupplyConfig, // Sửa tên biến cho nhất quán
        setSupplyConfig,
        DemandConfig, // Sửa tên biến cho nhất quán
        setDemandConfig,
        handleSaveConfig,
        handleReset,
        showAlert,
        alertMessage
    } = useSettings();

    // Hàm cập nhật dữ liệu trong localStorage khi cấu hình lưới thay đổi
    const updateGridData = (khu, newRows, newColumns) => {
        const key = khu === 'SupplyAndDemand' 
            ? 'SupplyAndDemandGridData' 
            : khu === 'Supply' 
                ? 'SupplyGridData' 
                : 'DemandGridData'; // Sửa cú pháp toán tử ba ngôi

        const savedData = localStorage.getItem(key);
        let gridData = savedData ? JSON.parse(savedData) : [];

        // Tạo mảng 2 chiều mới với kích thước newRows x newColumns
        const newGridData = Array(newRows).fill().map((_, rowIndex) =>
            Array(newColumns).fill().map((_, colIndex) => {
                const cellIndex = rowIndex * newColumns + colIndex + 1;
                // Nếu ô đã có dữ liệu trong gridData cũ, giữ nguyên
                if (gridData[rowIndex] && gridData[rowIndex][colIndex]) {
                    return gridData[rowIndex][colIndex];
                }
                // Nếu không, gán dữ liệu mặc định
                return { value: JSON.stringify({ cell: cellIndex }) };
            })
        );

        // Lưu dữ liệu mới vào localStorage
        localStorage.setItem(key, JSON.stringify(newGridData));
    };

    // Hàm xử lý khi thay đổi số hàng hoặc số cột
    const handleSupplyAndDemandRowsChange = (e) => {
        const newRows = parseInt(e.target.value) || 1;
        const newCells = newRows * SupplyAndDemandConfig.columns;
        setSupplyAndDemandConfig({ ...SupplyAndDemandConfig, rows: newRows, cells: newCells });
        updateGridData('SupplyAndDemand', newRows, SupplyAndDemandConfig.columns);
    };

    const handleSupplyAndDemandColumnsChange = (e) => {
        const newColumns = parseInt(e.target.value) || 1;
        const newCells = SupplyAndDemandConfig.rows * newColumns;
        setSupplyAndDemandConfig({ ...SupplyAndDemandConfig, columns: newColumns, cells: newCells });
        updateGridData('SupplyAndDemand', SupplyAndDemandConfig.rows, newColumns);
    };

    const handleSupplyRowsChange = (e) => {
        const newRows = parseInt(e.target.value) || 1;
        const newCells = newRows * SupplyConfig.columns;
        setSupplyConfig({ ...SupplyConfig, rows: newRows, cells: newCells });
        updateGridData('Supply', newRows, SupplyConfig.columns);
    };

    const handleSupplyColumnsChange = (e) => {
        const newColumns = parseInt(e.target.value) || 1;
        const newCells = SupplyConfig.rows * newColumns;
        setSupplyConfig({ ...SupplyConfig, columns: newColumns, cells: newCells });
        updateGridData('Supply', SupplyConfig.rows, newColumns);
    };

    const handleDemandRowsChange = (e) => {
        const newRows = parseInt(e.target.value) || 1;
        const newCells = newRows * DemandConfig.columns; // Sửa thành DemandConfig
        setDemandConfig({ ...DemandConfig, rows: newRows, cells: newCells }); // Sửa thành setDemandConfig
        updateGridData('Demand', newRows, DemandConfig.columns);
    };

    const handleDemandColumnsChange = (e) => {
        const newColumns = parseInt(e.target.value) || 1;
        const newCells = DemandConfig.rows * newColumns;
        setDemandConfig({ ...DemandConfig, columns: newColumns, cells: newCells }); // Sửa thành setDemandConfig
        updateGridData('Demand', DemandConfig.rows, newColumns);
    };

    return (
        <Container>
            {showAlert && (
                <Alert variant={alertMessage.includes('Lỗi') ? 'danger' : 'success'} dismissible>
                    {alertMessage}
                </Alert>
            )}

            <Card className="mb-4">
                <Card.Header className="bg-primary text-white">
                    <h5 className="mb-0">Cài đặt hệ thống (Chỉ Admin)</h5>
                </Card.Header>
                <Card.Body className="settings-section">
                    <Form>
                        <div className="settings-title">Cấu hình server FastAPI</div>
                        <Form.Group className="mb-4">
                            <Form.Control
                                type="text"
                                placeholder="Nhập địa chỉ server (vd: 127.0.0.1:8000, 192.168.1.116:8000)"
                                value={inputServerIP}
                                onChange={(e) => setInputServerIP(e.target.value)}
                                className="form-control-lg"
                            />
                            <Form.Text className="text-muted">
                                Nhập nhiều địa chỉ server, cách nhau bởi dấu phẩy (VD: 127.0.0.1:8000, 192.168.1.116:8000)
                            </Form.Text>
                        </Form.Group>

                        <div className="settings-title">Cấu hình khu vực Cấp&Trả hàng</div>
                        <div className="row">
                            <div className="col-md-4 mb-3">
                                <Form.Label>Số hàng:</Form.Label>
                                <Form.Control
                                    type="number"
                                    min="1"
                                    max="10"
                                    value={SupplyAndDemandConfig.rows}
                                    onChange={handleSupplyAndDemandRowsChange}
                                    className="form-control-lg"
                                />
                            </div>
                            <div className="col-md-4 mb-3">
                                <Form.Label>Số cột:</Form.Label>
                                <Form.Control
                                    type="number"
                                    min="1"
                                    max="10"
                                    value={SupplyAndDemandConfig.columns}
                                    onChange={handleSupplyAndDemandColumnsChange}
                                    className="form-control-lg"
                                />
                            </div>
                            <div className="col Cement-md-4 mb-3">
                                <Form.Label>Tổng số ô:</Form.Label>
                                <Form.Control
                                    type="number"
                                    min="1"
                                    max={SupplyAndDemandConfig.rows * SupplyAndDemandConfig.columns}
                                    value={SupplyAndDemandConfig.cells}
                                    onChange={(e) => {
                                        const newCells = parseInt(e.target.value) || 1;
                                        setSupplyAndDemandConfig({
                                            ...SupplyAndDemandConfig,
                                            cells: Math.min(newCells, SupplyAndDemandConfig.rows * SupplyAndDemandConfig.columns)
                                        });
                                    }}
                                    className="form-control-lg"
                                />
                            </div>
                        </div>

                        <div className="settings-title mt-4">Cấu hình khu vực Cấp hàng</div>
                        <div className="row">
                            <div className="col-md-4 mb-3">
                                <Form.Label>Số hàng:</Form.Label>
                                <Form.Control
                                    type="number"
                                    min="1"
                                    max="10"
                                    value={SupplyConfig.rows}
                                    onChange={handleSupplyRowsChange}
                                    className="form-control-lg"
                                />
                            </div>
                            <div className="col-md-4 mb-3">
                                <Form.Label>Số cột:</Form.Label>
                                <Form.Control
                                    type="number"
                                    min="1"
                                    max="10"
                                    value={SupplyConfig.columns}
                                    onChange={handleSupplyColumnsChange}
                                    className="form-control-lg"
                                />
                            </div>
                            <div className="col-md-4 mb-3">
                                <Form.Label>Tổng số ô:</Form.Label>
                                <Form.Control
                                    type="number"
                                    min="1"
                                    max={SupplyConfig.rows * SupplyConfig.columns}
                                    value={SupplyConfig.cells}
                                    onChange={(e) => {
                                        const newCells = parseInt(e.target.value) || 1;
                                        setSupplyConfig({
                                            ...SupplyConfig,
                                            cells: Math.min(newCells, SupplyConfig.rows * SupplyConfig.columns)
                                        });
                                    }}
                                    className="form-control-lg"
                                />
                            </div>
                        </div>

                        <div className="settings-title mt-4">Cấu hình khu vực Trả hàng</div>
                        <div className="row">
                            <div className="col-md-4 mb-3">
                                <Form.Label>Số hàng:</Form.Label>
                                <Form.Control
                                    type="number"
                                    min="1"
                                    max="10"
                                    value={DemandConfig.rows}
                                    onChange={handleDemandRowsChange}
                                    className="form-control-lg"
                                />
                            </div>
                            <div className="col-md-4 mb-3">
                                <Form.Label>Số cột:</Form.Label>
                                <Form.Control
                                    type="number"
                                    min="1"
                                    max="10"
                                    value={DemandConfig.columns}
                                    onChange={handleDemandColumnsChange}
                                    className="form-control-lg"
                                />
                            </div>
                            <div className="col-md-4 mb-3">
                                <Form.Label>Tổng số ô:</Form.Label>
                                <Form.Control
                                    type="number"
                                    min="1"
                                    max={DemandConfig.rows * DemandConfig.columns}
                                    value={DemandConfig.cells}
                                    onChange={(e) => {
                                        const newCells = parseInt(e.target.value) || 1;
                                        setDemandConfig({ // Sửa thành setDemandConfig
                                            ...DemandConfig,
                                            cells: Math.min(newCells, DemandConfig.rows * DemandConfig.columns)
                                        });
                                    }}
                                    className="form-control-lg"
                                />
                            </div>
                        </div>

                        <div className="d-flex justify-content-end mt-4">
                            <Button variant="secondary" size="lg" className="me-2" onClick={handleReset}>
                                <i className="bi bi-arrow-counterclockwise me-1"></i> Khôi phục mặc định
                            </Button>
                            <Button variant="primary" size="lg" onClick={handleSaveConfig}>
                                <i className="bi bi-save me-1"></i> Lưu cấu hình
                            </Button>
                        </div>
                    </Form>
                </Card.Body>
            </Card>
        </Container>
    );
};

export default Settings;