import { useState } from "react";
import socket from "../socket/socket";
import { toast } from "../utils/toast";
import { IconCopyLink } from "./Icons";

// Shape of a single collaborator
interface Collaborator {
  email: string;
  role: string;
}

// Shape of the full sharing settings object
interface SharingSettings {
  ownerEmail: string;
  collaborators: Collaborator[];
  publicAccess: string;
}

interface ShareModalProps {
  documentId: string;
  userId: string;
  sharingSettings: SharingSettings | null;
  onSharingSettingsChange: (updater: (prev: SharingSettings | null) => SharingSettings | null) => void;
  onClose: () => void;
}

function ShareModal({ documentId, userId, sharingSettings, onSharingSettingsChange, onClose }: ShareModalProps) {
  const [newCollabEmail, setNewCollabEmail] = useState("");
  const [newCollabRole, setNewCollabRole] = useState("editor");

  // Invite a collaborator — adds or updates their role then syncs via socket
  const handleInvite = () => {
    if (!newCollabEmail.trim()) return;
    const updated = [
      ...(sharingSettings?.collaborators || []).filter(c => c.email !== newCollabEmail.trim()),
      { email: newCollabEmail.trim(), role: newCollabRole }
    ];
    const newSettings = { collaborators: updated, publicAccess: sharingSettings?.publicAccess || 'restricted' };
    onSharingSettingsChange(prev => ({ ...prev!, ...newSettings }));
    socket.emit('update-sharing-settings', { documentId, userId, ...newSettings });
    toast.success(`${newCollabEmail.trim()} added as ${newCollabRole}`);
    setNewCollabEmail("");
  };

  // Remove a collaborator by email
  const handleRemove = (email: string) => {
    if (!sharingSettings) return;
    const updated = sharingSettings.collaborators.filter(x => x.email !== email);
    const newSettings = { collaborators: updated, publicAccess: sharingSettings.publicAccess };
    onSharingSettingsChange(prev => ({ ...prev!, ...newSettings }));
    socket.emit('update-sharing-settings', { documentId, userId, ...newSettings });
    toast.success(`${email} removed.`);
  };

  // Change an existing collaborator's role
  const handleRoleChange = (email: string, role: string) => {
    if (!sharingSettings) return;
    const updated = sharingSettings.collaborators.map(x => x.email === email ? { ...x, role } : x);
    const newSettings = { collaborators: updated, publicAccess: sharingSettings.publicAccess };
    onSharingSettingsChange(prev => ({ ...prev!, ...newSettings }));
    socket.emit('update-sharing-settings', { documentId, userId, ...newSettings });
  };

  // Change the general/public access level
  const handlePublicAccessChange = (publicAccess: string) => {
    if (!sharingSettings) return;
    const newSettings = { collaborators: sharingSettings.collaborators, publicAccess };
    onSharingSettingsChange(prev => ({ ...prev!, publicAccess }));
    socket.emit('update-sharing-settings', { documentId, userId, ...newSettings });
  };

  return (
    <div className="share-modal-overlay" onClick={onClose}>
      <div className="share-modal" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="share-modal-header">
          <h3 className="share-modal-title">Share document</h3>
          <button className="share-modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Invite people */}
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
                  handleInvite();
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
            <button className="btn btn-blue btn-sm" onClick={handleInvite}>
              Invite
            </button>
          </div>
        </div>

        {/* People with access */}
        {sharingSettings && (
          <div className="share-modal-section">
            <label className="share-modal-label">People with access</label>
            <div className="share-people-list">

              {/* Owner row */}
              <div className="share-person-row">
                <div className="share-person-info">
                  <div className="share-person-avatar">
                    {(sharingSettings.ownerEmail?.[0] || 'O').toUpperCase()}
                  </div>
                  <div>
                    <div className="share-person-email">{sharingSettings.ownerEmail || 'Owner'}</div>
                    <div className="share-person-badge">Owner</div>
                  </div>
                </div>
              </div>

              {/* Collaborator rows */}
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
                      onChange={e => handleRoleChange(c.email, e.target.value)}
                    >
                      <option value="editor">Editor</option>
                      <option value="viewer">Viewer</option>
                    </select>
                    <button
                      className="share-remove-btn"
                      title="Remove"
                      onClick={() => handleRemove(c.email)}
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
                  onChange={e => handlePublicAccessChange(e.target.value)}
                >
                  <option value="restricted">Restricted — only invited people can access</option>
                  <option value="viewer">Anyone with the link can view</option>
                  <option value="editor">Anyone with the link can edit</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="share-modal-footer">
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              toast.success("Document link copied!");
            }}
          >
            <IconCopyLink /> Copy link
          </button>
          <button className="btn btn-blue btn-sm" onClick={onClose}>
            Done
          </button>
        </div>

      </div>
    </div>
  );
}

export default ShareModal;
