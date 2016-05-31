var exif = require('../')
process.stdin.pipe(exif())
  .on('data', console.log)
