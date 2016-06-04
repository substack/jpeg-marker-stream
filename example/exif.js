var jpeg = require('../')
process.stdin.pipe(jpeg())
  .on('data', console.log)
