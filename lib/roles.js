export const roleHome = (role) => {
  const map = {
    'Owner/Admin': '/dashboard/admin',
    'Watchman': '/dashboard/watchman',
    'Food Manager': '/dashboard/food-manager',
    'Cow Manager': '/dashboard/cow-manager',
    'Goshala Manager': '/dashboard/goshala-manager',
    'Doctor': '/dashboard/doctor',
  };
  return map[role] || '/unauthorized';
};

export const canAccess = (role, section) => {
  const access = {
    // Admin can access everything
    'Owner/Admin': 'all',
    'Watchman': ['watchman'],
    'Food Manager': ['food-manager'],
    'Cow Manager': ['cow-manager'],
    'Goshala Manager': ['watchman', 'food-manager', 'cow-manager', 'goshala-manager', 'doctor'],
    'Doctor': ['doctor'],
  };
  if (!role) return false;
  const allowed = access[role];
  if (!allowed) return false;
  if (allowed === 'all') return true;
  return allowed.includes(section);
};
