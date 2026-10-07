# DictoTecho

**DictoTecho（ディクト・テチョウ）** は、手帳を書いている時にPCやスマホのブラウザ上で起動し、音声入力と漢字変換候補の確認をスムーズに行うためのウェブアプリケーションです。

## 📌 概要 (Overview)

手帳にペンで文字を書きながらハンズフリーで音声入力を受け付け、リアルタイムで「ひらがな」に文字起こしを行います。  
文字起こししたひらがなから変換可能な漢字の候補（最大5つ）を画面上に提示することで、手帳への記入を強力にサポートします。  
  
本ウェブアプリケーションは全て利用者のフロントエンド環境で実行され、文字起こしの内容や漢字への変換結果はどこかに送信されることはありません。

## ✨ 主な機能 (Features)

- 🎙️ **常時音声認識**: ブラウザ上でマイク入力をリアルタイム追尾
- 📊 **音声波形ビジュアライザー**: Web Audio API によるマイク振幅のリアルタイム波形描画
- 🔤 **スマートな漢字変換候補**: 不要なカタカナを除外した手帳向け漢字候補を最大5件表示
- ⚡ **完全サーバーレス動作**: 静的ファイル（HTML/CSS/JS）のみで動作し軽量・高速

## 🚀 使い方 (Usage)

1. Webブラウザで [DictoTecho](https://naoki-kkc.github.io/dictoTecho/) にアクセスします。
2. 画面上の **「音声認識を開始」** ボタンを押します。
3. マイクの使用許可を求められたら「許可」を選択します。
4. 手帳を書きながらPCやスマホに向かって話しかけます。
5. 画面上に表示されるひらがなと漢字候補を確認しながら、手帳に記入します。

※ 推奨ブラウザ: Safari (iOS / macOS), Google Chrome

## 🛠️ 技術構成 (Tech Stack)

- **フロントエンド**: HTML5, CSS3, JavaScript (ES6+)
- **音声認識機能**: Web Speech API (`webkitSpeechRecognition`)
- **かな変換エンジン**: Kuroshiro + kuromoji.js（ローカル辞書対応）
- **漢字変換候補取得**: Google 日本語入力 CGI API
- **波形描画エンジン**: Web Audio API
- **ホスティング**: GitHub Pages

## ライセンス (License)

このプロジェクトは [MIT License](LICENSE) のもとで公開されています。

## 謝辞・使用ライブラリ (Credits & Third-Party Notices)

「DictoTecho」の開発にあたり、以下のオープンソースソフトウェア、Web標準API、および外部サービスを活用させていただいております。素晴らしい技術やライブラリを公開・維持されている開発者ならびにコミュニティの皆様に心より感謝申し上げます。

### 利用ライブラリ・API 一覧

| ソフトウェア / API | 用途・役割 | ライセンス / 規約 |
| :--- | :--- | :--- |
| **[Kuroshiro](https://github.com/hexojs/kuroshiro)** | 形態素解析結果に基づく日本語ひらがな変換処理 | [MIT License](https://github.com/hexojs/kuroshiro/blob/master/LICENSE) |
| **[kuromoji.js](https://github.com/takuyaa/kuromoji.js)** | ブラウザ上での形態素解析および辞書データ処理 | [Apache License 2.0](https://github.com/takuyaa/kuromoji.js/blob/master/LICENSE.md) |
| **[Google 日本語入力 CGI API](https://www.google.co.jp/ime/cgi/api.html)** | ひらがなテキストからの漢字変換候補取得 | Google 利用規約 |
| **[Web Speech API](https://wicg.github.io/speech-api/)** | マイクからのリアルタイム音声認識（`webkitSpeechRecognition`） | W3C Standard |
| **[Web Audio API](https://developer.mozilla.org/ja/docs/Web/API/Web_Audio_API)** | 音声入力の振幅解析および波形ビジュアライザー描画 | W3C Standard |
| **Gemini (Google)** | AIペアプログラミング、機能実装、iOS互換性最適化のサポート | AI Collaborator |

### 詳細

- **Kuroshiro / kuromoji.js**
  ローカルの辞書データ（`dict/`）を用いた高度なかな変換処理を実現するために利用しています。
- **Google 日本語入力 CGI API**
  手帳向けの正確な漢字変換候補（カタカナを除外した候補抽出）を非同期取得するために利用しています。