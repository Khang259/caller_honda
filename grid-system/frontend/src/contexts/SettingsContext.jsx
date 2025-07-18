// src/contexts/SettingsContext.jsx
import React, { useState, useEffect, createContext, useContext } from 'react';
import { saveUserConfig, loadUserConfig, sendLogToServer } from '../services/settings';

const SettingsContext = createContext();

const defaultSupplyAndDemandConfig = { rows: 5, columns: 5, cells: 22 };
const defaultSupplyConfig = { rows: 5, columns: 5, cells: 26 };
const defaultDemandConfig = { rows: 5, columns: 5, cells: 23 };

const getInitialConfig = () => {
  const savedConfig = JSON.parse(localStorage.getItem('userConfig') || '{}');
  return {
    serverIPs: savedConfig.serverIPs && Array.isArray(savedConfig.serverIPs) && savedConfig.serverIPs.length > 0
      ? savedConfig.serverIPs.filter(ip => ip && typeof ip === 'string')
      : ['192.168.1.7:8000'],
    SupplyAndDemandConfig: savedConfig.SupplyAndDemandConfig || defaultSupplyAndDemandConfig,
    SupplyConfig: savedConfig.SupplyConfig || defaultSupplyConfig,
    DemandConfig: savedConfig.DemandConfig || defaultDemandConfig
  };
};

export const SettingsProvider = ({ children }) => {
  const initialConfig = getInitialConfig();
  const [serverIPs, setServerIPs] = useState(initialConfig.serverIPs);
  const [inputServerIP, setInputServerIP] = useState(serverIPs.join(', '));
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
    if (newServerIPs.length === 0) {
      setShowAlert(true);
      setAlertMessage('Vui lòng nhập ít nhất một địa chỉ IP!');
      return;
    }

    try {
      const newConfig = {
        serverIPs: newServerIPs,
        SupplyAndDemandConfig,
        SupplyConfig,
        DemandConfig
      };
      await saveUserConfig(newConfig);
      setServerIPs(newServerIPs);
      setShowAlert(true);
      setAlertMessage('Đã lưu cấu hình thành công!');
    } catch (error) {
      setShowAlert(true);
      setAlertMessage(`Lỗi khi lưu cấu hình: ${error.message}`);
    }
  };

  const handleReset = () => {
    setServerIPs(['192.168.1.7:8000']);
    setInputServerIP('192.168.1.7:8000');
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
    if (field !== 'cells') {
      newConfig.cells = newConfig.rows * newConfig.columns;
    } else {
      newConfig.cells = Math.min(newValue, newConfig.rows * newConfig.columns);
    }
    setConfig(newConfig);
    if (field !== 'cells') {
      updateGridData(khu, newConfig.rows, newConfig.columns);
    }
  };

  const value = {
    serverIPs,
    inputServerIP,
    setInputServerIP,
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