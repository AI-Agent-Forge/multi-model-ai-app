#!/usr/bin/env python3
"""Test streaming SSE response from LLM service."""
import requests
import json
import time

url = "http://localhost:5004/v1/chat/completions"
payload = {
    "model": "Qwen/Qwen2.5-14B-Instruct",
    "messages": [{"role": "user", "content": "Write a short poem about AI in 4 lines."}],
    "max_tokens": 100,
    "temperature": 0.7,
    "stream": True
}

print("Testing SSE streaming response...")
print("=" * 60)

start_time = time.time()
token_count = 0
full_response = ""

try:
    response = requests.post(url, json=payload, stream=True, timeout=60)
    response.raise_for_status()
    
    for line in response.iter_lines():
        if line:
            line_str = line.decode('utf-8')
            if line_str.startswith('data: '):
                data_str = line_str[6:]  # Remove 'data: ' prefix
                if data_str.strip() == '[DONE]':
                    break
                try:
                    data = json.loads(data_str)
                    if 'choices' in data and len(data['choices']) > 0:
                        delta = data['choices'][0].get('delta', {})
                        content = delta.get('content', '')
                        if content:
                            print(content, end='', flush=True)
                            full_response += content
                            token_count += 1
                except json.JSONDecodeError:
                    pass
    
    end_time = time.time()
    elapsed = end_time - start_time
    
    print("\n" + "=" * 60)
    print(f"\n✅ Streaming complete!")
    print(f"Tokens generated: {token_count}")
    print(f"Time elapsed: {elapsed:.2f}s")
    print(f"Tokens/sec: {token_count/elapsed:.2f}")
    
except Exception as e:
    print(f"\n❌ Error: {e}")
