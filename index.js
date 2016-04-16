'use strict'

const hasbin = require('hasbin')
if (!hasbin.sync('dot')) {
  console.log('Please install graphviz dot.')
  process.exit(0)
}

const input = process.argv[2]
if (!input) {
  console.error('You forgot to pass file argument.')
  process.exit(0)
}

const babel = require('babel-core')
const execSync = require('child_process').execSync;
const fs = require('fs');
const path = require('path')
const promisify = require('es6-promisify')
const UglifyJS = require('uglify-js')
const queue = require('queue')

const localize = (currentFile, fn) => `[${currentFile}]${fn}`
const fsReadFile = promisify(fs.readFile)
const readFile = file => fsReadFile(file, 'utf-8')

const inputPath = path.parse(input)
const calls = []
const definedFunctions = []
const rootDir = path.join('./', inputPath.dir)
const q = queue()
const processedFiles = []


let totalRunning = 0
function processFile(requiredFile, cb) {
  if (processedFiles.indexOf(requiredFile) > -1)  return cb()
  processedFiles.push(requiredFile)
  totalRunning++
  const currentFile = requiredFile.replace(/\.js$/, '')
  const file = path.join(rootDir, currentFile+'.js')
  console.log(file)
  readFile(file)
    .then(es6 => {
      let code
      try {
        code = babel
          .transform(es6, {
            presets: ['es2015'],
          }).code
      } catch (e) { console.error(e) }

      definedFunctions.push(localize(currentFile, 'Program'))
      const toplevel = UglifyJS.parse(code);
      const localModules = []
      const walker = new UglifyJS.TreeWalker(function(node){
        //check for function calls
        if (node instanceof UglifyJS.AST_Definitions) {
          // TODO: Should loop though all definitions
          if (node.definitions[0].value.expression && node.definitions[0].value.expression.name === 'require') {
            const localName = node.definitions[0].name.name
            const location = node.definitions[0].value.args[0].value
            if (/^\./.test(location)) {
              localModules.push([localName, location])
            }
          }
        } else if (node instanceof UglifyJS.AST_Call) {
          //find where the calling function is defined
          const p = walker.find_parent(UglifyJS.AST_Defun);
          if (/(Number|Date|callback|require)/.test(node.expression.name)) return
            if (p !== undefined) {
              if (node.expression.name !== undefined) {
                // common call e.g. function()
                calls.push([localize(currentFile, p.name.name), localize(currentFile, node.expression.name)])
              } else {
                // method call e.g. lib.function()
                const name = p.name.name
                const module = node.expression.start.value
                const moduleAsFile = localModules
                  .filter(t => t[0] == module)
                  .map(t => t[1])
                  .pop()
                const prop = node.expression.property
                if (moduleAsFile) {
                  calls.push([localize(currentFile, name), localize(moduleAsFile, prop)])
                } else {
                  calls.push([localize(currentFile, name), localize(currentFile, `${module}.${prop}`)])
                }
              }
            } else {
              // it's a top level function
              if (node.expression.name !== undefined) {
                calls.push([localize(currentFile, 'Program'), localize(currentFile, node.expression.name)])
              } else {
                calls.push([localize(currentFile, 'Program'),  localize(currentFile, `${node.expression.start.value}.${node.expression.property}`)])
              }
            }
        }
        if(node instanceof UglifyJS.AST_Defun)
          {
            //defined but not called
            definedFunctions.push(localize(currentFile, node.name.name))
          }
      })
      toplevel.walk(walker);
      const modulesAsFiles = localModules.map(t => t[1])
      modulesAsFiles.forEach(file => {
        q.push(processFile.bind(null, file))
      })
      totalRunning--
      cb()
    }).catch(e => {
      console.error(e)
      cb()
    })
}

q.push(processFile.bind(null, inputPath.base))

q.start(function(err) {
  console.log('all done');
  const out = fs.openSync('callgraph.dot', 'w');
  fs.writeSync(out, `\ndigraph test{\noverlap=scalexy;\n`);
  const filterTuple = tuple => {
    // This removes calls to libraries i.e. functions not defined in the file
    return definedFunctions.indexOf(tuple[1]) > -1 
  }
  const mapTupleToString = t => `"${t[0]}" -> "${t[1]}"`
  const callsStr = calls
    .filter(filterTuple)
    .map(mapTupleToString)
    .join(`\n`)
  fs.writeSync(out, callsStr + '}');
  // console.log('definedFunctions', definedFunctions)
  // console.log('calls', calls)
  const unshown = calls
    .filter(tuple => !filterTuple(tuple))
    .map(mapTupleToString)
    .join(`\n`)
  // console.log('unshown calls', unshown)

  execSync('dot -Tpng -o callgraph.png callgraph.dot')
  execSync('viewnior callgraph.png')
});

// q.on('success', function(result, job) {
//   console.log('job finished processing:', job.toString().replace(/\n/g, ''));
// });
