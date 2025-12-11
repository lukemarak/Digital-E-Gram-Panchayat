// js/admin.js (updated — includes invite management)
document.addEventListener("DOMContentLoaded", () => {
  if (!window.auth || !window.db) {
    alert("Firebase not initialized. Check console.");
    return;
  }

  const logoutBtn = document.getElementById("logoutBtn");
  const userBadge = document.getElementById("userBadge");
  const usersList = document.getElementById("usersList");
  const allApps = document.getElementById("allApps");
  const publishNoticeBtn = document.getElementById("publishNoticeBtn");
  const noticeTitle = document.getElementById("noticeTitle");
  const noticeBody = document.getElementById("noticeBody");
  const noticeMsg = document.getElementById("noticeMsg");

  // Invite elements
  const inviteName = document.getElementById("inviteName");
  const inviteEmail = document.getElementById("inviteEmail");
  const inviteRole = document.getElementById("inviteRole");
  const inviteBtn = document.getElementById("inviteBtn");
  const invitesList = document.getElementById("invitesList");
  const inviteMsg = document.getElementById("inviteMsg");
  const refreshInvitesBtn = document.getElementById("refreshInvitesBtn");

  let currentUser = null;

  // Protect route
  window.auth.onAuthStateChanged(async (user) => {
    if (!user) {
      window.location.href = "login.html";
      return;
    }
    currentUser = user;
    userBadge.textContent = user.email;

    try {
      const udoc = await window.db.collection("users").doc(user.uid).get();
      if (udoc.exists) {
        const data = udoc.data();
        userBadge.textContent = `${data.name || user.email} • ${data.role || "admin"}`;
      }
    } catch (err) {
      console.warn("Failed to read user doc:", err);
    }

    loadUsers();
    loadAllApplications();
    loadInvitations();
  });

  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await window.auth.signOut();
      window.location.href = "login.html";
    });
  }

  // ----------------------------
  // Users (existing code)
  // ----------------------------
  async function loadUsers() {
    usersList.innerHTML = `<p class="helper">Loading users...</p>`;
    try {
      const snapshot = await window.db.collection("users").get();
      if (snapshot.empty) {
        usersList.innerHTML = `<p class="helper">No users found.</p>`;
        return;
      }

      const container = document.createElement("div");
      container.style.display = "flex";
      container.style.flexDirection = "column";
      container.style.gap = "8px";

      snapshot.forEach(doc => {
        const data = doc.data();
        const uid = doc.id;
        const row = document.createElement("div");
        row.className = "card";
        row.innerHTML = `
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div>
              <strong>${escapeHtml(data.name || data.email || uid)}</strong>
              <div class="note">${escapeHtml(data.email || "")} · ${escapeHtml(data.village || "")}</div>
            </div>
            <div style="display:flex;gap:8px;align-items:center;">
              <select data-uid="${uid}" class="roleSelect">
                <option value="citizen" ${data.role === "citizen" ? "selected" : ""}>Citizen</option>
                <option value="staff" ${data.role === "staff" ? "selected" : ""}>Staff</option>
                <option value="admin" ${data.role === "admin" ? "selected" : ""}>Admin</option>
              </select>
              <button data-uid="${uid}" class="btn outline smallBtn">Remove</button>
            </div>
          </div>
        `;
        container.appendChild(row);
      });

      usersList.innerHTML = "";
      usersList.appendChild(container);

      // Wire up role change handlers
      document.querySelectorAll(".roleSelect").forEach(sel => {
        sel.addEventListener("change", async (e) => {
          const uid = sel.dataset.uid;
          const newRole = sel.value;
          try {
            await window.db.collection("users").doc(uid).update({ role: newRole, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
            alert("Role updated for user " + uid);
            loadUsers();
          } catch (err) {
            console.error("Failed to update role:", err);
            alert("Failed to update role.");
          }
        });
      });

      // Wire remove buttons
      document.querySelectorAll(".smallBtn").forEach(btn => {
        btn.addEventListener("click", async (e) => {
          const uid = btn.dataset.uid;
          if (!confirm("Remove user record from Firestore? This will not delete their Auth account.")) return;
          try {
            await window.db.collection("users").doc(uid).delete();
            alert("User record removed.");
            loadUsers();
          } catch (err) {
            console.error("Failed to remove user:", err);
            alert("Failed to remove user.");
          }
        });
      });
    } catch (err) {
      console.error("Error loading users:", err);
      usersList.innerHTML = `<p class="helper">Failed to load users.</p>`;
    }
  }

  // ----------------------------
  // Invitations: create / list / revoke
  // ----------------------------
  async function loadInvitations() {
    invitesList.innerHTML = `<p class="helper">Loading invitations...</p>`;
    try {
      const snapshot = await window.db.collection("invitations")
        .where("status", "==", "pending")
        .orderBy("createdAt", "desc")
        .get();

      if (snapshot.empty) {
        invitesList.innerHTML = `<p class="helper">No pending invitations.</p>`;
        return;
      }

      const container = document.createElement("div");
      container.style.display = "flex";
      container.style.flexDirection = "column";
      container.style.gap = "8px";

      snapshot.forEach(doc => {
        const data = doc.data();
        const id = doc.id;
        const row = document.createElement("div");
        row.className = "card";
        row.innerHTML = `
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div>
              <strong>${escapeHtml(data.name || data.email)}</strong>
              <div class="note">${escapeHtml(data.email)} · ${escapeHtml(data.role)}</div>
            </div>
            <div style="display:flex;gap:8px;align-items:center;">
              <div class="helper">Invited: ${data.createdAt ? new Date(data.createdAt.seconds * 1000).toLocaleString() : ""}</div>
              <button data-id="${id}" class="btn outline revokeBtn">Revoke</button>
            </div>
          </div>
        `;
        container.appendChild(row);
      });

      invitesList.innerHTML = "";
      invitesList.appendChild(container);

      // wire revoke buttons
      document.querySelectorAll(".revokeBtn").forEach(b => {
        b.addEventListener("click", async () => {
          const id = b.dataset.id;
          if (!confirm("Revoke this invitation?")) return;
          try {
            await window.db.collection("invitations").doc(id).update({
              status: "revoked",
              revokedBy: currentUser.uid,
              revokedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            loadInvitations();
          } catch (err) {
            console.error("Failed to revoke invite:", err);
            alert("Failed to revoke invite.");
          }
        });
      });
    } catch (err) {
      console.error("Error loading invitations:", err);
      invitesList.innerHTML = `<p class="helper">Failed to load invitations.</p>`;
    }
  }

  // Create invitation
  if (inviteBtn) {
    inviteBtn.addEventListener("click", async () => {
      inviteMsg.textContent = "";
      const name = (inviteName.value || "").trim();
      const email = (inviteEmail.value || "").trim().toLowerCase();
      const role = (inviteRole.value || "staff");

      if (!name || !email) {
        inviteMsg.textContent = "Name and email are required.";
        return;
      }

      inviteBtn.disabled = true;
      inviteBtn.textContent = "Inviting...";

      try {
        // check if a pending invitation for same email exists
        const q = await window.db.collection("invitations")
          .where("email", "==", email)
          .where("status", "==", "pending")
          .get();

        if (!q.empty) {
          inviteMsg.textContent = "An invitation for this email already exists.";
          return;
        }

        await window.db.collection("invitations").add({
          name,
          email,
          role,
          status: "pending",
          createdBy: currentUser.uid,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        inviteMsg.textContent = "Invitation created. Ask the user to register with this email.";
        inviteName.value = "";
        inviteEmail.value = "";
        inviteRole.value = "staff";
        loadInvitations();
      } catch (err) {
        console.error("Failed to create invitation:", err);
        inviteMsg.textContent = "Failed to create invitation.";
      } finally {
        inviteBtn.disabled = false;
        inviteBtn.textContent = "Create Invitation";
      }
    });
  }

  if (refreshInvitesBtn) {
    refreshInvitesBtn.addEventListener("click", () => loadInvitations());
  }

  // ----------------------------
  // Notices (existing)
  // ----------------------------
  if (publishNoticeBtn) {
    publishNoticeBtn.addEventListener("click", async () => {
      const title = (noticeTitle.value || "").trim();
      const body = (noticeBody.value || "").trim();
      noticeMsg.textContent = "";

      if (!title || !body) {
        noticeMsg.textContent = "Title and body are required.";
        return;
      }

      publishNoticeBtn.disabled = true;
      publishNoticeBtn.textContent = "Publishing...";

      try {
        await window.db.collection("notices").add({
          title,
          body,
          publishedAt: firebase.firestore.FieldValue.serverTimestamp(),
          authorId: currentUser.uid
        });
        noticeMsg.textContent = "Notice published.";
        noticeTitle.value = "";
        noticeBody.value = "";
      } catch (err) {
        console.error("Failed to publish notice:", err);
        noticeMsg.textContent = "Failed to publish notice.";
      } finally {
        publishNoticeBtn.disabled = false;
        publishNoticeBtn.textContent = "Publish Notice";
        loadAllApplications(); // optional refresh
      }
    });
  }

  // ----------------------------
  // Applications (existing)
  // ----------------------------
  async function loadAllApplications() {
    allApps.innerHTML = `<p class="helper">Loading all applications...</p>`;
    try {
      const snapshot = await window.db.collection("applications")
        .orderBy("createdAt", "desc")
        .limit(100)
        .get();

      if (snapshot.empty) {
        allApps.innerHTML = `<p class="helper">No applications found.</p>`;
        return;
      }

      const container = document.createElement("div");
      container.style.display = "flex";
      container.style.flexDirection = "column";
      container.style.gap = "8px";

      snapshot.forEach(doc => {
        const d = doc.data();
        const item = document.createElement("div");
        item.className = "card";
        item.innerHTML = `
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div>
              <strong>${capitalize(d.type || "application")}</strong>
              <div class="note">${(d.details && d.details.fullName) || d.citizenId}</div>
            </div>
            <div style="text-align:right;">
              <div class="badge">${(d.status || "pending").toUpperCase()}</div>
              <div class="helper" style="margin-top:6px;font-size:12px;">${d.createdAt ? d.createdAt.toDate().toLocaleString() : "—"}</div>
            </div>
          </div>
        `;
        container.appendChild(item);
      });

      allApps.innerHTML = "";
      allApps.appendChild(container);
    } catch (err) {
      console.error("Failed to load all applications:", err);
      allApps.innerHTML = `<p class="helper">Failed to load applications.</p>`;
    }
  }

  // ----------------------------
  // helper utilities
  // ----------------------------
  function capitalize(s) {
    if (!s) return s;
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function escapeHtml(str) {
    if (!str) return "";
    return String(str).replace(/[&<>"'`=\/]/g, function(s){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','/':'&#47;','`':'&#96;','=':'&#61;'})[s]; });
  }
});
