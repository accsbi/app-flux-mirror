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
    /** ブログ一覧の「続きを読む」リンク。 */
    readMore: string
  }
  /** About ページ本文（app-flux https://app-flux.com/{lang}/about/ と同一内容）。 */
  about: {
    businessTitle: string
    /** 事業のラベル（事業 1 / 事業 2）。 */
    businessLabel: string[]
    appDevName: string
    /** 開発アプリ一覧の短い説明。 */
    appDevDesc: string
    /** Google Play 開発者ページのテキスト見出し（枠付き SVG リンクの上に表示）。 */
    googlePlayLabel: string
    ecName: string
    ecDescription: string
    ecChannelsLabel: string
    companyTitle: string
    company: { label: string; value: string }[]
    contactTitle: string
    contactNote: string
    contactLink: string
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
      readMore: 'Read more',
    },
    about: {
      businessTitle: 'Business',
      businessLabel: ['Business 1', 'Business 2'],
      appDevName: 'Mobile app development',
      appDevDesc:
        'We develop and operate the apps published on Google Play. See the full list on our developer page.',
      googlePlayLabel: 'Google Play developer page',
      ecName: 'E-commerce site operations',
      ecDescription:
        'We operate e-commerce storefronts for mobile accessories and related products. This page focuses on sales channels and storefront operations.',
      ecChannelsLabel: 'Primary Sales Channels',
      companyTitle: 'Company Information',
      company: [
        { label: 'Company Name', value: 'BRANDO,K.K.' },
        { label: 'Established', value: 'October 28, 2015' },
        { label: 'English Name', value: 'BRANDO,K.K.' },
        { label: 'Corporate Number', value: '2010901030968' },
        { label: 'Partner Banks', value: 'PayPay Bank / Japan Post Bank' },
      ],
      contactTitle: 'Contact',
      contactNote:
        'If you have questions about our services, would like to discuss a project, or want to request work, please contact us through the inquiry form. We will review your message and respond in order.',
      contactLink: 'Contact Us',
    },
  },
  ja: {
    nav: { home: 'ホーム', about: '会社概要', contact: 'お問い合わせ', blog: 'ブログ' },
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
      readMore: '続きを読む',
    },
    about: {
      businessTitle: '事業内容',
      businessLabel: ['事業 1', '事業 2'],
      appDevName: 'モバイルアプリ開発',
      appDevDesc:
        'Google Play で配信中のアプリを開発・運営しています。アプリ一覧は開発者ページからご覧いただけます。',
      googlePlayLabel: 'Google Play 開発者ページ',
      ecName: 'ECサイト運営',
      ecDescription:
        'モバイルアクセサリーを中心とした EC サイトの運営を行っています。このページでは販売チャネルと運営情報をまとめています。',
      ecChannelsLabel: '主な販売チャネル',
      companyTitle: '会社情報',
      company: [
        { label: '会社名', value: '株式会社ブランドー' },
        { label: '設立', value: '2015年10月28日' },
        { label: '英文表記', value: 'BRANDO,K.K.' },
        { label: '法人番号', value: '2010901030968' },
        { label: '取引銀行', value: 'PayPay銀行 / ゆうちょ銀行' },
      ],
      contactTitle: 'お問い合わせ',
      contactNote:
        'サービス内容に関するご質問、ご相談、お仕事のご依頼などがございましたら、こちらの問い合わせフォームよりお気軽にご連絡ください。内容を確認のうえ、順次ご返信いたします。',
      contactLink: 'お問い合わせ',
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
      readMore: '阅读全文',
    },
    about: {
      businessTitle: '业务内容',
      businessLabel: ['业务 1', '业务 2'],
      appDevName: '移动应用开发',
      appDevDesc:
        '我们开发并运营在 Google Play 上发布的应用。完整应用列表请见开发者页面。',
      googlePlayLabel: 'Google Play 开发者页面',
      ecName: 'EC 网站运营',
      ecDescription:
        '我们围绕移动配件等商品持续进行 EC 网站运营。本页面主要介绍销售渠道与运营信息。',
      ecChannelsLabel: '主要销售渠道',
      companyTitle: '公司信息',
      company: [
        { label: '公司名称', value: 'BRANDO,K.K.' },
        { label: '成立时间', value: '2015年10月28日' },
        { label: '英文名称', value: 'BRANDO,K.K.' },
        { label: '法人编号', value: '2010901030968' },
        { label: '合作银行', value: 'PayPay Bank / Japan Post Bank' },
      ],
      contactTitle: '联系我们',
      contactNote:
        '如果您对服务内容有疑问、想进行咨询，或有工作委托需求，欢迎通过此联系表单与我们联系。我们会确认内容后按顺序回复。',
      contactLink: '联系我们',
    },
  },
}

export function getTranslation(lang: Lang): Translation {
  return translations[lang] ?? translations.en
}
