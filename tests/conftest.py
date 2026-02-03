import pytest
from unittest.mock import MagicMock
import sys

# Mock qwen_tts before importing app
module_mock = MagicMock()
sys.modules["qwen_tts"] = module_mock

from fastapi.testclient import TestClient
from app.main import app
from app.core.model import model_manager

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture(autouse=True)
def mock_model():
    """Mock the Qwen3TTSModel to prevent actual loading"""
    mock_model_instance = MagicMock()
    
    # Setup return values for generate methods
    # generate_voice_clone returns (wavs, sr)
    mock_model_instance.generate_voice_clone.return_value = ([ [0.1]*1000 ], 24000)
    mock_model_instance.generate_voice_design.return_value = ([ [0.1]*1000 ], 24000)
    mock_model_instance.generate_custom_voice.return_value = ([ [0.1]*1000 ], 24000)
    
    model_manager.model = mock_model_instance
    return mock_model_instance
