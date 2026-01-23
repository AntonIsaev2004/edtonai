"""Repository for UserVersion model."""

import logging
from typing import Optional
from uuid import UUID

from sqlalchemy import select, func, delete
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models import UserVersion


class UserVersionRepository:
    """CRUD operations for UserVersion."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.logger = logging.getLogger(__name__)

    async def create(
        self,
        type: str,
        resume_text: str,
        vacancy_text: str,
        result_text: str,
        title: Optional[str] = None,
        change_log: list[dict] = None,
        selected_checkbox_ids: list[str] = None,
    ) -> UserVersion:
        """Create a new user version."""
        version = UserVersion(
            type=type,
            title=title,
            resume_text=resume_text,
            vacancy_text=vacancy_text,
            result_text=result_text,
            change_log=change_log or [],
            selected_checkbox_ids=selected_checkbox_ids or [],
        )
        self.session.add(version)
        await self.session.flush()
        self.logger.info("Created user version: %s", version.id)
        return version

    async def get_by_id(self, version_id: UUID) -> Optional[UserVersion]:
        """Get user version by ID."""
        result = await self.session.execute(
            select(UserVersion).where(UserVersion.id == version_id)
        )
        return result.scalar_one_or_none()

    async def list_versions(
        self,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[UserVersion], int]:
        """List versions with pagination, ordered by created_at desc."""
        # Get total count
        count_result = await self.session.execute(
            select(func.count()).select_from(UserVersion)
        )
        total = count_result.scalar_one()

        # Get paginated results
        result = await self.session.execute(
            select(UserVersion)
            .order_by(UserVersion.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        versions = list(result.scalars().all())

        return versions, total

    async def delete_by_id(self, version_id: UUID) -> bool:
        """Delete user version by ID. Returns True if deleted."""
        result = await self.session.execute(
            delete(UserVersion).where(UserVersion.id == version_id)
        )
        await self.session.flush()
        deleted = result.rowcount > 0
        if deleted:
            self.logger.info("Deleted user version: %s", version_id)
        return deleted
