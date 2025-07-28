#!/bin/bash

# Script to set up Selenium with existing Chrome
# This allows the table extractor to connect to your existing browser session

echo "🔧 Setting up Selenium with existing Chrome..."
echo "This will allow the table extractor to use your existing browser session"
echo ""

# Check if Chrome is already running
if pgrep -f "Google Chrome" > /dev/null; then
    echo "✅ Chrome is already running"
    echo "💡 To enable Selenium connection, restart Chrome with debugging:"
    echo ""
    echo "1. Close Chrome manually"
    echo "2. Run: open -a 'Google Chrome' --args --remote-debugging-port=9222"
    echo "3. Then run: node selenium-loader.js"
    echo ""
    echo "🔗 Debug URL: http://localhost:9222"
else
    echo "🚀 Starting Chrome with debugging for Selenium..."
    open -a "Google Chrome" --args --remote-debugging-port=9222
    echo "✅ Chrome started with debugging on port 9222"
    echo "💡 Now you can run: node selenium-loader.js"
    echo "💡 Selenium will connect to your existing Chrome session"
    echo ""
    echo "🔗 Debug URL: http://localhost:9222"
fi

echo ""
echo "📦 To install Selenium dependencies, run:"
echo "   npm install selenium-webdriver" 