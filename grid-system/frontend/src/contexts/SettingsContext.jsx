// src/contexts/SettingsContext.jsx
import React, { useState, useEffect, createContext, useContext } from 'react';
import { saveUserConfig, loadUserConfig, sendLogToServer } from '../services/settings';
import { fetchConfig, saveConfig } from '../services/config';

const SettingsContext = createContext();

const defaultSupplyAndDemandConfig = { rows: 1, columns: 1, cells: 1 };
const defaultSupplyConfig = { rows: 1, columns: 1, cells: 1 };
const defaultDemandConfig = { rows: 1, columns: 1, cells: 1 };

const getInitialConfig = () => {
  const savedConfig = JSON.parse(localStorage.getItem('userConfig') || '{}');
  return {
    serverIPs: savedConfig.serverIPs && Array.isArray(savedConfig.serverIPs) && savedConfig.serverIPs.length > 0
      ? savedConfig.serverIPs.filter(ip => ip && typeof ip === 'string')
      : ['127.0.0.1:8000'],
    SupplyAndDemandConfig: savedConfig.SupplyAndDemandConfig || defaultSupplyAndDemandConfig,
    SupplyConfig: savedConfig.SupplyConfig || defaultSupplyConfig,
    DemandConfig: savedConfig.DemandConfig || defaultDemandConfig,
    username: savedConfig.username && Array.isArray(savedConfig.username) && savedConfig.username.length > 0
      ? savedConfig.username.filter(username => username && typeof username === 'string')
      : ['admin']
  };
};

export const SettingsProvider = ({ children }) => {
  const initialConfig = getInitialConfig();
  const [serverIPs, setServerIPs] = useState(initialConfig.serverIPs);
  const [inputServerIP, setInputServerIP] = useState(serverIPs.join(', '));
  const [inputUsername, setInputUsername] = useState(serverIPs.join(', '));
  const [SupplyAndDemandConfig, setSupplyAndDemandConfig] = useState(initialConfig.SupplyAndDemandConfig);
  const [SupplyConfig, setSupplyConfig] = useState(initialConfig.SupplyConfig);
  const [DemandConfig, setDemandConfig] = useState(initialConfig.DemandConfig);
  const [activeKhu, setActiveKhu] = useState('SupplyAndDemand');
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  useEffect(() => {
    console.log('serverIPs initialized:', serverIPs);
  }, [serverIPs]);

  const switchKhu = async (khu) => {
    setActiveKhu(khu);
    const logData = { timestamp: new Date().toISOString(), khu, action: 'switch' };
    await sendLogToServer(logData);
  };

  const handleSaveConfig = async () => {
    const newServerIPs = inputServerIP.split(',').map(ip => ip.trim()).filter(ip => ip);
    const newUsername = inputUsername.split(',').map(username => username.trim()).filter(username => username);
    if (newServerIPs.length === 0 && newUsername.length === 0) {
      setShowAlert(true);
      setAlertMessage('Vui lòng nhập ít nhất một địa chỉ IP!');
      setAlertMessage('Vui lòng nhập ít nhất một tên người dùng!');
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
      
      // // Lưu vào localStorage
      // await saveUserConfig(newConfig);
      // setServerIPs(newServerIPs);
      
      // Lưu vào MongoDB nếu có server IP
      if (newServerIPs.length > 0 && newUsername.length > 0) {
        try {
          await saveConfig(newServerIPs[0], newConfig, newUsername[0]);
          setShowAlert(true);
          setAlertMessage('Đã lưu cấu hình thành công vào MongoDB!');
        } catch (mongoError) {
          console.warn('Không thể lưu vào MongoDB:', mongoError);
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
    setServerIPs(['127.0.0.1:8000']);
    setInputServerIP('127.0.0.1:8000');
    setInputUsername('None');
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
    
    // Chỉ cập nhật cells khi thay đổi rows/columns và cells chưa được set thủ công
    if (field === 'rows' || field === 'columns') {
      // Nếu cells chưa được set thủ công (bằng với rows * columns), thì tự động cập nhật
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