import { useNavigate, useSearchParams } from "react-router-dom";
import logoImg from "../assets/docs.jpg";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider, setSessionPersistence } from "../firebase/firebase";
import socket from "../socket/socket";
import { toast } from "../utils/toast"
import {IconRocket,IconSharedWith as IconUsers,IconSave,IconArrowLeft,IconGoogle} from "../components/Icons";

function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const handleGoogleSignUp = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    try {
      await setSessionPersistence();
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
      console.error("Google sign up failed", err);
      toast.error(`Signup error (${err.code || "unknown"}): ${err.message || "Please check your Firebase configuration."}`);
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
            Join thousands<br />of collaborators.
          </h2>
          <p className="auth-panel-desc">
            Create your free account today and start building documents with your team in seconds.
          </p>

          <div className="auth-feature-list">
            <div className="auth-feature-item">
              <div className="auth-feature-icon"><IconRocket /></div>
              <div className="auth-feature-text">
                <h4>Get started instantly</h4>
                <p>No credit card required. Create and share your first doc in minutes.</p>
              </div>
            </div>
            <div className="auth-feature-item">
              <div className="auth-feature-icon"><IconUsers /></div>
              <div className="auth-feature-text">
                <h4>Collaborate with anyone</h4>
                <p>Invite teammates via a link — they don't even need an account.</p>
              </div>
            </div>
            <div className="auth-feature-item">
              <div className="auth-feature-icon"><IconSave /></div>
              <div className="auth-feature-text">
                <h4>Auto-saved, always</h4>
                <p>Your work is saved in real time — never lose a single word.</p>
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
        <div className="auth-right-inner animate-fade-in-up">

          <a href="/login" className="auth-back-link">
            <IconArrowLeft /> Back to Login
          </a>

          <h1 className="auth-form-title">Create account</h1>
          <p className="auth-form-subtitle">Join RealtimeDocs and start collaborating today</p>

          <div style={{ marginTop: '2rem' }}>
            <button id="register-google-btn" type="button" className="btn btn-google btn-full btn-lg" style={{ gap: '12px' }} onClick={handleGoogleSignUp}>
              <IconGoogle /> Sign up with Google
            </button>
          </div>

          <div className="divider" style={{ margin: '2rem 0' }}>or</div>

          <p style={{ textAlign: 'center', fontSize: '0.875rem', color: '#64748b' }}>
            Already have an account?{' '}
            <a href="/login" style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>
              Sign in
            </a>
          </p>

        </div>
      </div>

    </div>
  );
}

export default Register;