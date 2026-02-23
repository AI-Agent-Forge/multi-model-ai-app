#!/bin/bash

# Stop any existing instances
echo "Stopping existing video service..."
pkill -f "python.*main.py" 2>/dev/null

# Wait a moment
sleep 2

# Start the service
echo "Starting video service..."
cd /home/ubuntu/abi-video-disk/git/multi-model-ai-app/video_service
nohup python3 main.py > video_service.log 2>&1 &

# Get the PID
sleep 2
PID=$(ps aux | grep "python.*main.py" | grep -v grep | awk '{print $2}')

if [ -n "$PID" ]; then
    echo "Video service started successfully with PID: $PID"
    echo "Waiting for model to load (this may take 30-60 seconds)..."
    sleep 5
    echo "Checking service health..."
    tail -20 video_service.log
else
    echo "Failed to start service. Check video_service.log for errors."
fi
