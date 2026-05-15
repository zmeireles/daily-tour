from pydantic import BaseModel, ConfigDict, Field, field_validator

from .common import I18nText, Slug, Uuid, validate_i18n_text


class Action(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    id: Uuid
    slug: Slug
    i18n: I18nText
    sort_order: int = Field(ge=0)
    icon: str

    @field_validator("i18n", mode="before")
    @classmethod
    def validate_i18n(cls, v: object) -> I18nText:
        return validate_i18n_text(v)


class Wish(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    id: Uuid
    action_id: Uuid
    slug: Slug
    i18n: I18nText
    sort_order: int = Field(ge=0)

    @field_validator("i18n", mode="before")
    @classmethod
    def validate_i18n(cls, v: object) -> I18nText:
        return validate_i18n_text(v)
