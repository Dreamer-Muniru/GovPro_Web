import { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const LogoutButton = () => {
  const { logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully!', { autoClose: 2000 });
    setTimeout(() => navigate('/'), 1500);

  };

  return (
    <button onClick={handleLogout} style={{ padding: '8px 14px' }}>
      Logout
    </button>
  );
};

export default LogoutButton;
