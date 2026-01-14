// js/staff.js
document.addEventListener("DOMContentLoaded", () => {
  if (!window.auth || !window.db) {
    alert("Firebase not initialized. Check console.");
    return;
  }

  const logoutBtn = document.getElementById("logoutBtn");
  const userBadge = document.getElementById("userBadge");
  const pendingList = document.getElementById("pendingList");
  const appDetails = document.getElementById("appDetails");

  let currentUser = null;
  let currentSelectedAppId = null;

  // Protect and init
  window.auth.onAuthStateChanged(async (user) => {
    if (!user) {
      window.location.href = "login.html";
      return;
    }
    currentUser = user;
    userBadge.textContent = user.email;

    // attempt to display name from /users doc
    try {
      const udoc = await window.db.collection("users").doc(user.uid).get();
      if (udoc.exists) {
        const data = udoc.data();
        userBadge.textContent = `${data.name || user.email} • ${data.role || "staff"}`;
      }
    } catch (err) {
      console.warn("Failed to read user doc:", err);
    }

    loadPending();
  });

  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await window.auth.signOut();
      window.location.href = "login.html";
    });
  }

  // Load pending applications
  async function loadPending() {
    pendingList.innerHTML = `<p class="helper">Loading pending applications...</p>`;
    try {
      const snapshot = await window.db.collection("applications")
        .where("status", "==", "pending")
        .orderBy("createdAt", "asc")
        .get();

      if (snapshot.empty) {
        pendingList.innerHTML = `<p class="helper">No pending applications.</p>`;
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
        item.style.cursor = "pointer";
        item.dataset.appId = doc.id;
        item.innerHTML = `
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div>
              <strong>${capitalize(d.type || "application")}</strong>
              <div class="note">${(d.details && d.details.fullName) || d.citizenId}</div>
            </div>
            <div class="helper">${d.createdAt ? d.createdAt.toDate().toLocaleString() : ""}</div>
          </div>
        `;

        item.addEventListener("click", () => selectApplication(doc.id));
        container.appendChild(item);
      });

      pendingList.innerHTML = "";
      pendingList.appendChild(container);
    } catch (err) {
      console.error("Error loading pending apps:", err);
      pendingList.innerHTML = `<p class="helper">Failed to load pending applications.</p>`;
    }
  }

  // Select application and show details
  async function selectApplication(appId) {
    currentSelectedAppId = appId;
    appDetails.innerHTML = `<p class="helper">Loading application details...</p>`;

    try {
      const docRef = window.db.collection("applications").doc(appId);
      const doc = await docRef.get();
      if (!doc.exists) {
        appDetails.innerHTML = `<p class="helper">Application not found.</p>`;
        return;
      }

      const d = doc.data();
      const createdAt = d.createdAt ? d.createdAt.toDate().toLocaleString() : "—";

      appDetails.innerHTML = `
        <div>
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div>
              <h3 style="margin:0;">${capitalize(d.type || "Application")}</h3>
              <div class="note">${d.details ? d.details.fullName : d.citizenId}</div>
            </div>
            <div class="badge">${(d.status || "PENDING").toUpperCase()}</div>
          </div>

          <div style="margin-top:12px;">
            <p><strong>Address:</strong> ${d.details ? escapeHtml(d.details.address) : "—"}</p>
            <p><strong>Submitted:</strong> ${createdAt}</p>
            <p><strong>Citizen ID:</strong> ${d.citizenId}</p>
          </div>

          <div style="margin-top:12px;">
            <label class="form-label">Remarks (optional)</label>
            <textarea id="staffRemarks" placeholder="Enter remarks..."></textarea>
          </div>

          <div class="form-actions" style="margin-top:10px;">
            <button id="approveBtn" class="btn">Approve</button>
            <button id="rejectBtn" class="btn outline">Reject</button>
            <button id="refreshBtn" class="btn subtle">Refresh</button>
          </div>

          <div id="actionMsg" class="helper" style="margin-top:8px;"></div>
        </div>
      `;

      // Wire buttons
      document.getElementById("approveBtn").addEventListener("click", () => takeAction("approved"));
      document.getElementById("rejectBtn").addEventListener("click", () => takeAction("rejected"));
      document.getElementById("refreshBtn").addEventListener("click", () => selectApplication(appId));

    } catch (err) {
      console.error("Error reading application:", err);
      appDetails.innerHTML = `<p class="helper">Failed to load details.</p>`;
    }
  }

  // Approve/reject action
  async function takeAction(action) {
    if (!currentSelectedAppId) return;
    const remarks = document.getElementById("staffRemarks") ? document.getElementById("staffRemarks").value.trim() : "";
    const actionMsg = document.getElementById("actionMsg");
    actionMsg.textContent = "";

    try {
      const docRef = window.db.collection("applications").doc(currentSelectedAppId);
      await docRef.update({
        status: action,
        remarks: remarks || null,
        approvedBy: currentUser.uid,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      actionMsg.textContent = `Application ${action}.`;
      // refresh lists
      loadPending();
      selectApplication(currentSelectedAppId);
    } catch (err) {
      console.error("Failed to update application:", err);
      actionMsg.textContent = "Action failed. See console.";
    }
  }

  // After approved 
  window.approveApplication = async function(appId) {
    try {
      const user = auth.currentUser;
      if (!user) {
        alert("Not logged in.");
        return;
      }

      // 1️⃣ Get staff user profile
      const staffDoc = await db.collection("users").doc(user.uid).get();
      const staffData = staffDoc.data();
      const staffUserName = staffData.name || "Panchayat Officer";

      // 2️⃣ Get application type
      const appDoc = await db.collection("applications").doc(appId).get();
      const applicationType = appDoc.data().type;

      // 3️⃣ UPDATE APPLICATION (THIS IS WHERE YOUR CODE GOES)
      await db.collection("applications").doc(appId).update({
        status: "approved",

        certificate: {
          issuedAt: firebase.firestore.FieldValue.serverTimestamp(),
          certificateNo: "DGP-" + Date.now(),
          officer: staffUserName,
          type: applicationType
        },

        approvedAt: firebase.firestore.FieldValue.serverTimestamp(),
        approvedBy: user.uid
      });

      alert("Application approved successfully!");

      // Optional: reload after approval
      if (typeof loadPendingApplications === "function") {
        loadPendingApplications();
      }

    } catch (err) {
      console.error("Approval failed:", err);
      alert("Error approving application.");
    }
  };



  function capitalize(s) {
    if (!s) return s;
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function escapeHtml(str) {
    if (!str) return "";
    return str.replace(/[&<>"'`=\/]/g, function(s){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','/':'&#47;','`':'&#96;','=':'&#61;'})[s]; });
  }
});
