const IPMA_URL = "https://api.ipma.pt/open-data/forecast/meteorology/cities/daily/3490100.json";
const RAIN_THRESHOLD = 60;

interface IpmaDay {
  forecastDate: string;
  precipitaProb: string;
}

// Returns false if today's rain probability >= 60%, true otherwise.
// Fails open (returns true) on any network or parse error.
export async function isWeatherOkToday(): Promise<boolean> {
  try {
    const res = await fetch(IPMA_URL);
    if (!res.ok) return true;
    const body = (await res.json()) as { data: IpmaDay[] };
    const today = new Date().toISOString().slice(0, 10);
    const forecast = body.data.find((d) => d.forecastDate === today);
    if (!forecast) return true;
    return parseFloat(forecast.precipitaProb) < RAIN_THRESHOLD;
  } catch {
    return true;
  }
}
