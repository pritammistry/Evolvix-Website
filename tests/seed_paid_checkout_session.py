import json
import os
import uuid
import base64
from datetime import datetime, timezone
from pathlib import Path

import requests
from pymongo import MongoClient


def load_env_file(path: str) -> dict:
    env = {}
    p = Path(path)
    if not p.exists():
        return env
    for raw in p.read_text().splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        env[key.strip()] = value.strip().strip('"').strip("'")
    return env


def main():
    frontend_env = load_env_file("/app/frontend/.env")
    backend_env = load_env_file("/app/backend/.env")

    base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
    mongo_url = os.environ.get("MONGO_URL") or backend_env.get("MONGO_URL")
    db_name = os.environ.get("DB_NAME") or backend_env.get("DB_NAME")
    admin_password = os.environ.get("ADMIN_PASSWORD") or backend_env.get("ADMIN_PASSWORD")

    if not base_url or not mongo_url or not db_name or not admin_password:
        raise RuntimeError("Missing required env values for seed script")

    api_base = f"{base_url.rstrip('/')}/api"
    product_id = "digital-forward-2"
    session_id = f"ui-paid-{uuid.uuid4().hex[:12]}"
    filename = f"TEST_UI_paid_{uuid.uuid4().hex[:8]}.txt"
    file_bytes = b"Evolvix checkout success UI paid file"
    data_url = f"data:text/plain;base64,{base64.b64encode(file_bytes).decode()}"

    login = requests.post(f"{api_base}/admin/login", json={"password": admin_password}, timeout=30)
    login.raise_for_status()
    token = login.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    upload = requests.post(
        f"{api_base}/admin/products/{product_id}/files",
        json={"filename": filename, "content_type": "text/plain", "data_url": data_url},
        headers=headers,
        timeout=60,
    )
    upload.raise_for_status()
    file_id = upload.json()["file"]["id"]

    client = MongoClient(mongo_url)
    db = client[db_name]
    now_iso = datetime.now(timezone.utc).isoformat()
    db.payment_transactions.insert_one(
        {
            "id": str(uuid.uuid4()),
            "session_id": session_id,
            "product_id": product_id,
            "amount": 59.0,
            "currency": "usd",
            "metadata": {"source": "ui-test"},
            "status": "complete",
            "payment_status": "paid",
            "processed": True,
            "created_at": now_iso,
            "updated_at": now_iso,
            "delivered_at": now_iso,
        }
    )
    client.close()

    print(json.dumps({"session_id": session_id, "file_id": file_id, "product_id": product_id, "filename": filename}))


if __name__ == "__main__":
    main()
