# parse-jpeg-stream

parse markers from a JPEG, including EXIF data

# example

``` js
var jpeg = require('parse-jpeg-stream')
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

[1]: https://en.wikipedia.org/wiki/JPEG_File_Interchange_Format
[2]: http://www.cipa.jp/std/documents/e/DC-008-2012_E.pdf

# api

```
var jpeg = require('parse-jpeg-stream')
```

## var stream = jpeg()

Return a transform stream `jpeg`.

## output types

### SOI

start of image 

* `marker.type = 'SOI'`
* `marker.start` - offset of first byte
* `marker.end` - offset of last byte + 1

### JFIF (APP0)

* `marker.type = 'JFIF'`
* `marker.start` - offset of first byte
* `marker.end` - offset of last byte + 1

### JFXX (APP0)

* `marker.type = 'JFXX'`
* `marker.start` - offset of first byte
* `marker.end` - offset of last byte + 1

### EXIF (APP1)

exif data

* `marker.type = 'EXIF'`
* `marker.start` - offset of first byte
* `marker.end` - offset of last byte + 1

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

### EOI

end of image

* `marker.type = 'EOI'`
* `marker.start` - offset of first byte
* `marker.end` - offset of last byte + 1

