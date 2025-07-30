import { createContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);

  const login = (token) => {
    try {
      const decodedUser = jwtDecode(token);

      console.log("🎯 AuthContext decoded user:", decodedUser); // Optional: Debug log

      localStorage.setItem('token', token);
      setUser(decodedUser); // ✅ Includes username
      setToken(token);
    } catch (err) {
      console.error("❌ Invalid token during login:", err);
      logout();
    }
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
        const decodedUser = jwtDecode(storedToken);
        setUser(decodedUser);
        setToken(storedToken);
      } catch (err) {
        console.error("❌ Failed to decode stored token:", err);
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
