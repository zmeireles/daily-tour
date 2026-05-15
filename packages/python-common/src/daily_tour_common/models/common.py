from datetime import UTC, date, datetime
from typing import Annotated
from uuid import UUID

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, StringConstraints

from .enums import Locale

Uuid = UUID
IsoDateTime = AwareDatetime
IsoDate = date


class Geom(BaseModel):
    model_config = ConfigDict(extra="forbid")

    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)


Slug = Annotated[str, StringConstraints(pattern=r"^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$")]

I18nText = dict[Locale, str]


def validate_i18n_text(value: object) -> I18nText:
    if not isinstance(value, dict):
        raise ValueError("I18nText must be a dict")
    if not value:
        raise ValueError("I18nText must have at least one locale entry")
    result: I18nText = {}
    for k, v in value.items():
        if k not in Locale.__members__.values():
            raise ValueError(f"Invalid locale key: {k!r}")
        result[Locale(k)] = str(v)
    return result


def now_utc() -> datetime:
    return datetime.now(tz=UTC)


__all__ = [
    "Geom",
    "I18nText",
    "IsoDate",
    "IsoDateTime",
    "Slug",
    "Uuid",
    "validate_i18n_text",
]
