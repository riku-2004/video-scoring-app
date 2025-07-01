// --- 1. 必要なライブラリのインポート ---
const express = require('express');
const cors = require('cors');
const path = require('path');
// const db = require('./database.js'); // DB接続も一旦停止
// const bcrypt = require('bcrypt');
// const jwt = require('jsonwebtoken');

// --- 2. アプリケーションの基本設定 ---
const app = express();
const PORT = process.env.PORT || 3001;
// const JWT_SECRET = 'my-super-secret-key-for-this-event-12345';

// --- 3. ミドルウェアの設定 ---
const corsOptions = {
  origin: ['http://localhost:5173', 'https://video-scoring-app.onrender.com'], 
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json());
// db.initializeDb(); // DB初期化も一旦停止

// --- 5. APIエンドポイント（受付窓口）の定義 ---
// 全てのAPI定義を一旦コメントアウトします

// --- 6. Reactアプリの配信設定 ---
app.use(express.static(path.join(__dirname, '../client/dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

// --- 7. サーバーの起動（これが必ず一番最後） ---
app.listen(PORT, () => {
  console.log(`サーバー起動中: http://localhost:${PORT}`);
});
