// Chứa các hàm định dạng

// Mapping cho AE3 và AE4 dropdown options
const OPTION_LABEL_MAPPING = {
  // AE3 options
  "10000050": "AE3_XT_1",
  "10000048": "AE3_XT_2", 
  "10000046": "AE3_XT_3",
  "10000026": "AE3_XT_4",
  "10000024": "AE3_XT_5",
  "10000022": "AE3_XT_6",
  "10000020": "AE3_XT_7",
  "10000018": "AE3_XT_8",
  "10000016": "AE3_XT_9",
  
  // AE4 options
  "10000055": "AE4_XT_1",
  "10000060": "AE4_XT_2",
  "10000078": "AE4_XT_3", 
  "10000080": "AE4_XT_4",
  "10000082": "AE4_XT_5"
};

// Mapping cho Supply Grid Cell Labels - AE3 (cells 1-9)
const SUPPLY_AE3_CELL_MAPPING = {
  1: "DCC_3C1",    // 10000676
  2: "DCC_3A1",    // 10000675
  3: "DCC_3C2",    // 10000674
  4: "DCC_3C3",    // 10003137
  5: "DCC_3B1",    // 10000618
  6: "DCC_3C4",    // 10000617
  7: "DCC_3S2",    // 10000613
  8: "DCC_3S1",    // 10000612
  9: "DCC_3AECT"   // 10000627
};

// Mapping cho Supply Grid Cell Labels - AE4 (cells 1-10)
const SUPPLY_AE4_CELL_MAPPING = {
  1: "DCC_4C1",    // 10000607
  2: "DCC_4B1",    // 10000630
  3: "DCC_4C5",    // 10000625
  4: "DCC_4AECT",  // 10000624
  5: "DCC_4C4",    // 10000626
  6: "DCC_4C3",    // 10000628
  7: "DCC_4C2",    // 10000629
  8: "DCC_4C6",    // 10000623
  9: "DCC_4S1",    // 10000610
  10: "DCC_4S2"    // 10000611
};

/**
 * Format option value thành label hiển thị trong dropdown
 * @param {string} optionValue - Giá trị option (ví dụ: "10000050")
 * @returns {string} - Label tương ứng (ví dụ: "AE3_XT_1") hoặc giá trị gốc nếu không tìm thấy
 */
export const formatOptionLabel = (optionValue) => {
  if (!optionValue) return '';
  return OPTION_LABEL_MAPPING[optionValue] || optionValue;
};

/**
 * Kiểm tra xem option value có phải là AE3 hay không
 * @param {string} optionValue - Giá trị option
 * @returns {boolean}
 */
export const isAE3Option = (optionValue) => {
  return optionValue && OPTION_LABEL_MAPPING[optionValue]?.startsWith('AE3_');
};

/**
 * Kiểm tra xem option value có phải là AE4 hay không
 * @param {string} optionValue - Giá trị option
 * @returns {boolean}
 */
export const isAE4Option = (optionValue) => {
  return optionValue && OPTION_LABEL_MAPPING[optionValue]?.startsWith('AE4_');
};

/**
 * Lấy tất cả options theo loại (AE3 hoặc AE4)
 * @param {string} type - Loại option ('AE3' hoặc 'AE4')
 * @returns {Array} - Mảng các object {value, label}
 */
export const getOptionsByType = (type) => {
  return Object.entries(OPTION_LABEL_MAPPING)
    .filter(([value, label]) => label.startsWith(`${type}_`))
    .map(([value, label]) => ({ value, label }));
};

/**
 * Format cell label cho Supply grid dựa trên user type
 * @param {number} cellNumber - Số cell (1-9 cho AE3, 1-10 cho AE4)
 * @param {string} currentKhu - Khu vực hiện tại
 * @param {boolean} isUserAE3 - Có phải user AE3 không
 * @param {boolean} isUserAE4 - Có phải user AE4 không
 * @returns {string} - Label cho cell
 */
export const formatSupplyCellLabel = (cellNumber, currentKhu, isUserAE3, isUserAE4) => {
  if (currentKhu !== 'Supply') {
    return formatCellLabel(cellNumber, currentKhu); // Fallback to original function
  }
  
  if (isUserAE3 && SUPPLY_AE3_CELL_MAPPING[cellNumber]) {
    return SUPPLY_AE3_CELL_MAPPING[cellNumber];
  }
  
  if (isUserAE4 && SUPPLY_AE4_CELL_MAPPING[cellNumber]) {
    return SUPPLY_AE4_CELL_MAPPING[cellNumber];
  }
  
  // Fallback to original format nếu không match
  return formatCellLabel(cellNumber, currentKhu);
};

// src/utils/format.js
export const formatCellLabel = (selectedCell, currentKhu) => {
  if (currentKhu === 'SupplyAndDemand') {
    return selectedCell <= 14 ? `MS_${selectedCell.toString().padStart(2, '0')}` :
           selectedCell === 15 ? 'MS_15' :
           selectedCell === 16 || selectedCell === 17 ? `MS_${selectedCell}` :
           `PA_${(selectedCell - 17).toString().padStart(2, '0')}`;
  } else if (currentKhu === 'Demand') {
    return selectedCell <= 14 ? `MS_${selectedCell.toString().padStart(2, '0')}` :
           selectedCell >= 15 && selectedCell <= 16 ? `MS_15_${selectedCell - 14}` :
           selectedCell === 17 || selectedCell === 18 ? `MS_${selectedCell - 1}` :
           selectedCell === 24 ? `AE_1_2` :
           `PA_${(selectedCell - 18).toString().padStart(2, '0')}`;
  } else {
    return selectedCell <= 14 ? `MS_${selectedCell.toString().padStart(2, '0')}` :
           selectedCell >= 15 && selectedCell <= 19 ? `MS_15_${selectedCell - 14}` :
           selectedCell === 20 || selectedCell === 21 ? `MS_${selectedCell - 4}` :
           selectedCell === 27 ? `AE_2` :
           selectedCell === 28 ? `AE_1` :
           `PA_${(selectedCell - 21).toString().padStart(2, '0')}`;
  }
};