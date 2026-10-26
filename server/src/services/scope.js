// ─────────────────────────────────────────────────────────────────────────────
// Visibility rules (the heart of DormAce's "only my people can see this" guarantee)
//
//   • Same college AND same gender group, always (boys never see girls' content, and vice versa).
//   • Listings marked "hostel" are limited to the seller's own hostel; "college" ones are visible
//     to every hostel of that gender in the college.
//   • Business listings may carry gender "both" (set server-side from the business audience).
//
// Every read path must go through visibleFilter()/canSee(); scope is derived from the logged-in
// user's DB record and never from request parameters.
// ─────────────────────────────────────────────────────────────────────────────
export const visibleFilter = (user) => ({
  college: user.college,
  gender: { $in: [user.gender, 'both'] },
  $or: [{ visibility: 'college' }, { visibility: 'hostel', hostel: user.hostel }],
});

export function canSee(user, doc) {
  if (!doc) return false;
  if (!doc.college.equals(user.college)) return false;
  if (doc.gender !== user.gender && doc.gender !== 'both') return false;
  return doc.visibility === 'college' || doc.hostel.equals(user.hostel);
}
