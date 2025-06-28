const express = require('express');
const cors = require('cors');
const db = require('./database.js'); // データベースの設定をインポート
const bcrypt = require('bcrypt');
// bcryptを使用してパスワードのハッシュ化を行うために必要なモジュールをインポート

const app = express();
const PORT = process.env.PORT || 3001;
const jwt = require('jsonwebtoken');

// JWTを検証し、管理者権限をチェックするミドルウェア（門番）
const authenticateAdmin = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // "Bearer TOKEN"の形式からTOKEN部分を抽出

  if (token == null) return res.sendStatus(401); // トークンがなければUnauthorized

  jwt.verify(token, 'YOUR_SECRET_KEY', (err, user) => {
    if (err) return res.sendStatus(403); // トークンが無効ならForbidden
    if (user.role !== 'admin') return res.sendStatus(403); // 管理者でなければForbidden

    req.user = user;
    next(); // チェックをパスしたら、次の処理へ進む
  });
};

const corsOptions = {
  origin: ['http://localhost:5173', 'ここにデプロイ後のフロントエンドのURLを入れる'],
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json()); // フロントから送られてくるJSONを理解するための設定を追加

app.get('/api/test', (req, res) => {
    res.json({ message: 'Hello from the server!' });
    });

app.get('/api/videos', (req, res) => {
  const sql = `
    SELECT
      v.id,
      v.title,
      v.url,
      GROUP_CONCAT(vc.member_name) as cast
    FROM videos v
    LEFT JOIN video_cast vc ON v.id = vc.video_id
    GROUP BY v.id
  `;

  db.all(sql, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    const videos = rows.map(row => ({
      ...row,
      cast: row.cast ? row.cast.split(',') : []
    }));
    res.json(videos);
  });
});
// 全ての動画と、その出演者リストを取得するAPI
app.post('/api/videos', authenticateAdmin, (req, res) => {
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

app.delete('/api/videos/:id', authenticateAdmin, (req, res) => {
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

// ユーザー登録のエンドポイント
app.post('/api/register', async (req, res) => {
    try{
        //フロントエンドから送られてきたデータを取得
        const { email, password, name} = req.body;

        //データがちゃんとあるかチェック
        if (!email || !password || !name) {
            return res.status(400).json({ error: 'email and password are required.' });
        }

        //ハッシュ化されたパスワードを作成
        const hashedPassword = await bcrypt.hash(password, 10); //10はハッシュ化の強度を示す
        //データベースにユーザーを追加
        const sql = 'INSERT INTO users (email, password, name) VALUES (?, ?, ?)';
        db.run(sql, [email, hashedPassword, name], function(err) {
        if (err) {
            // emailが既に存在している場合などのエラー
            console.error(err.message);
            return res.status(400).json({ error: 'このメールアドレスは既に使用されています。' });
        }
        // 登録成功のレスポンスを返す
        res.status(201).json({ 
            message: 'ユーザー登録が成功しました。',
            userId: this.lastID // 登録されたユーザーのID
        });
        });
    } catch (error) {
        res.status(500).json({ error: 'サーバー側でエラーが発生しました。' });
    }
});

// ログイン用のAPIエンドポイント
app.post('/api/login', (req, res) => {
    const { email, password, name} = req.body;
    const sql = 'SELECT * FROM users WHERE email = ?';
    db.get(sql, [email], async (err, user) => {
      if(err || !user){
        return res.status(400).json({ error: 'メールアドレスまたはパスワードが正しくありません。' });
      }
      const isMatch = await bcrypt.compare(password, user.password);
      if(!isMatch){
        return res.status(400).json({ error: 'メールアドレスまたはパスワードが正しくありません。' });
      }
    if(isMatch){
    // JWT発行処理
    const payload ={
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name
    };
    const token = jwt.sign(payload,'YOUR_SECRET_KEY', {expiresIn: '1h'});
    res.json({ 
      message: 'ログインに成功しました。',
      token: token, // JWTトークンを返す
      user: payload
    });
  }
  });
});





// ランキングを取得するAPIエンドポイント (GET)
app.get('/api/rankings/:userId', (req, res) => {
    const { userId } = req.params;
  const sql = "SELECT video_order FROM rankings WHERE user_id = ?";
  db.get(sql, [userId], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'データベースエラー' });
    }
    if (row) {
      res.json({ videoOrder: row.video_order.split(',') }); // テキストを配列に戻して返す
    } else {
      res.json({ videoOrder: null }); // ランキングがまだない場合
    }
  });
});

// ランキングを保存/更新するAPIエンドポイント (POST)
app.post('/api/rankings', (req, res) => {
  // 注意：本来は認証トークンで安全にユーザーを特定しますが、今回は学習のため、
  // フロントエンドからユーザーIDを直接送る簡単な方法をとります。
  const { userId, videoOrder } = req.body;
  const videoOrderText = videoOrder.join(','); // 配列をカンマ区切りのテキストに変換

  // 同じユーザーIDのデータがあれば更新(REPLACE)、なければ新規作成(INSERT)するSQL
  const sql = "INSERT OR REPLACE INTO rankings (user_id, video_order) VALUES (?, ?)";
  
  db.run(sql, [userId, videoOrderText], function(err) {
    if (err) {
      return res.status(500).json({ error: 'データベースへの保存に失敗しました。' });
    }
    res.status(200).json({ message: 'ランキングを保存しました。' });
  });
});

// ランキングを「提出」するためのAPIエンドポイント (POST)
app.post('/api/submissions', (req, res) => {
  const { userId, videoOrder } = req.body;

  if (!userId || !videoOrder || videoOrder.length === 0) {
    return res.status(400).json({ error: 'ユーザーIDとランキング情報は必須です。' });
  }

  const videoOrderText = videoOrder.join(',');

  // 同じユーザーIDのデータがあれば更新(REPLACE)、なければ新規作成(INSERT)
  const sql = "INSERT OR REPLACE INTO submissions (user_id, video_order) VALUES (?, ?)";
  
  db.run(sql, [userId, videoOrderText], function(err) {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ error: '提出データの保存に失敗しました。' });
    }
    res.status(201).json({ message: 'ランキングを提出しました。ご協力ありがとうございます！' });
  });
});

// 総合ランキングを集計して返すAPIエンドポイント (GET)
app.get('/api/results', authenticateAdmin, (req, res) => {
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

app.listen(PORT, () => {
    console.log('サーバー起動中: http://localhost:' + PORT);
});



