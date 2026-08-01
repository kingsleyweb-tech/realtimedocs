import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../firebase/firebase";
import socket from "../socket/socket";
import logoImg from "../assets/docs.jpg";
import DocSidebar from "../components/DocSidebar";

import {
  IconLogout,
  IconClock,
  IconStarFilled,
  IconTrash
} from "../components/Icons";

interface SavedDoc {
  documentId: string;
  title: string;
  lastUpdated: string;
  isShared?: boolean;
  role?: string;
  ownerEmail?: string;
  isStarred?: boolean;
  isTrashed?: boolean;
}

function Starred() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [docs, setDocs] = useState<SavedDoc[]>([]);
  const [loading, setLoading] = useState(true);

  // Auth state listener — redirects to login if user is not signed in
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        navigate("/login");
        return;
      }
      setUser(currentUser);

      // Load cached docs instantly while waiting for server
      const cached = localStorage.getItem(`user-docs-${currentUser.uid}`);
      if (cached) {
        try {
          setDocs(JSON.parse(cached));
          setLoading(false);
        } catch {}
      }

      socket.emit("get-user-documents", currentUser.uid);
    });
    return () => unsubscribe();
  }, [navigate]);

  // Socket listener — receives the user's document list from the server
  useEffect(() => {
    const handleDocs = (userDocs: SavedDoc[]) => {
      setDocs(userDocs);
      setLoading(false);
      const uid = auth.currentUser?.uid;
      if (uid) localStorage.setItem(`user-docs-${uid}`, JSON.stringify(userDocs));
    };
    socket.on("user-documents", handleDocs);
    return () => { socket.off("user-documents", handleDocs); };
  }, []);

  // Navigate to the selected document's editor page
  const openDocument = (docId: string) => {
    navigate(`/document/${docId}`);
  };

  // Sign the user out of Firebase and redirect to the login page
  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  // Emit a socket event to toggle star status for a document in MongoDB
  const toggleStar = (e: React.MouseEvent, docId: string) => {
    e.stopPropagation();
    if (user) {
      // Optimistic update — flip star immediately in UI
      setDocs(prev => prev.map(d => d.documentId === docId ? { ...d, isStarred: !d.isStarred } : d));
      socket.emit("toggle-star-document", { documentId: docId, userId: user.uid });
    }
  };

  // Emit a socket event to move a document to the trash in MongoDB
  const moveToTrash = (e: React.MouseEvent, docId: string) => {
    e.stopPropagation();
    if (user) {
      // Optimistic update — remove from starred view immediately
      setDocs(prev => prev.map(d => d.documentId === docId ? { ...d, isTrashed: true } : d));
      socket.emit("trash-document", { documentId: docId, userId: user.uid });
    }
  };

  // Format an ISO date string into a readable format (e.g. "Aug 1, 2026")
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  // Extract up to 2 initials from a name for the avatar fallback
  const getInitials = (name: string) => {
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  // Filter: only show starred documents that are not in the trash
  const starredDocs = docs.filter((doc) => doc.isStarred && !doc.isTrashed);
  const activeDocs = docs.filter((doc) => !doc.isTrashed);

  return (
    <div className="doc-page">

      {/* ── Top Navbar ── */}
      <header className="doc-toolbar">
        <div className="doc-toolbar-left">
          <a href="/" className="doc-toolbar-brand-link">
            <img src={logoImg} alt="RealtimeDocs Logo" className="doc-toolbar-brand-img" />
            <span className="doc-toolbar-brand-name">Realtime<span>Docs</span></span>
          </a>
        </div>

        <div className="doc-toolbar-right">
          {user && (
            <>
              <span className="dashboard-user-name">
                {user.displayName || user.email}
              </span>
              {user.photoURL ? (
                <img src={user.photoURL} alt="Profile" className="dashboard-avatar" />
              ) : (
                <div className="dashboard-avatar-fallback">
                  {getInitials(user.displayName || user.email || "U")}
                </div>
              )}
              <button className="btn btn-ghost btn-sm dashboard-logout-btn" onClick={handleLogout} title="Sign out">
                <IconLogout /> Sign out
              </button>
            </>
          )}
        </div>
      </header>

      {/* ── Body: Sidebar + Main Content ── */}
      <div className="doc-body">
        <DocSidebar currentDocId="" savedDocs={activeDocs} user={user} onLogout={handleLogout} onDocsUpdate={setDocs} />

        <main className="dashboard-main" style={{ flex: 1, padding: "2rem", overflowY: "auto" }}>
          <section className="dashboard-section">
            <div className="dashboard-section-header">
              <h2 className="dashboard-section-title">Starred Documents</h2>
            </div>

            {loading ? (
              <div className="dashboard-loading">
                <div className="dashboard-spinner" />
                <span>Loading your documents…</span>
              </div>
            ) : starredDocs.length === 0 ? (
              <div className="dashboard-empty">
                <div className="dashboard-empty-icon" style={{ color: "#fbbc05" }}>
                  <IconStarFilled size={28} />
                </div>
                <p className="dashboard-empty-title">No starred documents</p>
                <p className="dashboard-empty-sub">Star your important documents to see them here.</p>
              </div>
            ) : (
              <div className="dashboard-docs-grid">
                {starredDocs.map((doc) => (
                  <div
                    key={doc.documentId}
                    className={`dashboard-doc-card${doc.isShared ? ' dashboard-doc-card-shared' : ''}`}
                    onClick={() => openDocument(doc.documentId)}
                    title={doc.title || "Untitled document"}
                    style={{ position: 'relative' }}
                  >
                    <div className="dashboard-doc-thumb">
                      <div className="dashboard-doc-thumb-lines">
                        <div className="thumb-line thumb-line-title" />
                        <div className="thumb-line" />
                        <div className="thumb-line thumb-line-short" />
                        <div className="thumb-line" />
                        <div className="thumb-line thumb-line-medium" />
                        <div className="thumb-line thumb-line-short" />
                        <div className="thumb-line" />
                        <div className="thumb-line thumb-line-medium" />
                      </div>
                      {doc.isShared && (
                        <div className="dashboard-doc-shared-badge">Shared</div>
                      )}
                    </div>

                    <div className="dashboard-doc-info">
                      <span className="dashboard-doc-title">
                        {doc.title || "Untitled document"}
                      </span>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px', minWidth: 0, gap: '8px' }}>
                        {doc.isShared ? (
                          <div className="dashboard-doc-shared-meta" style={{ minWidth: 0, flex: 1 }}>
                            <span className="dashboard-doc-owner">by {doc.ownerEmail || 'Unknown'}</span>
                          </div>
                        ) : (
                          <span className="dashboard-doc-date" style={{ margin: 0, minWidth: 0, flex: 1 }}>
                            <IconClock /> {formatDate(doc.lastUpdated)}
                          </span>
                        )}

                        <div className="dashboard-card-actions" style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                          <button
                            className="dashboard-action-btn"
                            onClick={(e) => toggleStar(e, doc.documentId)}
                            title="Unstar document"
                          >
                            <IconStarFilled size={15} />
                          </button>
                          <button
                            className="dashboard-action-btn delete-btn"
                            onClick={(e) => moveToTrash(e, doc.documentId)}
                            title="Move to Trash"
                          >
                            <IconTrash />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

export default Starred;
