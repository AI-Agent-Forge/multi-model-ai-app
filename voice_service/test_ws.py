import asyncio
import websockets
import json
import soundfile as sf
import numpy as np
import io

async def test_websocket():
    uri = "ws://localhost:5004/api/v1/omni/ws/chat"
    async with websockets.connect(uri) as websocket:
        print("Connected to WS.")
        
        # Test 1: Text chat
        print("Testing text chat...")
        await websocket.send(json.dumps({"type": "text_chat", "text": "Hello, this is a test."}))
        
        recv_text = False
        recv_audio = False
        
        while not (recv_text and recv_audio):
            message = await websocket.recv()
            if isinstance(message, bytes):
                print(f"Received audio bytes: {len(message)} bytes")
                recv_audio = True
            else:
                data = json.loads(message)
                print(f"Received JSON: {data}")
                if data.get("type") == "text_response":
                    recv_text = True
                elif data.get("type") == "error":
                    print(f"Error: {data['message']}")
                    break
                    
        print("Text chat test passed.")

        # Test 2: Audio chat
        print("Testing audio chat...")
        
        # Create dummy audio (1 second of speech-like sound or just white noise)
        sr = 24000
        t = np.linspace(0, 1, sr, endpoint=False)
        x = 0.5 * np.sin(2 * np.pi * 440 * t)
        
        buffer = io.BytesIO()
        sf.write(buffer, x, sr, format='WAV')
        audio_bytes = buffer.getvalue()
        
        # Send chunks
        chunk_size = 4096
        for i in range(0, len(audio_bytes), chunk_size):
            chunk = audio_bytes[i:i+chunk_size]
            await websocket.send(chunk)
            
        print("Sent audio bytes.")
        await websocket.send(json.dumps({"type": "stop_recording"}))
        print("Sent stop_recording.")
        
        recv_transcription = False
        recv_text2 = False
        recv_audio2 = False
        
        while not (recv_transcription and recv_text2 and recv_audio2):
            try:
                message = await websocket.recv()
            except websockets.exceptions.ConnectionClosed:
                print("Connection closed unexpectedly.")
                break
                
            if isinstance(message, bytes):
                print(f"Received audio bytes (test 2): {len(message)} bytes")
                recv_audio2 = True
            else:
                data = json.loads(message)
                print(f"Received JSON (test 2): {data}")
                if data.get("type") == "transcription":
                    recv_transcription = True
                elif data.get("type") == "text_response":
                    recv_text2 = True
                elif data.get("type") == "error":
                    print(f"Error: {data['message']}")
                    break

        print("Audio chat test finished.")
        
asyncio.run(test_websocket())
