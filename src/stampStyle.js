// How each passport stamp looks: shape, ink colour, tilt and little landmark picture.
// Picked from the place's name (always the same for the same place), so stamps look varied but never
// change between visits. Used by PassportStamp.vue.
import { TROPICAL, COLD } from '../shared/avatarCatalog.js'
import { codeForCountry } from './destinations.js'

// Real passports and airports use 3-letter country codes (ISO 3166): NOR is Norway, PRK is North Korea.
// 'AF:AFG AX:ALA ...' -> { AF: 'AFG', ... }
const ISO3 = {}
for (const pair of 'AF:AFG AX:ALA AL:ALB DZ:DZA AS:ASM AD:AND AO:AGO AI:AIA AQ:ATA AG:ATG AR:ARG AM:ARM AW:ABW AU:AUS AT:AUT AZ:AZE BS:BHS BH:BHR BD:BGD BB:BRB BY:BLR BE:BEL BZ:BLZ BJ:BEN BM:BMU BT:BTN BO:BOL BQ:BES BA:BIH BW:BWA BV:BVT BR:BRA IO:IOT BN:BRN BG:BGR BF:BFA BI:BDI CV:CPV KH:KHM CM:CMR CA:CAN KY:CYM CF:CAF TD:TCD CL:CHL CN:CHN CX:CXR CC:CCK CO:COL KM:COM CG:COG CD:COD CK:COK CR:CRI CI:CIV HR:HRV CU:CUB CW:CUW CY:CYP CZ:CZE DK:DNK DJ:DJI DM:DMA DO:DOM EC:ECU EG:EGY SV:SLV GQ:GNQ ER:ERI EE:EST SZ:SWZ ET:ETH FK:FLK FO:FRO FJ:FJI FI:FIN FR:FRA GF:GUF PF:PYF TF:ATF GA:GAB GM:GMB GE:GEO DE:DEU GH:GHA GI:GIB GR:GRC GL:GRL GD:GRD GP:GLP GU:GUM GT:GTM GG:GGY GN:GIN GW:GNB GY:GUY HT:HTI HM:HMD VA:VAT HN:HND HK:HKG HU:HUN IS:ISL IN:IND ID:IDN IR:IRN IQ:IRQ IE:IRL IM:IMN IL:ISR IT:ITA JM:JAM JP:JPN JE:JEY JO:JOR KZ:KAZ KE:KEN KI:KIR KP:PRK KR:KOR KW:KWT KG:KGZ LA:LAO LV:LVA LB:LBN LS:LSO LR:LBR LY:LBY LI:LIE LT:LTU LU:LUX MO:MAC MG:MDG MW:MWI MY:MYS MV:MDV ML:MLI MT:MLT MH:MHL MQ:MTQ MR:MRT MU:MUS YT:MYT MX:MEX FM:FSM MD:MDA MC:MCO MN:MNG ME:MNE MS:MSR MA:MAR MZ:MOZ MM:MMR NA:NAM NR:NRU NP:NPL NL:NLD NC:NCL NZ:NZL NI:NIC NE:NER NG:NGA NU:NIU NF:NFK MK:MKD MP:MNP NO:NOR OM:OMN PK:PAK PW:PLW PS:PSE PA:PAN PG:PNG PY:PRY PE:PER PH:PHL PN:PCN PL:POL PT:PRT PR:PRI QA:QAT RE:REU RO:ROU RU:RUS RW:RWA BL:BLM SH:SHN KN:KNA LC:LCA MF:MAF PM:SPM VC:VCT WS:WSM SM:SMR ST:STP SA:SAU SN:SEN RS:SRB SC:SYC SL:SLE SG:SGP SX:SXM SK:SVK SI:SVN SB:SLB SO:SOM ZA:ZAF GS:SGS SS:SSD ES:ESP LK:LKA SD:SDN SR:SUR SJ:SJM SE:SWE CH:CHE SY:SYR TW:TWN TJ:TJK TZ:TZA TH:THA TL:TLS TG:TGO TK:TKL TO:TON TT:TTO TN:TUN TR:TUR TM:TKM TC:TCA TV:TUV UG:UGA UA:UKR AE:ARE GB:GBR US:USA UM:UMI UY:URY UZ:UZB VU:VUT VE:VEN VN:VNM VG:VGB VI:VIR WF:WLF EH:ESH YE:YEM ZM:ZMB ZW:ZWE XK:XKX'.split(' ')) ISO3[pair.slice(0, 2)] = pair.slice(3)
// Short names people type that the browser's country list spells differently
const ALIAS = { 'north korea': 'KP', 'south korea': 'KR', korea: 'KR', uk: 'GB', usa: 'US', 'czech republic': 'CZ', uae: 'AE', burma: 'MM' }

export const INKS = ['#24407a', '#b5442e', '#2f6b45', '#6b3fa0'] // navy, brick red, forest green, purple
export const SHAPES = ['circle', 'scallop', 'octagon', 'pill']
const EAST_ASIA = ['japan', 'china', 'korea', 'south korea', 'taiwan', 'vietnam', 'thailand', 'laos', 'cambodia', 'myanmar', 'mongolia', 'hong kong', 'macau']
const OLD_WORLD = ['italy', 'greece', 'turkey', 'egypt', 'jordan', 'spain', 'portugal', 'morocco', 'israel', 'oman', 'iran', 'tunisia']
const OTHERS = ['arch', 'dome', 'bridge', 'skyline', 'tower']

// A small, steady number from a string (the same text always gives the same number)
function hash(text) {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function stampStyle(place) {
  const h = hash(place)
  const parts = place.split(',')
  const city = parts[0].trim()
  const country = parts[parts.length - 1].trim().toLowerCase()
  let landmark = OTHERS[(h >>> 7) % OTHERS.length]
  if (TROPICAL.includes(country)) landmark = 'palm'
  else if (COLD.includes(country)) landmark = 'peak'
  else if (EAST_ASIA.includes(country)) landmark = 'pagoda'
  else if (OLD_WORLD.includes(country)) landmark = (h >>> 3) % 2 ? 'arch' : 'dome'
  return {
    city,
    code: codeFor(city),
    shape: SHAPES[h % SHAPES.length],
    ink: INKS[(h >>> 5) % INKS.length],
    tilt: ((h >>> 11) % 81) / 10 - 4, // -4.0 to 4.0 degrees
    landmark
  }
}

// The big code on a stamp. A country on its own gets its official 3-letter code (Norway NOR, North Korea PRK),
// so similar names never share one. A city gets its first letter, its next consonant and its last consonant
// (Bangkok BNK, Chongqing CNG, Chengdu CND, Norwich NRC; short names: Fez FEZ, Cairo CAR), which clash much less than "first three letters".
function codeFor(name) {
  const two = ALIAS[name.toLowerCase()] || codeForCountry(name)
  if (two && ISO3[two]) return ISO3[two]
  const letters = name.normalize('NFD').replace(/[^A-Za-z]/g, '').toUpperCase()
  if (!letters) return 'TRP'
  const consonant = (ch) => !'AEIOUH'.includes(ch) // (H is skipped: "Ch", "Sh", "Th" read as one sound)
  let second = -1
  for (let i = 1; i < letters.length; i++) if (consonant(letters[i])) { second = i; break }
  let last = -1
  for (let i = letters.length - 1; i > second; i--) if (consonant(letters[i]) && letters[i] !== letters[second]) { last = i; break }
  // the chosen letters, kept in their order in the name; short names (Fez, Cairo) fill up with the next letters
  const picked = [0]
  if (second > 0) picked.push(second)
  if (last > 0) picked.push(last)
  for (let i = 1; i < letters.length && picked.length < 3; i++) if (!picked.includes(i)) picked.push(i)
  picked.sort((a, b) => a - b)
  let code = ''
  for (const i of picked) code += letters[i]
  return code.padEnd(3, 'X')
}
