from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health():
    r = client.get("/api/test")
    assert r.status_code == 200
    assert r.json()["status"] == "success"


def test_maze_shape():
    r = client.get("/api/maze", params={"width": 8, "height": 6, "seed": 1, "max_qubits": 8})
    assert r.status_code == 200
    body = r.json()
    assert len(body["grid"]) == 2 * 6 + 1
    assert len(body["grid"][0]) == 2 * 8 + 1
    assert body["qubits"] <= 8


def test_solve_matches_classical():
    r = client.get("/api/solve", params={"width": 8, "height": 6, "seed": 1, "max_qubits": 8})
    assert r.status_code == 200
    body = r.json()
    assert body["verified"] is True
    assert body["engine"] == "qiskit"


def test_invalid_params_rejected():
    assert client.get("/api/maze", params={"width": 1}).status_code == 422
