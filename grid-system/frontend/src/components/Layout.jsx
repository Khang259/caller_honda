import React from 'react';
import { Navbar, Nav, Button } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Layout = ({ children }) => {
    const { currentUser, logout, isAdmin, isUserAE3, isUserAE4 } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="d-flex flex-column min-vh-100 w-100">
            <Navbar bg="dark" variant="dark" expand="lg" className="w-100">
                <div className="container-fluid">
                    {/* <Navbar.Brand as={Link} to="/">Quản lý khu vực</NavbarBrand> */}
                    <Navbar.Brand to="/">Quản lý khu vực</Navbar.Brand>
                    <Navbar.Toggle aria-controls="basic-navbar-nav" />
                    <Navbar.Collapse id="basic-navbar-nav">
                        <Nav className="me-auto">
                            {/* Menu chung cho tất cả user đã đăng nhập */}
                            {currentUser && (
                                <>
                                    <Nav.Link as={Link} to="/SupplyAndDemand" className="mx-1">Cấp & Trả hàng</Nav.Link>
                                    <Nav.Link as={Link} to="/Supply" className="mx-1">Cấp hàng</Nav.Link>
                                    <Nav.Link as={Link} to="/Demand" className="mx-1">Trả trống</Nav.Link>
                                </>
                            )}
                            
                            {/* Menu chỉ dành cho Admin */}
                            {currentUser && isAdmin() && (
                                <Nav.Link as={Link} to="/settings" className="mx-1">Cài đặt</Nav.Link>
                            )}
                            
                            {/* Menu dành cho user_ae3 */}
                            {/* {currentUser && isUserAE3() && (
                                <>
                                    <Nav.Link as={Link} to="/ae3-supply" className="mx-1">Cấp phụ tùng AE_3</Nav.Link>
                                    <Nav.Link as={Link} to="/ae3-demand" className="mx-1">Trả xe trống AE_3</Nav.Link>
                                </>
                            )} */}
                            
                            {/* Menu dành cho user_ae4 */}
                            {/* {currentUser && isUserAE4() && (
                                <>
                                    <Nav.Link as={Link} to="/ae4-supply" className="mx-1">Cấp phụ tùng AE_4</Nav.Link>
                                    <Nav.Link as={Link} to="/ae4-demand" className="mx-1">Trả xe trống AE_4</Nav.Link>
                                </>
                            )} */}
                        </Nav>
                        <Nav>
                            {currentUser ? (
                                <>
                                    <Navbar.Text className="me-3">
                                        Đăng nhập với: <span className="text-white fw-bold">{currentUser.username}</span>
                                        {isAdmin() && <span className="badge bg-danger ms-2">Admin</span>}
                                        {isUserAE3() && <span className="badge bg-primary ms-2">AE_3</span>}
                                        {isUserAE4() && <span className="badge bg-success ms-2">AE_4</span>}
                                    </Navbar.Text>
                                    <Button variant="outline-light" onClick={handleLogout}>Đăng xuất</Button>
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