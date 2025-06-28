import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './Header.module.css'; // Header専用のCSSをインポート

export function Header() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    // ログアウト処理
    logout();
    navigate('/');
  };

  return (
    <header className={styles.header}>
      <Link to={currentUser ? "/dashboard" : "/"} className={styles.logo}>
        動画採点サイト
      </Link>
    {currentUser && currentUser.role === 'admin' && (
    <Link to="/admin" className={styles.navLink}>
      管理者ページ
    </Link>
    )}
      <nav>
        <Link to="/results" className={styles.navLink}>
          最終結果
        </Link>
        {currentUser ? (
          <>
            <span className={styles.userInfo}>ようこそ、{currentUser.name} さん</span>
            <button onClick={handleLogout} className={styles.navButton}>ログアウト</button>
          </>
        ) : (
          <>
            <Link to="/login" className={styles.navLink}>ログイン</Link>
            <Link to="/register" className={styles.navButton}>新規登録</Link>
          </>
        )}
      </nav>
    </header>
  );
}