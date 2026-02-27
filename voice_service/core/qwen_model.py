import torch
from transformers import AutoTokenizer, AutoModelForCausalLM
from voice_service.core.config import settings

class QwenModel:
    def __init__(self):
        self.model_name = settings.QWEN_LLM_MODEL_ID
        self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)

        self.model = AutoModelForCausalLM.from_pretrained(
            self.model_name,
            torch_dtype=torch.bfloat16,
            device_map="auto"
        )

    def generate(self, prompt, max_tokens=200, temperature=0.7):
        messages = [
            {"role": "system", "content": settings.DEFAULT_SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ]

        text = self.tokenizer.apply_chat_template(
            messages,
            tokenize=False,
            add_generation_prompt=True
        )

        inputs = self.tokenizer(text, return_tensors="pt").to("cuda")

        outputs = self.model.generate(
            **inputs,
            max_new_tokens=max_tokens,
            temperature=temperature,
            do_sample=True,
            pad_token_id=self.tokenizer.eos_token_id
        )

        response = self.tokenizer.decode(outputs[0], skip_special_tokens=True)

        # Remove prompt part from output
        return response.split("assistant")[-1].strip()