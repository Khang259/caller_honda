import React from 'react';
import { Card, Form, Button, Alert, Container } from 'react-bootstrap';
//import { useSettings } from '../contexts/SettingsComponent';
import { useSettings } from "../contexts/SettingsContext";

const Settings = () => {
    const {
        serverIPs,
        inputServerIP,
        setInputServerIP,
        khu4Config,
        setKhu4Config,
        khu5Config,
        setKhu5Config,
        handleSaveConfig,
        handleReset,
        showAlert,
        alertMessage
    } = useSettings();

    // Hàm cập nhật dữ liệu trong localStorage khi cấu hình lưới thay đổi
    const updateGridData = (khu, newRows, newColumns) => {
        const key = khu === 'khu4' ? 'khu4GridData' : 'khu5GridData';
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
    const handleKhu4RowsChange = (e) => {
        const newRows = parseInt(e.target.value) || 1;
        const newCells = newRows * khu4Config.columns;
        setKhu4Config({ ...khu4Config, rows: newRows, cells: newCells });
        updateGridData('khu4', newRows, khu4Config.columns);
    };

    const handleKhu4ColumnsChange = (e) => {
        const newColumns = parseInt(e.target.value) || 1;
        const newCells = khu4Config.rows * newColumns;
        setKhu4Config({ ...khu4Config, columns: newColumns, cells: newCells });
        updateGridData('khu4', khu4Config.rows, newColumns);
    };

    const handleKhu5RowsChange = (e) => {
        const newRows = parseInt(e.target.value) || 1;
        const newCells = newRows * khu5Config.columns;
        setKhu5Config({ ...khu5Config, rows: newRows, cells: newCells });
        updateGridData('khu5', newRows, khu5Config.columns);
    };

    const handleKhu5ColumnsChange = (e) => {
        const newColumns = parseInt(e.target.value) || 1;
        const newCells = khu5Config.rows * newColumns;
        setKhu5Config({ ...khu5Config, columns: newColumns, cells: newCells });
        updateGridData('khu5', khu5Config.rows, newColumns);
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

                        <div className="settings-title">Cấu hình KHU 4</div>
                        <div className="row">
                            <div className="col-md-4 mb-3">
                                <Form.Label>Số hàng:</Form.Label>
                                <Form.Control
                                    type="number"
                                    min="1"
                                    max="10"
                                    value={khu4Config.rows}
                                    onChange={handleKhu4RowsChange}
                                    className="form-control-lg"
                                />
                            </div>
                            <div className="col-md-4 mb-3">
                                <Form.Label>Số cột:</Form.Label>
                                <Form.Control
                                    type="number"
                                    min="1"
                                    max="10"
                                    value={khu4Config.columns}
                                    onChange={handleKhu4ColumnsChange}
                                    className="form-control-lg"
                                />
                            </div>
                            <div className="col-md-4 mb-3">
                                <Form.Label>Tổng số ô:</Form.Label>
                                <Form.Control
                                    type="number"
                                    min="1"
                                    max={khu4Config.rows * khu4Config.columns}
                                    value={khu4Config.cells}
                                    onChange={(e) => {
                                        const newCells = parseInt(e.target.value) || 1;
                                        setKhu4Config({
                                            ...khu4Config,
                                            cells: Math.min(newCells, khu4Config.rows * khu4Config.columns)
                                        });
                                    }}
                                    className="form-control-lg"
                                />
                            </div>
                        </div>

                        <div className="settings-title mt-4">Cấu hình KHU 5</div>
                        <div className="row">
                            <div className="col-md-4 mb-3">
                                <Form.Label>Số hàng:</Form.Label>
                                <Form.Control
                                    type="number"
                                    min="1"
                                    max="10"
                                    value={khu5Config.rows}
                                    onChange={handleKhu5RowsChange}
                                    className="form-control-lg"
                                />
                            </div>
                            <div className="col-md-4 mb-3">
                                <Form.Label>Số cột:</Form.Label>
                                <Form.Control
                                    type="number"
                                    min="1"
                                    max="10"
                                    value={khu5Config.columns}
                                    onChange={handleKhu5ColumnsChange}
                                    className="form-control-lg"
                                />
                            </div>
                            <div className="col-md-4 mb-3">
                                <Form.Label>Tổng số ô:</Form.Label>
                                <Form.Control
                                    type="number"
                                    min="1"
                                    max={khu5Config.rows * khu5Config.columns}
                                    value={khu5Config.cells}
                                    onChange={(e) => {
                                        const newCells = parseInt(e.target.value) || 1;
                                        setKhu5Config({
                                            ...khu5Config,
                                            cells: Math.min(newCells, khu5Config.rows * khu5Config.columns)
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