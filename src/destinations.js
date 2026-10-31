import DISCOVER from './data/discoverCities.json'
// Popular destinations: shown instantly while the online search loads,
// and used on their own if the online search is unavailable.
export const POPULAR_DESTINATIONS = [
  'Seoul, South Korea', 'Busan, South Korea', 'Jeju, South Korea',
  'Tokyo, Japan', 'Kyoto, Japan', 'Osaka, Japan', 'Sapporo, Japan', 'Fukuoka, Japan',
  'Taipei, Taiwan', 'Hong Kong', 'Macau', 'Shanghai, China', 'Beijing, China',
  'Bangkok, Thailand', 'Chiang Mai, Thailand', 'Phuket, Thailand',
  'Bali, Indonesia', 'Jakarta, Indonesia', 'Kuala Lumpur, Malaysia', 'Penang, Malaysia',
  'Singapore', 'Hanoi, Vietnam', 'Ho Chi Minh City, Vietnam', 'Da Nang, Vietnam',
  'Manila, Philippines', 'Cebu, Philippines', 'Siem Reap, Cambodia',
  'Colombo, Sri Lanka', 'Kandy, Sri Lanka', 'Malé, Maldives', 'Kathmandu, Nepal',
  'Delhi, India', 'Mumbai, India', 'Jaipur, India',
  'Dubai, United Arab Emirates', 'Abu Dhabi, United Arab Emirates', 'Muscat, Oman',
  'Amman, Jordan', 'Petra, Jordan', 'Istanbul, Turkey', 'Cappadocia, Turkey',
  'Cairo, Egypt', 'Giza, Egypt', 'Marrakech, Morocco', 'Cape Town, South Africa',
  'London, United Kingdom', 'Edinburgh, United Kingdom', 'Paris, France', 'Nice, France',
  'Rome, Italy', 'Florence, Italy', 'Venice, Italy', 'Milan, Italy',
  'Barcelona, Spain', 'Madrid, Spain', 'Lisbon, Portugal', 'Porto, Portugal',
  'Amsterdam, Netherlands', 'Berlin, Germany', 'Munich, Germany', 'Prague, Czechia',
  'Vienna, Austria', 'Zurich, Switzerland', 'Interlaken, Switzerland', 'Budapest, Hungary',
  'Athens, Greece', 'Santorini, Greece', 'Reykjavik, Iceland', 'Copenhagen, Denmark',
  'Stockholm, Sweden', 'Oslo, Norway', 'Helsinki, Finland', 'Dublin, Ireland',
  'New York, United States', 'Los Angeles, United States', 'San Francisco, United States',
  'Las Vegas, United States', 'Honolulu, United States', 'Toronto, Canada', 'Vancouver, Canada',
  'Mexico City, Mexico', 'Cancún, Mexico', 'Lima, Peru', 'Cusco, Peru', 'Rio de Janeiro, Brazil',
  'Buenos Aires, Argentina', 'Sydney, Australia', 'Melbourne, Australia', 'Perth, Australia',
  'Auckland, New Zealand', 'Queenstown, New Zealand'
]

// Two-letter country codes, used to show flags
export const COUNTRY_CODES = {
  'South Korea': 'KR', 'Japan': 'JP', 'Taiwan': 'TW', 'Hong Kong': 'HK', 'Macau': 'MO', 'China': 'CN',
  'Thailand': 'TH', 'Indonesia': 'ID', 'Malaysia': 'MY', 'Singapore': 'SG', 'Vietnam': 'VN',
  'Philippines': 'PH', 'Cambodia': 'KH', 'Sri Lanka': 'LK', 'Maldives': 'MV', 'Nepal': 'NP', 'India': 'IN',
  'United Arab Emirates': 'AE', 'Oman': 'OM', 'Jordan': 'JO', 'Turkey': 'TR', 'Egypt': 'EG',
  'Morocco': 'MA', 'South Africa': 'ZA', 'United Kingdom': 'GB', 'France': 'FR', 'Italy': 'IT',
  'Spain': 'ES', 'Portugal': 'PT', 'Netherlands': 'NL', 'Germany': 'DE', 'Czechia': 'CZ',
  'Austria': 'AT', 'Switzerland': 'CH', 'Hungary': 'HU', 'Greece': 'GR', 'Iceland': 'IS',
  'Denmark': 'DK', 'Sweden': 'SE', 'Norway': 'NO', 'Finland': 'FI', 'Ireland': 'IE',
  'United States': 'US', 'Canada': 'CA', 'Mexico': 'MX', 'Peru': 'PE', 'Brazil': 'BR',
  'Argentina': 'AR', 'Australia': 'AU', 'New Zealand': 'NZ',
  // Middle East and Eastern Europe (Discover)
  'Saudi Arabia': 'SA', 'Qatar': 'QA', 'Bahrain': 'BH', 'Kuwait': 'KW', 'Israel': 'IL', 'Lebanon': 'LB', 'Iran': 'IR', 'Poland': 'PL', 'Croatia': 'HR', 'Slovenia': 'SI', 'Slovakia': 'SK', 'Romania': 'RO', 'Bulgaria': 'BG', 'Serbia': 'RS', 'Bosnia and Herzegovina': 'BA', 'Montenegro': 'ME', 'Albania': 'AL', 'North Macedonia': 'MK', 'Estonia': 'EE', 'Latvia': 'LV', 'Lithuania': 'LT', 'Georgia': 'GE', 'Armenia': 'AM', 'Azerbaijan': 'AZ', 'Moldova': 'MD'
}

// Any country's two-letter code, for flags: our list first, then the map's short names,
// then every country name the browser knows ("Russia" -> "RU", "Côte d'Ivoire" -> "CI")
const MAP_NAMES = {
  'United States of America': 'US', 'Dem. Rep. Congo': 'CD', 'Congo': 'CG', 'Central African Rep.': 'CF',
  'S. Sudan': 'SS', 'Bosnia and Herz.': 'BA', 'Dominican Rep.': 'DO', 'Eq. Guinea': 'GQ', 'eSwatini': 'SZ',
  'W. Sahara': 'EH', 'Fr. S. Antarctic Lands': 'TF', 'Falkland Is.': 'FK', 'Solomon Is.': 'SB', 'N. Cyprus': 'CY',
  'Somaliland': 'SO', 'Kosovo': 'XK', 'Macedonia': 'MK', 'Antigua and Barb.': 'AG', 'St. Kitts and Nevis': 'KN',
  'St. Vin. and Gren.': 'VC', 'São Tomé and Principe': 'ST', 'Marshall Is.': 'MH', 'Fr. Polynesia': 'PF',
  'N. Mariana Is.': 'MP', 'Cayman Is.': 'KY', 'Turks and Caicos Is.': 'TC', 'British Virgin Is.': 'VG',
  'U.S. Virgin Is.': 'VI', 'Faeroe Is.': 'FO', 'Heard I. and McDonald Is.': 'HM', 'S. Geo. and the Is.': 'GS',
  'Br. Indian Ocean Ter.': 'IO', 'Wallis and Futuna Is.': 'WF', 'St. Pierre and Miquelon': 'PM', 'Pitcairn Is.': 'PN',
  'Cook Is.': 'CK', 'Ashmore and Cartier Is.': 'AU', 'Indian Ocean Ter.': 'AU', 'Siachen Glacier': 'IN',
  'St-Martin': 'MF', 'St-Barthélemy': 'BL', 'Vatican': 'VA', 'Turkey': 'TR', 'Palestine': 'PS', 'Macao': 'MO'
}
// "Côte d’Ivoire" / "Bosnia & Herzegovina" / "Myanmar (Burma)" -> one simple spelling to compare
function simple(name) {
  return name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\(.*\)/g, '')
    .replace(/ sar china/, '').replace(/&/g, 'and').replace(/[^a-z]/g, '')
}
// Codes that aren't today's countries (the Soviet Union, East Timor's old code, the EU...)
const OLD_CODES = ['SU', 'TP', 'BU', 'DD', 'YU', 'ZR', 'CS', 'FX', 'NT', 'AN', 'UK', 'EU', 'EZ', 'UN', 'QO', 'XA', 'XB', 'ZZ', 'DY', 'HV', 'NH', 'RH', 'VD', 'YD', 'CT', 'JT', 'MI', 'NQ', 'PC', 'PU', 'PZ', 'WK', 'FQ']
let known = null
export function codeForCountry(name) {
  if (!name) return ''
  if (COUNTRY_CODES[name]) return COUNTRY_CODES[name]
  if (MAP_NAMES[name]) return MAP_NAMES[name]
  if (!known) {
    known = {}
    try {
      const names = new Intl.DisplayNames(['en'], { type: 'region' })
      for (let a = 65; a <= 90; a++) {
        for (let b = 65; b <= 90; b++) {
          const code = String.fromCharCode(a, b)
          let label = null
          try {
            label = names.of(code)
          } catch (err) {
            label = null
          }
          if (label && label !== code && !OLD_CODES.includes(code) && !known[simple(label)]) known[simple(label)] = code
        }
      }
    } catch (err) {
      // an old browser: only our own list
    }
  }
  return known[simple(name)] || ''
}

// Everyday names the browser's country list doesn't use ("UK", "Czech Republic", "Burma"...)
const ALIASES = {
  usa: 'US', us: 'US', unitedstatesofamerica: 'US', america: 'US', uk: 'GB', england: 'GB', scotland: 'GB', wales: 'GB',
  northernireland: 'GB', greatbritain: 'GB', britain: 'GB', czechrepublic: 'CZ', holland: 'NL', uae: 'AE',
  burma: 'MM', ivorycoast: 'CI', swaziland: 'SZ', macedonia: 'MK', turkiye: 'TR', northkorea: 'KP', southkorea: 'KR',
  korea: 'KR', russianfederation: 'RU', vatican: 'VA', vaticancity: 'VA', capeverde: 'CV', easttimor: 'TL',
  drc: 'CD', congokinshasa: 'CD', congobrazzaville: 'CG', laos: 'LA', bali: 'ID', tibet: 'CN'
}
// Capitals and big cities people often type on their own (Discover's 224 cities are added to these)
const CITY_CODES = {
  bishkek: 'KG', almaty: 'KZ', astana: 'KZ', tashkent: 'UZ', samarkand: 'UZ', bukhara: 'UZ', dushanbe: 'TJ', ashgabat: 'TM',
  ulaanbaatar: 'MN', pyongyang: 'KP', moscow: 'RU', stpetersburg: 'RU', saintpetersburg: 'RU', tbilisi: 'GE', yerevan: 'AM',
  baku: 'AZ', kyiv: 'UA', kiev: 'UA', minsk: 'BY', warsaw: 'PL', krakow: 'PL', prague: 'CZ', budapest: 'HU', vienna: 'AT',
  bratislava: 'SK', bucharest: 'RO', sofia: 'BG', belgrade: 'RS', zagreb: 'HR', ljubljana: 'SI', sarajevo: 'BA', tirana: 'AL',
  skopje: 'MK', athens: 'GR', istanbul: 'TR', ankara: 'TR', fez: 'MA', fes: 'MA', marrakech: 'MA', casablanca: 'MA', rabat: 'MA',
  tunis: 'TN', algiers: 'DZ', cairo: 'EG', giza: 'EG', luxor: 'EG', amman: 'JO', petra: 'JO', beirut: 'LB', muscat: 'OM',
  doha: 'QA', dubai: 'AE', abudhabi: 'AE', riyadh: 'SA', tehran: 'IR', kabul: 'AF', islamabad: 'PK', lahore: 'PK', dhaka: 'BD',
  thimphu: 'BT', kathmandu: 'NP', yangon: 'MM', vientiane: 'LA', phnompenh: 'KH', nairobi: 'KE', addisababa: 'ET', lagos: 'NG',
  accra: 'GH', capetown: 'ZA', johannesburg: 'ZA', reykjavik: 'IS', oslo: 'NO', stockholm: 'SE', helsinki: 'FI', copenhagen: 'DK',
  tallinn: 'EE', riga: 'LV', vilnius: 'LT', dublin: 'IE', lisbon: 'PT', madrid: 'ES', barcelona: 'ES', paris: 'FR', rome: 'IT',
  berlin: 'DE', amsterdam: 'NL', brussels: 'BE', zurich: 'CH', geneva: 'CH', london: 'GB', edinburgh: 'GB', newyork: 'US',
  losangeles: 'US', sanfrancisco: 'US', toronto: 'CA', vancouver: 'CA', mexicocity: 'MX', havana: 'CU', lima: 'PE', cusco: 'PE',
  bogota: 'CO', buenosaires: 'AR', santiago: 'CL', riodejaneiro: 'BR', saopaulo: 'BR', sydney: 'AU', melbourne: 'AU',
  auckland: 'NZ', chongqing: 'CN', chengdu: 'CN', beijing: 'CN', shanghai: 'CN', xian: 'CN'
}
// "Bishkek" on its own -> KG
let cityCountry = null
function codeOfCity(name) {
  if (!cityCountry) {
    cityCountry = {}
    for (const c of DISCOVER.cities) cityCountry[simple(c.cityName)] = COUNTRY_CODES[c.country] || codeForCountry(c.country)
  }
  return CITY_CODES[simple(name)] || cityCountry[simple(name)] || ''
}

// "Kyoto, Japan" -> "JP". The country is the last part; failing that, any part that is a country
// ("North Korea", "Russia"), then a city we know ("Bishkek" -> Kyrgyzstan). '' if we can't tell.
export function codeForDestination(label) {
  if (!label) return ''
  const parts = label.split(',').map((p) => p.trim()).filter(Boolean)
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i]
    const code = COUNTRY_CODES[p] || ALIASES[simple(p)] || codeForCountry(p)
    if (code) return code
  }
  for (const p of parts) {
    const code = codeOfCity(p)
    if (code) return code
  }
  return ''
}

// "JP" -> 🇯🇵 (a flag emoji is two special "regional indicator" letters)
export function flagEmoji(code) {
  if (!code || code.length !== 2) return '📍'
  const A = 0x1F1E6
  return String.fromCodePoint(A + code.charCodeAt(0) - 65, A + code.charCodeAt(1) - 65)
}
