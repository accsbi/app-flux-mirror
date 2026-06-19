// フィードバック送信（Formspree）。GAS/Google Form は使わない。
// 全ゲーム共通の単一ソース。エンドポイント既定は https://formspree.io/f/xwpopnan。
// game_title でゲームを区別する。
export type FeedbackPayload = {
  message: string
  game_title: string
  lang: 'en' | 'ja' | 'zh'
  // ハニーポット。人間は空、ボットが埋めると Formspree がスパム判定する。
  gotcha?: string
}

type FeedbackResponse = {
  ok: boolean
  error?: string
}

export class FeedbackService {
  private readonly endpoint: string

  constructor(endpoint: string) {
    this.endpoint = endpoint
  }

  public async submit(payload: FeedbackPayload): Promise<FeedbackResponse> {
    if (!this.endpoint) {
      return { ok: false, error: 'endpoint_not_configured' }
    }
    try {
      // Formspree は Accept: application/json を付けると AJAX 応答(JSON)を返す（CORS対応）。
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({
          message: payload.message,
          game_title: payload.game_title,
          lang: payload.lang,
          page: window.location.href,
          // Formspree ハニーポット：空なら通常送信、非空ならスパム判定される。
          _gotcha: payload.gotcha ?? ''
        })
      })
      if (response.ok) {
        return { ok: true }
      }
      return { ok: false, error: `server_error_${response.status}` }
    } catch {
      return { ok: false, error: 'network_or_server_error' }
    }
  }
}
