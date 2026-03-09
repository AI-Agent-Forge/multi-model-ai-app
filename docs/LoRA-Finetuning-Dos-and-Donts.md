# LoRA Fine-Tuning: Do's and Don'ts

> A practical reference guide for fine-tuning `Qwen/Qwen2.5-14B-Instruct` with LoRA/QLoRA adapters on an A100-40GB GPU.

---

## 📋 Table of Contents

1. [Dataset Preparation](#1-dataset-preparation)
2. [Training Configuration](#2-training-configuration)
3. [GPU & Memory Management](#3-gpu--memory-management)
4. [LoRA Hyperparameters](#4-lora-hyperparameters)
5. [Model & Tokenizer Handling](#5-model--tokenizer-handling)
6. [Evaluation & Testing](#6-evaluation--testing)
7. [Deployment & Serving (LoRAX)](#7-deployment--serving-lorax)
8. [General Workflow](#8-general-workflow)

---

## 1. Dataset Preparation

### ✅ DO

- **DO** use conversational JSONL format (ChatML / OpenAI style) — this is what Qwen's chat template expects:
  ```jsonl
  {"messages": [{"role": "system", "content": "..."}, {"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}]}
  ```
- **DO** prioritize **quality over quantity** — 500 well-curated, diverse examples will outperform 10,000 noisy/repetitive ones.
- **DO** include a `system` message if you want the adapter to follow a specific persona or behavior.
- **DO** keep conversation lengths reasonable — trim to ~2048 tokens max per example to avoid excessive VRAM usage.
- **DO** clean your data — remove duplicates, fix grammar, ensure assistant responses are actually good.
- **DO** create a separate `val.jsonl` (10-15% of your data) for validation so you can detect overfitting.
- **DO** include diverse examples — cover edge cases, different phrasings, varying difficulty levels.
- **DO** verify your JSONL is valid before training — a single malformed line will crash the whole run.
  ```bash
  python -c "import json; [json.loads(l) for l in open('train.jsonl')]; print('✅ Valid')"
  ```

### ❌ DON'T

- **DON'T** use raw text dumps or unstructured data — LoRA instruction-tuning needs properly formatted conversations.
- **DON'T** include extremely long examples (5000+ tokens) — they blow up VRAM and slow training dramatically.
- **DON'T** use low-quality synthetic data without reviewing it — garbage in = garbage out.
- **DON'T** put the same example repeated many times — the model will memorize rather than generalize.
- **DON'T** mix multiple languages or tasks in one adapter unless that's specifically what you want.
- **DON'T** forget to check the `role` field — it must be exactly `"system"`, `"user"`, or `"assistant"` (not `"System"`, `"human"`, etc).
- **DON'T** leave blank or empty `content` fields — they cause silent tokenization issues.

---

## 2. Training Configuration

### ✅ DO

- **DO** use QLoRA (4-bit quantized base + LoRA on top) — it's the most VRAM-efficient method:
  ```python
  BitsAndBytesConfig(
      load_in_4bit=True,
      bnb_4bit_quant_type="nf4",
      bnb_4bit_compute_dtype=torch.bfloat16,
      bnb_4bit_use_double_quant=True,
  )
  ```
- **DO** use `bf16=True` on A100 — it natively supports bfloat16 and it's more stable than fp16.
- **DO** enable `gradient_checkpointing=True` — trades a small speed penalty for significant VRAM savings.
- **DO** use a cosine learning rate scheduler with warmup:
  ```python
  lr_scheduler_type="cosine"
  warmup_ratio=0.03
  ```
- **DO** use `paged_adamw_8bit` as the optimizer — it's memory-efficient and works well with QLoRA.
- **DO** use `gradient_accumulation_steps` to simulate larger batch sizes without using more VRAM:
  ```
  per_device_train_batch_size=2, gradient_accumulation_steps=4  → effective batch size = 8
  ```
- **DO** train for 2-5 epochs — this is the sweet spot for most LoRA fine-tunes.
- **DO** set `save_strategy="epoch"` so you can roll back to an earlier checkpoint if you overtrain.
- **DO** log training loss frequently (`logging_steps=10`) to monitor convergence.

### ❌ DON'T

- **DON'T** use `fp16=True` on A100 — use `bf16=True` instead. fp16 can cause NaN losses with large models.
- **DON'T** set the learning rate too high — `2e-4` is the standard for QLoRA. Going above `5e-4` often causes instability.
- **DON'T** set the learning rate too low either — `1e-5` or below will barely change the model.
- **DON'T** train for too many epochs (>10) — LoRA overfits quickly, especially on small datasets.
- **DON'T** skip gradient checkpointing hoping for speed gains — the VRAM cost isn't worth it on 14B models.
- **DON'T** use a batch size that causes OOM — start with `per_device_train_batch_size=1` and increase.
- **DON'T** forget `max_grad_norm=0.3` — gradient clipping prevents exploding gradients during QLoRA training.
- **DON'T** use `adam` or `adamw` (full precision) — always use `paged_adamw_8bit` to save ~4GB of VRAM.

---

## 3. GPU & Memory Management

### ✅ DO

- **DO** check VRAM before starting:
  ```bash
  nvidia-smi
  ```
  You need at least **18-22 GB free** for QLoRA training of Qwen2.5-14B.
- **DO** stop the inference server before training — both can't fit in 40GB simultaneously:
  - Training: ~18-22 GB
  - Serving: ~14 GB
  - Combined: ~32-36 GB (leaves no room for peaks)
- **DO** use `device_map="auto"` when loading the model — it distributes layers optimally across available devices.
- **DO** monitor VRAM during training:
  ```bash
  watch -n 1 nvidia-smi
  ```
- **DO** kill zombie GPU processes before starting:
  ```bash
  # List GPU processes
  nvidia-smi --query-compute-apps=pid,name,used_memory --format=csv
  # Kill if needed
  kill -9 <PID>
  ```
- **DO** clear CUDA cache if you run into OOM after a failed run:
  ```python
  import torch; torch.cuda.empty_cache()
  ```

### ❌ DON'T

- **DON'T** run training and serving on the same GPU simultaneously — you **will** OOM.
- **DON'T** leave Jupyter notebooks with loaded models open — they hold VRAM hostage.
- **DON'T** assume `nvidia-smi` shows real-time usage — there can be a 1-2s lag.
- **DON'T** try to train without quantization on a single 40GB GPU — Qwen2.5-14B needs ~28GB in fp16 just for weights.
- **DON'T** use `device_map="cpu"` for training — it will be 100x slower and defeat the purpose.

---

## 4. LoRA Hyperparameters

### ✅ DO

- **DO** use these as your starting point (they work well for Qwen2.5):
  ```python
  LoraConfig(
      r=16,               # Rank: 8-64 typical. 16 is a solid default.
      lora_alpha=32,       # Usually 2x rank
      lora_dropout=0.05,   # Light regularization
      target_modules=["q_proj", "k_proj", "v_proj", "o_proj",
                       "gate_proj", "up_proj", "down_proj"],
      bias="none",
      task_type="CAUSAL_LM",
  )
  ```
- **DO** target **all** attention + MLP projections (listed above) for best quality.
- **DO** call `model.print_trainable_parameters()` after applying LoRA — it should show **< 1%** trainable params:
  ```
  trainable params: 83,886,080 || all params: 14,774,083,584 || trainable%: 0.5677%
  ```
- **DO** start with `r=16` and only increase if the adapter isn't learning enough. Higher rank = more capacity but also more VRAM and overfitting risk.
- **DO** keep `lora_alpha` at `2 * r` — this scaling ratio is well-established.

### ❌ DON'T

- **DON'T** use wrong target module names — Qwen uses `q_proj`, `k_proj`, `v_proj`, `o_proj`, `gate_proj`, `up_proj`, `down_proj`. Using wrong names (like `query`, `key`, `value`) will silently create an empty/useless adapter.
- **DON'T** set `r` too high (128+) — you'll overfit and the adapter will be unnecessarily large.
- **DON'T** set `r` too low (1-4) — the adapter won't have enough capacity to learn anything useful.
- **DON'T** set `lora_dropout` too high (>0.2) — it over-regularizes and prevents learning.
- **DON'T** set `bias="all"` — it increases trainable params significantly with minimal benefit for chat models.
- **DON'T** forget `task_type="CAUSAL_LM"` — it tells PEFT how to properly attach the adapters.

---

## 5. Model & Tokenizer Handling

### ✅ DO

- **DO** call `prepare_model_for_kbit_training(model)` before applying LoRA — it's required for QLoRA:
  ```python
  from peft import prepare_model_for_kbit_training
  model = prepare_model_for_kbit_training(model)
  ```
- **DO** set `trust_remote_code=True` — Qwen models need custom code from HuggingFace.
- **DO** set the pad token if it's missing:
  ```python
  if tokenizer.pad_token is None:
      tokenizer.pad_token = tokenizer.eos_token
  ```
- **DO** use `tokenizer.apply_chat_template()` to format your training data — it ensures the correct ChatML format with special tokens.
- **DO** save both the adapter AND the tokenizer after training:
  ```python
  trainer.model.save_pretrained(OUTPUT_DIR)
  tokenizer.save_pretrained(OUTPUT_DIR)
  ```

### ❌ DON'T

- **DON'T** save the full merged model during training — only save the adapter. The adapter is 50-200MB; the merged model would be 14+GB.
- **DON'T** skip `prepare_model_for_kbit_training()` — without it, gradients don't flow correctly through quantized layers.
- **DON'T** modify the tokenizer's vocabulary (add new tokens) unless you really know what you're doing — it requires resizing model embeddings and can break things.
- **DON'T** use a different tokenizer than the base model's — the adapter must match the base model's tokenization.
- **DON'T** mix up `from_pretrained` for the base model vs adapter — for inference, load the base first, then `PeftModel.from_pretrained(base, adapter_path)`.

---

## 6. Evaluation & Testing

### ✅ DO

- **DO** always test the adapter locally **before** deploying to LoRAX:
  ```python
  from peft import PeftModel
  base = AutoModelForCausalLM.from_pretrained(BASE_MODEL, ...)
  model = PeftModel.from_pretrained(base, "path/to/adapter")
  ```
- **DO** compare adapter output vs base model output on the same prompts — you should see clear behavioral differences.
- **DO** test with prompts **not** in the training set — this reveals if the model generalized or just memorized.
- **DO** check for overfitting signs:
  - Training loss keeps dropping but val loss starts rising
  - Model generates training examples verbatim
  - Model struggles with slightly rephrased versions of training prompts
- **DO** test edge cases — empty inputs, very long inputs, prompts in the wrong language, adversarial inputs.
- **DO** keep a set of golden test prompts you re-run after each training experiment for consistent comparison.

### ❌ DON'T

- **DON'T** deploy an untested adapter to production — always validate locally first.
- **DON'T** evaluate only on training data — that tells you nothing about generalization.
- **DON'T** assume "training loss went down" means the adapter is good — low training loss can mean overfitting.
- **DON'T** compare adapters trained with different hyperparameters using different test prompts — keep tests consistent.
- **DON'T** skip testing the adapter through the full API pipeline (FastAPI → LoRAX → response) — integration bugs happen.

---

## 7. Deployment & Serving (LoRAX)

### ✅ DO

- **DO** use LoRAX for serving multiple adapters — it loads the base model once and swaps adapters dynamically (milliseconds).
- **DO** verify Docker GPU access before starting LoRAX:
  ```bash
  docker run --rm --gpus all nvidia/cuda:12.1.0-base-ubuntu22.04 nvidia-smi
  ```
- **DO** mount your HuggingFace cache to avoid re-downloading the 14B model:
  ```yaml
  volumes:
    - ~/.cache/huggingface:/root/.cache/huggingface
  ```
- **DO** wait for LoRAX to fully load before sending requests — first startup takes 60-90 seconds.
- **DO** test the base model first (no adapter), then test with an adapter:
  ```bash
  # Base model
  curl localhost:8080/v1/chat/completions -d '{"model":"Qwen/Qwen2.5-14B-Instruct","messages":[...]}'
  
  # With adapter
  curl localhost:8080/v1/chat/completions -d '{"model":"/adapters/my-adapter","messages":[...]}'
  ```
- **DO** keep adapters organized with clear naming:
  ```
  adapters/
    math-tutor-v1/
    math-tutor-v2/
    code-assistant-v1/
  ```
- **DO** create an `adapter_metadata.json` alongside each adapter for UI display:
  ```json
  {"name": "Math Tutor", "description": "Specializes in math explanations", "version": "1.0"}
  ```

### ❌ DON'T

- **DON'T** run LoRAX without the NVIDIA Container Toolkit — it can't access the GPU otherwise.
- **DON'T** forget to check LoRAX compatibility with Qwen2.5 architecture — check their GitHub releases/docs.
- **DON'T** expose the LoRAX port (8080) directly to the internet — always proxy through your FastAPI service.
- **DON'T** delete the base model cache between restarts — it will re-download 14GB every time.
- **DON'T** hot-swap adapter files while LoRAX has them loaded — restart the container after updating adapter files.
- **DON'T** forget to handle the case where a requested adapter doesn't exist — return a clear error, not a 500.

---

## 8. General Workflow

### ✅ DO

- **DO** follow this exact order:
  1. Prepare dataset → 2. Train adapter → 3. Test locally → 4. Deploy to LoRAX → 5. Update API → 6. Update UI
- **DO** version your adapters — never overwrite a working adapter with a new training run.
- **DO** use WandB or TensorBoard to track experiments — it saves hours of confusion later.
- **DO** document what data and hyperparameters each adapter was trained with.
- **DO** keep backups of your best adapters — they're small (50-200MB), easy to back up.
- **DO** start with a small dataset and quick training run to validate the pipeline end-to-end before investing in a large training run.
- **DO** use git to track your training scripts and configs (but **not** the adapter weights — they're binary files).

### ❌ DON'T

- **DON'T** jump straight to a massive training run — start with 100 examples and 1 epoch to verify everything works.
- **DON'T** commit adapter weights (`.safetensors`) to git — they're large binary files. Use `.gitignore`.
- **DON'T** skip reading error messages — PyTorch/HuggingFace errors are verbose but usually tell you exactly what went wrong.
- **DON'T** fine-tune without a clear goal — "make it better" is not a goal. "Make it answer math questions step-by-step" is.
- **DON'T** expect miracles from LoRA alone — it adjusts behavior/style, but can't add entirely new knowledge the base model doesn't have.
- **DON'T** forget to add `finetuning/adapters/` to `.gitignore`:
  ```
  # .gitignore
  llm_service/finetuning/adapters/
  ```

---

## Quick Reference Card

| Parameter | Recommended Value | Why |
|-----------|-------------------|-----|
| `r` (rank) | 16 | Good balance of capacity and efficiency |
| `lora_alpha` | 32 (2× rank) | Standard scaling factor |
| `lora_dropout` | 0.05 | Light regularization |
| `learning_rate` | 2e-4 | Proven default for QLoRA |
| `epochs` | 3 | Sweet spot before overfitting |
| `batch_size` | 2 | Safe for A100 40GB |
| `grad_accum_steps` | 4 | Effective batch = 8 |
| `max_seq_length` | 2048 | Covers most conversations |
| `quantization` | NF4 (4-bit) | Best VRAM savings |
| `compute_dtype` | bfloat16 | Native A100 support |
| `optimizer` | paged_adamw_8bit | Memory-efficient |
| `target_modules` | all 7 projections | Best LoRA quality |
| `min dataset size` | 500 examples | Below this, underfitting |
| `ideal dataset size` | 1000-5000 | Good generalization |

---

*Created: February 27, 2026 — For the multi-model-ai-app LLM service*
