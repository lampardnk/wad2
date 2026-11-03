// Turns a TopoJSON file (e.g. world-atlas countries) into GeoJSON features Leaflet can draw.
// TopoJSON stores shared borders once ("arcs"); each country lists which arcs make its outline.
export function topoFeatures(topo, objectName) {
  const t = topo.transform || { scale: [1, 1], translate: [0, 0] }
  // Arcs are saved as small steps from the previous point; add them up into real coordinates
  const arcs = []
  for (const arc of topo.arcs) {
    let x = 0
    let y = 0
    const pts = []
    for (const p of arc) {
      x += p[0]
      y += p[1]
      pts.push(topo.transform ? [x * t.scale[0] + t.translate[0], y * t.scale[1] + t.translate[1]] : [p[0], p[1]])
    }
    arcs.push(pts)
  }
  // A ring = arcs joined end to end (a negative index means "this arc, backwards")
  function ring(ids) {
    const pts = []
    for (const id of ids) {
      let a = id < 0 ? arcs[~id].slice().reverse() : arcs[id]
      if (pts.length) a = a.slice(1) // the first point repeats the last one
      for (const p of a) pts.push(p)
    }
    return pts
  }
  const features = []
  for (const g of topo.objects[objectName].geometries) {
    let coordinates
    if (g.type === 'Polygon') coordinates = g.arcs.map(ring)
    else if (g.type === 'MultiPolygon') coordinates = g.arcs.map((poly) => poly.map(ring))
    else continue
    features.push({ type: 'Feature', id: g.id, properties: g.properties || {}, geometry: { type: g.type, coordinates } })
  }
  return features
}

// Countries that cross the 180° line (Russia, Fiji, the Aleutians...) store points on both sides of it,
// so a map draws a stray line all the way across the world. This keeps each outline continuous:
// whenever the next point jumps more than half the globe, it's moved by 360° to the side it belongs on.
export function unwrapLongitudes(features) {
  function fixRing(ring) {
    const out = []
    let shift = 0
    for (let i = 0; i < ring.length; i++) {
      let lon = ring[i][0] + shift
      if (i > 0) {
        const prev = out[i - 1][0]
        if (lon - prev > 180) { shift -= 360; lon -= 360 }
        else if (prev - lon > 180) { shift += 360; lon += 360 }
      }
      out.push([lon, ring[i][1]])
    }
    return out
  }
  for (const f of features) {
    const g = f.geometry
    if (g.type === 'Polygon') g.coordinates = g.coordinates.map(fixRing)
    else if (g.type === 'MultiPolygon') g.coordinates = g.coordinates.map((poly) => poly.map(fixRing))
  }
  return features
}
