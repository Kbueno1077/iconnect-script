let urls = [
  "file:///Users/kevinbueno/Documents/Work/iconnect-script/pages/Harmony.html",
  "file:///Users/kevinbueno/Documents/Work/iconnect-script/pages/Harmony2.html",
  "file:///Users/kevinbueno/Documents/Work/iconnect-script/pages/Harmony3.html",
];

let extractionInProgress = false;

document.addEventListener("DOMContentLoaded", function () {
  const urlInput = document.getElementById("urlInput");
  const addUrlBtn = document.getElementById("addUrl");
  const extractBtn = document.getElementById("extractBtn");
  const clearAllBtn = document.getElementById("clearAllBtn");
  const loadJsonBtn = document.getElementById("loadJsonBtn");
  const jsonFileInput = document.getElementById("jsonFileInput");
  const waitTimeInput = document.getElementById("waitTimeInput");
  const amountsPerPageInput = document.getElementById("amountsPerPageInput");
  const useDateFilterCheckbox = document.getElementById("useDateFilter");
  const dateFilterContainer = document.getElementById("dateFilterContainer");
  const startDateInput = document.getElementById("startDateInput");
  const endDateInput = document.getElementById("endDateInput");
  const urlList = document.getElementById("urlList");
  const status = document.getElementById("status");
  const progressContainer = document.getElementById("progressContainer");
  const progressStatus = document.getElementById("progressStatus");
  const progressFill = document.getElementById("progressFill");
  const progressText = document.getElementById("progressText");
  const processedCount = document.getElementById("processedCount");
  const extractedRows = document.getElementById("extractedRows");
  const errorDetails = document.getElementById("errorDetails");
  const cancelBtn = document.getElementById("cancelBtn");

  chrome.storage.local.get(
    [
      "urls",
      "waitTime",
      "amountsPerPage",
      "useDateFilter",
      "startDate",
      "endDate",
      "extractionState",
    ],
    function (result) {
      if (result.urls) {
        urls = result.urls;
        updateUrlList();
      }
      if (result.waitTime) {
        waitTimeInput.value = result.waitTime;
      }
      if (result.amountsPerPage) {
        amountsPerPageInput.value = result.amountsPerPage;
      }
      if (result.useDateFilter !== undefined) {
        useDateFilterCheckbox.checked = result.useDateFilter;
        dateFilterContainer.style.display = result.useDateFilter
          ? "block"
          : "none";
      }
      if (result.startDate) {
        startDateInput.value = result.startDate;
      }
      if (result.endDate) {
        endDateInput.value = result.endDate;
      }
      if (result.extractionState && result.extractionState.inProgress) {
        // Restore extraction state
        extractionInProgress = true;
        extractBtn.disabled = true;
        extractBtn.textContent = "Extracting...";
        clearAllBtn.disabled = true;
        loadJsonBtn.disabled = true;
        progressContainer.style.display = "block";

        // Restore progress data
        const state = result.extractionState;
        progressStatus.textContent =
          state.status || "Extraction in progress...";
        progressFill.style.width = state.percentage + "%";
        progressText.textContent = state.percentage + "%";
        processedCount.textContent = state.processed || 0;
        extractedRows.textContent = state.extractedRows || 0;

        showStatus("Extraction in progress...", "info");
      }
    }
  );

  addUrlBtn.addEventListener("click", function () {
    const url = urlInput.value.trim();
    if (url && !urls.includes(url)) {
      urls.push(url);
      chrome.storage.local.set({ urls: urls });
      updateUrlList();
      urlInput.value = "";
      showStatus("URL added successfully!", "success");
    } else if (urls.includes(url)) {
      showStatus("URL already exists!", "warning");
    }
  });

  // Extract button
  extractBtn.addEventListener("click", function () {
    if (extractionInProgress) {
      showStatus("Extraction already in progress!", "warning");
      return;
    }

    if (urls.length === 0) {
      showStatus("No URLs to process!", "error");
      return;
    }

    startExtraction();
  });

  clearAllBtn.addEventListener("click", function () {
    if (extractionInProgress) {
      showStatus("Cannot clear URLs during extraction!", "warning");
      return;
    }

    urls = [];
    chrome.storage.local.set({ urls: urls });
    updateUrlList();
    showStatus("All URLs cleared!", "success");
  });

  loadJsonBtn.addEventListener("click", function () {
    if (extractionInProgress) {
      showStatus("Cannot load JSON during extraction!", "warning");
      return;
    }
    jsonFileInput.click();
  });

  // Save wait time when changed
  waitTimeInput.addEventListener("change", function () {
    const waitTime = parseInt(waitTimeInput.value);
    if (waitTime >= 1 && waitTime <= 300) {
      chrome.storage.local.set({ waitTime: waitTime });
    }
  });

  // Save amounts per page when changed
  amountsPerPageInput.addEventListener("change", function () {
    const amountsPerPage = parseInt(amountsPerPageInput.value);
    if (amountsPerPage >= 1 && amountsPerPage <= 1000) {
      chrome.storage.local.set({ amountsPerPage: amountsPerPage });
    }
  });

  // Handle date filter checkbox
  useDateFilterCheckbox.addEventListener("change", function () {
    const useDateFilter = useDateFilterCheckbox.checked;
    dateFilterContainer.style.display = useDateFilter ? "block" : "none";
    chrome.storage.local.set({ useDateFilter: useDateFilter });

    // Set default dates if not already set
    if (useDateFilter && !startDateInput.value) {
      const today = new Date().toISOString().split("T")[0];
      startDateInput.value = today;
      endDateInput.value = today;
      chrome.storage.local.set({
        startDate: today,
        endDate: today,
      });
    }
  });

  // Handle start date changes
  startDateInput.addEventListener("change", function () {
    const startDate = startDateInput.value;
    chrome.storage.local.set({ startDate: startDate });

    // Ensure end date is not before start date
    if (endDateInput.value && endDateInput.value < startDate) {
      endDateInput.value = startDate;
      chrome.storage.local.set({ endDate: startDate });
    }
  });

  // Handle end date changes
  endDateInput.addEventListener("change", function () {
    const endDate = endDateInput.value;
    const startDate = startDateInput.value;

    // Ensure end date is not before start date
    if (startDate && endDate < startDate) {
      endDateInput.value = startDate;
      chrome.storage.local.set({ endDate: startDate });
    } else {
      chrome.storage.local.set({ endDate: endDate });
    }
  });

  jsonFileInput.addEventListener("change", function (event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const jsonData = JSON.parse(e.target.result);

        if (jsonData.urls && Array.isArray(jsonData.urls)) {
          urls = [...jsonData.urls];
          chrome.storage.local.set({ urls: urls });
          updateUrlList();
          showStatus(`Loaded ${urls.length} URLs from JSON file!`, "success");
        } else {
          showStatus("JSON file must contain a 'urls' array!", "error");
        }
      } catch (error) {
        showStatus("Invalid JSON file: " + error.message, "error");
      }
    };
    reader.readAsText(file);

    event.target.value = "";
  });

  // Cancel button event listener
  cancelBtn.addEventListener("click", function () {
    if (extractionInProgress) {
      cancelExtraction();
    }
  });

  function startExtraction() {
    extractionInProgress = true;
    extractBtn.disabled = true;
    extractBtn.textContent = "Extracting...";
    clearAllBtn.disabled = true;
    loadJsonBtn.disabled = true;
    progressContainer.style.display = "block";
    cancelBtn.style.display = "block";
    progressStatus.textContent = "Initializing extraction...";
    progressFill.style.width = "0%";
    progressText.textContent = "0%";
    processedCount.textContent = "0";
    extractedRows.textContent = "0";
    errorDetails.style.display = "none";
    errorDetails.textContent = "";

    // Save initial extraction state
    const extractionState = {
      inProgress: true,
      status: "Initializing extraction...",
      percentage: 0,
      processed: 0,
      extractedRows: 0,
      startTime: Date.now(),
    };
    chrome.storage.local.set({ extractionState: extractionState });

    showStatus("Starting extraction...", "info");

    const waitTime = parseInt(waitTimeInput.value) || 15;
    const amountsPerPage = parseInt(amountsPerPageInput.value) || 50;
    const useDateFilter = useDateFilterCheckbox.checked;
    const startDate = startDateInput.value;
    const endDate = endDateInput.value;

    chrome.runtime.sendMessage(
      {
        action: "extractTables",
        urls: urls,
        waitTime: waitTime,
        amountsPerPage: amountsPerPage,
        useDateFilter: useDateFilter,
        startDate: startDate,
        endDate: endDate,
      },
      function (response) {
        extractionInProgress = false;
        extractBtn.disabled = false;
        extractBtn.textContent = "Start Extracting";
        clearAllBtn.disabled = false;
        loadJsonBtn.disabled = false;
        cancelBtn.style.display = "none";

        if (response && response.success) {
          showStatus("Extraction completed! Check downloads.", "success");
          progressStatus.textContent = "Extraction completed!";
          progressFill.style.width = "100%";
          progressText.textContent = "100%";

          // Clear extraction state
          chrome.storage.local.remove("extractionState");
        } else {
          showStatus(
            "Extraction failed: " +
              (response ? response.error : "Unknown error"),
            "error"
          );
          progressStatus.textContent = "Extraction failed!";

          if (response && response.errorDetails) {
            errorDetails.style.display = "block";
            errorDetails.textContent = response.errorDetails;
          }

          // Clear extraction state
          chrome.storage.local.remove("extractionState");
        }

        setTimeout(() => {
          progressContainer.style.display = "none";
        }, 5000);
      }
    );

    chrome.runtime.onMessage.addListener(function (
      request,
      sender,
      sendResponse
    ) {
      if (request.action === "progressUpdate") {
        updateProgress(request.data);
      }
    });
  }

  function cancelExtraction() {
    // Send cancellation message to background script
    chrome.runtime.sendMessage(
      { action: "cancelExtraction" },
      function (response) {
        console.log("Cancellation sent to background script");
      }
    );

    extractionInProgress = false;
    extractBtn.disabled = false;
    extractBtn.textContent = "Start Extracting";
    clearAllBtn.disabled = false;
    loadJsonBtn.disabled = false;
    cancelBtn.style.display = "none";
    progressContainer.style.display = "none";

    // Clear extraction state
    chrome.storage.local.remove("extractionState");

    showStatus("Extraction cancelled by user.", "warning");
  }

  function updateProgress(data) {
    if (data.current && data.total) {
      const percentage = Math.round((data.current / data.total) * 100);
      progressFill.style.width = percentage + "%";
      progressText.textContent = percentage + "%";
      processedCount.textContent = data.current;
      extractedRows.textContent = data.extractedRows || 0;

      if (data.status) {
        progressStatus.textContent = data.status;
      }

      // Save current progress state
      const extractionState = {
        inProgress: true,
        status:
          data.status || `Processing page ${data.current} of ${data.total}`,
        percentage: percentage,
        processed: data.current,
        extractedRows: data.extractedRows || 0,
        startTime: Date.now(),
      };
      chrome.storage.local.set({ extractionState: extractionState });
    }
  }

  function updateUrlList() {
    urlList.innerHTML = "";
    urls.forEach((url, index) => {
      const item = document.createElement("div");
      item.className = "url-item";

      const removeBtn = document.createElement("button");
      removeBtn.className = "remove-btn";
      removeBtn.innerHTML = "&times;";
      removeBtn.onclick = function () {
        if (extractionInProgress) {
          showStatus("Cannot remove URLs during extraction!", "warning");
          return;
        }
        urls.splice(index, 1);
        chrome.storage.local.set({ urls: urls });
        updateUrlList();
        showStatus("URL removed!", "success");
      };

      const urlText = document.createElement("span");
      urlText.className = "url-text";
      urlText.textContent = url;

      item.appendChild(removeBtn);
      item.appendChild(urlText);
      urlList.appendChild(item);
    });
  }

  function showStatus(message, type) {
    status.textContent = message;
    status.className = `status ${type}`;

    if (type === "success" || type === "info") {
      setTimeout(() => {
        if (status.textContent === message) {
          status.textContent = "";
          status.className = "";
        }
      }, 5000);
    }
  }
});
