import React, { useState, useEffect } from 'react';
import { Container, Card, Table, Badge, Alert } from 'react-bootstrap';
//import { useSettings } from '../contexts/SettingsComponent';
import { useSettings } from "../contexts/SettingsContext";

const HistoryComponent = () => {
    const { serverIP } = useSettings();
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const fetchHistory = async () => {
        try {
            setLoading(true);
            setError('');

            // Sử dụng serverIP từ context
            const effectiveServerIP = serverIP;
            const response = await fetch(`http://${effectiveServerIP}/received-data`);

            if (!response.ok) {
                throw new Error(`Lỗi khi tải dữ liệu: ${response.status}`);
            }

            const data = await response.json();
            setHistory(data.data);
        } catch (error) {
            console.error('Lỗi khi tải lịch sử:', error);
            setError('Không thể tải lịch sử dữ liệu. Vui lòng thử lại sau.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHistory();
        // Cập nhật mỗi 5 giây
        const intervalId = setInterval(fetchHistory, 5000);
        return () => clearInterval(intervalId);
    }, []);

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
                        <div className="table-responsive">
                            <Table striped bordered hover>
                                <thead>
                                    <tr>
                                        <th>Thời gian</th>
                                        <th>Khu vực</th>
                                        <th>Ô số</th>
                                        <th>Người dùng</th>
                                        <th>Dữ liệu bổ sung</th>
                                        <th>Hành động</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {history.slice().reverse().map((item, index) => (
                                        <tr key={index}>
                                            <td>{item.received_at}</td>
                                            <td>
                                                <Badge bg={item.area === 4 ? 'primary' : 'success'}>
                                                    KHU {item.area}
                                                </Badge>
                                            </td>
                                            <td>{item.cell}</td>
                                            <td>{item.user}</td>
                                            <td>{item.additional_data || 'Không có'}</td>
                                            <td>{item.action}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </div>
                    )}
                </Card.Body>
            </Card>
        </Container>
    );
};

export default HistoryComponent;