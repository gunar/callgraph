# Callgraph

> This is experimental. Use at your own risk.

![output example](example.png)

## Installation

Install [Graphviz's Dot](https://duckduckgo.com/?q=graphviz%20dot), then install callgraph from npm

```
npm install -g callgraph
```

## Usage

```
callgraph index.js
```

This will generate two files in the current directory:

- `callgraph.png`: An image representing the callgraph
- `callgraph.dot`: A file with a Dot representation of the callgraph

## Questions

### Why UglifyJS for AST parsing and not X?

Does X have `walker.find_parent`? Please let me know.

## License

MIT [http://gunar.mit-license.org]()
