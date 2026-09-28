import { useState, useEffect, useRef, useCallback } from "react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { MonacoBinding } from "y-monaco";
import Editor from "@monaco-editor/react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { FiPlus, FiEdit2, FiTrash2, FiSave, FiPlay, FiEye, FiSun, FiMoon } from "react-icons/fi";
import { API_BASE, WS_BASE } from "../config.js";

// Supported languages for code execution (handled by Judge0 API on the backend)
const EXECUTABLE_LANGUAGES = ["javascript", "python", "java", "cpp"];

function getLanguageFromExtension(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  switch (ext) {
    case 'js': return 'javascript';
    case 'py': return 'python';
    case 'cpp': return 'cpp';
    case 'c': return 'cpp';
    case 'java': return 'java';
    case 'html': return 'html';
    case 'css': return 'css';
    default: return 'javascript';
  }
}

function getFileIcon(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  let color = "#cbd5e1";
  let text = "txt";
  switch(ext) {
    case 'js': color = "#facc15"; text = "JS"; break;
    case 'py': color = "#60a5fa"; text = "PY"; break;
    case 'cpp': color = "#3b82f6"; text = "C++"; break;
    case 'c': color = "#3b82f6"; text = "C"; break;
    case 'java': color = "#f87171"; text = "JAVA"; break;
    case 'html': color = "#f97316"; text = "HTML"; break;
    case 'css': color = "#2dd4bf"; text = "CSS"; break;
  }
  return (
    <span style={{ 
      display: 'inline-block', 
      width: '32px', 
      textAlign: 'center', 
      fontSize: '0.65rem', 
      fontWeight: 'bold', 
      color: '#fff', 
      backgroundColor: color, 
      borderRadius: '4px',
      padding: '2px 0' 
    }}>
      {text}
    </span>
  );
}

// Each peer gets a deterministic color based on their user id hash
function hashColor(str) {
  const COLORS = ["#06b6d4", "#8b5cf6", "#3b82f6", "#ec4899", "#10b981", "#f59e0b", "#ef4444", "#14b8a6"];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
}

function EditorPage({ user, theme, toggleTheme }) {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const ydocRef = useRef(null);
  const providerRef = useRef(null);
  const bindingRef = useRef(null);
  const editorRef = useRef(null);

  const [files, setFiles] = useState([]);
  const [activeFile, setActiveFile] = useState(null);
  
  const [language, setLanguage] = useState("javascript");
  const [peers, setPeers] = useState([]);
  const [output, setOutput] = useState("");
  const [outputStatus, setOutputStatus] = useState("idle");
  const [copied, setCopied] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [editorReady, setEditorReady] = useState(false);
  const [isSynced, setIsSynced] = useState(false);
  const [draggingMode, setDraggingMode] = useState(null); // Fixes drag event swallowing
  const [terminalHeight, setTerminalHeight] = useState(220);
  const [previewWidth, setPreviewWidth] = useState(450); // Width of the right-side preview pane
  const [sidebarWidth, setSidebarWidth] = useState(250); // Width of the left sidebar
  const [previewKey, setPreviewKey] = useState(0);

  const isDraggingTerminal = useRef(false);
  const startY = useRef(0);
  const startH = useRef(0);

  const isDraggingPreview = useRef(false);
  const startX = useRef(0);
  const startW = useRef(0);

  const isDraggingSidebar = useRef(false);
  const startXSidebar = useRef(0);
  const startWSidebar = useRef(0);

  const [isQuickIDE, setIsQuickIDE] = useState(false);

  /* ── FETCH INITIAL FILES ──────────────────────────────────── */
  useEffect(() => {
    axios.get(`${API_BASE}/api/rooms/${roomId}/files`, { withCredentials: true })
      .then(res => {
        const fetchedFiles = res.data.files || [];
        setFiles(fetchedFiles);
        setIsQuickIDE(res.data.isQuickIDE || false);
        if (fetchedFiles.length > 0) setActiveFile(fetchedFiles[0].name);
      })
      .catch(err => console.error("Failed to fetch files", err));
  }, [roomId]);

  /* ── CLEANUP QUICK IDE ON CLOSE ────────────────────────────── */
  useEffect(() => {
    if (!isQuickIDE) return;

    const cleanupRoom = () => {
      fetch(`${API_BASE}/api/rooms/${roomId}`, { 
        method: 'DELETE', 
        keepalive: true,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      }).catch(() => {});
    };

    window.addEventListener("beforeunload", cleanupRoom);
    return () => {
      window.removeEventListener("beforeunload", cleanupRoom);
      axios.delete(`${API_BASE}/api/rooms/${roomId}`, { withCredentials: true }).catch(() => {});
    };
  }, [roomId, isQuickIDE]);

  /* ── RESIZABLE PANES ──────────────────────────────────────── */
  const onMouseDownTerminal = useCallback((e) => {
    isDraggingTerminal.current = true;
    startY.current = e.clientY;
    startH.current = terminalHeight;
    setDraggingMode("ns-resize");
  }, [terminalHeight]);

  const onMouseDownPreview = useCallback((e) => {
    isDraggingPreview.current = true;
    startX.current = e.clientX;
    startW.current = previewWidth;
    setDraggingMode("ew-resize");
  }, [previewWidth]);

  const onMouseDownSidebar = useCallback((e) => {
    isDraggingSidebar.current = true;
    startXSidebar.current = e.clientX;
    startWSidebar.current = sidebarWidth;
    setDraggingMode("ew-resize");
  }, [sidebarWidth]);

  useEffect(() => {
    const onMouseMove = (e) => {
      if (isDraggingTerminal.current) {
        const diff = startY.current - e.clientY;
        const newH = Math.max(100, Math.min(500, startH.current + diff));
        setTerminalHeight(newH);
      }
      if (isDraggingPreview.current) {
        const diff = startX.current - e.clientX;
        const newW = Math.max(200, Math.min(800, startW.current + diff));
        setPreviewWidth(newW);
      }
      if (isDraggingSidebar.current) {
        const diff = e.clientX - startXSidebar.current;
        const newW = Math.max(150, Math.min(500, startWSidebar.current + diff));
        setSidebarWidth(newW);
      }
    };
    const onMouseUp = () => {
      isDraggingTerminal.current = false;
      isDraggingPreview.current = false;
      isDraggingSidebar.current = false;
      setDraggingMode(null);
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  /* ── MOUNT MONACO + Y.js ──────────────────────────────────── */
  function handleEditorDidMount(editor) {
    editorRef.current = editor;
    if (!user) return;

    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    const provider = new WebsocketProvider(`${WS_BASE}/${roomId}`, roomId, ydoc);
    providerRef.current = provider;

    const myColor = hashColor(user.id || user.name);
    provider.awareness.setLocalStateField("user", {
      id: user.id,
      name: user.name,
      color: myColor,
      avatar: user.avatar || null,
    });

    const updatePeers = () => {
      const states = Array.from(provider.awareness.getStates().values());
      const allUsers = states.map(s => s.user).filter(Boolean);
      const uniqueUsers = Array.from(new Map(allUsers.map(u => [u.id, u])).values());
      setPeers(uniqueUsers);
    };
    provider.awareness.on("change", updatePeers);
    updatePeers();

    provider.on("synced", (synced) => {
      setIsSynced(synced);
    });

    // The Monaco Binding will be handled dynamically when activeFile changes.
    setEditorReady(true);
  }

  /* ── DYNAMIC Y.JS BINDING ─────────────────────────────────── */
  useEffect(() => {
    if (!activeFile || !editorRef.current || !ydocRef.current || !providerRef.current || !isSynced) return;

    if (bindingRef.current) {
      bindingRef.current.destroy();
    }

    const ytext = ydocRef.current.getText(activeFile);
    
    // Hydrate ONLY if empty after sync finishes
    const fileObj = files.find(f => f.name === activeFile);
    if (ytext.toString() === "" && fileObj && fileObj.content) {
      ytext.insert(0, fileObj.content);
    }

    const binding = new MonacoBinding(
      ytext, 
      editorRef.current.getModel(), 
      new Set([editorRef.current]), 
      providerRef.current.awareness
    );
    bindingRef.current = binding;

    if (fileObj) {
      setLanguage(fileObj.language);
    }
  }, [activeFile, files, editorReady, isSynced]);

  /* ── WEB PREVIEW LOGIC ────────────────────────────────────── */
  function generatePreviewDoc() {
    if (!ydocRef.current) return "";
    const htmlContent = ydocRef.current.getText("index.html")?.toString() || "";
    const cssContent = ydocRef.current.getText("style.css")?.toString() || "";
    const jsContent = ydocRef.current.getText("script.js")?.toString() || "";

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>${cssContent}</style>
        </head>
        <body>
          ${htmlContent}
          <script>${jsContent}</script>
        </body>
      </html>
    `;
  }

  function handleSaveWorkspace() {
    if (!ydocRef.current) return;
    const currentFiles = files.map(f => {
      const ytext = ydocRef.current.getText(f.name);
      return { ...f, content: ytext.toString() || f.content };
    });
    
    axios.post(`${API_BASE}/api/rooms/${roomId}/save`, { files: currentFiles }, { withCredentials: true })
      .then(() => {
        setOutput("Workspace saved successfully to database!");
        setOutputStatus("success");
      })
      .catch(() => {
        setOutput("Failed to save workspace.");
        setOutputStatus("error");
      });
  }

  // Auto-save every 10 seconds
  useEffect(() => {
    const saveInterval = setInterval(() => {
      if (!ydocRef.current || files.length === 0) return;
      
      const currentFiles = files.map(f => {
        const ytext = ydocRef.current.getText(f.name);
        return { ...f, content: ytext.toString() || f.content };
      });
      
      axios.post(`${API_BASE}/api/rooms/${roomId}/save`, { files: currentFiles }, { withCredentials: true })
        .catch(() => console.error("Auto-save failed"));
    }, 10000);
    
    return () => clearInterval(saveInterval);
  }, [files, roomId]);

  /* ── FILE OPERATIONS ──────────────────────────────────────── */
  function handleCreateFile() {
    const name = window.prompt("Enter new file name (e.g., script.js):");
    if (!name || name.trim() === "") return;
    if (files.some(f => f.name === name)) {
      alert("A file with this name already exists.");
      return;
    }
    const newFile = { name, language: getLanguageFromExtension(name), content: "" };
    setFiles([...files, newFile]);
    setActiveFile(name);
  }

  function handleRenameFile(e, oldName) {
    e.stopPropagation();
    const newName = window.prompt("Enter new file name:", oldName);
    if (!newName || newName.trim() === "" || newName === oldName) return;
    if (files.some(f => f.name === newName)) {
      alert("A file with this name already exists.");
      return;
    }

    // Migrate Y.js text to the new filename key
    if (ydocRef.current) {
      const oldText = ydocRef.current.getText(oldName).toString();
      if (oldText) {
        ydocRef.current.getText(newName).insert(0, oldText);
      }
    }

    setFiles(files.map(f => 
      f.name === oldName 
        ? { ...f, name: newName, language: getLanguageFromExtension(newName) } 
        : f
    ));
    
    if (activeFile === oldName) {
      setActiveFile(newName);
    }
  }

  function handleDeleteFile(e, name) {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete ${name}?`)) return;
    
    const newFiles = files.filter(f => f.name !== name);
    setFiles(newFiles);
    
    if (activeFile === name) {
      setActiveFile(newFiles.length > 0 ? newFiles[0].name : null);
    }
  }

  /* ── CLEANUP ──────────────────────────────────────────────── */
  useEffect(() => {
    return () => {
      providerRef.current?.awareness.setLocalState(null);
      providerRef.current?.disconnect();
      bindingRef.current?.destroy();
      ydocRef.current?.destroy();
    };
  }, []);

  function leaveRoom() {
    if (providerRef.current) {
      providerRef.current.awareness.setLocalState(null);
      providerRef.current.disconnect();
    }
    navigate("/dashboard");
  }

  function copyRoomId() {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  /* ── RUN CODE ─────────────────────────────────────────────── */
  async function runCode() {
    const currentCode = editorRef.current ? editorRef.current.getValue() : "";
    if (!currentCode.trim()) return;

    if (!EXECUTABLE_LANGUAGES.includes(language)) {
      setOutput(`Error: Execution is not supported for ${language}.\n\nFor HTML, CSS, and frontend JavaScript, please use the "Live Web Preview" panel on the right.`);
      setOutputStatus("error");
      return;
    }

    setIsRunning(true);
    setOutputStatus("running");
    setOutput("Running...");

    try {
      const res = await axios.post(
        `${API_BASE}/api/execute`,
        { code: currentCode, language },
        { withCredentials: true }
      );

      const run = res.data?.run;
      if (run) {
        let out = (run.stdout || "") + (run.stderr || "");
        if (language === "javascript" && out.includes("ReferenceError: document is not defined")) {
            out += "\n\n[Hint]: The 'Run Code' button executes JavaScript in a Node.js backend environment (which has no DOM).\nTo see your frontend JavaScript interact with HTML, use the 'Live Web Preview' panel!";
        }
        setOutput(out || "(no output)");
        setOutputStatus(run.code !== 0 ? "error" : "idle");
      } else {
        setOutput("Unexpected response.");
        setOutputStatus("error");
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Execution failed";
      setOutput(`Error: ${msg}`);
      setOutputStatus("error");
    } finally {
      setIsRunning(false);
    }
  }

  const editorTheme = theme === "dark" ? "vs-dark" : "vs";

  return (
    <div className="editor-layout">
      {/* Global Drag Overlay to prevent iframes and editors from swallowing mouse events */}
      {draggingMode && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, cursor: draggingMode }} />
      )}

      {/* ── TOP NAVBAR ──────────────────────────────────────── */}
      <nav className="editor-navbar">
        <div className="editor-nav-left">
          <div className="editor-brand">
            <img src="/logo.png" alt="LiveCodeX" style={{ width: 24, height: 24, borderRadius: '4px', marginRight: '8px', verticalAlign: 'middle' }} />
            LiveCodeX
          </div>
          <div className="editor-room-badge" title="Room ID">
            {roomId}
            <button className="btn-icon" style={{ padding: "2px 6px", fontSize: "0.75rem", border: "none" }} onClick={copyRoomId}>
              {copied ? "✓" : "Copy"}
            </button>
          </div>
        </div>

        <div className="editor-nav-center" style={{ display: "flex", gap: "10px" }}>
          <button className="btn btn-secondary" onClick={handleSaveWorkspace} style={{ padding: "6px 14px", backgroundColor: "var(--c-surface2)", color: "var(--c-text)", border: "1px solid var(--c-border)", display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FiSave /> Save Workspace
          </button>
          <button className="btn btn-success" onClick={runCode} disabled={isRunning} style={{ padding: "6px 14px", display: 'flex', alignItems: 'center', gap: '6px' }}>
            {isRunning ? "Running..." : <><FiPlay /> Run Code</>}
          </button>
          <button className="btn btn-primary" onClick={() => setPreviewKey(k => k + 1)} style={{ padding: "6px 14px", display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FiEye /> Refresh Preview
          </button>
        </div>

        <div className="editor-nav-right">
          <div className="lang-badge" style={{ padding: "6px 10px", background: "var(--c-surface2)", borderRadius: "var(--radius)", fontSize: "0.85rem", border: "1px solid var(--c-border)", color: "var(--c-text2)" }}>
            {language}
          </div>
          <button className="theme-toggle" onClick={toggleTheme} style={{ width: 32, height: 32 }}>
            {theme === "dark" ? <FiSun /> : <FiMoon />}
          </button>
          <button className="btn btn-danger" onClick={leaveRoom} style={{ padding: "6px 14px" }}>
            Leave
          </button>
        </div>
      </nav>

      {/* ── MAIN BODY ────────────────────────────────────────── */}
      <div className="editor-body">

        {/* Sidebar: Files + Peers */}
        <div className="left-sidebar" style={{ width: sidebarWidth, flexShrink: 0 }}>
          
          <div className="sidebar-section">
            <div className="sidebar-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Files</span>
              {!isQuickIDE && (
                <button 
                  onClick={handleCreateFile} 
                  style={{ background: 'none', border: 'none', color: 'var(--c-cyan)', cursor: 'pointer', fontSize: '1.2rem', padding: '0 4px', display: 'flex' }}
                  title="New File"
                >
                  <FiPlus />
                </button>
              )}
            </div>
            <div className="file-list">
              {files.map(f => (
                <div 
                  key={f.name} 
                  className={`file-item ${activeFile === f.name ? 'active' : ''}`}
                  onClick={() => setActiveFile(f.name)}
                >
                  <span className="file-icon">{getFileIcon(f.name)}</span> 
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                  <div className="file-actions" style={{ display: 'flex', gap: '4px' }}>
                    <button className="file-btn" onClick={(e) => handleRenameFile(e, f.name)} title="Rename" style={{ display: 'flex' }}>
                      <FiEdit2 size={13} />
                    </button>
                    <button className="file-btn text-danger" onClick={(e) => handleDeleteFile(e, f.name)} title="Delete" style={{ display: 'flex' }}>
                      <FiTrash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="sidebar-section">
            <div className="sidebar-title">Peers</div>
            <div className="peer-sidebar-list">
              {peers.length === 0 ? (
                <span style={{ fontSize: "0.8rem", color: "var(--c-text2)", padding: "0 12px" }}>No one here</span>
              ) : (
                peers.map((p, i) => {
                  const initials = p.name?.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "?";
                  return (
                    <div className="peer-row" key={i}>
                      {p.avatar ? (
                        <img src={p.avatar} alt={p.name} className="peer-avatar-img" style={{ borderColor: p.color }} />
                      ) : (
                        <div className="peer-avatar" style={{ background: p.color }}>{initials}</div>
                      )}
                      <span className="peer-full-name">{p.name}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Horizontal Drag Handle */}
        <div className="preview-drag-handle" onMouseDown={onMouseDownSidebar}>
          <div className="preview-drag-dots" />
        </div>

        {/* Center Column: Editor + Terminal */}
        <div className="editor-split" style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, minHeight: 0 }}>
          <div className="editor-code-container" style={{ flex: 1, minHeight: 0, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            {activeFile ? (
              <Editor
                height="100%"
                language={language}
                defaultValue={`// Write your ${language} code here!\n`}
                onMount={handleEditorDidMount}
                theme={editorTheme}
                options={{
                  minimap: { enabled: false },
                  fontSize: 15,
                  lineHeight: 24,
                  fontFamily: "'Fira Code', 'JetBrains Mono', monospace",
                  fontLigatures: true,
                  scrollBeyondLastLine: false,
                  renderLineHighlight: "all",
                  padding: { top: 16 },
                  cursorBlinking: "smooth",
                  cursorSmoothCaretAnimation: "on",
                }}
              />
            ) : (
              <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: 'var(--c-text2)', textAlign: 'center' }}>
                <div>
                  <img src="/logo.png" alt="LiveCodeX" style={{ width: 64, height: 64, borderRadius: '12px', marginBottom: '16px', opacity: 0.8 }} />
                  <h2>Workspace is empty</h2>
                  <p>Click the <b>+</b> icon in the left sidebar to create a new file.</p>
                </div>
              </div>
            )}
          </div>

          {/* Terminal Vertical Drag Handle */}
          <div className="terminal-drag-handle" onMouseDown={onMouseDownTerminal}>
            <div className="terminal-drag-dots" />
          </div>

          {/* Terminal Panel */}
          <div className="terminal-panel" style={{ height: terminalHeight, flexShrink: 0 }}>
            <div className="terminal-tabs">
              <div className="terminal-tab active">Terminal</div>
              {outputStatus === "error" && (
                <div className="terminal-tab" style={{ color: "var(--c-red)", marginLeft: "auto" }}>Exit Code 1</div>
              )}
            </div>
            <div className={`terminal-output ${outputStatus}`}>
              {output || "➜  ~ Ready. Click 'Run Code' to execute."}
            </div>
          </div>
        </div>

        {/* Right Column: Live Web Preview (Only if HTML) */}
        {language === "html" && (
          <>
            {/* Horizontal Drag Handle */}
            <div className="preview-drag-handle" onMouseDown={onMouseDownPreview}>
              <div className="preview-drag-dots" />
            </div>

            <div className="preview-panel" style={{ width: previewWidth, display: 'flex', flexDirection: 'column', background: '#fff', flexShrink: 0 }}>
              <div className="terminal-tabs" style={{ background: "var(--c-surface)", borderBottom: "1px solid var(--c-border)" }}>
                <div className="terminal-tab active" style={{ color: "var(--c-cyan)" }}>Live Web Preview</div>
              </div>
              <iframe
                key={previewKey}
                title="Web Preview"
                srcDoc={generatePreviewDoc()}
                style={{ width: '100%', flex: 1, border: 'none', background: '#fff' }}
                sandbox="allow-scripts"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default EditorPage;
