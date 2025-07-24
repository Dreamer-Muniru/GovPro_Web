import { createContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);


  const login = (decodedUser, token) => {
    localStorage.setItem('token', token);
    setUser(decodedUser); // ✅ decodedUser includes username now
    setToken(token);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setToken(null); 
  };

  useEffect(() => {
  const storedToken = localStorage.getItem('token');
  if (storedToken) {
    try {
      const decoded = jwtDecode(storedToken);
      setUser(decoded);
      setToken(storedToken);
    } catch {
      logout();
    }
  }
}, []);


  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
