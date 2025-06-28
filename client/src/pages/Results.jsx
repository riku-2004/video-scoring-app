import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext'; // 認証コンテキストから現在のユーザー情報を取得

// サンプルデータをここにも定義しておき、IDからタイトルなどを引けるようにする
const sampleVideos = [
  { id: 'v1', title: '猫のかわいい動画' },
  { id: 'v2', title: '絶景ドローン映像' },
  { id: 'v3', title: 'すごい料理シーン' },
  { id: 'v4', title: 'React入門' },
];

function Results() {
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { token } = useAuth();

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL;
        const response = await fetch(`${apiUrl}/api/results`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if(!response.ok) {
          throw new Error('結果の取得に失敗しました。');
        }
        const data = await response.json();
        
        // サーバーから来たランキングデータに、動画のタイトル情報を合体させる
        const fullRankingData = data.map(result => {
          const videoInfo = sampleVideos.find(v => v.id === result.id);
          return {
            ...result,
            title: videoInfo ? videoInfo.title : '不明な動画'
          };
        });

        setRanking(fullRankingData);
      } catch (err) {
        setError('結果の読み込みに失敗しました。');
      } finally {
        setLoading(false);
      }
    };

    if(token) fetchResults();
  }, [token]);

  if (loading) {
    return <div>集計中...</div>;
  }

  if (error) {
    return <div>エラー: {error}</div>;
  }

  return (
    <div>
      <h1>🏆 最終結果発表 🏆</h1>
      {ranking.length === 0 ? (
        <p>まだ誰も提出していません。</p>
      ) : (
        <ol style={{ listStyle: 'none', paddingLeft: 0 }}>
          {ranking.map((item, index) => (
            <li key={item.id} style={{ border: '1px solid #ddd', padding: '15px', marginBottom: '10px', borderRadius: '5px' }}>
              <span style={{ fontSize: '1.5em', fontWeight: 'bold', marginRight: '15px' }}>
                {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}
              </span>
              <span style={{ fontSize: '1.2em' }}>{item.title}</span>
              <span style={{ float: 'right', color: '#555' }}>{item.score} ポイント</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export default Results;