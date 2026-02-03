import io

def test_root_endpoint(client):
    response = client.get("/")
    assert response.status_code == 200
    assert "Welcome" in response.json()["message"]

def test_custom_voice(client):
    response = client.post(
        "/api/v1/tts/custom",
        data={"text": "Hello world", "speaker": "Anna", "language": "English"}
    )
    assert response.status_code == 200
    assert response.headers["content-type"] == "audio/wav"

def test_voice_design(client):
    response = client.post(
        "/api/v1/tts/design",
        data={"text": "Hello world", "instruct": "Happy tone", "language": "English"}
    )
    assert response.status_code == 200
    assert response.headers["content-type"] == "audio/wav"

def test_voice_clone(client):
    # Create a dummy wav file
    dummy_wav = io.BytesIO(b"RIFF....WAVEfmt ...data....")
    
    response = client.post(
        "/api/v1/tts/clone",
        data={"text": "Hello world", "ref_text": "Reference", "language": "English"},
        files={"ref_audio": ("ref.wav", dummy_wav, "audio/wav")}
    )
    assert response.status_code == 200
    assert response.headers["content-type"] == "audio/wav"
