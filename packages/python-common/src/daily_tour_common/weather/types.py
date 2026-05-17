from datetime import date

from pydantic import BaseModel, ConfigDict, Field


class ForecastDay(BaseModel):
    model_config = ConfigDict(extra="ignore")

    forecast_date: date = Field(alias="forecastDate")
    t_min: float = Field(alias="tMin")
    t_max: float = Field(alias="tMax")
    precip_prob: float = Field(alias="precipitaProb")
    wind_dir: str | None = Field(default=None, alias="predWindDir")
    wind_class: int | None = Field(default=None, alias="classWindSpeed")
    weather_type_id: int = Field(alias="idWeatherType")


__all__ = ["ForecastDay"]
