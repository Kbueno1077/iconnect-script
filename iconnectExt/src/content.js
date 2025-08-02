// Content script for table extraction
// This runs in the context of each web page

const CONFIG = {
  selectors: {
    mainTable:
      "ctrlPageContainer1_ctl01_ctrlPageControlContainer_ctl00_ucSRG_adagrid",
    consumerName: "ctrlPageContainer1_ctl01_lblConsumer",
    recordsAmount:
      "ctrlPageContainer1_ctl01_ctrlPageControlContainer_ctl00_ucSRG_lblRecords",
    fallbackTableContainer: ".plandatatableblock",
    pageSizeInput:
      "ctrlPageContainer1$ctl01$ctrlPageControlContainer$ctl00$ucSRG$txtPageSize",
  },
};

// Listen for messages from the background script
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === "extractTableData") {
    extractTableDataWithPageSize(request.amountsPerPage || 50)
      .then((tableData) => {
        sendResponse({ success: true, data: tableData });
      })
      .catch((error) => {
        console.error("Error in extraction:", error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep message channel open for async response
  }
});

async function extractTableDataWithPageSize(amountsPerPage) {
  try {
    // First, set the page size input field
    await setPageSize(amountsPerPage);

    // Then extract the table data
    return extractTableData();
  } catch (error) {
    console.error("Error in extractTableDataWithPageSize:", error);
    throw error;
  }
}

async function setPageSize(amountsPerPage) {
  try {
    // Find the page size input field
    const pageSizeInputs = document.getElementsByName(
      CONFIG.selectors.pageSizeInput
    );

    if (!pageSizeInputs || pageSizeInputs.length === 0) {
      console.warn(
        "Page size input field not found:",
        CONFIG.selectors.pageSizeInput
      );
      return;
    }

    // Get the first element from the NodeList
    const pageSizeInput = pageSizeInputs[0];

    console.log(`Setting page size to: ${amountsPerPage}`);

    // Set the value
    pageSizeInput.value = amountsPerPage;

    // Find and click the search button to apply the new page size
    const searchButton = document.getElementById("cmdSearch40525");
    if (searchButton) {
      searchButton.click();
    } else {
      console.warn("Search button not found");
    }

    // Wait a moment for the page to update
    await new Promise((resolve) => setTimeout(resolve, 10000));

    console.log("Page size input updated successfully");
  } catch (error) {
    console.error("Error setting page size:", error);
    throw error;
  }
}

function extractTableData() {
  try {
    // Try main table first
    const targetTable = document.getElementById(CONFIG.selectors.mainTable);
    const consumerName = document.getElementById(CONFIG.selectors.consumerName);
    const recordsAmount = document.getElementById(
      CONFIG.selectors.recordsAmount
    );

    if (targetTable) {
      return extractTableInfo(targetTable, consumerName, recordsAmount);
    }

    // Fallback 1: Look in container
    const planDataTableBlock = document.querySelector(
      CONFIG.selectors.fallbackTableContainer
    );
    if (planDataTableBlock) {
      const tables = planDataTableBlock.querySelectorAll(
        ":scope > table, :scope > * > table"
      );

      for (let tableIndex = 0; tableIndex < tables.length; tableIndex++) {
        const tableInfo = extractTableInfo(
          tables[tableIndex],
          consumerName,
          recordsAmount,
          tableIndex
        );
        if (tableInfo && tableInfo.rows.length > 0) {
          return tableInfo;
        }
      }
    }

    // Fallback 2: Regex pattern matching
    const allTables = document.getElementsByTagName("table");
    const regex = /.*SRG.*adagrid$/i;

    for (const table of allTables) {
      if (table.id && regex.test(table.id)) {
        return extractTableInfo(table, consumerName, recordsAmount);
      }
    }

    return null;
  } catch (error) {
    console.error("Error extracting table data:", error);
    return null;
  }
}

function extractTableInfo(table, consumerName, recordsAmount, tableIndex = 0) {
  const tableInfo = {
    consumerName: consumerName?.textContent?.trim() || "Unknown",
    recordsAmount: recordsAmount?.textContent?.trim() || "0",
    reportDate: new Date().toISOString(),
    pageUrl: window.location.href,
    tableIndex: tableIndex,
    tableId: table.id || `table_${tableIndex}`,
    tableClass: table.className || "",
    headers: {},
    rows: [],
  };

  const dataRows = table.querySelectorAll("tbody tr");
  let headersAreHere = 0;

  dataRows.forEach((row, rowIndex) => {
    const cells = row.querySelectorAll("td, th");
    const dataCells = row.querySelectorAll("td");

    if (dataCells.length === 0) {
      headersAreHere = 1;
      return;
    }

    if (cells.length === 0) {
      return;
    }

    const rowData = {};

    cells.forEach((cell, cellIndex) => {
      const cellText = cell.textContent.trim();

      if (rowIndex === headersAreHere) {
        const headerCells = row.querySelectorAll("th");
        headerCells.forEach((cell, index) => {
          tableInfo.headers[cell.textContent.trim()] = index;
        });
        return;
      } else {
        const headerName = Object.keys(tableInfo.headers)[cellIndex];
        if (headerName) {
          rowData[headerName] = cellText;
        }
      }
    });

    // Add consumerName to each row
    if (rowIndex !== headersAreHere) {
      rowData.consumerName = tableInfo.consumerName;
      rowData.pageUrl = window.location.href;
      rowData.extractedAt = new Date().toISOString();
      tableInfo.rows.push(rowData);
    }
  });

  return tableInfo;
}
