'use strict'
const estraverse = require('estraverse')
const parse = require('esprima').parse
const fs = require('fs')

const code = fs.readFileSync('test.js', 'utf-8')
const ast = parse(code, {loc: true})

const scopeChain = []
let assignments = []

estraverse.traverse(ast, {
  enter: enter,
  leave: leave
})

function findFunction(name) {
  for (let i = scopeChain.length -1; i >= 0; i--) {
    const currentScope = scopeChain[i]
    const filtered = currentScope.filter(fn => fn.id.name === name)
    if (filtered.length === 1) {
      return filtered[0].loc
    } else if (filtered.length > 1) {
      console.log('Error: double definition')
    }
  }
}

function enter(node){
  if (node.type === 'FunctionDeclaration') {
    var currentScope = scopeChain[scopeChain.length - 1];
    currentScope.push(node);
  }
  if (node.type === 'VariableDeclarator'){
    // TODO look forfunction expressions
  }
  if (node.type === 'AssignmentExpression'){
    assignments.push(node);
  }
  if (node.type === 'CallExpression') {
    const name = node.callee.name
    const original = findFunction(name)
    if (original) {
      console.log(node)
      console.log('found', original.start)
    } else {
      console.log(name, 'not found. required?')
    }
  }
  if (createsNewScope(node)){
    scopeChain.push([]);
  }
}

function leave(node){
  if (createsNewScope(node)){
    checkForLeaks(assignments, scopeChain);
    scopeChain.pop();
    assignments = [];
  }
}

function isVarDefined(varname, scopeChain){
  for (var i = 0; i < scopeChain.length; i++){
    var scope = scopeChain[i];
    if (scope.indexOf(varname) !== -1){
      return true;
    }
  }
  return false;
}

function checkForLeaks(assignments, scopeChain){
  for (var i = 0; i < assignments.length; i++){
    var assignment = assignments[i];
    var varname = assignment.left.name;
    if (!isVarDefined(varname, scopeChain)){
      console.log('Leaked global', varname, 
        'on line', assignment.loc.start.line);
    }
  }
}

function createsNewScope(node){
  return node.type === 'FunctionDeclaration' ||
    node.type === 'FunctionExpression' ||
    node.type === 'Program';
}
