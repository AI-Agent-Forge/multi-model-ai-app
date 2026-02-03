import os
import sys
from unittest.mock import MagicMock, patch
import pytest
from fastapi.testclient import TestClient

# Add project root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

# Mock ltx_pipelines before importing main
sys.modules["ltx_pipelines"] = MagicMock()
from ltx_pipelines import TI2VidTwoStagesPipeline

from video_service.main import app

client = TestClient(app)

@pytest.fixture
def mock_pipeline():
    with patch("video_service.main.TI2VidTwoStagesPipeline") as mock:
        # Mock the pipeline instance
        pipeline_instance = MagicMock()
        mock.from_pretrained.return_value = pipeline_instance
        
        # Mock the output
        mock_output = MagicMock()
        from PIL import Image
        dummy_img = Image.new('RGB', (100, 100))
        mock_output.frames = [[dummy_img]] 
        
        pipeline_instance.return_value = mock_output
        
        yield pipeline_instance

@pytest.fixture
def mock_export():
    with patch("diffusers.utils.export_to_video") as mock:
        mock.return_value = "dummy.mp4" # return generated path
        yield mock

def test_generate_video(mock_pipeline, mock_export):
    with patch("builtins.open", new_callable=MagicMock) as mock_open:
        file_handle = MagicMock()
        file_handle.read.return_value = b"fake video data"
        mock_open.return_value.__enter__.return_value = file_handle
        
        with patch("os.remove"):
            response = client.post("/generate", json={
                "prompt": "Test video",
                "width": 128,
                "height": 128,
                "num_frames": 16
            })
            
    assert response.status_code == 200
    data = response.json()
    assert "video" in data

def test_image_to_video(mock_pipeline, mock_export):
    from io import BytesIO
    from PIL import Image
    
    img = Image.new('RGB', (100, 100), color='red')
    img_byte_arr = BytesIO()
    img.save(img_byte_arr, format='PNG')
    img_byte_arr.seek(0)
    
    with patch("builtins.open", new_callable=MagicMock) as mock_open:
        file_handle = MagicMock()
        file_handle.read.return_value = b"fake video data"
        mock_open.return_value.__enter__.return_value = file_handle
        
        with patch("os.remove"):
            response = client.post(
                "/image-to-video",
                data={
                    "prompt": "Test image to video",
                },
                files={
                    "file": ("test.png", img_byte_arr, "image/png")
                }
            )

    assert response.status_code == 200
    data = response.json()
    assert "video" in data
