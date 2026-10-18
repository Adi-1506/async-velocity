function same(a, b) {
  return String(a?._id || a) === String(b?._id || b);
}
function canRead(t, u) {
  return (
    !!t &&
    !!u &&
    (u.role === "superadmin" ||
      same(t.superAdmin, u._id) ||
      [...t.admins, ...t.members].some((id) => same(id, u._id)))
  );
}
function canManage(t, u) {
  return (
    !!t &&
    !!u &&
    (u.role === "superadmin" ||
      same(t.superAdmin, u._id) ||
      t.admins.some((id) => same(id, u._id)))
  );
}
module.exports = { same, canRead, canManage };
