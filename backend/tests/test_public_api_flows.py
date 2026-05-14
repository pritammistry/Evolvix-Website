import os
import uuid

import pytest
import requests


BASE_URL = os.environ.get("REACT_APP_BACKEND_URL")


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


# Core health and product catalog endpoints
def test_api_root_ready(api_client, api_base_url):
    response = api_client.get(f"{api_base_url}/api/")
    assert response.status_code == 200

    data = response.json()
    assert data["status"] == "ready"
    assert "Evolvix Tech Media API" in data["message"]


def test_products_list_has_expected_shape(api_client, api_base_url):
    response = api_client.get(f"{api_base_url}/api/products")
    assert response.status_code == 200

    products = response.json()
    assert isinstance(products, list)
    assert len(products) > 0
    first = products[0]
    assert isinstance(first["id"], str)
    assert isinstance(first["slug"], str)
    assert isinstance(first["title"], str)
    assert isinstance(first["price"], (int, float))


def test_required_product_slug_digital_forward_2(api_client, api_base_url):
    response = api_client.get(f"{api_base_url}/api/products/digital-forward-2")
    assert response.status_code == 200

    data = response.json()
    assert data["slug"] == "digital-forward-2"


# Contact and newsletter lead capture endpoints
def test_contact_submit_success(api_client, api_base_url):
    payload = {
        "name": "TEST QA Bot",
        "email": f"test-{uuid.uuid4().hex[:8]}@example.com",
        "inquiry_type": "Business inquiry",
        "message": "This is a test contact message for API verification.",
    }
    response = api_client.post(f"{api_base_url}/api/contact", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert isinstance(data["id"], str)
    assert data["message"] == "Thanks — your message has been received."


def test_newsletter_submit_success(api_client, api_base_url):
    payload = {"email": f"newsletter-{uuid.uuid4().hex[:8]}@example.com"}
    response = api_client.post(f"{api_base_url}/api/newsletter", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert data["message"] == "You’re on the Evolvix update list."


# Stripe checkout and payment status endpoints
def test_checkout_invalid_product_returns_404(api_client, api_base_url):
    payload = {"product_id": "missing-product", "origin_url": api_base_url}
    response = api_client.post(f"{api_base_url}/api/payments/checkout", json=payload)
    assert response.status_code == 404

    data = response.json()
    assert data["detail"] == "Product not found"


def test_checkout_invalid_origin_returns_400(api_client, api_base_url):
    payload = {"product_id": "ai-starter-kit", "origin_url": "invalid-origin"}
    response = api_client.post(f"{api_base_url}/api/payments/checkout", json=payload)
    assert response.status_code == 400

    data = response.json()
    assert data["detail"] == "Invalid origin URL"


def test_checkout_create_session_success(api_client, api_base_url):
    payload = {"product_id": "ai-starter-kit", "origin_url": api_base_url}
    response = api_client.post(f"{api_base_url}/api/payments/checkout", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert isinstance(data["session_id"], str)
    assert len(data["session_id"]) > 0
    assert isinstance(data["url"], str)
    assert data["url"].startswith("http")


def test_payment_status_for_created_session(api_client, api_base_url):
    checkout_payload = {"product_id": "creator-assets-bundle", "origin_url": api_base_url}
    checkout_response = api_client.post(f"{api_base_url}/api/payments/checkout", json=checkout_payload)
    assert checkout_response.status_code == 200

    session_id = checkout_response.json()["session_id"]
    status_response = api_client.get(f"{api_base_url}/api/payments/status/{session_id}")
    assert status_response.status_code == 200

    data = status_response.json()
    assert data["status"] in ["open", "complete", "expired"]
    assert data["payment_status"] in ["paid", "unpaid", "no_payment_required"]
    assert isinstance(data["currency"], str)
    assert isinstance(data["delivery"], str)