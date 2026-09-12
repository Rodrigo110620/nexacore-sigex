import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from '../pages//Login/LoginPage';

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </BrowserRouter>
  );
}