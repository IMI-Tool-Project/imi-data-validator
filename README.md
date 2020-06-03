# IMIデータバリデーションコンポーネント

所与のデータモデルに対して JSON-LD を検査し、
場合によってはデータの修正や補完を行いつつ、
検査結果をメタデータとして追記するライブラリです。
コマンドラインツールおよび WebAPI サーバも提供されます。

# 利用者向け情報


## インストール

適当な作業フォルダを作成しモジュールをインストールします。
ここでは ${SOMEWHERE} フォルダに imi-moji-converter-1.0.0.tgz と imi-data-validator-1.0.0.tgz が
あることを仮定しています。

```
$ ls ${SOMEWHERE}
imi-moji-converter-1.0.0.tgz
imi-data-validator-1.0.0.tgz

$ mkdir work
$ cd work
$ cp ${SOMEWHERE}/imi-moji-converter-1.0.0.tgz .
$ cp ${SOMEWHERE}/imi-data-validator-1.0.0.tgz .
$ npm install ./imi-data-validator-1.0.0.tgz
```

なお、imi-data-validator はローカルパッケージ imi-moji-converter に依存しています。
imi-data-validator-1.0.0.tgz をインストールする際には
imi-data-validator-1.0.0.tgz と imi-moji-converter-1.0.0.tgz は同じフォルダに配置されている必要があります。


## API

モジュール imi-data-validator は以下のような API の関数です。

```
module.exports = function(imiv) {..}
```

- imiv: imiv 文字列（必要な語彙定義およびデータモデル定義を連結したもの）

この関数は関数を生成するジェネレータです。
生成された関数は以下のような API を持ちます。

```
function(json,options){..}
```

- json: バリデーション対象の JSON
- options: オプションオブジェクト(省略可能、後述)

出力はバリデーション結果が付与された JSON です。

## 使用例

以下の手順では genrate 関数によって imiv から validate 関数が生成され、
validate 関数によって input (JSON) から output (JSON) に変換されます。

```main.js
const fs = require('fs');
const generate = require('imi-data-validator');

const imiv =
  fs.readFileSync(__dirname+"/node_modules/imi-data-validator/example/imicore241.imiv.txt") +
  fs.readFileSync(__dirname+"/node_modules/imi-data-validator/example/datamodel.imiv.txt");

const validate = generate(imiv);

const input = {
  "@context": "https://imi.go.jp/ns/core/context.jsonld",
  "@type": "法人型",
  "表記": "株式会社ほげほげ"
};

const output = validate(input);

console.log(JSON.stringify(output,null,2));
```

実行すると以下のような出力が得られます。

```
$ node main.js
{
  "@context": [
    "https://imi.go.jp/ns/core/context.jsonld",
    "http://hojin-info.go.jp/ns/domain/biz/1/context.jsonld"
  ],
  "@type": "法人型",
  "表記": "株式会社ほげほげ",
  "メタデータ": {
    "@type": "hj:更新履歴型",
    "hj:更新者": {
      "@type": "実体型",
      "表記": "IMIデータバリデーションコンポーネント"
    },
    "種別": "INFO",
    "説明": "このインスタンスはデータモデルに適合しています",
    "日時": {
      "@type": "日時型",
      "標準型日時": "2019-02-13T19:46:14.904+09:00"
    }
  }
}
$
```

### オプション

generate 関数の第二引数としてオプションを保持したオブジェクトを渡すことができます。

```
const generate = require('imi-data-validator');

const imiv =
  fs.readFileSync(__dirname+"/example/imicore241.imiv.txt") +
  fs.readFileSync(__dirname+"/example/datamodel.imiv.txt");

const validate = generate(imiv,{disable_auto_fix:true});

```

オプションの意味は以下の通りです。

#### disable_auto_fix

このオプションに true が設定された場合にのみデータへの修正・補完が行われず、 ERROR として報告されます。

それ以外の場合（無指定も含む）はデータへの修正・補完が行われ、WARNING として報告されます。

対象となる修正・補完は以下です。

- インスタンスに省略されたルートクラスをデータモデルから補完
- インスタンスに省略されたルートクラス以外のクラスを、語彙定義から補完
- 文字セット制約（数値）の場合の、全角数字から半角数字への自動変換
- 文字セット制約（カタカナ）の場合の、半角カタカナから全角カタカナへの自動変換


## コマンドラインツールとしての利用

コマンドラインツールの実体は `bin/cli.js` です。
コマンドラインに語彙定義およびデータモデル定義を指定、
さらに指定されたひとつのファイルまたは標準入力に含まれる JSON をパースして
変換結果を標準出力に出力します。

以下は動作確認用ファイル `example/simple.json` を変換する事例です。

```
$ cd node_modules/imi-data-validator
$ node bin/cli.js example/imicore241.imiv.txt example/datamodel.imiv.txt example/simple.json
{
  "@context": [
    "https://imi.go.jp/ns/core/context.jsonld",
    "http://hojin-info.go.jp/ns/domain/biz/1/context.jsonld"
  ],
  "@type": "法人型",
  "表記": "株式会社完全充足",
  "組織種別位置": "前",
  "組織種別": {
    "@type": "コード型",
    "識別値": "301",
    "表記": "株式会社"
  },
  "住所": {
    "@type": "住所型",
    "表記": "東京都千代田区麹町",
    "郵便番号": "1020083",
    "都道府県": "東京都",
    "市区町村": "千代田区"
  },
  "メタデータ": {
    "@type": "hj:更新履歴型",
    "hj:更新者": {
      "@type": "実体型",
      "表記": "IMIデータバリデーションコンポーネント"
    },
    "種別": "INFO",
    "説明": "このインスタンスはデータモデルに適合しています",
    "日時": {
      "@type": "日時型",
      "標準型日時": "2019-02-13T19:50:29.105+09:00"
    }
  }
}
$
```

動作確認用ファイルは以下の３つです。

- example/simple.json : 単一のインスタンスをもつ JSON-LD
- example/graph.json : ３つのインスタンスをもつ JSON-LD
- example/line-delimited.json.txt : 1行ごとに独立した JSON-LD が記録された Line delimited JSON

なお、入力形式が Line delimited JSON と判定された場合には、
出力形式も Line delimited JSON になります。

## サーバとしての利用

コマンドラインツールの実体は `bin/server.js` です。
以下の手順で任意のポートと語彙・データモデル定義を与えてサーバを起動します。

```
$ cd node_modules/imi-data-validator
$ node bin/server.js 3030 example/imicore241.imiv.txt example/datamodel.imiv.txt
imi-data-validator is running on port 3030
```

なお、ポート番号や語彙・データモデル定義を指定しなかった場合には以下のように使用方法が出力されて終了します。

```
$ node bin/server.js
Usage: node server.js [port number] [IMIV_VOCABULARY]... [IMIV_DATAMODEL]
$
```

サーバが起動している状態で、 POST メソッドで JSON-LD を送信すると変換結果が出力されます。

```
$ curl -X POST -d '{"@context": "https://imi.go.jp/ns/core/context.jsonld","@type": "法人型","表記": "株式会社ほげほげ"}' localhost:3030
{
  "@context": [
    "https://imi.go.jp/ns/core/context.jsonld",
    "http://hojin-info.go.jp/ns/domain/biz/1/context.jsonld"
  ],
  "@type": "法人型",
  "表記": "株式会社ほげほげ",
  "メタデータ": {
    "@type": "hj:更新履歴型",
    "hj:更新者": {
      "@type": "実体型",
      "表記": "IMIデータバリデーションコンポーネント"
    },
    "種別": "INFO",
    "説明": "このインスタンスはデータモデルに適合しています",
    "日時": {
      "@type": "日時型",
      "標準型日時": "2019-02-13T19:53:50.648+09:00"
    }
  }
}
$
```

# 開発者向け情報

## 環境構築

以下の手順で環境を構築します。

ここでは ${SOMEWHERE} フォルダに依存ライブラリである imi-moji-converter-1.0.0.tgz とソースアーカイブ imi-data-validator-1.0.0.src.tgz が
あることを仮定しています。

```
$ cd work
$ cp ${SOMEWHERE}/imi-moji-converter-1.0.0.tgz .
$ mkdir imi-data-validator
$ cd imi-data-validator
$ tar xvzf ${SOMEWHERE}/imi-data-validator-1.0.0.src.tgz
$ npm install
```

なお、imi-data-validator はローカルパッケージ imi-moji-converter に依存しています。
imi-data-validator-1.0.0.src.tgz の展開後、 `npm install` を実行して
依存ライブラリをインストールする際には imi-moji-converter-1.0.0.tgz が
imi-data-validator フォルダと同じ階層に配置されている必要があります。

## テスト

以下の手順でテストが実行され、テスト結果が出力されます。

```
$ npm test

> imi-data-validator@1.0.0 test imi-data-validator
> mocha



  imi-data-validator#charsets
    数字 ISOIEC10646Annex-G-supplement-NUMERIC-compliant
      ✓ 定義
      ✓ 数字だけの文字列を valid と判定できること
      ✓ 数字以外を含む文字列を invalid と判定できること
    カタカナ ISOIEC10646Annex-G-supplement-KATAKANA-compliant
      ✓ 定義
      ✓ カタカナだけの文字列を valid と判定できること
      ✓ カタカナ以外を含む文字列を invalid と判定できること
    JISX0208 ISOIEC10646-CJK-JISX0208-1990-compliant
      ✓ 定義
      ✓ JISX0208だけの文字列を valid と判定できること
      ✓ JISX0208以外を含む文字列を invalid と判定できること

(省略)

$
```

## ファイル構成

開発対象となる Javascript は以下の３つです。

```
main.js : 関数本体
lib/util.js : リテラルに対する評価を実施するための関数群
lib/charsets.js : 文字セット URI をキーとして、「文字セット名称」と「文字セット構成要素を正規表現の文字クラス相当に記述した文字列」を格納したオブジェクト
```

なお `lib/charsets.js` は `data/build.js` によって自動生成されます。
詳しくは `data/README.md` をご覧ください。
