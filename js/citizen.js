// js/citizen.js
document.addEventListener("DOMContentLoaded", () => {
  // Simple guards
  if (typeof window.auth === "undefined" || typeof window.db === "undefined") {
    console.error("Firebase not initialized (auth/db missing).");
    alert("Internal error: Firebase not initialized. Check console.");
    return;
  }

  const logoutBtn = document.getElementById("logoutBtn");
  const userBadge = document.getElementById("userBadge");

  const applyForm = document.getElementById("applyForm");
  const applyBtn = document.getElementById("applyBtn");
  const applyMsg = document.getElementById("applyMsg");
  const appsList = document.getElementById("appsList");

  let currentUser = null;

  // Protect route & initialize
  window.auth.onAuthStateChanged(async (user) => {
    if (!user) {
      // Not logged in -> send to login
      window.location.href = "login.html";
      return;
    }

    currentUser = user;
    // show basic badge (uid while we fetch user doc)
    userBadge.textContent = user.email || "Signed in";

    // Try to read user profile from /users/{uid}
    try {
      const doc = await window.db.collection("users").doc(user.uid).get();
      if (doc.exists) {
        const data = doc.data();
        const display = `${data.name || user.email} • ${data.village || ""}`;
        userBadge.textContent = display;
      }
    } catch (err) {
      console.warn("Could not read /users doc:", err);
    }

    // Load user's applications
    loadApplications();
  });

  // Logout
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await window.auth.signOut();
      window.location.href = "login.html";
    });
  }

  // Submit application
  if (applyForm) {
    applyForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!currentUser) {
        applyMsg.textContent = "You must be signed in.";
        return;
      }

      const type = document.getElementById("certType").value;
      const fullName = document.getElementById("fullName").value.trim();
      const address = document.getElementById("address").value.trim();

      if (!type || !fullName || !address) {
        applyMsg.textContent = "Please fill all fields.";
        return;
      }

      applyBtn.disabled = true;
      applyBtn.textContent = "Submitting...";

      try {
        await window.db.collection("applications").add({
          citizenId: currentUser.uid,
          type,
          status: "pending",
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          details: { fullName, address }
        });

        applyMsg.textContent = "Application submitted successfully.";
        applyForm.reset();
        // refresh list
        await loadApplications();
      } catch (err) {
        console.error("Error submitting application:", err);
        applyMsg.textContent = "Failed to submit. Try again.";
      } finally {
        applyBtn.disabled = false;
        applyBtn.textContent = "Submit Application";
      }
    });
  }

  // Load applications for current user
  async function loadApplications() {
    if (!currentUser) {
      appsList.innerHTML = `<p class="helper">Sign in to see your applications.</p>`;
      return;
    }

    appsList.innerHTML = `<p class="helper">Loading your applications...</p>`;

    try {
      // Query applications where citizenId == uid, newest first
      const snapshot = await window.db.collection("applications")
        .where("citizenId", "==", currentUser.uid)
        .orderBy("createdAt", "desc")
        .get();

      if (snapshot.empty) {
        appsList.innerHTML = `<p class="helper">You have no applications yet.</p>`;
        return;
      }

      // Build HTML list
      const container = document.createElement("div");
      container.className = "applications";

      snapshot.forEach(doc => {
        const d = doc.data();
        const createdAt = d.createdAt ? d.createdAt.toDate().toLocaleString() : "—";
        const status = (d.status || "pending");
        const details = d.details || {};

        const item = document.createElement("div");
        item.className = "card";
        item.style.marginBottom = "10px";
        item.innerHTML = `
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div>
              <strong>${capitalize(d.type || "application")}</strong>
              <div class="note">${details.fullName || ""} · ${details.address || ""}</div>
            </div>
            <div style="text-align:right;">
              <div class="badge">${status.toUpperCase()}</div>
              <div class="helper" style="margin-top:6px;font-size:12px;">${createdAt}</div>
            </div>
          </div>
        `;
        container.appendChild(item);
      });

      appsList.innerHTML = "";
      appsList.appendChild(container);
    } catch (err) {
      console.error("Error loading applications:", err);
      appsList.innerHTML = `<p class="helper">Failed to load applications.</p>`;
    }
  }

  function capitalize(s) {
    if (!s) return s;
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
});
