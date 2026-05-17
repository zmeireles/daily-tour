from pydantic import BaseModel


class RouteResult(BaseModel):
    distance_m: float
    duration_s: float


__all__ = ["RouteResult"]
