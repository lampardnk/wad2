// Where a trip city is ({ lat, lon }), so place search can look around it. Asked once per city.
// The city name comes from the trip's city picker, not from free typing.
import axios from 'axios'

const asked = {}

export function cityCentre(city) {
  if (!city) return Promise.resolve(null)
  if (!asked[city]) {
    asked[city] = axios.get('/api/safety/locate', { params: { place: city }, background: true, keep: true })
      .then((res) => ({ lat: res.data.lat, lon: res.data.lon }))
      .catch(() => {
        delete asked[city] // try again next time
        return null
      })
  }
  return asked[city]
}
