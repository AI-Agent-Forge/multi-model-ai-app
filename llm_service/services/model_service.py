import torch
from transformers import AutoModelForCausalLM, AutoProcessor, BitsAndBytesConfig
from llm_service.core.config import settings
from PIL import Image
import io
import base64
import requests

class LLMService:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(LLMService, cls).__new__(cls)
            cls._instance.model = None
            cls._instance.processor = None
        return cls._instance

    def _get_quantization_config(self):
        if settings.QUANTIZATION == "4bit":
            return BitsAndBytesConfig(
                load_in_4bit=True,
                bnb_4bit_quant_type="nf4",
                bnb_4bit_compute_dtype=torch.float16,
                bnb_4bit_use_double_quant=True
            )
        elif settings.QUANTIZATION == "8bit":
            return BitsAndBytesConfig(load_in_8bit=True)
        return None

    def load_model(self):
        if self.model is not None:
            return

        print(f"Loading model: {settings.MODEL_ID} on {settings.DEVICE} with {settings.QUANTIZATION} quantization...")
        
        quantization_config = self._get_quantization_config()
        
        try:
            self.model = AutoModelForCausalLM.from_pretrained(
                settings.MODEL_ID,
                device_map="auto" if settings.DEVICE == "cuda" else None,
                quantization_config=quantization_config,
                trust_remote_code=True
            )
            
            self.processor = AutoProcessor.from_pretrained(
                settings.MODEL_ID, 
                trust_remote_code=True
            )
            
            if settings.DEVICE == "cpu":
                 self.model.to("cpu")
                 
            print("Model loaded successfully.")
        except Exception as e:
            print(f"Error loading model: {e}")
            raise e

    def _process_messages(self, messages):
        # Convert OpenAI format to Qwen format if necessary or use processor.apply_chat_template
        # Qwen-VL usually accepts list of dicts with role and content (which can include images)
        
        formatted_messages = []
        for msg in messages:
            content = msg.get("content")
            role = msg.get("role")
            
            if isinstance(content, str):
                formatted_messages.append({"role": role, "content": [{"type": "text", "text": content}]})
            elif isinstance(content, list):
                new_content = []
                for item in content:
                    if item.get("type") == "text":
                        new_content.append({"type": "text", "text": item.get("text")})
                    elif item.get("type") == "image_url":
                        url = item.get("image_url", {}).get("url", "")
                        if url:
                            new_content.append({"type": "image", "image": url})
                formatted_messages.append({"role": role, "content": new_content})
                
        return formatted_messages

    def generate(self, messages, max_new_tokens=1024, temperature=0.7, top_p=0.9):
        if not self.model:
            self.load_model()
            
        formatted_messages = self._process_messages(messages)
        
        # Prepare inputs
        text = self.processor.apply_chat_template(
            formatted_messages, tokenize=False, add_generation_prompt=True
        )
        
        image_inputs, video_inputs = process_vision_info(formatted_messages) # Hypothetical helper from qwen_vl_utils, but let's stick to processor handling
        # Note: AutoProcessor for Qwen3-VL usually handles the complex input parsing.
        # But standard transformers usage often needs manual image loading.
        # For simplicity in this iteration, using processor's robust call.
        
        inputs = self.processor(
            text=[text],
            images=image_inputs,
            videos=video_inputs,
            padding=True,
            return_tensors="pt",
        )
        
        inputs = inputs.to(self.model.device)

        # Generate
        generated_ids = self.model.generate(
            **inputs,
            max_new_tokens=max_new_tokens,
            temperature=temperature,
            top_p=top_p
        )
        
        generated_ids_trimmed = [
            out_ids[len(in_ids) :] for in_ids, out_ids in zip(inputs.input_ids, generated_ids)
        ]
        
        output_text = self.processor.batch_decode(
            generated_ids_trimmed, skip_special_tokens=True, clean_up_tokenization_spaces=False
        )
        
        return output_text[0]

# Helper for processing vision info as intended by Qwen VL Utils if needed
# We might need to implement a simple extractor if qwen_vl_utils is not available or compatible
from qwen_vl_utils import process_vision_info

llm_service = LLMService()
