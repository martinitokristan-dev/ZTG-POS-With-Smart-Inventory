/**
 * auth.js — Centralized auth storage utility
 *
 * Uses sessionStorage for auth_token and auth_user so that each browser tab
 * maintains its own independent session. This allows multiple accounts to be
 * open simultaneously in separate tabs on the same browser.
 *
 * Non-auth keys (themes, sidebar state, business logo, etc.) continue to use
 * localStorage as before since they are global/non-sensitive preferences.
 */

const AUTH_TOKEN_KEY = "auth_token";
const AUTH_USER_KEY = "auth_user";

// Token
export function getAuthToken() {
    return sessionStorage.getItem(AUTH_TOKEN_KEY) ?? localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setAuthToken(token) {
    sessionStorage.setItem(AUTH_TOKEN_KEY, token);
    localStorage.removeItem(AUTH_TOKEN_KEY);
}

export function removeAuthToken() {
    sessionStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_TOKEN_KEY);
}

// User
export function getAuthUser() {
    try {
        const raw = sessionStorage.getItem(AUTH_USER_KEY) ?? localStorage.getItem(AUTH_USER_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

export function getAuthUserRaw() {
    return sessionStorage.getItem(AUTH_USER_KEY) ?? localStorage.getItem(AUTH_USER_KEY);
}

export function setAuthUser(user) {
    sessionStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    localStorage.removeItem(AUTH_USER_KEY);
}

export function removeAuthUser() {
    sessionStorage.removeItem(AUTH_USER_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
}

// Convenience
export function clearAuth() {
    removeAuthToken();
    removeAuthUser();
}
