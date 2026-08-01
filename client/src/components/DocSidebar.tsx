import { useNavigate } from "react-router-dom";
import socket from "../socket/socket";
import { 
  IconPlus, 
  IconDoc, 
  IconSharedWith, 
  IconStar, 
  IconTrash, 
  IconStarFilled, 
  IconLogout 
} from "./Icons";

// Shape of a single saved document shown in the sidebar list
interface SavedDoc {
  documentId: string;
  title: string;
  lastUpdated: string;
  isStarred?: boolean;
  isTrashed?: boolean;
}

// Props accepted by the DocSidebar component
interface DocSidebarProps {
  currentDocId?: string;
  savedDocs: SavedDoc[];
  onClose?: () => void;
  mobileOpen?: boolean;
  user?: any;
  onLogout?: () => void;
  onDocsUpdate?: (updater: (prev: SavedDoc[]) => SavedDoc[]) => void;
}

function DocSidebar({ currentDocId, savedDocs, onClose, mobileOpen, user, onLogout, onDocsUpdate }: DocSidebarProps) {
  const navigate = useNavigate();

  // Generate a random document ID and navigate to the new document page
  const handleNewDoc = () => {
    const newId = Math.random().toString(36).substring(2, 10);
    navigate(`/document/${newId}`);
    if (onClose) onClose();
  };

  // Extract initials from a user's name for the avatar fallback
  const getInitials = (name: string) =>
    (name || "U").split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <aside className={`doc-sidebar${mobileOpen ? " sidebar-open" : ""}`}>

      {/* New Document Button */}
      <div className="doc-sidebar-top">
        <button className="doc-sidebar-new-btn" onClick={handleNewDoc}>
          <IconPlus /> New Document
        </button>
      </div>

      {/* Navigation links to main sections */}
      <nav className="doc-sidebar-nav">
        <div className="doc-sidebar-nav-item" onClick={() => { navigate('/dashboard'); if (onClose) onClose(); }}>
          <span className="doc-sidebar-nav-icon"><IconDoc size={15} /></span>
          All Documents
        </div>
        <div className="doc-sidebar-nav-item" onClick={() => { navigate('/shared-with-me'); if (onClose) onClose(); }}>
          <span className="doc-sidebar-nav-icon"><IconSharedWith size={15} /></span>
          Shared with me
        </div>
        <div className="doc-sidebar-nav-item" onClick={() => { navigate('/starred'); if (onClose) onClose(); }}>
          <span className="doc-sidebar-nav-icon"><IconStar size={15} /></span>
          Starred
        </div>
        <div className="doc-sidebar-nav-item" onClick={() => { navigate('/trash'); if (onClose) onClose(); }}>
          <span className="doc-sidebar-nav-icon"><IconTrash size={15} /></span>
          Trash
        </div>
      </nav>

      <div className="doc-sidebar-divider" />

      {/* Recent Documents list */}
      <div className="doc-sidebar-section-label">Recent Documents</div>
      <div className="doc-sidebar-list">
        {savedDocs.length === 0 ? (
          <p className="doc-sidebar-empty">No saved documents yet.</p>
        ) : (
          savedDocs.map(doc => (
            <div
              key={doc.documentId}
              className={`doc-sidebar-item${doc.documentId === currentDocId ? " active" : ""}`}
              onClick={() => { navigate(`/document/${doc.documentId}`); if (onClose) onClose(); }}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                <span className="doc-sidebar-item-icon"><IconDoc size={13} /></span>
                <span className="doc-sidebar-item-title">{doc.title || "Untitled document"}</span>
              </div>

              {/* Star and Trash actions — emit socket events to update MongoDB */}
              <div className="doc-sidebar-item-actions" style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                <button
                  className="doc-sidebar-action-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (user) {
                      // Optimistic update in sidebar
                      if (onDocsUpdate) {
                        onDocsUpdate(prev =>
                          prev.map(d => d.documentId === doc.documentId ? { ...d, isStarred: !d.isStarred } : d)
                        );
                      }
                      socket.emit("toggle-star-document", { documentId: doc.documentId, userId: user.uid });
                    }
                  }}
                  title={doc.isStarred ? "Unstar document" : "Star document"}
                >
                  {doc.isStarred ? <IconStarFilled size={13} /> : <IconStar size={13} />}
                </button>
                <button
                  className="doc-sidebar-action-btn delete-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (user) {
                      // Optimistic update in sidebar
                      if (onDocsUpdate) {
                        onDocsUpdate(prev =>
                          prev.map(d => d.documentId === doc.documentId ? { ...d, isTrashed: true } : d)
                        );
                      }
                      socket.emit("trash-document", { documentId: doc.documentId, userId: user.uid });
                    }
                  }}
                  title="Move to Trash"
                >
                  <IconTrash />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* User profile section at the bottom of the sidebar */}
      {user && (
        <div className="doc-sidebar-user">
          {user.photoURL ? (
            <img src={user.photoURL} alt="" className="doc-sidebar-user-avatar" />
          ) : (
            <div className="doc-sidebar-user-avatar-fb">
              {getInitials(user.displayName || user.email || "U")}
            </div>
          )}
          <div className="doc-sidebar-user-info">
            <div className="doc-sidebar-user-name">{user.displayName || user.email}</div>
            <div className="doc-sidebar-user-email">{user.email}</div>
          </div>
          <button className="doc-sidebar-user-chevron" onClick={onLogout} title="Sign out" style={{ color: 'var(--danger)' }}>
            <IconLogout size={15} />
          </button>
        </div>
      )}

    </aside>
  );
}

export default DocSidebar;
