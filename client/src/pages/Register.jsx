import {useState} from 'react';
import {useNavigate} from 'react-router-dom';
import { Link } from 'react-router-dom';

function Register() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const [name, setName] = useState('');
    const navigate = useNavigate();
    
    const handleRegister = async (e) => {
        e.preventDefault();
        setMessage('');
        try {
            const apiUrl = import.meta.env.VITE_API_URL;
            const response = await fetch(`${apiUrl}/api/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, name }),
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
        <div className = "form-container">
        <h2>新規登録</h2>
        <form onSubmit={handleRegister}>
            <div>
              <label>名前:</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
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