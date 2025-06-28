import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Register from './pages/Register';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import './App.css'; // App.cssをインポート
import { Header } from './components/Header';
import Results from './pages/Results';
import {AdminRoute} from './components/AdminRoute'; // AdminRouteをインポート
import Admin from './pages/Admin'; // Adminページをインポート
function App() {
  return (
    <>
      <Header /> {/* Routeの外に置くことで、どのページからも参照できる*/}
    <div className="App">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/results" element={<AdminRoute><Results /></AdminRoute>} />
        <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
      </Routes>
    </div>
    </>
  );
}

export default App;