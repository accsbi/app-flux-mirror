# デプロイ手順：playing_cards → GitHub → Cloudflare Pages

## 方針
- playing_cards の web（静的サイト＋モーダル用データ JSON／feat 画像）を **Cloudflare Pages** に新規構築。
- **app-flux は一切触らない**（別 git・別デプロイ）。後で「app-flux のドメインだけ」を Cloudflare に載せ替える（既存を壊さない）。
- Android アプリのモーダルは、この Cloudflare の URL から **ライブ fetch**（サイト再デプロイで反映＝Google 再申請不要）。

## 構成（決定事項）
| 項目 | 値 |
|---|---|
| ビルド | `npm run build`（= `tsc && vite build`） |
| 出力ディレクトリ | `dist` |
| base | `/`（Cloudflare プロジェクトのルートで配信） |
| データ URL（公開後） | `https://<project>.pages.dev/web-games/game-assets/configs/card-games-list.json` ほか |
| feat 画像 | `https://<project>.pages.dev/site-assets/images/games-apps/<slug>/<slug>-feat.webp` |
| CORS | `public/_headers`（`/web-games/game-assets/configs/*` に `Access-Control-Allow-Origin: *`）→ build で `dist/_headers` に出力。Cloudflare Pages が解釈 |

## 手順A：GitHub へ push（あなたの操作。`gh` 未認証のため）
playing_cards は既に git 管理（リモート未設定）。本セッションの変更はコミット済み（`feat/...` ブランチ）。
```
# 1) GitHub で空の新規リポジトリを作成（例: playing-cards、private 可）
# 2) リモート登録 & push（セッション内なら ! 付きで実行）
! git remote add origin git@github.com:<あなた>/<repo>.git
! git push -u origin HEAD:main      # 現ブランチを main として push
```
（`screenshots_log/` 等の検証物・`dist*`・`node_modules`・`scripts/` は .gitignore 済みで載りません。）

## 手順B：Cloudflare Pages に紐づけ（あなたの操作・ダッシュボード）
1. Cloudflare → Workers & Pages → **Create application → Pages → Connect to Git**。
2. 手順Aの GitHub リポジトリを選択。
3. ビルド設定：
   - **Framework preset**: None（または Vite）
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - （環境変数は不要。Node は既定でOK）
4. Save and Deploy → 数分で `https://<project>.pages.dev` に公開＝**とりあえず見える**。
5. 確認：`https://<project>.pages.dev/web-games/game-assets/configs/card-games-list.json` が 200 で返る／レスポンスに `access-control-allow-origin: *` が付く。

## 手順C：アプリの fetch 先を Cloudflare に向ける（公開URL確定後）
`web-games/src/shared/infra/web-store-links.ts` の `PLAYING_CARDS_LIVE_BASE` を
**Cloudflare の公開URL（ルート）**に変更：
```ts
export const PLAYING_CARDS_LIVE_BASE = 'https://<project>.pages.dev'
```
→ `npm run sync:android old-maid` → APK 再ビルド。これで Android はライブの一覧／お知らせ／feat を取得。
（オフライン等の時はバンドルにフォールバック。）

## 手順D：ドメイン載せ替え（後日・app-flux を壊さず）
- Cloudflare Pages の **Custom domains** に app-flux 側のサブドメイン等を割り当て、DNS を Cloudflare に向ける。
- 切替後は `PLAYING_CARDS_LIVE_BASE` をそのドメインに更新。`/en/games-apps/`（app-flux 運用中）は無関係・無傷。

## 更新フロー（運用）
1. `catalog/games-list.csv` / `catalog/base_markdown/*` を編集。
2. `python3 scripts/build_content.py`（`card-games-list.json` / config 再生成）。
3. `git commit && git push` → Cloudflare が自動再ビルド → 数分で反映。**アプリ再申請不要。**
