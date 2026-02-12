
import sys
import os

# Add the project root to sys.path
sys.path.append("/home/ubuntu/sudar-us-east-1-disk/git/multi-model-ai-app")

try:
    from voice_service.core.model import ModelManager
    print("Successfully imported ModelManager")
    
    # We can't fully load the model because the package might not be installed in this environment
    # But we can check if the file syntax is correct and the class is importable
    # The actual load_model call would fail without qwen_tts installed, but we fixed a syntax error/NameError
    
    # Let's just check if we can inspect the source code of the method to see our change
    import inspect
    source = inspect.getsource(ModelManager.load_model)
    if "model_kwargs" in source:
        print("Verification Successful: model_kwargs is present in load_model")
    else:
        print("Verification Failed: model_kwargs NOT found in load_model")
        
except ImportError as e:
    print(f"ImportError: {e}")
except Exception as e:
    print(f"An error occurred: {e}")
