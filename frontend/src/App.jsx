import { useState, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import axios from "axios";
import { API_BASE } from "./config.js";
import "./App.css";

import Login from "./pages/Login";
import Register from "./pages/Register";
import EditorPage from "./pages/EditorPage";
import Dashboard from "./pages/Dashboard";
import LandingPage from "./pages/LandingPage";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "dark");
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    axios.get(`${API_BASE}/api/me`, { withCredentials: true })
      .then(res => {
        if (res.data.authenticated) setUser(res.data.user);
        else setUser(null);
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const logout = async () => {
    await axios.post(`${API_BASE}/api/logout`, {}, { withCredentials: true });
    setUser(null);
    navigate("/home");
  };

  const toggleTheme = () => setTheme(t => t === "light" ? "dark" : "light");

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "var(--c-bg)" }}>
      <span style={{ color: "var(--c-text2)", fontSize: "0.9rem" }}>Loading...</span>
    </div>
  );

  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to="/dashboard" /> : <Navigate to="/home" />} />
      <Route path="/home" element={user ? <Navigate to="/dashboard" /> : <LandingPage />} />
      <Route path="/dashboard" element={user ? <Dashboard user={user} logout={logout} theme={theme} toggleTheme={toggleTheme} /> : <Navigate to="/home" />} />
      <Route path="/room/:roomId" element={user ? <EditorPage user={user} theme={theme} toggleTheme={toggleTheme} /> : <Navigate to="/login" />} />
      <Route path="/login" element={!user ? <Login setUser={setUser} theme={theme} toggleTheme={toggleTheme} /> : <Navigate to="/dashboard" />} />
      <Route path="/register" element={!user ? <Register setUser={setUser} theme={theme} toggleTheme={toggleTheme} /> : <Navigate to="/dashboard" />} />
    </Routes>
  );
}

export default App;
