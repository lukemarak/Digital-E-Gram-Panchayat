document.addEventListener("DOMContentLoaded", () => {

  if (!window.auth || !window.db) {
    alert("Firebase not initialized");
    return;
  }

  const staffBadge = document.getElementById("staffBadge");
  const logoutBtn = document.getElementById("logoutBtn");
  const pendingList = document.getElementById("pendingList");
  const detailsPane = document.getElementById("detailsPane");

  const filterPending = document.getElementById("filterPending");
  const filterApproved = document.getElementById("filterApproved");
  const filterRejected = document.getElementById("filterRejected");

  let currentStaff = null;
  let selectedAppId = null;
  let currentFilter = "pending";

  /* =========================
     FILTER BUTTONS
     ========================= */
  filterPending.onclick = () => {
    currentFilter = "pending";
    loadApplicationsByStatus("pending");
  };

  filterApproved.onclick = () => {
    currentFilter = "approved";
    loadApplicationsByStatus("approved");
  };

  filterRejected.onclick = () => {
    currentFilter = "rejected";
    loadApplicationsByStatus("rejected");
  };

  /* =========================
     AUTH + ROLE CHECK
     ========================= */
  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      location.href = "login.html";
      return;
    }

    const snap = await db.collection("users").doc(user.uid).get();
    if (!snap.exists || !["staff", "admin"].includes(snap.data().role)) {
      alert("Unauthorized access");
      location.href = "login.html";
      return;
    }

    currentStaff = user;
    staffBadge.textContent = snap.data().name || user.email;

    loadApplicationsByStatus("pending");
  });

  /* =========================
     LOGOUT
     ========================= */
  logoutBtn.onclick = async () => {
    await auth.signOut();
    location.href = "login.html";
  };

  /* =========================
     LOAD APPLICATIONS BY STATUS
     ========================= */
  async function loadApplicationsByStatus(status) {
    pendingList.innerHTML = "<p class='helper'>Loading…</p>";
    detailsPane.innerHTML =
      "<p class='helper'>Select an application to view details.</p>";

    try {
      const snap = await db
        .collection("applications")
        .where("status", "==", status)
        .orderBy("createdAt", "desc")
        .get();

      if (snap.empty) {
        pendingList.innerHTML =
          `<p class='helper'>No ${status} applications.</p>`;
        return;
      }

      pendingList.innerHTML = "";

      snap.forEach(doc => {
        const d = doc.data();

        const card = document.createElement("div");
        card.className = "card mt-8";
        card.style.cursor = "pointer";

        card.innerHTML = `
          <strong>${(d.serviceType || d.type || "UNKNOWN").toUpperCase()}</strong>
          <div class="note">${d.person?.fullName || "—"}</div>
          <small>${d.createdAt?.toDate().toLocaleString() || "-"}</small>
        `;

        card.onclick = () => loadApplicationDetails(doc.id, d);
        pendingList.appendChild(card);
      });

    } catch (err) {
      console.error(err);
      pendingList.innerHTML =
        "<p class='helper'>Failed to load applications.</p>";
    }
  }

  /* =========================
     LOAD APPLICATION DETAILS
     ========================= */
  function loadApplicationDetails(appId, d) {
    selectedAppId = appId;

    const attachmentsHtml =
      d.attachments && d.attachments.length
        ? d.attachments.map(a =>
            `<li><a href="${a.path}" target="_blank">${a.label}</a></li>`
          ).join("")
        : "<li>No supporting documents uploaded</li>";

    const certificateHtml =
      d.certificate && d.certificate.filePath
        ? `
          <strong class="mt-8">Issued Certificate</strong>
          <ul>
            <li>
              <a href="${d.certificate.filePath}" target="_blank">
                Download Certificate
              </a>
            </li>
          </ul>
        `
        : "";

    const rejectionHtml =
      d.status === "rejected" && d.rejectionReason
        ? `
          <p class="note danger mt-8">
            <strong>Rejection Reason:</strong><br>
            ${d.rejectionReason}
          </p>
        `
        : "";

    detailsPane.innerHTML = `
      <h4>${(d.serviceType || d.type || "UNKNOWN").toUpperCase()}</h4>

      <strong>Person Details</strong>
      <p>
        Name: ${d.person.fullName}<br>
        Father: ${d.person.fatherName || "-"}<br>
        Mother: ${d.person.motherName || "-"}<br>
        Contact: ${d.person.contactNo}
      </p>

      <strong>Current Address</strong>
      <p>${Object.values(d.address.current).join(", ")}</p>

      <strong>Permanent Address</strong>
      <p>${Object.values(d.address.permanent).join(", ")}</p>

      <strong>Supporting Documents</strong>
      <ul>${attachmentsHtml}</ul>

      ${certificateHtml}
      ${rejectionHtml}

      ${
        d.status === "pending"
          ? `
            <textarea id="remarks"
              placeholder="Remarks (required for rejection)"
              class="mt-8"></textarea>

            <strong class="mt-8">Upload Signed Certificate (PDF)</strong>
            <input type="file" id="certFile" accept="application/pdf" />

            <div class="form-actions mt-8">
              <button class="btn success" onclick="uploadCertificate()">
                Approve & Upload
              </button>
              <button class="btn danger" onclick="rejectApp()">
                Reject
              </button>
            </div>
          `
          : ""
      }
    `;
  }

  /* =========================
     REJECT APPLICATION
     ========================= */
  window.rejectApp = async () => {
    if (!selectedAppId) return;

    const remarks = document.getElementById("remarks").value.trim();
    if (!remarks) {
      alert("Please enter rejection reason.");
      return;
    }

    await db.collection("applications").doc(selectedAppId).update({
      status: "rejected",
      rejectionReason: remarks,
      rejectedAt: firebase.firestore.FieldValue.serverTimestamp(),
      rejectedBy: currentStaff.uid
    });

    detailsPane.innerHTML =
      "<p class='helper danger'>Application rejected.</p>";

    loadApplicationsByStatus(currentFilter);
  };

  /* =========================
     UPLOAD CERTIFICATE + APPROVE
     ========================= */
  window.uploadCertificate = async () => {
    const fileInput = document.getElementById("certFile");
    if (!fileInput.files.length) {
      alert("Please select certificate PDF.");
      return;
    }

    const fd = new FormData();
    fd.append("file", fileInput.files[0]);
    fd.append("appId", selectedAppId);

    const res = await fetch("upload-certificate.php", {
      method: "POST",
      body: fd
    });

    const data = await res.json();
    if (!data.success) {
      alert("Certificate upload failed.");
      return;
    }

    await db.collection("applications").doc(selectedAppId).update({
      status: "approved",
      certificate: {
        filePath: data.path,
        issuedAt: firebase.firestore.FieldValue.serverTimestamp(),
        issuedBy: currentStaff.uid
      }
    });

    detailsPane.innerHTML =
      "<p class='helper success'>Certificate uploaded & application approved.</p>";

    loadApplicationsByStatus(currentFilter);
  };

  // status filfer 
  function setActiveFilter(activeBtn) {
    document.querySelectorAll(".btn.outline").forEach(btn =>
      btn.classList.remove("active")
    );
    activeBtn.classList.add("active");
  }

  filterPending.onclick = () => {
    setActiveFilter(filterPending);
    loadApplicationsByStatus("pending");
  };

  filterApproved.onclick = () => {
    setActiveFilter(filterApproved);
    loadApplicationsByStatus("approved");
  };

  filterRejected.onclick = () => {
    setActiveFilter(filterRejected);
    loadApplicationsByStatus("rejected");
  };


});
