import argparse
import os
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
    parser = argparse.ArgumentParser()
    parser.add_argument("--session-id", required=True)
    parser.add_argument("--file-id", required=True)
    parser.add_argument("--product-id", default="digital-forward-2")
    args = parser.parse_args()

    frontend_env = load_env_file("/app/frontend/.env")
    backend_env = load_env_file("/app/backend/.env")
    base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
    mongo_url = os.environ.get("MONGO_URL") or backend_env.get("MONGO_URL")
    db_name = os.environ.get("DB_NAME") or backend_env.get("DB_NAME")
    admin_password = os.environ.get("ADMIN_PASSWORD") or backend_env.get("ADMIN_PASSWORD")
    if not base_url or not mongo_url or not db_name or not admin_password:
        raise RuntimeError("Missing required env values for cleanup script")

    api_base = f"{base_url.rstrip('/')}/api"
    login = requests.post(f"{api_base}/admin/login", json={"password": admin_password}, timeout=30)
    login.raise_for_status()
    token = login.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    requests.delete(
        f"{api_base}/admin/products/{args.product_id}/files/{args.file_id}",
        headers=headers,
        timeout=30,
    )

    client = MongoClient(mongo_url)
    db = client[db_name]
    db.payment_transactions.delete_one({"session_id": args.session_id})
    client.close()


if __name__ == "__main__":
    main()
