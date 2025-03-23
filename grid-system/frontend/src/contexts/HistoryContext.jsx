import React, { useState, createContext, useContext } from 'react';

// Tạo context
const HistoryContext = createContext();

// Custom hook để sử dụng context
export const useHistory = () => useContext(HistoryContext);

// Provider Component
export const HistoryProvider = ({ children }) => {
    const [history, setHistory] = useState([
        { id: 1, timestamp: '2025-03-14 09:15', action: 'Cấu hình đã lưu', khu: 'KHU 4' },
        { id: 2, timestamp: '2025-03-14 08:30', action: 'Kết nối máy chủ', khu: 'KHU 5' },
        { id: 3, timestamp: '2025-03-13 16:45', action: 'Khởi phục mặc định', khu: 'KHU 4' }
    ]);

    // Thêm mục mới vào lịch sử
    const addHistory = (action, khu = '') => {
        const now = new Date();
        const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        const newItem = {
            id: history.length > 0 ? Math.max(...history.map(item => item.id)) + 1 : 1,
            timestamp,
            action,
            khu
        };

        setHistory(prevHistory => [newItem, ...prevHistory]);
    };

    // Xóa toàn bộ lịch sử
    const clearHistory = () => {
        setHistory([]);
    };

    // Giá trị context
    const value = {
        history,
        addHistory,
        clearHistory
    };

    return (
        <HistoryContext.Provider value={value}>
            {children}
        </HistoryContext.Provider>
    );
};

export default HistoryProvider;