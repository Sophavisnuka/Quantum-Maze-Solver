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
    assert len(body["cells"]) == 6
    assert len(body["cells"][0]) == 8
    assert body["start"] == [0, 0]
    assert body["goal"] == [5, 7]
    assert body["qubits"] <= 8


def test_solve_path_is_a_walk_over_open_sides():
    body = client.get("/api/solve", params={"width": 8, "height": 6, "seed": 1, "max_qubits": 8}).json()
    cells = client.get("/api/maze", params={"width": 8, "height": 6, "seed": 1, "max_qubits": 8}).json()["cells"]
    dirs = {(-1, 0): 1, (0, 1): 2, (1, 0): 4, (0, -1): 8}
    path = body["path"]
    assert path[0] == [0, 0] and path[-1] == [5, 7]
    assert len(path) - 1 == body["length"]
    for (r, c), (nr, nc) in zip(path, path[1:]):
        assert cells[r][c] & dirs[(nr - r, nc - c)]


def test_solve_matches_classical():
    r = client.get("/api/solve", params={"width": 8, "height": 6, "seed": 1, "max_qubits": 8})
    assert r.status_code == 200
    body = r.json()
    assert body["verified"] is True
    assert body["engine"] == "qiskit"


def test_invalid_params_rejected():
    assert client.get("/api/maze", params={"width": 1}).status_code == 422
