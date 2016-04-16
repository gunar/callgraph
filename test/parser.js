const test = require('tape')
const parser = require('../parser')
const path = require('path')
const R = require('ramda')

test('Should parse functions in separate files', t => {
  t.plan(1)
  parser('test/mocks/file.js', tuples => {
    const aFnInAnotherFile = '[./anotherFile]aFnInAnotherFile'
    const callToAnother = R.pipe(R.last, R.equals(aFnInAnotherFile))
    const findCallInAnotherFile = R.find(callToAnother)
    t.ok(findCallInAnotherFile(tuples))
  })
})
