# Clinic.js Heap Profilder

[![npm version][npm-version]][npm-url] [![Stability Stable][stability-stable]][stability-docs] [![Github Actions build status][actions-status]][actions-url]
[![Downloads][npm-downloads]][npm-url] [![Code style][lint-standard]][lint-standard-url]

Programmable interface to [Clinic.js][clinic-url] Heap Profiler. Learn more about Clinic.js: https://clinicjs.org/

![Screenshot](screenshot.png)

## Supported node versions

- Node.js 10 and above

## Example

```js
const ClinicHeapProfiler = require('@nearform/clinic-heap-profiler')
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
const ClinicHeapProfiler = require('@nearform/clinic-heap-profiler')
const heapProfiler = new ClinicHeapProfiler()
```

### new ClinicHeapProfiler([settings])

- settings [`<Object>`][]
  - detectPort [`<boolean>`][] **Default**: false
  - debug [`<boolean>`][] If set to true, the generated html will not be minified.
    **Default**: false
  - dest [`<String>`][] The file where the collected data is stored. By default it generates a `.clinic-heapprofile` file in the `.clinic` folder.
    **Default**: '.'

#### `heapProfiler.collect(args, callback)`

Starts a process by using [@nearform/heap-profiler](https://github.com/nearform/heap-profiler).

heapProfiler will produce a file in the current working directory, with the process PID in
its filename. The filepath relative to the current working directory will be the
value in the callback.

`stdout`, `stderr`, and `stdin` will be relayed to the calling process. As will
the `SIGINT` event.

In order to finish the sampling, the process must receive a `SIGINT` (the simplest way is to press Ctrl+C).

#### `flame.visualize(dataFilename, outputFilename, callback)`

Will consume the datafile specified by `dataFilename`, this datafile will be
produced by the sampler using `heapProfiler.collect`.

`flame.visualize` will then output a standalone HTML file to `outputFilename`.
When completed the `callback` will be called with no extra arguments, except a
possible error.

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
[npm-version]: https://img.shields.io/npm/v/@nearform/clinic-heap-profiler.svg?style=flat-square
[npm-url]: https://www.npmjs.org/@nearform/clinic-heap-profiler
[npm-downloads]: http://img.shields.io/npm/dm/@nearform/clinic-heap-profiler.svg?style=flat-square
[lint-standard]: https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square
[lint-standard-url]: https://github.com/feross/standard
[clinic-url]: https://github.com/nearform/node-clinic
[`<object>`]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object
[`<number>`]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number
[`<boolean>`]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#Boolean_type
[`<string>`]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String
[actions-status]: https://github.com/nearform/node-clinic-flame/workflows/CI/badge.svg
[actions-url]: https://github.com/nearform/node-clinic-flame/actions
