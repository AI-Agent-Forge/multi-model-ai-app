from fastapi.testclient import TestClient
from image_service_layered.main import app

client = TestClient(app)

def test_read_main():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Image Service Layered API is running"}
