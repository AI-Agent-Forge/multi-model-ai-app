import io
import base64
import torch
import logging
from PIL import Image, ImageFilter
import numpy as np
import gc

from core.config import settings
from core.model import model_manager

logger = logging.getLogger(__name__)

class ImageService:
    @staticmethod
    def _calculate_image_complexity(image: Image.Image) -> int:
        """
        Uses Laplacian edge detection to estimate image complexity 
        and map it to a suggested layer count (2 to 6).
        """
        try:
            # Convert to grayscale
            gray = image.convert("L")
            # Apply edge detection filter
            edges = gray.filter(ImageFilter.FIND_EDGES)
            # Convert to numpy array to calculate variance
            edge_array = np.array(edges)
            variance = np.var(edge_array)
            
            logger.info(f"Image edge variance calculated: {variance}")
            
            # Map variance to layer count based on heuristics
            if variance < 500:
                count = 2 # Simple (e.g. apple on wall)
            elif variance < 1500:
                count = 3 # Average-low
            elif variance < 3000:
                count = 4 # Average (Default historical)
            elif variance < 5000:
                count = 5 # Detailed
            else:
                count = 6 # Highly complex
                
            logger.info(f"Dynamic layer count determined: {count}")
            return count
        except Exception as e:
            logger.warning(f"Failed to calculate dynamic layer count: {e}. Defaulting to 4.")
            return 4

    @staticmethod
    async def process_layered_image(
        file_bytes: bytes,
        prompt: str,
        negative_prompt: str,
        target_layer_index: int,
        steps: int,
        guidance_scale: float,
        seed: int,
        layers: int
    ):
        """
        1. Decompose with Layered model
        2. Edit target layer with Edit model
        3. Recompose layers sequentially
        """
        try:
            # Ensure memory is clean before starting
            if torch.cuda.is_available():
                torch.cuda.empty_cache()

            # Retrieve pipelines
            layered_pipe = model_manager.get_layered_model()
            edit_pipe = model_manager.get_edit_model()
            
            if layered_pipe is None or edit_pipe is None:
                raise Exception("Models not properly loaded.")

            # Load the original image
            original_image = Image.open(io.BytesIO(file_bytes)).convert("RGBA")
            width, height = original_image.size
            generator = torch.Generator(device=settings.DEVICE).manual_seed(seed)
            
            # 1. Determine Dynamic Layers if requested (-1)
            target_layers_count = layers
            if layers < 0:
                target_layers_count = ImageService._calculate_image_complexity(original_image)
            
            logger.info(f"Step 1: Decomposing into {target_layers_count} layers...")
            layered_inputs = {
                "image": original_image,
                "generator": generator,
                "true_cfg_scale": 4.0, # default cfg
                "num_inference_steps": 50, # default steps for layered
                "num_images_per_prompt": 1,
                "layers": target_layers_count,
                "resolution": 640,
                "cfg_normalize": True, 
                "use_en_prompt": True, 
            }

            with torch.inference_mode():
                layered_output = layered_pipe(**layered_inputs)

            if not layered_output.images:
                raise Exception("Layer decomposition failed.")

            # Get the list of layer images (PIL Images)
            output_layers = layered_output.images[0]
            
            # Aggressively clear cache after Layer pipeline
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
                gc.collect()
            
            # 2. Automatically select target layer using CLIP if requested (-1)
            actual_target_index = target_layer_index
            if target_layer_index < 0:
                logger.info("Using CLIP to semantically find the best layer for the prompt...")
                clip_model, clip_processor = model_manager.get_clip_model()
                
                # Convert RGBA layers to RGB for CLIP processing
                rgb_layers = [lyr.convert("RGB") for lyr in output_layers]
                
                # Pass through CLIP
                inputs = clip_processor(
                    text=[prompt], 
                    images=rgb_layers, 
                    return_tensors="pt", 
                    padding=True
                ).to(settings.DEVICE)
                
                with torch.inference_mode():
                    clip_outputs = clip_model(**inputs)
                    # Get image-text similarity scores
                    logits_per_text = clip_outputs.logits_per_text 
                    probs = logits_per_text.softmax(dim=1)
                    
                # Get the index with highest probability
                best_match_idx = torch.argmax(probs, dim=1).item()
                actual_target_index = best_match_idx
                logger.info(f"CLIP selected layer {actual_target_index} with confidences: {probs.cpu().tolist()[0]}")
                
                # Clear cache after CLIP
                if torch.cuda.is_available():
                    torch.cuda.empty_cache()
                    gc.collect()
            
            # Validate target index
            if actual_target_index < 0 or actual_target_index >= len(output_layers):
                 raise ValueError(f"target_layer_index {actual_target_index} is out of bounds (0 to {len(output_layers)-1})")

            # Extract the specific layer
            layer_to_edit = output_layers[actual_target_index].convert("RGBA")
            
            # Extract the alpha channel (mask) and convert the RGB portion for editing
            original_alpha = layer_to_edit.split()[3]
            layer_rgb = layer_to_edit.convert("RGB")

            logger.info(f"Step 2: Editing layer {actual_target_index} with prompt: '{prompt}'...")
            edit_inputs = {
                "image": layer_rgb,
                "prompt": prompt,
                "negative_prompt": negative_prompt,
                "generator": generator,
                "guidance_scale": guidance_scale,
                "num_inference_steps": steps,
            }
            
            with torch.inference_mode():
                edit_output = edit_pipe(**edit_inputs)
                
            if not edit_output.images:
                 raise Exception("Image editing failed.")
                 
            # Clear cache after editing
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
                gc.collect()
                 
            # The edited layer comes back as RGB usually
            edited_layer_rgb = edit_output.images[0].convert("RGB")
            
            # Resize edited layer back to original dimensions if the model changed it
            if edited_layer_rgb.size != layer_to_edit.size:
                 edited_layer_rgb = edited_layer_rgb.resize(layer_to_edit.size, Image.LANCZOS)
                 
            # Re-apply the original alpha channel so it remains transparent
            edited_layer = edited_layer_rgb.convert("RGBA")
            edited_layer.putalpha(original_alpha)
                 
            # Replace the old layer with the new edited layer
            output_layers[actual_target_index] = edited_layer

            logger.info("Step 3: Recomposing layers...")
            # We composite them from back (index 0) to front (index N)
            recomposed_image = Image.new("RGBA", layer_to_edit.size, (0, 0, 0, 0))
            for layer in output_layers:
                 recomposed_image.alpha_composite(layer)
                 
            # Convert final image to base64
            buffered = io.BytesIO()
            recomposed_image.save(buffered, format="PNG")
            final_base64 = base64.b64encode(buffered.getvalue()).decode("utf-8")
            
            # Convert layers to base64 for debugging/frontend usage
            base64_layers = []
            for img in output_layers:
                buf = io.BytesIO()
                img.save(buf, format="PNG")
                base64_layers.append(base64.b64encode(buf.getvalue()).decode("utf-8"))
            
            return final_base64, base64_layers
            
        except Exception as e:
            logger.error(f"Error in process_layered_image: {e}")
            raise e
