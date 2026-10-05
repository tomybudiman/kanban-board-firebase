import { type IdTokenResult, type User } from "firebase/auth";
import {
  type DataSnapshot,
  type DatabaseReference,
  get,
  ref,
  set,
} from "firebase/database";

import { getDb } from "@/lib/firebase";

// A user's record at /users/{uid}; the account itself lives in Firebase Authentication.
export interface UserProfile {
  email: string;
  isVerified: boolean;
}

/**
 * @description Makes /users/{uid} match the signed-in account: creates it the first time (also for accounts made before this record existed) and sets isVerified to true once the email is verified. Both values are read from the ID token — the same claims the database rules check — so the write is never refused because of an outdated token. Writes only when something changed.
 */
export async function syncUserProfile(user: User): Promise<void> {
  const token: IdTokenResult = await user.getIdTokenResult();
  const profile: UserProfile = {
    email: typeof token.claims.email === "string" ? token.claims.email : "",
    isVerified: token.claims.email_verified === true,
  };
  const profileRef: DatabaseReference = ref(getDb(), `users/${user.uid}`);
  const snapshot: DataSnapshot = await get(profileRef);
  const stored: UserProfile | null = snapshot.val();
  if (
    stored?.email === profile.email &&
    stored?.isVerified === profile.isVerified
  ) {
    return;
  }
  await set(profileRef, profile);
}

interface UsersService {
  syncUserProfile: typeof syncUserProfile;
}

const usersService: UsersService = {
  syncUserProfile,
};

export default usersService;
