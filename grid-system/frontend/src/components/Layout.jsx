import React from 'react';
import { Navbar, Nav, Button, Badge } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Layout = ({ children }) => {
    const { currentUser, logout, isAdmin } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        // Nếu không redirect tự động, navigate đến login
        if (!currentUser?.fromAdminSystem) {
            navigate('/login');
        }
    };

    return (
        <div className="d-flex flex-column min-vh-100 w-100">
            <Navbar bg="dark" variant="dark" expand="lg" className="w-100">
                <div className="container-fluid">
                    <Navbar.Brand as={Link} to="/">
                        🏭 Worker System
                        {currentUser?.fromAdminSystem && (
                            <Badge bg="info" className="ms-2">Unified Login</Badge>
                        )}
                    </Navbar.Brand>
                    <Navbar.Toggle aria-controls="basic-navbar-nav" />
                    <Navbar.Collapse id="basic-navbar-nav">
                        <Nav className="me-auto">
                            <Nav.Link as={Link} to="/khu4" className="mx-1">Khu 4</Nav.Link>
                            <Nav.Link as={Link} to="/khu5" className="mx-1">Khu 5</Nav.Link>
                            <Nav.Link as={Link} to="/history" className="mx-1">Lịch sử</Nav.Link>
                            {currentUser && isAdmin() && (
                                <Nav.Link as={Link} to="/settings" className="mx-1">Cài đặt</Nav.Link>
                            )}
                        </Nav>
                        <Nav>
                            {currentUser ? (
                                <>
                                    <Navbar.Text className="me-3">
                                        <span className="text-info">
                                            {currentUser.fromAdminSystem && '🔗 '}
                                        </span>
                                        Đăng nhập với: <span className="text-white fw-bold">{currentUser.username}</span>
                                        {isAdmin() && <span className="badge bg-danger ms-2">Admin</span>}
                                        {currentUser.fromAdminSystem && (
                                            <div className="small text-muted">
                                                Từ Admin System ({new Date(currentUser.loginTime).toLocaleTimeString()})
                                            </div>
                                        )}
                                    </Navbar.Text>
                                    <Button
                                        variant={currentUser.fromAdminSystem ? "outline-info" : "outline-light"}
                                        onClick={handleLogout}
                                    >
                                        {currentUser.fromAdminSystem ? 'Về Admin System' : 'Đăng xuất'}
                                    </Button>
                                </>
                            ) : (
                                <Nav.Link as={Link} to="/login">Đăng nhập</Nav.Link>
                            )}
                        </Nav>
                    </Navbar.Collapse>
                </div>
            </Navbar>
            <div className="container-fluid main-container flex-grow-1 py-3">
                {children}
            </div>
        </div>
    );
};

export default Layout;