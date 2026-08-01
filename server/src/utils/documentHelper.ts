import Document from "../models/Document";
import User from "../models/User";

// Helper to fetch documents owned by or shared with a specific user
// Returns enriched objects with { isShared, role, ownerEmail } flags for the dashboard
export async function getUserDocuments(userId: string) {
  if (!userId) return [];
  const userDb = await User.findOne({ uid: userId });
  const userEmail = userDb ? userDb.email : "";
  const query: any = {
    $or: [{ ownerId: userId }]
  };
  if (userEmail) {
    query.$or.push({ "collaborators.email": userEmail });
  }
  const docs = await Document.find(query).sort({ lastUpdated: -1 });

  // Enrich each document with sharing metadata so the dashboard can render badges
  return docs.map(doc => {
    const isOwner = doc.ownerId === userId || (userEmail && doc.ownerEmail === userEmail);
    const collaborator = doc.collaborators.find((c: any) => c.email === userEmail);
    const role = isOwner ? "editor" : (collaborator ? collaborator.role : "viewer");
    return {
      documentId: doc.documentId,
      title: doc.title,
      lastUpdated: doc.lastUpdated,
      isShared: !isOwner,
      role,
      ownerEmail: doc.ownerEmail || "",
      isStarred: doc.isStarred || false,
      isTrashed: doc.isTrashed || false
    };
  });
}
