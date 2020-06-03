const Parser = require('imiv-parser');
const parse = function(imiv) {
  const prefix = {};
  const dig = function(a) {
    a.restriction = a.restriction || [];
    a.restriction.forEach(b => {
      dig(b);
      if (b.type === "type") a.typeRestriction = b.pname;
      if (b.type === "cardinality") a.cardinality = b;
    });
    if (a.prefix && a.name && prefix[a.prefix]) a.pname = `${a.prefix}:${a.name}`;
    if (a.class) dig(a.class);
    if (a.property) dig(a.property);
    if (a.next) dig(a.next);
    return a;
  };
  return Parser.parse(imiv).map(a => {
    a.metadata = a.metadata || [];
    a.metadata.filter(b => b.type === "prefix").forEach(b => {
      prefix[b.prefix] = b.data;
    });
    return dig(a);
  });
};

const Util = require("./lib/util");

const isDatatype = (pname) => ["xsd:", "uncefact", "ic:電話番号型"].find(a => pname.indexOf(a) === 0);
const normalize = (pname) => pname.replace(/^ic:/, "");
const unnormalize = (pname) => pname.indexOf(":") === -1 ? "ic:" + pname : pname;

function Logger() {
  this.count = {
    "INFO": 0,
    "WARNING": 0,
    "ERROR": 0
  };
  return this;
}

Logger.prototype = {
  log: function(target, level, message) {
    const now = new Date();
    now.setHours(now.getHours() + 9);
    const content = {
      "@type": "hj:更新履歴型",
      "hj:更新者": {
        "@type": "実体型",
        "表記": "IMIデータバリデーションコンポーネント"
      },
      "種別": level,
      "説明": message,
      "日時": {
        "@type": "日時型",
        "標準型日時": now.toISOString().replace(/Z$/, "+09:00")
      }
    };
    this.count[level]++;
    if (target["メタデータ"] === undefined) target["メタデータ"] = content;
    else if (Array.isArray(target["メタデータ"])) target["メタデータ"].push(content);
    else target["メタデータ"] = [target["メタデータ"], content];
  },
  reset: function() {
    this.count = {
      "INFO": 0,
      "WARNING": 0,
      "ERROR": 0
    };
  }
};

// datamodel は必要な語彙とデータモデルを連結した語彙記法の文字列
// instance を validate するための関数を返す
module.exports = function(datamodel, options) {

  const __DISABLE_AUTO_FIX__ = !!(options && options["disable_auto_fix"] === true);

  const definitions = parse(datamodel);

  const isSubClassOf = (a, b) => {
    if (a === b) return true;
    const d = definitions.find(x => x.pname === a);
    if (d == undefined || d.typeRestriction === undefined) return false;
    return isSubClassOf(d.typeRestriction, b);
  };

  // use 定義がら導かれる、ツリー型のデータモデル
  const tree = (() => {
    const a = {};
    const dig = (src, parent) => {
      if (!src) return;
      const name = src.pname;
      if (parent[name] === undefined) parent[name] = [];
      let child = parent[name].find(a => src.group ? a["@group"] === src.group : a["@group"] === undefined);
      if (child === undefined) {
        child = {
          restriction: []
        };
        if (src.group) child["@group"] = src.group;
        parent[name].push(child);
      }
      child.restriction = child.restriction.concat(src.restriction);
      if (src.typeRestriction) child.typeRestriction = src.typeRestriction;
      if (src.cardinality) child.cardinality = src.cardinality;

      dig(src.next, child);
    };
    definitions.filter(use => use.type === "use").forEach(use => {
      a["@type"] = use.class.pname;
      dig(use.class.next, a);
    });
    return a;
  })();

  //　関数を返す
  return function(instance) {

    // 入力インスタンスのコピーに対して作業する
    instance = JSON.parse(JSON.stringify(instance));
    const logger = new Logger();

    const dig = (focus, src, dst, depth) => {
      if (src["メタデータ"] !== undefined) dst["メタデータ"] = src["メタデータ"];
      // ルートクラス
      if (depth === 0) {
        const name = normalize(focus["@type"]);
        if (dst["@type"] === undefined) {
          if (src["@type"] === undefined) {
            // クラス名の補完
            // 修復 NG の場合はエラーとして終了
            if (__DISABLE_AUTO_FIX__) {
              Object.assign(dst, src);
              logger.log(dst, "ERROR", "ルートクラスが指定されていません");
              return;
            }
            dst["@type"] = name;
            logger.log(dst, "WARNING", "ルートクラスが指定されていなかったのでデータモデル定義のルートクラスから補完しました");
          } else if (src["@type"] !== name) {
            // クラス名が間違っているのでエラーとして記録
            // ルートクラスはサブクラスを認めないこととするので、完全一致のみ
            Object.assign(dst, src);
            logger.log(dst, "ERROR", "ルートクラスがデータモデル定義のルートクラスと一致しません");
            return;
          } else {
            dst["@type"] = name;
          }
        }
      }

      // データモデルで必須のプロパティが存在しない場合はエラー
      Object.keys(focus).filter(key => key.indexOf("@") !== 0).forEach(key => {
        const name = unnormalize(key);
        const definition = definitions.find(a => a.pname === key);
        //語彙定義（クラスまたはプロパティ）が見つからない場合は中止
        if (definition === undefined) return;
        // プロパティ＋グループに対して iterate
        focus[key].forEach(def => {

          // コピー元の値リストを作成
          let values = [];
          const name = normalize(key);
          if (src[name] === undefined) {
            //
          } else if (Array.isArray(src[name])) {
            values = src[name];
          } else {
            values.push(src[name]);
          }

          // グループによるインスタンスのフィルタリング条件
          if (focus[key].length > 1 && def["ic:種別"] !== undefined) {
            values = values.filter(a => {
              return a["種別"] === def["@group"];
            });
          }

          // カーディナリティの評価
          const length = values.length; //value === undefined ? 0 : (Array.isArray(value) ? value.length : 1);
          const cardinality = def.cardinality || definition.cardinality || {
            min: 0
          };

          if (cardinality.min !== undefined && cardinality.min > length) {
            if (def["@group"] !== undefined)
              logger.log(dst, "ERROR", `プロパティ ${name} (グループ ${def["@group"]}) の値が最低 ${cardinality.min} 必要ですが、不足しています`);
            else
              logger.log(dst, "ERROR", `プロパティ ${name} の値が最低 ${cardinality.min} 必要ですが、不足しています`);
            return;
          }
          if (cardinality.max !== undefined && cardinality.max < length) {
            if (def["@group"] !== undefined)
              logger.log(dst, "ERROR", `プロパティ ${name} (グループ ${def["@group"]}) の値は最大 ${cardinality.min} 個が許容されますが、過剰です`);
            else logger.log(dst, "ERROR", `プロパティ ${name} の値は最大 ${cardinality.min} 個が許容されますが、過剰です`);
            return;
          }
        });
      });


      // データモデルに存在しないプロパティは削除と警告
      const removed = [];
      Object.keys(src).filter(key => key.indexOf("@") !== 0).forEach(key => {
        if (key === "メタデータ") return;
        const name = unnormalize(key);
        if (focus[name] === undefined) removed.push(key);
      });
      if (removed.length > 0) {
        if (__DISABLE_AUTO_FIX__) {
          Object.assign(dst, src);
          logger.log(dst, "ERROR", `プロパティ ${removed.join(",")} はデータモデルで許可されていません`);
          return;
        } else {
          logger.log(dst, "WARNING", `プロパティ ${removed.join(",")} はデータモデルに適合しないので削除されました`);
        }
      }

      // コピー元の値に対して探索
      Object.keys(src).filter(name => name.indexOf("@") !== 0).forEach(name => {
        if (name === "メタデータ") return;
        const key = unnormalize(name);
        const val = src[name];
        const definition = definitions.find(a => a.pname === key);
        if (definition === undefined) return;
        if (isDatatype(definition.typeRestriction)) {
          let values = Array.isArray(val) ? val : [val];
          // 値が存在したとしてもデータモデルに定義がない場合はここで排除される
          if (focus[key] && focus[key][0]) {
            // データ型に対するチェック
            values = values.map(b => {
              const c = Util.datatype(definition.typeRestriction, b);
              if (c["種別"] !== "INFO") logger.log(dst, c["種別"], `プロパティ ${name} は ${c["説明"]}`);
              return b;
            });

            // 個別の制約に対するチェック
            focus[key][0].restriction.forEach(a => {
              values = values.map(b => {
                if (Util[a.type] === undefined) return b;
                let c = Util[a.type](a.data, b);
                if (Array.isArray(c))
                  c = c.find(d => d["種別"] === (__DISABLE_AUTO_FIX__ ? "ERROR" : "WARNING"));
                if (c["種別"] !== "INFO") logger.log(dst, c["種別"], `プロパティ ${name} は ${c["説明"]}`);
                return c["値"] || b;
              });
            });
            dst[name] = Array.isArray(val) ? values : values[0];
          }
          return;
        } else {
          let values = Array.isArray(val) ? val : [val];
          values = values.map(obj => {
            const def = (focus[key] || []).find(f => {
              if (focus[key].length < 2) return true;
              return f["@group"] === obj["種別"];
            });
            if (def === undefined) return obj;

            const typeRestriction = def.typeRestriction || definition.typeRestriction;

            const tmp = {};

            if (obj["@type"] === undefined) {
              if (__DISABLE_AUTO_FIX__) {
                Object.assign(tmp, obj);
                logger.log(tmp, "ERROR", "クラスが指定されてません");
                return tmp;
              }
              // クラス名の補完が発生したので修復してログを記録
              tmp["@type"] = normalize(typeRestriction);
              logger.log(tmp, "WARNING", "クラスが指定されていなかったのでデータモデル定義から補完しました");
              dig(def, obj, tmp, depth + 1);
            } else if (isSubClassOf(unnormalize(obj["@type"]), typeRestriction)) {
              // 正常なクラス名が指定されている
              // サブクラスであっても構わない（データモデルの抽象クラスをインスタンスで具体化する場合）
              tmp["@type"] = obj["@type"];
              dig(def, obj, tmp, depth + 1);
            } else {
              // クラス名指定がおかしいのでエラーを記録して中止
              Object.assign(tmp, obj);
              logger.log(tmp, "ERROR", "指定されたクラスはデータモデル定義に適合しません");
            }

            return tmp;
          });

          dst[name] = Array.isArray(val) ? values : values[0];
        }


      });
    };

    const done = (instance["@graph"] || [instance]).map(src => {
      const dst = {};
      logger.reset();
      dig(tree, src, dst, 0);
      if (logger.count.ERROR > 0 && logger.count.WARNING > 0)
        logger.log(dst, "ERROR", `${logger.count.ERROR} 件のエラーと ${logger.count.WARNING} 件の修正可能な問題が見つかりました。このインスタンスはデータモデルには適合しないので修正が必要です。`);
      else if (logger.count.ERROR > 0)
        logger.log(dst, "ERROR", `${logger.count.ERROR} 件のエラーが見つかりました。このインスタンスはデータモデルには適合しないので修正が必要です。`);
      else if (logger.count.WARNING > 0)
        logger.log(dst, "WARNING", `${logger.count.WARNING} 件の修正可能な問題が見つかりました。このインスタンスはデータモデルに適合しますが、自動修正された箇所を確認してください。`);
      else
        logger.log(dst, "INFO", "このインスタンスはデータモデルに適合しています");

      // 異常系: ルートクラスに間違いがあった場合、@context もコピーされる場合があるのでここで削除しておく
      delete dst["@context"];
      return dst;
    });

    const output = {};

    if (instance["@context"] === undefined) output["@context"] = [];
    else if (Array.isArray(instance["@context"])) output["@context"] = instance["@context"];
    else output["@context"] = [instance["@context"]];

    [
      "https://imi.go.jp/ns/core/context.jsonld",
      "http://hojin-info.go.jp/ns/domain/biz/1/context.jsonld"
    ].filter(a => output["@context"].indexOf(a) === -1).forEach(a => {
      output["@context"].push(a);
    });

    if (instance["@graph"] !== undefined) output["@graph"] = done;
    else Object.assign(output, done[0]);


    return output;

  };

};
