import React from 'react';
import { Container, Card, Form, Button, Alert, Row, Col } from 'react-bootstrap';
import { useSettings } from '../contexts/SettingsComponent';

const SettingsComponent = () => {
    const {
        inputServerIP,
        setInputServerIP,
        khu4Config,
        setKhu4Config,
        khu5Config,
        setKhu5Config,
        activeKhu,
        switchKhu,
        handleSaveConfig,
        handleReset,
        showAlert,
        alertMessage,
        setShowAlert
    } = useSettings();

    return (
        <Container>
            {showAlert && (
                <Alert
                    variant={alertMessage.includes('Lỗi') ? 'danger' : 'success'}
                    onClose={() => setShowAlert(false)}
                    dismissible
                >
                    {alertMessage}
                </Alert>
            )}

            <Card className="mb-4">
                <Card.Header className="bg-primary text-white">
                    <h5 className="mb-0">Cài đặt hệ thống</h5>
                </Card.Header>
                <Card.Body>
                    <Form>
                        <Form.Group className="mb-4">
                            <Form.Label><strong>Cấu hình server FastAPI</strong></Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="Nhập địa chỉ server (vd: 127.0.0.1:8000, 192.168.1.116:8000)"
                                value={inputServerIP}
                                onChange={(e) => setInputServerIP(e.target.value)}
                            />
                            <Form.Text className="text-muted">
                                Nhập nhiều địa chỉ server, cách nhau bởi dấu phẩy (VD: 127.0.0.1:8000, 192.168.1.116:8000)
                            </Form.Text>
                        </Form.Group>

                        <div className="mb-4">
                            <Form.Label><strong>Khu vực hoạt động</strong></Form.Label>
                            <div className="d-flex">
                                <Button
                                    variant={activeKhu === 'khu4' ? 'primary' : 'outline-primary'}
                                    className="me-2"
                                    onClick={() => switchKhu('khu4')}
                                >
                                    KHU 4
                                </Button>
                                <Button
                                    variant={activeKhu === 'khu5' ? 'success' : 'outline-success'}
                                    onClick={() => switchKhu('khu5')}
                                >
                                    KHU 5
                                </Button>
                            </div>
                        </div>

                        <div className="d-flex justify-content-end">
                            <Button variant="secondary" className="me-2" onClick={handleReset}>
                                <i className="bi bi-arrow-counterclockwise me-1"></i> Khôi phục mặc định
                            </Button>
                            <Button variant="primary" onClick={handleSaveConfig}>
                                <i className="bi bi-save me-1"></i> Lưu cấu hình
                            </Button>
                        </div>
                    </Form>
                </Card.Body>
            </Card>
        </Container>
    );
};

export default SettingsComponent;