import { AssetImage } from "@/components/common/AssetImage";
import { DASHBOARD_ASSETS } from "@/lib/assets";

const forecast = [{ d: "월", t: "24 / 12" }, { d: "화", t: "23 / 13" }, { d: "수", t: "22 / 12" }, { d: "목", t: "21 / 11" }, { d: "금", t: "23 / 13" }];

export function WeatherCard() {
  return <section className="card card-pad weather-card"><div className="card-header"><h2 className="card-title">오늘의 날씨</h2><span className="card-meta">충주시</span></div><div className="weather-now"><div><strong>13°</strong><span>맑음 · 바람 약함</span></div><div className="weather-visual"><AssetImage src={DASHBOARD_ASSETS.weather} alt="밤하늘 날씨 일러스트" emoji="☁" sizes="110px" /></div></div><div className="forecast-row">{forecast.map((day) => <div key={day.d}><b>{day.d}</b><span>{day.t}</span></div>)}</div></section>;
}
