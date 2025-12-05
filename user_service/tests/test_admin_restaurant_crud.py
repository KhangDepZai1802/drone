import os
from fastapi.testclient import TestClient
from user_service.main import app, create_access_token


client = TestClient(app)


def make_admin_token():
    return create_access_token({"sub": "admin", "user_id": 9999, "role": "admin"})


def test_admin_create_update_avatar_delete_restaurant():
    token = make_admin_token()
    headers = {"Authorization": f"Bearer {token}"}

    # Create restaurant
    payload = {
        "username": "test_rest",
        "email": "rest@example.com",
        "password": "password123",
        "restaurant_name": "Test R",
        "restaurant_description": "A test restaurant",
        "city": "Hanoi"
    }

    resp = client.post("/admin/create-restaurant", json=payload, headers=headers)
    assert resp.status_code == 201, resp.text
    data = resp.json()
    rid = data["id"]

    # Update restaurant
    update_payload = {"restaurant_description": "Updated desc"}
    resp2 = client.put(f"/users/{rid}", json=update_payload, headers=headers)
    assert resp2.status_code == 200, resp2.text
    assert resp2.json().get("restaurant_description") == "Updated desc"

    # Upload avatar (multipart)
    files = {"image": ("avatar.png", b"PNGDATA", "image/png")}
    resp3 = client.post(f"/restaurants/{rid}/avatar", files=files, headers=headers)
    assert resp3.status_code == 200, resp3.text
    assert "image_url" in resp3.json()

    # Delete restaurant
    resp4 = client.delete(f"/users/{rid}", headers=headers)
    assert resp4.status_code == 200 or resp4.status_code == 204
