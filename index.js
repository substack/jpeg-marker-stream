var through = require('through2')

module.exports = function () {
  var offset = 0
  var pending = 0
  var buffers = []
  var pos = 0
  var s1 = 0, s2 = 0
  var state = 'ff'
  var started = false

  return through.obj(write)
  function write (buf, enc, next) {
    for (var i = 0; i < buf.length; i++) {
      if (pending > 0) {
        var n = Math.min(buf.length - i, pending)
        buffers.push(buf.slice(i, i+n))
        pending -= n
        if (pending === 0) {
          flushMarker.call(this, state, buffers)
          state = 'ff'
          buffers = []
        }
        i += n - 1
        pos += n
        continue
      }
      var b = buf[i]
      if (state === 'ff' && b !== 0xff) {
        return next(new Error('expected 0xff, received: ' + hexb(b)))
      } else if (state === 'ff') {
        state = 'code'
      } else if (state === 'code') {
        if (b === 0xd8) { // SOI
          started = true
          state = 'ff'
        } else if (b === 0xe0) { // JF{IF,XX}-APP0
          state = 'app0'
          offset = 0
        } else if (b === 0xda) { // SOS
          state = 'sos'
        } else if (b === 0xd9) { // EOI
          state = 'eoi'
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
        if (offset === 0 && b !== 0x46) {
          return next(new Error(
            'in jfif-app0, expected 0x46, received: ' + hexb(b)))
        } else if (offset === 1 && b !== 0x00) {
          return next(new Error(
            'in jfif-app0, expected 0x00, received: ' + hexb(b)))
        }
        if (++offset === 2) {
          pending = s1*256 + s2 - 7
        }
      } else if (state === 'jfxx-app0') {
        if (offset === 0 && b !== 0x58) {
          return next(new Error(
            'in jfxx-app0, expected 0x58, received: ' + hexb(b)))
        } else if (offset === 0 && b !== 0x00) {
          return next(new Error(
            'in jfxx-app0, expected 0x00, received: ' + hexb(b)))
        }
        if (++offset === 2) {
          pending = s1*256 + s2 - 7
        }
      } else {
        console.log('state=', state)
      }
      pos++
    }
    if (pos > 2 && !started) {
      return next(new Error('start of image not found'))
    }
  }
  function flushMarker (state, buffers) {
    if (state === 'jfif-app0') {
      var buf = buffers.length === 1 ? buffers[0] : Buffer.concat(buffers)
      var units = 'unknown'
      if (buf[2] === 0) units = 'aspect'
      else if (buf[2] === 1) units = 'pixels per inch'
      else if (buf[2] === 2) units = 'pixels per cm'
      this.push({
        type: 'JFIF-APP0',
        version: buf[0] + '.' + buf[1], // major.minor
        density: {
          units: units,
          x: buf.readUInt16BE(3),
          y: buf.readUInt16BE(5)
        },
        thumbnail: {
          x: buf[7],
          y: buf[8],
          data: buf.slice(9, 9+3*buf[7]*buf[8])
        }
      })
    } else if (state === 'jfxx-app0') {
      var buf = buffers.length === 1 ? buffers[0] : Buffer.concat(buffers)
      var format = 'unknown'
      if (buf[0] === 0x10) format = 'JPEG'
      else if (buf[0] === 0x11) format = 'PAL'
      else if (buf[0] === 0x12) format = 'RGB'

      this.push({
        type: 'JFXX-APP0',
        thumbnail: {
          format: format
          //data: ...
        }
      })
    }
  }
}

function hexb (n) { return '0x'+(n<0x10?'0':'')+n.toString(16) }
