import React from 'react';
import { Container, Row, Col, Form, Button, Card, Alert } from 'react-bootstrap';
import { useSettings } from '../contexts/SettingsComponent';
import HistoryComponent from '../components/HistoryComponent';

const Settings = () => {
    const {
        serverIP, setServerIP,
        SupplyAndDemandConfig, setSupplyAndDemandConfig,
        SupplyConfig, setSupplyConfig,
        DemandConfig, setDemandConfig,
        activeKhu, switchKhu,
        handleSaveConfig, handleReset,
        showAlert, alertMessage,
        handleDisplayKhu
    } = useSettings();

    // Xác định cấu hình hiện tại dựa trên khu đang chọn
    const setCurrentConfig = activeKhu === 'SupplyAndDemand'
    ? (config) => setSupplyAndDemandConfig({ ...SupplyAndDemandConfig, ...config })
    : activeKhu === 'Demand'
        ? (config) => setDemandConfig({ ...DemandConfig, ...config })
        : (config) => setSupplyConfig({ ...SupplyConfig, ...config });

    return (
        <Container>
            <Card className="mb-4">
                <Card.Header className="bg-light">
                    <h5 className="mb-0">CÀI ĐẶT GIAO DIỆN</h5>
                </Card.Header>
                <Card.Body>
                    {showAlert && (
                        <Alert variant="success" dismissible onClose={() => setShowAlert(false)}>
                            {alertMessage}
                        </Alert>
                    )}

                    <Form>
                        <h6 className="mb-3">
                            <i className="bi bi-gear-fill me-2"></i>
                            Cấu hình hệ thống
                        </h6>

                        <Form.Group className="mb-3">
                            <Form.Label>Địa chỉ IP Server:</Form.Label>
                            <Form.Control
                                type="text"
                                value={serverIP}
                                onChange={(e) => setServerIP(e.target.value)}
                            />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Chọn khu để nhập:</Form.Label>
                            <div className="d-flex gap-3">
                                <Form.Check
                                    type="radio"
                                    id="SupplyAndDemand"
                                    label="KHU 4"
                                    name="khuSelection"
                                    checked={activeKhu === 'SupplyAndDemand'}
                                    onChange={() => switchKhu('SupplyAndDemand')}
                                />
                                <Form.Check
                                    type="radio"
                                    id="Supply"
                                    label="KHU 5"
                                    name="khuSelection"
                                    checked={activeKhu === 'Supply'}
                                    onChange={() => switchKhu('Supply')}
                                />
                            </div>
                        </Form.Group>

                        <div className="mb-3 p-3 border rounded">
                            <h6>Cấu hình cho {activeKhu === 'SupplyAndDemand' ? 'KHU 4' : 'KHU 5'}</h6>
                            <Row>
                                <Col md={4}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Số hàng:</Form.Label>
                                        <Form.Control
                                            type="number"
                                            value={currentConfig.rows}
                                            onChange={(e) => setCurrentConfig({ rows: parseInt(e.target.value) || 0 })}
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={4}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Số cột:</Form.Label>
                                        <Form.Control
                                            type="number"
                                            value={currentConfig.columns}
                                            onChange={(e) => setCurrentConfig({ columns: parseInt(e.target.value) || 0 })}
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={4}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Số ô:</Form.Label>
                                        <Form.Control
                                            type="number"
                                            value={currentConfig.cells}
                                            onChange={(e) => setCurrentConfig({ cells: parseInt(e.target.value) || 0 })}
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>
                        </div>

                        <div className="d-flex flex-wrap gap-2 mt-3">
                            <Button variant="primary" onClick={handleSaveConfig}>
                                Lưu cấu hình
                            </Button>
                            <Button variant="secondary" onClick={handleReset}>
                                Khôi phục mặc định
                            </Button>
                        </div>

                        <div className="mt-3">
                            <Button
                                variant="success"
                                className="w-100"
                                onClick={handleDisplayKhu}
                            >
                                <i className="bi bi-grid-3x3-gap me-2"></i>
                                Hiển thị khu
                            </Button>
                        </div>
                    </Form>
                </Card.Body>
            </Card>

            {/* History section */}
            <HistoryComponent />
        </Container>
    );
};

export default Settings;