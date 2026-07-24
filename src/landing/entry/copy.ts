// 入口切片所需文案,移植自 V0.0 src/i18n/copy.js(zh→zh-CN, en→en)。
// 只保留 Landing 唤醒 / 语言仪式 / 模式仪式 / 进入过渡 这条链路用到的键。
import type { LanguageCode } from '../../domain/contracts'

export interface EntryCopy {
  landingPromptInitial: string
  landingPromptResume: string
  languageInitTitle: string
  languageInitProceed: string
  languageInitChange: string
  modeInitTitle: string
  modeImmersive: string
  modeStandard: string
  transitionStart: string
  transitionResume: string
  reset: string
}

export const entryCopy: Record<LanguageCode, EntryCopy> = {
  'zh-CN': {
    landingPromptInitial: '向下滚动，开始读取',
    landingPromptResume: '向下滚动，继续读取',
    languageInitTitle: '文本层已接入：当前语言',
    languageInitProceed: '继续读取',
    languageInitChange: '是否变更',
    modeInitTitle: '环境层已接入',
    modeImmersive: '沉浸模式',
    modeStandard: '阅读模式',
    transitionStart: '开始读取',
    transitionResume: '回读中',
    reset: '重置',
  },
  en: {
    landingPromptInitial: 'scroll to enter',
    landingPromptResume: 'scroll to resume',
    languageInitTitle: 'text layer · current language',
    languageInitProceed: 'continue',
    languageInitChange: 'change',
    modeInitTitle: 'environment layer · connected',
    modeImmersive: 'immersive',
    modeStandard: 'reading',
    transitionStart: 'begin reading',
    transitionResume: 'resuming',
    reset: 'reset',
  },
}

// V0.1 内容目前支持的语言,对应 V0.0 的 READER_LANGUAGES(此切片只暴露受支持的两种)。
export interface EntryLanguage {
  code: LanguageCode
  label: string
}

export const ENTRY_LANGUAGES: EntryLanguage[] = [
  { code: 'zh-CN', label: '中文' },
  { code: 'en', label: 'English' },
]

export function getEntryLanguage(code: LanguageCode): EntryLanguage {
  return ENTRY_LANGUAGES.find((item) => item.code === code) ?? ENTRY_LANGUAGES[0]
}

export function getNextEntryLanguage(code: LanguageCode): EntryLanguage {
  const index = ENTRY_LANGUAGES.findIndex((item) => item.code === code)
  return ENTRY_LANGUAGES[(index + 1) % ENTRY_LANGUAGES.length]
}
