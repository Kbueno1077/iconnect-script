// Background script for Table Data Extractor extension

let allExtractedData = [];
let startTime = new Date();
let currentUrlIndex = 0;
let totalUrls = 0;
let totalExtractedRows = 0;
let errors = [];
let extractionCancelled = false;

// Listen for messages from popup
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === "extractTables") {
    // Reset cancellation flag
    extractionCancelled = false;

    const waitTime = request.waitTime || 15;
    const amountsPerPage = request.amountsPerPage || 50;
    const useDateFilter = request.useDateFilter || false;
    const startDate = request.startDate || "";
    const endDate = request.endDate || "";

    extractTablesFromUrls(
      request.urls,
      sendResponse,
      waitTime,
      amountsPerPage,
      useDateFilter,
      startDate,
      endDate
    );
    return true; // Keep message channel open for async response
  } else if (request.action === "cancelExtraction") {
    extractionCancelled = true;
    sendResponse({ success: true, message: "Extraction cancelled" });
    return true;
  }
});

async function extractTablesFromUrls(
  urls,
  sendResponse,
  waitTime = 15,
  amountsPerPage = 50,
  useDateFilter = false,
  startDate = "",
  endDate = ""
) {
  try {
    // Reset state
    allExtractedData = [];
    startTime = new Date();
    currentUrlIndex = 0;
    totalUrls = urls.length;
    totalExtractedRows = 0;
    errors = [];

    // Save extraction state to storage
    const extractionState = {
      inProgress: true,
      status: "Initializing extraction...",
      percentage: 0,
      processed: 0,
      extractedRows: 0,
      startTime: Date.now(),
    };
    await chrome.storage.local.set({ extractionState: extractionState });

    // Send initial progress
    sendProgressUpdate();

    for (let i = 0; i < urls.length; i++) {
      // Check for cancellation
      if (extractionCancelled) {
        console.log("Extraction cancelled by user");
        sendProgressUpdate("Extraction cancelled by user");

        // Clear extraction state
        await chrome.storage.local.remove("extractionState");

        sendResponse({
          success: false,
          error: "Extraction cancelled by user",
        });
        return;
      }

      const url = urls[i];
      currentUrlIndex = i + 1;

      console.log(`Processing URL ${i + 1}/${urls.length}: ${url}`);

      try {
        // Update progress - opening tab
        sendProgressUpdate(`Opening ${url.split("/").pop()}...`);

        // Create a new tab for each URL
        const tab = await chrome.tabs.create({
          url: url,
          active: false,
        });

        // Wait for page to load
        sendProgressUpdate(`Loading page...`);
        await new Promise((resolve) => setTimeout(resolve, waitTime * 1000));

        // Extract data from the page
        sendProgressUpdate(`Extracting table data...`);
        const response = await chrome.tabs.sendMessage(tab.id, {
          action: "extractTableData",
          amountsPerPage: amountsPerPage,
          useDateFilter: useDateFilter,
          startDate: startDate,
          endDate: endDate,
        });

        if (response && response.success && response.data) {
          allExtractedData.push(response.data);
          totalExtractedRows += response.data.rows.length;
          console.log(
            `✅ Extracted ${response.data.rows.length} rows from "${response.data.consumerName}"`
          );
          sendProgressUpdate(
            `Extracted ${response.data.rows.length} rows from ${response.data.consumerName}`
          );
        } else {
          console.log(`⚠️ No data extracted from ${url}`);
          errors.push(`No data found in ${url.split("/").pop()}`);
          sendProgressUpdate(`No data found in ${url.split("/").pop()}`);
        }

        // Close the tab
        await chrome.tabs.remove(tab.id);

        // Wait between pages
        if (i < urls.length - 1) {
          sendProgressUpdate(`Waiting before next page...`);
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      } catch (error) {
        console.error(`❌ Error processing ${url}:`, error);
        errors.push(
          `Error processing ${url.split("/").pop()}: ${error.message}`
        );
        sendProgressUpdate(`Error processing ${url.split("/").pop()}`);
      }
    }

    // Process and save results
    if (allExtractedData.length > 0) {
      sendProgressUpdate(`Saving results...`);
      const combinedData = combineAllData();

      try {
        await saveToFile(combinedData);
        console.log("File saved successfully");
      } catch (error) {
        console.error("Error saving file:", error);
        errors.push(`Error saving file: ${error.message}`);
      }

      // Clear extraction state
      await chrome.storage.local.remove("extractionState");

      sendResponse({
        success: true,
        message: `Extraction completed! Extracted ${combinedData.totalRows} rows from ${allExtractedData.length} pages.`,
        stats: {
          totalPages: urls.length,
          successfulPages: allExtractedData.length,
          totalRows: combinedData.totalRows,
          errors: errors.length,
        },
      });
    } else {
      // Clear extraction state
      await chrome.storage.local.remove("extractionState");

      sendResponse({
        success: false,
        error: "No data was extracted from any URL",
        errorDetails: errors.join("\n"),
      });
    }
  } catch (error) {
    console.error("Fatal error:", error);

    // Clear extraction state
    await chrome.storage.local.remove("extractionState");

    sendResponse({
      success: false,
      error: error.message,
      errorDetails: errors.join("\n") + "\n\nFatal error: " + error.message,
    });
  }
}

function sendProgressUpdate(status = null) {
  const progressData = {
    current: currentUrlIndex,
    total: totalUrls,
    extractedRows: totalExtractedRows,
    status: status || `Processing page ${currentUrlIndex} of ${totalUrls}`,
  };

  // Calculate percentage
  const percentage =
    totalUrls > 0 ? Math.round((currentUrlIndex / totalUrls) * 100) : 0;

  // Save progress state to storage
  const extractionState = {
    inProgress: true,
    status: progressData.status,
    percentage: percentage,
    processed: currentUrlIndex,
    extractedRows: totalExtractedRows,
    startTime: Date.now(),
  };
  chrome.storage.local.set({ extractionState: extractionState });

  // Send progress update to popup
  chrome.runtime
    .sendMessage({
      action: "progressUpdate",
      data: progressData,
    })
    .catch(() => {
      // Ignore errors if popup is closed
    });
}

function combineAllData() {
  const combined = {
    extractionInfo: {
      extractionDate: new Date().toISOString(),
      extractionDuration: new Date() - startTime,
      extractorVersion: "3.0.0 (Chrome Extension)",
      totalSitesProcessed: totalUrls,
      successfulExtractions: allExtractedData.length,
      errors: errors,
    },
    consumerNames: [],
    totalRows: 0,
    extractedPages: [],
    headers: {},
    rows: [],
    byConsumer: {},
    byPage: {},
  };

  allExtractedData.forEach((data) => {
    if (!combined.consumerNames.includes(data.consumerName)) {
      combined.consumerNames.push(data.consumerName);
    }

    if (!combined.extractedPages.includes(data.pageUrl)) {
      combined.extractedPages.push(data.pageUrl);
    }

    if (Object.keys(combined.headers).length === 0) {
      combined.headers = data.headers;
    }

    combined.rows = [...combined.rows, ...data.rows];

    if (!combined.byConsumer[data.consumerName]) {
      combined.byConsumer[data.consumerName] = [];
    }
    combined.byConsumer[data.consumerName] = [
      ...combined.byConsumer[data.consumerName],
      ...data.rows,
    ];

    combined.byPage[data.pageUrl] = {
      consumerName: data.consumerName,
      recordsAmount: data.recordsAmount,
      rows: data.rows,
      extractedAt: data.reportDate,
    };
  });

  combined.totalRows = combined.rows.length;
  console.log("🚀 ~ combineAllData ~ combined:", combined);
  return combined;
}

async function saveToFile(data) {
  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .replace("T", "_")
    .split(".")[0];

  const filename = `extraction_${timestamp.toLocaleString()}.json`;
  const jsonData = JSON.stringify(data, null, 2);

  try {
    // Create data URL for download
    const dataUrl =
      "data:application/json;charset=utf-8," + encodeURIComponent(jsonData);

    const downloadId = await chrome.downloads.download({
      url: dataUrl,
      filename: filename,
      saveAs: false,
    });

    // Wait for download to complete
    await new Promise((resolve, reject) => {
      chrome.downloads.onChanged.addListener(function downloadListener(delta) {
        if (delta.id === downloadId) {
          if (delta.state?.current === "complete") {
            chrome.downloads.onChanged.removeListener(downloadListener);
            resolve();
          } else if (delta.error) {
            chrome.downloads.onChanged.removeListener(downloadListener);
            reject(new Error(`Download failed: ${delta.error.current}`));
          }
        }
      });
    });

    console.log(`📁 Data saved as: ${filename}`);
  } catch (error) {
    console.error("❌ Error saving file:", error);
    throw error;
  }
}
