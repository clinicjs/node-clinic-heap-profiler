const ClinicHeapProfiler = require('./src/index')
const heapProfiler = new ClinicHeapProfiler({ detectPort: true })

heapProfiler.collect(['target.js'], function (err, filepath) {
  if (err) {
    throw err
  }

  heapProfiler.visualize(filepath, filepath + '.html', function (err) {
    if (err) {
      throw err
    }
  })
})
