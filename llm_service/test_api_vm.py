import requests
import time
import sys
import json

BASE_URL = "http://localhost:5004"

def wait_for_server():
    print("Waiting for server to start...")
    for _ in range(120): # Wait up to 2 minutes
        try:
            response = requests.get(f"{BASE_URL}/health")
            if response.status_code == 200:
                print("\nServer is up!")
                return True
        except requests.exceptions.ConnectionError:
            time.sleep(1)
            print(".", end="", flush=True)
    print("\nServer failed to start.")
    return False

def test_chat():
    print("\nTesting Chat Completion...")
    payload = {
        "model": "Qwen/Qwen3-VL-32B", 
        "messages": [
            {"role": "user", "content": "Describe this image", "image": "[https://placehold.co/600x400](https://placehold.co/600x400)"}
        ],
        "max_tokens": 50
    }
    
    try:
        print(f"Sending payload...")
        response = requests.post(f"{BASE_URL}/v1/chat/completions", json=payload)
        print(f"Status: {response.status_code}")
        print(json.dumps(response.json(), indent=2))
    except Exception as e:
        print(f"Test failed: {e}")

if __name__ == "__main__":
    if wait_for_server():
        test_chat()
