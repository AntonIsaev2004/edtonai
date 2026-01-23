"""ResumeRaw ORM model with structured parsed columns."""

import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy import Text, String, DateTime
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from backend.db.base import Base


class ResumeRaw(Base):
    """
    Raw resume text with structured parsed data in separate columns.
    
    Each field from LLM parsing is stored in its own column for:
    - Better queryability
    - Easier partial updates
    - Schema validation at DB level
    """

    __tablename__ = "resume_raw"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    
    # Original source text
    source_text: Mapped[str] = mapped_column(Text, nullable=False)
    content_hash: Mapped[str] = mapped_column(
        String(64),
        unique=True,
        index=True,
        nullable=False,
    )
    
    # ============ PARSED DATA COLUMNS ============
    
    # Personal info: {name, title, location, contacts: {email, phone, links}}
    personal_info: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSONB,
        nullable=True,
    )
    
    # Summary/About section (plain text)
    summary: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    
    # Skills: [{name, category, level}]
    skills: Mapped[Optional[List[Dict[str, Any]]]] = mapped_column(
        JSONB,
        nullable=True,
        default=list,
    )
    
    # Work experience: [{company, position, start_date, end_date, responsibilities, achievements, tech_stack}]
    work_experience: Mapped[Optional[List[Dict[str, Any]]]] = mapped_column(
        JSONB,
        nullable=True,
        default=list,
    )
    
    # Education: [{institution, degree, field, start_year, end_year}]
    education: Mapped[Optional[List[Dict[str, Any]]]] = mapped_column(
        JSONB,
        nullable=True,
        default=list,
    )
    
    # Certifications: [{name, issuer, date}] or [str]
    certifications: Mapped[Optional[List[Any]]] = mapped_column(
        JSONB,
        nullable=True,
        default=list,
    )
    
    # Languages: [{language, proficiency}] or [str]
    languages: Mapped[Optional[List[Any]]] = mapped_column(
        JSONB,
        nullable=True,
        default=list,
    )
    
    # Raw sections: {section_title: section_text}
    raw_sections: Mapped[Optional[Dict[str, str]]] = mapped_column(
        JSONB,
        nullable=True,
        default=dict,
    )
    
    # ============ METADATA ============
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )
    parsed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime,
        nullable=True,
    )
    
    # Helper to get all parsed data as dict (for API compatibility)
    def get_parsed_data(self) -> Dict[str, Any]:
        """Return parsed data as unified dict."""
        return {
            "personal_info": self.personal_info,
            "summary": self.summary,
            "skills": self.skills or [],
            "work_experience": self.work_experience or [],
            "education": self.education or [],
            "certifications": self.certifications or [],
            "languages": self.languages or [],
            "raw_sections": self.raw_sections or {},
        }
    
    def set_parsed_data(self, data: Dict[str, Any]) -> None:
        """Set parsed data from unified dict."""
        self.personal_info = data.get("personal_info")
        self.summary = data.get("summary")
        self.skills = data.get("skills", [])
        self.work_experience = data.get("work_experience", [])
        self.education = data.get("education", [])
        self.certifications = data.get("certifications", [])
        self.languages = data.get("languages", [])
        self.raw_sections = data.get("raw_sections", {})
