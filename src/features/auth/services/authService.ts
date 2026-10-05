import { FirebaseError } from "firebase/app";
import {
  type ActionCodeSettings,
  type IdTokenResult,
  type Unsubscribe,
  type User,
  type UserCredential,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onIdTokenChanged,
  reload,
  sendEmailVerification,
  signInWithEmailAndPassword,
} from "firebase/auth";

import { getFirebaseAuth } from "@/lib/firebase";

export type AuthUser = User;

const invalidCredentialMessage: string = "Email atau password salah.";

// Firebase error codes, shown to the user in Bahasa Indonesia.
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
  "auth/unauthorized-continue-uri":
    "Domain aplikasi ini belum diizinkan di Firebase (Authorized domains), jadi email verifikasi tidak bisa dikirim.",
};

// The verification email sent by the latest signUp. The register form is gone by the time sending finishes (the app has already moved to /verify-email), so that page picks it up with takeSignUpVerificationEmail to report the result.
let signUpVerificationEmail: Promise<void> | null = null;

// Accounts whose token hasVerifiedEmail already renewed in this page session. Verification only ever goes from false to true, so one renewal per account is enough; this keeps a token that stays out of date from being renewed over and over.
const renewedTokenUids: Set<string> = new Set<string>();

/**
 * @description Where the link in the verification email leads. Firebase first verifies the email on its own page; its "Continue" button then opens /verify-email in this app, which notices the verification and moves on to the board.
 */
function getVerificationLinkSettings(): ActionCodeSettings {
  return {
    url: `${window.location.origin}/verify-email`,
    handleCodeInApp: false,
  };
}

/**
 * @description Calls onChange with the signed-in user, or null when nobody is signed in. Fires once as soon as Firebase has restored (or ruled out) a session saved in the browser, then on every sign-in and sign-out (including ones from other tabs) and whenever the user's ID token is refreshed — which is how a newly verified email reaches the app (see refreshVerificationStatus).
 */
export function subscribeAuth(
  onChange: (user: AuthUser | null) => void,
): Unsubscribe {
  return onIdTokenChanged(getFirebaseAuth(), onChange);
}

/**
 * @description Signs in with email and password. Rejects with a FirebaseError if the credentials are wrong or the request fails; getAuthErrorMessage turns it into a message for the form.
 */
export async function signIn(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
}

/**
 * @description Creates a new account and asks Firebase to send it a verification email. Firebase signs the new user in right away, so the app moves to /verify-email while the email is being sent; that page reports whether sending worked (see takeSignUpVerificationEmail).
 */
export async function signUp(email: string, password: string): Promise<void> {
  const credential: UserCredential = await createUserWithEmailAndPassword(
    getFirebaseAuth(),
    email,
    password,
  );
  signUpVerificationEmail = sendEmailVerification(
    credential.user,
    getVerificationLinkSettings(),
  );
  await signUpVerificationEmail;
}

/**
 * @description Returns the verification email sent by the latest signUp, or null if there was none since the last call. It can be taken only once, so the message after registering is shown once and not again for a later visit to /verify-email.
 */
export function takeSignUpVerificationEmail(): Promise<void> | null {
  const sending: Promise<void> | null = signUpVerificationEmail;
  signUpVerificationEmail = null;
  return sending;
}

/**
 * @description Asks Firebase to send the signed-in user another verification email. Rejects with auth/too-many-requests when emails are requested too often.
 */
export async function resendVerificationEmail(): Promise<void> {
  const user: AuthUser | null = getFirebaseAuth().currentUser;
  if (!user) {
    throw new Error("belum masuk ke akun");
  }
  await sendEmailVerification(user, getVerificationLinkSettings());
}

/**
 * @description Whether the user counts as verified for the database rules, which read the email_verified claim of the ID token rather than user.emailVerified. The two can disagree: when the link is opened in another tab, Firebase updates user.emailVerified as soon as a page loads, but the saved token still says false. In that case a new token is requested first (which also makes subscribeAuth fire again), so the app never opens the board while the rules would still refuse it. This happens at most once per account (see renewedTokenUids).
 */
export async function hasVerifiedEmail(user: AuthUser): Promise<boolean> {
  let token: IdTokenResult = await user.getIdTokenResult();
  if (
    user.emailVerified &&
    token.claims.email_verified !== true &&
    !renewedTokenUids.has(user.uid)
  ) {
    renewedTokenUids.add(user.uid);
    token = await user.getIdTokenResult(true);
  }
  return token.claims.email_verified === true;
}

/**
 * @description Asks Firebase whether the signed-in user has verified their email since signing in, and returns the answer. When they have, it also gets a new ID token: that makes subscribeAuth report the change to the app, and gives the database rules the email_verified claim they check.
 */
export async function refreshVerificationStatus(): Promise<boolean> {
  const user: AuthUser | null = getFirebaseAuth().currentUser;
  if (!user) {
    return false;
  }
  await reload(user);
  if (user.emailVerified) {
    await user.getIdToken(true);
  }
  return user.emailVerified;
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(getFirebaseAuth());
}

/**
 * @description Turns an error thrown by the functions above into a message in Bahasa Indonesia. Unknown Firebase errors keep their code in the message, so they can still be looked up.
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
  takeSignUpVerificationEmail: typeof takeSignUpVerificationEmail;
  hasVerifiedEmail: typeof hasVerifiedEmail;
  resendVerificationEmail: typeof resendVerificationEmail;
  refreshVerificationStatus: typeof refreshVerificationStatus;
  signOut: typeof signOut;
}

const authService: AuthService = {
  subscribeAuth,
  signIn,
  signUp,
  takeSignUpVerificationEmail,
  hasVerifiedEmail,
  resendVerificationEmail,
  refreshVerificationStatus,
  signOut,
};

export default authService;
