import React, { createContext, useState, useContext, useEffect } from 'react';

// AuthContext được tạo ra để chia sẻ dữ liệu xác thực (auth) giữa các component trong ứng dụng
const AuthContext = createContext();

//useAuth() là một hook giúp các component dễ dàng truy cập dữ liệu từ AuthContext.
export const useAuth = () => useContext(AuthContext);


//    currentUser: Lưu trữ thông tin người dùng hiện tại(hoặc null nếu chưa đăng nhập).
//    loading: Cho biết dữ liệu xác thực đang được tải từ localStorage.

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Khởi tạo từ localStorage khi ứng dụng bắt đầu
    useEffect(() => {
        const initializeAuth = async () => {
            try {
                // Kiểm tra pending auth từ admin system trước
                const pendingAuth = localStorage.getItem('pendingAuth');

                if (pendingAuth) {
                    console.log('🔄 Nhận session từ Admin System...');
                    const sessionData = JSON.parse(pendingAuth);

                    // Validate session data
                    if (sessionData.username && sessionData.role && sessionData.system === 'worker') {
                        const userData = {
                            username: sessionData.displayName || sessionData.username,
                            role: sessionData.role,
                            sessionId: sessionData.sessionId,
                            loginTime: sessionData.loginTime,
                            fromAdminSystem: true
                        };

                        setCurrentUser(userData);

                        // Lưu vào localStorage của worker system
                        localStorage.setItem('currentUser', JSON.stringify(userData));

                        // Xóa pending auth
                        localStorage.removeItem('pendingAuth');

                        console.log('✅ Đăng nhập thành công từ Admin System:', userData);

                        // Hiển thị thông báo chào mừng
                        if (window.toast) {
                            window.toast.success(`Chào mừng ${userData.username} đến Worker System!`);
                        }
                    } else {
                        console.error('❌ Invalid session data from admin system');
                        localStorage.removeItem('pendingAuth');
                    }
                } else {
                    // Fallback: Kiểm tra localStorage của worker system
                    const storedUser = localStorage.getItem('currentUser');
                    if (storedUser) {
                        const userData = JSON.parse(storedUser);
                        setCurrentUser(userData);
                        console.log('📱 Khôi phục session từ Worker System:', userData);
                    }
                }
            } catch (error) {
                console.error('❌ Lỗi khởi tạo auth:', error);
                // Cleanup invalid data
                localStorage.removeItem('pendingAuth');
                localStorage.removeItem('currentUser');
            } finally {
                setLoading(false);
            }
        };

        initializeAuth();
    }, []);

    // Danh sách người dùng mẫu (giữ lại cho fallback)
    const users = [
        { username: 'admin', password: 'admin123', role: 'admin' },
        { username: 'user', password: 'user123', role: 'user' }
    ];

    // Đăng nhập local (fallback)
    const login = (username, password) => {
        const user = users.find(u => u.username === username && u.password === password);
        if (user) {
            const userInfo = {
                username: user.username,
                role: user.role,
                sessionId: `local_${Date.now()}`,
                loginTime: new Date().toISOString(),
                fromAdminSystem: false
            };
            setCurrentUser(userInfo);
            localStorage.setItem('currentUser', JSON.stringify(userInfo));
            return true;
        }
        return false;
    };

    // Đăng xuất
    const logout = () => {
        const wasFromAdminSystem = currentUser?.fromAdminSystem;

        setCurrentUser(null);
        localStorage.removeItem('currentUser');
        localStorage.removeItem('pendingAuth');

        // Nếu đăng nhập từ admin system, redirect về admin login
        if (wasFromAdminSystem) {
            if (window.toast) {
                window.toast.info('Đang chuyển về Admin System...');
            }
            setTimeout(() => {
                window.location.href = 'http://localhost:3000/login';
            }, 1000);
        }
    };

    // Kiểm tra quyền admin
    const isAdmin = () => {
        return currentUser && currentUser.role === 'admin';
    };

    const value = {
        currentUser,
        login,
        logout,
        isAdmin,
        loading
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export default AuthProvider;