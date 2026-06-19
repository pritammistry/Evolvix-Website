import base64
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path

import pytest
import requests
from pymongo import MongoClient


def _load_env_file(path: str) -> dict:
    data = {}
    p = Path(path)
    if not p.exists():
        return data
    for raw in p.read_text().splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        data[key.strip()] = value.strip().strip('"').strip("'")
    return data


def _resolve_base_url() -> str | None:
    env_url = os.environ.get("REACT_APP_BACKEND_URL")
    if env_url:
        return env_url
    frontend_env = _load_env_file("/app/frontend/.env")
    return frontend_env.get("REACT_APP_BACKEND_URL")


BASE_URL = _resolve_base_url()
PRODUCT_ID = "digital-forward-2"


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


@pytest.fixture(scope="session")
def admin_password():
    password = os.environ.get("ADMIN_PASSWORD")
    if password:
        return password
    creds_file = Path("/app/memory/test_credentials.md")
    if creds_file.exists():
        text = creds_file.read_text()
        marker = "Password:"
        if marker in text:
            return text.split(marker, 1)[1].splitlines()[0].strip().strip("`")
    backend_env = _load_env_file("/app/backend/.env")
    return backend_env.get("ADMIN_PASSWORD")


@pytest.fixture(scope="module")
def auth_headers(api_client, api_base_url, admin_password):
    # Admin auth for protected file manager and dashboard/analytics smoke endpoints
    if not admin_password:
        pytest.skip("Admin password missing")
    response = api_client.post(f"{api_base_url}/api/admin/login", json={"password": admin_password})
    if response.status_code != 200:
        pytest.skip("Admin login failed")
    token = response.json().get("token")
    assert isinstance(token, str) and len(token) > 0
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="module")
def mongo_db():
    # Mongo verification for persisted payment status state before/after provider fallback
    mongo_url = os.environ.get("MONGO_URL")
    db_name = os.environ.get("DB_NAME")
    if not mongo_url or not db_name:
        backend_env = _load_env_file("/app/backend/.env")
        mongo_url = mongo_url or backend_env.get("MONGO_URL")
        db_name = db_name or backend_env.get("DB_NAME")
    if not mongo_url or not db_name:
        pytest.skip("MONGO_URL/DB_NAME missing")
    client = MongoClient(mongo_url)
    db = client[db_name]
    try:
        yield db
    finally:
        client.close()


@pytest.fixture
def seeded_paid_session(api_client, api_base_url, auth_headers, mongo_db):
    # Seed paid checkout with attached product file for status-fallback regression check
    raw_bytes = b"Evolvix paid fallback regression"
    filename = f"TEST_fallback_paid_{uuid.uuid4().hex[:8]}.txt"
    data_url = f"data:text/plain;base64,{base64.b64encode(raw_bytes).decode()}"
    upload = api_client.post(
        f"{api_base_url}/api/admin/products/{PRODUCT_ID}/files",
        json={"filename": filename, "content_type": "text/plain", "data_url": data_url},
        headers=auth_headers,
    )
    assert upload.status_code == 200
    file_id = upload.json()["file"]["id"]

    session_id = f"paid-fallback-{uuid.uuid4().hex[:12]}"
    now_iso = datetime.now(timezone.utc).isoformat()
    mongo_db.payment_transactions.insert_one(
        {
            "id": str(uuid.uuid4()),
            "session_id": session_id,
            "product_id": PRODUCT_ID,
            "amount": 59.0,
            "currency": "usd",
            "metadata": {"source": "pytest-fallback-regression"},
            "status": "complete",
            "payment_status": "paid",
            "processed": True,
            "created_at": now_iso,
            "updated_at": now_iso,
            "delivered_at": now_iso,
        }
    )

    try:
        yield {"session_id": session_id, "file_id": file_id, "filename": filename}
    finally:
        mongo_db.payment_transactions.delete_one({"session_id": session_id})
        api_client.delete(
            f"{api_base_url}/api/admin/products/{PRODUCT_ID}/files/{file_id}",
            headers=auth_headers,
        )


def test_paid_downloads_available_before_status_poll(api_client, api_base_url, seeded_paid_session):
    # Paid session should expose links before status polling
    session_id = seeded_paid_session["session_id"]
    file_id = seeded_paid_session["file_id"]
    response = api_client.get(f"{api_base_url}/api/payments/{session_id}/downloads")
    assert response.status_code == 200
    data = response.json()
    assert data["payment_status"] == "paid"
    assert any(item.get("id") == file_id for item in data.get("downloads", []))


def test_paid_status_fallback_does_not_downgrade_paid_state(api_client, api_base_url, seeded_paid_session, mongo_db):
    # /payments/status fallback must preserve already paid transaction state
    session_id = seeded_paid_session["session_id"]
    status_response = api_client.get(f"{api_base_url}/api/payments/status/{session_id}")
    assert status_response.status_code == 200
    status_data = status_response.json()
    assert status_data["payment_status"] == "paid"
    assert status_data["status"] == "complete"

    db_doc = mongo_db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    assert db_doc is not None
    assert db_doc["payment_status"] == "paid"
    assert db_doc["status"] == "complete"


def test_paid_downloads_still_available_after_status_poll(api_client, api_base_url, seeded_paid_session):
    # Paid session should still expose links after /payments/status polling
    session_id = seeded_paid_session["session_id"]
    file_id = seeded_paid_session["file_id"]

    status_response = api_client.get(f"{api_base_url}/api/payments/status/{session_id}")
    assert status_response.status_code == 200
    assert status_response.json()["payment_status"] == "paid"

    downloads_response = api_client.get(f"{api_base_url}/api/payments/{session_id}/downloads")
    assert downloads_response.status_code == 200
    downloads_data = downloads_response.json()
    assert downloads_data["payment_status"] == "paid"
    assert any(item.get("id") == file_id for item in downloads_data.get("downloads", []))


def test_unpaid_session_still_has_no_download_links(api_client, api_base_url):
    # Unpaid checkout should continue to return no downloads
    checkout = api_client.post(
        f"{api_base_url}/api/payments/checkout",
        json={"product_id": PRODUCT_ID, "origin_url": api_base_url},
    )
    assert checkout.status_code == 200
    session_id = checkout.json()["session_id"]

    downloads_before = api_client.get(f"{api_base_url}/api/payments/{session_id}/downloads")
    assert downloads_before.status_code == 200
    data_before = downloads_before.json()
    assert data_before["payment_status"] in ["pending", "unpaid"]
    assert data_before["downloads"] == []

    status_check = api_client.get(f"{api_base_url}/api/payments/status/{session_id}")
    assert status_check.status_code == 200
    status_data = status_check.json()
    assert status_data["payment_status"] in ["pending", "unpaid", "paid", "no_payment_required"]

    downloads_after = api_client.get(f"{api_base_url}/api/payments/{session_id}/downloads")
    assert downloads_after.status_code == 200
    data_after = downloads_after.json()
    if data_after["payment_status"] != "paid":
        assert data_after["downloads"] == []


def test_admin_analytics_dashboard_blog_testimonials_smoke(api_client, api_base_url, auth_headers):
    # Admin/dashboard + analytics + public site-content(blog/testimonials) smoke regression
    dashboard = api_client.get(f"{api_base_url}/api/admin/dashboard", headers=auth_headers)
    assert dashboard.status_code == 200
    dashboard_data = dashboard.json()
    assert isinstance(dashboard_data.get("products"), list)
    assert len(dashboard_data["products"]) > 0

    analytics_options = api_client.get(f"{api_base_url}/api/admin/analytics/options", headers=auth_headers)
    assert analytics_options.status_code == 200
    options_data = analytics_options.json()
    assert isinstance(options_data.get("event_types"), list)

    site_content = api_client.get(f"{api_base_url}/api/site-content")
    assert site_content.status_code == 200
    site_data = site_content.json()
    assert isinstance(site_data.get("blog"), list)
    assert isinstance(site_data.get("testimonials"), list)
