// src/components/SettingsForm.jsx
import React from 'react';
import { Card, Form, Button, Alert, Container } from 'react-bootstrap';
import { useSettings } from '../contexts/SettingsContext';

const SettingsForm = () => {
  const {
    serverIPs,
    inputServerIP,
    setInputServerIP,
    SupplyAndDemandConfig,
    SupplyConfig,
    DemandConfig,
    handleSaveConfig,
    handleReset,
    showAlert,
    alertMessage,
    setShowAlert,
    handleConfigChange
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
        <Card.Body className="settings-section">
          <Form>
            <div className="settings-title">Cấu hình server</div>
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
                  onChange={(e) => handleConfigChange('SupplyAndDemand', 'rows', e.target.value)}
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
                  onChange={(e) => handleConfigChange('SupplyAndDemand', 'columns', e.target.value)}
                  className="form-control-lg"
                />
              </div>
              <div className="col-md-4 mb-3">
                <Form.Label>Tổng số ô:</Form.Label>
                <Form.Control
                  type="number"
                  min="1"
                  max={SupplyAndDemandConfig.rows * SupplyAndDemandConfig.columns}
                  value={SupplyAndDemandConfig.cells}
                  onChange={(e) => handleConfigChange('SupplyAndDemand', 'cells', e.target.value)}
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
                  onChange={(e) => handleConfigChange('Supply', 'rows', e.target.value)}
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
                  onChange={(e) => handleConfigChange('Supply', 'columns', e.target.value)}
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
                  onChange={(e) => handleConfigChange('Supply', 'cells', e.target.value)}
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
                  onChange={(e) => handleConfigChange('Demand', 'rows', e.target.value)}
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
                  onChange={(e) => handleConfigChange('Demand', 'columns', e.target.value)}
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
                  onChange={(e) => handleConfigChange('Demand', 'cells', e.target.value)}
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

export default SettingsForm;