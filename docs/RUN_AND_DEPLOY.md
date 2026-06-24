# 反映の仕組み（WEB / Android）— これを見れば運用が分かる

## 大原則：反映先は「3つ」あり、手順が別々
| # | 反映先 | 何が反映される | 反映コマンド | 反映タイミング |
|---|---|---|---|---|
| ① | **WEB（ブラウザ / localhost）** | web の全部（メニュー・ゲーム・モーダル・修正） | `npm run dev` | 即（保存で HMR） |
| ② | **Android アプリのコード**（APK/AAB にバンドルした web） | メニュー/モーダルの**見た目・動作**、ゲーム、今回の修正（News 2ボタン・別ゲーム縦カード・カード操作・ヒント・safe-area・広告・課金 等） | `npm run sync:android old-maid` → `flutter build apk/appbundle` → install/アップロード | 再ビルド＆再インストール後 |
| ③ | **Android のライブデータ**（Cloudflare から取得） | 「お知らせ本文」「別のカードゲーム一覧/概略」「feat 画像」 | `python3 scripts/build_content.py` → `git push` → Cloudflare 自動デプロイ | push 後 数分 |

> **`npm run dev` は ① だけ。** Android（②③）には**一切自動で届かない**。ここが混乱の元。

## なぜ「Android に反映されない」のか
- **メニュー/モーダルの見た目・動作 →** ②。`npm run dev` で web は変わるが、**Android は APK に焼いた古い web を使う**。`sync` + **APK 再ビルド + 再インストール**しないと変わらない。
- **メニューのモーダルの中身（お知らせ・別ゲーム一覧）→** ③。アプリは Cloudflare から**ライブ取得**。**`git push`（Cloudflare デプロイ）していないと出ない/古い**。
  - ※ ライブ取得が失敗した時のため、②で**バンドルにも同梱（fallback）**している。なので②の再ビルドでも“ある程度”は出るが、**最新内容は③の push が必要**。

## 変更したもの別・必要な操作
| 変更したもの | ① WEB | ② Android コード(APK/AAB) | ③ Android ライブデータ |
|---|---|---|---|
| メニュー/モーダルの**見た目・動作**（News, 別ゲーム縦カード, カード操作, ヒント, 言語） | `npm run dev` | **必要**：sync + build + install | — |
| **お知らせ本文・別ゲームの概略/一覧・feat 画像** | `npm run dev` | sync（fallback 同梱） | **必要**：build_content.py + push |
| Flutter ネイティブ（広告/課金/署名/safe-area/AAB） | — | **必要**：flutter build + install/アップロード | — |

## 手順（コピペ可）
### ② Android アプリのコードを反映（開発確認＝APK / 内部テスト＝AAB）
```
cd ~/wsl_pj/playing_cards
npm run sync:android old-maid                 # 最新 web を android/app/src/main/assets/www へ
cd /mnt/c/Users/dev/pj/google_play_store_app/00004_old-maid
flutter clean && flutter build apk --debug    # 開発確認用（/mnt/c は clean 必須）
adb install -r build/app/outputs/flutter-apk/app-debug.apk
# 内部テスト用は：flutter build appbundle --release（versionCode は Play Console の最大値+1。詳細 docs/）
```
### ③ Android のライブデータ（お知らせ・別ゲーム）を反映
```
cd ~/wsl_pj/playing_cards
python3 scripts/build_content.py              # base_markdown/csv → config 再生成
git add -A && git commit -m "content: update" && git push   # → Cloudflare 自動デプロイ（数分）
```
- 確認：`https://app-flux-mirror.pages.dev/web-games/game-assets/configs/card-games-list.json` が更新されているか。

## まとめ（一言）
- **画面で確認したいだけ** → ① `npm run dev`。
- **実機(Android)で確認/配布したい** → ② **sync + 再ビルド + 再インストール**（コードの見た目・動作）＋ ③ **push**（お知らせ・別ゲームの中身）。
- 関連: [DEPLOY_CLOUDFLARE.md](DEPLOY_CLOUDFLARE.md)（③の詳細）, [ANDROID_MODALS.md](ANDROID_MODALS.md)（モーダルのデータ源）。
