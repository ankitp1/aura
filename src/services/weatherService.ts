
export interface WeatherData {
  time: string[];
  temperature: number[];
  weatherCode: number[];
}

export async function fetchWeather(lat: number, lon: number): Promise<WeatherData | null> {
  try {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,weathercode&forecast_days=1`
    );
    if (!response.ok) throw new Error('Weather fetch failed');
    
    const data = await response.json();
    const now = new Date();
    const currentHour = now.getHours();
    
    // Get next 6 hours
    return {
      time: data.hourly.time.slice(currentHour, currentHour + 6),
      temperature: data.hourly.temperature_2m.slice(currentHour, currentHour + 6),
      weatherCode: data.hourly.weathercode.slice(currentHour, currentHour + 6)
    };
  } catch (error) {
    console.error("Weather Service Error:", error);
    return null;
  }
}

export function getWeatherIcon(code: number) {
  // WMO Weather interpretation codes (WW)
  if (code === 0) return '☀️'; // Clear
  if (code <= 3) return '🌤️'; // Partly cloudy
  if (code <= 48) return '🌫️'; // Fog
  if (code <= 67) return '🌧️'; // Rain
  if (code <= 77) return '❄️'; // Snow
  if (code <= 82) return '🌦️'; // Showers
  if (code <= 99) return '⛈️'; // Thunderstorm
  return '☁️';
}
