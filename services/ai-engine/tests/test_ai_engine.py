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


def test_extract_aspects_rejects_unauthorized():
    response = client.post(
        "/internal/v1/opinions/extract-aspects",
        json={
            "category_slug": "comida",
            "snippets": ["Masa crujiente y deliciosa"],
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


def test_extract_aspects_for_restaurant():
    response = client.post(
        "/internal/v1/opinions/extract-aspects",
        headers={"X-Internal-Service-Key": INTERNAL_SERVICE_KEY},
        json={
            "category_slug": "comida",
            "snippets": [
                "Masa crujiente y salsa de tomate fresco, sabor auténtico.",
                "Porciones generosas por $4.50 la rebanada, vale la pena.",
                "Hay una fila larga y espera de 20 minutos en horas punta.",
                "Recomiendo probar la slice de burrata.",
            ],
        },
    )
    assert response.status_code == 200
    body = response.json()

    pos_aspects = [a["aspect"] for a in body["positive_aspects"]]
    assert "Sabor y calidad" in pos_aspects
    assert "Relación calidad-precio" in pos_aspects
    assert "Porciones abundantes" in pos_aspects

    neg_aspects = [a["aspect"] for a in body["negative_aspects"]]
    assert "Largas filas y espera" in neg_aspects

    assert "$4.50" in body["detected_prices"]
    assert len(body["recommended_activities"]) > 0
    assert body["cost_usd"] == 0.0


def test_extract_aspects_for_tourism():
    response = client.post(
        "/internal/v1/opinions/extract-aspects",
        headers={"X-Internal-Service-Key": INTERNAL_SERVICE_KEY},
        json={
            "category_slug": "turismo",
            "snippets": [
                "Increíble vista panorámica del skyline de NYC.",
                "Es un paseo gratis y accesible en metro.",
            ],
        },
    )
    assert response.status_code == 200
    body = response.json()

    pos_aspects = [a["aspect"] for a in body["positive_aspects"]]
    assert "Experiencia y vista" in pos_aspects
    assert "Costo y gratuidad" in pos_aspects
    assert "Accesibilidad y transporte" in pos_aspects
    assert "Gratis" in body["detected_prices"]


def test_explain_place_generates_verified_explanation_with_aspects():
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
                    "snippet": "Porciones generosas pero suele haber fila de espera.",
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
    assert "Largas filas y espera" in body["negative_aspects"]
    assert body["fact_check_passed"] is True


def test_metrics_endpoint():
    response = client.get(
        "/internal/v1/metrics",
        headers={"X-Internal-Service-Key": INTERNAL_SERVICE_KEY},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["cost_policy"] == "ZERO_COST_USD_0"
    assert body["total_requests"] > 0
    assert body["aspects_extracted"] > 0
    assert body["total_cost_usd"] == 0.0
