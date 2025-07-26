javascript: (function () {
  console.log("Table Data Extractor Starting...");

  function extractTableData() {
    const planDataTableBlock = document.querySelector(".plandatatableblock");
    if (!planDataTableBlock) {
      console.log("No plandatatableblock section found");
      return null;
    }

    const tables = planDataTableBlock.querySelectorAll(
      ":scope > table, :scope > * > table"
    );
    const tableData = [];

    tables.forEach((table, tableIndex) => {
      const tableInfo = {
        tableIndex: tableIndex,
        tableId: table.id || `table_${tableIndex}`,
        tableClass: table.className || "",
        headers: {},
        rows: [],
      };

      const dataRows = table.querySelectorAll("tbody tr, tr:not(:first-child)");

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

      tableData.push(tableInfo);
    });

    return tableData.length > 0 ? tableData[0] : null;
  }

  const result = extractTableData();

  if (result) {
    console.log("📈 Summary:");
    console.log(`   - Headers: ${Object.keys(result.headers).length} columns`);
    console.log(`   - Rows: ${result.rows.length} data rows`);
    console.log("🔍 Headers:", result.headers);
    console.log("📊 Rows:", result.rows);
  } else {
    console.log("❌ No table data found");
  }

  console.log("--------------------------------");
  return console.log("✅ Result:", result);
})();
