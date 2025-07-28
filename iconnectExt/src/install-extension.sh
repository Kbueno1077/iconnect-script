#!/bin/bash

# Script to install the Table Data Extractor Chrome extension
# This extension runs directly in your existing Chrome browser

echo "🔧 Installing Table Data Extractor Chrome Extension..."
echo "This extension will run directly in your existing Chrome browser"
echo ""

# Check if extension directory exists
if [ ! -d "extension" ]; then
    echo "❌ Extension directory not found!"
    echo "Make sure you're in the correct directory with the extension files."
    exit 1
fi

echo "✅ Extension files found"
echo ""
echo "📋 Installation Steps:"
echo "1. Open Chrome and go to: chrome://extensions/"
echo "2. Enable 'Developer mode' (toggle in top right)"
echo "3. Click 'Load unpacked'"
echo "4. Select the 'extension' folder from this directory"
echo "5. The extension will appear in your Chrome toolbar"
echo ""
echo "💡 After installation:"
echo "   • Click the extension icon in your toolbar"
echo "   • Add your URLs or use the default ones"
echo "   • Click 'Extract Table Data' to start"
echo ""
echo "🎯 This extension will:"
echo "   • Use your existing Chrome browser"
echo "   • Access your existing profile and extensions"
echo "   • Extract table data from your specified URLs"
echo "   • Download the results as JSON files"
echo ""
echo "🔗 Extension files location: $(pwd)/extension" 