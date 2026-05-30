// config.js – contains passwords, roles and default users
export const ADMIN_PASSWORD = "admin123";

// Roles: "superadmin" — site owner, "admin" — manufacturer (e.g. Garage1), "user" — buyer
export const USERS = [
  { username: "super", password: "super123", role: "superadmin", manufacturer: "" },
  { username: "garage1", password: "admin123", role: "admin", manufacturer: "Garage1" },
  { username: "user", password: "user123", role: "user", manufacturer: "" }
];
