from __future__ import annotations

from datetime import UTC, datetime
from enum import StrEnum

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class ScriptStatus(StrEnum):
    draft = "draft"
    tested = "tested"
    deployed = "deployed"


class Script(Base):
    __tablename__ = "scripts"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    gas_script_id: Mapped[str] = mapped_column(String(255))
    spreadsheet_id: Mapped[str] = mapped_column(String(255))
    owner_email: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )

    versions: Mapped[list[ScriptVersion]] = relationship(
        back_populates="script",
        cascade="all, delete-orphan",
        order_by="ScriptVersion.version_number",
    )

    @property
    def latest_version(self) -> ScriptVersion | None:
        return self.versions[-1] if self.versions else None


class ScriptVersion(Base):
    __tablename__ = "script_versions"

    id: Mapped[int] = mapped_column(primary_key=True)
    script_id: Mapped[int] = mapped_column(ForeignKey("scripts.id", ondelete="CASCADE"))
    version_number: Mapped[int] = mapped_column(Integer, default=1)
    message: Mapped[str] = mapped_column(String(500), default="Version initiale")
    status: Mapped[ScriptStatus] = mapped_column(SAEnum(ScriptStatus), default=ScriptStatus.draft)
    created_by: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )

    script: Mapped[Script] = relationship(back_populates="versions")
    files: Mapped[list[ScriptFile]] = relationship(
        back_populates="version", cascade="all, delete-orphan"
    )


class ScriptFile(Base):
    __tablename__ = "script_files"

    id: Mapped[int] = mapped_column(primary_key=True)
    version_id: Mapped[int] = mapped_column(ForeignKey("script_versions.id", ondelete="CASCADE"))
    filename: Mapped[str] = mapped_column(String(255))
    content: Mapped[str] = mapped_column(Text)
    file_type: Mapped[str] = mapped_column(String(50), default="server_js")

    version: Mapped[ScriptVersion] = relationship(back_populates="files")
