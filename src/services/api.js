// Replace these with your actual API keys or backend endpoints
const WEATHER_API_KEY = 'YOUR_OPENWEATHER_API_KEY'
const FLIGHT_API_KEY = 'YOUR_FLIGHT_API_KEY'

export async function fetchWeather(city = 'Seoul') {
  // Real or simulated OpenWeatherMap call
  const url = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&units=metric&appid=${WEATHER_API_KEY}`
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error('Weather fetch failed')
    return await res.json()
  } catch (err) {
    // Fallback mock for demonstration/testing
    return {
      forecast: [
        { time: '14:00', condition: 'Rain', temp: 18, outdoorAffected: true }
      ]
    }
  }
}

export async function checkFlightStatus(flightNumber = 'KE621') {
  // Simulated Flight Status API (AeroDataBox / FlightAware style)
  // Returns delay in minutes and impacted arrival time
  return {
    flight: flightNumber,
    status: 'Delayed',
    delayMinutes: 90,
    originalArrival: '13:00',
    newArrival: '14:30'
  }
}

export async function getDistanceMatrix(origins, destinations) {
  // Google Maps Distance Matrix API wrapper
  // Recalculates transit times dynamically based on traffic/delays
  return {
    durationText: '45 mins',
    durationValue: 2700 // seconds
  }
}