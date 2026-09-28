import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { FiZap, FiUsers, FiShield, FiCode, FiPlay, FiShare2, FiMonitor, FiArrowRight, FiGithub, FiTwitter } from "react-icons/fi";
import "./LandingPage.css";

function LandingPage() {
  const navRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      if (navRef.current) {
        navRef.current.classList.toggle("lp-nav-scrolled", window.scrollY > 40);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="lp-root">
      {/* ── Grid BG ── */}
      <div className="lp-grid-bg"></div>

      {/* ── NAVBAR ── */}
      <nav className="lp-nav" ref={navRef}>
        <div className="lp-nav-inner">
          <Link to="/home" className="lp-nav-brand">
            <img src="/logo.png" alt="LiveCodeX" className="lp-nav-logo" />
            <span>LiveCodeX</span>
          </Link>
          <div className="lp-nav-links">
            <Link to="/login" className="lp-nav-link">Login</Link>
            <Link to="/register" className="lp-nav-btn">Sign Up</Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="lp-hero">
        <div className="lp-hero-glow lp-hero-glow-1"></div>
        <div className="lp-hero-glow lp-hero-glow-2"></div>

        <div className="lp-hero-content">
          <div className="lp-hero-badge">
            <FiZap size={14} />
            <span>Real-time collaborative coding</span>
          </div>
          <h1 className="lp-hero-title">
            Code Together,<br />
            <span className="lp-gradient-text">Build Faster</span>
          </h1>
          <p className="lp-hero-sub">
            The modern collaborative IDE where teams write, debug, and ship code
            together in real-time. No setup, no friction — just code.
          </p>
          <div className="lp-hero-actions">
            <Link to="/register" className="lp-btn-primary">
              Start Coding Free
              <FiArrowRight size={18} />
            </Link>
            <a href="#features" className="lp-btn-ghost">
              <FiPlay size={16} />
              See How It Works
            </a>
          </div>

          {/* Floating code snippet */}
          <div className="lp-hero-visual">
            <div className="lp-code-window">
              <div className="lp-code-titlebar">
                <div className="lp-dots">
                  <span className="lp-dot lp-dot-red"></span>
                  <span className="lp-dot lp-dot-yellow"></span>
                  <span className="lp-dot lp-dot-green"></span>
                </div>
                <span className="lp-code-filename">main.js</span>
                <div className="lp-code-collab">
                  <div className="lp-avatar-stack">
                    <div className="lp-mini-avatar" style={{ background: '#06b6d4' }}>A</div>
                    <div className="lp-mini-avatar" style={{ background: '#8b5cf6' }}>B</div>
                    <div className="lp-mini-avatar" style={{ background: '#10b981' }}>C</div>
                  </div>
                  <span className="lp-live-dot"></span>
                  <span>3 live</span>
                </div>
              </div>
              <div className="lp-code-body">
                <pre><code><span className="lp-line"><span className="lp-ln">1</span><span className="lp-kw">const</span> <span className="lp-fn">server</span> = <span className="lp-fn">createServer</span>({'{'}
</span><span className="lp-line"><span className="lp-ln">2</span>  <span className="lp-prop">port</span>: <span className="lp-num">4500</span>,
</span><span className="lp-line"><span className="lp-ln">3</span>  <span className="lp-prop">realtime</span>: <span className="lp-bool">true</span>,
</span><span className="lp-line"><span className="lp-ln">4</span>  <span className="lp-prop">collaboration</span>: <span className="lp-str">"enabled"</span>
</span><span className="lp-line lp-line-highlight"><span className="lp-ln">5</span>{'}'});
</span><span className="lp-line"><span className="lp-ln">6</span>
</span><span className="lp-line"><span className="lp-ln">7</span><span className="lp-fn">server</span>.<span className="lp-fn">listen</span>(() ={'>'} {'{'}
</span><span className="lp-line"><span className="lp-ln">8</span>  <span className="lp-fn">console</span>.<span className="lp-fn">log</span>(<span className="lp-str">"🚀 LiveCodeX ready"</span>);
</span><span className="lp-line"><span className="lp-ln">9</span>{'}'});
</span></code></pre>
                <div className="lp-cursor-indicator">
                  <div className="lp-typing-cursor" style={{ borderColor: '#8b5cf6' }}></div>
                  <span className="lp-cursor-label" style={{ background: '#8b5cf6' }}>User B</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="lp-section" id="features">
        <div className="lp-section-inner">
          <div className="lp-section-header">
            <span className="lp-tag">Features</span>
            <h2>Everything you need to<br /><span className="lp-gradient-text">code collaboratively</span></h2>
            <p>Powerful tools built for modern development teams.</p>
          </div>

          <div className="lp-features-grid">
            <div className="lp-feature-card">
              <div className="lp-feature-icon lp-icon-cyan"><FiUsers size={24} /></div>
              <h3>Real-Time Collaboration</h3>
              <p>See cursors, selections, and edits from your teammates live. No delays, no conflicts.</p>
            </div>
            <div className="lp-feature-card">
              <div className="lp-feature-icon lp-icon-purple"><FiCode size={24} /></div>
              <h3>Multi-Language Support</h3>
              <p>JavaScript, Python, Java, C++, HTML — pick your language and start coding instantly.</p>
            </div>
            <div className="lp-feature-card">
              <div className="lp-feature-icon lp-icon-green"><FiZap size={24} /></div>
              <h3>Instant Execution</h3>
              <p>Run your code directly in the browser with our integrated runtime. Get results in milliseconds.</p>
            </div>
            <div className="lp-feature-card">
              <div className="lp-feature-icon lp-icon-pink"><FiShield size={24} /></div>
              <h3>Secure Workspaces</h3>
              <p>Private rooms with access control. Your code stays safe and only visible to invited members.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="lp-section lp-section-alt">
        <div className="lp-section-inner">
          <div className="lp-section-header">
            <span className="lp-tag">How It Works</span>
            <h2>Start coding in<br /><span className="lp-gradient-text">three simple steps</span></h2>
          </div>

          <div className="lp-steps">
            <div className="lp-step">
              <div className="lp-step-number">01</div>
              <div className="lp-step-icon"><FiMonitor size={28} /></div>
              <h3>Create a Workspace</h3>
              <p>Sign up and create a new workspace or use Quick IDE for instant coding sessions.</p>
            </div>
            <div className="lp-step-connector"></div>
            <div className="lp-step">
              <div className="lp-step-number">02</div>
              <div className="lp-step-icon"><FiShare2 size={28} /></div>
              <h3>Share the Room ID</h3>
              <p>Invite collaborators by sharing the unique room ID. They join instantly — no installs needed.</p>
            </div>
            <div className="lp-step-connector"></div>
            <div className="lp-step">
              <div className="lp-step-number">03</div>
              <div className="lp-step-icon"><FiCode size={28} /></div>
              <h3>Code Together</h3>
              <p>Write, edit, and execute code in real-time. Every keystroke syncs across all participants.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS / SOCIAL PROOF ── */}
      <section className="lp-section">
        <div className="lp-section-inner">
          <div className="lp-stats-grid">
            <div className="lp-stat">
              <div className="lp-stat-number">5+</div>
              <div className="lp-stat-label">Languages Supported</div>
            </div>
            <div className="lp-stat">
              <div className="lp-stat-number">∞</div>
              <div className="lp-stat-label">Workspaces</div>
            </div>
            <div className="lp-stat">
              <div className="lp-stat-number">&lt;50ms</div>
              <div className="lp-stat-label">Sync Latency</div>
            </div>
            <div className="lp-stat">
              <div className="lp-stat-number">100%</div>
              <div className="lp-stat-label">Free to Use</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="lp-cta">
        <div className="lp-cta-glow"></div>
        <div className="lp-cta-inner">
          <h2>Ready to code together?</h2>
          <p>Join developers who are already building faster with LiveCodeX.</p>
          <Link to="/register" className="lp-btn-primary lp-btn-lg">
            Get Started — It's Free
            <FiArrowRight size={20} />
          </Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div className="lp-footer-brand">
            <img src="/logo.png" alt="LiveCodeX" className="lp-nav-logo" />
            <span>LiveCodeX</span>
          </div>
          <div className="lp-footer-links">
            <Link to="/login">Login</Link>
            <Link to="/register">Sign Up</Link>
            <a href="#features">Features</a>
          </div>
          <div className="lp-footer-copy">
            © {new Date().getFullYear()} LiveCodeX. Built for developers.
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
