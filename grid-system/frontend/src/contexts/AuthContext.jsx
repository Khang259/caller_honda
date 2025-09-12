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
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
            setCurrentUser(JSON.parse(storedUser));
        }
        setLoading(false);
    }, []);

    // Danh sách người dùng mẫu
    const users = [
        { username: 'admin', password: 'admin123', role: 'admin' },
        { username: 'user_AE', password: 'userae', role: 'user' },
        { username: 'user_DCC', password: 'userdcc', role: 'user' },
        { username: 'user_ae3', password: 'userae3', role: 'user_ae3' },
        { username: 'user_ae4', password: 'userae4', role: 'user_ae4' },
        { username: 'user_main_ovh', password: 'usermainovh', role: 'user_main_ovh' }
    ];

    // Đăng nhập
    const login = (username, password) => {
        const user = users.find(u => u.username === username && u.password === password);
        if (user) {
            const userInfo = { username: user.username, role: user.role };
            setCurrentUser(userInfo);
            localStorage.setItem('currentUser', JSON.stringify(userInfo));
            return true;
        }
        return false;
    };

    // Đăng xuất
    const logout = () => {
        setCurrentUser(null);
        localStorage.removeItem('currentUser');
    };

    // Kiểm tra quyền
    const isAdmin = () => {
        return currentUser && currentUser.role === 'admin';
    };

    const isUserAE3 = () => {
        return currentUser && currentUser.role === 'user_ae3';
    };

    const isUserAE4 = () => {
        return currentUser && currentUser.role === 'user_ae4';
    };

    const isUserMainOvh = () => {
        return currentUser && currentUser.role === 'user_main_ovh';
    };

    const value = {
        currentUser,
        login,
        logout,
        isAdmin,
        isUserAE3,
        isUserAE4,
        isUserMainOvh,
        loading
    };

    //Nếu loading là false, component con(children) mới được render.
    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export default AuthProvider;