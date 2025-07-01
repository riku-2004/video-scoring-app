// --- 1. 必要なライブラリのインポート ---
const express = require('express');
const cors = require('cors');
const path = require('path'); // ファイルパスを扱うためのモジュール
const db = require('./database.js'); // データベース接続モジュール
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// --- 2. アプリケーションの基本設定 ---
const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = 'my-super-secret-key-for-this-event-12345'; // JWTの秘密鍵

// --- 3. ミドルウェアの設定 ---

// CORS設定（特定のオリジンからのアクセスを許可）
const corsOptions = {
  // 注意：ここはあなたのRenderのフロントエンドの公開URLに書き換えてください
  origin: ['http://localhost:5173', 'https://video-scoring-frontend.onrender.com'], 
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// フロントエンドから送られてくるJSONを解析するための設定
app.use(express.json());

// データベースのテーブルを初期化
db.initializeDb();

// --- 4. 認証ミドルウェア（門番）の定義 ---
const authenticateAdmin = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.sendStatus(401); // Unauthorized

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403); // Forbidden
    if (user.role !== 'admin') return res.sendStatus(403); // 管理者でなければアクセス拒否

    req.user = user;
    next();
  });
};


// --- 5. APIエンドポイント（受付窓口）の定義 ---

// A. 一般的なAPI
app.get('/api/test', (req, res) => {
  res.json({ message: 'Hello from the server!' });
});

// B. ユーザー認証関連のAPI
app.post('/api/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'メールアドレス、パスワード、名前は必須です。' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const sql = 'INSERT INTO users (email, password, name) VALUES ($1, $2, $3) RETURNING id';
    const values = [email, hashedPassword, name];
    const result = await db.query(sql, values);
    res.status(201).json({ message: 'ユーザー登録が成功しました。', userId: result.rows[0].id });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'このメールアドレスは既に使用されています。' });
    }
    res.status(500).json({ error: 'サーバー側でエラーが発生しました。' });
  }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const sql = 'SELECT * FROM users WHERE email = $1';
        const result = await db.query(sql, [email]);
        const user = result.rows[0];

        if (!user) {
            return res.status(400).json({ error: 'メールアドレスまたはパスワードが正しくありません。' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'メールアドレスまたはパスワードが正しくありません。' });
        }

        const payload = { id: user.id, email: user.email, role: user.role, name: user.name };
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
        res.json({ message: 'ログインに成功しました。', token, user: payload });
    } catch (err) {
        res.status(500).json({ error: 'サーバー側でエラーが発生しました。' });
    }
});


// C. 動画・ランキング関連のAPI
app.get('/api/videos', (req, res) => {
  const sql = `
    SELECT v.id, v.title, v.url, GROUP_CONCAT(vc.member_name) as cast
    FROM videos v
    LEFT JOIN video_cast vc ON v.id = vc.video_id
    GROUP BY v.id`;
  db.query(sql)
    .then(result => {
      const videos = result.rows.map(row => ({
        ...row,
        cast: row.cast ? row.cast.split(',') : []
      }));
      res.json(videos);
    })
    .catch(err => res.status(500).json({ error: err.message }));
});

app.get('/api/rankings/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const sql = "SELECT video_order FROM rankings WHERE user_id = $1";
        const result = await db.query(sql, [userId]);
        const row = result.rows[0];
        if (row) {
            res.json({ videoOrder: row.video_order.split(',') });
        } else {
            res.json({ videoOrder: null });
        }
    } catch (err) {
        res.status(500).json({ error: 'データベースエラー' });
    }
});

app.post('/api/rankings', async (req, res) => {
    // ... (このAPIは下書き保存用ですが、一旦省略して提出機能に絞ってもOKです)
    res.status(501).json({ message: 'Not Implemented' });
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
        res.status(201).json({ message: 'ランキングを提出しました。ご協力ありがとうございます！' });
    } catch (err) {
        res.status(500).json({ error: '提出データの保存に失敗しました。' });
    }
});


// D. 管理者専用API
app.get('/api/results', authenticateAdmin, async(req, res) => {
  const sql = "SELECT video_order FROM submissions";
  
  db.all(sql, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'データベースエラー' });
    }

    // --- ここから集計ロジック ---
    const scores = {};
    const videoCount = 4; // 動画の総数（今回は固定）

    rows.forEach(row => {
      const videoOrder = row.video_order.split(',');
      videoOrder.forEach((videoId, index) => {
        const points = videoCount - index; // 1位=4点, 2位=3点...
        scores[videoId] = (scores[videoId] || 0) + points;
      });
    });

    // 集計したスコアをランキング形式の配列に変換
    // 例: { v1: 10, v2: 15 } -> [{ id: 'v2', score: 15 }, { id: 'v1', score: 10 }]
    const rankedVideos = Object.keys(scores).map(videoId => ({
      id: videoId,
      score: scores[videoId]
    }));

    // スコアの高い順に並べ替え
    rankedVideos.sort((a, b) => b.score - a.score);

    res.json(rankedVideos);
  });
});

// 全ての動画と、その出演者リストを取得するAPI
app.post('/api/videos', authenticateAdmin,  async(req, res) => {
  const { id, title, url, cast } = req.body;
  if (!id || !title || !url || !cast) {
    return res.status(400).json({ error: '全てのフィールドは必須です。' });
  }

  // 複数のDB操作を安全に行うために、トランザクションを開始
  db.serialize(() => {
    db.run("BEGIN TRANSACTION");
    
    const videoSql = "INSERT INTO videos (id, title, url) VALUES (?, ?, ?)";
    db.run(videoSql, [id, title, url], function(err) {
      if (err) {
        db.run("ROLLBACK");
        return res.status(500).json({ error: '動画の追加に失敗しました。', details: err.message });
      }
    });

    const castSql = "INSERT INTO video_cast (video_id, member_name) VALUES (?, ?)";
    cast.forEach(memberName => {
      db.run(castSql, [id, memberName], function(err) {
        if (err) {
          db.run("ROLLBACK");
          // このエラーはforEachの中なので、resを複数回送らないように注意
          // ここではコンソールに出力するに留める
          console.error('出演者の追加に失敗:', err.message);
        }
      });
    });

    db.run("COMMIT", (err) => {
      if (err) {
        return res.status(500).json({ error: 'トランザクションのコミットに失敗しました。', details: err.message });
      }
      res.status(201).json({ message: '動画が正常に追加されました。' });
    });
  });
});

app.delete('/api/videos/:id', authenticateAdmin, async(req, res) => {
  const { id } = req.params;
  const sql = "DELETE FROM videos WHERE id = ?";
  db.run(sql, id, function(err) {
    if (err) {
      return res.status(500).json({ error: '動画の削除に失敗しました。', details: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: '指定された動画が見つかりません。' });
    }
    res.status(200).json({ message: '動画が正常に削除されました。' });
  });
});

// 全ユーザーのリストを取得するAPI (管理者専用)
app.get('/api/users', authenticateAdmin, async (req, res) => {
  try {
    // パスワードは決して返さないように、カラムを明示的に指定します
    const sql = "SELECT id, email, name, role FROM users ORDER BY id ASC";
    const result = await db.query(sql);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'ユーザーリストの取得に失敗しました。' });
  }
});

// 特定ユーザーの役割を変更するAPI (管理者専用)
app.put('/api/users/:id/role', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    // roleが'admin'か'general'以外は受け付けないようにチェック
    if (role !== 'admin' && role !== 'general') {
      return res.status(400).json({ error: '無効な役割です。' });
    }

    const sql = "UPDATE users SET role = $1 WHERE id = $2";
    await db.query(sql, [role, id]);
    res.status(200).json({ message: 'ユーザーの役割が更新されました。' });
  } catch (err) {
    res.status(500).json({ error: '役割の更新に失敗しました。' });
  }
});

// イベントデータをリセットするAPI (管理者専用)
app.post('/api/admin/reset', authenticateAdmin, async (req, res) => {
  try {
    // トランザクションのように、順番に削除処理を実行
    await db.query("DELETE FROM submissions");
    await db.query("DELETE FROM rankings");
    await db.query("DELETE FROM users WHERE role = 'general'");
    
    res.status(200).json({ message: 'イベントデータが正常にリセットされました。' });
  } catch (err) {
    console.error('リセット処理中にエラー発生:', err);
    res.status(500).json({ error: 'イベントデータのリセットに失敗しました。' });
  }
});


// --- 6. Reactアプリの配信設定（これがAPI定義より後にあることが重要） ---
app.use(express.static(path.join(__dirname, '../client/dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});


// --- 7. サーバーの起動（これが必ず一番最後） ---
app.listen(PORT, () => {
  console.log(`サーバー起動中: http://localhost:${PORT}`);
});