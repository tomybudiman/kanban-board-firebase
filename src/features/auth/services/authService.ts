import { FirebaseError } from "firebase/app";
import {
  type Unsubscribe,
  type User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut as firebaseSignOut,
  signInWithEmailAndPassword,
} from "firebase/auth";

import { getFirebaseAuth } from "@/lib/firebase";

export type AuthUser = User;

const invalidCredentialMessage: string = "Email atau password salah.";

// Firebase error codes from sign-in/sign-up, shown to the user in Bahasa Indonesia.
const authErrorMessages: Record<string, string> = {
  "auth/invalid-credential": invalidCredentialMessage,
  "auth/invalid-login-credentials": invalidCredentialMessage,
  "auth/user-not-found": invalidCredentialMessage,
  "auth/wrong-password": invalidCredentialMessage,
  "auth/email-already-in-use": "Email ini sudah terdaftar. Silakan masuk.",
  "auth/invalid-email": "Format email tidak valid.",
  "auth/weak-password": "Password terlalu lemah. Gunakan minimal 6 karakter.",
  "auth/user-disabled": "Akun ini sudah dinonaktifkan.",
  "auth/too-many-requests":
    "Terlalu banyak percobaan. Tunggu sebentar, lalu coba lagi.",
  "auth/network-request-failed":
    "Tidak dapat terhubung ke server. Periksa koneksi internet.",
  "auth/operation-not-allowed":
    "Login dengan email & password belum diaktifkan di Firebase Console.",
};

/**
 * @description Calls onChange with the signed-in user, or null when nobody is signed in. Fires once as soon as Firebase has restored (or ruled out) a session saved in the browser, then again on every sign-in and sign-out, including ones from other tabs.
 */
export function subscribeAuth(
  onChange: (user: AuthUser | null) => void,
): Unsubscribe {
  return onAuthStateChanged(getFirebaseAuth(), onChange);
}

/**
 * @description Signs in with email and password. Rejects with a FirebaseError if the credentials are wrong or the request fails; getAuthErrorMessage turns it into a message for the form.
 */
export async function signIn(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
}

/**
 * @description Creates a new account. Firebase signs the new user in right away, so no separate sign-in is needed.
 */
export async function signUp(email: string, password: string): Promise<void> {
  await createUserWithEmailAndPassword(getFirebaseAuth(), email, password);
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(getFirebaseAuth());
}

/**
 * @description Turns an error thrown by signIn or signUp into a message in Bahasa Indonesia. Unknown Firebase errors keep their code in the message, so they can still be looked up.
 */
export function getAuthErrorMessage(error: unknown): string {
  if (!(error instanceof FirebaseError)) {
    return "Terjadi kesalahan. Silakan coba lagi.";
  }
  const message: string | undefined = authErrorMessages[error.code];
  return message ?? `Terjadi kesalahan (${error.code}). Silakan coba lagi.`;
}

interface AuthService {
  subscribeAuth: typeof subscribeAuth;
  signIn: typeof signIn;
  signUp: typeof signUp;
  signOut: typeof signOut;
}

const authService: AuthService = {
  subscribeAuth,
  signIn,
  signUp,
  signOut,
};

export default authService;
