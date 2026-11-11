from fastapi.testclient import TestClient
from app.main import app, INTERNAL_SERVICE_KEY

client = TestClient(app)


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["costPolicy"] == "ZERO_COST_USD_0"


def test_explain_place_rejects_unauthorized():
    response = client.post(
        "/internal/v1/places/explain",
        json={
            "place_id": "p1",
            "place_name": "Test Pizza",
            "category_slug": "comida",
            "evidences": [],
        },
    )
    assert response.status_code == 401


def test_explain_place_handles_insufficient_evidence_without_hallucinating():
    response = client.post(
        "/internal/v1/places/explain",
        headers={"X-Internal-Service-Key": INTERNAL_SERVICE_KEY},
        json={
            "place_id": "p1",
            "place_name": "Barton Springs",
            "category_slug": "turismo",
            "evidences": [],
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["explanation_es"] is None
    assert body["explanation_status"] == "INSUFFICIENT_DATA"
    assert body["estimated_cost_usd"] == 0.0


def test_explain_place_generates_verified_explanation_from_evidence():
    response = client.post(
        "/internal/v1/places/explain",
        headers={"X-Internal-Service-Key": INTERNAL_SERVICE_KEY},
        json={
            "place_id": "p2",
            "place_name": "L'Industrie Pizzeria",
            "category_slug": "comida",
            "evidences": [
                {
                    "evidence_id": "e1",
                    "source_code": "REDDIT_US_FOOD",
                    "snippet": "Excelente sabor de la masa fermentada y gran relación calidad-precio.",
                    "confidence_score": 0.9,
                },
                {
                    "evidence_id": "e2",
                    "source_code": "EXPLORO_NATIVE",
                    "snippet": "Porciones generosas y fila rápida entre semana.",
                    "confidence_score": 0.95,
                },
            ],
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["explanation_status"] == "CONFIRMED"
    assert "L'Industrie Pizzeria" in body["explanation_es"]
    assert "Sabor y calidad" in body["positive_aspects"]
    assert body["fact_check_passed"] is True

