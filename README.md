# NOVA iPhone Web App v4

iPhone Safari / GitHub Pages向けPWAです。

## 改善点
- OCRライブラリを起動時に読み込まず、OCR実行時だけ読み込む
- Service Workerのキャッシュをv4へ更新し、古い版を削除
- カメラ・位置情報・音声認識・録音/録画・接続状態を個別にエラー処理
- MediaRecorderの対応形式を端末側で自動選択
- コマンド入力から各機能を呼び出せる
- iPhoneではWebアプリからCPU/GPUやBluetoothを自由に制御できないことを明示

## 注意
外部AI APIはこのPWAにAPIキーを埋め込まず、未接続のままです。AIチャットを実装する場合は安全なバックエンドが必要です。
