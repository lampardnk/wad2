// Simulated weather for the itinerary.
// No external weather API is used.

export async function fetchWeatherForecast({ dates = [] }) {
  const weather = []

  dates.forEach((date, index) => {

    // =========================
    // DAY 1 — CLEAR
    // =========================
    if (index === 0) {
      weather.push(
        {
          date,
          time: 6,
          span: 3,
          condition: 'Clear',
          temp: 24,
          rain: false,
          simulated: true
        },
        {
          date,
          time: 9,
          span: 3,
          condition: 'Clear',
          temp: 26,
          rain: false,
          simulated: true
        },
        {
          date,
          time: 12,
          span: 3,
          condition: 'Clear',
          temp: 28,
          rain: false,
          simulated: true
        },
        {
          date,
          time: 15,
          span: 3,
          condition: 'Clear',
          temp: 27,
          rain: false,
          simulated: true
        },
        {
          date,
          time: 18,
          span: 3,
          condition: 'Clear',
          temp: 25,
          rain: false,
          simulated: true
        }
      )
    }

    // =========================
    // DAY 2 — AFTERNOON RAIN
    // =========================
    else if (index === 1) {
      weather.push(
        {
          date,
          time: 6,
          span: 3,
          condition: 'Clouds',
          temp: 23,
          rain: false,
          simulated: true
        },
        {
          date,
          time: 9,
          span: 3,
          condition: 'Clouds',
          temp: 25,
          rain: false,
          simulated: true
        },
        {
          date,
          time: 12,
          span: 3,
          condition: 'Clouds',
          temp: 24,
          rain: false,
          simulated: true
        },
        {
          date,
          time: 15,
          span: 3,
          condition: 'Rain',
          temp: 22,
          rain: true,
          simulated: true
        },
        {
          date,
          time: 18,
          span: 3,
          condition: 'Clouds',
          temp: 23,
          rain: false,
          simulated: true
        }
      )
    }

    // =========================
    // DAY 3 — CLOUDY
    // =========================
    else if (index === 2) {
      weather.push(
        {
          date,
          time: 6,
          span: 3,
          condition: 'Clouds',
          temp: 22,
          rain: false,
          simulated: true
        },
        {
          date,
          time: 9,
          span: 3,
          condition: 'Clouds',
          temp: 24,
          rain: false,
          simulated: true
        },
        {
          date,
          time: 12,
          span: 3,
          condition: 'Clouds',
          temp: 25,
          rain: false,
          simulated: true
        },
        {
          date,
          time: 15,
          span: 3,
          condition: 'Clouds',
          temp: 24,
          rain: false,
          simulated: true
        },
        {
          date,
          time: 18,
          span: 3,
          condition: 'Clouds',
          temp: 22,
          rain: false,
          simulated: true
        }
      )
    }

    // =========================
    // DAY 4 — CLEAR
    // =========================
    else if (index === 3) {
      weather.push(
        {
          date,
          time: 6,
          span: 3,
          condition: 'Clear',
          temp: 23,
          rain: false,
          simulated: true
        },
        {
          date,
          time: 9,
          span: 3,
          condition: 'Clear',
          temp: 25,
          rain: false,
          simulated: true
        },
        {
          date,
          time: 12,
          span: 3,
          condition: 'Clear',
          temp: 27,
          rain: false,
          simulated: true
        },
        {
          date,
          time: 15,
          span: 3,
          condition: 'Clear',
          temp: 26,
          rain: false,
          simulated: true
        },
        {
          date,
          time: 18,
          span: 3,
          condition: 'Clear',
          temp: 24,
          rain: false,
          simulated: true
        }
      )
    }

    // =========================
    // DAY 5 — MIDDAY RAIN
    // =========================
    else if (index === 4) {
      weather.push(
        {
          date,
          time: 6,
          span: 3,
          condition: 'Clear',
          temp: 23,
          rain: false,
          simulated: true
        },
        {
          date,
          time: 9,
          span: 3,
          condition: 'Clouds',
          temp: 25,
          rain: false,
          simulated: true
        },
        {
          date,
          time: 12,
          span: 3,
          condition: 'Rain',
          temp: 22,
          rain: true,
          simulated: true
        },
        {
          date,
          time: 15,
          span: 3,
          condition: 'Clouds',
          temp: 23,
          rain: false,
          simulated: true
        },
        {
          date,
          time: 18,
          span: 3,
          condition: 'Clear',
          temp: 22,
          rain: false,
          simulated: true
        }
      )
    }

  })

  return weather
}