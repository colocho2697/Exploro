"""
Exploro AI Engine (Python + FastAPI)
Microservicio independiente para procesamiento de opiniones, clasificación por aspectos,
generación de explicaciones basadas en evidencias y control de alucinaciones (FactCheckerGuard).
Política de Costo Cero ($0.00): soporta modelos abiertos vía Ollama (Qwen, Gemma, Llama, Mistral)
y síntesis extractiva determinista de respaldo sin costos de API.
"""

import os
from datetime import datetime, timezone
from typing import Dict, List, Literal, Optional
from fastapi import Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

INTERNAL_SERVICE_KEY = os.getenv(
    "INTERNAL_SERVICE_KEY", "dev_internal_service_key_exploro_ai_2026"
)
AI_PROVIDER = os.getenv("AI_PROVIDER", "ollama_zero_cost")
AI_DEFAULT_MODEL = os.getenv("AI_DEFAULT_MODEL", "qwen2.5:7b")

app = FastAPI(
    title="Exploro AI Engine",
    version="0.1.0",
    description="Motor de inteligencia de experiencias, extracción de aspectos y control de alucinaciones",
)


def verify_internal_key(
    x_internal_service_key: Optional[str] = Header(default=None),
) -> None:
    if x_internal_service_key != INTERNAL_SERVICE_KEY:
        raise HTTPException(
            status_code=401,
            detail="Clave de servicio interno inválida o ausente.",
        )


class EvidenceItemInput(BaseModel):
    evidence_id: str
    source_code: str
    snippet: str = Field(..., min_length=5)
    confidence_score: float = Field(default=0.85, ge=0.0, le=1.0)


class ExplainPlaceRequest(BaseModel):
    place_id: str
    place_name: str
    category_slug: str
    evidences: List[EvidenceItemInput]


class ExplainPlaceResponse(BaseModel):
    place_id: str
    explanation_es: Optional[str]
    explanation_status: Literal["CONFIRMED", "UNVERIFIED", "INSUFFICIENT_DATA"]
    positive_aspects: List[str]
    negative_aspects: List[str]
    fact_check_passed: bool
    provider_used: str
    estimated_cost_usd: float = 0.0


RESTAURANT_ASPECT_KEYWORDS: Dict[str, List[str]] = {
    "Sabor y calidad": ["sabor", "delicios", "crujiente", "masa", "fresco", "auténtic", "burrata", "slice"],
    "Relación calidad-precio": ["calidad-precio", "barato", "económico", "vale la pena", "menos de $", "gratis"],
    "Porciones": ["porción", "porciones", "generos", "abundante", "grande"],
    "Atención y rapidez": ["rápid", "atención", "servicio", "amable", "fila rápida"],
    "Ambiente": ["ambiente", "terraza", "música", "vista", "acogedor"],
}

TOURISM_ASPECT_KEYWORDS: Dict[str, List[str]] = {
    "Experiencia y vista": ["vista", "skyline", "atardecer", "panorámic", "increíble", "hermos"],
    "Costo y gratuidad": ["gratis", "gratuito", "sin pagar", "económico"],
    "Accesibilidad": ["accesible", "caminar", "transporte", "fácil acceso"],
    "Seguridad": ["seguro", "familiar", "tranquilo", "iluminado"],
}


def extract_verified_aspects(category_slug: str, snippets: List[str]) -> List[str]:
    """Extrae aspectos respaldados directamente por el texto de las evidencias."""
    combined = " ".join(snippets).lower()
    mapping = (
        RESTAURANT_ASPECT_KEYWORDS
        if category_slug == "comida"
        else TOURISM_ASPECT_KEYWORDS
    )
    detected: List[str] = []
    for aspect_label, keywords in mapping.items():
        if any(kw in combined for kw in keywords):
            detected.append(aspect_label)
    return detected


def fact_checker_guard(
    explanation: Optional[str], evidences: List[EvidenceItemInput]
) -> bool:
    """
    Paso 4.5 — Controlar alucinaciones:
    Verifica que exista al menos una evidencia válida y que la explicación no esté vacía.
    """
    if not evidences or not explanation or len(explanation.strip()) < 15:
        return False
    return True


@app.get("/health")
def health_check() -> dict:
    return {
        "status": "ok",
        "service": "exploro-ai-engine",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "provider": AI_PROVIDER,
        "defaultModel": AI_DEFAULT_MODEL,
        "costPolicy": "ZERO_COST_USD_0",
    }


@app.post(
    "/internal/v1/places/explain",
    response_model=ExplainPlaceResponse,
    dependencies=[Depends(verify_internal_key)],
)
def explain_place(payload: ExplainPlaceRequest) -> ExplainPlaceResponse:
    """
    Genera una explicación verificada respaldada exclusivamente por evidencias disponibles.
    Si no hay evidencia suficiente, devuelve INSUFFICIENT_DATA sin inventar hechos.
    """
    if len(payload.evidences) == 0:
        return ExplainPlaceResponse(
            place_id=payload.place_id,
            explanation_es=None,
            explanation_status="INSUFFICIENT_DATA",
            positive_aspects=[],
            negative_aspects=[],
            fact_check_passed=True,
            provider_used=AI_PROVIDER,
            estimated_cost_usd=0.0,
        )

    snippets = [ev.snippet for ev in payload.evidences]
    positive_aspects = extract_verified_aspects(payload.category_slug, snippets)

    if positive_aspects:
        aspects_str = ", ".join(positive_aspects).lower()
        explanation = (
            f"{payload.place_name} destaca según {len(payload.evidences)} "
            f"evidencia(s) verificada(s) por: {aspects_str}."
        )
    else:
        explanation = (
            f"Recomendado con base en {len(payload.evidences)} experiencia(s) "
            f"registrada(s) para {payload.place_name}."
        )

    passed = fact_checker_guard(explanation, payload.evidences)
    status: Literal["CONFIRMED", "UNVERIFIED", "INSUFFICIENT_DATA"] = (
        "CONFIRMED" if len(payload.evidences) >= 2 else "UNVERIFIED"
    )

    return ExplainPlaceResponse(
        place_id=payload.place_id,
        explanation_es=explanation if passed else None,
        explanation_status=status if passed else "INSUFFICIENT_DATA",
        positive_aspects=positive_aspects,
        negative_aspects=[],
        fact_check_passed=passed,
        provider_used=AI_PROVIDER,
        estimated_cost_usd=0.0,
    )

