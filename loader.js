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

    // Only search for direct table elements (not nested tables)
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

      // Extract data rows
      const dataRows = table.querySelectorAll("tbody tr, tr:not(:first-child)");

      let headersAreHere = 0;

      dataRows.forEach((row, rowIndex) => {
        const cells = row.querySelectorAll("td, th");
        const dataCells = row.querySelectorAll("td");

        if (dataCells.length === 0) {
          headersAreHere = 1;
          return;
        }

        if (cells.length > 0) {
          const rowData = {};

          // Create object with header names as keys
          cells.forEach((cell, cellIndex) => {
            const headerName =
              Object.keys(tableInfo.headers)[cellIndex] ||
              `column_${cellIndex}`;
            rowData[headerName] = cell.textContent.trim();
          });

          if (rowIndex === headersAreHere) {
            const headerCells = row.querySelectorAll("th");
            headerCells.forEach((cell) => {
              tableInfo.headers[cell.textContent.trim()] = Object.keys(
                tableInfo.headers
              ).length;
            });
            return;
          } else {
            tableInfo.rows.push(rowData);
          }
        }
      });

      // Only add tables that have data
      if (
        Object.keys(tableInfo.headers).length > 0 ||
        tableInfo.rows.length > 0
      ) {
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
      `Table ${index + 1}: ${Object.keys(table.headers).length} headers, ${
        table.rows.length
      } rows`
    );
  });

  return extractedData;
})();
