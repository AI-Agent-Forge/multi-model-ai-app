#!/usr/bin/env python3
"""
Test script to validate the video service setup and dependencies.
Run this before starting the service to ensure everything is configured correctly.
"""

import sys
import os

def test_imports():
    """Test that all required imports are available."""
    print("Testing imports...")
    
    try:
        import torch
        print(f"✓ PyTorch {torch.__version__} installed")
        print(f"  CUDA available: {torch.cuda.is_available()}")
        if torch.cuda.is_available():
            print(f"  CUDA version: {torch.version.cuda}")
            print(f"  GPU: {torch.cuda.get_device_name(0)}")
            print(f"  GPU memory: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.1f} GB")
    except ImportError as e:
        print(f"✗ PyTorch not installed: {e}")
        return False
    
    try:
        import fastapi
        print(f"✓ FastAPI installed")
    except ImportError as e:
        print(f"✗ FastAPI not installed: {e}")
        return False
    
    try:
        import PIL
        print(f"✓ Pillow installed")
    except ImportError as e:
        print(f"✗ Pillow not installed: {e}")
        return False
    
    try:
        import av
        print(f"✓ PyAV installed")
    except ImportError as e:
        print(f"✗ PyAV not installed: {e}")
        return False
    
    try:
        from ltx_pipelines import TI2VidTwoStagesPipeline
        print(f"✓ ltx-pipelines installed")
    except ImportError as e:
        print(f"✗ ltx-pipelines not installed: {e}")
        print("  Install with: pip install git+https://github.com/Lightricks/LTX-2.git#subdirectory=packages/ltx-pipelines")
        return False
    
    try:
        from ltx_core.components.guiders import MultiModalGuiderParams
        print(f"✓ ltx-core available")
    except ImportError as e:
        print(f"✗ ltx-core not available: {e}")
        return False
    
    return True

def test_config():
    """Test configuration and environment variables."""
    print("\nTesting configuration...")
    
    try:
        from config import settings
        print(f"✓ Configuration loaded")
        print(f"  Host: {settings.HOST}:{settings.PORT}")
        print(f"  Device: {settings.DEVICE}")
        print(f"  Model path: {settings.MODEL_PATH}")
        print(f"  Spatial upsampler: {settings.SPATIAL_UPSAMPLER_PATH}")
        print(f"  Distilled LoRA: {settings.DISTILLED_LORA_PATH}")
        print(f"  Gemma root: {settings.GEMMA_ROOT}")
        
        # Check if paths exist (if they're local paths)
        if os.path.exists(settings.MODEL_PATH):
            print(f"  ✓ Model path exists locally")
        elif settings.MODEL_PATH.startswith("Lightricks/") or settings.MODEL_PATH.startswith("google/"):
            print(f"  ℹ Using HuggingFace repo (will auto-download)")
        else:
            print(f"  ⚠ Model path does not exist locally: {settings.MODEL_PATH}")
        
        return True
    except Exception as e:
        print(f"✗ Configuration error: {e}")
        return False

def test_cuda_memory():
    """Test CUDA memory availability."""
    print("\nTesting CUDA memory...")
    
    try:
        import torch
        if not torch.cuda.is_available():
            print("ℹ CUDA not available - will use CPU (very slow)")
            return True
        
        # Get available memory
        free_memory = torch.cuda.get_device_properties(0).total_memory - torch.cuda.memory_allocated(0)
        free_gb = free_memory / 1024**3
        
        print(f"  Free GPU memory: {free_gb:.1f} GB")
        
        if free_gb < 16:
            print(f"  ⚠ Low GPU memory. Recommended: 24GB+")
            print(f"    Consider using FP8 model or reducing resolution")
        elif free_gb < 24:
            print(f"  ✓ GPU memory sufficient (may need optimization)")
        else:
            print(f"  ✓ GPU memory excellent")
        
        return True
    except Exception as e:
        print(f"✗ CUDA memory check failed: {e}")
        return False

def test_model_files():
    """Check if model files are accessible."""
    print("\nChecking model files...")
    
    try:
        from config import settings
        
        # Check if HuggingFace hub is accessible
        try:
            from huggingface_hub import HfApi
            api = HfApi()
            print("✓ HuggingFace Hub accessible")
        except Exception as e:
            print(f"⚠ HuggingFace Hub access issue: {e}")
        
        return True
    except Exception as e:
        print(f"✗ Model files check failed: {e}")
        return False

def main():
    print("=" * 60)
    print("LTX-2 Video Service Setup Validator")
    print("=" * 60)
    
    all_tests = [
        test_imports(),
        test_config(),
        test_cuda_memory(),
        test_model_files(),
    ]
    
    print("\n" + "=" * 60)
    if all(all_tests):
        print("✓ All tests passed! You can start the service.")
        print("\nTo start the service, run:")
        print("  python main.py")
        print("\nOr:")
        print("  uvicorn main:app --host 0.0.0.0 --port 8002")
        return 0
    else:
        print("✗ Some tests failed. Please fix the issues above.")
        print("\nCommon issues:")
        print("  - Install missing dependencies: pip install -r requirements.txt")
        print("  - Set environment variables for model paths")
        print("  - Ensure CUDA toolkit is installed for GPU support")
        return 1

if __name__ == "__main__":
    sys.exit(main())
