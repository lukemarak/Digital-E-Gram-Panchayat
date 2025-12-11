// js/auth.js

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  const loginError = document.getElementById("loginError");
  const loginBtn = document.getElementById("loginBtn");

  // Helper: redirect according to role
  function redirectByRole(role) {
    switch (role) {
      case "admin":
        window.location.href = "admin-dashboard.html";
        break;
      case "staff":
        window.location.href = "staff-dashboard.html";
        break;
      case "citizen":
      default:
        window.location.href = "citizen-dashboard.html";
        break;
    }
  }

  // When auth state changes (user logs in / already logged in)
  if (typeof auth !== "undefined" && typeof db !== "undefined") {
    auth.onAuthStateChanged(async (user) => {
      if (!user) {
        // Not logged in – stay on login page
        return;
      }

      try {
        // Get user document from Firestore
        const userDoc = await db.collection("users").doc(user.uid).get();

        if (!userDoc.exists) {
          console.warn("No user document found for uid:", user.uid);
          // fallback: treat as citizen
          redirectByRole("citizen");
          return;
        }

        const userData = userDoc.data();
        const role = userData.role || "citizen";

        redirectByRole(role);
      } catch (err) {
        console.error("Error fetching user role:", err);
        // fallback: at least send somewhere
        redirectByRole("citizen");
      }
    });
  } else {
    console.error("Firebase Auth / Firestore not initialized!");
  }

  // Handle login form submit
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      if (loginError) loginError.textContent = "";

      if (loginBtn) {
        loginBtn.disabled = true;
        loginBtn.textContent = "Logging in...";
      }

      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value;

      try {
        await auth.signInWithEmailAndPassword(email, password);
        // After this, onAuthStateChanged will fire,
        // fetch role, and redirect accordingly.
      } catch (error) {
        console.error("Login error:", error);

        if (loginError) {
          switch (error.code) {
            case "auth/user-not-found":
              loginError.textContent = "No user found with this email.";
              break;
            case "auth/wrong-password":
              loginError.textContent = "Incorrect password.";
              break;
            case "auth/invalid-email":
              loginError.textContent = "Invalid email address.";
              break;
            default:
              loginError.textContent = "Login failed. Please try again.";
          }
        }
      } finally {
        if (loginBtn) {
          loginBtn.disabled = false;
          loginBtn.textContent = "Login";
        }
      }
    });
  }
});
