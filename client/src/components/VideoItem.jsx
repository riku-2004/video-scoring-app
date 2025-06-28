import React from 'react';
import {useSortable} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';


// 様々な形式のYouTubeのURLから、動画IDだけを抜き出す関数
function getYouTubeID(url) {
  // URLが文字列でなければ、空文字を返す
  if (typeof url !== 'string') {
    return null;
  }
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);

  return (match && match[2].length === 11) ? match[2] : null;
}

export function VideoItem({video, rank}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({id: video.id});
    
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1, //ドラッグ中は少し透明にする
        padding: '10px',
        marginBottom: '10px',
        backgroundColor: 'white',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
    };

    const videoId = getYouTubeID(video.url);
    const embedUrl = videoId ? `https://www.youtube.com/embed/${videoId}` : '';
    
    return (
    <div ref={setNodeRef} style={style}>
      {/* 順位と、ドラッグするためのハンドル */}
      <div {...attributes} {...listeners} style={{ cursor: 'grab', touchAction: 'none' }}>
        <span style={{ fontSize: '2em', fontWeight: 'bold' }}>{rank}</span>
        <span style={{ fontSize: '1.5em', color: '#888' }}>↕️</span>
      </div>
      
      {/* 動画のコンテンツ */}
      <div>
        <h4>{video.title}</h4>
        {videoId ? (
          <iframe
            width="320"
            height="180"
            src={embedUrl}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        ) : (
          <p>動画のURLが無効です。</p>
        )}
      </div>
    </div>
    );
}