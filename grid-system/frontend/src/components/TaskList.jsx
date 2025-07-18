import React, { useState } from 'react';
import { ListGroup, Form, Button, Pagination } from 'react-bootstrap';

// Component con để hiển thị các nút phân trang
const PaginationControls = ({ currentPage, totalPages, onPageChange }) => {
  const paginationItems = [];
  for (let number = 1; number <= totalPages; number++) {
    paginationItems.push(
      <Pagination.Item
        key={number}
        active={number === currentPage}
        onClick={() => onPageChange(number)}
      >
        {number}
      </Pagination.Item>
    );
  }

  return (
    <Pagination>
      <Pagination.First onClick={() => onPageChange(1)} disabled={currentPage === 1} />
      <Pagination.Prev
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
      />
      {paginationItems}
      <Pagination.Next
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      />
      <Pagination.Last
        onClick={() => onPageChange(totalPages)}
        disabled={currentPage === totalPages}
      />
    </Pagination>
  );
};

// Component chính hiển thị danh sách công việc
const TaskList = ({ tasks, onTaskToggle, onCancel, currentKhu }) => {
  // Trạng thái phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const tasksPerPage = 6; // Số lượng công việc mỗi trang

  // Đảo ngược toàn bộ danh sách tasks để công việc mới nhất ở đầu
  const sortedTasks = [...tasks].reverse(); // Tạo bản sao và đảo ngược

  // Tính toán các giá trị phân trang
  const totalTasks = sortedTasks.length; // Tổng số công việc
  const totalPages = Math.ceil(totalTasks / tasksPerPage); // Tổng số trang
  const indexOfLastTask = currentPage * tasksPerPage; // Chỉ số công việc cuối cùng trên trang hiện tại
  const indexOfFirstTask = indexOfLastTask - tasksPerPage; // Chỉ số công việc đầu tiên trên trang hiện tại
  const displayedTasks = sortedTasks.slice(indexOfFirstTask, indexOfLastTask); // Công việc hiển thị

  // Xử lý sự kiện toggle checkbox
  const handleToggle = (index) => {
    console.log(`Toggling task at index ${index}`);
    onTaskToggle(index);
  };

  // Xử lý thay đổi trang
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  // Định nghĩa khuMap để hiển thị tên khu vực dễ đọc
  const khuMap = {
    SupplyAndDemand: 'Cấp&Trả hàng',
    Supply: 'Cấp hàng',
    Demand: 'Trả trống',
  };

  return (
    <div className="task-list mt-3" style={{ border: '1px solid #ccc', padding: '10px' }}>
      <h5>Danh sách nhiệm vụ</h5>
      <ListGroup>
        {displayedTasks.map((task, index) => {
          // Tìm chỉ số toàn cục của task trong mảng tasks gốc
          const globalIndex = tasks.findIndex(
            (t) =>
              t.cell === task.cell &&
              t.sent_data.orderId === task.sent_data.orderId &&
              t.timestamp === task.timestamp
          );

          return (
            <ListGroup.Item
              key={globalIndex}
              className="d-flex align-items-center justify-content-between"
            >
              <div className="d-flex align-items-center">
                <Form.Check
                  type="checkbox"
                  checked={task.completed}
                  onChange={(e) => {
                    e.stopPropagation();
                    handleToggle(globalIndex);
                  }}
                  className="me-2"
                />
                <span>
                  {task.cell} - {khuMap[task.currentKhu] || task.currentKhu} -{' '}
                  {task.sent_data.orderId} - ({task.timestamp})
                </span>
              </div>
              <Button
                variant="danger"
                size="sm"
                onClick={() => onCancel(globalIndex)}
                disabled={!task.completed}
              >
                Hủy
              </Button>
            </ListGroup.Item>
          );
        })}
      </ListGroup>

      {totalTasks > tasksPerPage && (
        <div className="mt-3 d-flex justify-content-center">
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      )}
    </div>
  );
};

export default TaskList;