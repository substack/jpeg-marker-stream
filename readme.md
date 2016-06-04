# jpeg-marker-stream

parse markers from a JPEG:

* SOI
* JFIF
* JFXX
* EXIF
* FPXR
* DQT
* DHT
* DRI
* SOF
* SOS
* DATA
* EOI

# example

``` js
var jpeg = require('jpeg-marker-stream')
process.stdin.pipe(jpeg())
  .on('data', console.log)
```

output:

```
$ node exif.js < files/cactus.jpg 2>/dev/null | head -n20
{ type: 'SOI', start: 0, end: 2 }
{ type: 'JFIF',
  start: 2,
  end: 20,
  version: '1.1',
  density: { units: 'pixels per inch', x: 72, y: 72 },
  thumbnail: { x: 0, y: 0, data: <Buffer > } }
{ image: 
   { ImageWidth: 2560,
     ImageHeight: 1920,
     Make: 'google',
     Model: 'Nexus S',
     Orientation: 1,
     Software: 'JZO54K',
     ModifyDate: Fri Jun 19 2015 11:40:52 GMT+0100 (BST),
     YCbCrPositioning: 1,
     ExifOffset: 164 },
  thumbnail: 
   { ImageWidth: 320,
     ImageHeight: 240,
```

# api

```
var jpeg = require('jpeg-marker-stream')
```

## var stream = jpeg()

Return a transform stream `jpeg` that takes a binary stream of jpeg data as
input and produces an object stream as output with the object types described
below.

## output object types

### SOI

start of image 

* `marker.type = 'SOI'`
* `marker.start` - offset of first byte
* `marker.end` - offset of last byte + 1

### JFIF (APP0)

* `marker.type = 'JFIF'`
* `marker.start` - offset of first byte
* `marker.end` - offset of last byte + 1
* `marker.version` - jfif version string (`'major.minor'`)
* `marker.density.units` - `'aspect'`, `'pixels per inch'` or `'pixels per cm'`
* `marker.density.x` - x density
* `marker.density.y` - y density
* `marker.thumbnail.width` - thumbnail width
* `marker.thumbnail.height` - thumbnail height
* `marker.thumbnail.data` - thumbnail data as a Buffer

### JFXX (APP0)

* `marker.type = 'JFXX'`
* `marker.start` - offset of first byte
* `marker.end` - offset of last byte + 1
* `marker.thumbnail.format` - `'JPEG'`, `'PAL'`, or `'RGB'`
* `marker.thumbnail.width` - thumbnail width (not available for `'JPEG'`
* `marker.thumbnail.height` - thumbnail height (not available for `'JPEG'`)
* `marker.thumbnail.data` - thumbnail data as a Buffer
* `marker.thumbnail.palette` - thumbnail palette (for `PAL` thumbnails)

### EXIF (APP1)

exif data

* `marker.type = 'EXIF'`
* `marker.start` - offset of first byte
* `marker.end` - offset of last byte + 1
* `marker.image` - exif image data
* `marker.thumbnail` - exif thumbnail data
* `marker.exif` - other exif data

### FPXR (APP2)

exif extended data

* `marker.type = 'FPXR'`
* `marker.start` - offset of first byte
* `marker.end` - offset of last byte + 1

### DQT

quantization table

* `marker.type = 'DQT'`
* `marker.start` - offset of first byte
* `marker.end` - offset of last byte + 1
* `marker.tables` - array of 64-byte quantization tables as buffers

### DHT

huffman table

* `marker.type = 'DHT'`
* `marker.start` - offset of first byte
* `marker.end` - offset of last byte + 1
* `marker.data` - raw huffman data

### DRI

define restart interoperability

* `marker.type = 'DRI'`
* `marker.start` - offset of first byte
* `marker.end` - offset of last byte + 1

### SOS

start of scan, immediately preceeds compressed image data

* `marker.type = 'SOS'`
* `marker.start` - offset of first byte
* `marker.end` - offset of last byte + 1

### SOF

start of frame

* `marker.type = 'SOF'`
* `marker.start` - offset of first byte
* `marker.end` - offset of last byte + 1
* `marker.precision` - bits of precision (`8`)
* `marker.width` - width of image (may or may not include padding)
* `marker.height` - height of image (may or may not include padding)
* `marker.H0` - `2`
* `marker.V0` - `1` or `2`

### EOI

end of image

* `marker.type = 'EOI'`
* `marker.start` - offset of first byte
* `marker.end` - offset of last byte + 1

# see also

* https://en.wikipedia.org/wiki/JPEG_File_Interchange_Format
* http://www.cipa.jp/std/documents/e/DC-008-2012_E.pdf

# install

```
npm install jpeg-marker-stream
```

# license

BSD
