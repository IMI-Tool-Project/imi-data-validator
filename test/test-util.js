const Util = require("../lib/util");
const expect = require('chai').expect;

describe('imi-data-validator#util', () => {

  describe('datatype', () => {
    describe('xsd:integer', () => {
      it('正常', () => {
        expect(Util.datatype("xsd:integer", "-256")).deep.equal({
          "種別": "INFO"
        });
      });
      it('異常', () => {
        expect(Util.datatype("xsd:integer", "0256")).deep.equal({
          "種別": "ERROR",
          "説明": "xsd:integer ではありません"
        });
      });
    });
    describe('xsd:nonNegativeInteger', () => {
      it('正常', () => {
        expect(Util.datatype("xsd:nonNegativeInteger", "256")).deep.equal({
          "種別": "INFO"
        });
      });
      it('異常', () => {
        expect(Util.datatype("xsd:nonNegativeInteger", "-256")).deep.equal({
          "種別": "ERROR",
          "説明": "xsd:nonNegativeInteger ではありません"
        });
      });
    });
    describe('xsd:date', () => {
      it('正常', () => {
        expect(Util.datatype("xsd:date", "2019-12-31")).deep.equal({
          "種別": "INFO"
        });
      });
      it('異常', () => {
        expect(Util.datatype("xsd:date", "2019年12月31日")).deep.equal({
          "種別": "ERROR",
          "説明": "xsd:date ではありません"
        });
      });
    });
  });

  describe('eq', () => {
    describe('文字列', () => {
      it('正常', () => {
        expect(Util.eq("Hello", "Hello")).deep.equal({
          "種別": "INFO"
        });
      });
      it('異常', () => {
        expect(Util.eq("Hello", "World")).deep.equal({
          "種別": "ERROR",
          "説明": "Hello でなければなりません"
        });
      });
    });
  });

  describe('lt', () => {
    describe('数値', () => {
      it('>', () => {
        expect(Util.lt("5", "4")).deep.equal({
          "種別": "INFO"
        });
      });
      it('=', () => {
        expect(Util.lt("5", "5")).deep.equal({
          "種別": "ERROR",
          "説明": "5 より小さくなければいけません"
        });
      });
      it('<', () => {
        expect(Util.lt("5", "6")).deep.equal({
          "種別": "ERROR",
          "説明": "5 より小さくなければいけません"
        });
      });
    });
    describe('非数値', () => {
      it('文字列', () => {
        expect(Util.lt("5", "world")).deep.equal({
          "種別": "ERROR",
          "説明": "数値ではありません"
        });
      });
    });
  });

  describe('le', () => {
    describe('数値', () => {
      it('>', () => {
        expect(Util.le("5", "4")).deep.equal({
          "種別": "INFO"
        });
      });
      it('=', () => {
        expect(Util.le("5", "5")).deep.equal({
          "種別": "INFO"
        });
      });
      it('<', () => {
        expect(Util.le("5", "6")).deep.equal({
          "種別": "ERROR",
          "説明": "5 以下でなければいけません"
        });
      });
    });
    describe('非数値', () => {
      it('文字列', () => {
        expect(Util.le("5", "world")).deep.equal({
          "種別": "ERROR",
          "説明": "数値ではありません"
        });
      });
    });
  });

  describe('gt', () => {
    describe('数値', () => {
      it('>', () => {
        expect(Util.gt("5", "4")).deep.equal({
          "種別": "ERROR",
          "説明": "5 より大きくなければいけません"
        });
      });
      it('=', () => {
        expect(Util.gt("5", "5")).deep.equal({
          "種別": "ERROR",
          "説明": "5 より大きくなければいけません"
        });
      });
      it('<', () => {
        expect(Util.gt("5", "6")).deep.equal({
          "種別": "INFO"
        });
      });
    });
    describe('非数値', () => {
      it('文字列', () => {
        expect(Util.gt("5", "world")).deep.equal({
          "種別": "ERROR",
          "説明": "数値ではありません"
        });
      });
    });
  });

  describe('ge', () => {
    describe('数値', () => {
      it('>', () => {
        expect(Util.ge("5", "4")).deep.equal({
          "種別": "ERROR",
          "説明": "5 以上でなければいけません"
        });
      });
      it('=', () => {
        expect(Util.ge("5", "5")).deep.equal({
          "種別": "INFO"
        });
      });
      it('<', () => {
        expect(Util.ge("5", "6")).deep.equal({
          "種別": "INFO"
        });
      });
    });
    describe('非数値', () => {
      it('文字列', () => {
        expect(Util.ge("5", "world")).deep.equal({
          "種別": "ERROR",
          "説明": "数値ではありません"
        });
      });
    });
  });

  describe('pattern', () => {
    it('正常', () => {
      expect(Util.pattern("^[0-9]{5}$", "01234")).deep.equal({
        "種別": "INFO"
      });
    });
    it('失敗', () => {
      expect(Util.pattern("^[0-9]{5}$", "0123456789")).deep.equal({
        "種別": "ERROR",
        "説明": "正規表現 ^[0-9]{5}$ に適合しません"
      });
    });
  });

  describe('charsets', () => {
    const KATAKANA = "https://imi.go.jp/CommonCharacterSets/ISOIEC10646Annex-G-supplement-KATAKANA-compliant";
    const NUMERIC = "https://imi.go.jp/CommonCharacterSets/ISOIEC10646Annex-G-supplement-NUMERIC-compliant";

    describe('全角カナ', () => {
      const uri = KATAKANA;
      it("正常", () => {
        expect(Util.charset(uri, "アカサタナ")).deep.equal({
          "種別": "INFO"
        });
      });
      it("異常", () => {
        expect(Util.charset(uri, "アカサタナはまやらわ")).deep.equal({
          "種別": "ERROR",
          "説明": "[IMIユーティリティ文字セット－カナ（全角）] で規定されていない文字が使用されています"
        });
      });
      it("修復", () => {
        expect(Util.charset(uri, "ｱｶｻﾀﾅ")).deep.equal([{
          "種別": "ERROR",
          "説明": "[IMIユーティリティ文字セット－カナ（全角）] で規定されていない文字が使用されています"
        }, {
          "種別": "WARNING",
          "説明": "[IMIユーティリティ文字セット－カナ（全角）] で規定されていない文字が使用されていましたが、半角カナ／全角カナ変換によって修正されました",
          "値": "アカサタナ"
        }]);
      });
    });
    describe('数字', () => {
      const uri = NUMERIC;
      it("正常", () => {
        expect(Util.charset(uri, "0123456789")).deep.equal({
          "種別": "INFO"
        });
      });
      it("異常", () => {
        expect(Util.charset(uri, "アカサタナはまやらわ")).deep.equal({
          "種別": "ERROR",
          "説明": "[IMIユーティリティ文字セット－数字] で規定されていない文字が使用されています"
        });
      });
      it("修復", () => {
        expect(Util.charset(uri, "０１２３４５6789")).deep.equal([{
          "種別": "ERROR",
          "説明": "[IMIユーティリティ文字セット－数字] で規定されていない文字が使用されています"
        }, {
          "種別": "WARNING",
          "説明": "[IMIユーティリティ文字セット－数字] で規定されていない文字が使用されていましたが、全角数字／半角数字変換によって修正されました",
          "値": "0123456789"
        }]);
      });
    });
    describe('非推奨', () => {
      const uri = "[NotRecommended]" + KATAKANA;
      it("正常", () => {
        expect(Util.charset(uri, "01234")).deep.equal({
          "種別": "INFO"
        });
      });
      it("非推奨のみ", () => {
        expect(Util.charset(uri, "アカサタナ")).deep.equal({
          "種別": "WARNING",
          "説明": "[IMIユーティリティ文字セット－カナ（全角）] で規定された非推奨文字が使用されています"
        });
      });
      it("混在", () => {
        expect(Util.charset(uri, "01234アカサタナ")).deep.equal({
          "種別": "WARNING",
          "説明": "[IMIユーティリティ文字セット－カナ（全角）] で規定された非推奨文字が使用されています"
        });
      });
    });

    describe('推奨・非推奨混在', () => {
      const uri = NUMERIC + "|[NotRecommended]" + KATAKANA;
      it("推奨", () => {
        expect(Util.charset(uri, "01234")).deep.equal({
          "種別": "INFO"
        });
      });
      it("非推奨", () => {
        expect(Util.charset(uri, "アカサタナ")).deep.equal({
          "種別": "WARNING",
          "説明": "[IMIユーティリティ文字セット－カナ（全角）] で規定された非推奨文字が使用されています"
        });
      });
      it("推奨・非推奨", () => {
        expect(Util.charset(uri, "01234アカサタナ")).deep.equal({
          "種別": "WARNING",
          "説明": "[IMIユーティリティ文字セット－カナ（全角）] で規定された非推奨文字が使用されています"
        });
      });
      it("推奨・禁止", () => {
        expect(Util.charset(uri, "01234abcde")).deep.equal({
          "種別": "ERROR",
          "説明": "[IMIユーティリティ文字セット－数字,IMIユーティリティ文字セット－カナ（全角）] で規定されていない文字が使用されています"
        });
      });
    });

  });
});
