# Runtime Analysis

**Last Updated:** Wed Feb 11 15:55:27 2026

## System Uptime (CPU)
15:55:27 up 28 min, 0 users, load average: 0.38, 0.45, 0.36

## GPU Status
- **GPU**: NVIDIA A100-SXM4-40GB
- **Utilization**: 0%
- **Memory Usage**: 4MiB / 40960MiB
- **Power Usage**: 91W / 400W

## Active Process Runtimes
| Process | Command | Runtime |
| :--- | :--- | :--- |
| Client | `npm run dev` in `client` | 16m 45s |
| Server | `npm run dev` in `server` | 13m 47s |
| Uvicorn | `uvicorn voice_service.main:app` | 12m 43s |
| Top | `top` | 5m 26s |
| Nvidia-smi | `watch -n 1 nvidia-smi` | 4m 44s |
