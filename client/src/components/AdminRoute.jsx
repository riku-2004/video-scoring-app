import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';

export function AdminRoute({ children }) {
  const { currentUser } = useAuth();

  if (!currentUser || currentUser.role !== 'admin') {
    // ログインしていないか、管理者でなければダッシュボードへリダイレクト
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}