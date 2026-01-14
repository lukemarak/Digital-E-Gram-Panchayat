document.addEventListener("DOMContentLoaded", () => {

  if (!window.auth || !window.db) {
    alert("Firebase not initialized");
    return;
  }

  const userBadge = document.getElementById("userBadge");
  const logoutBtn = document.getElementById("logoutBtn");
  const serviceForm = document.getElementById("serviceForm");
  const serviceTypeEl = document.getElementById("serviceType");
  const msg = document.getElementById("msg");

  let currentUser = null;

  /* =========================
     AUTH GUARD
     ========================= */
  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      location.href = "login.html";
      return;
    }

    currentUser = user;

    try {
      const ref = db.collection("users").doc(user.uid);
      const snap = await ref.get();

      if (!snap.exists) {
        await ref.set({
          role: "user",
          email: user.email,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        userBadge.textContent = user.email;
      } else {
        const u = snap.data();
        userBadge.textContent = u.name || u.email || user.email;
      }
    } catch (err) {
      console.error(err);
      userBadge.textContent = user.email;
    }

    // 🔥 Load citizen applications
  loadMyApplications(user.uid);
  });

  /* =========================
     LOGOUT
     ========================= */
  logoutBtn.addEventListener("click", async () => {
    await auth.signOut();
    location.href = "login.html";
  });

  /* =========================
     SERVICE SELECTION
     ========================= */
  serviceForm.addEventListener("submit", (e) => {
    e.preventDefault();
    msg.textContent = "";

    const service = serviceTypeEl.value;
    if (!service) {
      msg.textContent = "Please select a service.";
      return;
    }

    // Save selection temporarily
    sessionStorage.setItem("serviceType", service);

    // Go to next step
    location.href = "apply-person.html";
  });

  /* =========================
   LOAD MY APPLICATIONS
   ========================= */

const applicationsList = document.getElementById("applicationsList");

async function loadMyApplications(userId) {
  if (!applicationsList) return;

  applicationsList.innerHTML =
    "<p class='helper'>Loading applications…</p>";

  try {
    const snap = await db
      .collection("applications")
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .get();

    if (snap.empty) {
      applicationsList.innerHTML =
        "<p class='helper'>No applications submitted yet.</p>";
      return;
    }

    applicationsList.innerHTML = "";

    snap.forEach(doc => {
      const d = doc.data();

      const serviceMap = {
        prc: "Permanent Residence Certificate",
        scst: "SC / ST Certificate",
        birth: "Birth Certificate",
        income: "Income Certificate"
      };

      const date = d.createdAt
        ? d.createdAt.toDate().toLocaleString()
        : "-";

      const statusClass =
        d.status === "approved" ? "success" :
        d.status === "rejected" ? "danger" :
        "warning";

      const docsHtml = (d.attachments || []).map(a =>
        `<li><a href="${a.path}" target="_blank">${a.label}</a></li>`
      ).join("");

      const card = document.createElement("div");
      card.className = "card mt-8";

      card.innerHTML = `
        <strong>${serviceMap[d.serviceType]}</strong>
        <div class="note">
          Applicant: ${d.person.fullName}
        </div>

        <div class="mt-8">
          <small>Submitted: ${date}</small>
        </div>

        <div class="mt-8">
          <span class="badge ${statusClass}">
            ${d.status.toUpperCase()}
          </span>
        </div>

        <div class="mt-8">
          <strong>Documents</strong>
          <ul>${docsHtml || "<li>No documents</li>"}</ul>
        </div>

        ${
          d.status === "approved"
            ? `<p class="note mt-8">Approved by Panchayat</p>`
            : d.status === "rejected"
              ? `<p class="note danger mt-8">
                   Rejected: ${d.rejectionReason || "—"}
                 </p>`
              : ""
        }

        ${
          d.status === "approved" && d.certificate
            ? `<a href="${d.certificate.filePath}" class="btn mt-8" target="_blank">
                Download Certificate
              </a>`
            : ""
        }

      `;

      applicationsList.appendChild(card);
    });

  } catch (err) {
    console.error(err);
    applicationsList.innerHTML =
      "<p class='helper'>Failed to load applications.</p>";
  }
}

});
