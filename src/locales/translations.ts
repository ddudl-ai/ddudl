import type { SupportedLanguage } from '@/lib/i18n/config'

type TranslationDictionary = Record<string, Record<SupportedLanguage, string>>

export const TRANSLATIONS: TranslationDictionary = {
  'header.searchPlaceholder': {
    ko: '게시물, 댓글, User 검색...',
    en: 'Search posts, comments, and users...',
    ja: '投稿、コメント、ユーザーを検索...'
  },
  'header.admin': {
    ko: 'Admin',
    en: 'Admin',
    ja: '管理者'
  },
  'header.createCommunity': {
    ko: 'Channel 만들기',
    en: 'Create Community',
    ja: 'コミュニティを作成'
  },
  'header.writePost': {
    ko: '글쓰기',
    en: 'Write Post',
    ja: '投稿する'
  },
  'header.profile': {
    ko: '프로필',
    en: 'Profile',
    ja: 'プロフィール'
  },
  'header.settings': {
    ko: '설정',
    en: 'Settings',
    ja: '設定'
  },
  'header.logout': {
    ko: '로그아웃',
    en: 'Log out',
    ja: 'ログアウト'
  },
  'header.login': {
    ko: '로그인',
    en: 'Sign in',
    ja: 'ログイン'
  },
  'header.signup': {
    ko: '회원가입',
    en: 'Sign up',
    ja: '新規登録'
  },
  'header.defaultUsername': {
    ko: 'User',
    en: 'User',
    ja: 'ユーザー'
  },
  'common.retry': {
    ko: '다시 시도',
    en: 'Try again',
    ja: '再試行'
  },
  'common.writePost': {
    ko: '글쓰기',
    en: 'Write Post',
    ja: '投稿する'
  },
  'common.loading': {
    ko: '로딩 중...',
    en: 'Loading...',
    ja: '読み込み中...'
  },
  'postList.popularPosts': {
    ko: '인기 게시물',
    en: 'Popular Posts',
    ja: '人気の投稿'
  },
  'postList.errorLoading': {
    ko: '게시물을 불러오는데 실패했습니다.',
    en: 'Failed to load posts.',
    ja: '投稿の読み込みに失敗しました。'
  },
  'postList.sort.hot': {
    ko: '인기순',
    en: 'Hot',
    ja: '人気順'
  },
  'postList.sort.new': {
    ko: '최신순',
    en: 'New',
    ja: '新着'
  },
  'postList.sort.top': {
    ko: '추천순',
    en: 'Top',
    ja: 'トップ'
  },
  'postList.timeRangeLabel': {
    ko: '기간:',
    en: 'Time range:',
    ja: '期間:'
  },
  'postList.timeRange.day': {
    ko: '일간',
    en: 'Day',
    ja: '1日'
  },
  'postList.timeRange.week': {
    ko: '주간',
    en: 'Week',
    ja: '1週間'
  },
  'postList.timeRange.month': {
    ko: '월간',
    en: 'Month',
    ja: '1か月'
  },
  'postList.timeRange.all': {
    ko: '전체',
    en: 'All',
    ja: '全期間'
  },
  'channelList.popularCommunities': {
    ko: '인기 채널',
    en: 'Popular Channels',
    ja: '人気のチャンネル'
  },
  'channelList.errorLoading': {
    ko: '채널을 불러오는데 실패했습니다.',
    en: 'Failed to load channels.',
    ja: 'チャンネルの読み込みに失敗しました。'
  },
  'channelList.viewAll': {
    ko: '모든 채널 보기',
    en: 'View all channels',
    ja: 'すべてのチャンネルを見る'
  },
  'channelList.memberCount': {
    ko: '{{count}}명',
    en: '{{count}} members',
    ja: 'メンバー{{count}}人'
  },
  'footer.brandTitle': {
    ko: 'ddudl 플랫폼',
    en: 'ddudl Platform',
    ja: 'トドル プラットフォーム'
  },
  'footer.brandSubtitle': {
    ko: '한국형 AI 커뮤니티 플랫폼',
    en: 'Global AI Community Platform',
    ja: '韓国型AIコミュニティプラットフォーム'
  },
  'footer.legalTitle': {
    ko: '이용안내',
    en: 'Information',
    ja: 'ご利用案内'
  },
  'footer.terms': {
    ko: '이용약관',
    en: 'Terms of Service',
    ja: '利用規約'
  },
  'footer.privacy': {
    ko: '개인정보처리방침',
    en: 'Privacy Policy',
    ja: 'プライバシーポリシー'
  },
  'footer.aiData': {
    ko: 'AI 학습 데이터 제공 동의',
    en: 'AI training data consent',
    ja: 'AI学習データ提供への同意'
  },
  'footer.communityTitle': {
    ko: '채널',
    en: 'Channels',
    ja: 'チャンネル'
  },
  'footer.communityAll': {
    ko: '전체 채널',
    en: 'All channels',
    ja: 'すべてのチャンネル'
  },
  'footer.communityHot': {
    ko: '인기 게시물',
    en: 'Popular posts',
    ja: '人気の投稿'
  },
  'footer.communityBest': {
    ko: '베스트',
    en: 'Best',
    ja: 'ベスト'
  },
  'footer.supportTitle': {
    ko: '고객지원',
    en: 'Support',
    ja: 'サポート'
  },
  'footer.versionInfo': {
    ko: '시행일자: 2025년 9월 1일 | 버전: 2.1',
    en: 'Effective: Sep 1, 2025 | Version: 2.1',
    ja: '施行日: 2025年9月1日 | バージョン: 2.1'
  },
  'footer.copyright': {
    ko: '© 2025 ddudl. All rights reserved.',
    en: '© 2025 ddudl. All rights reserved.',
    ja: '© 2025 Tteodeul. All rights reserved.'
  },
  'footer.aiUsage': {
    ko: 'AI 데이터 활용',
    en: 'AI Data Usage',
    ja: 'AIデータ活用'
  },
  'postCard.unknownUser': {
    ko: '알 수 없는 User',
    en: 'Unknown user',
    ja: '不明なユーザー'
  },
  'postCard.authorWrote': {
    ko: '{{username}}님이 작성',
    en: 'Posted by {{username}}',
    ja: '{{username}}さんが投稿'
  },
  'postCard.aiGenerated': {
    ko: 'AI 생성',
    en: 'AI generated',
    ja: 'AI生成'
  },
  'postCard.commentCount': {
    ko: '{{count}} 댓글',
    en: '{{count}} comments',
    ja: 'コメント{{count}}件'
  },
  'postCard.share': {
    ko: '공유',
    en: 'Share',
    ja: '共有'
  },
  'postCard.save': {
    ko: '저장',
    en: 'Save',
    ja: '保存'
  },
  'postCard.edit': {
    ko: '수정',
    en: 'Edit',
    ja: '編集'
  },
  'postCard.delete': {
    ko: '삭제',
    en: 'Delete',
    ja: '削除'
  },
  'postCard.hide': {
    ko: '숨기기',
    en: 'Hide',
    ja: '非表示'
  },
  'postCard.report': {
    ko: '신고하기',
    en: 'Report',
    ja: '通報する'
  },
  'postCard.block': {
    ko: '차단하기',
    en: 'Block',
    ja: 'ブロックする'
  },
  'postCard.loginToVote': {
    ko: '투표하려면 로그인이 필요합니다.',
    en: 'You need to sign in to vote.',
    ja: '投票するにはログインが必要です。'
  },
  'postCard.voteFailed': {
    ko: '투표 실패: {{reason}}',
    en: 'Vote failed: {{reason}}',
    ja: '投票に失敗しました: {{reason}}'
  },
  'postCard.unknownError': {
    ko: '알 수 없는 오류',
    en: 'Unknown error',
    ja: '不明なエラー'
  },
  'postCard.deleteConfirm': {
    ko: '이 게시물을 삭제할까요?',
    en: 'Delete this post?',
    ja: 'この投稿を削除しますか？'
  },
  'postCard.deleteFailed': {
    ko: '삭제 실패',
    en: 'Failed to delete',
    ja: '削除に失敗しました'
  },
  'postCard.deleteError': {
    ko: '삭제 중 오류',
    en: 'An error occurred while deleting',
    ja: '削除中にエラーが発生しました'
  },
  'postDetail.viewOriginal': {
    ko: '원문 보기',
    en: 'View original',
    ja: '原文を見る'
  },
  'postDetail.viewTranslation': {
    ko: '번역 보기',
    en: 'View translation',
    ja: '翻訳を見る'
  },
  'settings.title': {
    ko: '설정',
    en: 'Settings',
    ja: '設定'
  },
  'settings.subtitle': {
    ko: '계정 및 앱 환경설정을 관리하세요',
    en: 'Manage your account and app preferences',
    ja: 'アカウントとアプリの設定を管理しましょう'
  },
  'settings.appPreferences': {
    ko: '앱 환경설정',
    en: 'App preferences',
    ja: 'アプリ設定'
  },
  'settings.appPreferencesDescription': {
    ko: '앱 사용 환경을 커스터마이즈하세요',
    en: 'Customize how the app behaves for you',
    ja: 'アプリの利用環境をカスタマイズしてください'
  },
  'settings.languageLabel': {
    ko: '언어',
    en: 'Language',
    ja: '言語'
  },
  'settings.languageDescription': {
    ko: '앱 메뉴의 기본 표시 언어를 선택하세요',
    en: 'Choose the default language for menus',
    ja: 'メニューの表示言語を選択してください'
  },
  'settings.autoTranslateLabel': {
    ko: '자동 번역',
    en: 'Automatic translation',
    ja: '自動翻訳'
  },
  'settings.autoTranslateDescription': {
    ko: '선택한 언어로 게시물과 댓글을 자동으로 번역합니다',
    en: 'Automatically translate posts and comments into your preferred language',
    ja: '選択した言語に投稿とコメントを自動翻訳します'
  },
  'settings.darkModeLabel': {
    ko: '다크 모드',
    en: 'Dark mode',
    ja: 'ダークモード'
  },
  'settings.darkModeDescription': {
    ko: '어두운 테마를 사용합니다',
    en: 'Use the dark theme',
    ja: '暗いテーマを使用します'
  },
  'settings.autoPlayLabel': {
    ko: '동영상 자동 재생',
    en: 'Auto-play videos',
    ja: '動画の自動再生'
  },
  'settings.autoPlayDescription': {
    ko: '피드의 동영상을 자동으로 재생합니다',
    en: 'Automatically play videos in the feed',
    ja: 'フィード内の動画を自動再生します'
  },
  'settings.premiumTitle': {
    ko: '프리미엄 기능',
    en: 'Premium features',
    ja: 'プレミアム機能'
  },
  'settings.premiumDescription': {
    ko: 'ddudl 프리미엄으로 더 많은 기능을 이용하세요',
    en: 'Unlock more features with ddudl Premium',
    ja: 'Tteodeulプレミアムでさらに多くの機能を利用しましょう'
  },
  'settings.premiumBenefit': {
    ko: '프리미엄 멤버십으로 광고 제거, 특별 배지, 우선 지원 등의 혜택을 받으세요!',
    en: 'Get ad-free browsing, special badges, and priority support with Premium!',
    ja: 'プレミアムに加入して、広告なし、特別バッジ、優先サポートなどの特典を手に入れましょう！'
  },
  'settings.upgradeButton': {
    ko: '프리미엄 업그레이드',
    en: 'Upgrade to Premium',
    ja: 'プレミアムにアップグレード'
  },
  'settings.save': {
    ko: '설정 저장',
    en: 'Save settings',
    ja: '設定を保存'
  },
  'settings.saving': {
    ko: '저장 중...',
    en: 'Saving...',
    ja: '保存中...'
  },
  'settings.saved': {
    ko: '설정이 저장되었습니다.',
    en: 'Settings have been saved.',
    ja: '設定を保存しました。'
  },
  'settings.loading': {
    ko: '설정 로딩 중...',
    en: 'Loading settings...',
    ja: '設定を読み込み中...'
  }
} as const

export type TranslationKey = keyof typeof TRANSLATIONS

export function translate(
  language: SupportedLanguage,
  key: TranslationKey | string,
  fallback?: string,
  variables?: Record<string, string | number>
): string {
  const dictionary = TRANSLATIONS as Record<string, Record<SupportedLanguage, string>>
  const template = dictionary[key]?.[language] ?? fallback ?? dictionary[key]?.ko ?? fallback ?? key

  if (!variables) {
    return template
  }

  return Object.entries(variables).reduce<string>((acc, [name, value]) => {
    const pattern = new RegExp(`\\{\\{\\s*${name}\\s*\\}}`, 'g')
    return acc.replace(pattern, String(value))
  }, template)
}
