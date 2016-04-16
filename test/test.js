const libVar = require('./tast2')

function rootFn() { return null }
function addOne(n) {
  return libVar.aFnInAnotherFile(n + 1)
}
function beNice() {
  addOne()
}
beNice()
