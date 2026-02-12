#!/bin/bash
# Monitor GPU, CPU, RAM during inference

echo "Starting inference monitoring..."
echo "================================"

# Record initial state
echo "Initial GPU state:"
nvidia-smi --query-gpu=utilization.gpu,utilization.memory,memory.used,memory.total --format=csv

echo ""
echo "Running inference with monitoring..."
echo ""

# Run monitoring in background
(
  for i in {1..20}; do
    nvidia-smi --query-gpu=utilization.gpu,utilization.memory,memory.used,memory.total,temperature.gpu --format=csv,noheader,nounits
    sleep 0.5
  done
) > /tmp/gpu_stats.txt &
GPU_MON_PID=$!

(
  for i in {1..20}; do
    top -bn1 | grep "python" | head -1 | awk '{print $9","$10}'
    sleep 0.5
  done
) > /tmp/cpu_stats.txt &
CPU_MON_PID=$!

# Run the inference
python3 test_streaming.py

# Wait for monitors to finish
sleep 1
kill $GPU_MON_PID 2>/dev/null
kill $CPU_MON_PID 2>/dev/null

echo ""
echo "================================"
echo "Performance Metrics Summary:"
echo "================================"

# Analyze GPU stats
echo ""
echo "GPU Metrics:"
if [ -f /tmp/gpu_stats.txt ]; then
  awk -F',' '{
    gpu_util+=$1; mem_util+=$2; mem_used+=$3; count++
  } END {
    if (count>0) {
      printf "  Avg GPU Utilization: %.1f%%\n", gpu_util/count
      printf "  Avg Memory Utilization: %.1f%%\n", mem_util/count
      printf "  Avg Memory Used: %.0f MB\n", mem_used/count
      printf "  Peak Memory Used: %.0f MB\n", mem_used_max
    }
  }' /tmp/gpu_stats.txt
  
  echo "  Peak GPU Utilization: $(awk -F',' '{print $1}' /tmp/gpu_stats.txt | sort -n | tail -1)%"
  echo "  Peak Memory Used: $(awk -F',' '{print $3}' /tmp/gpu_stats.txt | sort -n | tail -1) MB"
fi

# Analyze CPU stats
echo ""
echo "CPU & RAM Metrics:"
if [ -f /tmp/cpu_stats.txt ]; then
  awk -F',' '{
    cpu+=$1; mem+=$2; count++
  } END {
    if (count>0) {
      printf "  Avg CPU Usage: %.1f%%\n", cpu/count
      printf "  Avg RAM Usage: %.1f%%\n", mem/count
    }
  }' /tmp/cpu_stats.txt
  
  echo "  Peak CPU Usage: $(awk -F',' '{print $1}' /tmp/cpu_stats.txt | sort -n | tail -1)%"
fi

# Cleanup
rm -f /tmp/gpu_stats.txt /tmp/cpu_stats.txt
