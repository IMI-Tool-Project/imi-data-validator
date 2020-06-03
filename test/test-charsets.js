const charsets = require("../lib/charsets");
const expect = require('chai').expect;

describe('imi-data-validator#charsets', () => {

  describe('数字 ISOIEC10646Annex-G-supplement-NUMERIC-compliant', () => {
    const uri = "https://imi.go.jp/CommonCharacterSets/ISOIEC10646Annex-G-supplement-NUMERIC-compliant";
    it("定義", () => {
      expect(charsets[uri]).to.exist;
    });
    const exp = new RegExp(`^${charsets[uri].moji}+$`);
    it("数字だけの文字列を valid と判定できること", () => {
      expect(exp.test("0123456789")).to.be.true;
    });
    it("数字以外を含む文字列を invalid と判定できること", () => {
      expect(exp.test("0123456789a")).to.be.false;
    });
  });

  describe('カタカナ ISOIEC10646Annex-G-supplement-KATAKANA-compliant', () => {
    const uri = "https://imi.go.jp/CommonCharacterSets/ISOIEC10646Annex-G-supplement-KATAKANA-compliant";
    it("定義", () => {
      expect(charsets[uri]).to.exist;
    });
    const exp = new RegExp(`^${charsets[uri].moji}+$`);
    it("カタカナだけの文字列を valid と判定できること", () => {
      expect(exp.test("アイウエオカキケコ")).to.be.true;
    });
    it("カタカナ以外を含む文字列を invalid と判定できること", () => {
      expect(exp.test("0123456789a")).to.be.false;
    });
  });

  describe('JISX0208 ISOIEC10646-CJK-JISX0208-1990-compliant', () => {
    const uri = "https://imi.go.jp/CommonCharacterSets/ISOIEC10646-CJK-JISX0208-1990-compliant";
    it("定義", () => {
      expect(charsets[uri]).to.exist;
    });
    const exp = new RegExp(`^${charsets[uri].moji}+$`);
    it("JISX0208だけの文字列を valid と判定できること", () => {
      expect(exp.test("山田太郎")).to.be.true;
    });
    it("JISX0208以外を含む文字列を invalid と判定できること", () => {
      expect(exp.test("𩸽")).to.be.false;
    });
  });

  describe('JISX0212 ISOIEC10646-CJK-JISX0212-1990-compliant', () => {
    const uri = "https://imi.go.jp/CommonCharacterSets/ISOIEC10646-CJK-JISX0212-1990-compliant";
    it("定義", () => {
      expect(charsets[uri]).to.exist;
    });
    const exp = new RegExp(`^${charsets[uri].moji}+$`);
    it("JISX0212だけの文字列を valid と判定できること", () => {
      expect(exp.test("亖亗亝亯亹仃仐仚仛仠")).to.be.true;
    });
    it("JISX0212以外を含む文字列を invalid と判定できること", () => {
      expect(exp.test("一亖亗亝亯亹仃仐仚仛仠")).to.be.false;
      expect(exp.test("𩸽亖亗亝亯亹仃仐仚仛仠")).to.be.false;
      expect(exp.test("0123456789亖亗亝亯亹仃仐仚仛仠")).to.be.false;
      expect(exp.test("アイウエオ亖亗亝亯亹仃仐仚仛仠")).to.be.false;
    });
  });

  describe('JISX0213 ISOIEC10646-CJK-JISX0213-2004-compliant', () => {
    const uri = "https://imi.go.jp/CommonCharacterSets/ISOIEC10646-CJK-JISX0213-2004-compliant";
    it("定義", () => {
      expect(charsets[uri]).to.exist;
    });
    const exp = new RegExp(`^(${charsets[uri].moji})+$`);
    it("JISX0213だけの文字列を valid と判定できること", () => {
      expect(exp.test("𩸽")).to.be.true;
    });
    it("JISX0208以外を含む文字列を invalid と判定できること", () => {
      expect(exp.test("山田太郎")).to.be.false;
    });
  });
});
