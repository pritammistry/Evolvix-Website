import os
import uuid
import base64
from pathlib import Path
from datetime import datetime, timezone

import pytest
import requests
from pymongo import MongoClient


def _resolve_base_url() -> str | None:
    env_url = os.environ.get("REACT_APP_BACKEND_URL")
    if env_url:
        return env_url
    frontend_env = Path("/app/frontend/.env")
    if not frontend_env.exists():
        return None
    for line in frontend_env.read_text().splitlines():
        if line.startswith("REACT_APP_BACKEND_URL="):
            return line.split("=", 1)[1].strip()
    return None


BASE_URL = _resolve_base_url()
PRODUCT_ID = "digital-forward-2"


def _resolve_admin_password() -> str | None:
    env_password = os.environ.get("ADMIN_PASSWORD")
    if env_password:
        return env_password
    backend_env = Path("/app/backend/.env")
    if not backend_env.exists():
        return None
    for line in backend_env.read_text().splitlines():
        if line.startswith("ADMIN_PASSWORD="):
            return line.split("=", 1)[1].strip().strip('"').strip("'")
    return None


@pytest.fixture(scope="session")
def api_base_url():
    if not BASE_URL:
        pytest.skip("REACT_APP_BACKEND_URL is not set")
    return BASE_URL.rstrip("/")


@pytest.fixture(scope="session")
def api_client():
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def admin_token(api_client, api_base_url):
    # Admin auth for protected file and analytics endpoints
    admin_password = _resolve_admin_password()
    if not admin_password:
        pytest.skip("ADMIN_PASSWORD is not set")
    response = api_client.post(f"{api_base_url}/api/admin/login", json={"password": admin_password})
    if response.status_code != 200:
        pytest.skip("Admin login failed; skipping feature tests")
    token = response.json().get("token")
    assert isinstance(token, str) and len(token) > 0
    return token


@pytest.fixture(scope="module")
def auth_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture(scope="module")
def mongo_db():
    # Method-level verification fixture for payment transaction state setup
    mongo_url = os.environ.get("MONGO_URL")
    db_name = os.environ.get("DB_NAME")
    if not mongo_url or not db_name:
        backend_env = Path("/app/backend/.env")
        if backend_env.exists():
            env_map = {}
            for raw in backend_env.read_text().splitlines():
                line = raw.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, value = line.split("=", 1)
                cleaned_value = value.strip().strip('"').strip("'")
                env_map[key.strip()] = cleaned_value
            mongo_url = mongo_url or env_map.get("MONGO_URL")
            db_name = db_name or env_map.get("DB_NAME")
    if not mongo_url or not db_name:
        pytest.skip("MONGO_URL/DB_NAME missing; cannot run paid-download seeded test")
    client = MongoClient(mongo_url)
    db = client[db_name]
    try:
        yield db
    finally:
        client.close()


def test_admin_product_file_upload_and_public_metadata_sanitized(api_client, api_base_url, auth_headers):
    # Delivery file upload + public metadata must not expose base64 payload
    raw_bytes = b"Evolvix test delivery file bytes"
    data_url = f"data:text/plain;base64,{base64.b64encode(raw_bytes).decode()}"
    filename = f"TEST_delivery_{uuid.uuid4().hex[:8]}.txt"
    upload = api_client.post(
        f"{api_base_url}/api/admin/products/{PRODUCT_ID}/files",
        json={"filename": filename, "content_type": "text/plain", "data_url": data_url},
        headers=auth_headers,
    )
    assert upload.status_code == 200
    upload_data = upload.json()
    assert upload_data["message"] == "Product file uploaded"
    assert upload_data["file"]["filename"] == filename
    assert "data_base64" not in upload_data["file"]

    product = api_client.get(f"{api_base_url}/api/products/{PRODUCT_ID}")
    assert product.status_code == 200
    product_data = product.json()
    assert isinstance(product_data.get("download_files"), list)
    attached = next((f for f in product_data["download_files"] if f.get("id") == upload_data["file"]["id"]), None)
    assert attached is not None
    assert "data_base64" not in attached

    delete_response = api_client.delete(
        f"{api_base_url}/api/admin/products/{PRODUCT_ID}/files/{upload_data['file']['id']}",
        headers=auth_headers,
    )
    assert delete_response.status_code == 200


def test_downloads_api_blocks_unpaid_session(api_client, api_base_url):
    # Unpaid checkout session should not expose file links
    checkout = api_client.post(
        f"{api_base_url}/api/payments/checkout",
        json={"product_id": PRODUCT_ID, "origin_url": api_base_url},
    )
    assert checkout.status_code == 200
    session_id = checkout.json()["session_id"]

    downloads = api_client.get(f"{api_base_url}/api/payments/{session_id}/downloads")
    assert downloads.status_code == 200
    downloads_data = downloads.json()
    assert downloads_data["payment_status"] in ["pending", "unpaid"]
    assert downloads_data["downloads"] == []


def test_downloads_api_returns_links_for_paid_and_file_bytes(api_client, api_base_url, auth_headers, mongo_db):
    # Paid session should expose download links and file endpoint should stream bytes
    raw_bytes = b"Evolvix paid delivery test"
    data_url = f"data:text/plain;base64,{base64.b64encode(raw_bytes).decode()}"
    filename = f"TEST_paid_delivery_{uuid.uuid4().hex[:8]}.txt"

    upload = api_client.post(
        f"{api_base_url}/api/admin/products/{PRODUCT_ID}/files",
        json={"filename": filename, "content_type": "text/plain", "data_url": data_url},
        headers=auth_headers,
    )
    assert upload.status_code == 200
    file_id = upload.json()["file"]["id"]

    session_id = f"paid-test-{uuid.uuid4().hex[:12]}"
    now_iso = datetime.now(timezone.utc).isoformat()
    mongo_db.payment_transactions.insert_one(
        {
            "id": str(uuid.uuid4()),
            "session_id": session_id,
            "product_id": PRODUCT_ID,
            "amount": 59.0,
            "currency": "usd",
            "metadata": {"source": "pytest"},
            "status": "complete",
            "payment_status": "paid",
            "processed": True,
            "created_at": now_iso,
            "updated_at": now_iso,
            "delivered_at": now_iso,
        }
    )

    try:
        downloads = api_client.get(f"{api_base_url}/api/payments/{session_id}/downloads")
        assert downloads.status_code == 200
        downloads_data = downloads.json()
        assert downloads_data["payment_status"] == "paid"
        assert isinstance(downloads_data["downloads"], list)
        assert any(item.get("id") == file_id for item in downloads_data["downloads"])

        file_response = api_client.get(f"{api_base_url}/api/payments/{session_id}/downloads/{file_id}")
        assert file_response.status_code == 200
        assert file_response.content == raw_bytes
        assert "attachment;" in file_response.headers.get("content-disposition", "").lower()
    finally:
        mongo_db.payment_transactions.delete_one({"session_id": session_id})
        api_client.delete(
            f"{api_base_url}/api/admin/products/{PRODUCT_ID}/files/{file_id}",
            headers=auth_headers,
        )


def test_analytics_event_capture_and_admin_summary_filters(api_client, api_base_url, auth_headers):
    # Analytics ingestion + admin summary/options endpoints
    session_id = f"qa-{uuid.uuid4().hex[:10]}"
    events = [
        {"event_type": "page_view", "path": "/", "session_id": session_id, "metadata": {}},
        {"event_type": "click", "path": "/", "label": "home-products-cta", "session_id": session_id, "product_id": PRODUCT_ID, "metadata": {}},
        {"event_type": "section_view", "path": "/", "section_id": "home-testimonials-section", "session_id": session_id, "metadata": {}},
        {"event_type": "form_submit", "path": "/contact", "label": "contact-form", "session_id": session_id, "metadata": {}},
        {"event_type": "newsletter_submit", "path": "/", "label": "newsletter-form", "session_id": session_id, "metadata": {}},
    ]
    for event in events:
        response = api_client.post(f"{api_base_url}/api/analytics/events", json=event)
        assert response.status_code == 200

    summary = api_client.get(f"{api_base_url}/api/admin/analytics", headers=auth_headers)
    assert summary.status_code == 200
    summary_data = summary.json()
    assert "summary" in summary_data
    assert summary_data["summary"]["total_events"] >= 5
    assert summary_data["summary"]["visits"] >= 1
    assert summary_data["summary"]["clicks"] >= 1
    assert summary_data["summary"]["forms"] >= 1
    assert summary_data["summary"]["unique_users"] >= 1

    filtered = api_client.get(
        f"{api_base_url}/api/admin/analytics",
        params={"event_type": "click", "product_id": PRODUCT_ID},
        headers=auth_headers,
    )
    assert filtered.status_code == 200
    filtered_data = filtered.json()
    assert filtered_data["summary"]["clicks"] >= 1

    options = api_client.get(f"{api_base_url}/api/admin/analytics/options", headers=auth_headers)
    assert options.status_code == 200
    options_data = options.json()
    assert isinstance(options_data.get("event_types"), list)
    assert isinstance(options_data.get("pages"), list)
    assert isinstance(options_data.get("products"), list)


def test_public_products_no_example_com_purchase_urls(api_client, api_base_url):
    # Public product API should not expose placeholder example.com purchase URLs
    response = api_client.get(f"{api_base_url}/api/products")
    assert response.status_code == 200
    products = response.json()
    assert isinstance(products, list)
    assert len(products) > 0
    for product in products:
        purchase_url = str(product.get("external_purchase_url", ""))
        assert "example.com" not in purchase_url.lower()


def test_admin_product_purchase_url_editable(api_client, api_base_url, auth_headers):
    # Product purchase URL should be editable from admin catalog API
    dashboard = api_client.get(f"{api_base_url}/api/admin/dashboard", headers=auth_headers)
    assert dashboard.status_code == 200
    products = dashboard.json()["products"]

    target = next((p for p in products if p.get("id") == PRODUCT_ID or p.get("slug") == PRODUCT_ID), None)
    assert target is not None
    original_url = target.get("external_purchase_url")
    updated_url = f"https://gumroad.com/l/{uuid.uuid4().hex[:10]}"

    mutated = []
    for item in products:
        if item.get("id") == PRODUCT_ID or item.get("slug") == PRODUCT_ID:
            mutated.append({**item, "external_purchase_url": updated_url})
        else:
            mutated.append(item)

    try:
        save_response = api_client.put(
            f"{api_base_url}/api/admin/products",
            json={"items": mutated},
            headers=auth_headers,
        )
        assert save_response.status_code == 200

        read_back = api_client.get(f"{api_base_url}/api/products/{PRODUCT_ID}")
        assert read_back.status_code == 200
        assert read_back.json().get("external_purchase_url") == updated_url
    finally:
        restore = []
        for item in products:
            if item.get("id") == PRODUCT_ID or item.get("slug") == PRODUCT_ID:
                restore.append({**item, "external_purchase_url": original_url})
            else:
                restore.append(item)
        api_client.put(
            f"{api_base_url}/api/admin/products",
            json={"items": restore},
            headers=auth_headers,
        )
