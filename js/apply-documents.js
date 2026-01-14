document.addEventListener("DOMContentLoaded", () => {

  const msg = document.getElementById("msg");
  const docForm = document.getElementById("docForm");
  const docLabel1 = document.getElementById("docLabel1");
  const docLabel2 = document.getElementById("docLabel2");
  const serviceTitle = document.getElementById("serviceTitle");

  // Read stored data
  const serviceType = sessionStorage.getItem("serviceType");
  const personData = sessionStorage.getItem("personData");

  if (!serviceType || !personData) {
    location.href = "citizen-dashboard.html";
    return;
  }

  // Service → document mapping
  const docMap = {
    prc: ["Residence Proof", "Identity Proof"],
    scst: ["Caste Proof", "Residence Proof"],
    birth: ["Birth Proof", "Parent Identity Proof"],
    income: ["Income Proof", "Residence Proof"]
  };

  const titles = {
    prc: "Permanent Residence Certificate",
    scst: "SC / ST Certificate",
    birth: "Birth Certificate",
    income: "Income Certificate"
  };

  serviceTitle.textContent = titles[serviceType] + " – Documents";
  [docLabel1.textContent, docLabel2.textContent] = docMap[serviceType];

  // Upload helper
  async function uploadFile(file, appId, label) {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("appId", appId);
    fd.append("label", label);

    const res = await fetch("upload.php", {
      method: "POST",
      body: fd
    });

    if (!res.ok) {
      throw new Error("Upload failed: " + res.status);
    }

    const data = await res.json();
    if (!data.success) throw new Error("Upload failed");

    return data.path;
  }

  // Submit documents
  docForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    msg.textContent = "Uploading documents…";

    try {
      const f1 = docFile1.files[0];
      const f2 = docFile2.files[0];

      if (!f1 || !f2) {
        msg.textContent = "Both documents are required.";
        return;
      }

      // Temporary ID for folder
      const tempAppId = Date.now().toString();

      const path1 = await uploadFile(f1, tempAppId, "doc1");
      const path2 = await uploadFile(f2, tempAppId, "doc2");

      const attachments = [
        { label: docLabel1.textContent, path: path1 },
        { label: docLabel2.textContent, path: path2 }
      ];

      // Save for preview
      sessionStorage.setItem("attachments", JSON.stringify(attachments));
      sessionStorage.setItem("tempAppId", tempAppId);

      // Next step
      location.href = "apply-preview.html";

    } catch (err) {
      console.error(err);
      msg.textContent = "Upload failed. Please try again.";
    }
  });

});
