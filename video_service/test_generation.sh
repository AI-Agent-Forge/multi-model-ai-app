#!/bin/bash

echo "Testing video generation..."
echo "This will send a text-to-video request with minimal parameters for faster testing."
echo ""

curl -X POST "http://localhost:8002/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A cat running on grass in slow motion",
    "negative_prompt": "blurry, distorted, low quality",
    "width": 512,
    "height": 320,
    "num_frames": 25,
    "num_inference_steps": 20,
    "guidance_scale": 3.0,
    "seed": 42
  }' \
  --max-time 600 \
  -o test_output.json

if [ $? -eq 0 ]; then
    echo ""
    echo "Request completed! Check test_output.json for the response."
    echo "If successful, you'll see a base64-encoded video in the 'video' field."
    
    # Check if response contains error
    if grep -q "detail" test_output.json 2>/dev/null; then
        echo ""
        echo "Error in response:"
        cat test_output.json | python3 -m json.tool 2>/dev/null || cat test_output.json
    else
        echo "Response looks good! Video data received."
        echo "Size of response: $(wc -c < test_output.json) bytes"
    fi
else
    echo ""
    echo "Request failed. Service may not be running or still loading."
    echo "Check video_service.log for details."
fi
