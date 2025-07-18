// src/services/settings.js
export const saveUserConfig = async (config) => {
    localStorage.setItem('userConfig', JSON.stringify(config));
  };
  
  export const loadUserConfig = () => {
    return JSON.parse(localStorage.getItem('userConfig') || '{}');
  };
  
  export const sendLogToServer = async (logData) => {
    console.log('Sending log to server:', logData);
  };
  
  export const updateGridData = (khu, newRows, newColumns) => {
    const key = khu === 'SupplyAndDemand' 
      ? 'SupplyAndDemandGridData' 
      : khu === 'Supply' 
        ? 'SupplyGridData' 
        : 'DemandGridData';
  
    const savedData = localStorage.getItem(key);
    let gridData = savedData ? JSON.parse(savedData) : [];
  
    const newGridData = Array(newRows).fill().map((_, rowIndex) =>
      Array(newColumns).fill().map((_, colIndex) => {
        const cellIndex = rowIndex * newColumns + colIndex + 1;
        if (gridData[rowIndex] && gridData[rowIndex][colIndex]) {
          return gridData[rowIndex][colIndex];
        }
        return { value: JSON.stringify({ cell: cellIndex }) };
      })
    );
  
    localStorage.setItem(key, JSON.stringify(newGridData));
  };