document.addEventListener("DOMContentLoaded", () => {

  if (!window.auth || !window.db) {
    alert("Firebase not initialized.");
    return;
  }

  const loginForm = document.getElementById("loginForm");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const roleSelect = document.getElementById("roleSelect");
  const loginMsg = document.getElementById("loginMsg");
  const loginBtn = document.getElementById("loginBtn");

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    loginMsg.textContent = "";

    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const selectedRole = roleSelect.value;

    if (!email || !password || !selectedRole) {
      loginMsg.textContent = "All fields are required.";
      return;
    }

    loginBtn.disabled = true;
    loginBtn.textContent = "Signing in...";

    try {
      // Firebase Auth
      const cred = await auth.signInWithEmailAndPassword(email, password);
      const user = cred.user;

      // Fetch user profile
      const snap = await db.collection("users").doc(user.uid).get();

      let userData;

        if (!snap.exists) {
        // Auto-create citizen profile
        userData = {
            role: "citizen",
            name: user.email.split("@")[0],
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        await db.collection("users").doc(user.uid).set(userData);
        } else {
        userData = snap.data();
        }

    //   const userData = snap.data();

      // Role validation
      if (userData.role !== selectedRole) {
        await auth.signOut();
        loginMsg.textContent =
          `Access denied. You are registered as "${userData.role}".`;
        loginBtn.disabled = false;
        loginBtn.textContent = "Login";
        return;
      }

      // Redirect by role
      if (userData.role === "citizen") {
        location.href = "citizen-dashboard.html";
      } else if (userData.role === "staff") {
        location.href = "staff-dashboard.html";
      } else if (userData.role === "admin") {
        location.href = "admin-dashboard.html";
      }

    } catch (err) {
      console.error(err);
      loginMsg.textContent = "Invalid email or password.";
      loginBtn.disabled = false;
      loginBtn.textContent = "Login";
    }
  });

});
