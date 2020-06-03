#!/usr/bin/env node

const readline = require('readline');
const generate = require("../main");
const fs = require("fs");

if (process.argv.length < 3) {
  console.error("usage: node cli.js [IMIV_VOCABULARY]... [IMIV_DATAMODEL] [JSON]");
  process.exit(1);
}

let imiv = "";
let input = null;
for (var i = 2; i < process.argv.length; i++) {
  const s = fs.readFileSync(process.argv[i], "UTF-8");
  if (s.match(/^[\s]*{/)) {
    if (input === null)
      input = fs.createReadStream(process.argv[i], 'UTF-8');
  } else {
    imiv += s;
  }
}

const validate = generate(imiv);

const rl = readline.createInterface({
  input: input || process.stdin,
  crlfDelay: Infinity
});

let mode = 0;

const lines = [];

rl.on('line', (line) => {
  if (mode === 0) {
    try {
      JSON.parse(line);
      mode = 2;
    } catch (e) {
      mode = 1;
    }

  }
  switch (mode) {
    case 1:
      lines.push(line);
      break;
    case 2:
      try {
        const json = JSON.parse(line);
        const done = validate(json);
        console.log(JSON.stringify(done));
      } catch (e) {
        console.log(`# error ${e.toString()}`)
      }
      break;
  }
}).on('close', () => {
  if (mode === 1) {
    try {
      const json = JSON.parse(lines.join("\n"));
      const done = validate(json);
      console.log(JSON.stringify(done, null, 2));
    } catch (e) {
      console.log(`# error ${e.toString()}`)
    }
  }
});
