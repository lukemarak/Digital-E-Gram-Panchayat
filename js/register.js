// js/register.js (updated to consume invitations)
document.addEventListener("DOMContentLoaded", () => {
  if (typeof window.auth === "undefined" || typeof window.db === "undefined") {
    console.error("Firebase not initialized (auth/db missing).");
    alert("Internal error: Firebase not initialized. Check console.");
    return;
  }

  const form = document.getElementById("registerForm");
  const registerBtn = document.getElementById("registerBtn");
  const registerMsg = document.getElementById("registerMsg");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    registerMsg.textContent = "";
    registerBtn.disabled = true;
    registerBtn.textContent = "Creating...";

    const name = document.getElementById("name").value.trim();
    const village = document.getElementById("village").value.trim();
    const email = document.getElementById("email").value.trim().toLowerCase();
    const password = document.getElementById("password").value;

    if (!name || !village || !email || !password) {
      registerMsg.textContent = "Please fill all fields.";
      registerBtn.disabled = false;
      registerBtn.textContent = "Create account";
      return;
    }

    try {
      // check for an invitation
      const invSnapshot = await window.db.collection("invitations")
        .where("email", "==", email)
        .where("status", "==", "pending")
        .limit(1)
        .get();

      // Create auth user
      const cred = await window.auth.createUserWithEmailAndPassword(email, password);
      const uid = cred.user.uid;

      // Determine role: invitation role if exists, else "citizen"
      let role = "citizen";
      let invitationDocId = null;
      if (!invSnapshot.empty) {
        const invDoc = invSnapshot.docs[0];
        const invData = invDoc.data();
        role = invData.role || "staff";
        invitationDocId = invDoc.id;
      }

      // Create Firestore user doc with the resolved role
      await window.db.collection("users").doc(uid).set({
        name,
        email,
        village,
        role,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      // If we used an invitation, mark it accepted
      if (invitationDocId) {
        await window.db.collection("invitations").doc(invitationDocId).update({
          status: "accepted",
          acceptedBy: uid,
          acceptedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      }

      registerMsg.textContent = `Account created as ${role}. Redirecting...`;
      setTimeout(() => {
        // redirect depending on role
        if (role === "admin") window.location.href = "admin-dashboard.html";
        else if (role === "staff") window.location.href = "staff-dashboard.html";
        else window.location.href = "citizen-dashboard.html";
      }, 900);
    } catch (err) {
      console.error("Registration error:", err);
      let msg = "Registration failed. Try again.";
      if (err.code === "auth/email-already-in-use") msg = "Email already in use. Try logging in.";
      if (err.code === "auth/weak-password") msg = "Weak password. Use at least 6 characters.";
      registerMsg.textContent = msg;
    } finally {
      registerBtn.disabled = false;
      registerBtn.textContent = "Create account";
    }
  });
});
