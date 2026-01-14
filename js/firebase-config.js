// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDa1gXweFRh1IxiyBEkr7l4JPPtNyXZg5k",
  authDomain: "digital-e-gram-panchayat-fa1eb.firebaseapp.com",
  projectId: "digital-e-gram-panchayat-fa1eb",
  // storageBucket: "digital-e-gram-panchayat-fa1eb.firebasestorage.app",
  storageBucket: "digital-e-gram-panchayat-fa1eb.appspot.com",
  messagingSenderId: "1005035404468",
  appId: "1:1005035404468:web:86030bfbb4e8531c702be1"
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
