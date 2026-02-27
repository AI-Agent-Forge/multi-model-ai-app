import torch
from transformers import AutoProcessor, AutoModelForCausalLM

model_name = "Qwen/Qwen2.5-7B-Instruct"

processor = AutoProcessor.from_pretrained(model_name)

model = AutoModelForCausalLM.from_pretrained(
    model_name,
    torch_dtype=torch.bfloat16,  # Best for A100
    device_map="auto"
)

inputs = processor("Hello, introduce yourself.", return_tensors="pt").to("cuda")

outputs = model.generate(**inputs, max_new_tokens=100)

print(processor.decode(outputs[0], skip_special_tokens=True))