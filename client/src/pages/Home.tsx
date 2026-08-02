import { useEffect, useState, useRef } from "react";
import logoImg from "../assets/docs.jpg";
import dashImg from "../assets/dash.png";
import dash1Img from "../assets/dash1.png";
import shareImg from "../assets/share.png";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase/firebase";

// Live typing demo — intentionally slower to feel natural
const TYPING_TEXT = "The team meeting is scheduled for Monday at 10am. Please review the quarterly report before then and bring your key takeaways to discuss...";

function Home() {
  const navigate = useNavigate();

  // Live typing demo state
  const [typedText, setTypedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const typingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const indexRef = useRef(0);

  // Scroll-reveal: mark sections visible when they enter viewport
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Back-to-top button visibility
  const [showBackToTop, setShowBackToTop] = useState(false);

  // Redirect logged-in users straight to dashboard
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) navigate("/dashboard");
    });
    return () => unsubscribe();
  }, [navigate]);

  // Show/hide back-to-top button on scroll
  useEffect(() => {
    const handleScroll = () => setShowBackToTop(window.scrollY > 400);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Scroll-reveal observer
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.target.id) {
            setVisibleSections((prev) => new Set([...prev, entry.target.id]));
          }
        });
      },
      { threshold: 0.12 }
    );
    const sections = document.querySelectorAll("[data-animate]");
    sections.forEach((el) => observerRef.current?.observe(el));
    return () => observerRef.current?.disconnect();
  }, []);

  // Start live-typing when demo section comes into view
  useEffect(() => {
    if (!visibleSections.has("demo-section")) return;
    if (isTyping) return;
    setIsTyping(true);
    indexRef.current = 0;
    setTypedText("");
  }, [visibleSections]);

  // Typing loop — 75ms per char so it feels natural and readable
  useEffect(() => {
    if (!isTyping) return;

    const type = () => {
      if (indexRef.current < TYPING_TEXT.length) {
        setTypedText(TYPING_TEXT.slice(0, indexRef.current + 1));
        indexRef.current++;
        // Slight random delay makes it feel like a real person typing
        typingRef.current = setTimeout(type, 75 + Math.random() * 40);
      } else {
        // Pause at end, then restart loop
        typingRef.current = setTimeout(() => {
          setIsTyping(false);
          setTypedText("");
          indexRef.current = 0;
          setTimeout(() => setIsTyping(true), 600);
        }, 3000);
      }
    };

    typingRef.current = setTimeout(type, 500);
    return () => { if (typingRef.current) clearTimeout(typingRef.current); };
  }, [isTyping]);

  const reveal = (id: string) =>
    visibleSections.has(id) ? "lp-visible" : "lp-hidden";

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

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
          <a href="/login" className="lp-nav-login">Log in</a>
          <a href="/register" className="btn-lp-primary btn-lp-sm">Get started free</a>
        </div>
      </nav>

      {/* ══════════ HERO ══════════ */}
      <section className="lp-hero">
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
            See cursors move. Watch words appear. No lag, no conflicts —
            just seamless collaboration.
          </p>

          <div className="lp-hero-cta">
            <a href="/register" className="btn-lp-primary">
              Start writing free
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </a>
            <a href="/login" className="btn-lp-outline">Sign in</a>
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
            RealtimeDocs gives you powerful collaboration tools with the simplicity of a text editor.
          </p>
        </div>

        <div className="lp-features-grid">
          {[
            {
              id: "feat-1",
              icon: <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>,
              title: "Instant real-time sync",
              desc: "Every keystroke is broadcast to all collaborators within milliseconds via Socket.io WebSockets."
            },
            {
              id: "feat-2",
              icon: <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
              title: "Live cursor tracking",
              desc: "See exactly where each collaborator is. Floating badges with unique colors show everyone's cursor."
            },
            {
              id: "feat-3",
              icon: <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
              title: "Fine-grained access control",
              desc: "Invite collaborators as editors or viewers. Set public access — restricted, view-only, or open editing."
            },
            {
              id: "feat-4",
              icon: <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>,
              title: "Auto-save to cloud",
              desc: "Every change is saved automatically to MongoDB. Your work is never lost, even mid-sentence."
            },
            {
              id: "feat-5",
              icon: <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>,
              title: "Shareable document links",
              desc: "Share a link to any document. Recipients join the same live room based on their role."
            },
            {
              id: "feat-6",
              icon: <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
              title: "Starred & organized",
              desc: "Star important documents. Trash and restore. Everything neatly organized in your dashboard."
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
            Alex types on the left. Jordan sees every word appear in real time on the right — no refresh needed.
          </p>
        </div>

        <div
          id="demo-section"
          data-animate
          className={`lp-demo-windows lp-animate ${reveal("demo-section")}`}
        >
          {/* User A — typing */}
          <div className="lp-doc-window">
            <div className="lp-doc-titlebar">
              <div className="lp-doc-dots">
                <span className="lp-dot lp-dot-red" />
                <span className="lp-dot lp-dot-yellow" />
                <span className="lp-dot lp-dot-green" />
              </div>
              <span className="lp-doc-filename">Q4 Strategy.txt</span>
              <div className="lp-doc-user-badge">
                <span className="lp-badge-avatar lp-avatar-blue">A</span>
                <span>Alex</span>
                <span className="lp-typing-indicator">
                  <span /><span /><span />
                </span>
              </div>
            </div>
            <div className="lp-doc-toolbar-strip">
              <span className="lp-toolbar-pill">B</span>
              <span className="lp-toolbar-pill lp-pill-italic">I</span>
              <span className="lp-toolbar-pill lp-pill-underline">U</span>
              <span className="lp-toolbar-sep" />
              <span className="lp-toolbar-pill">H1</span>
              <span className="lp-toolbar-pill">H2</span>
            </div>
            <div className="lp-doc-body">
              <div className="lp-doc-title-line">Q4 Business Strategy</div>
              <div className="lp-doc-text">
                {typedText}<span className="lp-cursor-blink">|</span>
              </div>
            </div>
          </div>

          {/* Connector */}
          <div className="lp-demo-connector">
            <div className="lp-connector-label">WebSocket</div>
            <div className="lp-connector-line">
              <div className="lp-arrow-pulse" />
              <svg width="56" height="14" viewBox="0 0 56 14" fill="none">
                <path d="M0 7 L48 7" stroke="#0ea5e9" strokeWidth="1.5" strokeDasharray="4 2"/>
                <path d="M47 2 L54 7 L47 12" stroke="#0ea5e9" strokeWidth="1.5" fill="none"/>
              </svg>
            </div>
          </div>

          {/* User B — receiving */}
          <div className="lp-doc-window">
            <div className="lp-doc-titlebar">
              <div className="lp-doc-dots">
                <span className="lp-dot lp-dot-red" />
                <span className="lp-dot lp-dot-yellow" />
                <span className="lp-dot lp-dot-green" />
              </div>
              <span className="lp-doc-filename">Q4 Strategy.txt</span>
              <div className="lp-doc-user-badge">
                <span className="lp-badge-avatar lp-avatar-purple">J</span>
                <span>Jordan</span>
              </div>
            </div>
            <div className="lp-doc-toolbar-strip">
              <span className="lp-toolbar-pill">B</span>
              <span className="lp-toolbar-pill lp-pill-italic">I</span>
              <span className="lp-toolbar-pill lp-pill-underline">U</span>
              <span className="lp-toolbar-sep" />
              <span className="lp-toolbar-pill">H1</span>
              <span className="lp-toolbar-pill">H2</span>
            </div>
            <div className="lp-doc-body">
              <div className="lp-doc-title-line">Q4 Business Strategy</div>
              <div className="lp-doc-text">
                {typedText}
                {typedText.length > 0 && (
                  <span className="lp-remote-cursor">
                    <span className="lp-remote-cursor-bar" />
                    <span className="lp-remote-cursor-label">Alex</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <p className="lp-demo-caption">
          The animation above simulates the real WebSocket experience inside RealtimeDocs.
        </p>
      </section>

      {/* ══════════ SCREENSHOTS ══════════ */}
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

        {/* Row 1 — Dashboard */}
        <div
          id="screenshot-1"
          data-animate
          className={`lp-screenshot-row lp-animate ${reveal("screenshot-1")}`}
        >
          <div className="lp-screenshot-text">
            <span className="lp-step-badge">01</span>
            <h3 className="lp-screenshot-title">Your documents, organized</h3>
            <p className="lp-screenshot-desc">
              The dashboard shows all your active documents at a glance. Create new ones with a single click
              or jump back into a recent document from the sidebar.
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

        {/* Row 2 — Collaboration view */}
        <div
          id="screenshot-2"
          data-animate
          className={`lp-screenshot-row lp-screenshot-row-reverse lp-animate ${reveal("screenshot-2")}`}
        >
          <div className="lp-screenshot-text">
            <span className="lp-step-badge">02</span>
            <h3 className="lp-screenshot-title">Write with your team</h3>
            <p className="lp-screenshot-desc">
              Jump into any document and see your teammates' cursors moving in real time. Every edit
              is synced instantly so everyone is always on the same page.
            </p>
            <ul className="lp-screenshot-bullets">
              <li>Live multi-user cursors</li>
              <li>Presence avatars in toolbar</li>
              <li>Auto-save on every keystroke</li>
            </ul>
          </div>
          <div className="lp-screenshot-img-wrap">
            <img src={dash1Img} alt="RealtimeDocs Editor" className="lp-screenshot-img" />
          </div>
        </div>

        {/* Row 3 — Share modal */}
        <div
          id="screenshot-3"
          data-animate
          className={`lp-screenshot-row lp-animate ${reveal("screenshot-3")}`}
        >
          <div className="lp-screenshot-text">
            <span className="lp-step-badge">03</span>
            <h3 className="lp-screenshot-title">Share with fine control</h3>
            <p className="lp-screenshot-desc">
              Invite collaborators by email and assign them as editors or viewers.
              Set public access rules so anyone with the link can read or contribute.
            </p>
            <ul className="lp-screenshot-bullets">
              <li>Invite by email</li>
              <li>Editor / Viewer roles</li>
              <li>Public link sharing</li>
            </ul>
          </div>
          <div className="lp-screenshot-img-wrap">
            <img src={shareImg} alt="RealtimeDocs Share Modal" className="lp-screenshot-img" />
          </div>
        </div>
      </section>

      {/* ══════════ HOW IT WORKS ══════════ */}
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
            { id: "step-1", num: "1", title: "Sign in with Google", desc: "One click with your Google account. No passwords to remember." },
            { id: "step-2", num: "2", title: "Create a document", desc: "Hit 'New Document'. A unique ID is generated and you're instantly in the editor." },
            { id: "step-3", num: "3", title: "Share the link", desc: "Send the document link to your team. They join the live room and see changes instantly." },
            { id: "step-4", num: "4", title: "Write together", desc: "Everyone edits simultaneously. See cursors move. All changes auto-save to the cloud." },
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

      {/* ══════════ CTA STRIP (compact) ══════════ */}
      <section
        id="cta-section"
        data-animate
        className={`lp-cta-strip lp-animate ${reveal("cta-section")}`}
      >
        <div className="lp-cta-strip-inner">
          <div className="lp-cta-strip-text">
            <h2 className="lp-cta-strip-title">Ready to write together?</h2>
            <p className="lp-cta-strip-sub">Free to use. No credit card required.</p>
          </div>
          <a href="/register" className="btn-lp-primary">
            Get started free
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
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

      {/* ══════════ BACK TO TOP BUTTON ══════════ */}
      {showBackToTop && (
        <button
          className="lp-back-to-top"
          onClick={scrollToTop}
          title="Back to top"
          aria-label="Scroll to top"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M18 15l-6-6-6 6"/>
          </svg>
        </button>
      )}

    </div>
  );
}

export default Home;