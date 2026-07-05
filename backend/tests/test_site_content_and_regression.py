import os
import uuid
from pathlib import Path

import pytest
import requests


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
def logged_in_visitor(api_client, api_base_url):
    # Bearer header, not cookie: the session cookie is Secure-flagged and requests won't resend it over plain http
    email = f"pytest-visitor-{uuid.uuid4().hex[:10]}@example.com"
    response = api_client.post(f"{api_base_url}/api/auth/signup", json={"email": email, "password": "TestPassword123!", "state": "West Bengal"})
    assert response.status_code == 200
    data = response.json()
    api_client.headers.update({"Authorization": f"Bearer {data['token']}"})
    return data["user"]


# Site content endpoints (GET/PUT/reset) + critical content shape
def test_site_content_get_has_required_business_sections(api_client, api_base_url):
    response = api_client.get(f"{api_base_url}/api/site-content")
    assert response.status_code == 200

    data = response.json()
    assert data["brand"]["headline"] == "Empowering People & Businesses Through AI."
    assert data["brand"]["gstin"] == "19BVTPM1874M1ZK"
    assert data["contact"]["email"] == "evolvixtech0pm@gmail.com"
    assert len(data["creative_services"]) >= 9
    assert len(data["technology_services"]) >= 10
    assert len(data["ecosystem"]) == 7
    assert len(data["learning_categories"]) == 18
    assert len(data["music_services"]) == 10
    assert isinstance(data["products"], list)
    assert isinstance(data["portfolio"], list)
    assert isinstance(data["blog"], list)


def test_site_content_put_update_and_verify(api_client, api_base_url):
    original = api_client.get(f"{api_base_url}/api/site-content")
    assert original.status_code == 200
    original_data = original.json()

    updated_content = {
        "brand": {
            **original_data["brand"],
            "headline": f"TEST headline {uuid.uuid4().hex[:6]}",
        },
        "contact": original_data["contact"],
        "creative_services": original_data["creative_services"],
        "technology_services": original_data["technology_services"],
        "ecosystem": original_data["ecosystem"],
        "why_choose": original_data["why_choose"],
    }

    put_response = api_client.put(
        f"{api_base_url}/api/site-content", json={"content": updated_content}
    )
    assert put_response.status_code == 200
    put_data = put_response.json()
    assert put_data["message"] == "Site content updated"
    assert isinstance(put_data["updated_at"], str)

    get_after_put = api_client.get(f"{api_base_url}/api/site-content")
    assert get_after_put.status_code == 200
    after_data = get_after_put.json()
    assert after_data["brand"]["headline"] == updated_content["brand"]["headline"]


def test_site_content_reset_restores_defaults(api_client, api_base_url):
    reset_response = api_client.post(f"{api_base_url}/api/site-content/reset")
    assert reset_response.status_code == 200
    reset_data = reset_response.json()
    assert reset_data["message"] == "Site content reset to Evolvix defaults"

    get_after_reset = api_client.get(f"{api_base_url}/api/site-content")
    assert get_after_reset.status_code == 200
    data = get_after_reset.json()
    assert data["brand"]["headline"] == "Empowering People & Businesses Through AI."
    assert data["contact"]["phone"] == "+91 98318 42869"


# Regression checks for existing contact/newsletter/payment APIs
def test_contact_and_newsletter_regression(api_client, api_base_url):
    contact_payload = {
        "name": "TEST Content QA",
        "email": f"contact-{uuid.uuid4().hex[:8]}@example.com",
        "inquiry_type": "Business inquiry",
        "message": "Testing contact endpoint after content revamp to ensure regression safety.",
    }
    contact_response = api_client.post(f"{api_base_url}/api/contact", json=contact_payload)
    assert contact_response.status_code == 200
    contact_data = contact_response.json()
    assert isinstance(contact_data["id"], str)

    newsletter_payload = {"email": f"news-{uuid.uuid4().hex[:8]}@example.com"}
    newsletter_response = api_client.post(
        f"{api_base_url}/api/newsletter", json=newsletter_payload
    )
    assert newsletter_response.status_code == 200
    newsletter_data = newsletter_response.json()
    assert newsletter_data["message"] == "You’re on the Evolvix update list."


def test_checkout_session_creation_regression(api_client, api_base_url, logged_in_visitor):
    payload = {"product_id": "ai-starter-kit", "origin_url": api_base_url}
    response = api_client.post(f"{api_base_url}/api/payments/checkout", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data["session_id"], str)
    assert data["order_id"] == data["session_id"]
    assert isinstance(data["key_id"], str) and len(data["key_id"]) > 0
