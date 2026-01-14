document.addEventListener("DOMContentLoaded", () => {

  if (!window.auth || !window.db) {
    alert("Firebase not initialized");
    return;
  }

  const previewContent = document.getElementById("previewContent");
  const submitBtn = document.getElementById("submitBtn");
  const msg = document.getElementById("msg");

  // Load stored data
  const serviceType = sessionStorage.getItem("serviceType");
  const personData = JSON.parse(sessionStorage.getItem("personData"));
  const attachments = JSON.parse(sessionStorage.getItem("attachments"));

  if (!serviceType || !personData || !attachments) {
    location.href = "citizen-dashboard.html";
    return;
  }

  const serviceNames = {
    prc: "Permanent Residence Certificate (PRC)",
    scst: "SC / ST Certificate",
    birth: "Birth Certificate",
    income: "Income Certificate"
  };

  // Build preview HTML
  previewContent.innerHTML = `
    <h4>Service</h4>
    <p>${serviceNames[serviceType]}</p>

    <h4>Person Details</h4>
    <p>
      <strong>Name:</strong> ${personData.personal.fullName}<br>
      <strong>Father:</strong> ${personData.personal.fatherName || "-"}<br>
      <strong>Mother:</strong> ${personData.personal.motherName || "-"}<br>
      <strong>Guardian:</strong> ${personData.personal.guardianName || "-"}<br>
      <strong>DOB:</strong> ${personData.personal.dob || "-"}<br>
      <strong>Gender:</strong> ${personData.personal.gender || "-"}<br>
      <strong>Contact:</strong> ${personData.personal.contactNo}<br>
      <strong>Email:</strong> ${personData.personal.email || "-"}
    </p>

    <h4>Current Address</h4>
    <p>
      ${Object.values(personData.address.current).join(", ")}
    </p>

    <h4>Permanent Address</h4>
    <p>
      ${Object.values(personData.address.permanent).join(", ")}
    </p>

    <h4>Uploaded Documents</h4>
    <ul>
      ${attachments.map(a =>
        `<li><a href="${a.path}" target="_blank">${a.label}</a></li>`
      ).join("")}
    </ul>
  `;

  // Submit application
  submitBtn.addEventListener("click", async () => {
    submitBtn.disabled = true;
    msg.textContent = "Submitting application...";

    try {
      const user = auth.currentUser;
      if (!user) {
        location.href = "login.html";
        return;
      }

      await db.collection("applications").add({
        userId: user.uid,
        serviceType,
        person: personData.personal,
        address: personData.address,
        attachments,
        status: "pending",
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      // Clear temp data
      sessionStorage.removeItem("serviceType");
      sessionStorage.removeItem("personData");
      sessionStorage.removeItem("attachments");
      sessionStorage.removeItem("tempAppId");

      msg.textContent =
        "Application submitted successfully! Redirecting...";

      setTimeout(() => {
        location.href = "citizen-dashboard.html";
      }, 1500);

    } catch (err) {
      console.error(err);
      msg.textContent = "Submission failed. Please try again.";
      submitBtn.disabled = false;
    }
  });

});
