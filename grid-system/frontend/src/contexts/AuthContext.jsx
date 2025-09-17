// src/contexts/AuthContext.jsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [config, setConfig] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const storedUser = localStorage.getItem('currentUser');
        const storedConfig = localStorage.getItem('userConfig');
        if (storedUser && storedConfig) {
            console.log('Debug: Khôi phục currentUser từ localStorage:', JSON.parse(storedUser));
            console.log('Debug: Khôi phục config từ localStorage:', storedConfig);
            setCurrentUser(JSON.parse(storedUser));
            try {
                setConfig(JSON.parse(storedConfig));
            } catch (error) {
                console.error('Debug: Lỗi parse userConfig từ localStorage:', error);
                setConfig(null);
            }
        }
        setLoading(false);
    }, []);

    const login = async (username, password) => {
        try {
            console.log('Debug: Gửi yêu cầu đăng nhập:', { username, password });
            const response = await axios.post('http://192.168.1.7:1838/login', { username, password });
            const { username: user, role, config } = response.data.data;
            console.log('Debug: Nhận response từ API:', response.data);
            console.log('Debug: Config nhận được:', config);

            // Kiểm tra config trước khi lưu
            if (!config) {
                console.warn('Debug: Config từ API là null hoặc undefined');
                setConfig(null);
            } else {
                setConfig(config);
            }

            setCurrentUser({ username: user, role });
            localStorage.setItem('currentUser', JSON.stringify({ username: user, role }));
            localStorage.setItem('userConfig', JSON.stringify(config || {}));
            console.log('Debug: Đã lưu userConfig vào localStorage:', config || {});
            return true;
        } catch (error) {
            const errorMessage = error.response?.data?.detail || error.message;
            console.error('Debug: Lỗi đăng nhập:', errorMessage);
            return false;
        }
    };

    const logout = () => {
        console.log('Debug: Đăng xuất, xóa currentUser và config');
        setCurrentUser(null);
        setConfig(null);
        localStorage.removeItem('currentUser');
        localStorage.removeItem('userConfig');
    };

    const isAdmin = () => currentUser?.role === 'admin';
    const isUserAE3 = () => currentUser?.role === 'user_ae3';
    const isUserAE4 = () => currentUser?.role === 'user_ae4';
    const isUserMainOvh = () => currentUser?.role === 'user_main_ovh';

    const value = {
        currentUser,
        config,
        login,
        logout,
        isAdmin,
        isUserAE3,
        isUserAE4,
        isUserMainOvh,
        loading
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export default AuthProvider;