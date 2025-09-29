#!/bin/bash
# SagiX News Simplifier - Automated Setup Script
# For Python 3.11.9

echo "================================================"
echo "SagiX News Simplifier - Setup Script"
echo "Python 3.11.9 Edition"
echo "================================================"
echo ""

# Check if Python 3.11 is installed
echo "Checking Python version..."
PYTHON_CMD=""

if command -v python3.11 &> /dev/null; then
    PYTHON_CMD="python3.11"
elif command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version 2>&1 | awk '{print $2}')
    if [[ $PYTHON_VERSION == 3.11.* ]]; then
        PYTHON_CMD="python3"
    fi
elif command -v python &> /dev/null; then
    PYTHON_VERSION=$(python --version 2>&1 | awk '{print $2}')
    if [[ $PYTHON_VERSION == 3.11.* ]]; then
        PYTHON_CMD="python"
    fi
fi

if [ -z "$PYTHON_CMD" ]; then
    echo "❌ Python 3.11.x not found!"
    echo "Please install Python 3.11.9 from: https://www.python.org/downloads/"
    exit 1
fi

echo "✅ Python 3.11.x found: $($PYTHON_CMD --version)"
echo ""

# Create virtual environment
echo "Creating virtual environment..."
$PYTHON_CMD -m venv venv

if [ $? -eq 0 ]; then
    echo "✅ Virtual environment created"
else
    echo "❌ Failed to create virtual environment"
    exit 1
fi
echo ""

# Activate virtual environment
echo "Activating virtual environment..."
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    source venv/Scripts/activate
else
    source venv/bin/activate
fi

if [ $? -eq 0 ]; then
    echo "✅ Virtual environment activated"
else
    echo "❌ Failed to activate virtual environment"
    exit 1
fi
echo ""

# Upgrade pip
echo "Upgrading pip..."
pip install --upgrade pip

if [ $? -eq 0 ]; then
    echo "✅ pip upgraded"
else
    echo "⚠️  pip upgrade failed (continuing anyway)"
fi
echo ""

# Install requirements
echo "Installing dependencies from requirements.txt..."
pip install -r requirements.txt

if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi
echo ""

# Download NLTK data
echo "Downloading NLTK data..."
python -m nltk.downloader punkt stopwords

if [ $? -eq 0 ]; then
    echo "✅ NLTK data downloaded"
else
    echo "⚠️  NLTK data download failed (you may need to run this manually)"
fi
echo ""

# Run compatibility check
echo "Running compatibility check..."
python check_compatibility.py

if [ $? -eq 0 ]; then
    echo ""
    echo "================================================"
    echo "✅ Setup completed successfully!"
    echo "================================================"
    echo ""
    echo "Next steps:"
    echo "1. (Optional) Get NewsAPI key from: https://newsapi.org/register"
    echo "2. Set environment variable: export NEWSAPI_KEY=your_key_here"
    echo "3. Run the application: python app.py"
    echo "4. Open browser: http://localhost:5000"
    echo ""
    echo "For deployment to Render, see DEPLOYMENT_GUIDE.md"
    echo "================================================"
else
    echo ""
    echo "================================================"
    echo "⚠️  Setup completed with warnings"
    echo "================================================"
    echo "Please review the compatibility check output above"
    echo "and fix any issues before running the application."
    echo "================================================"
fi