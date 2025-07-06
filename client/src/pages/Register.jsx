import {useState, useEffect} from 'react';
import {useNavigate} from 'react-router-dom';
import { Link } from 'react-router-dom';    

function Register() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [members, setMembers] = useState([]); // ★サークル員名簿を保存するstate
    const [selectedMemberId, setSelectedMemberId] = useState(''); // ★選択されたメンバーIDを保存するstate
    const [message, setMessage] = useState('');
    const [name, setName] = useState('');
    const navigate = useNavigate();
    
     // ★ページ表示時に、サーバーからサークル員名簿を取得する
    useEffect(() => {
        const fetchMembers = async () => {
        try {
            const response = await fetch('/api/members'); // authenticateAdminを外したので、誰でもアクセス可能
            const data = await response.json();
            setMembers(data);
        } catch (err) {
            console.error("メンバー名簿の取得に失敗", err);
        }
        };
        fetchMembers();
    }, []);

    const handleRegister = async (e) => {
        e.preventDefault();
        console.log('--- 登録ボタンが押されました ---');
        console.log('選択されたメンバーID:', selectedMemberId);
        console.log('入力されたEmail:', email);
        console.log('入力されたPassword:', password);
         if (!selectedMemberId) {
            setMessage('名簿からあなたの名前を選択してください。');
            return;
        }
        setMessage('');
        try {
            const response = await fetch(`/api/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, memberId: selectedMemberId }),
            });
        const data = await response.json();
        if (response.ok) {
            setMessage(`登録成功： ${data.message}`);
            setTimeout(() =>
                navigate('/login'), 1500);
                // 登録成功後にログインページへリダイレクト, 1500ミリ秒(1.5秒));
        } else {
            setMessage(`登録エラー： ${data.error}`);
        }
        } catch (error) {
        setMessage('通信エラーが発生しました。');
        }
    };
    
    return (
    <div className="form-container">
      <h1>ユーザー登録</h1>
      <form onSubmit={handleRegister}>
        {/* ▼▼▼ 名前の手入力欄を、名簿からの選択式(プルダウン)に変更 ▼▼▼ */}
        <div>
          <label>あなたの名前を選択してください:</label>
          <select value={selectedMemberId} onChange={(e) => setSelectedMemberId(e.target.value)} required>
            <option value="">-- 名前を選択 --</option>
            {members.map(member => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </div>
        {/* ▲▲▲ ここまで変更 ▲▲▲ */}
        <div>
          <label>メールアドレス:</label>
          <input
            type="email"
            id="email"
            value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
            />
            </div>
            <div>
            <label htmlFor="password">パスワード:</label>
            <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
            />
            </div>
            <button type="submit">登録</button>
        </form>
        {message && <p>{message}</p>}
        </div>
    );
    }

    export default Register;