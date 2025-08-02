let urls = [
  {
    name: "Greenland Devon",
    url: "file:///Users/kevinbueno/Documents/Work/iconnect-script/pages/Harmony.html",
    selected: true,
  },
  {
    name: "Slater Dave",
    url: "file:///Users/kevinbueno/Documents/Work/iconnect-script/pages/Harmony2.html",
    selected: true,
  },
  {
    name: "Osoria Keilan",
    url: "file:///Users/kevinbueno/Documents/Work/iconnect-script/pages/Harmony3.html",
    selected: true,
  },
];

let extractionInProgress = false;

document.addEventListener("DOMContentLoaded", function () {
  const nameInput = document.getElementById("nameInput");
  const urlInput = document.getElementById("urlInput");
  const addUrlBtn = document.getElementById("addUrl");
  const extractBtn = document.getElementById("extractBtn");
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
  const toggleAllBtn = document.getElementById("toggleAllBtn");

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
    const name = nameInput.value.trim();
    const url = urlInput.value.trim();

    if (!name) {
      showStatus("Please enter a name!", "error");
      return;
    }

    if (!url) {
      showStatus("Please enter a URL!", "error");
      return;
    }

    // Check if URL already exists
    const urlExists = urls.some((entry) => entry.url === url);
    if (urlExists) {
      showStatus("URL already exists!", "warning");
      return;
    }

    // Check if name already exists
    const nameExists = urls.some((entry) => entry.name === name);
    if (nameExists) {
      showStatus("Name already exists!", "warning");
      return;
    }

    urls.push({ name, url, selected: true });
    chrome.storage.local.set({ urls: urls });
    updateUrlList();
    updateEntryCount();
    nameInput.value = "";
    urlInput.value = "";
    showStatus("Entry added successfully!", "success");
  });

  // Extract button
  extractBtn.addEventListener("click", function () {
    if (extractionInProgress) {
      showStatus("Extraction already in progress!", "warning");
      return;
    }

    const selectedUrls = urls.filter((entry) => entry.selected);
    if (selectedUrls.length === 0) {
      showStatus("No entries selected for processing!", "error");
      return;
    }

    startExtraction(selectedUrls);
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
          // Validate that each entry has both name and url
          const validEntries = jsonData.urls.filter(
            (entry) =>
              entry &&
              typeof entry === "object" &&
              entry.name &&
              entry.url &&
              typeof entry.name === "string" &&
              typeof entry.url === "string"
          );

          if (validEntries.length !== jsonData.urls.length) {
            showStatus(
              "Some entries in JSON file are invalid (missing name or URL)!",
              "warning"
            );
          }

          // Add selected property to each entry
          urls = validEntries.map((entry) => ({ ...entry, selected: true }));
          chrome.storage.local.set({ urls: urls });
          updateUrlList();
          updateEntryCount();
          showStatus(
            `Loaded ${urls.length} entries from JSON file!`,
            "success"
          );
        } else {
          showStatus(
            "JSON file must contain a 'urls' array with objects containing 'name' and 'url' fields!",
            "error"
          );
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

  // Toggle all button event listener
  toggleAllBtn.addEventListener("click", function () {
    if (extractionInProgress) {
      showStatus("Cannot modify selections during extraction!", "warning");
      return;
    }

    toggleAllEntries();
  });

  function startExtraction(selectedUrls) {
    extractionInProgress = true;
    extractBtn.disabled = true;
    extractBtn.textContent = "Extracting...";
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

    // Extract just the URLs for the background script
    const urlList = selectedUrls.map((entry) => entry.url);

    chrome.runtime.sendMessage(
      {
        action: "extractTables",
        urls: urlList,
        entries: selectedUrls, // Pass the full entry objects with names
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
    urls.forEach((entry, index) => {
      const item = document.createElement("div");
      item.className = "url-item";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "checkbox-item";
      checkbox.checked = entry.selected !== false; // Default to true if not specified
      checkbox.onchange = function () {
        entry.selected = checkbox.checked;
        chrome.storage.local.set({ urls: urls });
        updateEntryCount();
        updateToggleButtonState();
      };

      const rowNumber = document.createElement("span");
      rowNumber.className = "row-number";
      rowNumber.textContent = (index + 1).toString();

      const urlText = document.createElement("span");
      urlText.className = "url-text";
      urlText.textContent = entry.name;

      item.appendChild(checkbox);
      item.appendChild(rowNumber);
      item.appendChild(urlText);
      urlList.appendChild(item);
    });
    updateEntryCount();
    updateToggleButtonState();
  }

  function updateEntryCount() {
    const entryCountElement = document.getElementById("entryCount");
    if (entryCountElement) {
      const selectedCount = urls.filter(
        (entry) => entry.selected !== false
      ).length;
      entryCountElement.textContent = selectedCount;
    }
  }

  function updateToggleButtonState() {
    if (!toggleAllBtn) return;

    const selectedCount = urls.filter(
      (entry) => entry.selected !== false
    ).length;
    const totalCount = urls.length;

    if (selectedCount === 0) {
      toggleAllBtn.textContent = "Select All";
      toggleAllBtn.style.background = "#64748b";
    } else if (selectedCount === totalCount) {
      toggleAllBtn.textContent = "Deselect All";
      toggleAllBtn.style.background = "#dc3545";
    } else {
      toggleAllBtn.textContent = "Select All";
      toggleAllBtn.style.background = "#64748b";
    }
  }

  function toggleAllEntries() {
    const selectedCount = urls.filter(
      (entry) => entry.selected !== false
    ).length;
    const totalCount = urls.length;

    // If all are selected, deselect all. Otherwise, select all.
    const newState = selectedCount < totalCount;

    urls.forEach((entry) => {
      entry.selected = newState;
    });

    chrome.storage.local.set({ urls: urls });
    updateUrlList();
    showStatus(
      newState ? "All entries selected!" : "All entries deselected!",
      "success"
    );
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
