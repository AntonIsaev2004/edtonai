"""AI result repository for LLM cache operations."""

from typing import Any, Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models import AIResult


class AIResultRepository:
    """Repository for AIResult (LLM cache) operations."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get(self, operation: str, input_hash: str) -> Optional[AIResult]:
        """Get cached AI result by operation and input hash."""
        stmt = select(AIResult).where(
            AIResult.operation == operation,
            AIResult.input_hash == input_hash,
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_id(self, result_id: UUID) -> Optional[AIResult]:
        """Get AI result by ID."""
        stmt = select(AIResult).where(AIResult.id == result_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def save(
        self,
        operation: str,
        input_hash: str,
        output_json: dict[str, Any],
        provider: Optional[str] = None,
        model: Optional[str] = None,
        error: Optional[str] = None,
    ) -> AIResult:
        """Save AI result to cache."""
        ai_result = AIResult(
            operation=operation,
            input_hash=input_hash,
            output_json=output_json,
            provider=provider,
            model=model,
            error=error,
        )
        self.session.add(ai_result)
        await self.session.flush()
        return ai_result
