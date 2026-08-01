import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../firebase/firebase";
import socket from "../socket/socket";
import logoImg from "../assets/docs.jpg";
import DocSidebar from "../components/DocSidebar";

import {
  IconDoc,
  IconLogout,
  IconClock,
  IconRestore,
  IconDeletePermanent
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

function Trash() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [docs, setDocs] = useState<SavedDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDocId, setConfirmDocId] = useState<string | null>(null);

  // Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        navigate("/login");
        return;
      }
      setUser(currentUser);
      socket.emit("get-user-documents", currentUser.uid);
    });
    return () => unsubscribe();
  }, [navigate]);

  // Socket listener
  useEffect(() => {
    const handleDocs = (userDocs: SavedDoc[]) => {
      setDocs(userDocs);
      setLoading(false);
    };
    socket.on("user-documents", handleDocs);
    return () => { socket.off("user-documents", handleDocs); };
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  const restoreDoc = (e: React.MouseEvent, docId: string) => {
    e.stopPropagation();
    if (user) {
      socket.emit("restore-document", { documentId: docId, userId: user.uid });
    }
  };

  const deletePermanent = (e: React.MouseEvent, docId: string) => {
    e.stopPropagation();
    setConfirmDocId(docId);
  };

  const confirmDelete = () => {
    if (user && confirmDocId) {
      socket.emit("delete-document-permanent", { documentId: confirmDocId, userId: user.uid });
    }
    setConfirmDocId(null);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const getInitials = (name: string) => {
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  // Trashed docs & Active docs (activeDocs is for Sidebar listing recent non-trashed docs)
  const trashedDocs = docs.filter((doc) => doc.isTrashed);
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
        <DocSidebar currentDocId="" savedDocs={activeDocs} user={user} onLogout={handleLogout} />

        <main className="dashboard-main" style={{ flex: 1, padding: "2rem", overflowY: "auto" }}>
          <section className="dashboard-section">
            <div className="dashboard-section-header">
              <h2 className="dashboard-section-title">Trash Bin</h2>
            </div>

            {loading ? (
              <div className="dashboard-loading">
                <div className="dashboard-spinner" />
                <span>Loading your documents…</span>
              </div>
            ) : trashedDocs.length === 0 ? (
              <div className="dashboard-empty">
                <div className="dashboard-empty-icon" style={{ opacity: 0.6 }}>
                  <IconDeletePermanent size={28} />
                </div>
                <p className="dashboard-empty-title">Trash is empty</p>
                <p className="dashboard-empty-sub">Documents you delete will show up here.</p>
              </div>
            ) : (
              <div className="dashboard-docs-grid">
                {trashedDocs.map((doc) => (
                  <div
                    key={doc.documentId}
                    className={`dashboard-doc-card${doc.isShared ? ' dashboard-doc-card-shared' : ''}`}
                    title="Trash item (cannot open directly, restore first)"
                    style={{ position: 'relative', cursor: 'default' }}
                  >
                    <div className="dashboard-doc-thumb" style={{ opacity: 0.75 }}>
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
                      <span className="dashboard-doc-title" style={{ opacity: 0.8 }}>
                        {doc.title || "Untitled document"}
                      </span>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                        <span className="dashboard-doc-date" style={{ margin: 0 }}>
                          <IconClock /> {formatDate(doc.lastUpdated)}
                        </span>

                        <div className="dashboard-card-actions" style={{ display: 'flex', gap: '4px' }}>
                          <button
                            className="dashboard-action-btn"
                            onClick={(e) => restoreDoc(e, doc.documentId)}
                            title="Restore Document"
                            style={{ color: "#3b82f6" }}
                          >
                            <IconRestore />
                          </button>
                          <button
                            className="dashboard-action-btn delete-btn"
                            onClick={(e) => deletePermanent(e, doc.documentId)}
                            title="Delete Permanently"
                          >
                            <IconDeletePermanent />
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

      {/* ── Permanent Delete Confirm Modal ── */}
      {confirmDocId && (
        <div className="trash-confirm-overlay" onClick={() => setConfirmDocId(null)}>
          <div className="trash-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="trash-confirm-icon">
              <IconDeletePermanent />
            </div>
            <h3 className="trash-confirm-title">Delete permanently?</h3>
            <p className="trash-confirm-body">
              This document will be gone forever. This action cannot be undone.
            </p>
            <div className="trash-confirm-actions">
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setConfirmDocId(null)}
              >
                Cancel
              </button>
              <button
                className="btn btn-sm"
                style={{ background: 'var(--danger)', color: '#fff', border: 'none' }}
                onClick={confirmDelete}
              >
                Delete forever
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Trash;
