var through = require('through2')
var parseExif = require('exif-reader')

module.exports = function () {
  var offset = 0
  var pending = 0
  var buffers = []
  var pos = 0
  var s1 = 0, s2 = 0
  var state = 'ff'
  var started = false
  var dqtSeq = 0
  var width = -1, height = -1

  return through.obj(write, end)
  function write (buf, enc, next) {
    var j = 0
    for (var i = 0; i < buf.length; i++) {
      var b = buf[i]
      if (state === 'data') {
        if (b === 0xff) {
          buffers.push(buf.slice(j, i))
          state = flushMarker.call(this, state, buffers)
          buffers = []
          j = i
          state = 'code'
        }
        pos++
        continue
      }
      if (pending > 0) {
        var n = Math.min(buf.length - i, pending)
        buffers.push(buf.slice(i, i+n))
        pending -= n
        if (pending === 0) {
          state = flushMarker.call(this, state, buffers)
          if (state === 'data') j = i
          buffers = []
        }
        i += n - 1
        pos += n
        continue
      }
      if (state === 'ff' && b !== 0xff) {
        return next(new Error('expected 0xff, received: ' + hexb(b)))
      } else if (state === 'ff') {
        state = 'code'
      } else if (state === 'code') {
        offset = 0
        if (b === 0x00) { // data
          state = 'data'
          j = i + 1
        } else if (b === 0xd8) { // SOI
          started = true
          state = 'ff'
          this.push({ type: 'SOI', start: pos-1, end: pos+1 })
        } else if (b === 0xe0) { // JF{IF,XX}-APP0
          state = 'app0'
        } else if (b === 0xda) { // SOS
          state = 'sos'
        } else if (b === 0xd9) { // EOI
          state = 'eoi'
        } else if (b === 0xe1) { // APP1
          state = 'app1'
        } else if (b === 0xe2) { // APP2
          state = 'app2'
        } else if (b === 0xdb) { // DQT
          state = 'dqt'
        } else if (b === 0xc4) { // DHT
          state = 'dht'
        } else if (b === 0xdd) { // DRI
          state = 'dri'
        } else if (b === 0xc0) { // SOF
          state = 'sof'
        } else if (b === 0xda) { // SOS
          state = 'sos'
        } else if (b === 0xfe) { // ???
          state = '0xfe'
        } else {
          return next(new Error('unknown code: ' + hexb(b)))
        }
      } else if (state === 'app0') {
        if (offset === 0) s1 = b
        else if (offset === 1) s2 = b
        else if (offset === 2 && b !== 0x4a) {
          return next(new Error('in app0 expected 0x4a, received: ' + hexb(b)))
        } else if (offset === 3 && b !== 0x46) {
          return next(new Error('in app0 expected 0x46, received: ' + hexb(b)))
        } else if (offset === 4 && b === 0x49) {
          state = 'jfif-app0'
          offset = -1
        } else if (offset === 4 && b === 0x58) {
          state = 'jfxx-app0'
          offset = -1
        } else if (offset >= 4) {
          return next(new Error(
            'in app0 expected 0x49 or 0x58, received: ' + hexb(b)))
        }
        offset++
      } else if (state === 'jfif-app0') {
        if (++offset === 2) {
          pending = s1*256 + s2 - 7
        }
      } else {
        if (offset === 0) s1 = b
        else if (offset === 1) s2 = b
        if (++offset === 2) {
          pending = s1*256 + s2 - 2
        }
      }
      pos++
    }
    if (state === 'data') {
      buffers.push(buf.slice(j, i))
    }
    if (pos > 2 && !started) {
      return next(new Error('start of image not found'))
    } else next()
  }
  function end (next) {
    flushMarker.call(this, state, buffers)
    next()
  }
  function flushMarker (state, buffers) {
    var buf = buffers.length === 1 ? buffers[0] : Buffer.concat(buffers)
    if (state === 'data') {
      this.push({
        type: 'DATA',
        start: pos - 2,
        end: pos + buf.length,
        data: buf
      })
    } else if (state === 'jfif-app0') {
      var units = 'unknown'
      if (buf[2] === 0) units = 'aspect'
      else if (buf[2] === 1) units = 'pixels per inch'
      else if (buf[2] === 2) units = 'pixels per cm'
      this.push({
        type: 'JFIF',
        start: pos - 9,
        end: pos + buf.length,
        version: buf[0] + '.' + buf[1], // major.minor
        density: {
          units: units,
          x: buf.readUInt16BE(3),
          y: buf.readUInt16BE(5)
        },
        thumbnail: {
          width: buf[7],
          height: buf[8],
          data: buf.slice(9, 9+3*buf[7]*buf[8])
        }
      })
    } else if (state === 'jfxx-app0') {
      var thumb = {
        format: 'unknown',
        width: 0,
        height: 0,
        data: null
      }
      if (buf[0] === 0x10) {
        thumb.format = 'JPEG'
        thumb.data = buf.slice(1)
      } else if (buf[0] === 0x11) {
        thumb.format = 'PAL'
        thumb.width = buf[1]
        thumb.height = buf[2]
        thumb.palette = buf.slice(3, 3+768)
        thumb.data = buf.slice(3+768 + thumb.width*thumb.height)
      } else if (buf[0] === 0x12) {
        thumb.format = 'RGB'
        thumb.width = buf[1]
        thumb.height = buf[1]
        thumb.data = 3*thumb.width*thumb.height
      }
      this.push({
        type: 'JFXX',
        start: pos - 9,
        end: pos + buf.length,
        thumbnail: thumb
      })
    } else if (state === 'app1') {
      var row = parseExif(buf)
      row.type = 'EXIF'
      row.offset = pos - 2
      this.push(row)
    } else if (state === 'app2') {
      this.push({
        type: 'FPXR',
        start: pos - 2,
        end: pos + buf.length
      })
    } else if (state === 'dqt') {
      var tables = []
      for (var i = 1; i < buf.length; i += 0x41) {
        if (buf[i-1] !== dqtSeq++) {
          return this.emit('error', new Error('unexpected DQT byte at ' +
            (offset+i-1) + ' (' + i + '): ' + buf[i-1]))
        }
        tables.push(buf.slice(i, i+0x40))
      }
      this.push({
        type: 'DQT',
        start: pos - 2,
        end: pos + buf.length,
        tables: tables
      })
    } else if (state === 'dht') {
      this.push({
        type: 'DHT',
        start: pos - 2,
        end: pos + buf.length
      })
    } else if (state === 'dri') {
      this.push({
        type: 'DRI',
        start: pos - 2,
        end: pos + buf.length
      })
    } else if (state === 'sos') {
      this.push({
        type: 'SOS',
        start: pos - 2,
        end: pos + buf.length
      })
      return 'data'
    } else if (state === 'sof') {
      width = buf.readUInt16BE(3)
      height = buf.readUInt16BE(1)
      this.push({
        type: 'SOF',
        start: pos - 2,
        end: pos + buf.length,
        precision: buf[0],
        width: width,
        height: height,
        H0: Math.floor(buf[7] / 16),
        V0: buf[7] % 16
      })
    } else if (state === 'eoi') {
      this.push({
        type: 'EOI',
        start: pos - 2,
        end: pos + buf.length,
      })
    }
    return 'ff'
  }
}

function hexb (n) { return '0x'+(n<0x10?'0':'')+n.toString(16) }
