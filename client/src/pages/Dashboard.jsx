import React, { useEffect, useState } from 'react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {useAuth} from '../context/AuthContext'; // 認証コンテキストをインポート
import { VideoItem } from '../components/VideoItem'; // 先ほど作ったコンポーネントをインポート
import { useNavigate } from 'react-router-dom';


function Dashboard() {
  // 動画リストの順序を管理するためのstate
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true); // ローディング状態を追加
  const [message, setMessage] = useState('');
  const { currentUser, logout, token} = useAuth(); // 認証コンテキストから現在のユーザー情報を取得
  const navigate = useNavigate(); // React Routerのナビゲーション機能を使用

  const handleLogoutClick = () => {
      logout();
      navigate('/'); // ログアウト後、ホームページにリダイレクト
    };


   useEffect(() => {
    if(!currentUser) {
      setLoading(false); // ログインしていない場合はローディングを終了
      return;
    }
    
    // サーバーから動画リストと、個人のランキングの両方を取得する
    const fetchData = async () => {
    setLoading(true); // データ取得開始時にローディングを開始
    setMessage(''); // メッセージをリセット
      try {
        // サーバーから全動画リストと、自分のランキング情報を並行して取得
        const [videosResponse, rankingResponse] = await Promise.all([
          fetch('http://localhost:3001/api/videos'),
          fetch(`http://localhost:3001/api/rankings/${currentUser.id}`)
        ]);

        const allVideosData = await videosResponse.json();
        const rankingData = await rankingResponse.json();

        // 1. 自分が出演していない動画だけに絞り込む
        const viewableVideos = allVideosData.filter(
          video => !video.cast.includes(currentUser.name)
        );

        // 2. 絞り込んだリストを、保存された順序に基づいて並べ替える
        let sortedVideos = viewableVideos;
        if (rankingData.videoOrder && rankingData.videoOrder.length > 0) {
          // 保存された順序を元に、現在の表示可能リストを並べ替える
          const ordered = rankingData.videoOrder
            .map(id => viewableVideos.find(v => v.id === id))
            .filter(Boolean); // 見つからなかったものは除去
          
          // 保存されていなかった動画は末尾に追加する
          const unordered = viewableVideos.filter(
            v => !rankingData.videoOrder.includes(v.id)
          );
          
          sortedVideos = [...ordered, ...unordered];
        }

        setVideos(sortedVideos);

      } catch (err) {
        console.error("データの読み込みに失敗:", err);
        setMessage("データの読み込みに失敗しました。");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser, navigate]);

      
    // const fetchRanking = async () => {
    //   try {
    //     const response = await fetch(`http://localhost:3001/api/rankings/${currentUser.id}`);
    //     const data = await response.json();
    //     if (data.videoOrder) {
    //       const orderedVideos = data.videoOrder.map(id =>
    //         sampleVideos.find(video => video.id === id)).filter(Boolean);
    //       setVideos(orderedVideos);
    //     } else {
    //       setVideos(sampleVideos);
    //     }
    //   } catch (error) {
    //     console.error('ランキングの取得に失敗しました:', error);
    //     setVideos(sampleVideos); // エラー時はサンプルデータを使用
    //   }
    // };

    // fetchRanking();
  // ドラッグが終了した時に呼ばれる関数
  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setVideos((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        // arrayMoveを使って、配列内の要素の順序を入れ替える
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleSubmitRanking = async () => {
    if (!currentUser) return;
    if (!confirm('この順位で提出します。よろしいですか？（再提出も可能です）')) {
      return;
    }
    try {
      const videoOrder = videos.map(v => v.id);
      const response = await fetch(`/api/submissions`, { // ★ 送信先APIを変更
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId: currentUser.id, videoOrder: videoOrder }),
      });
      const data = await response.json();
      setMessage(data.message || data.error); // サーバーからのメッセージを表示
    } catch (err) {
      setMessage('エラー：提出に失敗しました。');
    }
  };

  // const handleSaveRanking = async () => {
  //   if (!currentUser) return;
  //   try {
  //     const videoOrder = videos.map(video => video.id);
  //     const response = await fetch('http://localhost:3001/api/rankings', {
  //       method: 'POST',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify({ userId: currentUser.id, videoOrder: videoOrder }),
  //     });
  //     const data = await response.json();
  //     setMessage(data.meggage)
  //   } catch (error) {
  //     console.error('ランキングの保存に失敗しました:', error);
  //   }
  //   };
    
    
     if (loading) {
    return <div>読み込み中...</div>;
  }

  return (
    <div>
      <h1>動画採点ページ</h1>
      <p>ようこそ、{currentUser.name}さん！</p>
      <p>動画をドラッグ＆ドロップで好きな順位に並べ替えてください。</p>
      <p>並べ替え後の順位は自動的に保存されます。</p>
      
      {/* dnd-kitの心臓部。ドラッグ＆ドロップの振る舞いを定義 */}
      <DndContext
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        {/* 並べ替え可能なリストの範囲を定義 */}
        <SortableContext
          items={videos.map(v => v.id)}
          strategy={verticalListSortingStrategy}
        >
          {/* stateの動画リストを元に、VideoItemコンポーネントを一覧表示 */}
          {videos.map((video, index) => (
            <VideoItem key={video.id} video={video} rank={index + 1} />
          ))}
        </SortableContext>
      </DndContext>

      <button onClick={handleSubmitRanking} style={{ marginTop: '20px' }}>この順位で提出する</button>
      <button onClick={handleLogoutClick} style={{ marginLeft: '10px' }}>ログアウト</button>
      {message && <p>{message}</p>}
      </div>
      
  );
}

export default Dashboard;