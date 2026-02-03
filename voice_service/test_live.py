import requests
import soundfile as sf
import numpy as np
import os
import time

BASE_URL = "http://localhost:8001"
API_PREFIX = "/api/v1"

def create_dummy_wav(filename="test_ref.wav"):
    sr = 24000
    # Create 1 second of silence or simple tone
    t = np.linspace(0, 1, sr, endpoint=False)
    x = 0.5 * np.sin(2 * np.pi * 440 * t)
    sf.write(filename, x, sr)
    return filename

def test_root():
    try:
        resp = requests.get(f"{BASE_URL}/")
        print(f"Root endpoint: {resp.status_code}")
        print(resp.json())
        assert resp.status_code == 200
    except Exception as e:
        print(f"Root check failed: {e}")

def test_clone():
    filename = create_dummy_wav()
    url = f"{BASE_URL}{API_PREFIX}/tts/clone"
    files = {'ref_audio': open(filename, 'rb')}
    data = {
        'text': 'Hello, this is a cloning test.',
        'ref_text': 'This is the reference text.',
        'language': 'English'
    }
    print(f"Testing Clone at {url}...")
    try:
        resp = requests.post(url, data=data, files=files)
        print(f"Clone response: {resp.status_code}")
        if resp.status_code == 200:
            with open("output_clone.wav", "wb") as f:
                f.write(resp.content)
            print("Saved output_clone.wav")
        else:
            print(resp.text)
    except Exception as e:
        print(f"Clone failed: {e}")
    finally:
        files['ref_audio'].close()
        if os.path.exists(filename):
            os.remove(filename)

def test_design():
    url = f"{BASE_URL}{API_PREFIX}/tts/design"
    data = {
        'text': 'Hello, this is a design test.',
        'instruct': 'Speak cheerfully.',
        'language': 'English'
    }
    print(f"Testing Design at {url}...")
    try:
        resp = requests.post(url, data=data)
        print(f"Design response: {resp.status_code}")
        if resp.status_code == 200:
            with open("output_design.wav", "wb") as f:
                f.write(resp.content)
            print("Saved output_design.wav")
        else:
            print(resp.text)
    except Exception as e:
        print(f"Design failed: {e}")

def test_custom():
    url = f"{BASE_URL}{API_PREFIX}/tts/custom"
    data = {
        'text': 'Hello, this is a custom voice test.',
        'speaker': 'aiden', # Assumption
        'language': 'English'
    }
    print(f"Testing Custom at {url}...")
    try:
        resp = requests.post(url, data=data)
        print(f"Custom response: {resp.status_code}")
        if resp.status_code == 200:
            with open("output_custom.wav", "wb") as f:
                f.write(resp.content)
            print("Saved output_custom.wav")
        else:
            print(resp.text)
    except Exception as e:
        print(f"Custom failed: {e}")

if __name__ == "__main__":
    # Wait for server to start
    print("Waiting for server...")
    for i in range(60):
        try:
            requests.get(f"{BASE_URL}/")
            print("Server is up!")
            break
        except:
            time.sleep(2)
    else:
        print("Server did not start in time.")
        # We continue to try tests anyway to see errors
    
    test_root()
    test_clone()
    test_design()
    test_custom()
