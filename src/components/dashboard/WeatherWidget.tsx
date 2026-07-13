"use client";

import { useEffect, useState } from "react";
import {
  Sun,
  Cloud,
  CloudSun,
  CloudFog,
  CloudDrizzle,
  CloudRain,
  CloudSnow,
  CloudLightning,
  type LucideIcon,
} from "lucide-react";
import { Skeleton } from "@/components/ui";

/** Open-Meteo weather_code → 아이콘/설명 매핑 */
function weatherInfo(code: number): { icon: LucideIcon; label: string } {
  if (code === 0) return { icon: Sun, label: "맑음" };
  if (code <= 2) return { icon: CloudSun, label: "구름 조금" };
  if (code === 3) return { icon: Cloud, label: "흐림" };
  if (code <= 48) return { icon: CloudFog, label: "안개" };
  if (code <= 57) return { icon: CloudDrizzle, label: "이슬비" };
  if (code <= 67) return { icon: CloudRain, label: "비" };
  if (code <= 77) return { icon: CloudSnow, label: "눈" };
  if (code <= 82) return { icon: CloudRain, label: "소나기" };
  if (code <= 86) return { icon: CloudSnow, label: "눈" };
  return { icon: CloudLightning, label: "뇌우" };
}

interface Weather {
  temp: number;
  code: number;
  tempMax: number;
  tempMin: number;
}

export default function WeatherWidget() {
  const [weather, setWeather] = useState<Weather | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const lat = process.env.NEXT_PUBLIC_WEATHER_LAT ?? "37.5665";
    const lon = process.env.NEXT_PUBLIC_WEATHER_LON ?? "126.9780";
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&forecast_days=1&timezone=auto`;

    fetch(url)
      .then((r) => r.json())
      .then((json) =>
        setWeather({
          temp: Math.round(json.current.temperature_2m),
          code: json.current.weather_code,
          tempMax: Math.round(json.daily.temperature_2m_max[0]),
          tempMin: Math.round(json.daily.temperature_2m_min[0]),
        })
      )
      .catch(() => setFailed(true));
  }, []);

  if (failed) return null;

  if (!weather) {
    return (
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-6 w-16" />
      </div>
    );
  }

  const { icon: Icon, label } = weatherInfo(weather.code);

  return (
    <div className="flex items-center gap-2.5" aria-label={`현재 날씨 ${label}, ${weather.temp}도`}>
      <Icon size={28} className="text-amber-500 dark:text-amber-300" />
      <div className="leading-tight">
        <p className="text-lg font-bold">{weather.temp}°</p>
        <p className="text-xs text-muted">
          {label} · {weather.tempMin}°/{weather.tempMax}°
        </p>
      </div>
    </div>
  );
}
