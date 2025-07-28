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
  const loadDefaultsBtn = document.getElementById("loadDefaultsBtn");
  const loadJsonBtn = document.getElementById("loadJsonBtn");
  const jsonFileInput = document.getElementById("jsonFileInput");
  const urlList = document.getElementById("urlList");
  const status = document.getElementById("status");
  const progressContainer = document.getElementById("progressContainer");
  const progressStatus = document.getElementById("progressStatus");
  const progressFill = document.getElementById("progressFill");
  const progressText = document.getElementById("progressText");
  const processedCount = document.getElementById("processedCount");
  const extractedRows = document.getElementById("extractedRows");
  const errorDetails = document.getElementById("errorDetails");

  chrome.storage.local.get(["urls"], function (result) {
    if (result.urls) {
      urls = result.urls;
      updateUrlList();
    }
  });

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

  loadDefaultsBtn.addEventListener("click", function () {
    if (extractionInProgress) {
      showStatus("Cannot load defaults during extraction!", "warning");
      return;
    }

    const defaultUrls = [
      "file:///Users/kevinbueno/Documents/Work/iconnect-script/pages/Harmony.html",
      "file:///Users/kevinbueno/Documents/Work/iconnect-script/pages/Harmony2.html",
      "file:///Users/kevinbueno/Documents/Work/iconnect-script/pages/Harmony3.html",
    ];

    urls = [...defaultUrls];
    chrome.storage.local.set({ urls: urls });
    updateUrlList();
    showStatus("Default URLs loaded!", "success");
  });

  loadJsonBtn.addEventListener("click", function () {
    if (extractionInProgress) {
      showStatus("Cannot load JSON during extraction!", "warning");
      return;
    }
    jsonFileInput.click();
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

  function startExtraction() {
    extractionInProgress = true;
    extractBtn.disabled = true;
    loadDefaultsBtn.disabled = true;
    loadJsonBtn.disabled = true;
    progressContainer.style.display = "block";
    progressStatus.textContent = "Initializing extraction...";
    progressFill.style.width = "0%";
    progressText.textContent = "0%";
    processedCount.textContent = "0";
    extractedRows.textContent = "0";
    errorDetails.style.display = "none";
    errorDetails.textContent = "";

    showStatus("Starting extraction...", "info");

    chrome.runtime.sendMessage(
      {
        action: "extractTables",
        urls: urls,
      },
      function (response) {
        extractionInProgress = false;
        extractBtn.disabled = false;
        loadDefaultsBtn.disabled = false;
        loadJsonBtn.disabled = false;

        if (response && response.success) {
          showStatus("Extraction completed! Check downloads.", "success");
          progressStatus.textContent = "Extraction completed!";
          progressFill.style.width = "100%";
          progressText.textContent = "100%";
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
    }
  }

  function updateUrlList() {
    urlList.innerHTML = "";
    urls.forEach((url, index) => {
      const item = document.createElement("div");
      item.className = "url-item";
      item.textContent = url;

      const removeBtn = document.createElement("button");
      removeBtn.innerHTML = "&times;";
      removeBtn.style.cssText =
        "background: #dc3545; color: white; border: none; border-radius: 3px; padding: 2px 6px; margin-left: 10px; font-size: 12px; cursor: pointer; font-weight: bold;";
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

      item.appendChild(removeBtn);
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
