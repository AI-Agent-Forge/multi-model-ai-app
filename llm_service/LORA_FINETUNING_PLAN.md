# LoRA Fine-Tuning and Dynamic Adapter Loading Plan

## Overview
This document outlines the strategy for fine-tuning our base LLM (`Qwen/Qwen2.5-14B-Instruct`) and serving multiple specialized versions of it efficiently. 

Instead of running multiple full copies of the model (which would quickly exhaust the A100 GPU's VRAM) or permanently baking adapters into the base model, we will use **Dynamic Adapter Loading** via **LoRAX** (LoRA eXchange) running in Docker.

## Why Dynamic Loading?
LoRA (Low-Rank Adaptation) adapters are very small (typically 50MB - 200MB) compared to the base model (~14GB in 4-bit). 

By using dynamic loading:
1. **Storage & VRAM Efficiency**: We only load the heavy 14B base model into GPU memory *once*.
2. **On-Demand Inference**: Adapters are only pulled into GPU memory when an inference request specifically asks for them.
3. **Concurrency**: LoRAX can handle concurrent requests for *different* adapters simultaneously by dynamically swapping the tiny adapter weights in and out of the GPU in milliseconds.

## Implementation Roadmap

### Phase 1: Dataset Preparation & Fine-Tuning (QLoRA)
1. **Data Formatting**: Create a pipeline to format raw datasets into the standard conversational JSONL format (ChatML/OpenAI format) required for instruction fine-tuning.
2. **Training Script**: Write a Python script using Hugging Face's `peft`, `trl` (SFTTrainer), and `bitsandbytes`.
3. **Execution**: Train a LoRA adapter on the base model (`Qwen/Qwen2.5-14B-Instruct` in 4-bit) and save the resulting `.safetensors` adapter weights to a local directory.

### Phase 2: LoRAX Server Setup (The Docker Method)
1. **Docker Compose**: Create a `docker-compose.yml` to pull and run the `predibase/lorax` image.
2. **Configuration**: Configure the LoRAX container to load `Qwen/Qwen2.5-14B-Instruct` as the base model on startup.
3. **Volume Mounting**: Mount the local directory containing our trained LoRA adapters into the LoRAX container so it can access them dynamically.

### Phase 3: Update `llm_service`
1. **API Gateway**: Modify `llm_service/services/model_service.py`. Instead of running local `transformers` inference directly, it will act as a gateway.
2. **Adapter Routing**: Update the API schema to accept an optional `adapter_id`. The service will forward incoming chat requests to the LoRAX REST/gRPC API, injecting the requested `adapter_id`.

### Phase 4: Client/UI Updates
1. **Adapter Selection**: Update the frontend (`client/src/components/qwen/`) to include a dropdown or selector.
2. **State Management**: Allow the user to choose which fine-tuned adapter they want to chat with, passing this selection in the API request payload.

## Next Steps
To begin, we will need to:
1. Create a sample/mock dataset.
2. Write the fine-tuning script to generate our first test adapter.
3. Set up the `docker-compose.yml` for LoRAX.
