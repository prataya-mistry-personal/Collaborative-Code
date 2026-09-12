import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import Layout from './components/Layout/Layout';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import Room from './components/Room/Room';
import Dashboard from './components/Dashboard/Dashboard';
import Editor from './components/Editor/Editor';
import { ToastProvider } from './components/Common/Toast';

function App() {
  const { isAuthenticated } = useAuthStore();

  return (
    <ToastProvider>
      <Router>
        <Routes>
          <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/" />} />
          <Route path="/register" element={!isAuthenticated ? <Register /> : <Navigate to="/" />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="room/:code" element={<Room />} />
            <Route path="editor/:code" element={<Editor />} />
          </Route>
        </Routes>
      </Router>
    </ToastProvider>
  );
}

export default App;
