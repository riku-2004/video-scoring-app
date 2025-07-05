import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

function Admin() {
  const [videos, setVideos] = useState([]);
  // const [users, setUsers] = useState([]);
  const [members, setMembers] = useState([]); // ★メンバー名簿用のstate
  const [selectedCastIds, setSelectedCastIds] = useState([]);
  const [newVideo, setNewVideo] = useState({ id: '', title: '', url: ''});
  const [newMemberName, setNewMemberName] = useState(''); // ★新メンバーの名前用state
  const { token } = useAuth();

  // 動画リストを取得する関数
  const fetchVideos = useCallback(async () => {
    const response = await fetch('http://localhost:3001/api/videos');
    const data = await response.json();
    setVideos(data);
  }, []);

  const fetchMembers = useCallback(async () => {
    // このAPIは管理者認証が不要なので、tokenなしでOK
    const response = await fetch('/api/members');
    const data = await response.json();
    setMembers(data);
  }, []);
  
  useEffect(() => {
    // ページ表示時に必要なデータを全て取得
    fetchMembers();
    // fetchVideos(); // fetchUsers()の中で動画も取得するので不要かも
    // fetchUsers();
  }, [fetchMembers]); // fetchUsersなどを追加

  // ★メンバーを名簿に追加する処理
  const handleAddMember = async (e) => {
    e.preventDefault();
    try {
      await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: newMemberName })
      });
      setNewMemberName('');
      fetchMembers(); // リストを更新
    } catch (err) { alert('メンバーの追加に失敗しました。'); }
  };
  const handleCastChange = (userId) => {
    setSelectedCastIds(prevSelectedIds =>
      prevSelectedIds.includes(userId)
        ? prevSelectedIds.filter(id => id !== userId)
        : [...prevSelectedIds, userId]
    );
  };

  // ★メンバーを名簿から削除する処理
  const handleDeleteMember = async (memberId) => {
    if (!confirm('このメンバーを名簿から削除しますか？')) return;
    try {
      await fetch(`/api/members/${memberId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchMembers(); // リストを更新
    } catch (err) { alert('メンバーの削除に失敗しました。'); }
  };

  // 初期表示時に動画リストを取得
  useEffect(() => {
    fetchVideos();
  }, []);

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
        //body: JSON.stringify({ ...newVideo, cast: selectedCastIds }),
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
      <h1>管理者ページ</h1>

      {/* ▼▼▼ 新しいセクション：メンバー名簿管理 ▼▼▼ */}
      <div className="form-container">
        <h2>サークル員名簿の管理</h2>
        <form onSubmit={handleAddMember}>
          <input value={newMemberName} onChange={(e) => setNewMemberName(e.target.value)} placeholder="新しいメンバーの名前" required />
          <button type="submit">名簿に追加</button>
        </form>
        <ul style={{listStyle: 'none', padding: 0}}>
          {members.map(member => (
            <li key={member.id} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px'}}>
              {member.name}
              <button onClick={() => handleDeleteMember(member.id)} style={{backgroundColor: '#dc3545', width: 'auto', padding: '2px 8px'}}>削除</button>
            </li>
          ))}
        </ul>
      </div>

      <hr />
      
      {/* 動画追加フォームの出演者選択部分を修正 */}
      <div className="form-container">
        <h2>新しい動画を追加</h2>
        <form onSubmit={handleCreateVideo}>
          {/* ... (id, title, url の input) ... */}
          <div>
            <label>出演者を選択 (名簿から):</label>
            <div style={{ border: '1px solid #ccc', padding: '10px', maxHeight: '150px', overflowY: 'auto' }}>
              {members.map(member => ( // ★ usersではなくmembersからリストを作成
                <div key={member.id}>
                  <input type="checkbox" id={`cast-${member.id}`} checked={selectedCastIds.includes(member.id)} onChange={() => handleCastChange(member.id)} />
                  <label htmlFor={`cast-${member.id}`}>{member.name}</label>
                </div>
              ))}
            </div>
          </div>
          <button type="submit">動画を追加</button>
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