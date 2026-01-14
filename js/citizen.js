document.addEventListener("DOMContentLoaded", () => {

  if (!window.auth || !window.db) {
    alert("Firebase not initialized");
    return;
  }

  /* ELEMENTS */
  const userBadge = document.getElementById("userBadge");
  const logoutBtn = document.getElementById("logoutBtn");

  const serviceForm = document.getElementById("serviceForm");
  const serviceTypeEl = document.getElementById("serviceType");
  const serviceMsg = document.getElementById("serviceMsg");

  const personSection = document.getElementById("personSection");
  const personForm = document.getElementById("personForm");
  const personMsg = document.getElementById("personMsg");

  const documentSection = document.getElementById("documentSection");
  const docForm = document.getElementById("docForm");
  const docLabel1 = document.getElementById("docLabel1");
  const docLabel2 = document.getElementById("docLabel2");
  const docMsg = document.getElementById("docMsg");

  let currentUser = null;
  let selectedService = null;
  let personData = {};
  let documentPaths = [];

  /* AUTH */
  auth.onAuthStateChanged(async (user) => {
    if (!user) return location.href = "login.html";
    currentUser = user;
    if (userBadge) userBadge.textContent = user.email;
  });

  logoutBtn.onclick = async () => {
    await auth.signOut();
    location.href = "login.html";
  };

  /* STEP 1 — SERVICE */
  serviceForm.addEventListener("submit", e => {
    e.preventDefault();

    selectedService = serviceTypeEl.value;
    if (!selectedService) {
      serviceMsg.textContent = "Select a service.";
      return;
    }

    configurePersonForm(selectedService);
    personSection.style.display = "block";
    personSection.scrollIntoView({ behavior: "smooth" });

    serviceMsg.textContent = "Service selected.";
  });

  /* STEP 2 — PERSON */
  personForm.addEventListener("submit", e => {
    e.preventDefault();

    personData = {
      fullName: pFullName.value.trim(),
      fatherName: pFather.value.trim(),
      motherName: pMother.value.trim(),
      guardianName: pGuardian.value.trim(),
      dob: pDob.value,
      gender: pGender.value,
      contact: pContact.value.trim()
    };

    if (!personData.fullName) {
      personMsg.textContent = "Full name required.";
      return;
    }

    setupDocuments(selectedService);
    documentSection.style.display = "block";
    documentSection.scrollIntoView({ behavior: "smooth" });

    personMsg.textContent = "Person details saved.";
  });

  /* STEP 3 — DOCUMENTS */
  docForm.addEventListener("submit", async e => {
    e.preventDefault();
    docMsg.textContent = "Uploading...";

    try {
      const f1 = docFile1.files[0];
      const f2 = docFile2.files[0];
      if (!f1 || !f2) {
        docMsg.textContent = "Both documents required.";
        return;
      }

      const appTempId = Date.now(); // temp id for folder
      const p1 = await uploadFile(f1, appTempId, "doc1");
      const p2 = await uploadFile(f2, appTempId, "doc2");

      documentPaths = [p1, p2];

      docMsg.textContent =
        "Documents uploaded successfully. Ready to submit application.";

      console.log("DOCUMENT PATHS:", documentPaths);

      /*
        STEP 4:
        Save application to Firestore
      */

    } catch (err) {
      console.error(err);
      docMsg.textContent = "Upload failed.";
    }
  });

  /* HELPERS */

  function configurePersonForm(service) {
    personForm.reset();
    pFather.required = service !== "income";
    pDob.required = service === "birth";
  }

  function setupDocuments(service) {
    const map = {
      prc: ["Residence Proof", "ID Proof"],
      scst: ["Caste Proof", "Residence Proof"],
      birth: ["Birth Proof", "Parent ID Proof"],
      income: ["Income Proof", "Residence Proof"]
    };
    [docLabel1.textContent, docLabel2.textContent] = map[service];
  }

  async function uploadFile(file, appId, label) {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("appId", appId);
    fd.append("label", label);

    const res = await fetch("upload.php", {
      method: "POST",
      body: fd
    });

    const data = await res.json();
    if (!data.success) throw new Error("Upload failed");
    return data.path;
  }

});
