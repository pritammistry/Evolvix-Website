import os
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
TARGET_SLUG = "digital-forward-2"


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
    # Admin auth flow for protected catalog endpoints
    admin_password = _resolve_admin_password()
    if not admin_password:
        pytest.skip("ADMIN_PASSWORD is not set")
    response = api_client.post(
        f"{api_base_url}/api/admin/login", json={"password": admin_password}
    )
    if response.status_code != 200:
        pytest.skip("Admin login failed; skipping admin image persistence tests")
    data = response.json()
    assert isinstance(data.get("token"), str)
    assert len(data["token"]) > 0
    return data["token"]


@pytest.fixture(scope="module")
def original_products(api_client, api_base_url, admin_token):
    # Snapshot + teardown restore for catalog mutation safety
    headers = {"Authorization": f"Bearer {admin_token}"}
    dashboard_response = api_client.get(
        f"{api_base_url}/api/admin/dashboard", headers=headers
    )
    assert dashboard_response.status_code == 200
    dashboard_data = dashboard_response.json()
    products_snapshot = dashboard_data["products"]
    assert isinstance(products_snapshot, list)
    assert len(products_snapshot) > 0

    yield products_snapshot

    restore_response = api_client.put(
        f"{api_base_url}/api/admin/products",
        json={"items": products_snapshot},
        headers=headers,
    )
    assert restore_response.status_code == 200


def _find_target_product(products):
    return next(
        (p for p in products if p.get("slug") == TARGET_SLUG or p.get("id") == TARGET_SLUG),
        None,
    )


def test_admin_products_update_preserves_images_array(api_client, api_base_url, admin_token, original_products):
    # Product image array persistence through /api/admin/products
    headers = {"Authorization": f"Bearer {admin_token}"}
    target_product = _find_target_product(original_products)
    assert target_product is not None

    image_1 = "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80"
    image_2 = "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=1200&q=80"
    image_3 = "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80"
    next_images = [image_1, image_2, image_3]

    mutated = []
    for item in original_products:
        if item.get("slug") == TARGET_SLUG or item.get("id") == TARGET_SLUG:
            mutated.append({**item, "images": next_images, "image": next_images[0]})
        else:
            mutated.append(item)

    save_response = api_client.put(
        f"{api_base_url}/api/admin/products", json={"items": mutated}, headers=headers
    )
    assert save_response.status_code == 200
    save_data = save_response.json()
    assert save_data["message"] == "Products saved"

    dashboard_response = api_client.get(
        f"{api_base_url}/api/admin/dashboard", headers=headers
    )
    assert dashboard_response.status_code == 200
    dashboard_data = dashboard_response.json()

    updated = _find_target_product(dashboard_data["products"])
    assert updated is not None
    assert updated["images"] == next_images
    assert updated["image"] == next_images[0]


def test_public_product_endpoint_reflects_saved_images(api_client, api_base_url):
    # Public product read path should expose saved image gallery fields
    response = api_client.get(f"{api_base_url}/api/products/{TARGET_SLUG}")
    assert response.status_code == 200
    data = response.json()

    assert data["slug"] == TARGET_SLUG
    assert isinstance(data.get("images"), list)
    assert len(data["images"]) >= 1
    assert data["image"] == data["images"][0]
