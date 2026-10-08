import { AssetImage } from "@/components/common/AssetImage";
import { DASHBOARD_ASSETS } from "@/lib/assets";

const REVALIDATE_SECONDS = 60 * 30;
const KOREAN_LOCATION_ALIASES: Record<string, string> = {
  서울: "Seoul", 부산: "Busan", 인천: "Incheon", 대구: "Daegu", 대전: "Daejeon", 광주: "Gwangju", 울산: "Ulsan", 세종: "Sejong",
  수원: "Suwon", 성남: "Seongnam", 고양: "Goyang", 용인: "Yongin", 청주: "Cheongju", 충주: "Chungju", 천안: "Cheonan",
  전주: "Jeonju", 목포: "Mokpo", 여수: "Yeosu", 순천: "Suncheon", 춘천: "Chuncheon", 강릉: "Gangneung", 원주: "Wonju",
  창원: "Changwon", 김해: "Gimhae", 진주: "Jinju", 포항: "Pohang", 경주: "Gyeongju", 구미: "Gumi", 제주: "Jeju",
};

type GeocodingResponse = {
  results?: Array<{ latitude: number; longitude: number; population?: number }>;
};

type ForecastResponse = {
  current?: { temperature_2m: number; weather_code: number; wind_speed_10m: number };
  daily?: { time: string[]; temperature_2m_max: number[]; temperature_2m_min: number[] };
};

type WeatherData = {
  temperature: number;
  weatherCode: number;
  windSpeed: number;
  forecast: Array<{ date: string; high: number; low: number }>;
};

async function measureWeatherStep<T>(label: string, operation: () => Promise<T>): Promise<T> {
  const startedAt = performance.now();
  try {
    return await operation();
  } finally {
    console.info(`[home-performance] ${label}: ${(performance.now() - startedAt).toFixed(1)} ms`);
  }
}

function locationCandidates(location: string) {
  const original = location.trim();
  const withoutSuffix = original.replace(/\s*(특별자치시|특별자치도|특별시|광역시|자치구|시|군|구|도)$/u, "").trim();
  return [...new Set([original, withoutSuffix, KOREAN_LOCATION_ALIASES[withoutSuffix]].filter(Boolean))];
}

async function findCoordinates(location: string) {
  let bestResult: { latitude: number; longitude: number; population?: number } | null = null;
  for (const candidate of locationCandidates(location)) {
    try {
      const params = new URLSearchParams({ name: candidate, count: "5", language: "en", format: "json", countryCode: "KR" });
      const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params}`, { next: { revalidate: REVALIDATE_SECONDS }, signal: AbortSignal.timeout(5000) });
      if (!response.ok) continue;
      const data = await response.json() as GeocodingResponse;
      for (const result of data.results ?? []) {
        if (!Number.isFinite(result.latitude) || !Number.isFinite(result.longitude)) continue;
        if (!bestResult || (result.population ?? 0) > (bestResult.population ?? 0)) bestResult = result;
      }
    } catch {
      continue;
    }
  }
  return bestResult;
}

async function getWeather(location: string): Promise<WeatherData | null> {
  try {
    const coordinates = await measureWeatherStep("weather-geocoding", () => findCoordinates(location));
    if (!coordinates) return null;
    const params = new URLSearchParams({
      latitude: String(coordinates.latitude),
      longitude: String(coordinates.longitude),
      current: "temperature_2m,weather_code,wind_speed_10m",
      daily: "temperature_2m_max,temperature_2m_min",
      timezone: "auto",
      forecast_days: "5",
    });
    const response = await measureWeatherStep("weather-forecast", () => fetch(`https://api.open-meteo.com/v1/forecast?${params}`, { next: { revalidate: REVALIDATE_SECONDS }, signal: AbortSignal.timeout(5000) }));
    if (!response.ok) return null;
    const data = await response.json() as ForecastResponse;
    if (!data.current || !data.daily) return null;
    const forecast = data.daily.time.flatMap((date, index) => {
      const high = data.daily?.temperature_2m_max[index];
      const low = data.daily?.temperature_2m_min[index];
      return typeof high === "number" && Number.isFinite(high) && typeof low === "number" && Number.isFinite(low)
        ? [{ date, high, low }]
        : [];
    });
    if (forecast.length === 0) return null;
    if (![data.current.temperature_2m, data.current.weather_code, data.current.wind_speed_10m].every(Number.isFinite)) return null;
    return {
      temperature: data.current.temperature_2m,
      weatherCode: data.current.weather_code,
      windSpeed: data.current.wind_speed_10m,
      forecast,
    };
  } catch {
    return null;
  }
}

function weatherLabel(code: number) {
  if (code === 0) return "맑음";
  if (code === 1) return "대체로 맑음";
  if (code === 2) return "부분적으로 흐림";
  if (code === 3) return "흐림";
  if ([45, 48].includes(code)) return "안개";
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67].includes(code)) return "비";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "눈";
  if ([80, 81, 82].includes(code)) return "소나기";
  if ([95, 96, 99].includes(code)) return "천둥번개";
  return "날씨 정보";
}

function weekday(date: string) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("ko-KR", { weekday: "short", timeZone: "UTC" });
}

export async function WeatherCard({ location }: { location: string }) {
  const weather = await measureWeatherStep("weather-total", () => getWeather(location));

  if (!weather) {
    return <section className="card card-pad weather-card"><div className="card-header"><h2 className="card-title">오늘의 날씨</h2><span className="card-meta">{location}</span></div><div className="weather-now"><div><span>{location} 날씨 정보를 불러오지 못했습니다.</span></div></div></section>;
  }

  return <section className="card card-pad weather-card"><div className="card-header"><h2 className="card-title">오늘의 날씨</h2><span className="card-meta">{location}</span></div><div className="weather-now"><div><strong>{Math.round(weather.temperature)}°</strong><span>{weatherLabel(weather.weatherCode)} · 바람 {Math.round(weather.windSpeed)}km/h</span></div><div className="weather-visual"><AssetImage src={DASHBOARD_ASSETS.weather} alt={`${location} 날씨 일러스트`} emoji="☁" sizes="110px" /></div></div><div className="forecast-row">{weather.forecast.map((day) => <div key={day.date}><b>{weekday(day.date)}</b><span>{Math.round(day.high)} / {Math.round(day.low)}</span></div>)}</div></section>;
}
