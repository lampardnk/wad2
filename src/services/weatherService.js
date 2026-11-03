// Weather for a destination. The API key lives on the server (/api/weather),
// never in the browser. axios is used so the login token is sent too.
import axios from 'axios'

const RAIN = ['Rain', 'Drizzle', 'Thunderstorm']

// Give either { q: 'Kyoto, Japan' } or { lat, lon }.
// Returns [{ date, time, span, condition, temp, rain }] for every forecast day (about 5 days ahead),
// in the destination's local time. Each OpenWeatherMap entry covers a 3-hour block (span: 3).
// Throws if the request fails.
export async function fetchWeatherForecast({ q, lat, lon }) {
  const params = q ? { q } : { lat, lon }
  const { data } = await axios.get('/api/weather', { params })
  const offsetSec = data.city.timezone // Seoul = +32400
  return data.list.map((item) => {
    const local = new Date((item.dt + offsetSec) * 1000) // read with getUTC* = destination time
    const condition = item.weather[0].main
    return {
      date: local.toISOString().slice(0, 10),
      time: local.getUTCHours(),
      span: 3,
      condition,
      temp: item.main ? Math.round(item.main.temp) : null, // °C
      rain: RAIN.includes(condition) || item.pop >= 0.6
    }
  })
}
