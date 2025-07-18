// src/pages/AreaPage.jsx
import React, { useEffect } from 'react';
import { Container, Alert } from 'react-bootstrap';
import GridDisplay from '../components/GridDisplay';
import { useSettings } from '../contexts/SettingsContext';

const AreaPage = ({ khu, config }) => {
  const { switchKhu, showAlert, alertMessage, setShowAlert } = useSettings();

  useEffect(() => {
    let timeoutId;
    const switchArea = async () => {
      console.log(`Bắt đầu chuyển sang ${khu}`);
      await switchKhu(khu);
      console.log(`Đã gọi switchKhu cho ${khu}, thiết lập timeout`);
      timeoutId = setTimeout(() => setShowAlert(false), 3000);
    };

    switchArea();

    return () => {
      console.log(`Cleanup useEffect cho ${khu}`);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [khu, switchKhu]);

  return (
    <Container>
      {showAlert && (
        <Alert
          variant={alertMessage.includes('Lỗi') ? 'danger' : 'success'}
          onClose={() => setShowAlert(false)}
          dismissible
        >
          {alertMessage}
        </Alert>
      )}
      <GridDisplay />
    </Container>
  );
};

export default AreaPage;