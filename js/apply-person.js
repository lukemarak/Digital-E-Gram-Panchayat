document.addEventListener("DOMContentLoaded", () => {

  const msg = document.getElementById("msg");
  const form = document.getElementById("personForm");

  // Ensure service selected
  const serviceType = sessionStorage.getItem("serviceType");
  if (!serviceType) {
    location.href = "citizen-dashboard.html";
    return;
  }

  // Same address logic
  document.getElementById("sameAddress").addEventListener("change", function () {
    const fields = ["House","Village","Block","PO","District","State","Country"];

    fields.forEach(f => {
      const cur = document.getElementById("cur" + f);
      const per = document.getElementById("per" + f);

      if (this.checked) {
        per.value = cur.value;
        per.readOnly = true;
      } else {
        per.value = "";
        per.readOnly = false;
      }
    });
  });

  // Submit
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    msg.textContent = "";

    const personData = {
      personal: {
        fullName: fullName.value.trim(),
        fatherName: fatherName.value.trim(),
        motherName: motherName.value.trim(),
        guardianName: guardianName.value.trim(),
        dob: dob.value,
        gender: gender.value,
        contactNo: contactNo.value.trim(),
        email: email.value.trim()
      },
      address: {
        current: {
          houseNo: curHouse.value,
          village: curVillage.value,
          block: curBlock.value,
          po: curPO.value,
          district: curDistrict.value,
          state: curState.value,
          country: curCountry.value
        },
        permanent: {
          houseNo: sameAddress.checked ? curHouse.value : perHouse.value,
          village: sameAddress.checked ? curVillage.value : perVillage.value,
          block: sameAddress.checked ? curBlock.value : perBlock.value,
          po: sameAddress.checked ? curPO.value : perPO.value,
          district: sameAddress.checked ? curDistrict.value : perDistrict.value,
          state: sameAddress.checked ? curState.value : perState.value,
          country: sameAddress.checked ? curCountry.value : perCountry.value
        }
      }
    };

    if (!personData.personal.fullName) {
      msg.textContent = "Full name is required.";
      return;
    }

    // Save temporarily
    sessionStorage.setItem("personData", JSON.stringify(personData));

    // Next step
    location.href = "apply-documents.html";
  });

});
