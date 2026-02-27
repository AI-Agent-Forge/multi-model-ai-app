#!/bin/bash

# Video Service Quick Start Script
# This script helps you get the LTX-2 video generation service running quickly

set -e  # Exit on any error

echo "=========================================="
echo "LTX-2 Video Service Setup"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if we're in the video_service directory
if [ ! -f "main.py" ]; then
    print_error "Please run this script from the video_service directory"
    exit 1
fi

# Step 1: Check Python version
echo "Step 1: Checking Python version..."
PYTHON_VERSION=$(python3 --version 2>&1 | awk '{print $2}')
REQUIRED_VERSION="3.10"

if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$PYTHON_VERSION" | sort -V | head -n1)" = "$REQUIRED_VERSION" ]; then 
    print_success "Python $PYTHON_VERSION (>= $REQUIRED_VERSION)"
else
    print_error "Python version $PYTHON_VERSION is too old. Need >= $REQUIRED_VERSION"
    exit 1
fi
echo ""

# Step 2: Check for GPU
echo "Step 2: Checking GPU availability..."
if command -v nvidia-smi &> /dev/null; then
    GPU_INFO=$(nvidia-smi --query-gpu=name,memory.total --format=csv,noheader | head -n1)
    print_success "GPU detected: $GPU_INFO"
else
    print_warning "nvidia-smi not found. GPU may not be available."
    print_warning "Video generation will be very slow on CPU."
fi
echo ""

# Step 3: Create virtual environment if it doesn't exist
echo "Step 3: Setting up virtual environment..."
if [ ! -d ".venv" ]; then
    python3 -m venv .venv
    print_success "Created virtual environment"
else
    print_success "Virtual environment already exists"
fi
echo ""

# Step 4: Activate virtual environment
echo "Step 4: Activating virtual environment..."
source .venv/bin/activate
print_success "Virtual environment activated"
echo ""

# Step 5: Install dependencies
echo "Step 5: Installing dependencies..."
echo "This may take several minutes on first run..."
pip install --upgrade pip > /dev/null 2>&1
pip install -r requirements.txt

if [ $? -eq 0 ]; then
    print_success "Dependencies installed"
else
    print_error "Failed to install dependencies"
    exit 1
fi
echo ""

# Step 6: Run validation
echo "Step 6: Validating installation..."
python test_setup.py

if [ $? -eq 0 ]; then
    print_success "Installation validated"
else
    print_warning "Some validation checks failed. Review output above."
fi
echo ""

# Step 7: Check environment variables
echo "Step 7: Checking configuration..."
if [ -f "../.env" ]; then
    print_success "Environment file found"
else
    print_warning "No .env file found. Using default HuggingFace paths."
    echo "  Models will be auto-downloaded on first run (~40GB)"
    echo "  To use local models, create ../.env with model paths"
fi
echo ""

# Final instructions
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "To start the video service, run:"
echo "  ${GREEN}python main.py${NC}"
echo ""
echo "Or for development with auto-reload:"
echo "  ${GREEN}uvicorn main:app --host 0.0.0.0 --port 8002 --reload${NC}"
echo ""
echo "Once running, test with:"
echo "  ${GREEN}curl http://localhost:8002/health${NC}"
echo ""
echo "For more information, see:"
echo "  - README.md - Comprehensive guide"
echo "  - QUICKSTART.md - Quick start guide"
echo "  - IMPLEMENTATION_SUMMARY.md - Technical details"
echo ""

# Optional: Ask if user wants to start service
read -p "Do you want to start the service now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Starting video service..."
    echo "Press Ctrl+C to stop"
    echo ""
    python main.py
fi
