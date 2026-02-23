#!/bin/bash
export PYTHONPATH="/home/ubuntu/abi-video-disk/git/multi-model-ai-app/ltx2-repo/packages/ltx-core/src:/home/ubuntu/abi-video-disk/git/multi-model-ai-app/ltx2-repo/packages/ltx-pipelines/src:/home/ubuntu/.local/lib/python3.10/site-packages:$PYTHONPATH"
cd /home/ubuntu/abi-video-disk/git/multi-model-ai-app/video_service
python3 -u main.py
