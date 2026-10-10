// Both admin surfaces share one token, cookie, and current-Admin check.
export {
  COOKIE_NAME,
  createSession,
  getLogoutCookieConfig,
  getSessionCookieConfig,
  getSessionFromCookies,
  validateCredentials,
  verifySession,
} from "./auth";
