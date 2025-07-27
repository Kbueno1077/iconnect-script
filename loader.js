javascript: (function () {
  console.log("Table Data Extractor Starting...");

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
    javascript: (function () {
      console.log("Table Data Extractor Starting...");

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

        const planDataTableBlock = document.querySelector(
          ".plandatatableblock"
        );
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

      function dataTreatment(data) {
        if (!data || !data.rows) return data;

        const groupedByService = data.rows.reduce((acc, row) => {
          const serviceCode = row["Service Code"] || "Unknown";
          if (!acc[serviceCode]) {
            acc[serviceCode] = [];
          }
          acc[serviceCode].push(row);
          return acc;
        }, {});

        const totalServiceGrouped = Object.entries(groupedByService).reduce(
          (acc, [serviceCode, rows]) => {
            acc[serviceCode] = rows.reduce((total, row) => {
              const units = parseFloat(row["Units"] || "0");
              return total + (isNaN(units) ? 0 : units);
            }, 0);
            return acc;
          },
          {}
        );

        const groupedByDay = data.rows.reduce((acc, row) => {
          const serviceCode = row["Service Code"] || "Unknown";
          const date = row["Date"] || "Unknown";

          if (!acc[date]) {
            acc[date] = {};
          }
          if (!acc[date][serviceCode]) {
            acc[date][serviceCode] = {
              entries: [],
              warning: false,
            };
          }

          acc[date][serviceCode].entries.push(row);
          if (acc[date][serviceCode].entries.length > 1) {
            acc[date][serviceCode].warning = true;
          }

          return acc;
        }, {});

        return {
          ...data,
          groupedByService: groupedByService,
          totalServiceGrouped: totalServiceGrouped,
          groupedByDay: groupedByDay,
        };
      }

      async function createSqliteDB(data) {
        try {
          const SQL = await loadSqlJs();
          const db = new SQL.Database();

          console.log("Creating SQLite database in browser memory...");

          // Create clients table
          db.run(`CREATE TABLE clients (
        consumerName TEXT PRIMARY KEY,
        recordsAmount INTEGER,
        reportDate TEXT
      )`);

          // Create data table with foreign key to clients
          const headers = Object.keys(data.headers);
          const columns = headers
            .map((header) => `"${header}" TEXT`)
            .join(", ");

          db.run(`CREATE TABLE data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        consumerName TEXT,
        ${columns},
        FOREIGN KEY(consumerName) REFERENCES clients(consumerName)
      )`);

          // Insert client data
          db.run(
            "INSERT INTO clients (consumerName, recordsAmount, reportDate) VALUES (?, ?, ?)",
            [data.consumerName, data.recordsAmount, data.reportDate]
          );

          // Insert rows
          const placeholders = headers.map(() => "?").join(", ");
          const insertSql = `INSERT INTO data (consumerName, ${headers
            .map((h) => `"${h}"`)
            .join(", ")}) 
        VALUES (?, ${placeholders})`;

          data.rows.forEach((row) => {
            const values = [
              data.consumerName,
              ...headers.map((header) => row[header] || null),
            ];
            db.run(insertSql, values);
          });

          // Export database as binary array
          const binaryArray = db.export();

          // Create download link
          const blob = new Blob([binaryArray], {
            type: "application/x-sqlite3",
          });
          const url = URL.createObjectURL(blob);

          const a = document.createElement("a");
          a.href = url;
          a.download = `table_data_${
            new Date().toISOString().split("T")[0]
          }.sqlite`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);

          console.log("✅ SQLite database created and downloaded!");

          db.close();
          return true;
        } catch (error) {
          console.error("❌ Error creating SQLite database:", error);
          return false;
        }
      }

      // Main execution
      async function main() {
        const data = extractTableData();
        const result = dataTreatment(data);

        if (result) {
          console.log("📈 Summary:");
          console.log(
            `   - Headers: ${Object.keys(result.headers).length} columns`
          );
          console.log(`   - Rows: ${result.rows.length}`);
          console.log("🔍 Headers:", result.headers);

          await createSqliteDB(result);
        } else {
          console.log("❌ No table data found");
        }

        console.log("--------------------------------");
        console.log("✅ Process completed");
        return result;
      }

      // Execute main function
      main();
    })();

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

  function dataTreatment(data) {
    if (!data || !data.rows) return data;

    const groupedByService = data.rows.reduce((acc, row) => {
      const serviceCode = row["Service Code"] || "Unknown";
      if (!acc[serviceCode]) {
        acc[serviceCode] = [];
      }
      acc[serviceCode].push(row);
      return acc;
    }, {});

    const totalServiceGrouped = Object.entries(groupedByService).reduce(
      (acc, [serviceCode, rows]) => {
        acc[serviceCode] = rows.reduce((total, row) => {
          const units = parseFloat(row["Units"] || "0");
          return total + (isNaN(units) ? 0 : units);
        }, 0);
        return acc;
      },
      {}
    );

    const groupedByDay = data.rows.reduce((acc, row) => {
      const serviceCode = row["Service Code"] || "Unknown";
      const date = row["Date"] || "Unknown";

      if (!acc[date]) {
        acc[date] = {};
      }
      if (!acc[date][serviceCode]) {
        acc[date][serviceCode] = {
          entries: [],
          warning: false,
        };
      }

      acc[date][serviceCode].entries.push(row);
      if (acc[date][serviceCode].entries.length > 1) {
        acc[date][serviceCode].warning = true;
      }

      return acc;
    }, {});

    return {
      ...data,
      groupedByService: groupedByService,
      totalServiceGrouped: totalServiceGrouped,
      groupedByDay: groupedByDay,
    };
  }

  async function createSqliteDB(data) {
    try {
      const SQL = await loadSqlJs();
      const db = new SQL.Database();

      console.log("Creating SQLite database in browser memory...");

      // Create clients table
      db.run(`CREATE TABLE clients (
        consumerName TEXT PRIMARY KEY,
        recordsAmount INTEGER,
        reportDate TEXT
      )`);

      // Create data table with foreign key to clients
      const headers = Object.keys(data.headers);
      const columns = headers.map((header) => `"${header}" TEXT`).join(", ");

      db.run(`CREATE TABLE data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        consumerName TEXT,
        ${columns},
        FOREIGN KEY(consumerName) REFERENCES clients(consumerName)
      )`);

      // Insert client data
      db.run(
        "INSERT INTO clients (consumerName, recordsAmount, reportDate) VALUES (?, ?, ?)",
        [data.consumerName, data.recordsAmount, data.reportDate]
      );

      // Insert rows
      const placeholders = headers.map(() => "?").join(", ");
      const insertSql = `INSERT INTO data (consumerName, ${headers
        .map((h) => `"${h}"`)
        .join(", ")}) 
        VALUES (?, ${placeholders})`;

      data.rows.forEach((row) => {
        const values = [
          data.consumerName,
          ...headers.map((header) => row[header] || null),
        ];
        db.run(insertSql, values);
      });

      // Export database as binary array
      const binaryArray = db.export();

      // Create download link
      const blob = new Blob([binaryArray], { type: "application/x-sqlite3" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `table_data_${
        new Date().toISOString().split("T")[0]
      }.sqlite`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log("✅ SQLite database created and downloaded!");

      db.close();
      return true;
    } catch (error) {
      console.error("❌ Error creating SQLite database:", error);
      return false;
    }
  }

  // Main execution
  async function main() {
    const data = extractTableData();
    const result = dataTreatment(data);

    if (result) {
      console.log("📈 Summary:");
      console.log(
        `   - Headers: ${Object.keys(result.headers).length} columns`
      );
      console.log(`   - Rows: ${result.rows.length}`);
      console.log("🔍 Headers:", result.headers);

      await createSqliteDB(result);
    } else {
      console.log("❌ No table data found");
    }

    console.log("--------------------------------");
    console.log("✅ Process completed");
    return result;
  }

  // Execute main function
  main();
})();
