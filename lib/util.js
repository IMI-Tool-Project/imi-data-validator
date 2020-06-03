const charsets = require("./charsets");
const IMIMojiConverter = require("imi-moji-converter");

const SUCCESS = {
  "種別": "INFO",
};

module.exports = {
  datatype: function(def, val) {
    switch (def) {
      case "xsd:integer":
        return val.match(/^(0|[1-9][0-9]*|-[1-9][0-9]*)$/) ? SUCCESS : {
          "種別": "ERROR",
          "説明": `xsd:integer ではありません`
        };
      case "xsd:nonNegativeInteger":
        return val.match(/^(0|[1-9][0-9]*)$/) ? SUCCESS : {
          "種別": "ERROR",
          "説明": `xsd:nonNegativeInteger ではありません`
        };
      case "xsd:date":
        return val.match(/^[0-9]+-[0-9][0-9]-[0-9][0-9]$/) ? SUCCESS : {
          "種別": "ERROR",
          "説明": `xsd:date ではありません`
        };
    }
    return SUCCESS;
  },
  eq: function(def, val) {
    return (def === val) ? SUCCESS : {
      "種別": "ERROR",
      "説明": `${def} でなければなりません`
    };
  },
  lt: function(def, val) {
    if (isNaN(parseInt(val))) return {
      "種別": "ERROR",
      "説明": `数値ではありません`
    };
    return (parseInt(val) < parseInt(def)) ? SUCCESS : {
      "種別": "ERROR",
      "説明": `${def} より小さくなければいけません`
    };
  },
  le: function(def, val) {
    if (isNaN(parseInt(val))) return {
      "種別": "ERROR",
      "説明": `数値ではありません`
    };
    return (parseInt(val) <= parseInt(def)) ? SUCCESS : {
      "種別": "ERROR",
      "説明": `${def} 以下でなければいけません`
    };
  },
  gt: function(def, val) {
    if (isNaN(parseInt(val))) return {
      "種別": "ERROR",
      "説明": `数値ではありません`
    };
    return (parseInt(val) > parseInt(def)) ? SUCCESS : {
      "種別": "ERROR",
      "説明": `${def} より大きくなければいけません`
    };
  },
  ge: function(def, val) {
    if (isNaN(parseInt(val))) return {
      "種別": "ERROR",
      "説明": `数値ではありません`
    };
    return (parseInt(val) >= parseInt(def)) ? SUCCESS : {
      "種別": "ERROR",
      "説明": `${def} 以上でなければいけません`
    };
  },
  pattern: function(def, val) {
    return new RegExp(def).test(val) ? SUCCESS : {
      "種別": "ERROR",
      "説明": `正規表現 ${def} に適合しません`
    };
  },
  charset: function(def, val) {
    const token = def.replace(/\s/g, "");

    const rec = [];
    const non = [];

    token.split("|").forEach(x => {
      const flag = (x.indexOf("[NotRecommended]") === 0);
      const uri = x.replace("[NotRecommended]", "");
      if (charsets[uri] !== undefined)
        (flag ? non : rec).push(charsets[uri]);
    });

    // 推奨だけの場合
    if (rec.length > 0 && non.length === 0) {
      const mojis = [];
      const names = [];
      rec.forEach(x => {
        mojis.push(x.moji);
        names.push(x.name);
      });

      const pattern = new RegExp("^(" + mojis.join("|") + ")*$");
      if (pattern.test(val)) return SUCCESS;

      const error = {
        "種別": "ERROR",
        "説明": `[${names.join(",")}] で規定されていない文字が使用されています`,
      };

      if (token === "https://imi.go.jp/CommonCharacterSets/ISOIEC10646Annex-G-supplement-KATAKANA-compliant") {
        const conv = IMIMojiConverter.toFullWidth(val);
        if (pattern.test(conv))
          return [error, {
            "種別": "WARNING",
            "説明": `[${names.join(",")}] で規定されていない文字が使用されていましたが、半角カナ／全角カナ変換によって修正されました`,
            "値": conv
          }];
      }

      if (token === "https://imi.go.jp/CommonCharacterSets/ISOIEC10646Annex-G-supplement-NUMERIC-compliant") {
        const conv = IMIMojiConverter.toHalfWidth(val);
        if (pattern.test(conv))
          return [error, {
            "種別": "WARNING",
            "説明": `[${names.join(",")}] で規定されていない文字が使用されていましたが、全角数字／半角数字変換によって修正されました`,
            "値": conv
          }];
      }
      return error;

    }

    // 非推奨だけの場合
    if (rec.length === 0 && non.length > 0) {
      const mojis = [];
      const names = [];
      non.forEach(x => {
        mojis.push(x.moji);
        names.push(x.name);
      });
      const pattern = new RegExp("(" + mojis.join("|") + ")");
      return pattern.test(val) ? {
        "種別": "WARNING",
        "説明": `[${names.join(",")}] で規定された非推奨文字が使用されています`
      } : SUCCESS;

    }

    // 推奨と非推奨の複合
    if (rec.length > 0 && non.length > 0) {
      const mix = rec.concat(non);
      const pattern1 = new RegExp("^(" + mix.map(a => a.moji).join("|") + ")*$");
      const names1 = mix.map(a => a.name).join(",");
      if (!pattern1.test(val)) {
        return {
          "種別": "ERROR",
          "説明": `[${names1}] で規定されていない文字が使用されています`
        };
      }
      const pattern2 = new RegExp("(" + non.map(a => a.moji).join("|") + ")");
      const names2 = non.map(a => a.name).join(",");
      if (pattern2.test(val)) {
        return {
          "種別": "WARNING",
          "説明": `[${names2}] で規定された非推奨文字が使用されています`
        };
      }
      return SUCCESS;
    }

    return SUCCESS;



  }
};
