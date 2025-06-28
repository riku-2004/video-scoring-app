const sqlite3 = require('sqlite3').verbose();

//databse.dbという名前のSQLiteデータベースファイルを開く
const db = new sqlite3.Database('./database.db', (err) => {
    if(err){
        //データベースの接続に失敗した場合、エラーメッセージを表示
        return console.error(err.message);
    }
    console.log('データベースに接続しました。');
});

//データベースの初期設定
db.serialize(() => {
    //テーブルが存在しない場合、テーブルを作成
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL,
        password TEXT NOT NULL UNIQUE,
        role TEXT NOT NULL DEFAULT 'general',
        name TEXT NOT NULL
    )`, (err) => {
        if(err){
            return console.error(err.message);
        }
        console.log('usersテーブルが作成されました。');
    });

    db.run(`CREATE TABLE IF NOT EXISTS rankings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER UNIQUE NOT NULL,
        video_order TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )`, (err) => {
        if(err){
            return console.error(err.message);
        }
        console.log('videosテーブルが作成されました。');
    });

    db.run(`CREATE TABLE IF NOT EXISTS submissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER UNIQUE NOT NULL,
        video_order TEXT NOT NULL,
        submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )`, (err) => {
        if (err) {
        return console.error(err.message);
        }
        console.log('✅ "submissions"テーブルの準備ができました。');
    });
    // "videos" テーブルの作成
    db.run(`CREATE TABLE IF NOT EXISTS videos (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        url TEXT NOT NULL
    )`, (err) => {
        if (err) return console.error(err.message);
        console.log('✅ "videos"テーブルの準備ができました。');
    });

    // "video_cast" テーブルの作成
    db.run(`CREATE TABLE IF NOT EXISTS video_cast (
        video_id TEXT NOT NULL,
        member_name TEXT NOT NULL,
        PRIMARY KEY (video_id, member_name),
        FOREIGN KEY (video_id) REFERENCES videos (id) ON DELETE CASCADE
    )`, (err) => {
        if (err) return console.error(err.message);
        console.log('✅ "video_cast"テーブルの準備ができました。');
    });
});

//ほかのファイルからデータベースを使用できるようにするために、モジュールをエクスポート
module.exports = db;

