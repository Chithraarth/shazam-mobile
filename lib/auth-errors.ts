// Maps Firebase auth error codes to messages. Returns null for errors that
// shouldn't be shown at all (e.g. the user cancelled the Google sheet).
export function firebaseErrorMessage(err: unknown): string | null {
  const code = (err as { code?: string })?.code ?? "";
  switch (code) {
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
    case "auth/user-cancelled":
      return null;
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Incorrect email or password.";
    case "auth/email-already-in-use":
      return "An account already exists with this email.";
    case "auth/weak-password":
      return "Password must be at least 6 characters.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/invalid-phone-number":
      return "Please enter a valid phone number, including country code (e.g. +1...).";
    case "auth/invalid-verification-code":
      return "That code is incorrect. Please try again.";
    case "auth/code-expired":
      return "That code has expired. Please request a new one.";
    case "auth/too-many-requests":
      return "Too many attempts. Please try again later.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    case "auth/operation-not-allowed":
      return "This sign-in method isn't enabled for this app yet.";
    case "auth/operation-not-supported-in-this-environment":
      return "Google Play Services is required for Google sign-in on this device.";
    case "auth/account-exists-with-different-credential":
      return "An account already exists with this email using a different sign-in method.";
    case "auth/quota-exceeded":
      return "SMS quota exceeded. Please try again later.";
    case "auth/requires-recent-login":
      return "For your security, please sign in again and then retry.";
    case "auth/missing-verification-code":
      return "Please enter the verification code.";
    default:
      return "Something went wrong. Please try again.";
  }
}

