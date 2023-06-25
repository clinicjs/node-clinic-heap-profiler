# Clinic.js Heap Profiler

[![npm version][npm-version]][npm-url] [![Stability Stable][stability-stable]][stability-docs] [![Github Actions build status][actions-status]][actions-url]
[![Downloads][npm-downloads]][npm-url] [![Code style][lint-standard]][lint-standard-url]

Programmable interface to [Clinic.js][clinic-url] Heap Profiler. Learn more about Clinic.js: https://clinicjs.org/

![screenshot](https://user-images.githubusercontent.com/26234614/143886238-481abe39-4cc7-470a-a1cd-144a73a070b9.png)

## Issues

To open an issue, please use the [main repository](https://github.com/clinicjs/node-clinic) with the `heapprofiler` label.

## Installation

```console
npm i -S @clinic/heap-profiler
```

## Supported node versions

- Node.js 16 and above

## Example

```js
const ClinicHeapProfiler = require('@clinic/heap-profiler')
const heapProfiler = new ClinicHeapProfiler()

heapProfiler.collect(['node', './path-to-script.js'], function (err, filepath) {
  if (err) throw err

  heapProfiler.visualize(filepath, filepath + '.html', function (err) {
    if (err) throw err
  })
})
```

## Documentation

```js
const ClinicHeapProfiler = require('@clinic/heap-profiler')
const heapProfiler = new ClinicHeapProfiler()
```

### new ClinicHeapProfiler([settings])

- settings [`<Object>`][]
  - detectPort [`<boolean>`][] **Default**: false
  - collectOnFailure [`<boolean>`][] If set to true, the collected data will be returned even if the process exits with non-zero code.
    **Default**: false
  - debug [`<boolean>`][] If set to true, the generated html will not be minified.
    **Default**: false
  - dest [`<String>`][] Destination for the collected data
    **Default**: `.clinic`
  - name [`<String>`][] File name for the collected data
    **Default**: `<process.pid>.clinic-heapprofiler`

#### `heapProfiler.collect(args, callback)`

Starts a process by using [@nearform/heap-profiler](https://github.com/nearform/heap-profiler).

The process sampling is started as soon as the process starts. The filepath with collected data will be the value in the callback.

`stdout`, `stderr`, and `stdin` will be relayed to the calling process.

The sampling is stopped and data collected right before the process exits.

If you want to collect data earlier, you can send the process a `SIGINT` or, if `detectPort` is `true`, you can call `heapProfiler.stopViaIPC()`.

#### `heapProfiler.visualize(dataFilename, outputFilename, callback)`

Will consume the datafile specified by `dataFilename`, this datafile will be
produced by the sampler using `heapProfiler.collect`.

`heapProfiler.visualize` will then output a standalone HTML file to `outputFilename`.
When completed the `callback` will be called with no extra arguments, except a
possible error.

#### `heapProfiler.stopViaIPC()`

When the profiler is started with `detectPort=true`, the profiler establish a TCP based IPC communication.

This method can therefore be called to collect the data at any time.

If no TCP channel is opened or available, the method will perform no operation so it is safe to call at all times.

## Examples

See the `examples` folder. All example should be run from the repository main folder:

```sh
node examples/redis-web-service
```

Each `index.js` will contain any specific setup step required by the example, if any.

## License

[MIT](LICENSE)

[stability-stable]: https://img.shields.io/badge/stability-stable-green.svg?style=flat-square
[stability-docs]: https://nodejs.org/api/documentation.html#documentation_stability_index
[npm-version]: https://img.shields.io/npm/v/@clinic/heap-profiler.svg?style=flat-square
[npm-url]: https://www.npmjs.org/@clinic/heap-profiler
[npm-downloads]: http://img.shields.io/npm/dm/@clinic/heap-profiler.svg?style=flat-square
[lint-standard]: https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square
[lint-standard-url]: https://github.com/feross/standard
[clinic-url]: https://github.com/clinicjs/node-clinic
[`<object>`]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object
[`<number>`]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number
[`<boolean>`]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#Boolean_type
[`<string>`]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String
[actions-status]: https://github.com/clinicjs/node-clinic-flame/workflows/CI/badge.svg
[actions-url]: https://github.com/clinicjs/node-clinic-flame/actions
