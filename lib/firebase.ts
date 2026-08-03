import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "AIzaSyB1JAA9NKj2q3vtsAI5OgsCOAMh91GHKks",
  authDomain: "videofy-e5106.firebaseapp.com",
  projectId: "videofy-e5106",
  storageBucket: "videofy-e5106.firebasestorage.app",
  messagingSenderId: "816984918533",
  appId: "1:816984918533:android:04ebb21c665813690f2a6c",
};

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = initializeAuth(firebaseApp, {
  persistence: getReactNativePersistence(AsyncStorage),
});
