import React, { useState, useEffect } from 'react';
import { Container, Card, Table, Form, Button, Row, Col, Badge } from 'react-bootstrap';
import GridDisplay from '../components/GridDisplay';
//import { useSettings } from '../contexts/SettingsComponent';
import { useSettings } from "../contexts/SettingsContext";
import { useAuth } from '../contexts/AuthContext';

const SupplyAndDemandComponent = () => {
    const { SupplyAndDemandConfig, switchKhu } = useSettings();
    const { currentUser } = useAuth();

    useEffect(() => {
        switchKhu('SupplyAndDemand');
    }, [switchKhu]);

    const [rows, setRows] = useState(SupplyAndDemandConfig.rows || 4);
    const [columns, setColumns] = useState(SupplyAndDemandConfig.columns || 4);
    const [gridData, setGridData] = useState(() => {
        const newGrid = [];
        for (let i = 0; i < rows; i++) {
            const row = [];
            for (let j = 0; j < columns; j++) {
                row.push({ value: '', status: '' });
            }
            newGrid.push(row);
        }
        return newGrid;
    });

    const handleCellChange = (rowIndex, colIndex, value) => {
        const newGridData = [...gridData];

        // Tách dữ liệu bằng dấu phẩy và loại bỏ khoảng trắng dư thừa
        const parts = value.split(",").map(part => part.trim());

        // Tạo dữ liệu theo định dạng mong muốn, đảm bảo orderId trước taskOrderDetail
        const formattedValue = {};
        formattedValue.modelProcessCode = parts[0] || "1301"; // Mặc định là "test2"
        formattedValue.fromSystem = parts[1] || "thadosoft"; // Mặc định là "MS_2"
        // Không thêm orderId ở đây, để GridDisplay tự động thêm
        formattedValue.taskOrderDetail = [
            {
                taskPath: parts[2] || "", // Mặc định là "10000007"
            }
        ];

        // Kiểm tra nếu value đã là chuỗi JSON thì không cần stringify nữa
        const jsonString = typeof value === "string" && value.startsWith("{") ? value : JSON.stringify(formattedValue);

        // Lưu vào gridData
        newGridData[rowIndex][colIndex] = {
            value: jsonString, // Chắc chắn chỉ stringify một lần
            status: value ? "filled" : "empty"
        };

        setGridData(newGridData);
    };

    const handleSaveData = () => {
        try {
            // Lưu dưới dạng object JSON
            localStorage.setItem("SupplyAndDemandGridData", JSON.stringify(gridData));
            console.log("📌 Dữ liệu đã lưu vào localStorage:", gridData);
            alert("Dữ liệu đã được lưu thành công!");
        } catch (error) {
            console.error("❌ Lỗi khi lưu dữ liệu:", error);
            alert("Lỗi khi lưu dữ liệu!");
        }
    };

    const handleLoadData = () => {
        try {
            const savedData = localStorage.getItem("SupplyAndDemandGridData");
            if (savedData) {
                setGridData(JSON.parse(savedData));
                alert("Dữ liệu đã được tải lại!");
            } else {
                alert("Không có dữ liệu nào để tải!");
            }
        } catch (error) {
            console.error("❌ Lỗi khi tải dữ liệu:", error);
            alert("Lỗi khi tải dữ liệu!");
        }
    };

    return (
        <Container>
            <GridDisplay gridData={gridData} />

            <Card className="mb-4">
                <Card.Header className="bg-primary text-white d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">KHU VỰC THAY ĐỔI CẤU HÌNH</h5>
                    <Badge bg="light" text="dark">
                        {rows} hàng × {columns} cột
                    </Badge>
                </Card.Header>
                <Card.Body>
                    <div className="mb-3">
                        <Button variant="success" onClick={handleSaveData} className="me-2">
                            <i className="bi bi-save me-1"></i> Lưu dữ liệu
                        </Button>
                        <Button variant="warning" onClick={handleLoadData} className="me-2">
                            <i className="bi bi-upload me-1"></i> Tải dữ liệu
                        </Button>
                        <Button variant="outline-secondary" onClick={() => window.location.reload()}>
                            <i className="bi bi-arrow-clockwise me-1"></i> Làm mới
                        </Button>
                    </div>

                    <div className="table-responsive">
                        <Table bordered hover>
                            <thead className="table-light">
                                <tr>
                                    <th className="text-center">#</th>
                                    {Array.from({ length: columns }).map((_, index) => (
                                        <th key={index} className="text-center">Cột {index + 1}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {gridData.map((row, rowIndex) => (
                                    <tr key={rowIndex}>
                                        <td className="text-center fw-bold">{rowIndex + 1}</td>
                                        {row.map((cell, colIndex) => (
                                            <td key={colIndex} className="p-0">
                                                <Form.Control
                                                    type="text"
                                                    value={cell.value}
                                                    onChange={(e) => handleCellChange(rowIndex, colIndex, e.target.value)}
                                                    className={`border-0 text-center ${cell.status === 'filled' ? 'bg-light' : ''}`}
                                                />
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </div>
                </Card.Body>
            </Card>

            <Row>
                <Col md={6}>
                    <Card>
                        <Card.Header className="bg-light">
                            <h6 className="mb-0">Thống kê </h6>
                        </Card.Header>
                        <Card.Body>
                            <div className="d-flex justify-content-between mb-2">
                                <span>Tổng số ô:</span>
                                <Badge bg="secondary">{rows * columns}</Badge>
                            </div>
                            <div className="d-flex justify-content-between mb-2">
                                <span>Đã nhập:</span>
                                <Badge bg="success">
                                    {gridData.flat().filter(cell => cell.status === 'filled').length}
                                </Badge>
                            </div>
                            <div className="d-flex justify-content-between">
                                <span>Còn trống:</span>
                                <Badge bg="danger">
                                    {rows * columns - gridData.flat().filter(cell => cell.status === 'filled').length}
                                </Badge>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
                {/* <Col md={6}>
                    <Card>
                        <Card.Header className="bg-light">
                            <h6 className="mb-0">Trạng thái</h6>
                        </Card.Header>
                        <Card.Body>
                            <div className="d-flex align-items-center justify-content-center h-100">
                                <Badge bg="info" className="p-3 fs-6">
                                    <i className="bi bi-check-circle me-1"></i>
                                    Sẵn sàng nhập liệu
                                </Badge>
                            </div>
                        </Card.Body>
                    </Card>
                </Col> */}
            </Row>
        </Container>
    );
};

export default SupplyAndDemandComponent;