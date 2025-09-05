import clientPromise from './mongo';

export async function getPermissionsForRole(roleName) {
  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);
  const role = await db.collection('roles').findOne({ name: roleName });
  return role?.permissions || [];
}

export function makePermissionChecker(permissions) {
  const set = new Set(permissions);
  const hasWildcard = set.has('*');
  return function has(perm) {
    if (hasWildcard) return true;
    return set.has(perm);
  };
}
