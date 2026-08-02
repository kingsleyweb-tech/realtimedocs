import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../firebase/firebase";
import socket from "../socket/socket";
import logoImg from "../assets/docs.jpg";
import DocSidebar from "../components/DocSidebar";
import { IconPlus,IconDoc,IconLogout,IconClock,IconStarFilled,IconStar,IconTrash,IconMenu} from "../components/Icons";

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

function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [docs, setDocs] = useState<SavedDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Auth listener
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
    });
    return () => unsubscribe();
  }, [navigate]);

  // Handle socket data fetching and save-user on load and reconnect
  useEffect(() => {
    if (!user) return;

    const handleConnect = () => {
      socket.emit("save-user", {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
      });
      socket.emit("get-user-documents", user.uid);
    };

    if (socket.connected) {
      handleConnect();
    }

    socket.on("connect", handleConnect);
    return () => {
      socket.off("connect", handleConnect);
    };
  }, [user]);

  // Socket: receive user documents — cache for instant next load
  useEffect(() => {
    const handleDocs = (userDocs: SavedDoc[]) => {
      setDocs(userDocs);
      setLoading(false);
      // Cache with userId key so multiple users on same device are isolated
      const uid = auth.currentUser?.uid;
      if (uid) localStorage.setItem(`user-docs-${uid}`, JSON.stringify(userDocs));
    };
    socket.on("user-documents", handleDocs);
    return () => { socket.off("user-documents", handleDocs); };
  }, []);

  const createDocument = () => {
    const id = Math.random().toString(36).substring(2, 10);
    navigate(`/document/${id}`);
  };

  const openDocument = (docId: string) => {
    navigate(`/document/${docId}`);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  const toggleStar = (e: React.MouseEvent, docId: string) => {
    e.stopPropagation();
    if (user) {
      // Optimistic update — flip star immediately in UI
      setDocs(prev => prev.map(d => d.documentId === docId ? { ...d, isStarred: !d.isStarred } : d));
      socket.emit("toggle-star-document", { documentId: docId, userId: user.uid });
    }
  };

  const moveToTrash = (e: React.MouseEvent, docId: string) => {
    e.stopPropagation();
    if (user) {
      // Optimistic update — remove from list immediately
      setDocs(prev => prev.map(d => d.documentId === docId ? { ...d, isTrashed: true } : d));
      socket.emit("trash-document", { documentId: docId, userId: user.uid });
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const activeDocs = docs.filter((doc) => !doc.isTrashed);

  return (
    <div className="doc-page">
      <header className="doc-toolbar">
        <div className="doc-toolbar-left">
          <button
            className="btn btn-ghost btn-sm mobile-menu-btn"
            onClick={() => setMobileSidebarOpen(true)}
            title="Open menu"
          >
            <IconMenu />
          </button>
          <a href="/" className="doc-toolbar-brand-link">
            <img src={logoImg} alt="RealtimeDocs Logo" className="doc-toolbar-brand-img" />
            <span className="doc-toolbar-brand-name">Realtime<span>Docs</span></span>
          </a>
        </div>

        <div className="doc-toolbar-right">
          {user && (
            <>
              <span className="dashboard-user-name hide-on-mobile">
                {user.displayName || user.email}
              </span>
              {user.photoURL ? (
                <img src={user.photoURL} alt="Profile" className="dashboard-avatar" />
              ) : (
                <div className="dashboard-avatar-fallback">
                  {getInitials(user.displayName || user.email || "U")}
                </div>
              )}
              <button className="btn btn-ghost btn-sm dashboard-logout-btn hide-on-mobile" onClick={handleLogout} title="Sign out">
                <IconLogout /> Sign out
              </button>
            </>
          )}
        </div>
      </header>

      {mobileSidebarOpen && (
        <div className="doc-sidebar-backdrop" onClick={() => setMobileSidebarOpen(false)} />
      )}
      <div className="doc-body">
        <DocSidebar
          currentDocId=""
          savedDocs={activeDocs}
          user={user}
          onLogout={handleLogout}
          onDocsUpdate={setDocs}
          mobileOpen={mobileSidebarOpen}
          onClose={() => setMobileSidebarOpen(false)}
        />

        <main className="dashboard-main" style={{ flex: 1, padding: "2rem", overflowY: "auto" }}>
          <section className="dashboard-section">
            <h2 className="dashboard-section-title">Start a new document</h2>
            <div className="dashboard-new-grid">
              <button
                id="new-doc-card"
                className="dashboard-new-card"
                onClick={createDocument}
                title="Create new document"
              >
                <div className="dashboard-new-card-inner">
                  <div className="dashboard-new-card-icon">
                    <IconPlus size={32} />
                  </div>
                </div>
                <span className="dashboard-new-card-label">Blank document</span>
              </button>
            </div>
          </section>

          <div className="dashboard-divider" />
          <section className="dashboard-section">
            <div className="dashboard-section-header">
              <h2 className="dashboard-section-title">Recent documents</h2>
            </div>

            {loading ? (
              <div className="dashboard-loading">
                <div className="dashboard-spinner" />
                <span>Loading your documents…</span>
              </div>
            ) : activeDocs.length === 0 ? (
              <div className="dashboard-empty">
                <div className="dashboard-empty-icon"><IconDoc size={28} /></div>
                <p className="dashboard-empty-title">No documents yet</p>
                <p className="dashboard-empty-sub">Create your first document to get started.</p>
              </div>
            ) : (
              <div className="dashboard-docs-grid">
                {activeDocs.map((doc) => (
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
                        <div className="dashboard-doc-shared-badge">
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                            <polyline points="16 6 12 2 8 6"/>
                            <line x1="12" y1="2" x2="12" y2="15"/>
                          </svg>
                          Shared
                        </div>
                      )}
                    </div>

                    <div className="dashboard-doc-info">
                      <span className="dashboard-doc-title">
                        {doc.title || "Untitled document"}
                      </span>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px', minWidth: 0, gap: '8px' }}>
                        {doc.isShared ? (
                          <div className="dashboard-doc-shared-meta" style={{ minWidth: 0, flex: 1 }}>
                            <span className="dashboard-doc-owner">
                              by {doc.ownerEmail || 'Unknown'}
                            </span>
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
                            title={doc.isStarred ? "Unstar document" : "Star document"}
                          >
                            {doc.isStarred ? <IconStarFilled size={15} /> : <IconStar size={15} />}
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

export default Dashboard;
