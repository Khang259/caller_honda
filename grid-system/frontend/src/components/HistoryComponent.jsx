import React, { useState, useEffect } from 'react';
import { Container, Card, Table, Badge, Alert, Pagination } from 'react-bootstrap';
import { useSettings } from '../contexts/SettingsContext';
import { format, parse } from 'date-fns';

// Định nghĩa khuMap
const khuMap = {
  SupplyAndDemand: 'Cấp&Trả hàng',
  Supply: 'Cấp hàng',
  Demand: 'Trả trống',
  thadosoft: 'Cấp&Trả hàng',
};

// Component PaginationControls
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
    <Pagination className="justify-content-center mt-3">
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

const HistoryComponent = () => {
  const { serverIPs } = useSettings();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50);
  const [serverAlive, setServerAlive] = useState(false);

  // Xử lý định dạng timestamp
  const parseTimestamp = (timestamp) => {
    if (typeof timestamp === 'number') {
      const date = new Date(timestamp * 1000);
      date.setHours(date.getHours() + 7); // UTC+7
      return date;
    }
    if (typeof timestamp === 'string' && timestamp.includes('/')) {
      return parse(timestamp, 'dd/MM/yyyy HH:mm:ss', new Date());
    }
    return new Date(timestamp);
  };

  // Kiểm tra trạng thái server
  const checkServerHealth = async () => {
    const serverIP = serverIPs && serverIPs.length > 0 ? serverIPs[0] : '192.168.1.7:8000';
    const healthUrl = `http://${serverIP}/health-check`;
    console.log('Kiểm tra server:', healthUrl);

    try {
      const response = await fetch(healthUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      console.log('Phản hồi health-check:', data);

      if (data.status === 'OK') {
        setServerAlive(true);
        setError('');
      } else {
        throw new Error('Server không trả về status OK');
      }
    } catch (err) {
      console.error('Lỗi kiểm tra server:', err);
      setServerAlive(false);
      setError('Không thể kết nối tới server');
    }
  };

  // Lấy dữ liệu từ grid_history
  const fetchHistory = async () => {
    if (!serverAlive) {
      console.log('Server không hoạt động, bỏ qua fetch lịch sử');
      return;
    }

    const serverIP = serverIPs && serverIPs.length > 0 ? serverIPs[0] : '192.168.1.7:8000';
    const url = `http://${serverIP}/get-grid-history`;
    console.log('Fetching history URL:', url);

    try {
      setLoading(true);
      setError('');

      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      console.log('Response status:', response.status);

      if (!response.ok) {
        throw new Error(`Lỗi khi tải dữ liệu: HTTP ${response.status}`);
      }

      const data = await response.json();

      // Kiểm tra phản hồi 
      if (!data) {
        throw new Error('Phản hồi API là null hoặc không hợp lệ');
      }

      // Xử lý trường hợp API trả về mảng trực tiếp
      let historyData = [];
      if (Array.isArray(data)) {
        historyData = data;
      } else if (
        data.hasOwnProperty('status') &&
        data.status === 'success' &&
        Array.isArray(data.data)
      ) {
        historyData = data.data;
      } else {
        throw new Error(`Phản hồi API không hợp lệ: ${JSON.stringify(data)}`);
      }

      // Ánh xạ dữ liệu
      const mappedHistory = historyData.map((item) => ({
        ...item,
        cell: item.cell || 'N/A',
        sent_data: {
          modelProcessCode: item.modelProcessCode,
          fromSystem: item.fromSystem,
          orderId: item.orderId,
          taskOrderDetail: item.taskOrderDetail,
        },
        area: khuMap[item.fromSystem] || item.fromSystem || 'Không xác định',
        user: item.user || 'admin',
        client_ip: item.client_ip || 'Không xác định',
        action: `Gửi nhiệm vụ ${item.orderId || 'không xác định'}`,
      }));

      // Sắp xếp theo thời gian giảm dần
      const sortedHistory = mappedHistory.sort((a, b) => {
        const dateA = parseTimestamp(a.timestamp);
        const dateB = parseTimestamp(b.timestamp);
        return dateB - dateA; // Mới nhất lên đầu
      });
      console.log('Dữ liệu đã sắp xếp:', sortedHistory);

      // Giới hạn 50 mục gần nhất
      const recentHistory = sortedHistory
      console.log('50 mục gần nhất:', recentHistory);

      setHistory(recentHistory);
    } catch (error) {
      console.error('Lỗi khi tải lịch sử:', error);
      setError(`Không thể tải lịch sử dữ liệu: ${error.message}`);
    } finally {
      console.log('Hoàn tất fetchHistory, setLoading(false)');
      setLoading(false);
    }
  };

  // Kiểm tra server và fetch lịch sử
  useEffect(() => {
    // Kiểm tra server ngay khi mount
    checkServerHealth();

    // Kiểm tra server mỗi 10 giây
    const healthInterval = setInterval(checkServerHealth, 10000);

    // Fetch lịch sử mỗi 5 giây nếu server hoạt động
    const historyInterval = setInterval(() => {
      if (serverAlive) {
        fetchHistory();
      }
    }, 5000);

    // Fetch lần đầu nếu server hoạt động
    if (serverAlive) {
      fetchHistory();
    }

    return () => {
      clearInterval(healthInterval);
      clearInterval(historyInterval);
    };
  }, [serverAlive, serverIPs]);

  // Phân trang
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = history.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(history.length / itemsPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  return (
    <Container>
      <Card>
        <Card.Header className="bg-secondary text-white">
          <h5 className="mb-0">Lịch sử dữ liệu đã gửi</h5>
        </Card.Header>
        <Card.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          {loading && history.length === 0 ? (
            <div className="text-center py-3">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Đang tải...</span>
              </div>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-3">
              <p className="text-muted">Chưa có dữ liệu nào được gửi</p>
            </div>
          ) : (
            <>
              <div className="table-responsive">
                <Table striped bordered hover>
                  <thead>
                    <tr>
                      <th>Thời gian</th>
                      <th>Khu vực</th>
                      <th>Hành động</th>
                      <th>Ô số</th>
                      <th>Người dùng</th>
                      <th>Thiết bị (IP)</th>
                      <th>Dữ liệu gửi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentItems.map((item, index) => (
                      <tr key={item._id || index}>
                        <td>
                          {item.timestamp
                            ? format(parseTimestamp(item.timestamp), 'dd/MM/yyyy HH:mm:ss')
                            : 'Không có'}
                        </td>
                        <td>
                          <Badge bg="success">{item.area}</Badge>
                        </td>
                        <td>{item.action}</td>
                        <td>{item.cell}</td>
                        <td>{item.user}</td>
                        <td>{item.client_ip}</td>
                        <td>{JSON.stringify(item.sent_data)}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
              {totalPages > 0 && (
                <PaginationControls
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              )}
            </>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default HistoryComponent;