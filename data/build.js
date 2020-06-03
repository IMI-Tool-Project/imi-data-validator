const fs = require("fs");

const classes = {};

for (let i = 2; i < process.argv.length; i++) {
  let key = "";
  let name = "";
  let lower = [];
  let upper = [];
  fs.readFileSync(process.argv[i], "UTF-8").split("\n").forEach(line => {
    line = line.replace(/\s/g, "");
    if (line.match(/^#参照URI:"(.+)"$/)) {
      key = RegExp.$1;
    } else if (line.match(/^#名称:"(.+)"$/)) {
      name = RegExp.$1;
    } else if (line.match(/^#/) || line.length === 0) {
      return;
    } else if (line.match(/^[0-9A-Fa-f]{4}$/)) {
      lower.push(line);
    } else {
      upper.push(line);
    }
  });

  lower.sort((a, b) => parseInt(a, 16) - parseInt(b, 16));
  upper.sort((a, b) => parseInt(a, 16) - parseInt(b, 16));

  const groups = [];
  upper.forEach(x => {
    const cp = parseInt(x, 16) - 0x10000;
    const high = 0xD800 | (cp >> 10);
    const low = 0xDC00 | (cp & 0x3FF);
    groups.push("\\u" + high.toString(16) + "\\u" + low.toString(16));
    //    return String.fromCharCode(high, low);
  });

  const dst = [];
  lower.forEach((a, i) => {
    if (0 < i && i < lower.length - 1) {
      const a = parseInt(lower[i - 1], 16);
      const b = parseInt(lower[i], 16);
      const c = parseInt(lower[i + 1], 16);
      if (a + 1 === b && b + 1 === c) {
        dst.push("-")
        return;
      }
    }
    dst.push("\\u" + lower[i]);
  });


  groups.push("[" + dst.join("").replace(/-+/g, "-") + "]");

  classes[key] = {
    "moji": groups.join("|"),
    "name": name
  };

}

console.log(`module.exports = ${JSON.stringify(classes, null, 2)};`);
