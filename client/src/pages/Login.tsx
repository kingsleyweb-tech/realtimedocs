import { useNavigate, useSearchParams } from "react-router-dom";
import logoImg from "../assets/docs.jpg";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../firebase/firebase";
import socket from "../socket/socket";
import { toast } from "../utils/toast";
import {IconZap,IconCopyLink as IconLink,IconLock,IconArrowLeft,IconGoogle} from "../components/Icons";

function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const handleGoogleLogin = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    try {
      const res = await signInWithPopup(auth, googleProvider);
      const user = res.user;
      
      // Save user to MongoDB via Socket connection
      socket.emit("save-user", {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
      });

      const redirect = searchParams.get("redirect") || "/dashboard";
      navigate(redirect);
    } catch (err: any) {
      console.error("Google login failed", err);
      toast.error(`Login error (${err.code || "unknown"}): ${err.message || "Please check your Firebase configuration."}`);
    }
  };
  return (
    <div className="auth-page">

      {/* ══ LEFT PANEL ══ */}
      <div className="auth-left">
        <div className="auth-left-brand">
          <img src={logoImg} alt="RealtimeDocs Logo" className="auth-brand-logo-img" />
          <span className="auth-brand-name">Realtime<span>Docs</span></span>
        </div>

        <div className="auth-left-content">
          <h2 className="auth-panel-title">
            Write together,<br />in real time.
          </h2>
          <p className="auth-panel-desc">
            Sign in to your account and pick up right where you left off. Your documents are waiting.
          </p>

          <div className="auth-feature-list">
            <div className="auth-feature-item">
              <div className="auth-feature-icon"><IconZap /></div>
              <div className="auth-feature-text">
                <h4>Instant sync</h4>
                <p>Every keystroke is synced live across all collaborators.</p>
              </div>
            </div>
            <div className="auth-feature-item">
              <div className="auth-feature-icon"><IconLink /></div>
              <div className="auth-feature-text">
                <h4>Shareable links</h4>
                <p>Share a link and your team can join instantly — no setup needed.</p>
              </div>
            </div>
            <div className="auth-feature-item">
              <div className="auth-feature-icon"><IconLock /></div>
              <div className="auth-feature-text">
                <h4>Secure sessions</h4>
                <p>All documents are protected and only accessible to invited users.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="auth-left-footer">
          &copy; 2024 RealtimeDocs. All rights reserved.
        </div>
      </div>

      {/* ══ RIGHT PANEL ══ */}
      <div className="auth-right">

        {/* Video background — white bg with spinning fan */}
        <video className="auth-video-bg" autoPlay muted loop playsInline>
          <source src="/vid.mp4" type="video/mp4" />
        </video>

        <div className="auth-right-inner animate-fade-in-up">

          <a href="/" className="auth-back-link">
            <IconArrowLeft /> Back to Home
          </a>

          <h1 className="auth-form-title">Welcome back</h1>
          <p className="auth-form-subtitle">Please sign in to access your documents</p>

          <div style={{ marginTop: '2rem' }}>
            <button id="login-google-btn" type="button" className="btn btn-google btn-full btn-lg" style={{ gap: '12px' }} onClick={handleGoogleLogin}>
              <IconGoogle /> Continue with Google
            </button>
          </div>

          <div className="divider" style={{ margin: '2rem 0' }}></div>

          <p style={{ textAlign: 'center', fontSize: '0.875rem', color: '#64748b' }}>
            New to RealtimeDocs?{' '}
            <a href="/register" style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>
              Create an account
            </a>
          </p>

        </div>
      </div>

    </div>
  );
}

export default Login;