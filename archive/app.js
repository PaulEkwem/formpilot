document.addEventListener("DOMContentLoaded", async () => {
  const form = document.getElementById("formFiller");
  const fillBtn = document.getElementById("fillBtn");
  const previewBtn = document.getElementById("previewBtn");
  const nextBtn = document.getElementById("nextBtn");
  const prevBtn = document.getElementById("prevBtn");
  const clearDraftBtn = document.getElementById("clearDraftBtn");
  const statusDiv = document.getElementById("status");
  const previewDiv = document.getElementById("preview");
  const progressFill = document.getElementById("progressFill");
  const formSteps = Array.from(document.querySelectorAll(".form-step"));
  const stepIndicators = Array.from(document.querySelectorAll(".step"));
  const DRAFT_KEY = "gtbank-onboarding-draft";

  const defaultMappings = {
    "sole-proprietorship": {
      businessName: { x: 92, y: 665, page: 0, fontSize: 11 },
      registrationNumber: { x: 318, y: 665, page: 0, fontSize: 11 },
      contactName: { x: 92, y: 637, page: 0, fontSize: 11 },
      bvn: { x: 318, y: 637, page: 0, fontSize: 11 },
      phone: { x: 92, y: 609, page: 0, fontSize: 11 },
      email: { x: 318, y: 609, page: 0, fontSize: 11 },
      address: {
        x: 92,
        y: 575,
        page: 0,
        fontSize: 10,
        multiline: true,
        maxWidth: 420,
        lineHeight: 12,
      },
      accountType: { x: 92, y: 525, page: 0, fontSize: 11 },
      businessType: { x: 318, y: 525, page: 0, fontSize: 11 },
      idType: { x: 92, y: 497, page: 0, fontSize: 11 },
      idNumber: { x: 318, y: 497, page: 0, fontSize: 11 },
      tin: { x: 92, y: 468, page: 0, fontSize: 11 },
    },
    corporate: {
      businessName: { x: 96, y: 684, page: 0, fontSize: 11 },
      registrationNumber: { x: 328, y: 684, page: 0, fontSize: 11 },
      contactName: { x: 96, y: 654, page: 0, fontSize: 11 },
      phone: { x: 328, y: 654, page: 0, fontSize: 11 },
      email: { x: 96, y: 624, page: 0, fontSize: 11 },
      bvn: { x: 328, y: 624, page: 0, fontSize: 11 },
      address: {
        x: 96,
        y: 590,
        page: 0,
        fontSize: 10,
        multiline: true,
        maxWidth: 430,
        lineHeight: 12,
      },
      accountType: { x: 96, y: 538, page: 0, fontSize: 11 },
      businessType: { x: 328, y: 538, page: 0, fontSize: 11 },
      idType: { x: 96, y: 510, page: 0, fontSize: 11 },
      idNumber: { x: 328, y: 510, page: 0, fontSize: 11 },
      tin: { x: 96, y: 482, page: 0, fontSize: 11 },
    },
    trustees: {},
    "unincorporated-society": {},
    "corporate-internet-banking": {},
  };

  let fieldMappings = { ...defaultMappings };
  let currentStep = 0;

  function showStatus(message, type = "info") {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
  }

  async function loadFieldMappings() {
    try {
      const response = await fetch("fieldMappings.json");
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const loadedMappings = await response.json();
      fieldMappings = { ...fieldMappings, ...loadedMappings };
    } catch (error) {
      console.warn("Using built-in sample mappings:", error);
      showStatus(
        "Using built-in sample coordinates. Fine-tune `fieldMappings.json` for exact placement.",
        "info",
      );
    }
  }

  function getFormData() {
    const formTemplateSelect = document.getElementById("formTemplate");

    return {
      formTemplate: formTemplateSelect.value,
      formTemplateLabel:
        formTemplateSelect.options[formTemplateSelect.selectedIndex]?.text ||
        "",
      accountType: document.getElementById("accountType").value.trim(),
      businessName: document.getElementById("businessName").value.trim(),
      businessType: document.getElementById("businessType").value.trim(),
      registrationNumber: document
        .getElementById("registrationNumber")
        .value.trim(),
      tin: document.getElementById("tin").value.trim(),
      address: document.getElementById("address").value.trim(),
      accountPurpose: document.getElementById("accountPurpose").value.trim(),
      contactName: document.getElementById("contactName").value.trim(),
      bvn: document.getElementById("bvn").value.trim(),
      phone: document.getElementById("phone").value.trim(),
      email: document.getElementById("email").value.trim(),
      idType: document.getElementById("idType").value.trim(),
      idNumber: document.getElementById("idNumber").value.trim(),
    };
  }

  function saveDraft() {
    const draft = getFormData();
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }

  function restoreDraft() {
    const savedDraft = localStorage.getItem(DRAFT_KEY);
    if (!savedDraft) {
      return;
    }

    try {
      const draft = JSON.parse(savedDraft);
      Object.entries(draft).forEach(([key, value]) => {
        const element = document.getElementById(key);
        if (element && element.type !== "file") {
          element.value = value || "";
        }
      });

      showStatus(
        "Draft restored on this browser. Continue from where you stopped.",
        "info",
      );
    } catch (error) {
      console.warn("Failed to restore draft:", error);
    }
  }

  function clearDraft() {
    localStorage.removeItem(DRAFT_KEY);
    form.reset();
    currentStep = 0;
    updateStepUI();
    updateSummary();
    showStatus(
      "Draft cleared. You can start a fresh onboarding session.",
      "info",
    );
  }

  function updateStepUI() {
    formSteps.forEach((section, index) => {
      const isActive = index === currentStep;
      section.hidden = !isActive;
      section.classList.toggle("active", isActive);
    });

    stepIndicators.forEach((step, index) => {
      step.classList.toggle("active", index === currentStep);
      step.classList.toggle("complete", index < currentStep);
    });

    const progress = (currentStep / (formSteps.length - 1)) * 100;
    progressFill.style.width = `${progress}%`;

    prevBtn.hidden = currentStep === 0;
    nextBtn.hidden = currentStep >= formSteps.length - 1;
    previewBtn.hidden = currentStep !== 2;
    fillBtn.hidden = currentStep !== formSteps.length - 1;
  }

  function validateCurrentStep() {
    const requiredFields = Array.from(
      formSteps[currentStep].querySelectorAll("[required]"),
    );

    for (const field of requiredFields) {
      if (!field.reportValidity()) {
        return false;
      }
    }

    if (currentStep === 2) {
      const { bvn } = getFormData();
      if (bvn.length !== 11 || !/^\d+$/.test(bvn)) {
        showStatus("BVN must be exactly 11 digits.", "error");
        return false;
      }
    }

    return true;
  }

  function updateSummary() {
    const data = getFormData();
    const items = [
      ["GTBank template", data.formTemplateLabel || "Not selected"],
      ["Product", data.accountType || "Not provided"],
      ["Business name", data.businessName || "Not provided"],
      ["Entity type", data.businessType || "Not provided"],
      ["Registration no.", data.registrationNumber || "Not provided"],
      ["TIN", data.tin || "Not provided"],
      ["Registered address", data.address || "Not provided"],
      ["Purpose", data.accountPurpose || "Not provided"],
      ["Primary contact", data.contactName || "Not provided"],
      ["BVN", data.bvn || "Not provided"],
      ["Phone", data.phone || "Not provided"],
      ["Email", data.email || "Not provided"],
      ["ID type", data.idType || "Not provided"],
      ["ID number", data.idNumber || "Not provided"],
    ];

    previewDiv.innerHTML = items
      .map(
        ([label, value]) => `
          <div class="summary-item">
            <span>${label}</span>
            <strong>${value}</strong>
          </div>`,
      )
      .join("");
  }

  function wrapText(text, font, fontSize, maxWidth) {
    const words = String(text).split(/\s+/);
    const lines = [];
    let currentLine = "";

    words.forEach((word) => {
      const candidate = currentLine ? `${currentLine} ${word}` : word;
      const width = font.widthOfTextAtSize(candidate, fontSize);

      if (width <= maxWidth || !currentLine) {
        currentLine = candidate;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    });

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }

  function drawMappedText(page, value, mapping, font) {
    const safeValue = String(value || "").trim();
    if (!safeValue) {
      return;
    }

    const fontSize = mapping.fontSize || 11;
    const maxWidth = mapping.maxWidth || 400;
    const lineHeight = mapping.lineHeight || fontSize + 2;
    const lines = mapping.multiline
      ? wrapText(safeValue, font, fontSize, maxWidth)
      : safeValue.split("\n");

    lines.forEach((line, index) => {
      page.drawText(line, {
        x: mapping.x,
        y: mapping.y - index * lineHeight,
        size: fontSize,
        font,
        color: PDFLib.rgb(0.08, 0.08, 0.08),
      });
    });
  }

  async function fillPDF(pdfBytes, formData) {
    const mappingKey = formData.formTemplate;
    const mappings = fieldMappings[mappingKey];

    if (!mappingKey) {
      throw new Error(
        "Please choose the exact GTBank template before generating the PDF.",
      );
    }

    if (!mappings || Object.keys(mappings).length === 0) {
      throw new Error(
        "This template has not been calibrated yet. Add its coordinates in `fieldMappings.json` first.",
      );
    }

    const pdfDoc = await PDFLib.PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();
    const font = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);

    Object.entries(mappings).forEach(([fieldName, mapping]) => {
      const page = pages[mapping.page];
      if (!page) {
        return;
      }

      drawMappedText(page, formData[fieldName], mapping, font);
    });

    return pdfDoc.save();
  }

  function downloadPDF(bytes, filename) {
    const blob = new Blob([bytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }

  nextBtn.addEventListener("click", () => {
    if (!validateCurrentStep()) {
      return;
    }

    currentStep = Math.min(currentStep + 1, formSteps.length - 1);
    if (currentStep === 3) {
      updateSummary();
      showStatus("Review the details and generate the final bank PDF.", "info");
    }
    updateStepUI();
  });

  prevBtn.addEventListener("click", () => {
    currentStep = Math.max(currentStep - 1, 0);
    updateStepUI();
  });

  previewBtn.addEventListener("click", () => {
    if (!validateCurrentStep()) {
      return;
    }

    updateSummary();
    currentStep = 3;
    updateStepUI();
    showStatus(
      "Review ready. If everything looks right, download the final PDF.",
      "info",
    );
  });

  clearDraftBtn.addEventListener("click", clearDraft);

  stepIndicators.forEach((stepButton, index) => {
    stepButton.addEventListener("click", () => {
      if (index > currentStep && !validateCurrentStep()) {
        return;
      }

      currentStep = index;
      if (currentStep === 3) {
        updateSummary();
      }
      updateStepUI();
    });
  });

  form.addEventListener("input", () => {
    saveDraft();
    if (currentStep === 3) {
      updateSummary();
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!validateCurrentStep()) {
      return;
    }

    const pdfFile = document.getElementById("pdfTemplate").files[0];
    if (!pdfFile) {
      showStatus("Please upload the original GTBank PDF file first.", "error");
      return;
    }

    const formData = getFormData();
    fillBtn.disabled = true;
    fillBtn.textContent = "Generating...";
    showStatus("Generating the bank-ready PDF now...", "info");

    try {
      const pdfBytes = await pdfFile.arrayBuffer();
      const filledPdfBytes = await fillPDF(pdfBytes, formData);
      const filename = `${formData.formTemplate || "gtbank"}_${Date.now()}.pdf`;

      downloadPDF(filledPdfBytes, filename);
      showStatus(
        "PDF generated successfully and download has started.",
        "success",
      );
    } catch (error) {
      console.error(error);
      showStatus(error.message || "Failed to generate the PDF.", "error");
    } finally {
      fillBtn.disabled = false;
      fillBtn.textContent = "Generate & Download PDF";
    }
  });

  await loadFieldMappings();
  restoreDraft();
  updateSummary();
  updateStepUI();
});
