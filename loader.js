javascript: (function () {
  console.log("Table Data Extractor Starting...");

  const urls = [
    "file:///Users/kevinbueno/Documents/Work/iconnect-script/pages/Harmony.html",
    "file:///Users/kevinbueno/Documents/Work/iconnect-script/pages/Harmony2.html",
  ];

  // Load sql.js library if not already loaded
  function loadSqlJs() {
    return new Promise((resolve, reject) => {
      if (window.SQL) {
        resolve(window.SQL);
        return;
      }

      const script = document.createElement("script");
      script.src =
        "https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/sql-wasm.js";
      script.onload = () => {
        window
          .initSqlJs({
            locateFile: (file) =>
              `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`,
          })
          .then(resolve)
          .catch(reject);
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

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

      if (rowIndex !== headersAreHere) {
        tableInfo.rows.push(rowData);
      }
    });

    return tableInfo;
  }

  // Check if user has existing database and ask for file selection
  async function promptForExistingDatabase() {
    return new Promise((resolve) => {
      const modal = document.createElement("div");
      modal.style.cssText = ` position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.6); z-index: 10000; display: flex; align-items: center; justify-content: center; font-family: system-ui, -apple-system, sans-serif; `;
      const dialog = document.createElement("div");
      dialog.style.cssText = ` background: white; padding: 32px; border-radius: 12px; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2); max-width: 440px; width: 90%; `;
      const todayStr = new Date().toISOString().split("T")[0];
      dialog.innerHTML = ` 
        <h3 style="margin: 0 0 16px; font-size: 24px; color: #1a1a1a;">Database Options</h3> 
        <p style="margin: 0 0 24px; color: #444; font-size: 16px; line-height: 1.5;"> 
          Do you have an existing database for today (${todayStr})? 
        </p> 
        <div style="margin: 24px 0; position: relative;"> 
          <input type="file" id="dbFile" accept=".db,.sqlite,.sqlite3" style="
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
          ">Use Chosen Database</button> 
        </div> `;
      modal.appendChild(dialog);
      document.body.appendChild(modal);

      const fileInput = dialog.querySelector("#dbFile");
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
          alert("Please select a database file first");
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

  // Read existing database file
  function readDatabaseFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(new Uint8Array(reader.result));
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  async function createOrUpdateSqliteDB(data) {
    try {
      const SQL = await loadSqlJs();
      const todayStr = new Date().toISOString().split("T")[0];

      // Ask user about existing database
      const { action, file } = await promptForExistingDatabase();

      if (action === "cancel") {
        console.log("❌ Operation cancelled by user");
        return false;
      }

      let db;
      let isNewDatabase = false;

      if (action === "append" && file) {
        console.log("📂 Loading existing database...");
        const fileData = await readDatabaseFile(file);
        db = new SQL.Database(fileData);

        // Check if tables exist and have the right structure
        try {
          const tables = db.exec(
            "SELECT name FROM sqlite_master WHERE type='table'"
          );
          console.log("📋 Existing tables:", tables);
        } catch (error) {
          console.warn("⚠️ Could not read existing database, creating new one");
          db.close();
          db = new SQL.Database();
          isNewDatabase = true;
        }
      } else {
        console.log("🆕 Creating new database...");
        db = new SQL.Database();
        isNewDatabase = true;
      }

      const headers = Object.keys(data.headers);

      // Create tables if they don't exist
      if (isNewDatabase) {
        db.run(`CREATE TABLE IF NOT EXISTS clients (
          consumerName TEXT PRIMARY KEY,
          recordsAmount INTEGER,
          reportDate TEXT
        )`);

        const columns = headers.map((header) => `"${header}" TEXT`).join(", ");
        db.run(`CREATE TABLE IF NOT EXISTS data (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          consumerName TEXT,
          ${columns},
          FOREIGN KEY(consumerName) REFERENCES clients(consumerName)
        )`);
      }

      // Check if client already exists
      const existingClient = db.exec(
        "SELECT * FROM clients WHERE consumerName = ?",
        [data.consumerName]
      );

      if (existingClient.length > 0) {
        console.log("👤 Updating existing client record...");
        // Update client record
        db.run(
          "UPDATE clients SET recordsAmount = recordsAmount + ?, reportDate = ? WHERE consumerName = ?",
          [
            parseInt(data.recordsAmount) || 0,
            data.reportDate,
            data.consumerName,
          ]
        );
      } else {
        console.log("👤 Adding new client record...");
        // Insert new client record
        db.run(
          "INSERT INTO clients (consumerName, recordsAmount, reportDate) VALUES (?, ?, ?)",
          [data.consumerName, data.recordsAmount, data.reportDate]
        );
      }

      // Check for duplicate records before inserting
      const placeholders = headers.map(() => "?").join(", ");
      const insertSql = `INSERT INTO data (consumerName, ${headers
        .map((h) => `"${h}"`)
        .join(", ")}) 
        VALUES (?, ${placeholders})`;

      let insertedCount = 0;
      let duplicateCount = 0;

      data.rows.forEach((row) => {
        // Create a unique identifier for the record (you can customize this logic)
        const uniqueFields = ["Date", "Service Code", "Units"]; // Adjust based on your data
        const checkConditions = uniqueFields
          .filter((field) => headers.includes(field))
          .map((field) => `"${field}" = ?`)
          .join(" AND ");

        if (checkConditions) {
          const checkValues = uniqueFields
            .filter((field) => headers.includes(field))
            .map((field) => row[field] || null);

          const existing = db.exec(
            `SELECT id FROM data WHERE consumerName = ? AND ${checkConditions}`,
            [data.consumerName, ...checkValues]
          );

          if (existing.length > 0) {
            duplicateCount++;
            console.log("🔄 Skipping duplicate record:", row);
            return;
          }
        }

        // Insert new record
        const values = [
          data.consumerName,
          ...headers.map((header) => row[header] || null),
        ];
        db.run(insertSql, values);
        insertedCount++;
      });

      console.log(`✅ Inserted ${insertedCount} new records`);
      if (duplicateCount > 0) {
        console.log(`⚠️ Skipped ${duplicateCount} duplicate records`);
      }

      // Export updated database
      const binaryArray = db.export();
      const blob = new Blob([binaryArray], { type: "application/x-sqlite3" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `table_data_${todayStr}.db`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log("✅ SQLite database updated and downloaded!");

      // Show summary
      const totalRecords = db.exec("SELECT COUNT(*) as count FROM data");
      const totalClients = db.exec("SELECT COUNT(*) as count FROM clients");
      console.log(`📊 Database Summary:`);
      console.log(`   - Total clients: ${totalClients[0]?.values[0][0] || 0}`);
      console.log(`   - Total records: ${totalRecords[0]?.values[0][0] || 0}`);

      db.close();
      return true;
    } catch (error) {
      console.error("❌ Error creating/updating SQLite database:", error);
      return false;
    }
  }

  // Main execution
  async function main() {
    const data = extractTableData();

    if (data) {
      console.log("🚀 ~ Result:", data);
      await createOrUpdateSqliteDB(data);
    } else {
      console.log("❌ No table data found");
    }

    console.log("--------------------------------");
    console.log("✅ Process completed");
    return data;
  }

  // Execute main function
  main();
})();
