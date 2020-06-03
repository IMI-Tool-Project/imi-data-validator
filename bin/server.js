#!/usr/bin/env node

const generate = require("../main");
const http = require("http");
const fs = require("fs");

if (process.argv.length < 4 || !process.argv[2].match(/^[1-9][0-9]*$/)) {
  console.error("Usage: node server.js [port number] [IMIV_VOCABULARY]... [IMIV_DATAMODEL]");
  process.exit(1);
}

const port = parseInt(process.argv[2]);

let imiv = "";
for (var i = 3; i < process.argv.length; i++) {
  imiv += fs.readFileSync(process.argv[i], "UTF-8");
}

const validate = generate(imiv);


const server = http.createServer((req, res) => {
  if (req.method !== "POST") {
    res.writeHead(405, {
      "Content-Type": "text/plain",
      "Allow": "POST"
    });
    res.write([
      "405 Method Not Allowed, only POST method is supported",
      ""
    ].join("\n"));
    res.end();
    return;
  }

  new Promise(resolve => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
    }).on("end", () => {
      resolve(data);
    });
  }).then(data => {
    let json = null;
    try {
      json = JSON.parse(data);
    } catch (e) {
      res.writeHead(400, {
        "Content-Type": "text/plain"
      });
      res.write([
        "400 Bad Request, exception occurred during parsing POST body as JSON",
        "",
        e.toString(),
        ""
      ].join("\n"));
      res.end();
      return;
    }
    try {
      const done = validate(json);
      res.writeHead(200, {
        "Content-Type": "application/json"
      });
      res.write([
        JSON.stringify(done, null, 2),
        ""
      ].join("\n"));
      res.end();
    } catch (e) {
      res.writeHead(500, {
        "Content-Type": "text/plain"
      });
      res.write([
        "500 Internal Server Error",
        "",
        e.toString(),
        ""
      ].join("\n"));
      res.end();
      return;
    }
  });

});
server.listen(port);

console.log(`imi-data-validator is running on port ${port}`);
