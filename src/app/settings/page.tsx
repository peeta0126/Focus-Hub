"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Toast } from "@/components/common/Toast";
import { DEFAULT_TIME_ZONE } from "@/lib/date";
import { createClient } from "@/lib/supabase/client";
import "../collection.css";

const defaults = {
  dailyQuote: "오늘의 꾸준함이, 내일의 실력이 된다.",
  weatherLocation: "충주시",
  timezone: DEFAULT_TIME_ZONE,
};

export default function SettingsPage() {
  const [values, setValues] = useState(defaults);
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) { queueMicrotask(() => { setToast("데이터베이스 연결 설정을 확인해주세요."); setLoading(false); }); return; }
    supabase.auth.getUser().then(async ({ data: { user }, error: authError }) => {
      if (authError || !user) { setToast("로그인 정보를 확인하지 못했습니다."); setLoading(false); return; }
      const { data, error } = await supabase.from("settings").select("daily_quote,weather_location,timezone").eq("user_id", user.id).maybeSingle();
      if (error) { console.error("Failed to load settings", error); setToast("설정을 불러오지 못했습니다."); }
      if (data) setValues({ dailyQuote: data.daily_quote, weatherLocation: data.weather_location, timezone: data.timezone });
      setLoading(false);
    });
  }, []);

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const supabase = createClient();
    if (!supabase) { setToast("데이터베이스 연결 설정을 확인해주세요."); return; }
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) { setToast("로그인 정보를 확인하지 못했습니다."); return; }
    const { error } = await supabase.from("settings").upsert({ user_id: user.id, daily_quote: values.dailyQuote, weather_location: values.weatherLocation, timezone: values.timezone }, { onConflict: "user_id" });
    if (error) { console.error("Failed to save settings", error); setToast("설정을 저장하지 못했습니다."); return; }
    setToast("설정을 저장했습니다.");
  };

  return <main className="page-wrap"><div className="page-heading"><div><h1>설정</h1><p>대시보드 문구와 기본 지역을 설정하세요.</p></div></div><form className="card card-pad form-grid" onSubmit={save}><div className="field"><label htmlFor="quote">오늘의 문구</label><input id="quote" className="input" value={values.dailyQuote} onChange={(event) => setValues((current) => ({ ...current, dailyQuote: event.target.value }))} disabled={loading} /></div><div className="field"><label htmlFor="location">날씨 지역</label><input id="location" className="input" value={values.weatherLocation} onChange={(event) => setValues((current) => ({ ...current, weatherLocation: event.target.value }))} disabled={loading} /></div><div className="field"><label htmlFor="timezone">시간대</label><select id="timezone" className="input" value={values.timezone} onChange={(event) => setValues((current) => ({ ...current, timezone: event.target.value }))} disabled={loading}><option value="Asia/Seoul">Asia/Seoul</option></select></div><div className="form-actions"><button className="button primary" disabled={loading}>설정 저장</button></div></form>{toast && <Toast message={toast} onDone={() => setToast("")} />}</main>;
}
