"""Vacancy parsing request/response schemas."""

from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class VacancyParseRequest(BaseModel):
    """Request to parse a vacancy."""

    vacancy_text: str = Field(..., min_length=10, description="Raw vacancy text")


class VacancyParseResponse(BaseModel):
    """Response with parsed vacancy data."""

    vacancy_id: UUID = Field(..., description="UUID of stored vacancy")
    vacancy_hash: str = Field(..., description="SHA256 hash of normalized text")
    parsed_vacancy: dict[str, Any] = Field(..., description="Structured vacancy JSON from LLM")
    cache_hit: bool = Field(..., description="True if result was from cache")


class VacancyPatchRequest(BaseModel):
    """Request to update parsed vacancy data."""

    parsed_data: dict[str, Any] = Field(
        ..., description="Updated structured vacancy data (partial or full)"
    )


class VacancyDetailResponse(BaseModel):
    """Detailed vacancy response with all data."""

    id: UUID
    source_text: str
    content_hash: str
    parsed_data: Optional[dict[str, Any]] = None
    created_at: datetime
    parsed_at: Optional[datetime] = None
