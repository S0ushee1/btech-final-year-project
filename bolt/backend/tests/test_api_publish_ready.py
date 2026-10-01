import io


def _register_and_login(client, role="citizen", email="user@example.com"):
    reg = client.post(
        "/auth/register",
        json={"name": "Test User", "email": email, "password": "secret123", "role": role},
    )
    assert reg.status_code == 201

    login = client.post("/auth/login", json={"email": email, "password": "secret123"})
    assert login.status_code == 200
    token = login.get_json()["token"]
    return token


def test_register_and_login_flow(client):
    token = _register_and_login(client, role="citizen", email="citizen@example.com")
    assert token


def test_review_requires_authority_role(client):
    token = _register_and_login(client, role="citizen", email="citizen2@example.com")
    resp = client.put(
        "/reports/1/review",
        json={"status": "Confirmed"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 403
    assert resp.get_json()["error_code"] == "FORBIDDEN"


def test_upload_endpoint_smoke(client, monkeypatch):
    import app.routes as routes_module

    def fake_process_media(path, config=None):
        return {
            "status": "ok",
            "has_violation": True,
            "confidence_score": 0.91,
            "violations": ["Wrong Lane Usage"],
            "detection_state": "violated",
            "evidence_snapshot_path": None,
            "evidence_frame_index": 0,
            "error_code": None,
            "error": None,
        }

    monkeypatch.setattr(routes_module, "process_media", fake_process_media)

    token = _register_and_login(client, role="citizen", email="smoke@example.com")
    data = {
        "file": (io.BytesIO(b"fake-jpeg-content"), "sample.jpg"),
        "location": "test lane",
        "comments": "smoke",
    }
    resp = client.post(
        "/upload",
        data=data,
        content_type="multipart/form-data",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code in (200, 201)
    body = resp.get_json()
    assert body["success"] is True
    assert body["result"] in {"violated", "needs_manual_review"}
