const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const initializeDb = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // membersテーブル
    await client.query(`
      CREATE TABLE IF NOT EXISTS members (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL
      );
    `);

    // usersテーブル (name列をなくし、member_idを参照)
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'general',
        member_id INTEGER UNIQUE REFERENCES members(id) ON DELETE CASCADE
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

    // video_castテーブル (member_idを参照)
    await client.query(`
      CREATE TABLE IF NOT EXISTS video_cast (
        video_id TEXT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
        member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
        PRIMARY KEY (video_id, member_id)
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

    await client.query('COMMIT');
    console.log('✅ データベース(最終設計)のテーブル準備ができました。');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('データベースの初期化に失敗しました。', err);
  } finally {
    client.release();
  }
};

module.exports = {
  query: (text, params) => pool.query(text, params),
  initializeDb,
};