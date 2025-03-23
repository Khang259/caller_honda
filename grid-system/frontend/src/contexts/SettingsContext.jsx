
import React, { createContext, useContext, useState, useEffect } from 'react';
import { checkServerConnection, defaultServers } from '../services/api';

const SettingsContext = createContext(); 

export const SettingsProvider = ({ children }) => {
    const loadUserConfig = async () => {
        if (window.electronAPI) {
            const savedConfig = await window.electronAPI.loadConfig();
            return savedConfig || null;
        } else {
            const savedConfig = localStorage.getItem("userConfig");
            return savedConfig ? JSON.parse(savedConfig) : null;
        }
    };

    const saveUserConfig = async (config) => {
        if (window.electronAPI) {
            await window.electronAPI.saveConfig(config);
        } else {
            localStorage.setItem("userConfig", JSON.stringify(config));
        }
    };

    const [serverIPs, setServerIPs] = useState(['127.0.0.1:8000']);
    const [inputServerIP, setInputServerIP] = useState(''); 
    const [khu4Config, setKhu4Config] = useState({ rows: 4, columns: 4, cells: 16 });
    const [khu5Config, setKhu5Config] = useState({ rows: 4, columns: 4, cells: 16 });
    const [activeKhu, setActiveKhu] = useState('khu4');
    const [showAlert, setShowAlert] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');

    // Khởi tạo cấu hình từ userConfig.json
    useEffect(() => {
        const initializeConfig = async () => {
            const savedConfig = await loadUserConfig();
            if (savedConfig) {
                setServerIPs(
                    Array.isArray(savedConfig.serverIPs) && savedConfig.serverIPs.length > 0
                        ? savedConfig.serverIPs.filter(ip => ip && typeof ip === 'string')
                        : ['127.0.0.1:8000']
                );
                setKhu4Config(savedConfig.khu4Config || { rows: 4, columns: 4, cells: 16 });
                setKhu5Config(savedConfig.khu5Config || { rows: 4, columns: 4, cells: 16 });
                setActiveKhu(savedConfig.activeKhu || 'khu4');
            } else {
                setServerIPs(['127.0.0.1:8000']);
            }
        };
        initializeConfig();
    }, []);

    // Đồng bộ inputServerIP với serverIPs
    useEffect(() => {
        setInputServerIP(serverIPs.join(', '));
    }, [serverIPs]);

    const switchKhu = async (khu) => {
        try {
            setActiveKhu(khu);
    
            // 🔥 Tải lại cấu hình trước khi lưu
            const savedConfig = await loadUserConfig();  
    
            const configToSave = {
                serverIPs,
                khu4Config,
                khu5Config,
                activeKhu: khu,
                gridData: savedConfig?.gridData || { khu4: [], khu5: [] }
            };
    
            await saveUserConfig(configToSave);
        } catch (error) {
            console.error(`Lỗi khi chuyển khu: ${error.message}`);
        }
    };
    

    const handleSaveConfig = async () => {
        try {
            const newServerIPs = inputServerIP
                .split(',')
                .map(ip => ip.trim())
                .filter(ip => ip !== '');
    
            if (newServerIPs.length === 0) {
                throw new Error('Vui lòng nhập ít nhất một địa chỉ IP:port!');
            }
    
            // Kiểm tra định dạng IP:port
            const ipPortRegex = /^(?:\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}|localhost):[0-9]{1,5}$/;
            for (const ip of newServerIPs) {
                if (!ipPortRegex.test(ip)) {
                    throw new Error(`Địa chỉ ${ip} không hợp lệ! Vui lòng nhập theo định dạng IP:port (vd: 127.0.0.1:8000)`);
                }
            }
    
            // Chỉ kiểm tra server đầu tiên với /health-check
            if (newServerIPs.length > 0) {
                const firstServerIP = newServerIPs[0];
                const isConnected = await checkServerConnection(firstServerIP, "", true);
                if (!isConnected) {
                    throw new Error(`Không thể kết nối đến server ${firstServerIP}!`);
                }
            }
    
            // 🔥 Tải lại cấu hình trước khi lưu
            const savedConfig = await loadUserConfig(); 
    
            setServerIPs(newServerIPs);
            const configToSave = {
                serverIPs: newServerIPs,
                khu4Config,
                khu5Config,
                activeKhu,
                gridData: savedConfig?.gridData || { khu4: [], khu5: [] }
            };
    
            await saveUserConfig(configToSave);
            setAlertMessage('Cấu hình đã được lưu thành công!');
            setShowAlert(true);
        } catch (error) {
            setAlertMessage(`Lỗi: ${error.message}`);
            setShowAlert(true);
        }
    };
    
    

    const handleReset = async () => {
        setServerIPs(['127.0.0.1:8000']);
        setInputServerIP('127.0.0.1:8000');
        setKhu4Config({ rows: 4, columns: 4, cells: 16 });
        setKhu5Config({ rows: 4, columns: 4, cells: 16 });
        setActiveKhu('khu4');
        const configToSave = {
            serverIPs: ['127.0.0.1:8000'],
            khu4Config: { rows: 4, columns: 4, cells: 16 },
            khu5Config: { rows: 4, columns: 4, cells: 16 },
            activeKhu: 'khu4',
            gridData: { khu4: [], khu5: [] }
        };
        await saveUserConfig(configToSave);
        setAlertMessage('Đã khôi phục cài đặt mặc định! Vui lòng khởi động lại ứng dụng để áp dụng.');
        setShowAlert(true);
    };

    return (
        <SettingsContext.Provider
            value={{
                serverIPs,
                inputServerIP,
                setInputServerIP,
                khu4Config,
                setKhu4Config,
                khu5Config,
                setKhu5Config,
                activeKhu,
                switchKhu,
                handleSaveConfig,
                handleReset,
                showAlert,
                setShowAlert,
                alertMessage,
                setAlertMessage
            }}
        >
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => useContext(SettingsContext);