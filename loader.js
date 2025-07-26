javascript: (function () {
  console.log("Table Data Extractor Starting...");

  // Function to extract table data
  function extractTableData() {
    // Find the plandatatableblock section first
    const planDataTableBlock = document.querySelector(".plandatatableblock");
    if (!planDataTableBlock) {
      console.log("No plandatatableblock section found");
      return [];
    }

    // Only search for tables within the plandatatableblock section
    const tables = planDataTableBlock.querySelectorAll("table");
    console.log("🚀 ~ extractTableData ~ tables:", tables);
    const tableData = [];

    tables.forEach((table, tableIndex) => {
      const tableInfo = {
        tableIndex: tableIndex,
        tableId: table.id || `table_${tableIndex}`,
        tableClass: table.className || "",
        headers: [],
        rows: [],
      };

      // Extract headers
      const headerRows = table.querySelectorAll("thead tr, tr:first-child");
      if (headerRows.length > 0) {
        const headerCells = headerRows[0].querySelectorAll("th, td");
        headerCells.forEach((cell) => {
          tableInfo.headers.push(cell.textContent.trim());
        });
      }

      // Extract data rows
      const dataRows = table.querySelectorAll("tbody tr, tr:not(:first-child)");
      dataRows.forEach((row) => {
        const cells = row.querySelectorAll("td, th");
        if (cells.length > 0) {
          const rowData = {};

          // Create object with header names as keys
          cells.forEach((cell, cellIndex) => {
            const headerName =
              tableInfo.headers[cellIndex] || `column_${cellIndex}`;
            rowData[headerName] = cell.textContent.trim();
          });

          tableInfo.rows.push(rowData);
        }
      });

      // Only add tables that have data
      if (tableInfo.headers.length > 0 || tableInfo.rows.length > 0) {
        tableData.push(tableInfo);
      }
    });

    return tableData;
  }

  // Extract and log the table data
  const extractedData = extractTableData();
  console.log("Extracted Table Data:", extractedData);

  // Also log a summary
  console.log(`Found ${extractedData.length} tables with data`);
  extractedData.forEach((table, index) => {
    console.log(
      `Table ${index + 1}: ${table.headers.length} headers, ${
        table.rows.length
      } rows`
    );
  });

  return extractedData;
})();
