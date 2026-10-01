import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Platform } from "react-native";
import {
  onAuthStateChanged,
  signInWithCredential,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPhoneNumber,
  sendPasswordResetEmail,
  deleteUser,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  User,
  ConfirmationResult,
} from "@react-native-firebase/auth";
import { auth } from "@/lib/firebase";
import { setAuthTokenGetter } from "@/lib/api-client";

let GoogleSignin: any = null;
let googleStatusCodes: any = null;
if (Platform.OS !== "web") {
  try {
    const googleSigninModule = require("@react-native-google-signin/google-signin");
    GoogleSignin = googleSigninModule.GoogleSignin;
    googleStatusCodes = googleSigninModule.statusCodes;
    GoogleSignin.configure({
      webClientId: "816984918533-j0bd7p6en1le1ki4j971hrbsjqtfiusp.apps.googleusercontent.com",
    });
  } catch {}
}

// Normalizes @react-native-google-signin's native status codes (which don't
// share Firebase's "auth/..." namespace) into codes firebaseErrorMessage()
// can recognize, so failures don't all collapse into "Something went wrong."
function normalizeGoogleSignInError(err: any): Error {
  const code = err?.code;
  if (googleStatusCodes && code === googleStatusCodes.SIGN_IN_CANCELLED) {
    return Object.assign(new Error("Sign-in was cancelled."), { code: "auth/popup-closed-by-user" });
  }
  if (googleStatusCodes && code === googleStatusCodes.IN_PROGRESS) {
    return Object.assign(new Error("Sign-in already in progress."), { code: "auth/cancelled-popup-request" });
  }
  if (googleStatusCodes && code === googleStatusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
    return Object.assign(
      new Error("Google Play Services is required for Google sign-in."),
      { code: "auth/operation-not-supported-in-this-environment" },
    );
  }
  if (code === "DEVELOPER_ERROR" || code === 10) {
    return Object.assign(
      new Error(
        "Google sign-in is misconfigured for this app build (missing/incorrect Android OAuth client or SHA-1 fingerprint).",
      ),
      { code: "auth/operation-not-allowed" },
    );
  }
  return err instanceof Error ? err : new Error(String(err?.message ?? err));
}

type AuthContextValue = {
  user: User | null;
  isLoaded: boolean;
  isSignedIn: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  // Android verifies phone numbers silently via Play Integrity/SafetyNet and
  // iOS via a silent push — neither needs a reCAPTCHA UI, unlike the plain
  // JS Firebase SDK we moved off of.
  sendPhoneOtp: (phoneNumber: string) => Promise<ConfirmationResult>;
  confirmPhoneOtp: (confirmation: ConfirmationResult, code: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  // Deletes the Firebase account itself. May throw auth/requires-recent-login.
  deleteAccount: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

setAuthTokenGetter(() => auth.currentUser?.getIdToken() ?? null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsLoaded(true);
    });
  }, []);

  const value: AuthContextValue = {
    user,
    isLoaded,
    isSignedIn: !!user,
    signInWithGoogle: async () => {
      if (!GoogleSignin) throw new Error("Google sign-in is not available on this platform");
      try {
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
        const result = await GoogleSignin.signIn();
        const idToken = result.data?.idToken ?? result.idToken;
        if (!idToken) throw new Error("Google sign-in did not return an ID token");
        // @react-native-firebase/auth's Android native module requires a non-empty
        // accessToken alongside the idToken, or it throws IllegalArgumentException
        // synchronously (crashing the app, since it happens outside the JS try/catch).
        const { accessToken } = await GoogleSignin.getTokens();
        const credential = GoogleAuthProvider.credential(idToken, accessToken);
        await signInWithCredential(auth, credential);
      } catch (err) {
        throw normalizeGoogleSignInError(err);
      }
    },
    signInWithEmail: async (email, password) => {
      await signInWithEmailAndPassword(auth, email, password);
    },
    signUpWithEmail: async (email, password) => {
      await createUserWithEmailAndPassword(auth, email, password);
    },
    sendPhoneOtp: async (phoneNumber) => {
      return signInWithPhoneNumber(auth, phoneNumber);
    },
    confirmPhoneOtp: async (confirmation, code) => {
      await confirmation.confirm(code);
    },
    sendPasswordReset: async (email) => {
      await sendPasswordResetEmail(auth, email);
    },
    deleteAccount: async () => {
      if (!auth.currentUser) return;
      await deleteUser(auth.currentUser);
      if (GoogleSignin) {
        try {
          await GoogleSignin.revokeAccess();
        } catch {}
      }
    },
    signOut: async () => {
      if (GoogleSignin) {
        try {
          await GoogleSignin.signOut();
        } catch {}
      }
      await firebaseSignOut(auth);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
