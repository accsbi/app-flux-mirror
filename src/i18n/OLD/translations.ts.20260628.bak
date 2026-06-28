// src/i18n/translations.ts
//
// UI 文言の唯一の正（single source of truth）。en/ja/zh。
// 説明文（ゲーム内容）は catalog/site_description_md/<id>_<slug>.md 側。ここには UI ラベルのみ。
// app-flux frontend/src/i18n/translations.ts の構造を踏襲。

import type { Lang } from '../data/games-catalog'

export const SITE_TITLE = 'Classic Card Games Collection'

export interface Translation {
  nav: { home: string; about: string; contact: string; blog: string }
  hero: { eyebrow: string; title: string; body: string }
  catalog: {
    genreHeading: string
    details: string
    badgeMobile: string
    badgeWeb: string
    playInBrowser: string
    browserGame: string
    comingSoon: string
  }
  detail: {
    home: string
    screenshots: string
    getOnGooglePlay: string
    watchOnYoutube: string
    downloadTitle: string
    notFound: string
  }
  /** About / Contact / Blog の静的ページ。タイトルは nav を流用。 */
  pages: {
    eyebrow: string
    preparing: string
  }
  /** 仮メニュー（standalone-game-menu の見た目を踏襲）。フェーズ1は非機能。 */
  menu: {
    start: string
    guideOverview: string
    settings: string
    news: string
    back: string
    coin: string
    wip: string
  }
}

export const translations: Record<Lang, Translation> = {
  en: {
    nav: { home: 'Home', about: 'About', contact: 'Contact', blog: 'Blog' },
    hero: {
      eyebrow: 'Card Games',
      title: SITE_TITLE,
      body: 'A collection of simple, classic playing-card games. Available on Google Play, with browser-playable versions on the way.',
    },
    catalog: {
      genreHeading: 'Playing Cards Games',
      details: 'Details',
      badgeMobile: 'Mobile',
      badgeWeb: 'Web',
      playInBrowser: 'Playable in PC & mobile browsers.',
      browserGame: 'Browser Game',
      comingSoon: 'Coming Soon',
    },
    menu: {
      start: 'START',
      guideOverview: 'Guide / Overview',
      settings: 'Settings',
      news: 'News / Updates (External)',
      back: 'Back',
      coin: 'COIN',
      wip: 'Preview menu — buttons are not active yet.',
    },
    detail: {
      home: 'Home',
      screenshots: 'Screenshots',
      getOnGooglePlay: 'Get it on Google Play',
      watchOnYoutube: 'Watch on YouTube',
      downloadTitle: 'Download & Play',
      notFound: 'Game not found.',
    },
    pages: {
      eyebrow: 'Classic Card Games Collection',
      preparing: 'This page is under preparation.',
    },
  },
  ja: {
    nav: { home: 'ホーム', about: 'About', contact: 'お問い合わせ', blog: 'ブログ' },
    hero: {
      eyebrow: 'カードゲーム',
      title: SITE_TITLE,
      body: 'シンプルで定番のトランプゲーム集。Google Play で配信中。ブラウザで遊べる版も準備中です。',
    },
    catalog: {
      genreHeading: 'トランプゲーム',
      details: '詳細',
      badgeMobile: 'モバイル',
      badgeWeb: 'Web',
      playInBrowser: 'PC・スマホのブラウザで遊べます。',
      browserGame: 'ブラウザゲーム',
      comingSoon: '準備中',
    },
    menu: {
      start: 'スタート',
      guideOverview: 'ガイド / 概要',
      settings: '設定',
      news: 'ニュース / 更新情報（外部リンク）',
      back: '戻る',
      coin: 'COIN',
      wip: 'プレビュー用メニューです。ボタンはまだ動作しません。',
    },
    detail: {
      home: 'ホーム',
      screenshots: 'スクリーンショット',
      getOnGooglePlay: 'Google Play で入手',
      watchOnYoutube: 'YouTube で見る',
      downloadTitle: 'ダウンロード',
      notFound: 'ゲームが見つかりません。',
    },
    pages: {
      eyebrow: 'Classic Card Games Collection',
      preparing: 'このページは準備中です。',
    },
  },
  zh: {
    nav: { home: '首页', about: '关于', contact: '联系我们', blog: '博客' },
    hero: {
      eyebrow: '纸牌游戏',
      title: SITE_TITLE,
      body: '简单经典的纸牌游戏合集。已在 Google Play 上线，可在浏览器游玩的版本也即将推出。',
    },
    catalog: {
      genreHeading: '纸牌游戏',
      details: '详情',
      badgeMobile: '移动端',
      badgeWeb: 'Web',
      playInBrowser: '可在电脑和手机浏览器中游玩。',
      browserGame: '浏览器游戏',
      comingSoon: '敬请期待',
    },
    menu: {
      start: '开始',
      guideOverview: '指南 / 概要',
      settings: '设置',
      news: '新闻 / 更新（外部链接）',
      back: '返回',
      coin: 'COIN',
      wip: '预览菜单 —— 按钮尚未启用。',
    },
    detail: {
      home: '首页',
      screenshots: '截图',
      getOnGooglePlay: '在 Google Play 获取',
      watchOnYoutube: '在 YouTube 观看',
      downloadTitle: '下载',
      notFound: '未找到游戏。',
    },
    pages: {
      eyebrow: 'Classic Card Games Collection',
      preparing: '此页面正在准备中。',
    },
  },
}

export function getTranslation(lang: Lang): Translation {
  return translations[lang] ?? translations.en
}
