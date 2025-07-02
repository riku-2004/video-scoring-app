const { Pool } = require('pg');

// Renderの環境変数からデータベースURLを取得して接続
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    // RenderのPostgreSQLに接続するために必要な設定
    rejectUnauthorized: false
  }
});

// アプリケーション起動時に、全てのテーブルが存在するか確認・作成する関数
const initializeDb = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN'); // トランザクション開始

    // usersテーブル (idはSERIAL PRIMARY KEYに)
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'general',
        name TEXT NOT NULL
      );
    `);

    // videosテーブル
    await client.query(`
      CREATE TABLE IF NOT EXISTS videos (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        url TEXT NOT NULL
      );
    `);

    // video_castテーブル
    await client.query(`
      CREATE TABLE IF NOT EXISTS video_cast (
        video_id TEXT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
        member_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        PRIMARY KEY (video_id, member_user_id)
      );
    `);

    // rankingsテーブル
    await client.query(`
      CREATE TABLE IF NOT EXISTS rankings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        video_order TEXT NOT NULL
      );
    `);
    
    // submissionsテーブル
    await client.query(`
      CREATE TABLE IF NOT EXISTS submissions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        video_order TEXT NOT NULL,
        submitted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query('COMMIT'); // 全て成功したら確定
    console.log('✅ データベースのテーブル準備ができました。');
  } catch (err) {
    await client.query('ROLLBACK'); // エラーがあれば全て取り消し
    console.error('データベースの初期化に失敗しました。', err);
    // エラーが発生してもプロセスを止めないように、ここではエラーを再スローしない
  } finally {
    client.release(); // 接続をプールに返す
  }
};

// 他のファイルから使えるように、query関数とinitializeDb関数を公開する
module.exports = {
  query: (text, params) => pool.query(text, params),
  initializeDb,
};