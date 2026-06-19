import os
import uuid
from pathlib import Path

import pytest
import requests
from pymongo import MongoClient


def _read_env_file(path: str) -> dict:
    env_map = {}
    env_file = Path(path)
    if not env_file.exists():
        return env_map
    for raw in env_file.read_text().splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        env_map[key.strip()] = value.strip().strip('"').strip("'")
    return env_map


def _resolve_base_url() -> str | None:
    env_url = os.environ.get("REACT_APP_BACKEND_URL")
    if env_url:
        return env_url
    frontend_env = _read_env_file("/app/frontend/.env")
    return frontend_env.get("REACT_APP_BACKEND_URL")


def _resolve_admin_password() -> str | None:
    return os.environ.get("ADMIN_PASSWORD") or _read_env_file("/app/backend/.env").get("ADMIN_PASSWORD")


BASE_URL = _resolve_base_url()
ADMIN_PASSWORD = _resolve_admin_password()


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
    # Admin authentication and token retrieval for protected dashboard/analytics endpoints
    if not ADMIN_PASSWORD:
        pytest.skip("ADMIN_PASSWORD unavailable")
    response = api_client.post(
        f"{api_base_url}/api/admin/login", json={"password": ADMIN_PASSWORD}
    )
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data.get("token"), str)
    assert len(data["token"]) > 0
    return data["token"]


@pytest.fixture(scope="module")
def auth_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture(scope="module")
def mongo_db():
    # Seed-only fixture for paid download gating verification
    backend_env = _read_env_file("/app/backend/.env")
    mongo_url = os.environ.get("MONGO_URL") or backend_env.get("MONGO_URL")
    db_name = os.environ.get("DB_NAME") or backend_env.get("DB_NAME")
    if not mongo_url or not db_name:
        pytest.skip("MONGO_URL/DB_NAME missing")
    client = MongoClient(mongo_url)
    db = client[db_name]
    try:
        yield db
    finally:
        client.close()


def test_admin_login_works(api_client, api_base_url):
    # Admin login contract
    response = api_client.post(
        f"{api_base_url}/api/admin/login", json={"password": ADMIN_PASSWORD}
    )
    assert response.status_code == 200
    data = response.json()
    assert "token" in data
    assert data["message"] == "Admin login successful"


def test_all_products_have_placeholder_delivery_files_public_metadata(api_client, api_base_url):
    # Product delivery placeholder files visible in public metadata
    response = api_client.get(f"{api_base_url}/api/products")
    assert response.status_code == 200
    products = response.json()
    assert isinstance(products, list)
    assert len(products) >= 8

    for product in products:
        files = product.get("download_files", [])
        assert isinstance(files, list)
        assert len(files) >= 1
        first_file = files[0]
        assert isinstance(first_file.get("id"), str)
        assert isinstance(first_file.get("filename"), str)
        assert "data_base64" not in first_file


def test_all_products_have_delivery_files_in_admin_dashboard(api_client, api_base_url, auth_headers):
    # Product delivery manager metadata from admin dashboard payload
    response = api_client.get(f"{api_base_url}/api/admin/dashboard", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    products = data.get("products", [])
    assert isinstance(products, list)
    assert len(products) >= 8

    for product in products:
        assert len(product.get("download_files", [])) >= 1


def test_admin_analytics_cards_and_export_endpoints(api_client, api_base_url, auth_headers):
    # Analytics summary and raw export endpoint checks
    summary_response = api_client.get(f"{api_base_url}/api/admin/analytics", headers=auth_headers)
    assert summary_response.status_code == 200
    summary = summary_response.json().get("summary", {})
    assert "total_events" in summary
    assert "unique_users" in summary
    assert "visits" in summary
    assert "clicks" in summary
    assert "forms" in summary

    export_csv = api_client.get(
        f"{api_base_url}/api/admin/analytics/export",
        params={"format": "csv"},
        headers=auth_headers,
    )
    assert export_csv.status_code == 200
    assert "text/csv" in export_csv.headers.get("content-type", "")

    export_json = api_client.get(
        f"{api_base_url}/api/admin/analytics/export",
        params={"format": "json"},
        headers=auth_headers,
    )
    assert export_json.status_code == 200
    assert "application/json" in export_json.headers.get("content-type", "")


def test_scheduled_report_settings_present_in_dashboard_content(api_client, api_base_url, auth_headers):
    # In-dashboard scheduled report settings shape
    response = api_client.get(f"{api_base_url}/api/admin/dashboard", headers=auth_headers)
    assert response.status_code == 200
    report_settings = response.json().get("content", {}).get("analytics_report_settings", {})
    assert isinstance(report_settings.get("enabled"), bool)
    assert report_settings.get("frequency") in ["weekly", "monthly", "quarterly"]
    assert isinstance(report_settings.get("sections"), str)


def test_blog_seo_fields_exist_in_admin_payload(api_client, api_base_url, auth_headers):
    # Blog SEO metadata fields for admin tooling
    response = api_client.get(f"{api_base_url}/api/admin/dashboard", headers=auth_headers)
    assert response.status_code == 200
    blog_posts = response.json().get("blog", [])
    assert isinstance(blog_posts, list)
    assert len(blog_posts) >= 1

    first = blog_posts[0]
    assert isinstance(first.get("seo_title"), str)
    assert isinstance(first.get("seo_description"), str)
    assert isinstance(first.get("seo_keywords"), str)


def test_music_previews_placeholder_visibility(api_client, api_base_url):
    # Music preview placeholder data remains visible with empty audio URLs
    response = api_client.get(f"{api_base_url}/api/site-content")
    assert response.status_code == 200
    previews = response.json().get("music_previews", [])
    assert isinstance(previews, list)
    assert len(previews) >= 1

    visible_placeholders = [
        item for item in previews if item.get("visible") is not False and not (item.get("audio_url") or "").strip()
    ]
    assert len(visible_placeholders) >= 1


def test_paid_download_gating_unpaid_and_seeded_paid(api_client, api_base_url, mongo_db):
    # Paid download gating: unpaid blocked, paid seeded session unlocked
    checkout = api_client.post(
        f"{api_base_url}/api/payments/checkout",
        json={"product_id": "digital-forward-2", "origin_url": api_base_url},
    )
    assert checkout.status_code == 200
    unpaid_session_id = checkout.json().get("session_id")
    unpaid_downloads = api_client.get(f"{api_base_url}/api/payments/{unpaid_session_id}/downloads")
    assert unpaid_downloads.status_code == 200
    unpaid_data = unpaid_downloads.json()
    assert unpaid_data.get("payment_status") in ["pending", "unpaid"]
    assert unpaid_data.get("downloads") == []

    products_response = api_client.get(f"{api_base_url}/api/products")
    assert products_response.status_code == 200
    products = products_response.json()
    target = next((p for p in products if p.get("download_files")), None)
    assert target is not None

    paid_session_id = f"iter7-paid-{uuid.uuid4().hex[:12]}"
    tx_doc = {
        "id": str(uuid.uuid4()),
        "session_id": paid_session_id,
        "product_id": target["id"],
        "amount": float(target.get("price", 0)),
        "currency": target.get("currency", "usd"),
        "metadata": {"source": "pytest-iteration7"},
        "status": "complete",
        "payment_status": "paid",
        "processed": True,
        "created_at": "2026-02-01T00:00:00+00:00",
        "updated_at": "2026-02-01T00:00:00+00:00",
        "delivered_at": "2026-02-01T00:00:00+00:00",
    }
    mongo_db.payment_transactions.insert_one(tx_doc)

    try:
        paid_downloads = api_client.get(f"{api_base_url}/api/payments/{paid_session_id}/downloads")
        assert paid_downloads.status_code == 200
        paid_data = paid_downloads.json()
        assert paid_data.get("payment_status") == "paid"
        assert len(paid_data.get("downloads", [])) >= 1
    finally:
        mongo_db.payment_transactions.delete_one({"session_id": paid_session_id})
