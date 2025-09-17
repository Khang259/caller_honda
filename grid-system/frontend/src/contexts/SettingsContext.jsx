// src/contexts/SettingsContext.jsx
import React, { useState, useEffect, createContext, useContext } from 'react';
import { useAuth } from './AuthContext';
import { saveUserConfig, loadUserConfig, sendLogToServer } from '../services/settings';
import { fetchConfig, saveConfig } from '../services/config';

const SettingsContext = createContext();
const API_ICS_URL = import.meta.env.VITE_ICS_API_URL;
const API_URL = import.meta.env.VITE_API_URL;

const defaultSupplyAndDemandConfig = { rows: 1, columns: 1, cells: 1 };
const defaultSupplyConfig = { rows: 1, columns: 1, cells: 1 };
const defaultDemandConfig = { rows: 1, columns: 1, cells: 1 };

const getInitialConfig = () => {
  const savedConfigRaw = localStorage.getItem('userConfig');
  let savedConfig = {};

  if (savedConfigRaw) {
    try {
      savedConfig = JSON.parse(savedConfigRaw);
      console.log('Debug: Parsed userConfig từ localStorage:', savedConfig);
    } catch (error) {
      console.error('Debug: Lỗi parse userConfig từ localStorage:', error);
      savedConfig = {};
    }
  } else {
    console.log('Debug: Không tìm thấy userConfig trong localStorage, sử dụng mặc định');
  }

  const defaultConfig = {
    serverIPs: [API_URL, API_ICS_URL], // Giá trị mặc định từ log
    SupplyAndDemandConfig: defaultSupplyAndDemandConfig,
    SupplyConfig: defaultSupplyConfig,
    DemandConfig: defaultDemandConfig,
    username: ['admin']
  };

  return {
    serverIPs: savedConfig.serverIPs && Array.isArray(savedConfig.serverIPs) && savedConfig.serverIPs.length > 0
      ? savedConfig.serverIPs.filter(ip => ip && typeof ip === 'string')
      : defaultConfig.serverIPs,
    SupplyAndDemandConfig: savedConfig.SupplyAndDemandConfig || defaultSupplyAndDemandConfig,
    SupplyConfig: savedConfig.SupplyConfig || defaultSupplyConfig,
    DemandConfig: savedConfig.DemandConfig || defaultDemandConfig,
    username: savedConfig.username && Array.isArray(savedConfig.username) && savedConfig.username.length > 0
      ? savedConfig.username.filter(username => username && typeof username === 'string')
      : defaultConfig.username
  };
};

export const SettingsProvider = ({ children }) => {
  const authContext = useAuth();
  const authConfig = authContext ? authContext.config : null;
  const initialConfig = getInitialConfig();
  const [serverIPs, setServerIPs] = useState(authConfig?.serverIPs || initialConfig.serverIPs);
  const [inputServerIP, setInputServerIP] = useState(serverIPs.join(', '));
  const [inputUsername, setInputUsername] = useState(initialConfig.username.join(', '));
  const [SupplyAndDemandConfig, setSupplyAndDemandConfig] = useState(initialConfig.SupplyAndDemandConfig);
  const [SupplyConfig, setSupplyConfig] = useState(initialConfig.SupplyConfig);
  const [DemandConfig, setDemandConfig] = useState(initialConfig.DemandConfig);
  const [activeKhu, setActiveKhu] = useState('SupplyAndDemand');
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  useEffect(() => {
    console.log('Debug: serverIPs initialized:', serverIPs);
    if (authConfig?.serverIPs) {
      setServerIPs(authConfig.serverIPs);
      setInputServerIP(authConfig.serverIPs.join(', '));
      console.log('Debug: Cập nhật serverIPs từ AuthContext:', authConfig.serverIPs);
    } else {
      console.log('Debug: Không có authConfig, sử dụng serverIPs từ initialConfig:', serverIPs);
    }
  }, [authConfig]);

  const switchKhu = async (khu) => {
    setActiveKhu(khu);
    const logData = { timestamp: new Date().toISOString(), khu, action: 'switch' };
    await sendLogToServer(logData);
  };

  const handleSaveConfig = async () => {
    const newServerIPs = inputServerIP.split(',').map(ip => ip.trim()).filter(ip => ip);
    const newUsername = inputUsername.split(',').map(username => username.trim()).filter(username => username);
    if (newServerIPs.length === 0 || newUsername.length === 0) {
      setShowAlert(true);
      setAlertMessage('Vui lòng nhập ít nhất một địa chỉ IP và một tên người dùng!');
      return;
    }

    try {
      const newConfig = {
        serverIPs: newServerIPs,
        username: newUsername,
        SupplyAndDemandConfig,
        SupplyConfig,
        DemandConfig
      };
      
      await saveUserConfig(newConfig);
      setServerIPs(newServerIPs);
      
      if (newServerIPs.length > 0 && newUsername.length > 0) {
        try {
          await saveConfig(newServerIPs, newConfig, newUsername[0]);
          setShowAlert(true);
          setAlertMessage('Đã lưu cấu hình thành công vào MongoDB!');
        } catch (mongoError) {
          console.warn('Debug: Không thể lưu vào MongoDB:', mongoError);
          setShowAlert(true);
          setAlertMessage(`Cảnh báo: Không thể lưu cấu hình vào MongoDB. Lỗi: ${mongoError.message}`);
        }
      } else {
        setShowAlert(true);
        setAlertMessage('Đã lưu cấu hình thành công!');
      }
    } catch (error) {
      setShowAlert(true);
      setAlertMessage(`Lỗi khi lưu cấu hình: ${error.message}`);
    }
  };

  const handleReset = () => {
    setServerIPs(['192.168.1.6:1838', '192.168.1.6:7000']);
    setInputServerIP('192.168.1.6:1838,192.168.1.6:7000');
    setInputUsername('user_ae3');
    setSupplyAndDemandConfig(defaultSupplyAndDemandConfig);
    setSupplyConfig(defaultSupplyConfig);
    setDemandConfig(defaultDemandConfig);
  };

  const handleConfigChange = (khu, field, value) => {
    const newValue = parseInt(value) || 1;
    const configMap = {
      SupplyAndDemand: [SupplyAndDemandConfig, setSupplyAndDemandConfig],
      Supply: [SupplyConfig, setSupplyConfig],
      Demand: [DemandConfig, setDemandConfig]
    };
    const [config, setConfig] = configMap[khu];
    const newConfig = { ...config, [field]: newValue };
    
    if (field === 'rows' || field === 'columns') {
      if (config.cells === config.rows * config.columns) {
        newConfig.cells = newConfig.rows * newConfig.columns;
      }
    }
    
    setConfig(newConfig);
  };

  const value = {
    serverIPs,
    inputServerIP,
    setInputServerIP,
    inputUsername,
    setInputUsername,
    SupplyAndDemandConfig,
    setSupplyAndDemandConfig,
    SupplyConfig,
    setSupplyConfig,
    DemandConfig,
    setDemandConfig,
    activeKhu,
    switchKhu,
    handleSaveConfig,
    handleReset,
    showAlert,
    setShowAlert,
    alertMessage,
    setAlertMessage,
    handleConfigChange
  };

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used within a SettingsProvider');
  return context;
};