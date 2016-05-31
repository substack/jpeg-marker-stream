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
        console.log('PENDING', pending)
        var n = Math.min(buf.length - i, pending)
        console.log('n=', n)
        buffers.push(buf.slice(i, i+n))
        pending -= n
        i += n
        pos += n
        if (pending === 0) {
          console.log(buffers)
          buffers = []
        }
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
          console.log('ok...', s1, s2)
          pending = s1*256 + s2 // big endian 16-bit integer
          console.log('SET PENDING', pending)
        }
      } else if (state === 'jfxx-app0') {
        console.log('jfxx...')
      } else {
        console.log('state=', state)
      }
      pos++
    }
    if (pos > 2 && !started) {
      return next(new Error('start of image not found'))
    }
  }
}

function hexb (n) { return '0x'+(n<0x10?'0':'')+n.toString(16) }
