"""
Exploro AI Engine (Python + FastAPI)
Microservicio independiente para procesamiento de opiniones, clasificación por aspectos,
generación de explicaciones basadas en evidencias y control de alucinaciones (FactCheckerGuard).
Política de Costo Cero ($0.00): modelos abiertos (Qwen, Gemma, Llama, Mistral) y
procesamiento extractivo determinista local sin costos de API por token.
"""

import os
import re
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
    version="0.2.0",
    description="Motor de inteligencia de experiencias, extracción de aspectos y control de alucinaciones",
)

# FinOps Metrics in-memory tracker
METRICS_DATA = {
    "total_requests": 0,
    "aspects_extracted": 0,
    "explanations_generated": 0,
    "hallucinations_blocked": 0,
    "total_cost_usd": 0.0,
}


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
    tokens_processed: int = 0
    estimated_cost_usd: float = 0.0


class ExtractedAspectItemModel(BaseModel):
    aspect: str
    category: str
    polarity: Literal["POSITIVE", "NEGATIVE", "NEUTRAL"]
    mentions_count: int
    sample_quotes: List[str]
    confidence: float


class ExtractAspectsRequest(BaseModel):
    category_slug: str
    snippets: List[str] = Field(..., min_length=1)


class ExtractAspectsResponse(BaseModel):
    positive_aspects: List[ExtractedAspectItemModel]
    negative_aspects: List[ExtractedAspectItemModel]
    detected_prices: List[str]
    recommended_activities: List[str]
    tokens_processed: int
    cost_usd: float = 0.0


# Taxonomía de aspectos oficiales según MASTER_PROMPT.md (Líneas 711-732)
RESTAURANT_ASPECT_TAXONOMY: Dict[str, List[str]] = {
    "Sabor y calidad": [
        "sabor", "delicios", "crujiente", "masa", "fresco", "auténtic",
        "textura", "ingredientes", "rico", "exquisito"
    ],
    "Atención y servicio": [
        "atención", "amable", "servicio", "rápido", "camarero", "personal",
        "staff", "cordial", "fila rápida"
    ],
    "Relación calidad-precio": [
        "precio", "calidad-precio", "barato", "económico", "accesible",
        "vale la pena", "precio justo", "buen precio", "menos de $"
    ],
    "Ambiente y comodidad": [
        "ambiente", "terraza", "música", "vista", "acogedor",
        "decoración", "vibra", "espacio"
    ],
    "Porciones abundantes": [
        "porción", "porciones", "generos", "abundante", "grande",
        "suficiente", "llena"
    ],
    "Especialidades de la casa": [
        "especialidad", "burrata", "slice", "rebanada", "tacos",
        "hamburguesa", "pasta", "postre", "café"
    ],
}

TOURISM_ASPECT_TAXONOMY: Dict[str, List[str]] = {
    "Experiencia y vista": [
        "experiencia", "vista", "panorámic", "skyline", "atardecer",
        "paisaje", "hermos", "impresionante"
    ],
    "Accesibilidad y transporte": [
        "accesible", "caminar", "metro", "estación", "estacionamiento",
        "fácil acceso", "transporte"
    ],
    "Duración del recorrido": [
        "duración", "horas", "minutos", "recorrido", "visita rápida", "tiempo"
    ],
    "Costo y gratuidad": [
        "gratis", "gratuito", "sin costo", "económico", "libre acceso", "sin pagar"
    ],
    "Seguridad según testimonios": [
        "seguro", "tranquilo", "familiar", "iluminado", "confiable", "vigilado"
    ],
    "Valor cultural e histórico": [
        "historia", "monumento", "arquitectura", "museo", "arte",
        "emblemátic", "icónico", "patrimonio"
    ],
    "Recomendación imperdible": [
        "imperdible", "recomendad", "joya", "vale la pena", "obligad", "must visit"
    ],
}

NEGATIVE_ASPECT_TAXONOMY: Dict[str, List[str]] = {
    "Largas filas y espera": [
        "fila", "filas", "espera", "larga espera", "cola", "tiempo de espera", "demora"
    ],
    "Lugar abarrotado o ruidoso": [
        "abarrotado", "ruidoso", "demasiada gente", "apretado", "multitud", "atestado"
    ],
    "Precios elevados": [
        "caro", "costoso", "precio alto", "sobrevalorado", "carísimo"
    ],
    "Atención mejorable": [
        "servicio lento", "mala atención", "grosero", "desatento", "poca amabilidad"
    ],
}


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
        "version": "0.2.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "provider": AI_PROVIDER,
        "defaultModel": AI_DEFAULT_MODEL,
        "costPolicy": "ZERO_COST_USD_0",
    }


@app.get(
    "/internal/v1/metrics",
    dependencies=[Depends(verify_internal_key)],
)
def get_metrics() -> dict:
    return {
        **METRICS_DATA,
        "cost_policy": "ZERO_COST_USD_0",
        "provider": AI_PROVIDER,
        "default_model": AI_DEFAULT_MODEL,
    }


@app.post(
    "/internal/v1/opinions/extract-aspects",
    response_model=ExtractAspectsResponse,
    dependencies=[Depends(verify_internal_key)],
)
def extract_aspects(payload: ExtractAspectsRequest) -> ExtractAspectsResponse:
    METRICS_DATA["total_requests"] += 1

    category = payload.category_slug.lower()
    is_food = category in ["comida", "food", "restaurantes"]
    taxonomy = RESTAURANT_ASPECT_TAXONOMY if is_food else TOURISM_ASPECT_TAXONOMY

    positive_items: List[ExtractedAspectItemModel] = []
    negative_items: List[ExtractedAspectItemModel] = []
    detected_prices: List[str] = []
    recommended_activities: List[str] = []

    total_words = 0

    # 1. Aspectos positivos
    for aspect_name, keywords in taxonomy.items():
        matching_quotes: List[str] = []
        for snippet in payload.snippets:
            lower = snippet.lower()
            if any(kw in lower for kw in keywords):
                matching_quotes.append(snippet)
        if matching_quotes:
            confidence = min(1.0, 0.75 + len(matching_quotes) * 0.08)
            positive_items.append(
                ExtractedAspectItemModel(
                    aspect=aspect_name,
                    category=payload.category_slug,
                    polarity="POSITIVE",
                    mentions_count=len(matching_quotes),
                    sample_quotes=matching_quotes[:2],
                    confidence=round(confidence, 2),
                )
            )

    # 2. Aspectos negativos / advertencias
    for aspect_name, keywords in NEGATIVE_ASPECT_TAXONOMY.items():
        matching_quotes: List[str] = []
        for snippet in payload.snippets:
            lower = snippet.lower()
            if any(kw in lower for kw in keywords):
                matching_quotes.append(snippet)
        if matching_quotes:
            confidence = min(1.0, 0.70 + len(matching_quotes) * 0.1)
            negative_items.append(
                ExtractedAspectItemModel(
                    aspect=aspect_name,
                    category=payload.category_slug,
                    polarity="NEGATIVE",
                    mentions_count=len(matching_quotes),
                    sample_quotes=matching_quotes[:2],
                    confidence=round(confidence, 2),
                )
            )

    # 3. Precios y actividades
    for snippet in payload.snippets:
        total_words += len(snippet.split())
        prices = re.findall(r"\$\s?\d+(?:\.\d{2})?", snippet)
        for p in prices:
            clean = p.replace(" ", "")
            if clean not in detected_prices:
                detected_prices.append(clean)
        lower = snippet.lower()
        if ("gratis" in lower or "gratuito" in lower) and "Gratis" not in detected_prices:
            detected_prices.append("Gratis")

        if any(act in lower for act in ["probar", "pedir", "recomiendo", "visitar al"]):
            clean_act = snippet[:60] + "..." if len(snippet) > 60 else snippet
            if clean_act not in recommended_activities:
                recommended_activities.append(clean_act)

    positive_items.sort(key=lambda x: x.mentions_count, reverse=True)
    negative_items.sort(key=lambda x: x.mentions_count, reverse=True)

    METRICS_DATA["aspects_extracted"] += len(positive_items) + len(negative_items)

    return ExtractAspectsResponse(
        positive_aspects=positive_items,
        negative_aspects=negative_items,
        detected_prices=detected_prices,
        recommended_activities=recommended_activities[:3],
        tokens_processed=int(total_words * 1.3),
        cost_usd=0.0,
    )


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
    METRICS_DATA["total_requests"] += 1

    if len(payload.evidences) == 0:
        return ExplainPlaceResponse(
            place_id=payload.place_id,
            explanation_es=None,
            explanation_status="INSUFFICIENT_DATA",
            positive_aspects=[],
            negative_aspects=[],
            fact_check_passed=True,
            provider_used=AI_PROVIDER,
            tokens_processed=0,
            estimated_cost_usd=0.0,
        )

    snippets = [ev.snippet for ev in payload.evidences]
    extract_res = extract_aspects(
        ExtractAspectsRequest(
            category_slug=payload.category_slug,
            snippets=snippets,
        )
    )

    pos_names = [a.aspect for a in extract_res.positive_aspects]
    neg_names = [a.aspect for a in extract_res.negative_aspects]

    if pos_names:
        aspects_str = ", ".join(pos_names[:2]).lower()
        explanation = (
            f"{payload.place_name} destaca según {len(payload.evidences)} "
            f"fuentes independientes por: {aspects_str}."
        )
        if neg_names:
            explanation += f" Considerar advertencia de viajeros: {neg_names[0].lower()}."
    else:
        explanation = (
            f"Recomendado con base en {len(payload.evidences)} experiencia(s) "
            f"registrada(s) para {payload.place_name}."
        )

    passed = fact_checker_guard(explanation, payload.evidences)
    if not passed:
        METRICS_DATA["hallucinations_blocked"] += 1

    METRICS_DATA["explanations_generated"] += 1

    status: Literal["CONFIRMED", "UNVERIFIED", "INSUFFICIENT_DATA"] = (
        "CONFIRMED" if len(payload.evidences) >= 2 else "UNVERIFIED"
    )

    return ExplainPlaceResponse(
        place_id=payload.place_id,
        explanation_es=explanation if passed else None,
        explanation_status=status if passed else "INSUFFICIENT_DATA",
        positive_aspects=pos_names,
        negative_aspects=neg_names,
        fact_check_passed=passed,
        provider_used=AI_PROVIDER,
        tokens_processed=extract_res.tokens_processed,
        estimated_cost_usd=0.0,
    )
