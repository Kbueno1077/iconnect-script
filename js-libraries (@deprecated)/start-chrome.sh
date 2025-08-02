#!/bin/bash

# Script to start Chrome (no debugging required)
# The table extractor will work with your existing Chrome profile

echo "🚀 Starting Chrome..."
echo "The table extractor will work with your existing Chrome profile"
echo ""

# Check if Chrome is already running
if pgrep -f "Google Chrome" > /dev/null; then
    echo "✅ Chrome is already running"
    echo "💡 You can now run: node loader.js"
    echo "💡 The script will work with your existing Chrome"
else
    echo "🚀 Starting Chrome..."
    open -a "Google Chrome"
    echo "✅ Chrome started"
    echo "💡 Now you can run: node loader.js"
    echo "💡 The script will work with your existing Chrome profile"
fi 