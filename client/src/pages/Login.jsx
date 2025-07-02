import {useState} from 'react';
import {useNavigate, Link} from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setMessage('');
        try {
            const response = await fetch(`/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            const data = await response.json();
            if (response.ok) {
                login(data.token); // ログイン成功時にユーザーデータをコンテキストに保存
                navigate('/dashboard');
            } else {
                setMessage(`ログインエラー： ${data.error}`);
            }
        } catch (error) {
            setMessage('通信エラーが発生しました。');
        }
    };

    return (
        <div className="form-container">
            <h2>ログイン</h2>
            <form onSubmit={handleLogin}>
                <div>
                    <label>メールアドレス:</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <label>パスワード:</label>
                    <input
                        type="password"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>      
                <button type="submit">ログイン</button>
            </form>
            {message && <p>{message}</p>}
        </div>
    );
}

export default Login;