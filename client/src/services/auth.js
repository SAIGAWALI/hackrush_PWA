import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  onAuthStateChanged 
} from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// GOOGLE SIGN IN
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    if (!result.user.email.endsWith("@iitgn.ac.in")) {
      await signOut(auth);
      alert("Access Restricted: Use @iitgn.ac.in email.");
      return null;
    }
    return result.user;
  } catch (error) {
    console.error(error);
    return null;
  }
};

// EMAIL SIGN UP + VERIFICATION
export const signUpWithEmail = async (email, password) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    // 1. Send verification link
    await sendEmailVerification(userCredential.user);
    // 2. Sign out so they must verify before first login
    await signOut(auth);
    alert("Verification email sent! Check your IITGN inbox before logging in.");
    return true;
  } catch (error) {
    alert(error.message);
    return false;
  }
};

export const logout = async () => {
  await signOut(auth);
  window.location.href = "/auth";
};