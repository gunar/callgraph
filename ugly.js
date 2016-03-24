// TODO take scope in consideration when parsing calls
// TODO take in consideration module.exports not exportin all functions
// TODO also, module.exports may export fn with different name
'use strict'
const input = process.argv[2]
if (!input) {
  console.error('You forgot to pass file argument.')
  process.exit(0)
}

const UglifyJS = require('uglify-js')
const fs = require('fs');
const path = require('path')
const execSync = require('child_process').execSync;

const localize = (currentFile, fn) => `[${currentFile}]${fn}`

const inputPath = path.parse(input)
let files = [inputPath.base]
const calls = []
const definedFunctions = []
const rootDir = path.join('./', inputPath.dir)


while (files.length > 0) {
  const currentFile = files[0].replace(/\.js$/, '')
  files.shift()
  const file = path.join(rootDir, currentFile+'.js')
  console.log('file', file)
  let babelOk = false
  try {
    execSync('./node_modules/.bin/babel -o bundle.js '+ file)
    babelOk = true
  } catch (e) {
    console.log(`Couldn't read file ${file}`)
    console.log(e.message)
    break
  }

  definedFunctions.push(localize(currentFile, 'Program'))

  const code = fs.readFileSync('bundle.js', 'utf-8')
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
  });

  toplevel.walk(walker);
  const modulesAsFiles = localModules.map(t => t[1])
  files = files.concat(modulesAsFiles)
}

const out = fs.openSync('callgraph.dot', 'w');
fs.writeSync(out, `
digraph test{
overlap=scalexy;
`);

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
