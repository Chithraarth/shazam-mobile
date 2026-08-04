import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Platform } from "react-native";
import {
  onAuthStateChanged,
  signInWithCredential,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPhoneNumber,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  User,
  ConfirmationResult,
} from "@react-native-firebase/auth";
import { auth } from "@/lib/firebase";
import { setAuthTokenGetter } from "@/lib/api-client";

let GoogleSignin: any = null;
if (Platform.OS !== "web") {
  try {
    GoogleSignin = require("@react-native-google-signin/google-signin").GoogleSignin;
    GoogleSignin.configure({
      webClientId: "816984918533-j0bd7p6en1le1ki4j971hrbsjqtfiusp.apps.googleusercontent.com",
    });
  } catch {}
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
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const result = await GoogleSignin.signIn();
      const idToken = result.data?.idToken ?? result.idToken;
      if (!idToken) throw new Error("Google sign-in did not return an ID token");
      const credential = GoogleAuthProvider.credential(idToken);
      await signInWithCredential(auth, credential);
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
