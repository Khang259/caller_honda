// src/components/ContextMenu.jsx
import React, { useState } from 'react';
import { Modal, Form, Button, Alert } from 'react-bootstrap';
import { updateCellData, deleteCellData } from '../services/cell';

const ContextMenu = ({ 
  show, 
  onHide, 
  cellData, 
  currentKhu, 
  serverIPs, 
  onUpdateSuccess,
  position = { x: 0, y: 0 }
}) => {
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [alert, setAlert] = useState({ show: false, message: '', variant: 'success' });

  const handleEdit = () => {
    console.log('[ContextMenu] handleEdit called', { cellData });
    if (cellData) {
      setEditForm({
        cell: cellData.cell, // giữ lại để gửi lên backend, không cho sửa
        fromSystem: cellData.fromSystem || '',
        modelProcessCode: cellData.modelProcessCode || '',
        taskOrderDetail: cellData.taskOrderDetail || [{ taskPath: '' }]
      });
    }
    setShowEditModal(true);
    onHide();
    setTimeout(() => {
      console.log('[ContextMenu] showEditModal:', true);
    }, 100);
  };

  const handleEditSubmit = async () => {
    if (!serverIPs || serverIPs.length === 0) {
      setAlert({ show: true, message: 'Không có IP server hợp lệ', variant: 'danger' });
      return;
    }

    setIsLoading(true);
    try {
      // Chỉ gửi đúng các trường cần thiết
      const updateData = {
        cell: editForm.cell, // cần để backend biết update ô nào
        fromSystem: editForm.fromSystem,
        modelProcessCode: editForm.modelProcessCode,
        taskOrderDetail: editForm.taskOrderDetail
      };
      await updateCellData(serverIPs[0], currentKhu, updateData);
      setAlert({ show: true, message: 'Cập nhật thành công!', variant: 'success' });
      setShowEditModal(false);
      if (onUpdateSuccess) {
        onUpdateSuccess();
      }
    } catch (error) {
      setAlert({ show: true, message: `Lỗi: ${error.message}`, variant: 'danger' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  const handleTaskPathChange = (index, value) => {
    setEditForm(prev => ({
      ...prev,
      taskOrderDetail: prev.taskOrderDetail.map((task, i) => 
        i === index ? { ...task, taskPath: value } : task
      )
    }));
  };

  React.useEffect(() => {
    console.log('[ContextMenu] show:', show, '| showEditModal:', showEditModal, '| cellData:', cellData);
  }, [show, showEditModal, cellData]);

  if (!show && !showEditModal) return null;

  // Thêm UI cho ô chưa có dữ liệu (kiểm tra trên cellData.value nếu có)
  const value = cellData?.value || {};
  const isEmptyCell = !value.fromSystem && !value.modelProcessCode && (!value.taskOrderDetail || value.taskOrderDetail.every(t => !t.taskPath));

  return (
    <>
      {/* Context Menu */}
      <div 
        className="position-fixed bg-white border rounded shadow-lg"
        style={{
          left: position.x,
          top: position.y,
          zIndex: 1050,
          minWidth: '150px'
        }}
      >
        <div className="p-2">
          <div className="dropdown-item cursor-pointer" onClick={handleEdit}>
            <i className="bi bi-pencil me-2"></i>
            Sửa dữ liệu
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Sửa dữ liệu - {cellData?.cell}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            {alert.show && (
              <Alert variant={alert.variant} onClose={() => setAlert({ ...alert, show: false })} dismissible>
                {alert.message}
              </Alert>
            )}
            {isEmptyCell && (
              <Alert variant="info">
                Ô này chưa có dữ liệu. Vui lòng nhập thông tin để lưu mới.
              </Alert>
            )}
            <Form>
              {/* Nếu là ô mới, cho phép nhập cell-id */}
              <Form.Group className="mb-3">
                <Form.Label>Cell ID</Form.Label>
                <Form.Control
                  type="text"
                  value={editForm.cell || ''}
                  onChange={(e) => handleInputChange('cell', e.target.value)}
                  placeholder="Nhập Cell ID"
                  readOnly={!isEmptyCell}
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>From System</Form.Label>
                <Form.Control
                  type="text"
                  value={editForm.fromSystem || ''}
                  onChange={(e) => handleInputChange('fromSystem', e.target.value)}
                  placeholder="Nhập From System"
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Model Process Code</Form.Label>
                <Form.Control
                  type="text"
                  value={editForm.modelProcessCode || ''}
                  onChange={(e) => handleInputChange('modelProcessCode', e.target.value)}
                  placeholder="Nhập Model Process Code"
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Task Order Detail</Form.Label>
                {editForm.taskOrderDetail?.map((task, index) => (
                  <Form.Control
                    key={index}
                    type="text"
                    value={task.taskPath || ''}
                    onChange={(e) => handleTaskPathChange(index, e.target.value)}
                    placeholder="Nhập Task Path"
                    className="mb-2"
                  />
                ))}
              </Form.Group>
            </Form>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEditModal(false)}>
            Hủy
          </Button>
          <Button 
            variant="primary" 
            onClick={handleEditSubmit}
            disabled={isLoading}
          >
            {isLoading ? 'Đang cập nhật...' : 'Cập nhật'}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default ContextMenu; 