#!/usr/bin/env node

/**
 * Automated Table Data Extractor
 *
 * Usage: node extractor.js
 *
 * This script will:
 * 1. Visit all specified URLs automatically
 * 2. Wait for each page to load
 * 3. Extract table data
 * 4. Combine all data
 * 5. Save to JSON file automatically
 *
 * No user interaction required!
 */

const puppeteer = require("puppeteer");
const fs = require("fs").promises;
const path = require("path");
const { exec } = require("child_process");
const { promisify } = require("util");

const execAsync = promisify(exec);

// ================================
// CONFIGURATION - Edit these URLs
// ================================
const CONFIG = {
  urls: [
    "file:///Users/kevinbueno/Documents/Work/iconnect-script/pages/Harmony.html",
    "file:///Users/kevinbueno/Documents/Work/iconnect-script/pages/Harmony2.html",
    "file:///Users/kevinbueno/Documents/Work/iconnect-script/pages/Harmony3.html",
  ],

  // Timing settings (in milliseconds)
  pageLoadWait: 3000, // Wait for page to load
  extractionDelay: 1000, // Extra delay before extraction
  betweenPagesDelay: 500, // Delay between visiting pages

  // Output settings
  outputDir: "./extractions",
  showBrowser: true, // Set to true to see browser in action

  // Browser connection settings
  useExistingBrowser: true, // Connect to existing Chrome browser
  browserPort: 9222, // Chrome debug port (not used when connecting to existing)

  // Table selectors (you can modify these if needed)
  selectors: {
    mainTable:
      "ctrlPageContainer1_ctl01_ctrlPageControlContainer_ctl00_ucSRG_adagrid",
    consumerName: "ctrlPageContainer1_ctl01_lblConsumer",
    recordsAmount:
      "ctrlPageContainer1_ctl01_ctrlPageControlContainer_ctl00_ucSRG_lblRecords",
    fallbackTableContainer: ".plandatatableblock",
  },
};

class AutomatedTableExtractor {
  constructor() {
    this.allExtractedData = [];
    this.startTime = new Date();
  }

  async run() {
    console.log("🚀 Starting Automated Table Data Extraction...");
    console.log(`📋 Processing ${CONFIG.urls.length} URLs...`);
    console.log("─".repeat(60));

    try {
      // Connect to existing browser or launch new one
      let browser;

      console.log("🚀 Launching Chrome for automation...");
      console.log("💡 This will open a new Chrome window for the automation");
      console.log("💡 Your existing Chrome will remain untouched");

      browser = await puppeteer.launch({
        headless: false,
        defaultViewport: { width: 1200, height: 800 },
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
      console.log("✅ Chrome launched for automation");

      // Process each URL
      for (let i = 0; i < CONFIG.urls.length; i++) {
        const url = CONFIG.urls[i];
        await this.processUrl(browser, url, i + 1);

        // Wait between pages
        if (i < CONFIG.urls.length - 1) {
          await this.delay(CONFIG.betweenPagesDelay);
        }
      }

      await browser.close();

      // Process and save results
      await this.finalizeExtraction();
    } catch (error) {
      console.error("❌ Fatal error:", error.message);
      process.exit(1);
    }
  }

  async processUrl(browser, url, pageNumber) {
    console.log(`🌐 [${pageNumber}/${CONFIG.urls.length}] Processing: ${url}`);

    const page = await browser.newPage();

    try {
      // Navigate to page
      console.log("   ⏳ Loading page...");
      await page.goto(url, {
        waitUntil: "networkidle0",
        timeout: 30000,
      });

      // Wait for page to fully load
      await new Promise((resolve) => setTimeout(resolve, CONFIG.pageLoadWait));
      console.log("   ✅ Page loaded");

      // Extract data
      console.log("   🔍 Extracting table data...");
      const pageData = await page.evaluate(
        (selectors, pageUrl) => {
          // =============================================
          // TABLE EXTRACTION LOGIC (runs in browser)
          // =============================================
          function extractTableData() {
            // Try main table first
            const targetTable = document.getElementById(selectors.mainTable);
            const consumerName = document.getElementById(
              selectors.consumerName
            );
            const recordsAmount = document.getElementById(
              selectors.recordsAmount
            );

            if (targetTable) {
              return extractTableInfo(targetTable, consumerName, recordsAmount);
            }

            // Fallback 1: Look in container
            const planDataTableBlock = document.querySelector(
              selectors.fallbackTableContainer
            );
            if (planDataTableBlock) {
              const tables = planDataTableBlock.querySelectorAll(
                ":scope > table, :scope > * > table"
              );

              for (
                let tableIndex = 0;
                tableIndex < tables.length;
                tableIndex++
              ) {
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
              pageUrl: pageUrl,
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
                rowData.pageUrl = pageUrl;
                rowData.extractedAt = new Date().toISOString();
                tableInfo.rows.push(rowData);
              }
            });

            return tableInfo;
          }

          // Execute extraction
          return extractTableData();
        },
        CONFIG.selectors,
        url
      );

      // Process results
      if (pageData && pageData.rows && pageData.rows.length > 0) {
        this.allExtractedData.push(pageData);
        console.log(
          `   ✅ Extracted ${pageData.rows.length} rows from "${pageData.consumerName}"`
        );
      } else {
        console.log("   ⚠️  No table data found");
      }

      // Wait before closing
      await new Promise((resolve) =>
        setTimeout(resolve, CONFIG.extractionDelay)
      );
    } catch (error) {
      console.error(`   ❌ Error processing ${url}: ${error.message}`);
    } finally {
      await page.close();
    }
  }

  async finalizeExtraction() {
    console.log("─".repeat(60));
    console.log("🔄 Processing extracted data...");

    if (this.allExtractedData.length === 0) {
      console.log("❌ No data was extracted from any URL");
      return;
    }

    // Combine all data
    const combinedData = this.combineAllData();

    // Save to file
    const savedPath = await this.saveToFile(combinedData);

    // Show summary
    this.showSummary(combinedData, savedPath);
  }

  combineAllData() {
    const combined = {
      extractionInfo: {
        extractionDate: new Date().toISOString(),
        extractionDuration: new Date() - this.startTime,
        extractorVersion: "1.0.0",
        totalSitesProcessed: CONFIG.urls.length,
        successfulExtractions: this.allExtractedData.length,
      },

      summary: {
        consumerNames: [],
        totalRows: 0,
        extractedPages: [],
        headers: {},
      },

      data: {
        allRows: [],
        byConsumer: {},
        byPage: {},
      },
    };

    // Process each extracted dataset
    this.allExtractedData.forEach((data, index) => {
      // Update summary
      if (!combined.summary.consumerNames.includes(data.consumerName)) {
        combined.summary.consumerNames.push(data.consumerName);
      }

      if (!combined.summary.extractedPages.includes(data.pageUrl)) {
        combined.summary.extractedPages.push(data.pageUrl);
      }

      // Use first dataset's headers if we don't have any
      if (Object.keys(combined.summary.headers).length === 0) {
        combined.summary.headers = data.headers;
      }

      // Add all rows to combined data
      combined.data.allRows = [...combined.data.allRows, ...data.rows];

      // Group by consumer
      if (!combined.data.byConsumer[data.consumerName]) {
        combined.data.byConsumer[data.consumerName] = [];
      }
      combined.data.byConsumer[data.consumerName] = [
        ...combined.data.byConsumer[data.consumerName],
        ...data.rows,
      ];

      // Group by page
      combined.data.byPage[data.pageUrl] = {
        consumerName: data.consumerName,
        recordsAmount: data.recordsAmount,
        rows: data.rows,
        extractedAt: data.reportDate,
      };
    });

    combined.summary.totalRows = combined.data.allRows.length;

    return combined;
  }

  async saveToFile(data) {
    try {
      // Ensure output directory exists
      await fs.mkdir(CONFIG.outputDir, { recursive: true });

      // Create filename
      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "-")
        .replace("T", "_")
        .split(".")[0];
      const filename = `table_extraction_${timestamp}.json`;
      const filepath = path.join(CONFIG.outputDir, filename);

      // Save file
      await fs.writeFile(filepath, JSON.stringify(data, null, 2));

      console.log(`📁 Data saved to: ${path.resolve(filepath)}`);
      return filepath;
    } catch (error) {
      console.error("❌ Error saving file:", error.message);
      throw error;
    }
  }

  showSummary(data, savedPath) {
    const duration = Math.round((new Date() - this.startTime) / 1000);

    console.log("─".repeat(60));
    console.log("🎉 EXTRACTION COMPLETE!");
    console.log("─".repeat(60));
    console.log(`📊 Results Summary:`);
    console.log(
      `   • Consumers Found: ${data.summary.consumerNames.join(", ")}`
    );
    console.log(`   • Total Rows Extracted: ${data.summary.totalRows}`);
    console.log(
      `   • Pages Processed: ${data.summary.extractedPages.length}/${CONFIG.urls.length}`
    );
    console.log(
      `   • Headers Found: ${Object.keys(data.summary.headers).length}`
    );
    console.log(`   • Processing Time: ${duration} seconds`);
    console.log(`   • Output File: ${path.resolve(savedPath)}`);
    console.log("─".repeat(60));

    // Show breakdown by consumer
    if (Object.keys(data.data.byConsumer).length > 1) {
      console.log("📋 Breakdown by Consumer:");
      Object.entries(data.data.byConsumer).forEach(([consumer, rows]) => {
        console.log(`   • ${consumer}: ${rows.length} rows`);
      });
      console.log("─".repeat(60));
    }

    console.log("✅ All done! Check the output file for complete data.");
  }

  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ================================
// PACKAGE.JSON CHECK & INSTALL
// ================================
async function checkDependencies() {
  const requiredPackages = ["puppeteer"];

  try {
    for (const pkg of requiredPackages) {
      require(pkg);
    }
    return true;
  } catch (error) {
    console.log("📦 Installing required dependencies...");
    console.log("Run: npm install puppeteer");
    console.log("Then run this script again: node extractor.js");
    return false;
  }
}

// ================================
// MAIN EXECUTION
// ================================
async function main() {
  console.log("🔧 Automated Table Data Extractor v1.0");
  console.log("═".repeat(60));

  // Check dependencies
  if (!(await checkDependencies())) {
    process.exit(1);
  }

  // Run extraction
  const extractor = new AutomatedTableExtractor();
  await extractor.run();
}

// Self-installing package.json creator
async function createPackageJson() {
  const packageJson = {
    name: "automated-table-extractor",
    version: "1.0.0",
    description: "Automated table data extraction from multiple web pages",
    main: "extractor.js",
    scripts: {
      start: "node extractor.js",
      extract: "node extractor.js",
    },
    dependencies: {
      puppeteer: "^21.0.0",
    },
    author: "Auto-generated",
    license: "MIT",
  };

  try {
    await fs.access("package.json");
  } catch (error) {
    // package.json doesn't exist, create it
    await fs.writeFile("package.json", JSON.stringify(packageJson, null, 2));
    console.log("📦 Created package.json");
  }
}

// Run the script
if (require.main === module) {
  createPackageJson().then(() => {
    main().catch((error) => {
      console.error("💥 Unexpected error:", error.message);
      process.exit(1);
    });
  });
}

module.exports = { AutomatedTableExtractor, CONFIG };
