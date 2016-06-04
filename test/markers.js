var jpeg = require('../')
var test = require('tape')
var fs = require('fs')
var path = require('path')
var collect = require('collect-stream')

test('markers', function (t) {
  t.plan(11)
  var file = path.join(__dirname, 'files/cactus.jpg')
  collect(fs.createReadStream(file).pipe(jpeg()), function (err, markers) {
    t.error(err)
    t.deepEqual(markers.map(mtype), [
      'SOI', 'JFIF', 'EXIF', 'DQT', 'DQT', 'SOF',
      'DHT', 'DHT', 'DHT', 'DHT', 'SOS',
      'DATA', 'DATA', 'DATA', 'DATA', 'DATA', 'DATA', 'DATA', 'DATA',
      'EOI'
    ], 'expected marker types')

    markers.forEach(function (marker) {
      if (marker.type === 'EXIF') {
        t.equal(marker.exif.ISO, 50, 'exif iso')
        t.equal(marker.exif.ApertureValue, 3, 'exif aperture')
        t.equal(marker.exif.Flash, 0, 'exif flash')
        t.equal(marker.thumbnail.ImageWidth, 320, 'exif thumbnail width')
        t.equal(marker.thumbnail.ImageHeight, 240, 'exif thumbnail height')
        t.equal(marker.image.ImageWidth, 2560, 'exif image width')
        t.equal(marker.image.ImageHeight, 1920, 'exif image height')
      } else if (marker.type === 'SOF') {
        t.equal(marker.width, 150, 'SOF width')
        t.equal(marker.height, 200, 'SOF height')
      }
    })
  })
})

function mtype (marker) { return marker.type }
