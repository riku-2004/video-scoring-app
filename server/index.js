// ===================================================
// server/index.js (最終完成版)
// ===================================================
// --- 1. 必要なライブラリのインポート ---
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./database.js');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// --- 2. アプリケーションの基本設定 ---
const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = 'my-super-secret-key-for-this-event-12345';

// --- 3. ミドルウェアの設定 ---
const corsOptions = {
  // 注意：ここはあなたのRenderのフロントエンドの公開URLに書き換えてください
  origin: ['http://localhost:5173', 'https://video-scoring-app.onrender.com'], 
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json());
db.initializeDb();

// --- 4. 認証ミドルウェア（門番）の定義 ---
const authenticateAdmin = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token == null) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err || user.role !== 'admin') return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// --- 5. APIエンドポイント（受付窓口）の定義 ---

// B. ユーザー認証関連
app.post('/api/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'メールアドレス、パスワード、名前は必須です。' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const sql = 'INSERT INTO users (email, password, name) VALUES ($1, $2, $3) RETURNING id';
    const result = await db.query(sql, [email, hashedPassword, name]);
    res.status(201).json({ message: 'ユーザー登録が成功しました。', userId: result.rows[0].id });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'このメールアドレスは既に使用されています。' });
    res.status(500).json({ error: 'サーバーエラーが発生しました。' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user) return res.status(400).json({ error: 'メールアドレスまたはパスワードが正しくありません。' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'メールアドレスまたはパスワードが正しくありません。' });

    const payload = { id: user.id, email: user.email, role: user.role, name: user.name };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
    res.json({ message: 'ログインに成功しました。', token, user: payload });
  } catch (err) {
    res.status(500).json({ error: 'サーバーエラーが発生しました。' });
  }
});

// C. 動画・ランキング関連
app.get('/api/videos', async (req, res) => {
  try {
    const sql = `
      SELECT v.id, v.title, v.url, COALESCE(json_agg(vc.member_name) FILTER (WHERE vc.member_name IS NOT NULL), '[]') as cast
      FROM videos v
      LEFT JOIN video_cast vc ON v.id = vc.video_id
      GROUP BY v.id`;
    const result = await db.query(sql);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/rankings/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await db.query("SELECT video_order FROM rankings WHERE user_id = $1", [userId]);
    const row = result.rows[0];
    res.json({ videoOrder: row ? row.video_order.split(',') : null });
  } catch (err) {
    res.status(500).json({ error: 'データベースエラー' });
  }
});

app.post('/api/submissions', async (req, res) => {
  try {
    const { userId, videoOrder } = req.body;
    if (!userId || !videoOrder || videoOrder.length === 0) {
      return res.status(400).json({ error: 'ユーザーIDとランキング情報は必須です。' });
    }
    const videoOrderText = videoOrder.join(',');
    const sql = "INSERT INTO submissions (user_id, video_order) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET video_order = $2";
    await db.query(sql, [userId, videoOrderText]);
    res.status(201).json({ message: 'ランキングを提出しました。' });
  } catch (err) {
    res.status(500).json({ error: '提出データの保存に失敗しました。' });
  }
});

// D. 管理者専用API
app.get('/api/results', authenticateAdmin, async (req, res) => {
  try {
    const result = await db.query("SELECT video_order FROM submissions");
    const videoCountResult = await db.query("SELECT COUNT(*) FROM videos");
    const videoCount = parseInt(videoCountResult.rows[0].count, 10);
    const scores = {};
    result.rows.forEach(row => {
      const videoOrder = row.video_order.split(',');
      videoOrder.forEach((videoId, index) => {
        const points = videoCount - index;
        scores[videoId] = (scores[videoId] || 0) + points;
      });
    });
    const rankedVideos = Object.entries(scores)
      .map(([id, score]) => ({ id, score }))
      .sort((a, b) => b.score - a.score);
    res.json(rankedVideos);
  } catch (err) {
    res.status(500).json({ error: 'データベースエラー' });
  }
});

app.post('/api/videos', authenticateAdmin, async (req, res) => {
  const { id, title, url, cast } = req.body;
  if (!id || !title || !url || !cast) {
    return res.status(400).json({ error: '全てのフィールドは必須です。' });
  }
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    await client.query("INSERT INTO videos (id, title, url) VALUES ($1, $2, $3)", [id, title, url]);
    for (const memberName of cast) {
      await client.query("INSERT INTO video_cast (video_id, member_name) VALUES ($1, $2)", [id, memberName]);
    }
    await client.query('COMMIT');
    res.status(201).json({ message: '動画が正常に追加されました。' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: '動画の追加に失敗しました。', details: err.message });
  } finally {
    client.release();
  }
});

app.delete('/api/videos/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query("DELETE FROM videos WHERE id = $1", [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: '指定された動画が見つかりません。' });
    }
    res.status(200).json({ message: '動画が正常に削除されました。' });
  } catch (err) {
    res.status(500).json({ error: '動画の削除に失敗しました。' });
  }
});

app.get('/api/users', authenticateAdmin, async (req, res) => {
  try {
    const result = await db.query("SELECT id, email, name, role FROM users ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'ユーザーリストの取得に失敗しました。' });
  }
});

app.put('/api/users/:id/role', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    if (role !== 'admin' && role !== 'general') {
      return res.status(400).json({ error: '無効な役割です。' });
    }
    await db.query("UPDATE users SET role = $1 WHERE id = $2", [role, id]);
    res.status(200).json({ message: 'ユーザーの役割が更新されました。' });
  } catch (err) {
    res.status(500).json({ error: '役割の更新に失敗しました。' });
  }
});

app.post('/api/admin/reset', authenticateAdmin, async (req, res) => {
  try {
    await db.query("DELETE FROM submissions");
    await db.query("DELETE FROM rankings");
    await db.query("DELETE FROM users WHERE role = 'general'");
    res.status(200).json({ message: 'イベントデータが正常にリセットされました。' });
  } catch (err) {
    res.status(500).json({ error: 'イベントデータのリセットに失敗しました。' });
  }
});

// --- 6. Reactアプリの配信設定 ---
app.use(express.static(path.join(__dirname, '../client/dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

// --- 7. サーバーの起動 ---
app.listen(PORT, () => {
  console.log(`サーバー起動中: http://localhost:${PORT}`);
});
