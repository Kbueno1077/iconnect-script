#!/usr/bin/env node

/**
 * Selenium-based Table Data Extractor
 *
 * This version can connect to your existing Chrome browser
 * No need to launch separate browser instances!
 */

const { Builder, By, until } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome.js");
const fs = require("fs").promises;
const path = require("path");

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
  pageLoadWait: 3000,
  extractionDelay: 1000,
  betweenPagesDelay: 500,

  // Output settings
  outputDir: "./extractions",

  // Browser settings
  useExistingChrome: true, // Connect to existing Chrome
  chromeDebugPort: 9222, // Chrome debugging port

  // Table selectors
  selectors: {
    mainTable:
      "ctrlPageContainer1_ctl01_ctrlPageControlContainer_ctl00_ucSRG_adagrid",
    consumerName: "ctrlPageContainer1_ctl01_lblConsumer",
    recordsAmount:
      "ctrlPageContainer1_ctl01_ctrlPageControlContainer_ctl00_ucSRG_lblRecords",
    fallbackTableContainer: ".plandatatableblock",
  },
};

class SeleniumTableExtractor {
  constructor() {
    this.allExtractedData = [];
    this.startTime = new Date();
    this.driver = null;
  }

  async setupDriver() {
    console.log("🔧 Setting up Selenium WebDriver...");

    if (CONFIG.useExistingChrome) {
      console.log("🔗 Attempting to connect to existing Chrome...");

      // Try to connect to existing Chrome with debugging
      try {
        this.driver = await new Builder()
          .forBrowser("chrome")
          .usingServer(`http://localhost:${CONFIG.chromeDebugPort}`)
          .build();

        console.log("✅ Connected to existing Chrome!");
        return true;
      } catch (error) {
        console.log("⚠️ Could not connect to existing Chrome");
        console.log("💡 Starting new Chrome with debugging...");
      }
    }

    // Launch new Chrome with debugging
    const options = new chrome.Options();
    options.addArguments("--remote-debugging-port=9222");
    options.addArguments("--no-sandbox");
    options.addArguments("--disable-setuid-sandbox");

    this.driver = await new Builder()
      .forBrowser("chrome")
      .setChromeOptions(options)
      .build();

    console.log("✅ Chrome launched with debugging enabled");
    return true;
  }

  async run() {
    console.log("🚀 Starting Selenium Table Data Extraction...");
    console.log(`📋 Processing ${CONFIG.urls.length} URLs...`);
    console.log("─".repeat(60));

    try {
      await this.setupDriver();

      // Process each URL
      for (let i = 0; i < CONFIG.urls.length; i++) {
        const url = CONFIG.urls[i];
        await this.processUrl(url, i + 1);

        if (i < CONFIG.urls.length - 1) {
          await this.delay(CONFIG.betweenPagesDelay);
        }
      }

      await this.driver.quit();
      await this.finalizeExtraction();
    } catch (error) {
      console.error("❌ Fatal error:", error.message);
      if (this.driver) {
        await this.driver.quit();
      }
      process.exit(1);
    }
  }

  async processUrl(url, pageNumber) {
    console.log(`🌐 [${pageNumber}/${CONFIG.urls.length}] Processing: ${url}`);

    try {
      // Navigate to page
      console.log("   ⏳ Loading page...");
      await this.driver.get(url);
      await this.delay(CONFIG.pageLoadWait);
      console.log("   ✅ Page loaded");

      // Extract data
      console.log("   🔍 Extracting table data...");
      const pageData = await this.extractTableData(url);

      if (pageData && pageData.rows && pageData.rows.length > 0) {
        this.allExtractedData.push(pageData);
        console.log(
          `   ✅ Extracted ${pageData.rows.length} rows from "${pageData.consumerName}"`
        );
      } else {
        console.log("   ⚠️  No table data found");
      }

      await this.delay(CONFIG.extractionDelay);
    } catch (error) {
      console.error(`   ❌ Error processing ${url}: ${error.message}`);
    }
  }

  async extractTableData(pageUrl) {
    try {
      // Try main table first
      let table = await this.driver.findElement(
        By.id(CONFIG.selectors.mainTable)
      );
      if (table) {
        return await this.extractTableInfo(table, pageUrl);
      }

      // Fallback: Look for tables in container
      const containers = await this.driver.findElements(
        By.css(CONFIG.selectors.fallbackTableContainer)
      );
      for (const container of containers) {
        const tables = await container.findElements(By.css("table"));
        for (let i = 0; i < tables.length; i++) {
          const tableInfo = await this.extractTableInfo(tables[i], pageUrl, i);
          if (tableInfo && tableInfo.rows.length > 0) {
            return tableInfo;
          }
        }
      }

      // Fallback: Find any table with SRG in ID
      const allTables = await this.driver.findElements(By.css("table"));
      for (const table of allTables) {
        const tableId = await table.getAttribute("id");
        if (tableId && /.*SRG.*adagrid$/i.test(tableId)) {
          return await this.extractTableInfo(table, pageUrl);
        }
      }

      return null;
    } catch (error) {
      console.log("   ⚠️  Error extracting table data:", error.message);
      return null;
    }
  }

  async extractTableInfo(table, pageUrl, tableIndex = 0) {
    try {
      // Get consumer name and records amount
      let consumerName = "Unknown";
      let recordsAmount = "0";

      try {
        const consumerElement = await this.driver.findElement(
          By.id(CONFIG.selectors.consumerName)
        );
        consumerName = await consumerElement.getText();
      } catch (error) {
        // Consumer name not found
      }

      try {
        const recordsElement = await this.driver.findElement(
          By.id(CONFIG.selectors.recordsAmount)
        );
        recordsAmount = await recordsElement.getText();
      } catch (error) {
        // Records amount not found
      }

      const tableInfo = {
        consumerName: consumerName.trim(),
        recordsAmount: recordsAmount.trim(),
        reportDate: new Date().toISOString(),
        pageUrl: pageUrl,
        tableIndex: tableIndex,
        tableId: (await table.getAttribute("id")) || `table_${tableIndex}`,
        tableClass: (await table.getAttribute("class")) || "",
        headers: {},
        rows: [],
      };

      // Get table rows
      const rows = await table.findElements(By.css("tbody tr"));
      let headersFound = false;

      for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
        const row = rows[rowIndex];
        const cells = await row.findElements(By.css("td, th"));
        const dataCells = await row.findElements(By.css("td"));

        if (dataCells.length === 0) {
          headersFound = true;
          continue;
        }

        if (cells.length === 0) continue;

        const rowData = {};

        // Process headers
        if (rowIndex === (headersFound ? 1 : 0)) {
          const headerCells = await row.findElements(By.css("th"));
          for (let i = 0; i < headerCells.length; i++) {
            const headerText = await headerCells[i].getText();
            tableInfo.headers[headerText.trim()] = i;
          }
          continue;
        }

        // Process data rows
        for (let cellIndex = 0; cellIndex < cells.length; cellIndex++) {
          const cellText = await cells[cellIndex].getText();
          const headerName = Object.keys(tableInfo.headers)[cellIndex];
          if (headerName) {
            rowData[headerName] = cellText.trim();
          }
        }

        // Add metadata to row
        rowData.consumerName = tableInfo.consumerName;
        rowData.pageUrl = pageUrl;
        rowData.extractedAt = new Date().toISOString();
        tableInfo.rows.push(rowData);
      }

      return tableInfo;
    } catch (error) {
      console.log("   ⚠️  Error extracting table info:", error.message);
      return null;
    }
  }

  async finalizeExtraction() {
    console.log("─".repeat(60));
    console.log("🔄 Processing extracted data...");

    if (this.allExtractedData.length === 0) {
      console.log("❌ No data was extracted from any URL");
      return;
    }

    const combinedData = this.combineAllData();
    const savedPath = await this.saveToFile(combinedData);
    this.showSummary(combinedData, savedPath);
  }

  combineAllData() {
    const combined = {
      extractionInfo: {
        extractionDate: new Date().toISOString(),
        extractionDuration: new Date() - this.startTime,
        extractorVersion: "2.0.0 (Selenium)",
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

    this.allExtractedData.forEach((data) => {
      if (!combined.summary.consumerNames.includes(data.consumerName)) {
        combined.summary.consumerNames.push(data.consumerName);
      }

      if (!combined.summary.extractedPages.includes(data.pageUrl)) {
        combined.summary.extractedPages.push(data.pageUrl);
      }

      if (Object.keys(combined.summary.headers).length === 0) {
        combined.summary.headers = data.headers;
      }

      combined.data.allRows = [...combined.data.allRows, ...data.rows];

      if (!combined.data.byConsumer[data.consumerName]) {
        combined.data.byConsumer[data.consumerName] = [];
      }
      combined.data.byConsumer[data.consumerName] = [
        ...combined.data.byConsumer[data.consumerName],
        ...data.rows,
      ];

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
      await fs.mkdir(CONFIG.outputDir, { recursive: true });

      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "-")
        .replace("T", "_")
        .split(".")[0];
      const filename = `selenium_extraction_${timestamp}.json`;
      const filepath = path.join(CONFIG.outputDir, filename);

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
    console.log("🎉 SELENIUM EXTRACTION COMPLETE!");
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

// Check dependencies
async function checkDependencies() {
  const requiredPackages = ["selenium-webdriver"];

  try {
    for (const pkg of requiredPackages) {
      require(pkg);
    }
    return true;
  } catch (error) {
    console.log("📦 Installing required dependencies...");
    console.log("Run: npm install selenium-webdriver");
    console.log("Then run this script again: node selenium-loader.js");
    return false;
  }
}

// Main execution
async function main() {
  console.log("🔧 Selenium Table Data Extractor v2.0");
  console.log("═".repeat(60));

  if (!(await checkDependencies())) {
    process.exit(1);
  }

  const extractor = new SeleniumTableExtractor();
  await extractor.run();
}

if (require.main === module) {
  main().catch((error) => {
    console.error("💥 Unexpected error:", error.message);
    process.exit(1);
  });
}

module.exports = { SeleniumTableExtractor, CONFIG };
