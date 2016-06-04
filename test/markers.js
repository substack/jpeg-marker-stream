var jpeg = require('../')
var test = require('tape')
var fs = require('fs')
var path = require('path')
var collect = require('collect-stream')

test('markers', function (t) {
  t.plan(12)
  var file = path.join(__dirname, 'files/cactus.jpg')
  collect(fs.createReadStream(file).pipe(jpeg()), function (err, markers) {
    t.error(err)
    t.deepEqual(markers.map(mtype), [
      'SOI', 'JFIF', 'EXIF', 'DQT', 'DQT', 'SOF',
      'DHT', 'DHT', 'DHT', 'DHT', 'SOS',
      'DATA', 'DATA', 'DATA', 'DATA', 'DATA', 'DATA', 'DATA', 'DATA',
      'EOI'
    ], 'expected marker types')
    t.deepEqual(markers.map(moffset), [
      [0,2],
      [2,20],
      [27,29119],
      [29121,29188],
      [29190,29257],
      [29259,29276],
      [29278,29303],
      [29305,29357],
      [29359,29382],
      [29384,29411],
      [29413,29425],
      [29436,29461],
      [29514,29592],
      [29627,29740],
      [29890,30153],
      [30613,31336],
      [31514,32415],
      [32301,33088],
      [32374,32447],
      [32376,32378]
    ], 'expected marker offsets')

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
function moffset (marker) { return [marker.start,marker.end] }
