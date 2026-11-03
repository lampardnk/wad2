// Tiny .zip maker for "Download all": photos are already compressed,
// so files are stored as-is (no extra library needed).
// files = [{ name: 'IMG_01.jpg', blob }]  ->  a Blob of the .zip

const CRC_TABLE = []
for (let n = 0; n < 256; n++) {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  CRC_TABLE.push(c >>> 0)
}

function crc32(bytes) {
  let crc = 0xffffffff
  for (let i = 0; i < bytes.length; i++) crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

export async function makeZip(files) {
  const parts = []    // local headers + file data
  const central = []  // central directory entries
  let offset = 0
  const usedNames = []

  for (const f of files) {
    // Avoid two files with the same name
    let name = f.name
    let n = 2
    while (usedNames.includes(name)) name = f.name.replace(/(\.[^.]*)?$/, '-' + n++ + '$1')
    usedNames.push(name)

    const data = new Uint8Array(await f.blob.arrayBuffer())
    const nameBytes = new TextEncoder().encode(name)
    const crc = crc32(data)

    const local = new DataView(new ArrayBuffer(30))
    local.setUint32(0, 0x04034b50, true) // local file header
    local.setUint16(4, 20, true)         // version needed
    local.setUint16(6, 0x0800, true)     // UTF-8 names
    local.setUint16(8, 0, true)          // stored, no compression
    local.setUint32(14, crc, true)
    local.setUint32(18, data.length, true)
    local.setUint32(22, data.length, true)
    local.setUint16(26, nameBytes.length, true)
    parts.push(local, nameBytes, data)

    const entry = new DataView(new ArrayBuffer(46))
    entry.setUint32(0, 0x02014b50, true) // central directory header
    entry.setUint16(4, 20, true)
    entry.setUint16(6, 20, true)
    entry.setUint16(8, 0x0800, true)
    entry.setUint32(16, crc, true)
    entry.setUint32(20, data.length, true)
    entry.setUint32(24, data.length, true)
    entry.setUint16(28, nameBytes.length, true)
    entry.setUint32(42, offset, true)
    central.push(entry, nameBytes)

    offset += 30 + nameBytes.length + data.length
  }

  let centralSize = 0
  for (const c of central) centralSize += c.byteLength
  const end = new DataView(new ArrayBuffer(22))
  end.setUint32(0, 0x06054b50, true) // end of central directory
  end.setUint16(8, files.length, true)
  end.setUint16(10, files.length, true)
  end.setUint32(12, centralSize, true)
  end.setUint32(16, offset, true)

  return new Blob(parts.concat(central, [end]), { type: 'application/zip' })
}
