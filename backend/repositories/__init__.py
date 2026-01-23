"""Repository layer for database operations."""

from .resume import ResumeRepository
from .vacancy import VacancyRepository
from .ai_result import AIResultRepository
from .analysis import AnalysisRepository
from .resume_version import ResumeVersionRepository
from .ideal_resume import IdealResumeRepository
from .user_version import UserVersionRepository

__all__ = [
    # Stage 1
    "ResumeRepository",
    "VacancyRepository",
    "AIResultRepository",
    "AnalysisRepository",
    # Stage 2
    "ResumeVersionRepository",
    "IdealResumeRepository",
    # Stage 3
    "UserVersionRepository",
]
