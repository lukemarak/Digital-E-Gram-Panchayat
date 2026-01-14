// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "YOUR_KEY",
  authDomain: "YOUR_DOMAIN",
  projectId: "YOUR_ID",
  storageBucket: "YOUR_STORAGE",
  messagingSenderId: "YOUR_",
  appId: "YOUR_"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Create GLOBAL Firebase references
window.auth = firebase.auth();
window.db = firebase.firestore();
window.storage = firebase.storage();

// Debugging logs
console.log("🔥 Firebase initialized");
console.log("Auth loaded:", window.auth ? "Yes" : "No");
console.log("DB loaded:", window.db ? "Yes" : "No");
console.log("Storage loaded:", window.storage ? "Yes" : "No");
