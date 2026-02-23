import os
import sys
from unittest.mock import MagicMock, patch, mock_open
import pytest
from fastapi.testclient import TestClient
import torch

# Add project root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))   

# Mock ltx_pipelines and ltx_core before importing main
sys.modules["ltx_pipelines"] = MagicMock()
sys.modules["ltx_pipelines.utils"] = MagicMock()
sys.modules["ltx_pipelines.utils.media_io"] = MagicMock()
sys.modules["ltx_core"] = MagicMock()
sys.modules["ltx_core.components"] = MagicMock()
sys.modules["ltx_core.components.guiders"] = MagicMock()
sys.modules["ltx_core.loader"] = MagicMock()

from video_service.main import app

client = TestClient(app)

@pytest.fixture
def mock_pipeline():
    with patch("video_service.main.TI2VidTwoStagesPipeline") as mock_cls:
        # Mock the pipeline instance
        pipeline_instance = MagicMock()
        
        # Mock the __call__ method to return video and audio tensors
        dummy_video = torch.randn(121, 512, 768, 3)  # [frames, height, width, channels]
        dummy_audio = torch.randn(48000, 2)  # [samples, channels]
        pipeline_instance.return_value = (dummy_video, dummy_audio)
        
        # Mock the constructor
        mock_cls.return_value = pipeline_instance
        
        yield pipeline_instance

@pytest.fixture
def mock_encode_video():
    with patch("video_service.main.encode_video") as mock:
def test_health_check():
    """Test the health check endpoint."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "device" in data

def test_generate_video(mock_pipeline, mock_encode_video):
    """Test text-to-video generation."""
    # Mock video_pipe global
    with patch("video_service.main.video_pipe", mock_pipeline):
        # Mock file operations
        with patch("builtins.open", mock_open(read_data=b"fake video data")):
            with patch("os.remove"):
                response = client.post("/generate", json={
                    "prompt": "Test video generation",
                    "width": 768,
                    "height": 512,
                    "num_frames": 121,
                    "num_inference_steps": 50,
                    "seed": 42
                })
    
    assert response.status_code == 200
    data = response.json()
    assert "video" in data
    assert "format" in data
    assert data["format"] == "base64"
    assert "media_type" in data
    assert data["media_type"] == "video/mp4"

def test_generate_video_model_not_loaded():
    """Test error when model is not loaded."""
    with patch("video_service.main.video_pipe", None):
        response = client.post("/generate", json={
            "prompt": "Test video",
            "width": 768,
            "height": 512,
        })
    
    assert response.status_code == 503
    assert "not loaded" in response.json()["detail"].lower()

def test_image_to_video(mock_pipeline, mock_encode_video):
    """Test image-to-video generation."""
    from io import BytesIO
    from PIL import Image
    
    # Create a test image
    img = Image.new('RGB', (512, 512), color='red')
    img_byte_arr = BytesIO()
    img.save(img_byte_arr, format='PNG')
    img_byte_arr.seek(0)
    
    # Mock video_pipe global
    with patch("video_service.main.video_pipe", mock_pipeline):
        with patch("builtins.open", mock_open(read_data=b"fake video data")):
            with patch("os.remove"):
                response = client.post(
                    "/image-to-video",
                    data={
                        "prompt": "Animate this image",
                        "width": "768",
                        "height": "512",
                        "num_frames": "121",
                    },
                    files={
                        "file": ("test.png", img_byte_arr, "image/png")
                    }
                )

    assert response.status_code == 200
    data = response.json()
    assert "video" in data
    assert data["format"] == "base64"
    assert data["media_type"] == "video/mp4"

def test_cuda_oom_handling(mock_pipeline, mock_encode_video):
    """Test CUDA out of memory error handling."""
    # Make the pipeline raise a CUDA OOM error
    mock_pipeline.side_effect = RuntimeError("CUDA out of memory")
    
    with patch("video_service.main.video_pipe", mock_pipeline):
        with patch("torch.cuda.empty_cache"):
            response = client.post("/generate", json={
                "prompt": "Test OOM",
                "width": 768,
                "height": 512,
            })
    
    assert response.status_code == 507
    assert "out of memory" in response.json()["detail"].lower()
