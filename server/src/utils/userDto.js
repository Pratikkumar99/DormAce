// Shape returned to the account owner. Never includes hashes, tokens or the ID card key.
export function userDTO(u) {
  return {
    id: u._id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    gender: u.gender,
    college: u.college,
    hostel: u.hostel,
    roomNumber: u.roomNumber,
    rollNumber: u.rollNumber,
    avatar: u.avatar,
    role: u.role,
    emailVerified: u.emailVerified,
    verification: { status: u.verification?.status, rejectionReason: u.verification?.rejectionReason },
    createdAt: u.createdAt,
  };
}

export const POPULATE_PROFILE = [
  { path: 'college', select: 'name code city' },
  { path: 'hostel', select: 'name gender' },
];
