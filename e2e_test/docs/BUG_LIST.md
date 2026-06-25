# バグ一覧（AI が能動的に洗い出し・本セッション）

凡例：状態＝[修正済]/[未修正]/[誤検知=正常]　重大度＝高/中/低
証跡＝`screenshots_log/` 配下の PNG。詳細手順は `VERIFICATION_PLAN.md`。

## A. アプリ UI（透過・レイアウト）
| # | 重大度 | 状態 | バグ | 箇所 / 証跡 |
|---|---|---|---|---|
| A1 | 高 | 修正済 | **old-maid の 設定/ガイド/確認/コイン補充モーダルが透明(see-through)**。背後の盤面・順位アバター・テンキーが透ける | `old-maid-game-table.ts` 1446/1457/1472/1494。証跡 `old-maid/scr-05-guide`(不良)→`scr-04b`(不透明) |
| A2 | 中 | 修正済 | **カタログカードの Google Play/YouTube SVG が離れすぎ**（flex全幅＋object-fit余白で ~100px 隙間） | `src/components/game-card.ts` `.store-links`。証跡 `site/catalog-ja-svgfix` |
| A3 | 低 | 修正済 | memory standalone の overlay が `rgba(5,10,11,0.8)`（共通 0.78 と不統一） | `memorymonsters-standalone-app.ts:157` |
| A4 | 中 | 未検証 | blackjack/poker のゲーム内ガイドが数字パッドに阻まれ未取得（再取得要） | scr-05 が SELECT BET を表示 |
| A5 | 中 | 未検証 | en/zh の全画面UIが未撮影 | — |
| A6 | 高 | 修正済 | **poker タイトル「…(Five-card draw)」が右に見切れ・COINも切れる**（h1 white-space:nowrap） | `menu-base.styles`→`standalone-game-menu` で折返し許可。証跡 `poker/fix-title` |

## B. データ不一致（ストア/YouTube が CSV 非由来の直書き）
| # | 重大度 | 状態 | バグ | 箇所 / 証跡 |
|---|---|---|---|---|
| B1 | 高 | 修正済 | **アプリのストアURLが直書き**。blackjack/poker/old-maid が **ハブURL `playingcardshub`** を表示。CSVは個別(simpleblackjack/simple_poker/old_maid) | `web-store-links.ts:56` `CARD_GAMES_HUB_WEB_LINKS` |
| B2 | 高 | 修正済 | **アプリのYouTubeが直書き**。blackjack/poker/high-low は **CSV空なのにメニューに YouTube アイコン**（ハブ動画 ZNJr2） | `web-store-links.ts:59`。証跡 `*/scr-01-menu` |
| B3 | 高 | 修正済 | `build_content.py` が CSV の store/youtube を config に書かない（CSV→config 断絶） | `scripts/build_content.py merge_config` |
| B4 | 中 | 修正済 | config `app_info.play_store_url`/`news_url_template` が手書き（CSV非由来）。`youtube_url` フィールド自体が config に無い | `*_app_config.json` |
| B5 | 中 | 解消(設計) | blackjack/poker は app_info.play_store_url(=CSV正値) を開く。他4は Flutter IAP ブリッジ方式でストアURL不使用＝仕様 | 各 game-table |
| B6 | — | 誤検知 | **サイト詳細ページのストアリンクは CSV 一致（正常）** | href抽出で確認 |
| B7 | — | 対応済 | high-low(comingsoon): サイトは「準備中」、**アプリメニューも「comingsoon」ピル表示**（app_info.store_state=CSV由来）。証跡 `high-low/comingsoon-menu` | — |

## C. サイレントフォールバック（禁止・throw化すべき）
| # | 重大度 | 状態 | バグ | 箇所 |
|---|---|---|---|---|
| C1 | 高 | 修正済 | poker ガイド→ハードコード英文にフォールバック | `poker-game-table.ts` pokerGuideFallbackLines |
| C2 | 高 | 修正済 | memory START→プレースホルダ「ここに遊び方の…」 | `memory-battle-standalone-app.ts:81` |
| C3 | 高 | 修正済 | high-low config fetch 失敗→空オブジェクト握り潰し | `high-low-config.ts:46` |
| C4 | 中 | 修正済 | memorymonsters ガイド guide_content 無言空表示 | `memorymonsters-standalone-app.ts:520` |
| C5 | 中 | 修正済 | memory-battle-game-table ガイド無言空表示 | `memory-battle-game-table.ts:598` |
| C6 | 中 | 修正済 | high-low `hlGet`：言語欠損→en→fallback文字列 | `high-low-config.ts:50` |
| C7 | 中 | 修正済 | memory config 読込 catch 黙殺 | `memory-battle-standalone-app.ts:37` |

## D. タイトルのハードコード（CSV/config を唯一ソースにすべき）
| # | 重大度 | 状態 | バグ | 箇所 |
|---|---|---|---|---|
| D1 | 中 | 修正済 | **old-maid タイトル完全直書き 'Simple Old Maid'**（config参照すらしない・最悪） | `old-maid-standalone-app.ts:18` |
| D2 | 低 | 修正済 | blackjack/poker/casino-war/memory/high-low の最終フォールバック直書きタイトル | 各 `*-standalone-app.ts:20` |

## E. config 掃除（未使用の手書きキー残存）
| # | 重大度 | 状態 | バグ | 箇所 |
|---|---|---|---|---|
| E1 | 中 | 修正済 | 旧 `rules_text`（Prayer/☓/BET倍率/※）が5ゲーム config に残存（未参照だが要削除） | `*_app_config.json` |
| E2 | 低 | 修正済 | `*_guide_intro/rules/payout`・`*_payout_summary`・`overview_intro`・`features_*`・`procedure_*`・`description_*` 未使用キー残存 | 各 config |

## F. UIラベルのハードコード（CLAUDE.md §1 違反・多数）
| # | 重大度 | 状態 | バグ | 箇所 |
|---|---|---|---|---|
| F1 | 低 | 修正済 | 各 game-table の約50-60ラベルが `getLocalizedString()\|\|'English'` 直書き | casino-war ~50 / memory ~60 / blackjack / poker / high-low / 共通基底 |

## G. 整合性（本セッションで解消済み）
| # | 状態 | 内容 |
|---|---|---|
| G1 | 修正済 | en/zh quick_start 未生成→STARTクラッシュ（タグ移行で解消） |
| G2 | 修正済 | `GUIDE_LINES_TO_HIDE` がプライバシー行をハードコードで隠蔽 |
| G3 | 修正済 | guide フォールバック（casino_war_guide_* / guideFallbackKeys）全廃 |
| G4 | 修正済 | runtime が旧 rules_text 読み→quick_start に統一 |

## 誤検知（正常と確認）
- blackjack の配り＝4枚（各2枚）で正常（先の「1枚」はアニメ途中の撮影）。
- サイト詳細ページのストアリンク＝CSV一致。

## 検証サマリ（degrade ゲート・本ターン）
- アプリ 6ゲーム×3言語(=18) START まで pageerror 0。
- サイト /ja//en//zh/ カタログ 各6タイトル表示・err 0。
- B群修正後、アプリのストア/YouTube href が games-list.csv と1:1一致（実機 href 抽出で確認）。
- ⇒ 本ターンの変更（build_content.py / 各 standalone / menu CSS / 型 / old-maid title / memory config）で **degrade 無し**。
