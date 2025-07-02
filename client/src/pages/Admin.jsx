import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

function Admin() {
  const [videos, setVideos] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedCastIds, setSelectedCastIds] = useState([]);
  const [newVideo, setNewVideo] = useState({ id: '', title: '', url: ''});
  const { token } = useAuth();

  // 動画リストを取得する関数
  const fetchVideos = async () => {
    const response = await fetch('http://localhost:3001/api/videos');
    const data = await response.json();
    setVideos(data);
  };

  const handleCastChange = (userId) => {
    setSelectedCastIds(prevSelectedIds =>
      prevSelectedIds.includes(userId)
        ? prevSelectedIds.filter(id => id !== userId)
        : [...prevSelectedIds, userId]
    );
  };

  // 初期表示時に動画リストを取得
  useEffect(() => {
    fetchVideos();
  }, []);

  // フォームの入力値をハンドル
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewVideo({ ...newVideo, [name]: value });
  };

  // 動画を追加する処理
  const handleCreateVideo = async (e) => {
    e.preventDefault();
    try {
      // castはカンマ区切りの文字列を配列に変換
      const response = await fetch('/api/videos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ...newVideo, cast: selectedCastIds }),
      });
      if (response.ok) {
        alert('動画を追加しました。');
        setNewVideo({ id: '', title: '', url: '' }); // フォームをリセット
        setSelectedCastIds([]); // 選択した出演者をリセット
        fetchVideos(); // リストを再取得して更新
      } else {
        const data = await response.json();
        alert(`エラー: ${data.error}`);
      }
    } catch (err) {
      alert('動画の追加に失敗しました。');
    }
  };

  // 動画を削除する処理
  const handleDeleteVideo = async (videoId) => {
    if (!confirm(`${videoId}を本当に削除しますか？`)) return;
    try {
      const response = await fetch(`/api/videos/${videoId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        alert('動画を削除しました。');
        fetchVideos(); // リストを再取得して更新
      } else {
        const data = await response.json();
        alert(`エラー: ${data.error}`);
      }
    } catch (err) {
      alert('動画の削除に失敗しました。');
    }
  };

  return (
    <div>
      <h1>管理者ページ：動画管理</h1>

      {/* 新規動画追加フォーム */}
      <div className="form-container">
        <h2>新しい動画を追加</h2>
        <form onSubmit={handleCreateVideo}>
          <input name="id" value={newVideo.id} onChange={handleInputChange} placeholder="動画ID (例: v5)" required />
          <input name="title" value={newVideo.title} onChange={handleInputChange} placeholder="動画タイトル" required />
          <input name="url" value={newVideo.url} onChange={handleInputChange} placeholder="動画URL" required />
          <div>
            <lavel>出演者を選択</lavel>
            <div style={{ border: '1px solid #ccc', padding: '10px', maxHeight: '150px', overflowY: 'auto' }}>
              {users.map(user => (
                <div key={user.id}>
                  <input
                    type="checkbox"
                    id={`cast-${user.id}`}
                    checked={selectedCastIds.includes(user.id)}
                    onChange={() => handleCastChange(user.id)}
                  />
                  <label htmlFor={`cast-${user.id}`}>{user.name} ({user.email})</label>
                </div>
              ))}
            </div>
          </div>
          <button type="submit">追加</button>
        </form>
      </div>

      <hr />

      {/* 動画リスト */}
      <h2>登録済み動画リスト</h2>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>タイトル</th>
            <th>出演者</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {videos.map(video => (
            <tr key={video.id}>
              <td>{video.id}</td>
              <td>{video.title}</td>
              <td>{video.cast.join(', ')}</td>
              <td>
                <button onClick={() => handleDeleteVideo(video.id)} style={{backgroundColor: '#dc3545'}}>削除</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Admin;