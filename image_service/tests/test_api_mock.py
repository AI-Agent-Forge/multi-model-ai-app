from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch
import sys
import os

# Add project root to path to import image_service
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from image_service.main import app, lifespan

client = TestClient(app)

# Mock the pipelines
@patch("image_service.main.QwenImagePipeline")
@patch("image_service.main.QwenImageEditPlusPipeline")
def test_generate_image(mock_edit, mock_txt2img):
    # Setup mock capabilities
    mock_pipeline_instance = MagicMock()
    mock_txt2img.from_pretrained.return_value = mock_pipeline_instance
    mock_edit.from_pretrained.return_value = MagicMock()

    # Mock return value of pipeline
    mock_output = MagicMock()
    mock_image = MagicMock()
    # Mock save method
    def save_side_effect(fp, format):
        fp.write(b"fake_image_data")
    
    mock_image.save.side_effect = save_side_effect
    mock_output.images = [mock_image]
    mock_pipeline_instance.return_value = mock_output

    # Context manager for startup
    with TestClient(app) as client:
        response = client.post("/generate", json={"prompt": "test prompt"})
        assert response.status_code == 200
        json_resp = response.json()
        assert "image" in json_resp
        assert json_resp["format"] == "base64"

def test_edit_image():
    # Similar mock setup would be needed, but since we use global variables in main.py, 
    # and TestClient triggers lifespan, we need to be careful.
    # The previous test handles the lifespan context.
    pass
