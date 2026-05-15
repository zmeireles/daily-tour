from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field

from .common import IsoDate, IsoDateTime, Uuid
from .enums import TourPlanStatus, TourSlot


class TourStep(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    slot: TourSlot
    place_id: Uuid
    start: IsoDateTime
    end: IsoDateTime
    rationale: str
    travel_to_minutes: Annotated[int, Field(ge=0)] | None = None
    locked: bool = False


class TourParams(BaseModel):
    model_config = ConfigDict(extra="forbid")

    date: IsoDate
    start_time: str = Field(pattern=r"^\d{2}:\d{2}$")
    end_time: str = Field(pattern=r"^\d{2}:\d{2}$")
    party_size: Annotated[int, Field(gt=0)]
    vehicle: str = Field(pattern=r"^(car|none)$")
    notes: str | None = None


class TourPlan(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    id: Uuid
    reservation_id: Uuid
    params: TourParams
    status: TourPlanStatus
    steps: list[TourStep]
    weather_aware: bool = False
    llm_cost_usd: Annotated[float, Field(ge=0)] | None = None
    created_at: IsoDateTime
    completed_at: IsoDateTime | None = None
