import os
import requests
import sys
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# --- CONFIGURATION FROM ENV ---
API_KEY = os.getenv("LAMBDA_API_KEY")
SSH_KEY_NAME = os.getenv("SSH_KEY_NAME")
FILESYSTEM_NAME = os.getenv("FILESYSTEM_NAME")
REGION = os.getenv("REGION", "us-east-1")
INSTANCE_TYPE = os.getenv("INSTANCE_TYPE", "gpu_1x_a100_sxm4")
INSTANCE_NAME = os.getenv("INSTANCE_NAME", "llm-finetune-worker")
IDLE_TIMEOUT = os.getenv("IDLE_TIMEOUT_MINUTES", "30")
INSTANCE_IMAGE = os.getenv("INSTANCE_IMAGE", "lambda-stack-22-04")
GITHUB_USERNAME = os.getenv("GITHUB_USERNAME", "your_username")
GITHUB_EMAIL = os.getenv("GITHUB_EMAIL", "your_email@example.com")
REPO_URL = os.getenv("REPO_URL", "https://github.com/AI-Agent-Forge/multi-model-ai-app.git")
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "")
MAIN_BACKEND = os.getenv("MAIN_BACKEND", "voice")
# ------------------------------

if not API_KEY or API_KEY == "your_api_key_here":
    print("❌ Error: LAMBDA_API_KEY not set in .env file.")
    sys.exit(1)

if not SSH_KEY_NAME:
    print("❌ Error: SSH_KEY_NAME not set in .env file.")
    sys.exit(1)

if not FILESYSTEM_NAME:
    print("❌ Error: FILESYSTEM_NAME not set in .env file.")
    sys.exit(1)

LAUNCH_URL = "https://cloud.lambdalabs.com/api/v1/instance-operations/launch"

# User Data Script to be injected into the VM
# - Installs dependencies
# - Creates auto_shutdown_service.py
# - Creates and starts systemd service
USER_DATA_SCRIPT = f"""#!/bin/bash
echo "--- STARTING AUTO-INIT SETUP ---" >> /var/log/user-data.log

# 1. Install Dependencies
export DEBIAN_FRONTEND=noninteractive
apt-get update -q
apt-get install -y python3-pip git htop nvtop tmux unzip curl apt-transport-https ca-certificates gnupg -q

# 2. Install Google Cloud SDK
echo "Installing Google Cloud SDK..."
curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | sudo gpg --dearmor -o /usr/share/keyrings/cloud.google.gpg
echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" | sudo tee -a /etc/apt/sources.list.d/google-cloud-sdk.list
apt-get update -q && apt-get install -y google-cloud-cli -q

# 3. Install Node.js (LTS)
echo "Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
apt-get install -y nodejs -q

# 4. Install Gemini CLI
echo "Installing @google/gemini-cli..."
npm install -g @google/gemini-cli

# 5. Configure Git
echo "Configuring Git..."
sudo -u ubuntu git config --global user.name "{GITHUB_USERNAME}"
sudo -u ubuntu git config --global user.name "{GITHUB_USERNAME}"
sudo -u ubuntu git config --global user.email "{GITHUB_EMAIL}"
if [ ! -z "{GITHUB_TOKEN}" ]; then
    echo "Configuring GitHub Token..."
    sudo -u ubuntu git config --global url."https://{GITHUB_TOKEN}@github.com/".insteadOf "https://github.com/"
fi

# 6. Clone Repository onto persistent storage
MOUNT_POINT="/home/ubuntu/{FILESYSTEM_NAME}"
GIT_DIR="$MOUNT_POINT/git"
REPO_URL="{REPO_URL}"
REPO_NAME=$(basename "$REPO_URL" .git)

echo "Waiting for $MOUNT_POINT to be mounted..."
for i in {{1..10}}; do
    if [ -d "$MOUNT_POINT" ]; then
        echo "$MOUNT_POINT is mounted."
        break
    fi
    echo "Wait $i/10..."
    sleep 10
done

if [ -d "$MOUNT_POINT" ]; then
    echo "Fixing permissions for $MOUNT_POINT..." >> /var/log/user-data.log
    chown -R ubuntu:ubuntu "$MOUNT_POINT"
    
    mkdir -p "$GIT_DIR"
    chown ubuntu:ubuntu "$GIT_DIR"
    
    cd "$GIT_DIR"
    if [ ! -d "$REPO_NAME" ]; then
        echo "Cloning repository..." >> /var/log/user-data.log
        sudo -u ubuntu git clone "$REPO_URL" >> /var/log/user-data.log 2>&1
    else
        echo "Repository already exists at $GIT_DIR/$REPO_NAME." >> /var/log/user-data.log
        echo "Updating repository..." >> /var/log/user-data.log
        cd "$REPO_NAME"
        sudo -u ubuntu git fetch >> /var/log/user-data.log 2>&1
        sudo -u ubuntu git pull >> /var/log/user-data.log 2>&1
    fi

    # 7. Install Dependencies
    echo "Installing Project Dependencies..." >> /var/log/user-data.log
    cd "$GIT_DIR/$REPO_NAME"
    
    echo "Installing Node.js packages..." >> /var/log/user-data.log
    sudo -u ubuntu npm install >> /var/log/user-data.log 2>&1
    
    echo "Creating Python virtual environment..." >> /var/log/user-data.log
    sudo -u ubuntu python3 -m venv .venv >> /var/log/user-data.log 2>&1
    
    echo "Installing Python packages..." >> /var/log/user-data.log
    
    # 8. Install Backend-Specific Dependencies
    MAIN_BACKEND="{MAIN_BACKEND}"
    echo "Selected Backend: $MAIN_BACKEND" >> /var/log/user-data.log
    
    REQ_FILE=""
    if [ "$MAIN_BACKEND" == "voice" ]; then
        REQ_FILE="voice_service/requirements.txt"
    elif [ "$MAIN_BACKEND" == "image" ]; then
        REQ_FILE="image_service/requirements.txt"
    elif [ "$MAIN_BACKEND" == "video" ]; then
        REQ_FILE="video_service/requirements.txt"
    elif [ "$MAIN_BACKEND" == "llm" ]; then
        REQ_FILE="llm_service/requirements.txt"
    fi
    
    if [ ! -z "$REQ_FILE" ] && [ -f "$REQ_FILE" ]; then
        echo "Installing $REQ_FILE for $MAIN_BACKEND service..." >> /var/log/user-data.log
        sudo -u ubuntu .venv/bin/pip install -r "$REQ_FILE" >> /var/log/user-data.log 2>&1
    else
        echo "No specific requirements found for backend: $MAIN_BACKEND (checked $REQ_FILE)" >> /var/log/user-data.log
    fi

    sudo -u ubuntu .venv/bin/pip install -r requirements.txt >> /var/log/user-data.log 2>&1
else
    echo "ERROR: $MOUNT_POINT not found after waiting. Skipping clone/update." >> /var/log/user-data.log
fi

pip3 install requests

# 2. Write the Auto-Shutdown Script
cat << 'EOF' > /home/ubuntu/auto_shutdown_service.py
import os
import time
import subprocess
import requests
import logging

IDLE_THRESHOLD_MINUTES = {IDLE_TIMEOUT}
GPU_UTIL_THRESHOLD = 5
CHECK_INTERVAL_SECONDS = 60
LAMBDA_API_URL = "https://cloud.lambdalabs.com/api/v1/instance-operations/terminate"
LOG_FILE = "/home/ubuntu/auto_shutdown.log"

logging.basicConfig(filename=LOG_FILE, level=logging.INFO, format='%(asctime)s - %(message)s')

def get_instance_id():
    try:
        # Lambda Cloud uses NoCloud datasource, so HTTP metadata isn't available.
        # We use cloud-init query instead.
        # IMPORTANT: cloud-init returns UUID with hyphens, but Lambda API expects it WITHOUT hyphens.
        return subprocess.check_output(['cloud-init', 'query', 'instance_id'], encoding='utf-8').strip().replace('-', '')
    except Exception as e:
        logging.error(f"Failed to get instance ID: {{e}}")
        return None

def main():
    api_key = os.environ.get("LAMBDA_API_KEY", "").strip()
    instance_id = get_instance_id()
    if not api_key or not instance_id:
        logging.error(f"Missing Config. API Key present: {{bool(api_key)}}, Instance ID: {{instance_id}}. Exiting.")
        return

    logging.info(f"Service Started. Instance: {{instance_id}}")
    idle_start = None
    
    while True:
        try:
            # Check GPU
            gpu_res = subprocess.check_output(['nvidia-smi', '--query-gpu=utilization.gpu', '--format=csv,noheader,nounits'], encoding='utf-8')
            utils = [int(x) for x in gpu_res.strip().split('\\n')]
            gpu_idle = all(u < GPU_UTIL_THRESHOLD for u in utils)

            # Check SSH
            ssh_active = 'pts/' in subprocess.check_output(['who'], encoding='utf-8')

            if gpu_idle and not ssh_active:
                if not idle_start:
                    idle_start = time.time()
                    logging.info("Idle detected. Timer started.")
                elif (time.time() - idle_start) / 60 >= IDLE_THRESHOLD_MINUTES:
                    logging.warning("Terminating...")
                    try:
                        resp = requests.post(LAMBDA_API_URL, json={{"instance_ids": [instance_id]}}, auth=(api_key, ""))
                        logging.info(f"API Response: {{resp.status_code}} - {{resp.text}}")
                        
                        if resp.status_code == 200:
                            logging.info("Termination successful. Exiting.")
                            break
                        else:
                            logging.error("Termination failed. Retrying in next loop...")
                            # Reset timer to avoid hammering the API immediately? 
                            # No, keep it eligible for termination but wait for interval
                    except Exception as e:
                        logging.error(f"API Request Exception: {{e}}")
            else:
                idle_start = None
        except Exception as e:
            logging.error(f"Error: {{e}}")
        
        time.sleep(CHECK_INTERVAL_SECONDS)

if __name__ == "__main__":
    main()
EOF

# 3. Create Systemd Service
cat <<EOF > /etc/systemd/system/auto-shutdown.service
[Unit]
Description=Auto Shutdown Service
After=network.target

[Service]
Type=simple
User=ubuntu
Environment="LAMBDA_API_KEY={API_KEY}"
ExecStart=/usr/bin/python3 /home/ubuntu/auto_shutdown_service.py
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

# 4. Start Service
systemctl daemon-reload
systemctl enable auto-shutdown.service
systemctl start auto-shutdown.service
echo "--- SETUP COMPLETE ---" >> /var/log/user-data.log
echo "Environment check:" >> /var/log/user-data.log
node -v >> /var/log/user-data.log
npm -v >> /var/log/user-data.log
sudo -u ubuntu git config --list >> /var/log/user-data.log
echo "Repo check:" >> /var/log/user-data.log
ls -F /home/ubuntu/{FILESYSTEM_NAME}/git/ >> /var/log/user-data.log
"""

def check_existing_instance():
    print(f"🔍 Checking for existing instance named '{INSTANCE_NAME}'...")
    url = "https://cloud.lambdalabs.com/api/v1/instances"
    try:
        resp = requests.get(url, auth=(API_KEY, ""))
        if resp.status_code == 200:
            instances = resp.json().get('data', [])
            for inst in instances:
                if inst.get('name') == INSTANCE_NAME and inst.get('status') in ['active', 'booting']:
                    ip = inst.get('ip')
                    print(f"\n✅ Instance '{INSTANCE_NAME}' is already running!")
                    print(f"   ID: {inst.get('id')}")
                    print(f"   IP: {ip}")
                    print(f"   Status: {inst.get('status')}")
                    print(f"\n   SSH Command: ssh ubuntu@{ip}")
                    return True
        else:
            print(f"⚠️ Failed to list instances. Status: {resp.status_code}")
    except Exception as e:
        print(f"⚠️ Error checking instances: {e}")
    
    return False

def check_and_create_filesystem():
    print(f"🔍 Checking for filesystem '{FILESYSTEM_NAME}'...")
    fs_url = "https://cloud.lambdalabs.com/api/v1/file-systems"
    
    try:
        # List filesystems
        resp = requests.get(fs_url, auth=(API_KEY, ""))
        if resp.status_code == 200:
            filesystems = resp.json().get('data', [])
            for fs in filesystems:
                if fs.get('name') == FILESYSTEM_NAME:
                    print(f"✅ Filesystem '{FILESYSTEM_NAME}' found (ID: {fs.get('id')}).")
                    return True
        else:
            print(f"⚠️ Failed to list filesystems. Status: {resp.status_code}")
            return False

        # Create filesystem if not found
        print(f"⚠️ Filesystem '{FILESYSTEM_NAME}' not found. Attempting to create in {REGION}...")
        payload = {
            "name": FILESYSTEM_NAME,
            "region_name": REGION
        }
        create_resp = requests.post(fs_url, json=payload, auth=(API_KEY, ""))
        
        if create_resp.status_code == 200:
            data = create_resp.json().get('data', {})
            print(f"✅ Successfully created filesystem '{FILESYSTEM_NAME}' (ID: {data.get('id')}).")
            return True
        else:
            print(f"❌ Failed to create filesystem. Status: {create_resp.status_code}")
            print(f"Response: {create_resp.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error checking/creating filesystem: {e}")
        return False

def launch_instance():
    if not check_and_create_filesystem():
        print("❌ Aborting launch due to filesystem issues.")
        return

    if check_existing_instance():
        return

    print(f"🚀 Launching {INSTANCE_TYPE} in {REGION}...")
    print(f"   Name: {INSTANCE_NAME}")
    print(f"   Image: {INSTANCE_IMAGE}")
    print(f"   Filesystem: {FILESYSTEM_NAME}")
    print(f"   SSH Key: {SSH_KEY_NAME}")
    
    payload = {
        "region_name": REGION,
        "instance_type_name": INSTANCE_TYPE,
        "ssh_key_names": [SSH_KEY_NAME],
        "file_system_names": [FILESYSTEM_NAME],
        "quantity": 1,
        "name": INSTANCE_NAME,
        "image": {"family": INSTANCE_IMAGE},
        "user_data": USER_DATA_SCRIPT
    }

    try:
        resp = requests.post(
            LAUNCH_URL, 
            json=payload, 
            auth=(API_KEY, "")
        )
        
        if resp.status_code == 200:
            data = resp.json()
            instance_ids = data.get('data', {}).get('instance_ids', [])
            print(f"\n✅ Success! Launched Instance IDs: {instance_ids}")
            print("\n⏳ The instance is booting. It will take a few minutes for the status to become 'active'.")
            print("   The auto-shutdown service has been injected and will start automatically.")
            print("\n   To monitor the setup log once inside:")
            print("   tail -f /var/log/user-data.log")
        else:
            print(f"\n❌ Failed to launch instance. Status: {resp.status_code}")
            print(f"Response: {resp.text}")
            
    except Exception as e:
        print(f"\n❌ Exception: {e}")

if __name__ == "__main__":
    launch_instance()
