import re
import torch
from transformers import (
    AutoModel,
    AutoModelForCausalLM, 
    AutoProcessor, 
    AutoTokenizer, 
    BitsAndBytesConfig
)
from llm_service.core.config import settings
from PIL import Image
import io
import base64
import requests

# Try to import Qwen2VLForConditionalGeneration if available
try:
    from transformers import Qwen2VLForConditionalGeneration
    QWEN2VL_AVAILABLE = True
except ImportError:
    QWEN2VL_AVAILABLE = False

class LLMService:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(LLMService, cls).__new__(cls)
            cls._instance.model = None
            cls._instance.processor = None
            cls._instance.tokenizer = None
        return cls._instance

    def _get_quantization_config(self):
        # Quantization via bitsandbytes is GPU-focused; skip on CPU
        if settings.DEVICE == "cpu":
            return None
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
            # For Qwen models, always try AutoModelForCausalLM first (supports both text and VL models)
            # with trust_remote_code enabled as Qwen architectures require custom code
            model_loaded = False
            if "qwen" in settings.MODEL_ID.lower():
                try:
                    self.model = AutoModelForCausalLM.from_pretrained(
                        settings.MODEL_ID,
                        device_map="auto" if settings.DEVICE == "cuda" else None,
                        quantization_config=quantization_config,
                        trust_remote_code=True
                    )
                    print(f"Loaded Qwen model with AutoModelForCausalLM: {settings.MODEL_ID}")
                    model_loaded = True
                except Exception as e:
                    print(f"AutoModelForCausalLM failed for Qwen: {e}")
                    # Try Qwen2VLForConditionalGeneration for VL models
                    if QWEN2VL_AVAILABLE and "vl" in settings.MODEL_ID.lower():
                        try:
                            self.model = Qwen2VLForConditionalGeneration.from_pretrained(
                                settings.MODEL_ID,
                                device_map="auto" if settings.DEVICE == "cuda" else None,
                                quantization_config=quantization_config,
                                trust_remote_code=True
                            )
                            print("Loaded as Qwen2VL model (Qwen2VLForConditionalGeneration)")
                            model_loaded = True
                        except Exception as e2:
                            print(f"Qwen2VLForConditionalGeneration failed: {e2}")
            
            if not model_loaded:
                # For non-Qwen models, try AutoModelForCausalLM first  
                try:
                    self.model = AutoModelForCausalLM.from_pretrained(
                        settings.MODEL_ID,
                        device_map="auto" if settings.DEVICE == "cuda" else None,
                        quantization_config=quantization_config,
                        trust_remote_code=True
                    )
                    print("Loaded with AutoModelForCausalLM")
                except Exception:
                    # Fall back to AutoModel
                    self.model = AutoModel.from_pretrained(
                        settings.MODEL_ID,
                        device_map="auto" if settings.DEVICE == "cuda" else None,
                        quantization_config=quantization_config,
                        trust_remote_code=True
                    )
                    print("Loaded with AutoModel (may not support generation)")

            # Try to load a multimodal processor; fall back to tokenizer for text-only models
            try:
                proc = AutoProcessor.from_pretrained(
                    settings.MODEL_ID, 
                    trust_remote_code=True
                )
                # Only treat it as a real multimodal processor if it has an
                # image_processor attribute (present on VL models). Otherwise
                # use the plain tokenizer path.
                if hasattr(proc, "image_processor") and proc.image_processor is not None:
                    self.processor = proc
                    self.tokenizer = None
                    print("Loaded multimodal processor.")
                else:
                    raise ValueError("Processor has no image_processor; treating as text-only")
            except Exception:
                self.processor = None
                self.tokenizer = AutoTokenizer.from_pretrained(
                    settings.MODEL_ID,
                    use_fast=True
                )
                # Ensure pad_token is set (many causal LMs don't set one)
                if self.tokenizer.pad_token is None:
                    self.tokenizer.pad_token = self.tokenizer.eos_token
                print("Processor unavailable; loaded tokenizer for text-only generation.")
            
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
            # Accept non-standard image fields (e.g., 'image' or 'images')
            image_field = msg.get("image")
            images_field = msg.get("images")
            
            if isinstance(content, str):
                new_content = [{"type": "text", "text": content}]
                # Attach any image from extra fields
                if image_field:
                    url = self._extract_image_url(image_field)
                    if url:
                        new_content.append({"type": "image", "image": url})
                if isinstance(images_field, list):
                    for it in images_field:
                        url = self._extract_image_url(it)
                        if url:
                            new_content.append({"type": "image", "image": url})
                formatted_messages.append({"role": role, "content": new_content})
            elif isinstance(content, list):
                new_content = []
                for item in content:
                    if item.get("type") == "text":
                        new_content.append({"type": "text", "text": item.get("text")})
                    elif item.get("type") == "image_url":
                        url = item.get("image_url", {}).get("url", "")
                        if url:
                            new_content.append({"type": "image", "image": url})
                # Also include non-standard image fields
                if image_field:
                    url = self._extract_image_url(image_field)
                    if url:
                        new_content.append({"type": "image", "image": url})
                if isinstance(images_field, list):
                    for it in images_field:
                        url = self._extract_image_url(it)
                        if url:
                            new_content.append({"type": "image", "image": url})
                formatted_messages.append({"role": role, "content": new_content})
                
        return formatted_messages

    def _extract_image_url(self, value: str) -> str:
        if not value:
            return ""
        # Match markdown-style links: [text](url) or plain URLs
        m = re.search(r"\((https?://[^)]+)\)", value)
        if m:
            return m.group(1)
        m = re.search(r"(https?://\S+)", value)
        if m:
            return m.group(1)
        return ""

    def generate(self, messages, max_new_tokens=1024, temperature=0.7, top_p=0.9):
        if not self.model:
            self.load_model()
            
        # Multimodal path if processor is available
        if self.processor is not None:
            formatted_messages = self._process_messages(messages)
            # Prepare inputs via chat template when available; otherwise fall back to plain prompt
            try:
                text = self.processor.apply_chat_template(
                    formatted_messages, tokenize=False, add_generation_prompt=True
                )
            except Exception:
                # Build plain text prompt
                prompt_parts = []
                for msg in formatted_messages:
                    role = msg.get("role", "user")
                    text_items = [it.get("text") for it in msg.get("content", []) if it.get("type") == "text"]
                    prompt_parts.append(f"{role.capitalize()}: {' '.join([t for t in text_items if t])}")
                prompt_parts.append("Assistant:")
                text = "\n".join(prompt_parts)

            # Try to process vision info if available
            image_inputs, video_inputs = None, None
            try:
                from qwen_vl_utils import process_vision_info
                image_inputs, video_inputs = process_vision_info(formatted_messages)
            except Exception:
                image_inputs, video_inputs = None, None

            inputs = self.processor(
                text=[text],
                images=image_inputs,
                videos=video_inputs,
                padding=True,
                return_tensors="pt",
            )

            inputs = inputs.to(self.model.device)

            # Generate - handle both direct model.generate() and language_model.generate()
            if hasattr(self.model, 'generate'):
                generate_fn = self.model.generate
            elif hasattr(self.model, 'language_model') and hasattr(self.model.language_model, 'generate'):
                generate_fn = self.model.language_model.generate
            else:
                raise RuntimeError(f"Model {type(self.model).__name__} has no generate() method")
            
            generated_ids = generate_fn(
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

        # Text-only path when tokenizer is available
        if self.tokenizer is not None:
            # Build a simple prompt from conversation
            prompt_parts = []
            for msg in messages:
                role = msg.get("role", "user")
                content = msg.get("content", "")
                if isinstance(content, list):
                    # Concatenate text items only for text-only models
                    text_items = [it.get("text") for it in content if it.get("type") == "text"]
                    content = "\n".join([t for t in text_items if t])
                prompt_parts.append(f"{role.capitalize()}: {content}")
            prompt_parts.append("Assistant:")
            prompt = "\n".join(prompt_parts)

            inputs = self.tokenizer(prompt, return_tensors="pt")
            inputs = {k: v.to(self.model.device) for k, v in inputs.items()}

            # Generate - handle both direct model.generate() and language_model.generate()
            if hasattr(self.model, 'generate'):
                generate_fn = self.model.generate
            elif hasattr(self.model, 'language_model') and hasattr(self.model.language_model, 'generate'):
                generate_fn = self.model.language_model.generate
            else:
                raise RuntimeError(f"Model {type(self.model).__name__} has no generate() method")
            
            generated_ids = generate_fn(
                **inputs,
                max_new_tokens=max_new_tokens,
                temperature=temperature,
                top_p=top_p,
                do_sample=True
            )
            output_text = self.tokenizer.batch_decode(generated_ids, skip_special_tokens=True)
            # Return only the assistant portion after the prompt
            return output_text[0].split("Assistant:")[-1].strip()

        raise RuntimeError("Neither processor nor tokenizer is available for generation.")

llm_service = LLMService()
