import React, { useState, createContext, useContext } from 'react';

// Tạo context
const HistoryContext = createContext();

// Custom hook để sử dụng context
export const useHistory = () => useContext(HistoryContext);

// Provider Component
export const HistoryProvider = ({ children }) => {
    const [history, setHistory] = useState([]);

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