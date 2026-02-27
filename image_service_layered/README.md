# Layered Image Service

This is the FastAPI backend service for layered image generation and editing.

## Structure

- `main.py`: Main application entrypoint.
- `config.py`: Configuration and environment variables.
- `requirements.txt`: Python dependencies.
- `outputs/`: Directory for saving generated/edited layered images.
- `tests/`: Directory for unit and integration tests.

## Local Setup

1. Create a virtual environment:
   ```bash
   cd image_service_layered
   python3 -m venv .venv
   source .venv/bin/activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Run the service:
   ```bash
   uvicorn main:app --host 0.0.0.0 --port 8003 --reload
   ```

Note: A `__pycache__` folder will be generated automatically by Python once the application or tests are run.
