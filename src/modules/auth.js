import { initializeApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  deleteUser,
  getRedirectResult,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from 'firebase/auth';

const GDPR_CONSENT_KEY = 'menuPlanner_gdprConsent_v1';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

let _auth = null;

function hasFirebaseConfig() {
  return Boolean(
    firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.appId,
  );
}

export function isAuthConfigured() {
  return hasFirebaseConfig();
}

export function initAuth(onChange) {
  if (!hasFirebaseConfig()) {
    return () => {};
  }

  if (!_auth) {
    const app = initializeApp(firebaseConfig);
    _auth = getAuth(app);
  }

  return onAuthStateChanged(_auth, onChange);
}

export async function resolveAuthRedirectResult() {
  if (!_auth) {
    return null;
  }

  try {
    return await getRedirectResult(_auth);
  } catch {
    return null;
  }
}

function ensureAuth() {
  if (!_auth) {
    throw new Error('Authentication is not initialized.');
  }
  return _auth;
}

export function getCurrentUser() {
  return _auth?.currentUser || null;
}

export async function registerWithEmail(email, password) {
  const auth = ensureAuth();
  return createUserWithEmailAndPassword(auth, email, password);
}

export async function loginWithEmail(email, password) {
  const auth = ensureAuth();
  return signInWithEmailAndPassword(auth, email, password);
}

export async function resetPassword(email) {
  const auth = ensureAuth();
  return sendPasswordResetEmail(auth, email);
}

export async function loginWithGoogle() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  return loginWithProvider(provider);
}

async function loginWithProvider(provider) {
  const auth = ensureAuth();

  try {
    return await signInWithPopup(auth, provider);
  } catch (error) {
    const code = String(error?.code || '');
    const popupRestricted =
      code === 'auth/popup-blocked' ||
      code === 'auth/cancelled-popup-request' ||
      code === 'auth/operation-not-supported-in-this-environment';

    if (!popupRestricted) {
      throw error;
    }

    await signInWithRedirect(auth, provider);
    return null;
  }
}

export async function logout() {
  const auth = ensureAuth();
  return signOut(auth);
}

export async function deleteCurrentAccount() {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('No active user session.');
  }
  return deleteUser(user);
}

export function setGdprConsent(consentPayload) {
  localStorage.setItem(
    GDPR_CONSENT_KEY,
    JSON.stringify({
      email: consentPayload?.email || '',
      acceptedPolicies: ['privacy', 'terms'],
      locale: consentPayload?.locale || 'en',
      source: consentPayload?.source || 'auth_modal',
      version: '1.0',
      timestamp: Date.now(),
    }),
  );
}

export function getGdprConsent() {
  try {
    const value = localStorage.getItem(GDPR_CONSENT_KEY);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

export function hasGdprConsent() {
  return Boolean(getGdprConsent());
}

export function exportUserLocalData() {
  const payload = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('menuPlanner_')) {
      payload[key] = localStorage.getItem(key);
    }
  }
  return {
    exportedAt: new Date().toISOString(),
    provider: 'localStorage',
    data: payload,
  };
}
