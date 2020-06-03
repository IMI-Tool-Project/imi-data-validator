const generate = require("../main");
const expect = require('chai').expect;

const trim_metadata = (src) => {
  if (typeof src === 'string') return src;
  if (Array.isArray(src))
    return src.map(a => trim_metadata(a));
  const dst = {};
  Object.keys(src).filter(key => key !== "メタデータ").forEach(key => {
    dst[key] = trim_metadata(src[key]);
  });
  return dst;
};

const imi_core = require("fs").readFileSync(__dirname + "/imicore241.imiv.txt", "UTF-8");
const imi_hojin = `
#prefix ic: "http://imi.go.jp/ns/core/2#"
#prefix hj: "http://example.org/"
vocabulary "http://example.org/" ;

property hj:法人番号 {@xsd:string} ;
class hj:法人型 {@ic:法人型};
set hj:法人型>hj:法人番号;
`;

describe('imi-data-validator', () => {

  describe('基本構造', () => {

    const validate = generate(`${imi_core}
#prefix ic: "http://imi.go.jp/ns/core/2#"
datamodel;
use ic:事物型>ic:表記{0..n};
  `);

    describe('JSON-LD Context の付与', () => {
      it('@context がない場合は既定値を付与する', () => {
        expect(validate({
          "@type": "事物型",
          "表記": "テスト"
        })["@context"]).deep.equal([
          "https://imi.go.jp/ns/core/context.jsonld",
          "http://hojin-info.go.jp/ns/domain/biz/1/context.jsonld"
        ]);
      });

      it('コアのみの場合は追加する', () => {
        expect(validate({
          "@context": "https://imi.go.jp/ns/core/context.jsonld",
          "@type": "事物型",
          "表記": "テスト"
        })["@context"]).deep.equal([
          "https://imi.go.jp/ns/core/context.jsonld",
          "http://hojin-info.go.jp/ns/domain/biz/1/context.jsonld"
        ]);
      });

      it('法人のみの場合は追加する', () => {
        expect(validate({
          "@context": "http://hojin-info.go.jp/ns/domain/biz/1/context.jsonld",
          "@type": "事物型",
          "表記": "テスト"
        })["@context"]).deep.equal([
          "http://hojin-info.go.jp/ns/domain/biz/1/context.jsonld",
          "https://imi.go.jp/ns/core/context.jsonld"
        ]);
      });

      it('すでにそろっている場合には変更しない', () => {
        expect(validate({
          "@context": [
            "https://imi.go.jp/ns/core/context.jsonld",
            "http://hojin-info.go.jp/ns/domain/biz/1/context.jsonld"
          ],
          "@type": "事物型",
          "表記": "テスト"
        })["@context"]).deep.equal([
          "https://imi.go.jp/ns/core/context.jsonld",
          "http://hojin-info.go.jp/ns/domain/biz/1/context.jsonld"
        ]);
      });

      it('オブジェクト定義の場合は付与する', () => {
        expect(validate({
          "@context": {
            "ex": "http://example.org"
          },
          "@type": "事物型",
          "表記": "テスト"
        })["@context"]).deep.equal([{
            "ex": "http://example.org"
          },
          "https://imi.go.jp/ns/core/context.jsonld",
          "http://hojin-info.go.jp/ns/domain/biz/1/context.jsonld"
        ]);
      });

      it('他の context.jsonld がある場合は足りないものを追記', () => {
        expect(validate({
          "@context": "http://schema.org/",
          "@type": "事物型",
          "表記": "テスト"
        })["@context"]).deep.equal([
          "http://schema.org/",
          "https://imi.go.jp/ns/core/context.jsonld",
          "http://hojin-info.go.jp/ns/domain/biz/1/context.jsonld"
        ]);
      });
    });

    describe('メタデータの付与', () => {
      it('ルートインスタンスに対する正常終了', () => {
        const input = {
          "@type": "事物型",
          "表記": "テスト"
        };
        const result = validate(input);
        expect(result["メタデータ"]["種別"]).to.equal("INFO");
      });
      it('ルートインスタンスに対する警告', () => {
        const input = {
          "@type": "事物型",
          "表記": "テスト",
          "種別": "不要"
        };
        const result = validate(input);
        expect(result["メタデータ"]).to.have.lengthOf(2);
        expect(result["メタデータ"][0]["種別"]).to.equal("WARNING");
        expect(result["メタデータ"][1]["種別"]).to.equal("WARNING");
      });
      it('ルートインスタンスに対するエラー', () => {
        const input = {
          "@type": "場所型",
          "表記": "テスト"
        };
        const result = validate(input);
        expect(result["メタデータ"]).to.have.lengthOf(2);
        expect(result["メタデータ"][0]["種別"]).to.equal("ERROR");
        expect(result["メタデータ"][1]["種別"]).to.equal("ERROR");
      });
      it('graph 下のインスタンスに対する個別のメタデータ付与', () => {
        const input = {
          "@graph": [{
            "@type": "事物型",
            "表記": "テスト"
          }, {
            "@type": "事物型",
            "表記": "テスト",
            "種別": "不要"
          }, {
            "@type": "場所型",
            "表記": "テスト"
          }]
        };
        const result = validate(input);
        expect(result["@graph"][0]["メタデータ"]["種別"]).to.equal("INFO");
        expect(result["@graph"][1]["メタデータ"]).to.have.lengthOf(2);
        expect(result["@graph"][1]["メタデータ"][0]["種別"]).to.equal("WARNING");
        expect(result["@graph"][1]["メタデータ"][1]["種別"]).to.equal("WARNING");
        expect(result["@graph"][2]["メタデータ"]).to.have.lengthOf(2);
        expect(result["@graph"][2]["メタデータ"][0]["種別"]).to.equal("ERROR");
        expect(result["@graph"][2]["メタデータ"][1]["種別"]).to.equal("ERROR");
      });
      it('既存のメタデータは維持される', () => {
        const input = {
          "@type": "事物型",
          "表記": "テスト",
          "メタデータ": {
            "@type": "文書型",
            "種別": "最初から",
            "表記": "これは最初からあったものです"
          }
        };
        const result = validate(input);

        console.log(JSON.stringify(result, null, 2));
        expect(result["メタデータ"]).to.have.lengthOf(2);
        expect(result["メタデータ"][0]["種別"]).to.equal("最初から");
        expect(result["メタデータ"][1]["種別"]).to.equal("INFO");
      });

      it('既存のメタデータは維持される2', () => {
        const input = {
          "@type": "事物型",
          "表記": "テスト",
          "種別": "DELETEME",
          "メタデータ": {
            "@type": "文書型",
            "種別": "最初から",
            "表記": "これは最初からあったものです"
          }
        };
        const result = validate(input);

        console.log(JSON.stringify(result, null, 2));
        expect(result["メタデータ"]).to.have.lengthOf(3);
        expect(result["メタデータ"][0]["種別"]).to.equal("最初から");
        expect(result["メタデータ"][1]["種別"]).to.equal("WARNING");
        expect(result["メタデータ"][2]["種別"]).to.equal("WARNING");
      });
    });
  });

  describe('データモデルの評価: 基本構造', () => {

    const validate = generate(`${imi_core}
#prefix ic: "http://imi.go.jp/ns/core/2#"
datamodel;
use ic:場所型>ic:表記{1..1};
use ic:場所型>ic:地理座標{0..1};
use ic:場所型>ic:地理座標>ic:緯度{1..1};
use ic:場所型>ic:地理座標>ic:経度{1..1};
`);

    describe('プロパティの過不足', () => {


      it("充足している場合には INFO", () => {
        const input = {
          "@context": "https://imi.go.jp/ns/core/context.jsonld",
          "@type": "場所型",
          "表記": "東京タワー",
          "地理座標": {
            "@type": "座標型",
            "緯度": "+35.6585805",
            "経度": "+139.7454329"
          }
        };
        const expected = {
          "@context": [
            "https://imi.go.jp/ns/core/context.jsonld",
            "http://hojin-info.go.jp/ns/domain/biz/1/context.jsonld"
          ],
          "@type": "場所型",
          "表記": "東京タワー",
          "地理座標": {
            "@type": "座標型",
            "緯度": "+35.6585805",
            "経度": "+139.7454329"
          }
        };
        const result = validate(input);
        expect(result["メタデータ"]["種別"]).to.equal("INFO");
        expect(trim_metadata(result)).deep.equal(expected);
      });

      it("正常系に過剰なプロパティが付与された場合には削除して WARNING", () => {
        const input = {
          "@context": "https://imi.go.jp/ns/core/context.jsonld",
          "@type": "場所型",
          "種別": "観光地",
          "表記": "東京タワー",
          "地理座標": {
            "@type": "座標型",
            "種別": "代表点",
            "緯度": "+35.6585805",
            "経度": "+139.7454329"
          }
        };
        const expected = {
          "@context": [
            "https://imi.go.jp/ns/core/context.jsonld",
            "http://hojin-info.go.jp/ns/domain/biz/1/context.jsonld"
          ],
          "@type": "場所型",
          "表記": "東京タワー",
          "地理座標": {
            "@type": "座標型",
            "緯度": "+35.6585805",
            "経度": "+139.7454329"
          }
        };
        const result = validate(input);
        expect(result["メタデータ"]).to.have.lengthOf(2);
        expect(result["メタデータ"][0]["種別"]).to.equal("WARNING");
        expect(result["メタデータ"][1]["種別"]).to.equal("WARNING");
        expect(result["地理座標"]["メタデータ"]["種別"]).to.equal("WARNING");
        expect(trim_metadata(result)).deep.equal(expected);
      });

      it("必須プロパティが不足している場合には ERROR", () => {
        const input = {
          "@context": "https://imi.go.jp/ns/core/context.jsonld",
          "@type": "場所型",
          "地理座標": {
            "@type": "座標型",
            "緯度": "+35.6585805"
          }
        };
        const expected = {
          "@context": [
            "https://imi.go.jp/ns/core/context.jsonld",
            "http://hojin-info.go.jp/ns/domain/biz/1/context.jsonld"
          ],
          "@type": "場所型",
          "地理座標": {
            "@type": "座標型",
            "緯度": "+35.6585805"
          }
        };
        const result = validate(input);
        expect(result["メタデータ"]).to.have.lengthOf(2);
        expect(result["メタデータ"][0]["種別"]).to.equal("ERROR");
        expect(result["メタデータ"][1]["種別"]).to.equal("ERROR");
        expect(trim_metadata(result)).deep.equal(expected);
      });

    });

    describe("ルートクラスに対する評価", () => {

      it("インスタンスのルートに @type がない場合は補完して警告", () => {
        const input = {
          "@context": "https://imi.go.jp/ns/core/context.jsonld",
          "表記": "東京タワー",
          "地理座標": {
            "@type": "座標型",
            "緯度": "+35.6585805",
            "経度": "+139.7454329"
          }
        };
        const expected = {
          "@context": [
            "https://imi.go.jp/ns/core/context.jsonld",
            "http://hojin-info.go.jp/ns/domain/biz/1/context.jsonld"
          ],
          "@type": "場所型",
          "表記": "東京タワー",
          "地理座標": {
            "@type": "座標型",
            "緯度": "+35.6585805",
            "経度": "+139.7454329"
          }
        };
        const result = validate(input);
        expect(result["メタデータ"]).to.have.lengthOf(2);
        expect(result["メタデータ"][0]["種別"]).to.equal("WARNING");
        expect(result["メタデータ"][1]["種別"]).to.equal("WARNING");
        expect(trim_metadata(result)).deep.equal(expected);
      });


      it("ルートクラスがデータモデルのクラスと一致しない場合はエラー", () => {
        const input = {
          "@context": "https://imi.go.jp/ns/core/context.jsonld",
          "@type": "人型",
          "表記": "東京タワー",
          "地理座標": {
            "緯度": "+35.6585805",
            "経度": "+139.7454329"
          }
        };
        const expected = {
          "@context": [
            "https://imi.go.jp/ns/core/context.jsonld",
            "http://hojin-info.go.jp/ns/domain/biz/1/context.jsonld"
          ],
          "@type": "人型",
          "表記": "東京タワー",
          "地理座標": {
            "緯度": "+35.6585805",
            "経度": "+139.7454329"
          }
        };
        const result = validate(input);
        expect(result["メタデータ"]).to.have.lengthOf(2);
        expect(result["メタデータ"][0]["種別"]).to.equal("ERROR");
        expect(result["メタデータ"][1]["種別"]).to.equal("ERROR");
        expect(trim_metadata(result)).deep.equal(expected);

      });

    });

    describe("中間のクラスに対する評価", () => {

      it("中間のクラスに @type がない場合に語彙定義から補完して警告", () => {
        const input = {
          "@context": "https://imi.go.jp/ns/core/context.jsonld",
          "@type": "場所型",
          "表記": "東京タワー",
          "地理座標": {
            "緯度": "+35.6585805",
            "経度": "+139.7454329"
          }
        };
        const expected = {
          "@context": [
            "https://imi.go.jp/ns/core/context.jsonld",
            "http://hojin-info.go.jp/ns/domain/biz/1/context.jsonld"
          ],
          "@type": "場所型",
          "表記": "東京タワー",
          "地理座標": {
            "@type": "座標型",
            "緯度": "+35.6585805",
            "経度": "+139.7454329"
          }
        };
        const result = validate(input);
        expect(result["地理座標"]["メタデータ"]["種別"]).to.equal("WARNING");
        expect(result["メタデータ"]["種別"]).to.equal("WARNING");
        expect(trim_metadata(result)).deep.equal(expected);
      });

      it("中間のクラスに @type がない場合にデータモデル定義から補完して警告", () => {

        const validatePerson = generate(`${imi_core}
#prefix ic: "http://imi.go.jp/ns/core/2#"
datamodel;
use ic:関与型>ic:関与者{1..1}{@ic:人型};
use ic:関与型>ic:関与者>ic:姓名{1..1};
`);

        const input = {
          "@context": "https://imi.go.jp/ns/core/context.jsonld",
          "@type": "関与型",
          "関与者": {
            "姓名": "山田太郎"
          }
        };
        const expected = {
          "@context": [
            "https://imi.go.jp/ns/core/context.jsonld",
            "http://hojin-info.go.jp/ns/domain/biz/1/context.jsonld"
          ],
          "@type": "関与型",
          "関与者": {
            "@type": "人型",
            "姓名": "山田太郎"
          }
        };
        const result = validatePerson(input);
        expect(result["メタデータ"]["種別"]).to.equal("WARNING");
        expect(result["関与者"]["メタデータ"]["種別"]).to.equal("WARNING");
        expect(trim_metadata(result)).deep.equal(expected);
      });



      it("中間のクラスが語彙定義に反する場合はエラー", () => {
        const input = {
          "@context": "https://imi.go.jp/ns/core/context.jsonld",
          "@type": "場所型",
          "表記": "東京タワー",
          "地理座標": {
            "@type": "数量型",
            "緯度": "+35.6585805",
            "経度": "+139.7454329"
          }
        };
        const expected = {
          "@context": [
            "https://imi.go.jp/ns/core/context.jsonld",
            "http://hojin-info.go.jp/ns/domain/biz/1/context.jsonld"
          ],
          "@type": "場所型",
          "表記": "東京タワー",
          "地理座標": {
            "@type": "数量型",
            "緯度": "+35.6585805",
            "経度": "+139.7454329"
          }
        };
        const result = validate(input);
        expect(result["メタデータ"]["種別"]).to.equal("ERROR");
        expect(result["地理座標"]["メタデータ"]["種別"]).to.equal("ERROR");
        expect(trim_metadata(result)).deep.equal(expected);
      });


    });

    describe('複数のオブジェクト', () => {

      const datamodel = `${imi_core}
#prefix ic: "http://imi.go.jp/ns/core/2#"
datamodel;
use ic:人型>ic:名称{1..n};
use ic:人型>ic:名称>ic:種別{1..1};
use ic:人型>ic:名称>ic:表記{1..1};
`;

      const validate = generate(datamodel);

      it("単独", () => {
        const input = {
          "@context": "https://imi.go.jp/ns/core/context.jsonld",
          "@type": "人型",
          "名称": {
            "@type": "名称型",
            "種別": "本名",
            "表記": "ほんみょう"
          }
        };
        const expected = {
          "@context": [
            "https://imi.go.jp/ns/core/context.jsonld",
            "http://hojin-info.go.jp/ns/domain/biz/1/context.jsonld"
          ],
          "@type": "人型",
          "名称": {
            "@type": "名称型",
            "種別": "本名",
            "表記": "ほんみょう"
          }
        };
        const result = validate(input);
        expect(result["メタデータ"]["種別"]).to.equal("INFO");
        expect(trim_metadata(result)).deep.equal(expected);
      });

      it("複数", () => {
        const input = {
          "@context": "https://imi.go.jp/ns/core/context.jsonld",
          "@type": "人型",
          "名称": [{
            "@type": "名称型",
            "種別": "本名",
            "表記": "ほんみょう"
          }, {
            "@type": "名称型",
            "種別": "ペンネーム",
            "表記": "ペンネーム"
          }]
        };
        const expected = {
          "@context": [
            "https://imi.go.jp/ns/core/context.jsonld",
            "http://hojin-info.go.jp/ns/domain/biz/1/context.jsonld"
          ],
          "@type": "人型",
          "名称": [{
            "@type": "名称型",
            "種別": "本名",
            "表記": "ほんみょう"
          }, {
            "@type": "名称型",
            "種別": "ペンネーム",
            "表記": "ペンネーム"
          }]
        };
        const result = validate(input);
        expect(result["メタデータ"]["種別"]).to.equal("INFO");
        expect(trim_metadata(result)).deep.equal(expected);
      });

    });


    describe('複数のリテラル', () => {

      const datamodel = imi_core + `
#prefix ic: "http://imi.go.jp/ns/core/2#"
datamodel;
use ic:事物型>ic:種別{0..n};
`;

      const validate = generate(datamodel);

      it("単独", () => {
        const input = {
          "@context": "https://imi.go.jp/ns/core/context.jsonld",
          "@type": "事物型",
          "種別": "INFO"
        };
        const expected = {
          "@context": [
            "https://imi.go.jp/ns/core/context.jsonld",
            "http://hojin-info.go.jp/ns/domain/biz/1/context.jsonld"
          ],
          "@type": "事物型",
          "種別": "INFO"
        };
        const result = validate(input);
        expect(result["メタデータ"]["種別"]).to.equal("INFO");
        expect(trim_metadata(result)).deep.equal(expected);
      });

      it("複数", () => {
        const input = {
          "@context": "https://imi.go.jp/ns/core/context.jsonld",
          "@type": "事物型",
          "種別": ["INFO", "WARNING", "ERROR"]
        };
        const expected = {
          "@context": [
            "https://imi.go.jp/ns/core/context.jsonld",
            "http://hojin-info.go.jp/ns/domain/biz/1/context.jsonld"
          ],
          "@type": "事物型",
          "種別": ["INFO", "WARNING", "ERROR"]
        };
        const result = validate(input);
        expect(result["メタデータ"]["種別"]).to.equal("INFO");
        expect(trim_metadata(result)).deep.equal(expected);
      });

    });

    describe('抽象クラスのインスタンスでの具体化', () => {

      const datamodel = imi_core + `
#prefix ic: "http://imi.go.jp/ns/core/2#"
datamodel;
use ic:関与型>ic:関与者{1..1};
use ic:関与型>ic:関与者>ic:表記{1..1};
`;

      const validate = generate(datamodel);

      it("定義", () => {
        const input = {
          "@context": "https://imi.go.jp/ns/core/context.jsonld",
          "@type": "関与型",
          "関与者": {
            "@type": "実体型",
            "表記": "ロボット"
          }
        };
        const expected = {
          "@context": [
            "https://imi.go.jp/ns/core/context.jsonld",
            "http://hojin-info.go.jp/ns/domain/biz/1/context.jsonld"
          ],
          "@type": "関与型",
          "関与者": {
            "@type": "実体型",
            "表記": "ロボット"
          }
        };
        const result = validate(input);
        expect(result["メタデータ"]["種別"]).to.equal("INFO");
        expect(trim_metadata(result)).deep.equal(expected);
      });
      it("補完", () => {
        const input = {
          "@context": "https://imi.go.jp/ns/core/context.jsonld",
          "関与者": {
            "表記": "ロボット"
          }
        };
        const expected = {
          "@context": [
            "https://imi.go.jp/ns/core/context.jsonld",
            "http://hojin-info.go.jp/ns/domain/biz/1/context.jsonld"
          ],
          "@type": "関与型",
          "関与者": {
            "@type": "実体型",
            "表記": "ロボット"
          }
        };
        const result = validate(input);
        expect(result["メタデータ"]).to.have.lengthOf(2);
        expect(result["メタデータ"][0]["種別"]).to.equal("WARNING");
        expect(result["メタデータ"][1]["種別"]).to.equal("WARNING");
        expect(result["関与者"]["メタデータ"]["種別"]).to.equal("WARNING");
        expect(trim_metadata(result)).deep.equal(expected);
      });

      it("サブクラス1", () => {
        const input = {
          "@context": "https://imi.go.jp/ns/core/context.jsonld",
          "@type": "関与型",
          "関与者": {
            "@type": "法人型",
            "表記": "株式会社"
          }
        };
        const expected = {
          "@context": [
            "https://imi.go.jp/ns/core/context.jsonld",
            "http://hojin-info.go.jp/ns/domain/biz/1/context.jsonld"
          ],
          "@type": "関与型",
          "関与者": {
            "@type": "法人型",
            "表記": "株式会社"
          }
        };
        const result = validate(input);
        expect(result["メタデータ"]["種別"]).to.equal("INFO");
        expect(trim_metadata(result)).deep.equal(expected);
      });

      it("サブクラス2", () => {
        const input = {
          "@context": "https://imi.go.jp/ns/core/context.jsonld",
          "@type": "関与型",
          "関与者": {
            "@type": "人型",
            "表記": "ひと"
          }
        };
        const expected = {
          "@context": [
            "https://imi.go.jp/ns/core/context.jsonld",
            "http://hojin-info.go.jp/ns/domain/biz/1/context.jsonld"
          ],
          "@type": "関与型",
          "関与者": {
            "@type": "人型",
            "表記": "ひと"
          }
        };
        const result = validate(input);
        expect(result["メタデータ"]["種別"]).to.equal("INFO");
        expect(trim_metadata(result)).deep.equal(expected);
      });

    });

    describe('データモデルで指定された型制約の評価', () => {

      const datamodel = imi_core + imi_hojin + `
#prefix ic: "http://imi.go.jp/ns/core/2#"
datamodel;
use ic:関与型>ic:関与者>ic:表記{1..1};
use ic:関与型>ic:関与者{1..1}{@ic:法人型};
`;

      const validate = generate(datamodel);

      it("定義", () => {
        const input = {
          "@context": "https://imi.go.jp/ns/core/context.jsonld",
          "@type": "関与型",
          "関与者": {
            "@type": "法人型",
            "表記": "ほうじん"
          }
        };
        const expected = {
          "@context": [
            "https://imi.go.jp/ns/core/context.jsonld",
            "http://hojin-info.go.jp/ns/domain/biz/1/context.jsonld"
          ],
          "@type": "関与型",
          "関与者": {
            "@type": "法人型",
            "表記": "ほうじん"
          }
        };
        const result = validate(input);
        expect(result["メタデータ"]["種別"]).to.equal("INFO");
        expect(trim_metadata(result)).deep.equal(expected);
      });
      it("補完", () => {
        const input = {
          "@context": "https://imi.go.jp/ns/core/context.jsonld",
          "関与者": {
            "表記": "ほうじん"
          }
        };
        const expected = {
          "@context": [
            "https://imi.go.jp/ns/core/context.jsonld",
            "http://hojin-info.go.jp/ns/domain/biz/1/context.jsonld"
          ],
          "@type": "関与型",
          "関与者": {
            "@type": "法人型",
            "表記": "ほうじん"
          }
        };
        const result = validate(input);
        expect(result["メタデータ"]).to.have.lengthOf(2);
        expect(result["メタデータ"][0]["種別"]).to.equal("WARNING");
        expect(result["メタデータ"][1]["種別"]).to.equal("WARNING");
        expect(result["関与者"]["メタデータ"]["種別"]).to.equal("WARNING");
        expect(trim_metadata(result)).deep.equal(expected);
      });

      it("親クラス", () => {
        const input = {
          "@context": "https://imi.go.jp/ns/core/context.jsonld",
          "@type": "関与型",
          "関与者": {
            "@type": "実体型",
            "表記": "エージェント"
          }
        };
        const expected = {
          "@context": [
            "https://imi.go.jp/ns/core/context.jsonld",
            "http://hojin-info.go.jp/ns/domain/biz/1/context.jsonld"
          ],
          "@type": "関与型",
          "関与者": {
            "@type": "実体型",
            "表記": "エージェント"
          }
        };
        const result = validate(input);
        expect(result["メタデータ"]["種別"]).to.equal("ERROR");
        expect(result["関与者"]["メタデータ"]["種別"]).to.equal("ERROR");
        expect(trim_metadata(result)).deep.equal(expected);
      });

      it("兄弟クラス", () => {
        const input = {
          "@context": "https://imi.go.jp/ns/core/context.jsonld",
          "@type": "関与型",
          "関与者": {
            "@type": "人型",
            "表記": "ひと"
          }
        };
        const expected = {
          "@context": [
            "https://imi.go.jp/ns/core/context.jsonld",
            "http://hojin-info.go.jp/ns/domain/biz/1/context.jsonld"
          ],
          "@type": "関与型",
          "関与者": {
            "@type": "人型",
            "表記": "ひと"
          }
        };
        const result = validate(input);
        expect(result["メタデータ"]["種別"]).to.equal("ERROR");
        expect(result["関与者"]["メタデータ"]["種別"]).to.equal("ERROR");
        expect(trim_metadata(result)).deep.equal(expected);
      });

      it("サブクラス", () => {
        const input = {
          "@context": "https://imi.go.jp/ns/core/context.jsonld",
          "@type": "関与型",
          "関与者": {
            "@type": "hj:法人型",
            "表記": "ほうじん"
          }
        };
        const expected = {
          "@context": [
            "https://imi.go.jp/ns/core/context.jsonld",
            "http://hojin-info.go.jp/ns/domain/biz/1/context.jsonld"
          ],
          "@type": "関与型",
          "関与者": {
            "@type": "hj:法人型",
            "表記": "ほうじん"
          }
        };
        const result = validate(input);
        expect(result["メタデータ"]["種別"]).to.equal("INFO");
        expect(trim_metadata(result)).deep.equal(expected);
      });

    });

  });

  describe('カーディナリティ', () => {


    describe('カーディナリティ{1..1}', () => {

      const datamodel = imi_core + `
#prefix ic: "http://imi.go.jp/ns/core/2#"
datamodel;
use ic:ID型>ic:識別値{1..1};
`;

      const validate = generate(datamodel);

      it("充足の場合は INFO", () => {
        const input = {
          "@context": "https://imi.go.jp/ns/core/context.jsonld",
          "@type": "ID型",
          "識別値": "1"
        };
        const expected = {
          "@context": [
            "https://imi.go.jp/ns/core/context.jsonld",
            "http://hojin-info.go.jp/ns/domain/biz/1/context.jsonld"
          ],
          "@type": "ID型",
          "識別値": "1"
        };
        const result = validate(input);
        expect(result["メタデータ"]["種別"]).to.equal("INFO");
        expect(trim_metadata(result)).deep.equal(expected);
      });

      it("不足の場合は エラー", () => {
        const input = {
          "@context": "https://imi.go.jp/ns/core/context.jsonld",
          "@type": "ID型"
        };
        const result = validate(input);
        expect(result["メタデータ"]).to.have.lengthOf(2);
        expect(result["メタデータ"][0]["種別"]).to.equal("ERROR");
        expect(result["メタデータ"][1]["種別"]).to.equal("ERROR");
      });

      it("過剰な場合はエラー", () => {
        const input = {
          "@context": "https://imi.go.jp/ns/core/context.jsonld",
          "@type": "ID型",
          "識別値": ["1", "2", "3"]
        };
        const result = validate(input);
        expect(result["メタデータ"]).to.have.lengthOf(2);
        expect(result["メタデータ"][0]["種別"]).to.equal("ERROR");
        expect(result["メタデータ"][1]["種別"]).to.equal("ERROR");
      });

    });


  });

  describe('使用可能文字制約', () => {

    // 使用文字制約

    describe('文字制約:https://imi.go.jp/CommonCharacterSets/ISOIEC10646Annex-G-supplement-NUMERIC-compliant', () => {

      const datamodel = imi_core + `
#prefix ic: "http://imi.go.jp/ns/core/2#"
datamodel;
use ic:住所型>ic:郵便番号{1..n}{$"https://imi.go.jp/CommonCharacterSets/ISOIEC10646Annex-G-supplement-NUMERIC-compliant"};
`;

      const validate = generate(datamodel);

      it("充足", () => {
        const input = {
          "@context": "https://imi.go.jp/ns/core/context.jsonld",
          "@type": "住所型",
          "郵便番号": "1234567"
        };
        const expected = {
          "@context": [
            "https://imi.go.jp/ns/core/context.jsonld",
            "http://hojin-info.go.jp/ns/domain/biz/1/context.jsonld"
          ],
          "@type": "住所型",
          "郵便番号": "1234567"
        };
        const result = validate(input);
        expect(result["メタデータ"]["種別"]).to.equal("INFO");
        expect(trim_metadata(result)).deep.equal(expected);
      });

      it("逸脱", () => {
        const input = {
          "@context": "https://imi.go.jp/ns/core/context.jsonld",
          "@type": "住所型",
          "郵便番号": "不明"
        };
        const expected = {
          "@context": [
            "https://imi.go.jp/ns/core/context.jsonld",
            "http://hojin-info.go.jp/ns/domain/biz/1/context.jsonld"
          ],
          "@type": "住所型",
          "郵便番号": "不明"
        };
        const result = validate(input);
        expect(result["メタデータ"]).to.have.lengthOf(2);
        expect(result["メタデータ"][0]["種別"]).to.equal("ERROR");
        expect(result["メタデータ"][1]["種別"]).to.equal("ERROR");
        expect(trim_metadata(result)).deep.equal(expected);
      });

      it("修復後の成功(全角数字から半角数字)", () => {
        const input = {
          "@context": "https://imi.go.jp/ns/core/context.jsonld",
          "@type": "住所型",
          "郵便番号": "１２３４５６７"
        };
        const expected = {
          "@context": [
            "https://imi.go.jp/ns/core/context.jsonld",
            "http://hojin-info.go.jp/ns/domain/biz/1/context.jsonld"
          ],
          "@type": "住所型",
          "郵便番号": "1234567"
        };
        const result = validate(input);
        expect(result["メタデータ"]).to.have.lengthOf(2);
        expect(result["メタデータ"][0]["種別"]).to.equal("WARNING");
        expect(result["メタデータ"][1]["種別"]).to.equal("WARNING");
        expect(trim_metadata(result)).deep.equal(expected);

      });

      it("修復後の失敗(全角数字から半角数字)", () => {
        const input = {
          "@context": "https://imi.go.jp/ns/core/context.jsonld",
          "@type": "住所型",
          "郵便番号": "１２３の４５６７"
        };
        const expected = {
          "@context": [
            "https://imi.go.jp/ns/core/context.jsonld",
            "http://hojin-info.go.jp/ns/domain/biz/1/context.jsonld"
          ],
          "@type": "住所型",
          "郵便番号": "１２３の４５６７"
        };
        const result = validate(input);
        expect(result["メタデータ"]).to.have.lengthOf(2);
        expect(result["メタデータ"][0]["種別"]).to.equal("ERROR");
        expect(result["メタデータ"][1]["種別"]).to.equal("ERROR");
        expect(trim_metadata(result)).deep.equal(expected);
      });

      it("複数", () => {
        const input = {
          "@context": "https://imi.go.jp/ns/core/context.jsonld",
          "@type": "住所型",
          "郵便番号": ["９８７６５４３", "１２３４５６７"]
        };
        const expected = {
          "@context": [
            "https://imi.go.jp/ns/core/context.jsonld",
            "http://hojin-info.go.jp/ns/domain/biz/1/context.jsonld"
          ],
          "@type": "住所型",
          "郵便番号": ["9876543", "1234567"]
        };
        const result = validate(input);
        expect(result["メタデータ"]).to.have.lengthOf(3);
        expect(result["メタデータ"][0]["種別"]).to.equal("WARNING");
        expect(result["メタデータ"][1]["種別"]).to.equal("WARNING");
        expect(result["メタデータ"][2]["種別"]).to.equal("WARNING");
        expect(trim_metadata(result)).deep.equal(expected);
      });

    });

    describe('文字制約:https://imi.go.jp/CommonCharacterSets/ISOIEC10646Annex-G-supplement-KATAKANA-compliant', () => {

      const datamodel = imi_core + `
#prefix ic: "http://imi.go.jp/ns/core/2#"
datamodel;
use ic:名称型>ic:カナ表記{1..n}{$"https://imi.go.jp/CommonCharacterSets/ISOIEC10646Annex-G-supplement-KATAKANA-compliant"};
`;

      const validate = generate(datamodel);

      it("充足", () => {
        const input = {
          "@context": "https://imi.go.jp/ns/core/context.jsonld",
          "@type": "名称型",
          "カナ表記": "プレミアムティーバッグ"
        };
        const expected = {
          "@context": [
            "https://imi.go.jp/ns/core/context.jsonld",
            "http://hojin-info.go.jp/ns/domain/biz/1/context.jsonld"
          ],
          "@type": "名称型",
          "カナ表記": "プレミアムティーバッグ"
        };
        const result = validate(input);
        expect(result["メタデータ"]["種別"]).to.equal("INFO");
        expect(trim_metadata(result)).deep.equal(expected);
      });

      it("逸脱", () => {
        const input = {
          "@context": "https://imi.go.jp/ns/core/context.jsonld",
          "@type": "名称型",
          "カナ表記": "おーいお茶プレミアムティーバッグ"
        };
        const expected = {
          "@context": [
            "https://imi.go.jp/ns/core/context.jsonld",
            "http://hojin-info.go.jp/ns/domain/biz/1/context.jsonld"
          ],
          "@type": "名称型",
          "カナ表記": "おーいお茶プレミアムティーバッグ"
        };
        const result = validate(input);
        expect(result["メタデータ"]).to.have.lengthOf(2);
        expect(result["メタデータ"][0]["種別"]).to.equal("ERROR");
        expect(result["メタデータ"][1]["種別"]).to.equal("ERROR");
        expect(trim_metadata(result)).deep.equal(expected);
      });

      it("修復後の成功(半角カナから全角カナ)", () => {
        const input = {
          "@context": "https://imi.go.jp/ns/core/context.jsonld",
          "@type": "名称型",
          "カナ表記": "ﾌﾟﾚﾐｱﾑﾃｨｰﾊﾞｯｸﾞ"
        };
        const expected = {
          "@context": [
            "https://imi.go.jp/ns/core/context.jsonld",
            "http://hojin-info.go.jp/ns/domain/biz/1/context.jsonld"
          ],
          "@type": "名称型",
          "カナ表記": "プレミアムティーバッグ"
        };
        const result = validate(input);
        expect(result["メタデータ"]).to.have.lengthOf(2);
        expect(result["メタデータ"][0]["種別"]).to.equal("WARNING");
        expect(result["メタデータ"][1]["種別"]).to.equal("WARNING");
        expect(trim_metadata(result)).deep.equal(expected);
      });

      it("修復後の失敗(半角カナから全角カナ)", () => {
        const input = {
          "@context": "https://imi.go.jp/ns/core/context.jsonld",
          "@type": "名称型",
          "カナ表記": "おーいお茶ﾌﾟﾚﾐｱﾑﾃｨｰﾊﾞｯｸﾞ"
        };
        const expected = {
          "@context": [
            "https://imi.go.jp/ns/core/context.jsonld",
            "http://hojin-info.go.jp/ns/domain/biz/1/context.jsonld"
          ],
          "@type": "名称型",
          "カナ表記": "おーいお茶ﾌﾟﾚﾐｱﾑﾃｨｰﾊﾞｯｸﾞ"
        };
        const result = validate(input);
        expect(result["メタデータ"]).to.have.lengthOf(2);
        expect(result["メタデータ"][0]["種別"]).to.equal("ERROR");
        expect(result["メタデータ"][1]["種別"]).to.equal("ERROR");
        expect(trim_metadata(result)).deep.equal(expected);
      });

      it("複数", () => {
        const input = {
          "@context": "https://imi.go.jp/ns/core/context.jsonld",
          "@type": "名称型",
          "カナ表記": ["ﾌﾟﾚﾐｱﾑ", "ﾃｨｰﾊﾞｯｸﾞ"]
        };
        const expected = {
          "@context": [
            "https://imi.go.jp/ns/core/context.jsonld",
            "http://hojin-info.go.jp/ns/domain/biz/1/context.jsonld"
          ],
          "@type": "名称型",
          "カナ表記": ["プレミアム", "ティーバッグ"]
        };
        const result = validate(input);
        expect(result["メタデータ"]).to.have.lengthOf(3);
        expect(result["メタデータ"][0]["種別"]).to.equal("WARNING");
        expect(result["メタデータ"][1]["種別"]).to.equal("WARNING");
        expect(result["メタデータ"][2]["種別"]).to.equal("WARNING");
        expect(trim_metadata(result)).deep.equal(expected);
      });

    });

    describe('文字制約:JIS第一第二水準のみを受容', () => {

      const datamodel = imi_core + `
#prefix ic: "http://imi.go.jp/ns/core/2#"
datamodel;
use ic:事物型>ic:表記{1..n}{$"https://imi.go.jp/CommonCharacterSets/ISOIEC10646-CJK-JISX0208-1990-compliant"} ;
`;

      const validate = generate(datamodel);

      it("JIS第一第二水準のみ", () => {
        const input = {
          "@context": "https://imi.go.jp/ns/core/context.jsonld",
          "@type": "事物型",
          "表記": "喜怒哀楽"
        };
        const expected = {
          "@context": [
            "https://imi.go.jp/ns/core/context.jsonld",
            "http://hojin-info.go.jp/ns/domain/biz/1/context.jsonld"
          ],
          "@type": "事物型",
          "表記": "喜怒哀楽"
        };
        const result = validate(input);
        expect(result["メタデータ"]["種別"]).to.equal("INFO");
        expect(trim_metadata(result)).deep.equal(expected);
      });

      it("JIS第三水準のみ", () => {
        const input = {
          "@context": "https://imi.go.jp/ns/core/context.jsonld",
          "@type": "事物型",
          "表記": "㐂"
        };
        const expected = {
          "@context": [
            "https://imi.go.jp/ns/core/context.jsonld",
            "http://hojin-info.go.jp/ns/domain/biz/1/context.jsonld"
          ],
          "@type": "事物型",
          "表記": "㐂"
        };
        const result = validate(input);
        expect(result["メタデータ"]).to.have.lengthOf(2);
        expect(result["メタデータ"][0]["種別"]).to.equal("ERROR");
        expect(result["メタデータ"][1]["種別"]).to.equal("ERROR");
        expect(trim_metadata(result)).deep.equal(expected);
      });

      it("混在", () => {
        const input = {
          "@context": "https://imi.go.jp/ns/core/context.jsonld",
          "@type": "事物型",
          "表記": "㐂喜"
        };
        const expected = {
          "@context": [
            "https://imi.go.jp/ns/core/context.jsonld",
            "http://hojin-info.go.jp/ns/domain/biz/1/context.jsonld"
          ],
          "@type": "事物型",
          "表記": "㐂喜"
        };
        const result = validate(input);
        expect(result["メタデータ"]).to.have.lengthOf(2);
        expect(result["メタデータ"][0]["種別"]).to.equal("ERROR");
        expect(result["メタデータ"][1]["種別"]).to.equal("ERROR");
        expect(trim_metadata(result)).deep.equal(expected);
      });

    });


    describe('文字制約:JIS第一第二水準のみを推奨、JIS第三第四は警告', () => {

      const datamodel = imi_core + `
#prefix ic: "http://imi.go.jp/ns/core/2#"
datamodel;
use ic:事物型>ic:表記{1..n}{$"https://imi.go.jp/CommonCharacterSets/ISOIEC10646-CJK-JISX0208-1990-compliant|
[NotRecommended]https://imi.go.jp/CommonCharacterSets/ISOIEC10646-CJK-JISX0213-2004-compliant"} ;
`;

      const validate = generate(datamodel);

      it("JIS第一第二水準のみ", () => {
        const input = {
          "@context": "https://imi.go.jp/ns/core/context.jsonld",
          "@type": "事物型",
          "表記": "喜"
        };
        const expected = {
          "@context": [
            "https://imi.go.jp/ns/core/context.jsonld",
            "http://hojin-info.go.jp/ns/domain/biz/1/context.jsonld"
          ],
          "@type": "事物型",
          "表記": "喜"
        };
        const result = validate(input);
        expect(result["メタデータ"]["種別"]).to.equal("INFO");
        expect(trim_metadata(result)).deep.equal(expected);
      });

      it("JIS第三水準のみ", () => {

        const input = {
          "@context": "https://imi.go.jp/ns/core/context.jsonld",
          "@type": "事物型",
          "表記": "㐂"
        };
        const expected = {
          "@context": [
            "https://imi.go.jp/ns/core/context.jsonld",
            "http://hojin-info.go.jp/ns/domain/biz/1/context.jsonld"
          ],
          "@type": "事物型",
          "表記": "㐂"
        };
        const result = validate(input);
        expect(result["メタデータ"]).to.have.lengthOf(2);
        expect(result["メタデータ"][0]["種別"]).to.equal("WARNING");
        expect(result["メタデータ"][1]["種別"]).to.equal("WARNING");
        expect(trim_metadata(result)).deep.equal(expected);
      });

      it("混在", () => {
        const input = {
          "@context": "https://imi.go.jp/ns/core/context.jsonld",
          "@type": "事物型",
          "表記": "㐂喜"
        };
        const expected = {
          "@context": [
            "https://imi.go.jp/ns/core/context.jsonld",
            "http://hojin-info.go.jp/ns/domain/biz/1/context.jsonld"
          ],
          "@type": "事物型",
          "表記": "㐂喜"
        };
        const result = validate(input);
        expect(result["メタデータ"]).to.have.lengthOf(2);
        expect(result["メタデータ"][0]["種別"]).to.equal("WARNING");
        expect(result["メタデータ"][1]["種別"]).to.equal("WARNING");
        expect(trim_metadata(result)).deep.equal(expected);
      });

    });

  });

  describe('グループ', () => {

    describe('グループ名と種別名が対応づくパターン', () => {

      const datamodel = imi_core + `
#prefix ic: "http://imi.go.jp/ns/core/2#"
datamodel;
use ic:人型>ic:氏名[本名]{1..1};
use ic:人型>ic:氏名[本名]>ic:姓名{1..1};
use ic:人型>ic:氏名[本名]>ic:種別{1..1}{='本名'};
use ic:人型>ic:氏名[ペンネーム]{0..n};
use ic:人型>ic:氏名[ペンネーム]>ic:表記{1..1};
use ic:人型>ic:氏名[ペンネーム]>ic:種別{1..1}{='ペンネーム'};
`;

      const validate = generate(datamodel);

      it("本名のみ", () => {
        const result = validate({
          "@type": "人型",
          "氏名": {
            "@type": "氏名型",
            "種別": "本名",
            "姓名": "夏目金之助"
          }
        });
        expect(result["メタデータ"]["種別"]).to.equal("INFO");
      });

      it("両方ある", () => {
        const result = validate({
          "@type": "人型",
          "氏名": [{
            "@type": "氏名型",
            "種別": "本名",
            "姓名": "夏目金之助"
          }, {
            "@type": "氏名型",
            "種別": "ペンネーム",
            "表記": "夏目漱石"
          }]
        });
        expect(result["メタデータ"]["種別"]).to.equal("INFO");
      });

      it("ペンネームが複数ある", () => {
        const result = validate({
          "@type": "人型",
          "氏名": [{
            "@type": "氏名型",
            "種別": "本名",
            "姓名": "夏目金之助"
          }, {
            "@type": "氏名型",
            "種別": "ペンネーム",
            "表記": "夏目漱石"
          }, {
            "@type": "氏名型",
            "種別": "ペンネーム",
            "表記": "なつめそうせき"
          }]
        });
        expect(result["メタデータ"]["種別"]).to.equal("INFO");
      })

      it("本名がない", () => {
        const result = validate({
          "@type": "人型",
          "氏名": {
            "@type": "氏名型",
            "種別": "ペンネーム",
            "表記": "夏目漱石"
          }
        });
        expect(result["メタデータ"]).to.have.lengthOf(2);
        expect(result["メタデータ"][0]["種別"]).to.equal("ERROR");
        expect(result["メタデータ"][1]["種別"]).to.equal("ERROR");
      });

      it("本名に姓名がない", () => {
        const result = validate({
          "@type": "人型",
          "氏名": {
            "@type": "氏名型",
            "種別": "本名",
            "表記": "夏目漱石"
          }
        });
        expect(result["メタデータ"]["種別"]).to.equal("ERROR");
        expect(result["氏名"]["メタデータ"]).to.have.lengthOf(2);
        expect(result["氏名"]["メタデータ"][0]["種別"]).to.equal("ERROR");
        expect(result["氏名"]["メタデータ"][1]["種別"]).to.equal("WARNING");
      });

    });

  });

  describe('オプション', () => {

    describe('自動修復の無効化', () => {
      const validate = generate(`${imi_core}
#prefix ic: "http://imi.go.jp/ns/core/2#"
datamodel;
use ic:住所型>ic:表記{0..1};
use ic:住所型>ic:郵便番号{0..1}{$"https://imi.go.jp/CommonCharacterSets/ISOIEC10646Annex-G-supplement-NUMERIC-compliant"};
use ic:住所型>ic:ビル名{0..1}{$"https://imi.go.jp/CommonCharacterSets/ISOIEC10646Annex-G-supplement-KATAKANA-compliant"};
use ic:住所型>ic:種別コード{0..1};
use ic:住所型>ic:種別コード>ic:表記{0..1};
  `, {
        "disable_auto_fix": true
      });


      it('ルートクラス名の省略がエラーになること', () => {
        const result = validate({
          "表記": "テスト"
        });
        expect(result["メタデータ"]).to.have.lengthOf(2);
        expect(result["メタデータ"][0]["種別"]).to.equal("ERROR");
        expect(result["メタデータ"][1]["種別"]).to.equal("ERROR");
      });

      it('下位クラスのクラス名省略がエラーになること', () => {
        const result = validate({
          "@type": "住所型",
          "表記": "テスト",
          "種別コード": {
            "表記": "本社住所"
          }
        });
        expect(result["メタデータ"]["種別"]).to.equal("ERROR");
        expect(result["種別コード"]["メタデータ"]["種別"]).to.equal("ERROR");
      });

      it('全角数字の修復がおこなわれずエラーになること', () => {
        const result = validate({
          "@type": "住所型",
          "表記": "テスト",
          "郵便番号": "１２３４５６７"
        });
        expect(result["メタデータ"]).to.have.lengthOf(2);
        expect(result["メタデータ"][0]["種別"]).to.equal("ERROR");
        expect(result["メタデータ"][1]["種別"]).to.equal("ERROR");
        expect(result["郵便番号"]).to.equal("１２３４５６７");
      });

      it('半角カナの修復がおこなわれずエラーになること', () => {
        const result = validate({
          "@type": "住所型",
          "表記": "テスト",
          "ビル名": "ﾛｯﾎﾟﾝｷﾞﾋﾙｽﾞ"
        });
        expect(result["メタデータ"]).to.have.lengthOf(2);
        expect(result["メタデータ"][0]["種別"]).to.equal("ERROR");
        expect(result["メタデータ"][1]["種別"]).to.equal("ERROR");
        expect(result["ビル名"]).to.equal("ﾛｯﾎﾟﾝｷﾞﾋﾙｽﾞ");
      });

    });
  });

});
