'use strict'
const fs = require('fs');
const hasbin = require('hasbin')
const execSync = require('child_process').execSync;

if (!hasbin.sync('dot')) {
  console.log('Please install graphviz dot.')
  process.exit(0)
}

const input = process.argv[2]
if (!input) {
  console.error('You forgot to pass file argument.')
  process.exit(0)
}

const parser = require('./parser')
const mapTupleToString = t => `"${t[0]}" -> "${t[1]}"`

parser(input, tuples => {
    const out = fs.openSync('callgraph.dot', 'w');
    fs.writeSync(out, `\ndigraph test{\noverlap=scalexy;\n`);
    const callsStr = tuples.map(mapTupleToString).join(`\n`)
    fs.writeSync(out, callsStr + '}');
    // const unshown = calls
    // .filter(tuple => !filterTuple(tuple))
    // .map(mapTupleToString)
    // .join(`\n`)
    // console.log('unshown calls', unshown)

    execSync('dot -Tpng -o callgraph.png callgraph.dot')
    execSync('viewnior callgraph.png')
})
