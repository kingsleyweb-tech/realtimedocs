import { useEffect, useState, useRef } from "react";
import logoImg from "../assets/docs.jpg";
import dashImg from "../assets/dash.png";
import dash1Img from "../assets/dash1.png";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase/firebase";

// ── Typing demo text for the live collaboration animation ──
const TYPING_TEXT = "The team meeting is scheduled for Monday at 10am. Please review the quarterly report before then and bring your key takeaways...";

function Home() {
  const navigate = useNavigate();

  // Live typing demo state
  const [typedText, setTypedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const typingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const indexRef = useRef(0);

  // Intersection observer for scroll animations
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Redirect logged-in users straight to dashboard
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) navigate("/dashboard");
    });
    return () => unsubscribe();
  }, [navigate]);

  // Scroll-reveal: mark sections visible when they enter viewport
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.target.id) {
            setVisibleSections((prev) => new Set([...prev, entry.target.id]));
          }
        });
      },
      { threshold: 0.1 }
    );

    const sections = document.querySelectorAll("[data-animate]");
    sections.forEach((el) => observerRef.current?.observe(el));

    return () => observerRef.current?.disconnect();
  }, []);

  // Start the live-typing animation when demo section scrolls into view
  useEffect(() => {
    if (!visibleSections.has("demo-section")) return;
    if (isTyping) return;

    setIsTyping(true);
    indexRef.current = 0;
    setTypedText("");

    const type = () => {
      if (indexRef.current < TYPING_TEXT.length) {
        setTypedText(TYPING_TEXT.slice(0, indexRef.current + 1));
        indexRef.current++;
        typingRef.current = setTimeout(type, 40 + Math.random() * 30);
      } else {
        // Pause then replay
        typingRef.current = setTimeout(() => {
          setIsTyping(false);
          indexRef.current = 0;
          setTypedText("");
          setIsTyping(false);
        }, 2500);
      }
    };

    typingRef.current = setTimeout(type, 600);
    return () => { if (typingRef.current) clearTimeout(typingRef.current); };
  }, [visibleSections]);

  // Restart the typing loop after reset
  useEffect(() => {
    if (visibleSections.has("demo-section") && !isTyping && typedText === "") {
      const restart = setTimeout(() => setIsTyping(true), 400);
      return () => clearTimeout(restart);
    }
  }, [isTyping, typedText, visibleSections]);

  useEffect(() => {
    if (!isTyping || !visibleSections.has("demo-section")) return;
    if (indexRef.current >= TYPING_TEXT.length) return;

    const type = () => {
      if (indexRef.current < TYPING_TEXT.length) {
        setTypedText(TYPING_TEXT.slice(0, indexRef.current + 1));
        indexRef.current++;
        typingRef.current = setTimeout(type, 40 + Math.random() * 30);
      } else {
        typingRef.current = setTimeout(() => {
          setIsTyping(false);
          setTypedText("");
          indexRef.current = 0;
        }, 2500);
      }
    };

    typingRef.current = setTimeout(type, 300);
    return () => { if (typingRef.current) clearTimeout(typingRef.current); };
  }, [isTyping]);

  const reveal = (id: string) =>
    visibleSections.has(id) ? "lp-visible" : "lp-hidden";

  return (
    <div className="lp-page">

      {/* ══════════ NAVBAR ══════════ */}
      <nav className="lp-nav">
        <a href="/" className="lp-nav-brand">
          <img src={logoImg} alt="RealtimeDocs" className="lp-nav-logo" />
          <span className="lp-nav-brand-text">Realtime<span>Docs</span></span>
        </a>
        <div className="lp-nav-links">
          <a href="#features" className="lp-nav-link">Features</a>
          <a href="#how-it-works" className="lp-nav-link">How it works</a>
          <a href="#demo" className="lp-nav-link">Live Demo</a>
        </div>
        <div className="lp-nav-actions">
          <a href="/login" className="btn btn-ghost btn-sm">Log in</a>
          <a href="/register" className="btn btn-blue btn-sm">Get started free</a>
        </div>
      </nav>

      {/* ══════════ HERO ══════════ */}
      <section className="lp-hero">
        <div className="lp-hero-bg-blobs">
          <div className="lp-blob lp-blob-1" />
          <div className="lp-blob lp-blob-2" />
          <div className="lp-blob lp-blob-3" />
        </div>

        <div className="lp-hero-content">
          <div className="lp-hero-badge">
            <span className="lp-badge-dot" />
            Real-time collaboration · Powered by WebSockets
          </div>

          <h1 className="lp-hero-title">
            Write together,<br />
            <span className="lp-gradient-text">anywhere.</span>
          </h1>

          <p className="lp-hero-sub">
            Create, edit, and share documents with your team in real time.
            See cursors move. Watch words appear. No lag. No conflicts.
            Just seamless collaboration — like Google Docs, but yours.
          </p>

          <div className="lp-hero-cta">
            <a href="/register" className="btn-lp-primary">
              Start writing free
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </a>
            <a href="/login" className="btn-lp-ghost">Sign in</a>
          </div>

          <div className="lp-hero-stats">
            <div className="lp-stat"><span className="lp-stat-num">Real-time</span><span className="lp-stat-label">Sync</span></div>
            <div className="lp-stat-divider" />
            <div className="lp-stat"><span className="lp-stat-num">Live</span><span className="lp-stat-label">Cursors</span></div>
            <div className="lp-stat-divider" />
            <div className="lp-stat"><span className="lp-stat-num">Instant</span><span className="lp-stat-label">Save</span></div>
            <div className="lp-stat-divider" />
            <div className="lp-stat"><span className="lp-stat-num">Secure</span><span className="lp-stat-label">Sharing</span></div>
          </div>
        </div>

        {/* Hero floating screenshot */}
        <div className="lp-hero-img-wrap">
          <div className="lp-hero-img-glow" />
          <img src={dashImg} alt="RealtimeDocs Dashboard" className="lp-hero-img" />
        </div>
      </section>

      {/* ══════════ FEATURES ══════════ */}
      <section id="features" className="lp-section lp-features-section">
        <div
          id="features-heading"
          data-animate
          className={`lp-section-header lp-animate ${reveal("features-heading")}`}
        >
          <span className="lp-section-eyebrow">Everything you need</span>
          <h2 className="lp-section-title">Built for teams that move fast</h2>
          <p className="lp-section-sub">
            RealtimeDocs combines the simplicity of a text editor with powerful real-time collaboration tools.
          </p>
        </div>

        <div className="lp-features-grid">
          {[
            {
              id: "feat-1",
              icon: (
                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
                </svg>
              ),
              title: "Instant real-time sync",
              desc: "Every keystroke is broadcast to all collaborators in the document within milliseconds via Socket.io WebSockets."
            },
            {
              id: "feat-2",
              icon: (
                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              ),
              title: "Live cursor tracking",
              desc: "See exactly where each collaborator is typing. Floating badges with unique colors show everyone's cursor position."
            },
            {
              id: "feat-3",
              icon: (
                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              ),
              title: "Fine-grained access control",
              desc: "Invite collaborators as editors or viewers. Set public access rules — restricted, view-only, or open editing."
            },
            {
              id: "feat-4",
              icon: (
                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
                </svg>
              ),
              title: "Auto-save to cloud",
              desc: "Every change is saved to MongoDB automatically. Your work is never lost, even if you close the tab mid-sentence."
            },
            {
              id: "feat-5",
              icon: (
                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                </svg>
              ),
              title: "Shareable document links",
              desc: "Share a link to any document. Recipients join the same live room and edit or view based on their role."
            },
            {
              id: "feat-6",
              icon: (
                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
              ),
              title: "Starred & organized",
              desc: "Star important documents for quick access. Trash and restore. Every document neatly organized in your dashboard."
            }
          ].map((feat) => (
            <div
              key={feat.id}
              id={feat.id}
              data-animate
              className={`lp-feature-card lp-animate ${reveal(feat.id)}`}
            >
              <div className="lp-feature-icon">{feat.icon}</div>
              <h3 className="lp-feature-title">{feat.title}</h3>
              <p className="lp-feature-desc">{feat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════ LIVE TYPING DEMO ══════════ */}
      <section id="demo" className="lp-section lp-demo-section">
        <div
          id="demo-heading"
          data-animate
          className={`lp-section-header lp-animate ${reveal("demo-heading")}`}
        >
          <span className="lp-section-eyebrow">Live demo</span>
          <h2 className="lp-section-title">Watch collaboration happen</h2>
          <p className="lp-section-sub">
            Alex types on the left. Jordan sees every word appear in real time on the right.
            No refresh needed — it just works.
          </p>
        </div>

        <div
          id="demo-section"
          data-animate
          className={`lp-demo-windows lp-animate ${reveal("demo-section")}`}
        >
          {/* User A — typing */}
          <div className="lp-doc-window lp-doc-editor">
            <div className="lp-doc-titlebar">
              <div className="lp-doc-dots">
                <span className="lp-dot lp-dot-red" />
                <span className="lp-dot lp-dot-yellow" />
                <span className="lp-dot lp-dot-green" />
              </div>
              <span className="lp-doc-filename">Q4 Strategy.txt</span>
              <div className="lp-doc-user-badge lp-badge-alex">
                <span className="lp-badge-avatar">A</span>
                <span>Alex</span>
                <span className="lp-typing-indicator">
                  <span /><span /><span />
                </span>
              </div>
            </div>
            <div className="lp-doc-toolbar-strip">
              <span className="lp-toolbar-pill">B</span>
              <span className="lp-toolbar-pill lp-pill-italic">I</span>
              <span className="lp-toolbar-pill" style={{ textDecoration: 'underline' }}>U</span>
              <span className="lp-toolbar-sep" />
              <span className="lp-toolbar-pill">H1</span>
              <span className="lp-toolbar-pill">H2</span>
            </div>
            <div className="lp-doc-body">
              <div className="lp-doc-title-line">Q4 Business Strategy</div>
              <div className="lp-doc-text">
                {typedText}
                <span className="lp-cursor-blink">|</span>
              </div>
            </div>
          </div>

          {/* Connection arrow */}
          <div className="lp-demo-connector">
            <div className="lp-connector-label">WebSocket</div>
            <div className="lp-connector-arrow">
              <div className="lp-arrow-pulse" />
              <svg width="60" height="16" viewBox="0 0 60 16" fill="none">
                <path d="M0 8 L52 8" stroke="#4f8ef7" strokeWidth="2" strokeDasharray="4 2"/>
                <path d="M50 2 L58 8 L50 14" stroke="#4f8ef7" strokeWidth="2" fill="none"/>
              </svg>
            </div>
          </div>

          {/* User B — viewer */}
          <div className="lp-doc-window lp-doc-viewer">
            <div className="lp-doc-titlebar">
              <div className="lp-doc-dots">
                <span className="lp-dot lp-dot-red" />
                <span className="lp-dot lp-dot-yellow" />
                <span className="lp-dot lp-dot-green" />
              </div>
              <span className="lp-doc-filename">Q4 Strategy.txt</span>
              <div className="lp-doc-user-badge lp-badge-jordan">
                <span className="lp-badge-avatar" style={{ background: '#7c3aed' }}>J</span>
                <span>Jordan</span>
              </div>
            </div>
            <div className="lp-doc-toolbar-strip">
              <span className="lp-toolbar-pill">B</span>
              <span className="lp-toolbar-pill lp-pill-italic">I</span>
              <span className="lp-toolbar-pill" style={{ textDecoration: 'underline' }}>U</span>
              <span className="lp-toolbar-sep" />
              <span className="lp-toolbar-pill">H1</span>
              <span className="lp-toolbar-pill">H2</span>
            </div>
            <div className="lp-doc-body">
              <div className="lp-doc-title-line">Q4 Business Strategy</div>
              <div className="lp-doc-text">
                {typedText}
                {typedText.length > 0 && (
                  <span className="lp-remote-cursor" title="Alex">
                    <span className="lp-remote-cursor-bar" />
                    <span className="lp-remote-cursor-label">Alex</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <p className="lp-demo-caption">
          ↑ The text above is animated — both documents stay perfectly in sync via WebSockets in the real app.
        </p>
      </section>

      {/* ══════════ DASHBOARD SCREENSHOTS ══════════ */}
      <section id="how-it-works" className="lp-section lp-screenshots-section">
        <div
          id="screenshots-heading"
          data-animate
          className={`lp-section-header lp-animate ${reveal("screenshots-heading")}`}
        >
          <span className="lp-section-eyebrow">Inside the app</span>
          <h2 className="lp-section-title">Your personal document hub</h2>
          <p className="lp-section-sub">
            Everything is organized in one clean dashboard. Create, star, share, or trash documents in seconds.
          </p>
        </div>

        <div
          id="screenshot-1"
          data-animate
          className={`lp-screenshot-row lp-animate ${reveal("screenshot-1")}`}
        >
          <div className="lp-screenshot-text">
            <span className="lp-step-num">01</span>
            <h3 className="lp-screenshot-title">Your documents, organized</h3>
            <p className="lp-screenshot-desc">
              The dashboard shows all your active documents at a glance. Create new ones with a single click,
              or jump back into a recent document from the sidebar. Star your favourites to pin them to quick access.
            </p>
            <ul className="lp-screenshot-bullets">
              <li>Quick document creation grid</li>
              <li>Starred, Shared, and Trash views</li>
              <li>Recent document sidebar</li>
            </ul>
          </div>
          <div className="lp-screenshot-img-wrap">
            <img src={dashImg} alt="RealtimeDocs Dashboard" className="lp-screenshot-img" />
          </div>
        </div>

        <div
          id="screenshot-2"
          data-animate
          className={`lp-screenshot-row lp-screenshot-row-reverse lp-animate ${reveal("screenshot-2")}`}
        >
          <div className="lp-screenshot-text">
            <span className="lp-step-num">02</span>
            <h3 className="lp-screenshot-title">Collaborate with your team</h3>
            <p className="lp-screenshot-desc">
              Share any document with teammates by email. Assign them as editors or viewers.
              Set public access rules so anyone with the link can read or contribute.
              See who's active inside the document with the live presence bar.
            </p>
            <ul className="lp-screenshot-bullets">
              <li>Invite collaborators by email</li>
              <li>Editor / Viewer role control</li>
              <li>Public link sharing</li>
            </ul>
          </div>
          <div className="lp-screenshot-img-wrap">
            <img src={dash1Img} alt="RealtimeDocs Collaboration" className="lp-screenshot-img" />
          </div>
        </div>
      </section>

      {/* ══════════ HOW IT WORKS STEPS ══════════ */}
      <section className="lp-section lp-steps-section">
        <div
          id="steps-heading"
          data-animate
          className={`lp-section-header lp-animate ${reveal("steps-heading")}`}
        >
          <span className="lp-section-eyebrow">Get started in seconds</span>
          <h2 className="lp-section-title">How it works</h2>
        </div>

        <div className="lp-steps-grid">
          {[
            { id: "step-1", num: "1", title: "Sign in with Google", desc: "One click with your Google account. No passwords to remember. Your profile syncs automatically." },
            { id: "step-2", num: "2", title: "Create a document", desc: "Hit 'New Document' on your dashboard. A unique document ID is generated and you're instantly in the editor." },
            { id: "step-3", num: "3", title: "Share the link", desc: "Copy the document link and send it to your team. They join the same live room and see your changes instantly." },
            { id: "step-4", num: "4", title: "Write together", desc: "Everyone edits simultaneously. See cursors move in real time. All changes are auto-saved to the cloud." },
          ].map((step) => (
            <div
              key={step.id}
              id={step.id}
              data-animate
              className={`lp-step-card lp-animate ${reveal(step.id)}`}
            >
              <div className="lp-step-num">{step.num}</div>
              <h3 className="lp-step-title">{step.title}</h3>
              <p className="lp-step-desc">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════ CTA BANNER ══════════ */}
      <section
        id="cta-section"
        data-animate
        className={`lp-cta-section lp-animate ${reveal("cta-section")}`}
      >
        <div className="lp-cta-blob" />
        <div className="lp-cta-inner">
          <h2 className="lp-cta-title">Ready to write together?</h2>
          <p className="lp-cta-sub">
            Join RealtimeDocs for free. No credit card required.
          </p>
          <a href="/register" className="btn-lp-primary btn-lp-large">
            Get started — it's free
          </a>
        </div>
      </section>

      {/* ══════════ FOOTER ══════════ */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div className="lp-footer-brand">
            <img src={logoImg} alt="RealtimeDocs" className="lp-nav-logo" />
            <span className="lp-nav-brand-text">Realtime<span>Docs</span></span>
          </div>
          <p className="lp-footer-copy">
            Built with React, Node.js, Socket.io & MongoDB. © {new Date().getFullYear()} RealtimeDocs.
          </p>
          <div className="lp-footer-links">
            <a href="/login" className="lp-footer-link">Log in</a>
            <a href="/register" className="lp-footer-link">Sign up</a>
          </div>
        </div>
      </footer>

    </div>
  );
}

export default Home;