# About

`lib/charsets.js` を作成するためのワークスペース

# 手順

```
$ cd imi-data-validator/data
$ node build.js ISOIEC* > ../lib/charsets.js
```

# 備考

基本的には `\u0000-\uffff` のような4桁 Unicodeの羅列で、正規表現の文字クラスとして使用することを意図している。
ただし、JISX0213 等に含まれるサロゲートペアについてはひとつの文字を複数の文字として表現することになるので、
`\ud800\udc00|\ud800\udc00|[\u000-\ufff]` のように、先頭部分にサロゲートペア、最後に文字クラスを付与する形となる。
正規表現としては `const re = new RegExp("^(\ud800\udc00|\ud800\udc00|[\u000-\ufff])+$");` のようにグループを併用して判定することになる。
