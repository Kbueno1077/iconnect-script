javascript: (function () {
  console.log("Table Data Extractor Starting...");

  const urls = [
    "file:///Users/kevinbueno/Documents/Work/iconnect-script/pages/Harmony.html",
    "file:///Users/kevinbueno/Documents/Work/iconnect-script/pages/Harmony2.html",
    "file:///Users/kevinbueno/Documents/Work/iconnect-script/pages/Harmony3.html",
  ];

  function extractTableData() {
    const targetTable = document.getElementById(
      "ctrlPageContainer1_ctl01_ctrlPageControlContainer_ctl00_ucSRG_adagrid"
    );

    const consumerName = document.getElementById(
      "ctrlPageContainer1_ctl01_lblConsumer"
    );

    const recordsAmount = document.getElementById(
      "ctrlPageContainer1_ctl01_ctrlPageControlContainer_ctl00_ucSRG_lblRecords"
    );

    if (targetTable) {
      console.log("Found target table by ID:", targetTable);
      return extractTableInfo(targetTable, consumerName, recordsAmount);
    }

    console.log("Target table not found by ID, trying fallback method...");

    const planDataTableBlock = document.querySelector(".plandatatableblock");
    if (planDataTableBlock) {
      const tables = planDataTableBlock.querySelectorAll(
        ":scope > table, :scope > * > table"
      );
      const tableData = [];

      tables.forEach((table, tableIndex) => {
        const tableInfo = extractTableInfo(
          table,
          consumerName,
          recordsAmount,
          tableIndex
        );
        if (tableInfo) {
          tableData.push(tableInfo);
        }
      });

      if (tableData.length > 0) {
        return tableData[0];
      }
    }

    console.log("Fallback method failed, trying regex pattern matching...");

    const allTables = document.getElementsByTagName("table");
    const regex = /.*SRG.*adagrid$/i;

    for (const table of allTables) {
      if (table.id && regex.test(table.id)) {
        console.log("Found target table by regex pattern:", table.id);
        return extractTableInfo(table, consumerName, recordsAmount);
      }
    }

    console.log("No matching table found with any method");
    return null;
  }

  function extractTableInfo(
    table,
    consumerName,
    recordsAmount,
    tableIndex = 0
  ) {
    const tableInfo = {
      consumerName: consumerName?.textContent?.trim() || "Unknown",
      recordsAmount: recordsAmount?.textContent?.trim() || "0",
      reportDate: new Date().toISOString(),
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
      }

      if (rowIndex !== headersAreHere) {
        tableInfo.rows.push(rowData);
      }
    });

    console.log("Extracted table info:", tableInfo);
    return tableInfo;
  }

  // Check if user has existing JSON file and ask for file selection
  async function promptForExistingJsonFile() {
    return new Promise((resolve) => {
      const modal = document.createElement("div");
      modal.style.cssText = ` position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.6); z-index: 10000; display: flex; align-items: center; justify-content: center; font-family: system-ui, -apple-system, sans-serif; `;
      const dialog = document.createElement("div");
      dialog.style.cssText = ` background: white; padding: 32px; border-radius: 12px; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2); max-width: 440px; width: 90%; `;
      const todayStr = new Date().toISOString().split("T")[0];
      dialog.innerHTML = ` 
          <h3 style="margin: 0 0 16px; font-size: 24px; color: #1a1a1a;">JSON File Options</h3> 
          <p style="margin: 0 0 24px; color: #444; font-size: 16px; line-height: 1.5;"> 
            Do you have an existing JSON file to append data to? 
          </p> 
          <div style="margin: 24px 0; position: relative;"> 
            <input type="file" id="jsonFile" accept=".json" style="
              margin-bottom: 16px; 
              width: 100%; 
              padding: 8px; 
              border: 2px solid #e0e0e0; 
              border-radius: 6px; 
              font-size: 14px;
            ">
            <button id="removeFile" style="
              display: none;
              position: absolute;
              right: 10px;
              top: 8px;
              background: #ef4444;
              color: white;
              border: none;
              border-radius: 4px;
              padding: 4px 8px;
              cursor: pointer;
              font-size: 12px;
            ">Remove</button>
          </div> 
          <div style="display: flex; gap: 12px; justify-content: flex-end;"> 
            <button id="cancel" style="
              padding: 12px 24px;
              background: #6b7280;
              color: white;
              border: none;
              border-radius: 6px;
              cursor: pointer;
              font-size: 16px;
              font-weight: 500;
              transition: all 0.2s;
            ">Cancel</button>
            <button id="createNew" style="
              padding: 12px 24px; 
              background: #0070f3; 
              color: white; 
              border: none; 
              border-radius: 6px; 
              cursor: pointer; 
              font-size: 16px; 
              font-weight: 500; 
              transition: all 0.2s;
            ">Create New</button> 
            <button id="useExisting" style="
              padding: 12px 24px; 
              background: #10b981; 
              color: white; 
              border: none; 
              border-radius: 6px;
              cursor: pointer; 
              font-size: 16px; 
              font-weight: 500; 
              transition: all 0.2s;
              display: none;
            ">Append to File</button> 
          </div> `;
      modal.appendChild(dialog);
      document.body.appendChild(modal);

      const fileInput = dialog.querySelector("#jsonFile");
      const createNewBtn = dialog.querySelector("#createNew");
      const useExistingBtn = dialog.querySelector("#useExisting");
      const removeFileBtn = dialog.querySelector("#removeFile");
      const cancelBtn = dialog.querySelector("#cancel");

      // Add hover states
      createNewBtn.onmouseover = () => {
        createNewBtn.style.background = "#0051cc";
      };
      createNewBtn.onmouseout = () => {
        createNewBtn.style.background = "#0070f3";
      };

      useExistingBtn.onmouseover = () => {
        useExistingBtn.style.background = "#059669";
      };
      useExistingBtn.onmouseout = () => {
        useExistingBtn.style.background = "#10b981";
      };

      cancelBtn.onmouseover = () => {
        cancelBtn.style.background = "#4b5563";
      };
      cancelBtn.onmouseout = () => {
        cancelBtn.style.background = "#6b7280";
      };

      // Handle file selection
      fileInput.onchange = () => {
        const hasFile = fileInput.files.length > 0;
        useExistingBtn.style.display = hasFile ? "block" : "none";
        createNewBtn.style.opacity = hasFile ? "0.5" : "1";
        createNewBtn.style.pointerEvents = hasFile ? "none" : "auto";
        removeFileBtn.style.display = hasFile ? "block" : "none";
      };

      // Handle remove file
      removeFileBtn.onclick = () => {
        fileInput.value = "";
        fileInput.dispatchEvent(new Event("change"));
      };

      createNewBtn.onclick = () => {
        document.body.removeChild(modal);
        resolve({ action: "create", file: null });
      };

      useExistingBtn.onclick = () => {
        const file = fileInput.files[0];
        if (!file) {
          alert("Please select a JSON file first");
          return;
        }
        document.body.removeChild(modal);
        resolve({ action: "append", file: file });
      };

      cancelBtn.onclick = () => {
        document.body.removeChild(modal);
        resolve({ action: "cancel", file: null });
      };
    });
  }

  // Read existing JSON file
  function readJsonFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const jsonData = JSON.parse(reader.result);
          resolve(jsonData);
        } catch (error) {
          reject(new Error("Invalid JSON file"));
        }
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  function saveAsJson(data) {
    try {
      console.log("Starting JSON save process...");

      const todayStr = new Date().toISOString().split("T")[0];
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

      // Create JSON data
      const jsonData = {
        exportDate: new Date().toISOString(),
        consumerName: data.consumerName,
        recordsAmount: data.recordsAmount,
        reportDate: data.reportDate,
        tableInfo: {
          tableId: data.tableId,
          tableClass: data.tableClass,
          headers: data.headers,
          rows: data.rows,
        },
      };

      console.log("JSON data prepared:", jsonData);

      // Convert to JSON string with pretty formatting
      const jsonString = JSON.stringify(jsonData, null, 2);
      console.log("JSON string length:", jsonString.length);

      // Create filename
      const filename = `json_data_${todayStr}_${timestamp}.json`;

      console.log("Filename:", filename);

      // Create and download file
      const blob = new Blob([jsonString], { type: "application/json" });
      console.log("Blob created, size:", blob.size);

      const url = URL.createObjectURL(blob);
      console.log("Object URL created:", url);

      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.style.display = "none"; // Hide the link

      // Add to body, click, then remove
      document.body.appendChild(a);
      console.log("Link added to body, attempting click...");

      // Try different approaches for triggering download
      try {
        a.click();
        console.log("Click triggered successfully");
      } catch (clickError) {
        console.log("Regular click failed, trying manual event:", clickError);
        const event = new MouseEvent("click", {
          view: window,
          bubbles: true,
          cancelable: true,
        });
        a.dispatchEvent(event);
      }

      // Clean up
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        console.log("Cleanup completed");
      }, 100);

      console.log("✅ JSON data export process completed!");
      console.log(`📊 Export Summary:`);
      console.log(`   - Consumer: ${data.consumerName}`);
      console.log(`   - Records: ${data.recordsAmount}`);
      console.log(`   - Rows exported: ${data.rows.length}`);
      console.log(`   - Headers: ${Object.keys(data.headers).length}`);

      return true;
    } catch (error) {
      console.error("❌ Error saving JSON data:", error);
      console.error("Error stack:", error.stack);

      // Fallback: copy to clipboard
      try {
        const jsonString = JSON.stringify(data, null, 2);
        navigator.clipboard
          .writeText(jsonString)
          .then(() => {
            console.log("📋 Data copied to clipboard as fallback");
            alert("Download failed, but data has been copied to clipboard!");
          })
          .catch((clipboardError) => {
            console.error("Clipboard fallback also failed:", clipboardError);
            alert(
              "Download and clipboard both failed. Check console for data."
            );
          });
      } catch (fallbackError) {
        console.error("Fallback failed:", fallbackError);
      }

      return false;
    }
  }

  async function createOrUpdateJsonFile(data) {
    try {
      // Ask user about existing JSON file
      const { action, file } = await promptForExistingJsonFile();

      if (action === "cancel") {
        console.log("❌ Operation cancelled by user");
        return false;
      }

      let existingData = null;
      let isNewFile = false;

      if (action === "append" && file) {
        console.log("📂 Loading existing JSON file...");
        try {
          existingData = await readJsonFile(file);
          console.log("📋 Existing JSON data loaded:", existingData);
        } catch (error) {
          console.warn(
            "⚠️ Could not read existing JSON file, creating new one"
          );
          existingData = null;
          isNewFile = true;
        }
      } else {
        console.log("🆕 Creating new JSON file...");
        isNewFile = true;
      }

      // Prepare the data to save
      let finalData;
      if (isNewFile) {
        // Create new simple structure
        finalData = {
          consumerNames: [data.consumerName],
          recordsAmount: data.recordsAmount,
          reportDate: data.reportDate,
          headers: data.headers,
          rows: data.rows,
        };
      } else {
        // Use existing data and append new data
        finalData = existingData;

        // Add consumer name if not already present
        if (!finalData.consumerNames) {
          finalData.consumerNames = [];
        }
        if (!finalData.consumerNames.includes(data.consumerName)) {
          finalData.consumerNames.push(data.consumerName);
        }

        // Append new rows to existing rows
        if (finalData.rows) {
          finalData.rows = [...finalData.rows, ...data.rows];
        } else {
          finalData.rows = data.rows;
        }

        // Update records amount
        const existingRecords = parseInt(finalData.recordsAmount || 0);
        const newRecords = parseInt(data.recordsAmount || 0);
        finalData.recordsAmount = (existingRecords + newRecords).toString();

        // Replace report date with new one
        finalData.reportDate = data.reportDate;

        // Update headers if needed (use new headers if existing ones are empty)
        if (!finalData.headers || Object.keys(finalData.headers).length === 0) {
          finalData.headers = data.headers;
        }
      }

      // Convert to JSON string
      const jsonString = JSON.stringify(finalData, null, 2);
      console.log("Final JSON data prepared, size:", jsonString.length);

      // Create filename
      const todayStr = new Date().toISOString().split("T")[0];
      const filename = isNewFile
        ? `table_data_${data.consumerName.replace(
            /[^a-zA-Z0-9]/g,
            "_"
          )}_${todayStr}.json`
        : file.name;

      // Create and download file
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.style.display = "none";

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log("✅ JSON file updated and downloaded!");
      console.log(`📊 File Summary:`);
      console.log(`   - Consumers: ${finalData.consumerNames.join(", ")}`);
      console.log(`   - Total records: ${finalData.recordsAmount}`);
      console.log(`   - Total rows: ${finalData.rows.length}`);

      return true;
    } catch (error) {
      console.error("❌ Error creating/updating JSON file:", error);
      return false;
    }
  }

  // Main execution
  async function main() {
    console.log("Main function starting...");

    const data = extractTableData();

    if (data) {
      console.log("🚀 Table data extracted:", data);

      // Check if we have any actual data
      if (data.rows && data.rows.length > 0) {
        console.log("Data has rows, proceeding with save...");
        await createOrUpdateJsonFile(data);
      } else {
        console.log("⚠️ No rows found in extracted data");
        console.log("Headers found:", Object.keys(data.headers));
        // Still try to save even if no rows
        await createOrUpdateJsonFile(data);
      }
    } else {
      console.log("❌ No table data found");

      // Debug: List all tables on page
      const allTables = document.getElementsByTagName("table");
      console.log(`Found ${allTables.length} tables on page:`);
      for (let i = 0; i < allTables.length; i++) {
        console.log(
          `  Table ${i}: ID="${allTables[i].id}", Class="${allTables[i].className}"`
        );
      }
    }

    console.log("--------------------------------");
    console.log("✅ Process completed");
    return data;
  }

  // Execute main function
  return main();
})();
