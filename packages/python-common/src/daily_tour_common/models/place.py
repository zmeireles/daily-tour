from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from .common import Geom, I18nText, IsoDateTime, Uuid, validate_i18n_text
from .enums import PlaceStatus


class SocialLink(BaseModel):
    model_config = ConfigDict(extra="forbid")

    kind: Literal["instagram", "facebook", "tiktok", "whatsapp", "telegram", "other"]
    handle: str


class PlaceContacts(BaseModel):
    model_config = ConfigDict(extra="forbid")

    phone: str | None = None
    email: EmailStr | None = None
    website: str | None = None
    social: list[SocialLink] = []


class PlaceHours(BaseModel):
    model_config = ConfigDict(extra="forbid")

    dow: Annotated[int, Field(ge=0, le=6)]
    open: str = Field(pattern=r"^\d{2}:\d{2}$")
    close: str = Field(pattern=r"^\d{2}:\d{2}$")


class PlaceSource(BaseModel):
    model_config = ConfigDict(extra="forbid")

    kind: Literal["manual", "google_places", "osm", "crawl"]
    ref: str | None = None
    retrieved_at: IsoDateTime | None = None


class Place(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    id: Uuid
    guesthouse_scope: Literal["all"] | list[UUID]
    name: I18nText
    description: I18nText
    geom: Geom
    address: str
    contacts: PlaceContacts
    hours: list[PlaceHours] = []
    actions: list[UUID] = Field(min_length=1)
    wishes: list[UUID] = []
    media: list[UUID]
    status: PlaceStatus
    is_hosts_pick: bool = False
    source: PlaceSource
    created_at: IsoDateTime
    updated_at: IsoDateTime

    @field_validator("name", "description", mode="before")
    @classmethod
    def validate_i18n(cls, v: object) -> I18nText:
        return validate_i18n_text(v)


class PlaceCandidate(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    id: Uuid
    source: Literal["google_places", "osm", "crawl", "manual"]
    source_ref: str
    raw: dict[str, object]
    dedupe_hash: str
    status: Literal["new", "reviewed", "approved", "rejected"]
    proposed_place: Place | None = None
    created_at: IsoDateTime
