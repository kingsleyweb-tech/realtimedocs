import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import logoImg from "../assets/docs.jpg";
import socket from "../socket/socket";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../firebase/firebase";
import DocSidebar from "../components/DocSidebar";
import { toast } from "../utils/toast";
import { getCaretCoordinates } from "../utils/caretCoordinates";
import {
  IconCopyLink,
  IconSidebar,
  IconStar,
  IconShareUser,
  IconFullscreen,
  IconExitFullscreen,
  IconStarFilled
} from "../components/Icons";

interface SavedDoc {
  documentId: string;
  title: string;
  lastUpdated: string;
  isStarred?: boolean;
  isTrashed?: boolean;
}

function Document() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [content, setContent] = useState("");
  const [title, setTitle] = useState("Untitled document");
  const [editingTitle, setEditingTitle] = useState(false);
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [savedDocs, setSavedDocs] = useState<SavedDoc[]>([]);
  const [activeUsers, setActiveUsers] = useState<any[]>([]);
  const [cursors, setCursors] = useState<Record<string, {
    userId: string;
    userName: string;
    color: string;
    selectionStart: number | null;
  }>>({});
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [userRole, setUserRole] = useState<'editor' | 'viewer'>('viewer');
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [sharingSettings, setSharingSettings] = useState<{
    collaborators: { email: string; role: string }[];
    publicAccess: string;
    ownerEmail: string;
  } | null>(null);
  const [newCollabEmail, setNewCollabEmail] = useState("");
  const [newCollabRole, setNewCollabRole] = useState("editor");
  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [showAllCollabs, setShowAllCollabs] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  // Refs used to access the latest userId/userName inside socket callbacks without stale closures
  const titleRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Listen for browser fullscreen changes (e.g. user presses ESC to exit)
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  const userIdRef = useRef(userId);
  const userNameRef = useRef(userName);
  useEffect(() => { userIdRef.current = userId; }, [userId]);
  useEffect(() => { userNameRef.current = userName; }, [userName]);

  // Keep refs in sync with state so socket callbacks always read the latest values
  const getUserColor = (uid: string) => {
    const COLORS = ["#ea4335", "#4285f4", "#fbbc05", "#34a853", "#ab47bc"];
    let hash = 0;
    for (let i = 0; i < uid.length; i++) {
      hash = uid.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % COLORS.length;
    return COLORS[index];
  };

  // Detect mobile on resize
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // ── Auth guard: save user to MongoDB via socket, redirect to login if not signed in ──
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUserName(currentUser.displayName || currentUser.email || "User");
        setUserId(currentUser.uid);
        setUser(currentUser);
        socket.emit("save-user", {
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName,
          photoURL: currentUser.photoURL,
        });

        // Load cached doc list into sidebar instantly
        const cached = localStorage.getItem(`user-docs-${currentUser.uid}`);
        if (cached) {
          try { setSavedDocs(JSON.parse(cached)); } catch {}
        }
      } else {
        // Not signed in — send them to login, preserving the document URL
        navigate(`/login?redirect=/document/${id}`, { replace: true });
      }
      setAuthChecked(true);
    });
    return () => unsubscribe();
  }, [id, navigate]);

  // ── Socket listeners ──
  useEffect(() => {
    if (!id) return;
    localStorage.setItem("lastDocId", id);

    socket.on("load-document", (data: { content: string; title: string; role?: 'editor' | 'viewer' }) => {
      setContent(data.content || "");
      setTitle(data.title || "Untitled document");
      if (data.role) setUserRole(data.role);
    });

    socket.on("access-denied", (message: string) => {
      toast.error(message || "You do not have access to this document.");
      navigate("/dashboard", { replace: true });
    });

    socket.on("sharing-settings", (settings: any) => {
      if (!settings.error) {
        setSharingSettings(settings);
      }
    });

    socket.on("sharing-updated", ({ collaborators, publicAccess }: any) => {
      setSharingSettings(prev => prev ? { ...prev, collaborators, publicAccess } : null);
      // Re-assess the current user's role after settings change
      socket.emit("join-document", { documentId: id, userId: userIdRef.current });
    });

    socket.on("document-update", (newContent: string) => {
      setContent(newContent);
    });

    socket.on("document-renamed", (newTitle: string) => {
      setTitle(newTitle);
    });

    socket.on("user-documents", (docs: SavedDoc[]) => {
      setSavedDocs(docs);
      // Cache for instant load next time
      const uid = auth.currentUser?.uid;
      if (uid) localStorage.setItem(`user-docs-${uid}`, JSON.stringify(docs));
    });

    socket.on("presence-update", (users: any[]) => {
      // Deduplicate active users by userId to handle multiple open tabs gracefully
      const uniqueUsers: any[] = [];
      const seen = new Set();
      for (const u of users) {
        if (!seen.has(u.userId)) {
          seen.add(u.userId);
          uniqueUsers.push(u);
        }
      }
      setActiveUsers(uniqueUsers);
    });

    socket.on("cursor-update", ({ userId: senderId, userName: senderName, selectionStart }) => {
      if (senderId === userIdRef.current) return;
      setCursors((prev) => ({
        ...prev,
        [senderId]: {
          userId: senderId,
          userName: senderName || "Anonymous",
          color: getUserColor(senderId),
          selectionStart
        }
      }));
    });

    return () => {
      socket.emit("leave-document", { documentId: id });
      socket.off("load-document");
      socket.off("document-update");
      socket.off("document-renamed");
      socket.off("user-documents");
      socket.off("presence-update");
      socket.off("cursor-update");
      socket.off("access-denied");
      socket.off("sharing-settings");
      socket.off("sharing-updated");
    };
  }, [id]);

  // ── Join the document room once both document ID and userId are known ──
  useEffect(() => {
    if (!id || !userId) return;
    socket.emit("join-document", { documentId: id, userId });
  }, [id, userId]);

  // ── Fetch user's document list and sharing settings via Socket whenever userId is ready ──
  useEffect(() => {
    if (userId) {
      socket.emit("get-user-documents", userId);
      if (id) socket.emit("get-sharing-settings", { documentId: id, userId });
    }
  }, [userId, id]);

  // ── Handlers ──
  // Broadcast content changes to all collaborators via Socket in real time
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setContent(value);
    socket.emit("document-change", { id, data: value });

    // Sync cursor position immediately as we type
    if (id && userId) {
      socket.emit("cursor-move", {
        documentId: id,
        userId,
        userName,
        selectionStart: e.target.selectionStart
      });
    }
  };

  // Emit cursor position to other collaborators when clicking or arrow-keying
  const handleCursorMove = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    if (!id || !userId) return;
    socket.emit("cursor-move", {
      documentId: id,
      userId,
      userName,
      selectionStart: e.currentTarget.selectionStart
    });
  };

  // Remove this user's cursor from others' screens when they leave the textarea
  const handleCursorBlur = () => {
    if (!id || !userId) return;
    socket.emit("cursor-move", {
      documentId: id,
      userId,
      userName,
      selectionStart: null
    });
  };

  // Track scroll position so remote cursors stay aligned with the textarea
  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
    setScrollLeft(e.currentTarget.scrollLeft);
  };

  // Manually save the document — emits the latest content via Socket
  const handleSave = () => {
    socket.emit("document-change", { id, data: content });
    toast.success("Document saved successfully!");
  };

  // Toggle the sidebar open/closed, handling both desktop and mobile states
  const handleSidebarToggle = useCallback(() => {
    if (isMobile) {
      setMobileSidebarOpen(o => !o);
    } else {
      setSidebarOpen(o => !o);
    }
  }, [isMobile]);

  const closeMobileSidebar = () => setMobileSidebarOpen(false);

  // Sign the user out and redirect to the login page
  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  // Save the document title via Socket when the user finishes editing it
  const handleTitleSave = () => {
    setEditingTitle(false);
    if (title.trim()) {
      socket.emit("rename-document", { id, title: title.trim(), userId });
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleTitleSave();
    if (e.key === "Escape") setEditingTitle(false);
  };

  const isCurrentStarred = savedDocs.find(d => d.documentId === id)?.isStarred || false;

  // Emit a socket event to toggle the star status of this document in MongoDB
  const toggleStar = () => {
    if (user && id) {
      socket.emit("toggle-star-document", { documentId: id, userId: user.uid });
    }
  };

  // Toggle fullscreen mode for the document editor page
  const toggleFullscreen = () => {
    const docPage = document.querySelector(".doc-page") as HTMLElement;
    if (!docPage) return;
    if (!document.fullscreenElement) {
      docPage.requestFullscreen().catch(err => {
        console.error("Failed to enter fullscreen mode", err);
      });
    } else {
      document.exitFullscreen().catch(err => {
        console.error("Failed to exit fullscreen mode", err);
      });
    }
  };

  if (!authChecked || !userId) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", gap: "0.75rem", color: "var(--gray-500)" }}>
        <div className="dashboard-spinner" />
        <span>Verifying access...</span>
      </div>
    );
  }

  return (
    <div className="doc-page">

      {/* ── Toolbar ── */}
      <header className="doc-toolbar">
        <div className="doc-toolbar-left">
          <button
            className="btn btn-ghost btn-sm"
            title="Toggle sidebar"
            onClick={handleSidebarToggle}
            style={{ color: 'var(--gray-600)', padding: '6px' }}
          >
            <IconSidebar />
          </button>

          {/* Brand */}
          <a href="/" className="doc-toolbar-brand-link" title="Home">
            <img src={logoImg} alt="RealtimeDocs" className="doc-toolbar-brand-img" />
            <span className="doc-toolbar-brand-name">Realtime<span>Docs</span></span>
          </a>

          <div className="doc-toolbar-sep" />

          {/* Document Title + Star */}
          <div className="doc-toolbar-title-wrap">
            {editingTitle ? (
              <input
                ref={titleRef}
                className="doc-title-input"
                value={title}
                autoFocus
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={handleTitleKeyDown}
              />
            ) : (
              <span
                className="doc-title-editable"
                title="Click to rename"
                onClick={() => {
                  setEditingTitle(true);
                  setTimeout(() => titleRef.current?.select(), 50);
                }}
              >
                {title}
              </span>
            )}
            <button className="doc-title-star-btn" onClick={toggleStar} title={isCurrentStarred ? "Unstar document" : "Star document"}>
              {isCurrentStarred ? <IconStarFilled /> : <IconStar />}
            </button>
          </div>
        </div>

        <div className="doc-toolbar-right">
          {/* Visual Presence Avatars */}
          <div className="presence-group" style={{ display: 'flex', alignItems: 'center', marginRight: '4px' }}>
            {activeUsers.slice(0, 3).map((u, index) => {
              const initials = u.displayName
                ? u.displayName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
                : "U";
              return (
                <div
                  key={u.userId}
                  className="presence-avatar-container"
                  style={{ marginLeft: index === 0 ? "0" : "-8px", zIndex: 10 - index, position: "relative" }}
                >
                  {u.photoURL ? (
                    <img src={u.photoURL} alt={u.displayName} className="presence-avatar" title={u.displayName} />
                  ) : (
                    <div
                      className={`presence-avatar presence-avatar-fallback presence-color-${(u.displayName.charCodeAt(0) || 0) % 5}`}
                      title={u.displayName}
                    >
                      {initials}
                    </div>
                  )}
                </div>
              );
            })}
            {activeUsers.length > 3 && (
              <div className="presence-avatar-container" style={{ marginLeft: "-8px", zIndex: 0 }}>
                <div
                  className="presence-avatar presence-avatar-more"
                  title={activeUsers.slice(3).map((u) => u.displayName).join(", ")}
                >
                  +{activeUsers.length - 3}
                </div>
              </div>
            )}
          </div>

          {userRole === 'editor' && (
            <button
              id="share-btn"
              className="btn btn-blue btn-sm"
              onClick={() => {
                setIsShareModalOpen(true);
                socket.emit("get-sharing-settings", { documentId: id, userId });
              }}
            >
              <IconShareUser /> Share
            </button>
          )}

          <button
            className="btn btn-ghost btn-sm"
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit Full Screen" : "Full Screen"}
            style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            {isFullscreen ? <IconExitFullscreen /> : <IconFullscreen />}
            {isFullscreen ? "Exit" : "Full Screen"}
          </button>


          <button
            id="logout-btn"
            className="btn btn-ghost btn-sm"
            style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
            onClick={handleLogout}
            title="Logout"
          >
            Logout
          </button>
        </div>
      </header>

      {/* ── Body: Sidebar + Editor ── */}
      <div className="doc-body">

        {/* Mobile backdrop — shown when sidebar is open on mobile */}
        {isMobile && mobileSidebarOpen && (
          <div className="doc-sidebar-backdrop" onClick={closeMobileSidebar} />
        )}

        {/* Sidebar: desktop = show/hide column; mobile = slide-in overlay */}
        {isMobile ? (
          <DocSidebar
            currentDocId={id}
            savedDocs={savedDocs}
            onClose={closeMobileSidebar}
            mobileOpen={mobileSidebarOpen}
            user={user}
            onLogout={handleLogout}
            onDocsUpdate={setSavedDocs}
          />
        ) : (
          sidebarOpen && <DocSidebar currentDocId={id} savedDocs={savedDocs} user={user} onLogout={handleLogout} onDocsUpdate={setSavedDocs} />
        )}

        <main className="doc-main">

          {/* Read-Only Warning Banner */}
          {userRole === 'viewer' && (
            <div className="readonly-banner">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              You are viewing this document in <strong>read-only</strong> mode. Contact the owner to request edit access.
            </div>
          )}

          <div className="doc-editor-card">
            <div className="doc-editor-topbar">
              <span className="doc-editor-dot doc-editor-dot-red"></span>
              <span className="doc-editor-dot doc-editor-dot-yellow"></span>
              <span className="doc-editor-dot doc-editor-dot-green"></span>
            </div>

            <textarea
              ref={textareaRef}
              id="doc-textarea"
              className={`doc-textarea${userRole === 'viewer' ? ' doc-textarea-readonly' : ''}`}
              value={content}
              onChange={handleChange}
              onScroll={handleScroll}
              onKeyUp={handleCursorMove}
              onClick={handleCursorMove}
              onFocus={handleCursorMove}
              onBlur={handleCursorBlur}
              readOnly={userRole === 'viewer'}
              placeholder={userRole === 'viewer' ? 'Read-only mode — you cannot edit this document.' : 'Start typing your document here...'}
            />

            {/* Remote Collaborative Cursors */}
            {(() => {
              const textarea = textareaRef.current;
              if (!textarea) return null;
              return Object.values(cursors).map((c) => {
                if (c.selectionStart === null || c.userId === userId) return null;

                let coords;
                try {
                  coords = getCaretCoordinates(textarea, c.selectionStart);
                } catch (err) {
                  return null;
                }

                // Adjust positioning based on current textarea scroll offset
                const top = coords.top - scrollTop;
                const left = coords.left - scrollLeft;

                // Hide cursor if scrolled outside the visible container client area
                const textareaHeight = textarea.clientHeight;
                const textareaWidth = textarea.clientWidth;
                if (top < 0 || top > textareaHeight || left < 0 || left > textareaWidth) {
                  return null;
                }

                const absoluteTop = top + textarea.offsetTop;
                const absoluteLeft = left + textarea.offsetLeft;

                return (
                  <div
                    key={c.userId}
                    className="remote-cursor"
                    style={{
                      position: "absolute",
                      top: `${absoluteTop}px`,
                      left: `${absoluteLeft}px`,
                      height: `${coords.height}px`,
                      borderColor: c.color,
                      zIndex: 20
                    }}
                  >
                    <div
                      className="remote-cursor-label"
                      style={{ backgroundColor: c.color }}
                    >
                      {c.userName}
                    </div>
                  </div>
                );
              });
            })()}
          </div>

          {userRole === 'editor' && (
            <div style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', width: '100%' }}>
              {/* Live word / character counter */}
              <div className="doc-counter-pill">
                <span>
                  <strong>{content.trim() === '' ? 0 : content.trim().split(/\s+/).length}</strong>
                  {' '}words
                </span>
                <span className="doc-counter-sep">·</span>
                <span>
                  <strong>{content.length}</strong>
                  {' '}chars
                </span>
              </div>

              <button className="btn btn-blue btn-sm" onClick={handleSave}>
                Save
              </button>
            </div>
          )}
        </main>

        {/* ── Right Panel: Collaborators & Online Users ── */}
        <aside className="doc-right-panel">

          {/* Collaborators */}
          <div className="doc-rp-section">
            <h3 className="doc-rp-section-title">Collaborators</h3>
            <div className="doc-rp-person-list">
              {/* Owner row */}
              {sharingSettings && (
                <div className="doc-rp-person-row">
                  <div className={`doc-rp-avatar doc-rp-avatar-color-${(sharingSettings.ownerEmail?.charCodeAt(0) || 0) % 5}`}>
                    {(sharingSettings.ownerEmail?.[0] || 'O').toUpperCase()}
                  </div>
                  <div className="doc-rp-person-info">
                    <span className="doc-rp-person-name">
                      {sharingSettings.ownerEmail === user?.email
                        ? `${user?.displayName?.split(' ')[0] || 'You'} (You)`
                        : (sharingSettings.ownerEmail?.split('@')[0] || 'Owner')}
                    </span>
                  </div>
                  <span className="doc-rp-role doc-rp-role-owner">Owner</span>
                </div>
              )}
              {/* Collaborators */}
              {sharingSettings && sharingSettings.collaborators
                .slice(0, showAllCollabs ? undefined : 3)
                .map(c => (
                  <div key={c.email} className="doc-rp-person-row">
                    <div className={`doc-rp-avatar doc-rp-avatar-color-${(c.email.charCodeAt(0) || 0) % 5}`}>
                      {c.email[0].toUpperCase()}
                    </div>
                    <div className="doc-rp-person-info">
                      <span className="doc-rp-person-name">{c.email.split('@')[0]}</span>
                    </div>
                    <span className={`doc-rp-role doc-rp-role-${c.role}`}>
                      {c.role === 'editor' ? 'Editor' : 'Viewer'}
                    </span>
                  </div>
                ))
              }
              {/* +N more */}
              {sharingSettings && sharingSettings.collaborators.length > 3 && (
                <button className="doc-rp-more-btn" onClick={() => setShowAllCollabs(v => !v)}>
                  {showAllCollabs ? 'Show less ▲' : `+${sharingSettings.collaborators.length - 3} more ▾`}
                </button>
              )}
              {!sharingSettings && (
                <p className="doc-rp-empty">Loading…</p>
              )}
            </div>
          </div>

          {/* Online Users */}
          <div className="doc-rp-section">
            <h3 className="doc-rp-section-title">Online Users</h3>
            <div className="doc-rp-person-list">
              {activeUsers.length === 0 ? (
                <p className="doc-rp-empty">No active users.</p>
              ) : (
                activeUsers.map(u => (
                  <div key={u.userId} className="doc-rp-person-row">
                    {u.photoURL ? (
                      <img src={u.photoURL} alt="" className="doc-rp-avatar-img" />
                    ) : (
                      <div className={`doc-rp-avatar doc-rp-avatar-color-${(u.displayName?.charCodeAt(0) || 0) % 5}`}>
                        {(u.displayName?.[0] || 'U').toUpperCase()}
                      </div>
                    )}
                    <div className="doc-rp-person-info">
                      <span className="doc-rp-person-name">
                        {u.userId === userId
                          ? `${u.displayName?.split(' ')[0] || 'You'}`
                          : (u.displayName || 'Unknown')}
                      </span>
                    </div>
                    <span className="doc-rp-online-dot" />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Document Link */}
          <div className="doc-rp-section">
            <h3 className="doc-rp-section-title">Document Link</h3>
            <p className="doc-rp-link-desc">
              {sharingSettings?.publicAccess === 'restricted'
                ? 'Only invited people can access'
                : 'Anyone with the link can view'}
            </p>
            <div className="doc-rp-link-row">
              <span className="doc-rp-link-url">{window.location.href}</span>
              <button
                className="doc-rp-link-copy-btn"
                onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success("Link copied!"); }}
                title="Copy link"
              >
                <IconCopyLink />
              </button>
            </div>
          </div>

        </aside>

      </div>

      {/* ── Share Modal ── */}
      {isShareModalOpen && (
        <div className="share-modal-overlay" onClick={() => setIsShareModalOpen(false)}>
          <div className="share-modal" onClick={e => e.stopPropagation()}>
            <div className="share-modal-header">
              <h3 className="share-modal-title">Share document</h3>
              <button className="share-modal-close" onClick={() => setIsShareModalOpen(false)}>✕</button>
            </div>

            {/* Add collaborator form */}
            <div className="share-modal-section">
              <label className="share-modal-label">Invite people</label>
              <div className="share-invite-row">
                <input
                  type="email"
                  className="form-input share-email-input"
                  placeholder="Enter email address"
                  value={newCollabEmail}
                  onChange={e => setNewCollabEmail(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (!newCollabEmail.trim()) return;
                      const updated = [
                        ...(sharingSettings?.collaborators || []).filter(c => c.email !== newCollabEmail.trim()),
                        { email: newCollabEmail.trim(), role: newCollabRole }
                      ];
                      const newSettings = { collaborators: updated, publicAccess: sharingSettings?.publicAccess || 'restricted' };
                      setSharingSettings(prev => ({ ...prev!, ...newSettings }));
                      socket.emit('update-sharing-settings', { documentId: id, userId, ...newSettings });
                      setNewCollabEmail("");
                    }
                  }}
                />
                <select
                  className="share-role-select"
                  value={newCollabRole}
                  onChange={e => setNewCollabRole(e.target.value)}
                >
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                </select>
                <button
                  className="btn btn-blue btn-sm"
                  onClick={() => {
                    if (!newCollabEmail.trim()) return;
                    const updated = [
                      ...(sharingSettings?.collaborators || []).filter(c => c.email !== newCollabEmail.trim()),
                      { email: newCollabEmail.trim(), role: newCollabRole }
                    ];
                    const newSettings = { collaborators: updated, publicAccess: sharingSettings?.publicAccess || 'restricted' };
                    setSharingSettings(prev => ({ ...prev!, ...newSettings }));
                    socket.emit('update-sharing-settings', { documentId: id, userId, ...newSettings });
                    setNewCollabEmail("");
                    toast.success(`${newCollabEmail} added as ${newCollabRole}`);
                  }}
                >
                  Invite
                </button>
              </div>
            </div>

            {/* Current collaborators list */}
            {sharingSettings && (
              <div className="share-modal-section">
                <label className="share-modal-label">People with access</label>
                <div className="share-people-list">
                  {/* Owner row */}
                  <div className="share-person-row">
                    <div className="share-person-info">
                      <div className="share-person-avatar">{(sharingSettings.ownerEmail?.[0] || 'O').toUpperCase()}</div>
                      <div>
                        <div className="share-person-email">{sharingSettings.ownerEmail || 'Owner'}</div>
                        <div className="share-person-badge">Owner</div>
                      </div>
                    </div>
                  </div>

                  {sharingSettings.collaborators.map(c => (
                    <div key={c.email} className="share-person-row">
                      <div className="share-person-info">
                        <div className="share-person-avatar">{c.email[0].toUpperCase()}</div>
                        <div className="share-person-email">{c.email}</div>
                      </div>
                      <div className="share-person-actions">
                        <select
                          className="share-role-select share-role-select-sm"
                          value={c.role}
                          onChange={e => {
                            const updated = sharingSettings.collaborators.map(x =>
                              x.email === c.email ? { ...x, role: e.target.value } : x
                            );
                            const newSettings = { collaborators: updated, publicAccess: sharingSettings.publicAccess };
                            setSharingSettings(prev => ({ ...prev!, ...newSettings }));
                            socket.emit('update-sharing-settings', { documentId: id, userId, ...newSettings });
                          }}
                        >
                          <option value="editor">Editor</option>
                          <option value="viewer">Viewer</option>
                        </select>
                        <button
                          className="share-remove-btn"
                          title="Remove"
                          onClick={() => {
                            const updated = sharingSettings.collaborators.filter(x => x.email !== c.email);
                            const newSettings = { collaborators: updated, publicAccess: sharingSettings.publicAccess };
                            setSharingSettings(prev => ({ ...prev!, ...newSettings }));
                            socket.emit('update-sharing-settings', { documentId: id, userId, ...newSettings });
                            toast.success(`${c.email} removed.`);
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* General access */}
            {sharingSettings && (
              <div className="share-modal-section">
                <label className="share-modal-label">General access</label>
                <div className="share-general-row" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div className="share-general-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '50%', background: 'var(--gray-100)', color: 'var(--gray-600)' }}>
                    {sharingSettings.publicAccess === 'restricted' ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="2" y1="12" x2="22" y2="12"/>
                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                      </svg>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <select
                      className="share-role-select"
                      style={{ width: '100%' }}
                      value={sharingSettings.publicAccess}
                      onChange={e => {
                        const newSettings = { collaborators: sharingSettings.collaborators, publicAccess: e.target.value };
                        setSharingSettings(prev => ({ ...prev!, publicAccess: e.target.value }));
                        socket.emit('update-sharing-settings', { documentId: id, userId, ...newSettings });
                      }}
                    >
                      <option value="restricted">Restricted — only invited people can access</option>
                      <option value="viewer">Anyone with the link can view</option>
                      <option value="editor">Anyone with the link can edit</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            <div className="share-modal-footer">
              <button className="btn btn-ghost btn-sm" onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                toast.success("Document link copied!");
              }}>
                <IconCopyLink /> Copy link
              </button>
              <button className="btn btn-blue btn-sm" onClick={() => setIsShareModalOpen(false)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Document;