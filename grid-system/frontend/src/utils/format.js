// Chứa các hàm định dạng

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