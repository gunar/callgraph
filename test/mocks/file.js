const libVar = require('./anotherFile')

function aFunction() {
  // this is not working
  async.series([ _.curry(libVar.referencedFn) ])
  libVar.aFnInAnotherFile(n + 1)
}
libVar.aFnInAnotherFile(2)
aFunction()
// this is not working
var b = libVar.referencedFn
