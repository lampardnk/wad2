// Builds the Travel Twin out of simple rounded shapes (spheres, capsules, rings): a soft "clay toy" look,
// big head, small body. buildAvatar(THREE, look, extras) -> { root, parts } where parts are the bits that move
// (body, head, arms, legs, eyes, thumbs) for the idle animation and the tap moves.
// extras.countries = how many countries they've been to (one souvenir pin each).
// Shapes are shared between builds (a cache), so changing one item doesn't re-make every shape.
//
// Sizes are in metres-ish: feet at y = 0, top of the head at about y = 2.15, facing +z (the camera).
import { CATALOG, itemOf } from '../shared/avatarCatalog.js'

const HEAD_Y = 1.8
const HEAD_R = 0.32
const TORSO_Y = 1.115
const TORSO_R = 0.25
const DEPTH = 0.78 // the torso is a bit flatter front to back
const FRONT = TORSO_R * DEPTH // the chest's front surface (z)

const GEO = new Map() // shared shapes: 'capsule:0.1:0.5' -> geometry
function shared(key, make) {
  if (!GEO.has(key)) {
    const g = make()
    g.userData.shared = true // the stage never disposes these
    GEO.set(key, g)
  }
  return GEO.get(key)
}

export function buildAvatar(THREE, look, extras = {}) {
  const meshes = [] // for shadows

  // ----- materials -----
  function mat(color, opts = {}) {
    return new THREE.MeshStandardMaterial({ color, roughness: opts.rough ?? 0.75, metalness: opts.metal ?? 0, map: opts.map || null, transparent: !!opts.opacity, opacity: opts.opacity ?? 1 })
  }
  function shade(hex, amount) {
    const c = new THREE.Color(hex)
    c.offsetHSL(0, 0, amount)
    return c
  }
  // Put a mesh in a group at (x, y, z)
  function add(group, geo, material, x = 0, y = 0, z = 0) {
    const m = new THREE.Mesh(geo, material)
    m.position.set(x, y, z)
    m.castShadow = true
    meshes.push(m)
    group.add(m)
    return m
  }
  const capsule = (r, len) => shared('c' + r + ':' + len, () => new THREE.CapsuleGeometry(r, len, 6, 18))
  const sphere = (r) => shared('s' + r, () => new THREE.SphereGeometry(r, 28, 20))
  const box = (w, h, d) => shared('b' + w + ':' + h + ':' + d, () => new THREE.BoxGeometry(w, h, d))
  const cyl = (rt, rb, h, seg = 20) => shared('y' + rt + ':' + rb + ':' + h + ':' + seg, () => new THREE.CylinderGeometry(rt, rb, h, seg))

  const skin = itemOf('skin', look.skin).color
  const hairColor = itemOf('hairColor', look.hairColor).color
  const topColor = itemOf('topColor', look.topColor).color
  const outer = itemOf('outerwear', look.outerwear)
  const bottom = itemOf('bottom', look.bottom)
  const shoes = itemOf('shoes', look.shoes)
  const bag = itemOf('bag', look.bag)
  const gear = look.gear || []

  const skinMat = mat(skin, { rough: 0.55 })
  const hairMat = mat(hairColor, { rough: 0.6 })
  const pantsMat = mat(bottom.color, { rough: 0.9 })
  let topMat = mat(topColor, { rough: 0.85 })
  if (look.top === 'stripes') topMat = mat('#ffffff', { rough: 0.85, map: stripes(THREE, topColor) })
  const hasOuter = outer.id !== 'none'
  const outerMat = hasOuter ? mat(outer.color, { rough: outer.id === 'puffer' ? 0.45 : 0.85 }) : null
  const sleeveMat = hasOuter ? outerMat : topMat
  const longSleeves = hasOuter || look.top === 'hoodie' || look.top === 'linen'

  const root = new THREE.Group()
  const body = new THREE.Group() // bobs up and down
  root.add(body)

  // ===== Legs, trousers, shoes =====
  // Each leg turns at the hip (for the stomp); legIn keeps the shapes where they were drawn
  const legs = []
  for (const side of [-1, 1]) {
    const x = side * 0.12
    const leg = new THREE.Group()
    leg.position.set(x, 0.8, 0)
    body.add(leg)
    legs.push(leg)
    const legIn = new THREE.Group()
    legIn.position.set(-x, -0.8, 0)
    leg.add(legIn)
    add(legIn, capsule(0.1, 0.5), skinMat, x, 0.43, 0)
    // Trousers: a tube from the hip down (shorts stop above the knee)
    const len = bottom.id === 'shorts' ? 0.26 : 0.64
    add(legIn, cyl(0.128, 0.118, len), pantsMat, x, 0.8 - len / 2, 0)
    if (bottom.id === 'cargo') add(legIn, box(0.05, 0.14, 0.12), mat(shade(bottom.color, -0.06), { rough: 0.9 }), x + side * 0.13, 0.47, 0)
    if (bottom.id === 'jeans') add(legIn, cyl(0.122, 0.122, 0.03), mat(shade(bottom.color, 0.08), { rough: 0.9 }), x, 0.17, 0) // turned-up hem

    // Shoes
    const shoeMat = mat(shoes.color, { rough: 0.6 })
    const soleMat = mat(shoes.id === 'sneakers' ? '#c9c2b2' : '#2a1d14', { rough: 0.9 })
    if (shoes.id === 'boots') {
      add(legIn, cyl(0.115, 0.125, 0.2), shoeMat, x, 0.14, 0)
      add(legIn, sphere(0.125), shoeMat, x, 0.08, 0.07).scale.set(1, 0.62, 1.35)
      add(legIn, box(0.22, 0.035, 0.36), soleMat, x, 0.018, 0.04)
      add(legIn, box(0.1, 0.012, 0.02), mat('#edae49'), x, 0.17, 0.115)
      add(legIn, box(0.1, 0.012, 0.02), mat('#edae49'), x, 0.12, 0.13)
    } else {
      add(legIn, sphere(0.115), shoeMat, x, 0.075, 0.05).scale.set(1, 0.62, 1.55)
      add(legIn, box(0.2, 0.03, 0.34), soleMat, x, 0.016, 0.05)
      if (shoes.id === 'sneakers') add(legIn, box(0.06, 0.012, 0.1), mat('#00798c'), x + side * 0.1, 0.07, 0.04)
    }
  }
  // Hips join the legs
  add(body, sphere(0.25), pantsMat, 0, 0.8, 0).scale.set(1, 0.5, DEPTH)

  // ===== Torso =====
  const chest = new THREE.Group() // breathes (scales a little)
  chest.position.y = TORSO_Y
  body.add(chest)
  add(chest, capsule(TORSO_R, 0.32), topMat, 0, 0, 0).scale.set(1, 1, DEPTH)

  if (look.top === 'linen' && !hasOuter) {
    for (let i = 0; i < 4; i++) add(chest, sphere(0.014), mat('#f7f3ea', { rough: 0.3 }), 0, 0.2 - i * 0.12, FRONT + 0.004)
  }
  if (look.top === 'linen') {
    // Collar: two little flaps either side of the neck
    for (const side of [-1, 1]) {
      const flap = add(chest, box(0.1, 0.03, 0.08), topMat, side * 0.07, 0.33, 0.1)
      flap.rotation.set(-0.5, 0, side * -0.5)
    }
  }
  if (look.top === 'hoodie') {
    const hood = add(chest, new THREE.TorusGeometry(0.17, 0.065, 12, 28), topMat, 0, 0.33, -0.06)
    hood.rotation.x = Math.PI / 2 + 0.35
    if (!hasOuter) {
      add(chest, box(0.24, 0.12, 0.03), mat(shade(topColor, -0.05), { rough: 0.9 }), 0, -0.2, FRONT - 0.005)
      for (const side of [-1, 1]) add(chest, cyl(0.007, 0.007, 0.16, 6), mat('#f7f3ea'), side * 0.05, 0.18, FRONT + 0.012)
    }
  }

  // ===== Outerwear =====
  if (hasOuter) {
    add(chest, capsule(TORSO_R + 0.025, 0.3), outerMat, 0, -0.01, 0).scale.set(1, 1, DEPTH)
    const front = FRONT + 0.02
    if (outer.id === 'denim' || outer.id === 'explorer') {
      // Open at the front: a strip of the top shows through
      add(chest, box(0.11, 0.52, 0.02), topMat, 0, 0.02, front)
      const collar = add(chest, new THREE.TorusGeometry(0.13, 0.035, 10, 24), outerMat, 0, 0.33, 0)
      collar.rotation.x = Math.PI / 2 - 0.2
    }
    if (outer.id === 'denim') {
      for (const side of [-1, 1]) add(chest, box(0.08, 0.06, 0.02), mat(shade(outer.color, -0.07)), side * 0.13, 0.12, front - 0.01)
    }
    if (outer.id === 'explorer') {
      const pocketMat = mat(shade(outer.color, -0.06), { rough: 0.9 })
      for (const side of [-1, 1]) {
        add(chest, box(0.1, 0.1, 0.03), pocketMat, side * 0.14, 0.1, front - 0.012)
        add(chest, box(0.11, 0.11, 0.03), pocketMat, side * 0.14, -0.2, front - 0.02)
      }
      add(chest, cyl(TORSO_R + 0.03, TORSO_R + 0.03, 0.04, 28), mat('#3b2a1a'), 0, -0.3, 0).scale.set(1, 1, DEPTH)
    }
    if (outer.id === 'puffer') {
      // Puffy rings round the body + a zip
      for (let i = 0; i < 4; i++) {
        const ring = add(chest, new THREE.TorusGeometry(TORSO_R + 0.02, 0.035, 10, 32), outerMat, 0, 0.24 - i * 0.16, 0)
        ring.rotation.x = Math.PI / 2
        ring.scale.set(1, DEPTH, 1)
      }
      add(chest, box(0.012, 0.56, 0.01), mat('#2b2b2b', { metal: 0.4, rough: 0.4 }), 0, 0, front + 0.012)
      const collar = add(chest, cyl(0.14, 0.16, 0.1), outerMat, 0, 0.36, 0)
      collar.scale.set(1, 1, 0.9)
    }
  }

  // ===== Arms =====
  const arms = []
  const thumbs = []
  for (const side of [-1, 1]) {
    const arm = new THREE.Group() // turns at the shoulder
    arm.position.set(side * 0.33, 1.36, 0)
    arm.rotation.z = side * 0.14
    body.add(arm)
    add(arm, sphere(0.095), sleeveMat, 0, -0.02, 0)
    add(arm, capsule(0.085, 0.2), sleeveMat, 0, -0.17, 0)
    add(arm, capsule(0.07, 0.26), longSleeves ? sleeveMat : skinMat, 0, -0.42, 0)
    add(arm, sphere(0.075), skinMat, 0, -0.62, 0.01)
    // A thumb, only shown for the thumbs-up
    const thumb = add(arm, capsule(0.028, 0.06), skinMat, 0, -0.6, 0.09)
    thumb.rotation.x = Math.PI / 2
    thumb.visible = false
    thumbs.push(thumb)
    arms.push(arm)
  }

  // ===== Neck + head =====
  add(body, cyl(0.085, 0.095, 0.16), skinMat, 0, 1.46, 0)
  const head = new THREE.Group()
  head.position.y = HEAD_Y
  body.add(head)
  add(head, sphere(HEAD_R), skinMat, 0, 0, 0).scale.set(1, 1, 0.95)
  for (const side of [-1, 1]) add(head, sphere(0.06), skinMat, side * 0.31, -0.02, 0).scale.set(0.6, 1, 0.9)
  add(head, sphere(0.035), mat(shade(skin, -0.03), { rough: 0.55 }), 0, -0.03, 0.31)

  // Eyes (they blink: scale y), shine, brows, smile, cheeks
  const eyes = []
  for (const side of [-1, 1]) {
    const eye = add(head, sphere(0.043), mat('#1b1b22', { rough: 0.25 }), side * 0.11, 0.02, 0.27)
    eye.scale.set(1, 1.15, 0.5)
    eyes.push(eye)
    add(head, sphere(0.012), mat('#ffffff', { rough: 0.1 }), side * 0.11 + 0.015, 0.045, 0.29)
    const brow = add(head, box(0.08, 0.018, 0.02), hairMat, side * 0.11, 0.11, 0.285)
    brow.rotation.z = side * -0.12
    add(head, sphere(0.045), mat('#e8897b', { opacity: 0.45, rough: 0.9 }), side * 0.18, -0.08, 0.25).scale.set(1, 0.7, 0.4)
  }
  // Facial hair (under the smile, so the smile still shows on top)
  if (look.face === 'beard' || look.face === 'stubble') {
    const beardMat = look.face === 'beard' ? hairMat : mat(hairColor, { rough: 0.9, opacity: 0.35 })
    const beard = add(head, new THREE.SphereGeometry(HEAD_R * 1.02, 32, 16, 0, Math.PI * 2, Math.PI * 0.55, Math.PI * 0.45), beardMat, 0, 0, 0.01)
    beard.scale.set(1, look.face === 'beard' ? 1.12 : 1, 0.98)
    if (look.face === 'beard') add(head, sphere(0.06), hairMat, 0, -0.06, 0.29).scale.set(1.9, 0.55, 0.7) // moustache
  }
  const smile = add(head, new THREE.TorusGeometry(0.055, 0.012, 8, 20, Math.PI), mat(look.face === 'beard' ? '#f2d6c2' : '#7a3b33', { rough: 0.5 }), 0, -0.1, look.face === 'beard' ? 0.33 : 0.3)
  smile.rotation.z = Math.PI

  addHair(head)
  addHat(head)

  // ===== Bag =====
  if (bag.id !== 'none') {
    const bagMat = mat(bag.color, { rough: 0.8 })
    const strapMat = mat(shade(bag.color, -0.12), { rough: 0.85 })
    const big = bag.id === 'expedition'
    const pack = add(body, capsule(big ? 0.22 : 0.19, big ? 0.38 : 0.22), bagMat, 0, big ? 1.12 : 1.1, -(TORSO_R * DEPTH + (big ? 0.15 : 0.11)))
    pack.scale.set(1, 1, 0.55)
    add(body, box(big ? 0.26 : 0.22, 0.12, 0.04), strapMat, 0, big ? 0.95 : 0.98, -(TORSO_R * DEPTH + (big ? 0.27 : 0.22)))
    // Straps over the shoulders
    for (const side of [-1, 1]) {
      const strap = add(body, box(0.045, 0.5, 0.025), strapMat, side * 0.13, 1.12, FRONT + (hasOuter ? 0.035 : 0.012))
      strap.rotation.x = -0.05
      const top = add(body, new THREE.TorusGeometry(0.11, 0.02, 6, 16, Math.PI), strapMat, side * 0.13, 1.36, -0.02)
      top.rotation.y = Math.PI / 2
    }
    if (big) {
      // Rolled-up sleeping mat on top, a water bottle on the side
      const roll = add(body, cyl(0.08, 0.08, 0.5), mat('#edae49', { rough: 0.8 }), 0, 1.52, -0.32)
      roll.rotation.z = Math.PI / 2
      add(body, cyl(0.045, 0.045, 0.2), mat('#c9cdd3', { metal: 0.6, rough: 0.3 }), 0.23, 1.0, -0.3)
    }
  }

  // ===== Accessories =====
  const chestFront = FRONT + (hasOuter ? 0.035 : 0.01)
  if (gear.includes('sunglasses')) {
    const lens = mat('#14161a', { metal: 0.6, rough: 0.15 })
    for (const side of [-1, 1]) {
      const l = add(head, cyl(0.068, 0.068, 0.018, 24), lens, side * 0.115, 0.03, 0.315)
      l.rotation.x = Math.PI / 2
      l.scale.set(1, 1, 0.85)
      const arm = add(head, box(0.012, 0.012, 0.26), lens, side * 0.185, 0.05, 0.18)
      arm.rotation.y = side * -0.25
    }
    add(head, box(0.07, 0.014, 0.014), lens, 0, 0.05, 0.33)
  }
  if (gear.includes('specs')) {
    const frame = mat('#2a2433', { rough: 0.4, metal: 0.3 })
    for (const side of [-1, 1]) add(head, new THREE.TorusGeometry(0.06, 0.009, 8, 28), frame, side * 0.11, 0.02, 0.305)
    add(head, box(0.05, 0.01, 0.01), frame, 0, 0.03, 0.315)
    for (const side of [-1, 1]) {
      const arm = add(head, box(0.01, 0.01, 0.26), frame, side * 0.18, 0.04, 0.17)
      arm.rotation.y = side * -0.25
    }
  }
  if (gear.includes('goggles')) {
    // Pushed up on the forehead
    const strap = add(head, new THREE.TorusGeometry(HEAD_R * 1.04, 0.02, 8, 48), mat('#5a4632', { rough: 0.8 }), 0, 0.16, 0)
    strap.rotation.x = Math.PI / 2 - 0.25
    for (const side of [-1, 1]) {
      const rim = add(head, new THREE.TorusGeometry(0.06, 0.02, 10, 24), mat('#5a4632', { rough: 0.6 }), side * 0.1, 0.21, 0.25)
      rim.rotation.x = -0.45
      const glass = add(head, cyl(0.055, 0.055, 0.02, 24), mat('#9fd8f0', { metal: 0.6, rough: 0.1 }), side * 0.1, 0.21, 0.25)
      glass.rotation.x = Math.PI / 2 - 0.45
    }
  }
  if (gear.includes('headband')) {
    const band = add(head, new THREE.TorusGeometry(HEAD_R * 1.05, 0.03, 8, 48), mat('#ff6f91', { rough: 0.9 }), 0, 0.14, -0.01)
    band.rotation.x = Math.PI / 2 - 0.3
  }
  if (gear.includes('eyepatch')) {
    const patch = add(head, cyl(0.065, 0.065, 0.02, 24), mat('#16131a', { rough: 0.6 }), 0.11, 0.02, 0.3)
    patch.rotation.x = Math.PI / 2
    const strap = add(head, new THREE.TorusGeometry(HEAD_R * 1.01, 0.008, 6, 48), mat('#16131a'), 0, 0.04, 0)
    strap.rotation.set(Math.PI / 2, 0.35, 0)
  }
  if (gear.includes('earring')) {
    add(head, new THREE.TorusGeometry(0.025, 0.007, 8, 20), mat('#f2c14e', { metal: 0.8, rough: 0.25 }), 0.32, -0.1, 0.02)
  }
  if (gear.includes('scarf')) {
    const wool = mat('#b23a48', { rough: 1 })
    const ring = add(body, new THREE.TorusGeometry(0.14, 0.065, 12, 28), wool, 0, 1.45, 0.01)
    ring.rotation.x = Math.PI / 2
    const tail = add(body, box(0.1, 0.32, 0.04), wool, 0.08, 1.24, chestFront + 0.03)
    tail.rotation.z = 0.12
    for (let i = 0; i < 3; i++) add(body, box(0.105, 0.025, 0.045), mat('#f3ead8', { rough: 1 }), 0.08 - i * 0.004, 1.32 - i * 0.08, chestFront + 0.032).rotation.z = 0.12
  }
  if (gear.includes('pins')) {
    // One enamel pin per country visited (up to 8), down the left strap or the chest
    const colors = ['#edae49', '#d1495b', '#00798c', '#30638e', '#f3ead8', '#8fa98b', '#a78bfa', '#ff8a3d']
    const n = Math.max(1, Math.min(8, extras.countries || 1))
    for (let i = 0; i < n; i++) {
      const pin = add(body, cyl(0.026, 0.026, 0.014, 16), mat(colors[i], { rough: 0.3, metal: 0.4 }), -0.13 + (i % 2) * 0.05, 1.28 - Math.floor(i / 2) * 0.06, chestFront + (bag.id !== 'none' ? 0.035 : 0.012))
      pin.rotation.x = Math.PI / 2
    }
  }
  if (gear.includes('pillow')) {
    const pillow = add(body, new THREE.TorusGeometry(0.15, 0.065, 12, 28, Math.PI * 1.55), mat('#edae49', { rough: 0.95 }), 0, 1.45, 0)
    pillow.rotation.x = Math.PI / 2
    pillow.rotation.z = Math.PI / 2 + Math.PI * 0.225 // the gap at the front
  }
  if (gear.includes('camera')) {
    const strap = add(chest, new THREE.TorusGeometry(0.33, 0.012, 6, 40), mat('#2b2b2b'), 0, 0.05, 0)
    strap.rotation.set(0.25, 0, 0.75)
    strap.scale.set(1, 1, DEPTH + 0.15)
    const cam = new THREE.Group()
    cam.position.set(0.04, -0.06, chestFront + 0.05)
    chest.add(cam)
    add(cam, box(0.2, 0.12, 0.08), mat('#24272b', { rough: 0.5 }))
    add(cam, box(0.06, 0.03, 0.05), mat('#c9cdd3', { metal: 0.7, rough: 0.3 }), -0.05, 0.07, 0)
    const lens = add(cam, cyl(0.04, 0.045, 0.07), mat('#3a3f45', { metal: 0.5, rough: 0.3 }), 0.02, 0, 0.07)
    lens.rotation.x = Math.PI / 2
    const glass = add(cam, cyl(0.03, 0.03, 0.01), mat('#5aa9c9', { metal: 0.8, rough: 0.1 }), 0.02, 0, 0.106)
    glass.rotation.x = Math.PI / 2
  }
  if (gear.includes('pin')) {
    const pin = new THREE.Group()
    pin.position.set(-0.14, 0.18, chestFront + 0.02)
    chest.add(pin)
    add(pin, sphere(0.035), mat('#d1495b', { rough: 0.4 }), 0, 0.02, 0)
    const tip = add(pin, new THREE.ConeGeometry(0.03, 0.06, 16), mat('#d1495b', { rough: 0.4 }), 0, -0.025, 0)
    tip.rotation.z = Math.PI
    add(pin, sphere(0.012), mat('#ffffff'), 0, 0.025, 0.03)
  }
  if (gear.includes('badges')) {
    const colors = ['#edae49', '#00798c', '#d1495b', '#30638e']
    for (let i = 0; i < colors.length; i++) {
      const b = add(chest, cyl(0.032, 0.032, 0.012, 20), mat(colors[i], { rough: 0.35, metal: 0.3 }), 0.08 + (i % 2) * 0.075, 0.2 - Math.floor(i / 2) * 0.075, chestFront + 0.008)
      b.rotation.x = Math.PI / 2
      const ring = add(chest, new THREE.TorusGeometry(0.032, 0.006, 6, 20), mat('#f3ead8', { metal: 0.5, rough: 0.3 }), b.position.x, b.position.y, b.position.z + 0.007)
      ring.rotation.x = 0
    }
  }
  if (gear.includes('passport')) {
    const strap = add(chest, new THREE.TorusGeometry(0.34, 0.01, 6, 40), mat('#6b4a2b'), 0, -0.05, 0)
    strap.rotation.set(-0.2, 0, -0.85)
    strap.scale.set(1, 1, DEPTH + 0.15)
    add(body, box(0.15, 0.17, 0.05), mat('#6b4a2b', { rough: 0.7 }), -0.29, 0.86, 0.1).rotation.y = -0.5
    add(body, box(0.1, 0.06, 0.02), mat('#30638e', { rough: 0.5 }), -0.27, 0.96, 0.135).rotation.y = -0.5
  }

  return { root, meshes, parts: { body, chest, head, arms, legs, eyes, thumbs } }

  // ----- hats -----
  function addHat(group) {
    const hat = itemOf('hat', look.hat || 'none')
    if (hat.id === 'none') return
    const hatMat = mat(hat.color, { rough: 0.8 })
    if (hat.id === 'tricorn') {
      // Round crown, wide brim with three turned-up sides, amber trim and a badge
      const crown = add(group, new THREE.SphereGeometry(0.29, 32, 14, 0, Math.PI * 2, 0, Math.PI / 2), hatMat, 0, 0.2, -0.02)
      crown.scale.set(1, 0.75, 1)
      add(group, cyl(0.44, 0.44, 0.03, 40), hatMat, 0, 0.21, -0.02)
      for (let i = 0; i < 3; i++) {
        const side = new THREE.Group()
        side.position.set(0, 0.21, -0.02)
        side.rotation.y = (i * Math.PI * 2) / 3
        group.add(side)
        const flap = add(side, box(0.5, 0.16, 0.03), hatMat, 0, 0.07, 0.36)
        flap.rotation.x = -0.35
      }
      const trim = add(group, new THREE.TorusGeometry(0.29, 0.014, 8, 40), mat('#edae49', { metal: 0.4, rough: 0.4 }), 0, 0.23, -0.02)
      trim.rotation.x = Math.PI / 2
      add(group, sphere(0.04), mat('#edae49', { metal: 0.5, rough: 0.3 }), 0, 0.31, 0.24)
    }
    if (hat.id === 'bandana') {
      const cap = add(group, new THREE.SphereGeometry(HEAD_R * 1.12, 32, 14, 0, Math.PI * 2, 0, Math.PI * 0.46), hatMat, 0, 0.03, -0.02)
      cap.rotation.x = -0.3
      add(group, sphere(0.06), hatMat, 0.1, 0.05, -0.33)
      for (const side of [-1, 1]) {
        const tail = add(group, box(0.06, 0.16, 0.02), hatMat, 0.1 + side * 0.05, -0.06, -0.35)
        tail.rotation.z = side * 0.35
      }
      for (let i = 0; i < 5; i++) add(group, sphere(0.014), mat('#ffffff'), -0.18 + i * 0.09, 0.27 - (i % 2) * 0.05, 0.14 + (i % 2) * 0.05)
    }
    if (hat.id === 'sunhat') {
      add(group, cyl(0.52, 0.52, 0.02, 48), hatMat, 0, 0.2, 0)
      add(group, cyl(0.25, 0.29, 0.17, 32), hatMat, 0, 0.29, -0.01)
      add(group, cyl(0.295, 0.295, 0.05, 32), mat('#d1495b', { rough: 0.8 }), 0, 0.24, -0.01)
    }
    if (hat.id === 'beanie') {
      add(group, new THREE.SphereGeometry(HEAD_R * 1.12, 32, 14, 0, Math.PI * 2, 0, Math.PI * 0.5), hatMat, 0, 0.06, -0.01)
      const cuff = add(group, cyl(HEAD_R * 1.14, HEAD_R * 1.14, 0.1, 40), mat('#ff8a3d', { rough: 0.9 }), 0, 0.08, -0.01)
      cuff.rotation.x = -0.12
      add(group, sphere(0.08), mat('#ff8a3d', { rough: 1 }), 0, 0.45, -0.03)
    }
  }

  // ----- hair styles -----
  function addHair(group) {
    const style = look.hair
    // The cap sits a little back so the forehead shows
    const capR = HEAD_R * (style === 'buzz' ? 1.03 : 1.08)
    const capLen = style === 'buzz' ? Math.PI * 0.42 : Math.PI * 0.55
    const cap = add(group, new THREE.SphereGeometry(capR, 32, 18, 0, Math.PI * 2, 0, capLen), hairMat, 0, 0.02, -0.02)
    cap.rotation.x = -0.32
    if (style === 'short' || style === 'pony' || style === 'bun') {
      // A soft fringe swept to one side
      add(group, sphere(0.15), hairMat, 0.08, 0.2, 0.2).scale.set(1.3, 0.55, 0.8)
    }
    if (style === 'long') {
      add(group, capsule(0.3, 0.3), hairMat, 0, -0.2, -0.12).scale.set(1.02, 1, 0.55)
      for (const side of [-1, 1]) add(group, capsule(0.075, 0.32), hairMat, side * 0.27, -0.16, 0.06)
      add(group, sphere(0.15), hairMat, -0.07, 0.21, 0.19).scale.set(1.4, 0.5, 0.8)
    }
    if (style === 'bun' && (look.hat || 'none') === 'none') add(group, sphere(0.13), hairMat, 0, 0.36, -0.1)
    if (style === 'bob') {
      // Hair round the back and sides down to the jaw, open at the face
      const shell = add(group, new THREE.SphereGeometry(HEAD_R * 1.1, 32, 18, Math.PI / 2 + 0.95, Math.PI * 2 - 1.9, 0, Math.PI * 0.72), mat(hairColor, { rough: 0.6 }), 0, 0.01, -0.01)
      shell.material.side = THREE.DoubleSide
      add(group, sphere(0.15), hairMat, -0.06, 0.21, 0.19).scale.set(1.5, 0.5, 0.8)
    }
    if (style === 'braid') {
      for (let i = 0; i < 5; i++) add(group, sphere(0.075 - i * 0.006), hairMat, 0.24 + i * 0.01, -0.2 - i * 0.11, 0.08 - i * 0.015)
      add(group, sphere(0.03), mat('#d1495b'), 0.29, -0.7, 0.02)
    }
    if (style === 'locs') {
      for (let i = 0; i < 14; i++) {
        const a = Math.PI * 0.15 + (i / 13) * Math.PI * 1.7 // round the back, not over the face
        const x = Math.sin(a + Math.PI) * HEAD_R * 0.98
        const z = Math.cos(a + Math.PI) * HEAD_R * 0.98
        add(group, capsule(0.035, 0.36), hairMat, x, -0.2, z - 0.02)
      }
    }
    if (style === 'pony') {
      add(group, sphere(0.05), mat('#d1495b'), 0, 0.14, -0.33)
      const tail = add(group, capsule(0.075, 0.3), hairMat, 0, -0.06, -0.42)
      tail.rotation.x = 0.35
    }
    if (style === 'curly') {
      // Little curls spread over the top of the head (golden-angle spiral)
      const n = 46
      for (let i = 0; i < n; i++) {
        const y = 1 - (i / (n - 1)) * 1.25 // from the top down to just below the middle
        if (y < -0.2) continue
        const r = Math.sqrt(Math.max(0, 1 - y * y))
        const a = i * 2.39996
        const x = Math.cos(a) * r
        const z = Math.sin(a) * r
        if (z > 0.55 && y < 0.55) continue // keep the face clear
        add(group, sphere(0.085), hairMat, x * HEAD_R * 1.05, y * HEAD_R * 1.05 + 0.03, z * HEAD_R * 1.05 - 0.02)
      }
    }
  }
}

// A striped fabric (Breton top): white/cream stripes on the chosen colour, or navy stripes on cream
function stripes(THREE, base) {
  const c = document.createElement('canvas')
  c.width = 8
  c.height = 64
  const ctx = c.getContext('2d')
  ctx.fillStyle = base
  ctx.fillRect(0, 0, 8, 64)
  ctx.fillStyle = base === '#f3ead8' ? '#1f4e6e' : '#f7f3ea'
  for (let y = 0; y < 64; y += 16) ctx.fillRect(0, y, 8, 7)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(1, 3)
  return tex
}

// All item ids (handy for tests)
export function allIds() {
  const ids = {}
  for (const k in CATALOG) ids[k] = CATALOG[k].map((it) => it.id)
  return ids
}
