from enum import StrEnum


class Locale(StrEnum):
    EN = "en"
    PT_PT = "pt-PT"
    PT_BR = "pt-BR"
    DE = "de"
    ES = "es"
    FR = "fr"


class PlaceStatus(StrEnum):
    DRAFT = "draft"
    OWNER_APPROVED = "owner_approved"
    PUBLISHED = "published"
    ARCHIVED = "archived"


class ReservationStatus(StrEnum):
    CONFIRMED = "confirmed"
    CHECKED_IN = "checked_in"
    CHECKED_OUT = "checked_out"
    CANCELLED = "cancelled"


class TourPlanStatus(StrEnum):
    PENDING = "pending"
    RETRIEVING = "retrieving"
    PLANNING = "planning"
    VALIDATING = "validating"
    COMPLETED = "completed"
    FAILED = "failed"


class TourSlot(StrEnum):
    BREAKFAST = "breakfast"
    MORNING = "morning"
    LUNCH = "lunch"
    AFTERNOON = "afternoon"
    DINNER = "dinner"
    EVENING = "evening"


class OwnerScope(StrEnum):
    GUESTHOUSE = "guesthouse"
    OWNER = "owner"
    GUEST = "guest"
    SYSTEM = "system"


class MediaKind(StrEnum):
    IMAGE = "image"
    VIDEO = "video"
