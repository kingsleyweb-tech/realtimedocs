import { useEffect, useState } from "react";
import logoImg from "../assets/docs.jpg";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../firebase/firebase";
import socket from "../socket/socket";
import { toast } from "../utils/toast";

import {
  IconZap,
  IconCopyLink as IconLink,
  IconLock,
  IconSave,
  IconPlus
} from "../components/Icons";

function Home() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [prevDocId, setPrevDocId] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Guarantee user registration inside DB
        socket.emit("save-user", {
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName,
          photoURL: currentUser.photoURL,
        });
        navigate("/dashboard");
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    const lastId = localStorage.getItem("lastDocId");
    if (lastId) {
      setPrevDocId(lastId);
    }
  }, []);

  const createDocument = () => {
    if (!user) {
      navigate("/login");
      return;
    }
    const id = Math.random().toString(36).substring(2, 10);
    navigate(`/document/${id}`);
  };

  const handleContinue = () => {
    if (prevDocId.trim()) {
      navigate(`/document/${prevDocId.trim()}`);
    } else {
      toast.warning("Please enter a valid Document ID.");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  return (
    <div className="home-page">
      {/* ── Navbar ── */}
      <nav className="home-nav">
        <a href="/" className="home-nav-brand">
          <img src={logoImg} alt="RealtimeDocs Logo" className="nav-logo-img" />
          <span className="nav-brand-text">Realtime<span>Docs</span></span>
        </a>
        <div className="home-nav-actions">
          {user ? (
            <>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--gray-700)', marginRight: '8px' }}>
                Welcome, {user.displayName || user.email || "User"}
              </span>
              <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
                Log out
              </button>
            </>
          ) : (
            <>
              <a href="/login" className="btn btn-ghost btn-sm">Log in</a>
              <a href="/register" className="btn btn-blue btn-sm">Sign up free</a>
            </>
          )}
        </div>
      </nav>

      {/* ── Main Dashboard / Hero ── */}
      <section className="hero-section">
        {user ? (
          <div className="glass-card glass-card-sm animate-fade-in-up" style={{ background: '#ffffff', border: '1px solid var(--border-light)', padding: '2.5rem', textAlign: 'center' }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <img src={logoImg} alt="RealtimeDocs Logo" style={{ width: '52px', height: '52px', borderRadius: '12px', objectFit: 'cover', margin: '0 auto 1rem', display: 'block' }} />
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--gray-900)' }}>
                Welcome back, {user.displayName || "User"}!
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
                Choose to continue editing or start fresh.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'left' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="prev-doc-id">Enter Document ID</label>
                <input
                  id="prev-doc-id"
                  type="text"
                  className="form-input"
                  placeholder="e.g. abc123xy"
                  value={prevDocId}
                  onChange={(e) => setPrevDocId(e.target.value)}
                />
              </div>

              <button className="btn btn-blue btn-full btn-lg" onClick={handleContinue}>
                Continue Previous
              </button>

              <div className="divider" style={{ margin: '0.5rem 0' }}>or</div>

              <button className="btn btn-primary btn-full btn-lg" onClick={createDocument}>
                Start New Document
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="hero-badge animate-fade-in-up">
              <span className="hero-badge-dot"></span>
              Real-time collaboration, powered by WebSockets
            </div>

            <h1 className="hero-title animate-fade-in-up delay-100">
              Write together,<br />
              <span className="hero-title-blue">anywhere.</span>
            </h1>

            <p className="hero-description animate-fade-in-up delay-200">
              Create, edit, and share documents with your team in real time.
              No lag. No conflicts. Just seamless collaboration.
            </p>

            <div className="hero-actions animate-fade-in-up delay-300">
              <button id="create-doc-btn" className="btn btn-primary btn-lg" onClick={createDocument}>
                <IconPlus /> New Document
              </button>
              <a href="/login" className="btn btn-outline btn-lg">
                Open existing
              </a>
            </div>
          </>
        )}
      </section>

      {/* ── Feature chips ── */}
      <div className="features-row animate-fade-in-up delay-400">
        <span className="feature-chip">
          <span className="feature-chip-icon"><IconZap /></span>Instant sync
        </span>
        <span className="feature-chip">
          <span className="feature-chip-icon"><IconLink size={15} /></span>Shareable links
        </span>
        <span className="feature-chip">
          <span className="feature-chip-icon"><IconLock /></span>Secure sessions
        </span>
        <span className="feature-chip">
          <span className="feature-chip-icon"><IconSave /></span>Auto-saved
        </span>
      </div>
    </div>
  );
}


export default Home;