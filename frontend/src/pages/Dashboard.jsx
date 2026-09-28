import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { FiEdit2, FiTrash2, FiCopy, FiCheck, FiSun, FiMoon, FiLogOut, FiZap, FiFolder, FiPlay, FiPlus, FiArrowRight } from "react-icons/fi";
import { API_BASE } from "../config.js";

function Dashboard({ user, logout, theme, toggleTheme }) {
  const [rooms, setRooms] = useState([]);
  const [roomName, setRoomName] = useState("");
  const [maxUsers, setMaxUsers] = useState(10);
  const [joinRoomId, setJoinRoomId] = useState("");
  const [joinError, setJoinError] = useState("");
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("quick");
  const [quickLang, setQuickLang] = useState("javascript");
  const [isCreatingQuick, setIsCreatingQuick] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [recentRooms, setRecentRooms] = useState(() => {
    try {
      const saved = localStorage.getItem("recentRooms");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  useEffect(() => { fetchRooms(); }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchRooms = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/rooms`, { withCredentials: true });
      setRooms(res.data);
    } catch (err) {
      console.error("Failed to fetch rooms:", err);
    }
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    setError("");
    if (!roomName.trim()) { setError("Room name is required."); return; }
    try {
      await axios.post(`${API_BASE}/api/rooms`, {
        name: roomName,
        maxUsers: parseInt(maxUsers)
      }, { withCredentials: true });
      setRoomName("");
      setMaxUsers(10);
      fetchRooms();
    } catch {
      setError("Failed to create room. Please try again.");
    }
  };

  const saveRecentRoom = (roomId, roomName) => {
    const updated = [{ id: roomId, name: roomName, joinedAt: Date.now() }, ...recentRooms.filter(r => r.id !== roomId)].slice(0, 5);
    setRecentRooms(updated);
    localStorage.setItem("recentRooms", JSON.stringify(updated));
  };

  const handleJoinRoom = async (e) => {
    e.preventDefault();
    setJoinError("");
    if (!joinRoomId.trim()) return;
    setIsJoining(true);
    try {
      const res = await axios.get(`${API_BASE}/api/rooms/${joinRoomId.trim()}/exists`, { withCredentials: true });
      if (res.data.exists) {
        saveRecentRoom(joinRoomId.trim(), res.data.name);
        navigate(`/room/${joinRoomId.trim()}`);
      }
    } catch (err) {
      if (err.response?.status === 404) {
        setJoinError("Room not found. Please check the ID and try again.");
      } else {
        setJoinError("Failed to validate room. Please try again.");
      }
    } finally {
      setIsJoining(false);
    }
  };

  const handleDeleteRoom = async (roomId, name) => {
    if (!window.confirm(`Are you sure you want to delete workspace "${name}"? This action cannot be undone.`)) return;
    try {
      await axios.delete(`${API_BASE}/api/rooms/${roomId}`, { withCredentials: true });
      fetchRooms();
    } catch (err) {
      console.error("Failed to delete room:", err);
      alert("Failed to delete workspace.");
    }
  };

  const handleRenameRoom = async (roomId, currentName) => {
    const newName = window.prompt("Enter new workspace name:", currentName);
    if (!newName || newName.trim() === "" || newName === currentName) return;
    try {
      await axios.put(`${API_BASE}/api/rooms/${roomId}`, { name: newName }, { withCredentials: true });
      fetchRooms();
    } catch (err) {
      console.error("Failed to rename room:", err);
      alert("Failed to rename workspace.");
    }
  };

  const handleQuickIDE = async () => {
    setIsCreatingQuick(true);
    try {
      const existingQuickRooms = rooms.filter(r => r.name === "Quick IDE");
      for (const r of existingQuickRooms) {
        await axios.delete(`${API_BASE}/api/rooms/${r.roomId}`, { withCredentials: true });
      }

      let ext = "js";
      if (quickLang === "python") ext = "py";
      if (quickLang === "java") ext = "java";
      if (quickLang === "cpp") ext = "cpp";
      if (quickLang === "html") ext = "html";

      const res = await axios.post(`${API_BASE}/api/rooms`, {
        name: "Quick IDE",
        maxUsers: 1,
        files: [{ name: `main.${ext}`, language: quickLang, content: "" }],
        isQuickIDE: true
      }, { withCredentials: true });

      navigate(`/room/${res.data.roomId}`);
    } catch (err) {
      console.error("Failed to start Quick IDE:", err);
      alert("Failed to start Quick IDE.");
    } finally {
      setIsCreatingQuick(false);
    }
  };

  const copyToClipboard = (id) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(""), 2000);
  };

  const initials = user.name?.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "U";
  const workspaceRooms = rooms.filter(r => r.name !== "Quick IDE");

  const LANG_OPTIONS = [
    { value: "javascript", label: "JavaScript", icon: "JS", color: "#f7df1e" },
    { value: "python",     label: "Python",     icon: "PY", color: "#3776ab" },
    { value: "java",       label: "Java",       icon: "JV", color: "#ed8b00" },
    { value: "cpp",        label: "C++",        icon: "C+", color: "#00599c" },
    { value: "html",       label: "HTML / Web",  icon: "WB", color: "#e44d26" },
  ];

  return (
    <div className={`dash-root mode-${activeTab}`}>
      <div className="grid-bg"></div>

      {/* ── NAV ── */}
      <nav className="dash-nav glass-panel">
        <div className="dash-nav-brand">
          <img src="/logo.png" alt="LiveCodeX" style={{ width: 32, height: 32, borderRadius: '6px' }} />
          LiveCodeX
        </div>
        <div className="dash-nav-right">
          <button className="theme-toggle" onClick={toggleTheme} title="Toggle theme">
            {theme === "dark" ? <FiSun /> : <FiMoon />}
          </button>
          
          <div className="profile-dropdown-container" ref={dropdownRef}>
            <button 
              className="dash-user-pill" 
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              {user.avatar ? (
                <img src={user.avatar} alt="" style={{ width: 26, height: 26, borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                <div className="dash-avatar">{initials}</div>
              )}
              {user.name}
            </button>
            
            {dropdownOpen && (
              <div className="profile-dropdown-menu">
                <div className="dropdown-header">
                  <div className="avatar-upload-section">
                    {user.avatar ? (
                      <img src={user.avatar} alt="" className="avatar-preview" />
                    ) : (
                      <div className="avatar-placeholder">{initials}</div>
                    )}
                    <div>
                      <button className="avatar-upload-btn" onClick={() => document.getElementById('avatar-input').click()}>
                        Upload Photo
                      </button>
                      <input
                        id="avatar-input"
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={async (e) => {
                          const file = e.target.files[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = async (ev) => {
                            const dataUri = ev.target.result;
                            try {
                              await axios.post(`${API_BASE}/api/avatar`, { avatar: dataUri }, { withCredentials: true });
                              window.location.reload();
                            } catch (err) {
                              console.error("Avatar upload failed:", err);
                            }
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                    </div>
                  </div>
                  <div className="dropdown-name">{user.name}</div>
                  <div className="dropdown-email">{user.email}</div>
                </div>
                <hr className="dropdown-divider" />
                <button className="dropdown-item text-danger" onClick={logout} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FiLogOut /> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* ── BODY ── */}
      <div className="dash-body" style={{ flexDirection: 'column', alignItems: 'center', position: 'relative' }}>

        {/* ── LANDING HERO ── */}
        <div className="landing-hero">
          <h1>CODE TOGETHER IN REAL-TIME</h1>
          <p><i>Instantly launch collaborative workspaces and write code seamlessly.</i></p>
        </div>
        {/* CENTERED TABS */}
        <div className="dash-tabs">
          <button 
            className={`dash-tab ${activeTab === 'quick' ? 'dash-tab-active' : ''}`}
            onClick={() => setActiveTab('quick')}
          >
            <FiZap size={18} />
            Quick IDE
          </button>
          <button 
            className={`dash-tab ${activeTab === 'workspace' ? 'dash-tab-active' : ''}`}
            onClick={() => setActiveTab('workspace')}
          >
            <FiFolder size={18} />
            Workspaces
          </button>
          <button 
            className={`dash-tab ${activeTab === 'join' ? 'dash-tab-active' : ''}`}
            onClick={() => setActiveTab('join')}
          >
            <FiArrowRight size={18} />
            Join a Room
          </button>
        </div>

        {/* ── QUICK IDE TAB ── */}
        {activeTab === 'quick' && (
          <div className="dash-tab-content">
            <div className="quick-ide-section">
              <div className="quick-ide-hero">
                <FiZap size={48} style={{ color: 'var(--c-cyan)' }} />
                <h2>Quick IDE</h2>
                <p>Select a language and instantly start coding. No setup needed.</p>
              </div>
              
              <div className="quick-lang-grid">
                {LANG_OPTIONS.map(lang => (
                  <button
                    key={lang.value}
                    className={`quick-lang-card ${quickLang === lang.value ? 'quick-lang-card-active' : ''}`}
                    onClick={() => setQuickLang(lang.value)}
                  >
                    <div className="quick-lang-icon" style={{ background: lang.color }}>{lang.icon}</div>
                    <span>{lang.label}</span>
                  </button>
                ))}
              </div>

              <button 
                className="btn btn-success quick-launch-btn" 
                onClick={handleQuickIDE} 
                disabled={isCreatingQuick}
              >
                <FiPlay size={18} />
                {isCreatingQuick ? "Starting..." : "Launch IDE"}
              </button>
            </div>
          </div>
        )}

        {/* ── WORKSPACE TAB ── */}
        {activeTab === 'workspace' && (
          <div className="dash-tab-content" style={{ width: '100%', maxWidth: '1200px', flexDirection: 'column', alignItems: 'center' }}>
            
            <div className="quick-ide-hero" style={{ marginBottom: '32px' }}>
              <FiFolder size={48} style={{ color: 'var(--c-purple)' }} />
              <h2>Workspaces</h2>
              <p>Create, manage, and join real-time collaborative coding sessions.</p>
            </div>

            <div className="workspace-layout glass-panel" style={{ width: '100%', padding: '32px', borderRadius: '24px' }}>
              {/* LEFT PANEL */}
              <div className="workspace-sidebar">
                <div className="ws-card glass-panel">
                  <p className="dash-section-title"><FiPlus size={14} /> Create Workspace</p>
                  {error && <p className="dash-error">{error}</p>}
                  <form onSubmit={handleCreateRoom} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div>
                      <div className="field-label">Workspace Name</div>
                      <input
                        type="text"
                        placeholder="e.g. My Awesome Project"
                        value={roomName}
                        onChange={e => setRoomName(e.target.value)}
                      />
                    </div>
                    <div>
                      <div className="field-label">Max users</div>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={maxUsers}
                        onChange={e => setMaxUsers(e.target.value)}
                      />
                    </div>
                    <button type="submit" className="btn btn-success" style={{ marginTop: 8, width: "100%", justifyContent: "center" }}>
                      Create Workspace
                    </button>
                  </form>
                </div>
              </div>

              {/* RIGHT - WORKSPACE LIST */}
              <div className="workspace-main">
                <h2 className="dash-section-title" style={{ fontSize: "1.1rem", marginBottom: 16 }}>
                  Your Workspaces <span style={{ color: "var(--c-text2)", fontWeight: 400 }}>({workspaceRooms.length})</span>
                </h2>
                {workspaceRooms.length === 0 ? (
                  <div className="rooms-empty">
                    No workspaces yet. Create one from the sidebar to get started.
                  </div>
                ) : (
                  <div className="rooms-grid">
                    {workspaceRooms.map(room => (
                      <div key={room.roomId} className="room-card glass-panel">
                        <div className="room-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span className="room-card-name" style={{ fontSize: '1.1rem', fontWeight: 600 }}>{room.name}</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--c-text2)' }}>{room.maxUsers} max users</span>
                          </div>
                          <div className="room-actions" style={{ display: 'flex', gap: '4px' }}>
                            <button 
                              className="btn-icon" 
                              onClick={() => handleRenameRoom(room.roomId, room.name)} 
                              title="Rename Workspace"
                              style={{ border: 'none', background: 'var(--c-surface)', padding: '6px' }}
                            >
                              <FiEdit2 size={14} />
                            </button>
                            <button 
                              className="btn-icon text-danger" 
                              onClick={() => handleDeleteRoom(room.roomId, room.name)} 
                              title="Delete Workspace"
                              style={{ border: 'none', background: 'var(--c-surface)', padding: '6px' }}
                            >
                              <FiTrash2 size={14} />
                            </button>
                          </div>
                        </div>
                        <div className="room-id-row">
                          <span className="room-id-text">{room.roomId}</span>
                          <button className="btn-icon" onClick={() => copyToClipboard(room.roomId)}>
                            {copiedId === room.roomId ? <FiCheck /> : <FiCopy />}
                          </button>
                        </div>
                        <button
                          className="btn btn-primary btn-join"
                          onClick={() => navigate(`/room/${room.roomId}`)}
                        >
                          Open Editor
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── JOIN A ROOM TAB ── */}
        {activeTab === 'join' && (
          <div className="dash-tab-content">
            <div className="quick-ide-section">
              <div className="quick-ide-hero">
                <FiArrowRight size={48} style={{ color: 'var(--c-green)' }} />
                <h2>Join a Room</h2>
                <p>Enter a room ID shared by a collaborator to join their session.</p>
              </div>

              {joinError && <p className="dash-error" style={{ width: '100%' }}>{joinError}</p>}
              <form onSubmit={handleJoinRoom} style={{ display: "flex", flexDirection: "column", gap: 16, width: '100%' }}>
                <input
                  type="text"
                  placeholder="Paste room ID here..."
                  value={joinRoomId}
                  onChange={e => { setJoinRoomId(e.target.value); setJoinError(""); }}
                  style={{ padding: '14px 18px', fontSize: '1.05rem', borderRadius: '12px' }}
                />
                <button 
                  type="submit" 
                  className="btn btn-primary quick-launch-btn" 
                  disabled={isJoining || !joinRoomId.trim()}
                >
                  <FiArrowRight size={18} />
                  {isJoining ? "Validating..." : "Join Room"}
                </button>
              </form>

              {recentRooms.length > 0 && (
                <div style={{ width: '100%', marginTop: '32px' }}>
                  <h3 className="dash-section-title" style={{ justifyContent: 'center' }}>Recently Joined</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                    {recentRooms.map(room => (
                      <div key={room.id} className="room-card glass-panel" style={{ padding: '10px 14px', display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                        <div style={{ minWidth: 0, overflow: 'hidden' }}>
                          <div style={{ fontWeight: 500, fontSize: '0.9rem', color: 'var(--c-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{room.name || "Unknown Workspace"}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--c-text2)', fontFamily: 'var(--c-mono)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>ID: {room.id}</div>
                        </div>
                        <button 
                          className="btn-icon" 
                          onClick={() => {
                            setJoinRoomId(room.id);
                            // Optionally auto-join or let user click Join
                          }}
                          style={{ padding: '6px', flexShrink: 0 }}
                          title="Copy ID to input"
                        >
                          <FiArrowRight size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
