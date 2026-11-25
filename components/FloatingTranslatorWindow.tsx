'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  Languages,
  Minus,
  Maximize2,
  Minimize2,
  X,
  ArrowLeftRight,
  ChevronDown,
  Mic,
  MicOff,
  ClipboardPaste,
  Copy,
  Check,
  Eraser,
  Loader2,
  AlertTriangle,
  Sparkles,
  Zap,
  Layers,
  PictureInPicture2,
  Shield,
} from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import ReactMarkdown from 'react-markdown'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { readClipboardText } from '@/lib/clipboard'
import { isRunningInsideCapacitor } from '@/lib/app-update'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export type FloatingWindowMode = 'closed' | 'open' | 'minimized' | 'maximized'

export interface FloatingLanguageOption {
  id: string
  code: string
  labelEn: string
  labelMy: string
  speechLang: string
}

interface FloatingTranslatorWindowProps {
  mode: FloatingWindowMode
  onChangeMode: (mode: FloatingWindowMode) => void
  theme: 'default' | 'cyberpunk' | 'soft-minimal' | 'light' | 'dark' | 'midnight' | 'glass-modern' | 'brutalist'
  themeConfig: {
    bg: string
    text: string
    textMuted: string
    accent: string
    accentText: string
    border: string
    input: string
    icon: string
    shadow: string
    isDark: boolean
  }
  themeHover: {
    primary: string
    surface: string
    icon: string
  }
  appLang: 'en' | 'my'
  languages: FloatingLanguageOption[]
  targetLanguages: FloatingLanguageOption[]
  defaultSourceLang: string
  defaultTargetLang: string
  fontClass: string
  myanmarFontClass: string
  aiProvider: 'gemini' | 'groq'
  geminiModel: string
  groqModel: string
  geminiApiKey: string
  groqApiKey: string
  onTranslationSuccess: (meta: { sourceLang: string; targetLang: string }) => void
  onOpenApiSettings: () => void
  overlayPermissionGranted?: boolean
  autoFloatOnLeave?: boolean
  onToggleAutoFloat?: (next: boolean) => void
  onRequestOverlayPermission?: () => void
  onLaunchNativeOverlay?: () => void
}

export function getThemeOverlayPalette(
  theme: 'default' | 'cyberpunk' | 'soft-minimal' | 'light' | 'dark' | 'midnight' | 'glass-modern' | 'brutalist'
) {
  switch (theme) {
    case 'cyberpunk':
      return {
        themeBg: '#050505',
        themeCardBg: '#111418',
        themeText: '#00f2ff',
        themeMuted: '#67e8f9',
        themeAccent: '#00f2ff',
        themeAccentText: '#000000',
        themeBorder: '#5500f2ff',
      }
    case 'brutalist':
      return {
        themeBg: '#f8f8f5',
        themeCardBg: '#ffffff',
        themeText: '#000000',
        themeMuted: '#4b5563',
        themeAccent: '#ff3e00',
        themeAccentText: '#ffffff',
        themeBorder: '#000000',
      }
    case 'soft-minimal':
      return {
        themeBg: '#fafaf7',
        themeCardBg: '#ffffff',
        themeText: '#2c2c2c',
        themeMuted: '#6b7280',
        themeAccent: '#5a5a40',
        themeAccentText: '#ffffff',
        themeBorder: '#d8d8cc',
      }
    case 'light':
      return {
        themeBg: '#ffffff',
        themeCardBg: '#f3f4f6',
        themeText: '#111827',
        themeMuted: '#6b7280',
        themeAccent: '#2563eb',
        themeAccentText: '#ffffff',
        themeBorder: '#d1d5db',
      }
    case 'dark':
      return {
        themeBg: '#0a0a0a',
        themeCardBg: '#171717',
        themeText: '#ffffff',
        themeMuted: '#a1a1aa',
        themeAccent: '#ffffff',
        themeAccentText: '#000000',
        themeBorder: '#33ffffff',
      }
    case 'midnight':
      return {
        themeBg: '#1a1c1e',
        themeCardBg: '#2b2d31',
        themeText: '#e2e2e2',
        themeMuted: '#9ca3af',
        themeAccent: '#5865f2',
        themeAccentText: '#ffffff',
        themeBorder: '#33ffffff',
      }
    case 'glass-modern':
      return {
        themeBg: '#1b1d24',
        themeCardBg: '#282b36',
        themeText: '#ffffff',
        themeMuted: '#cbd5e1',
        themeAccent: '#6366f1',
        themeAccentText: '#ffffff',
        themeBorder: '#44ffffff',
      }
    default:
      return {
        themeBg: '#212121',
        themeCardBg: '#2b2b2b',
        themeText: '#ffffff',
        themeMuted: '#a1a1aa',
        themeAccent: '#10b981',
        themeAccentText: '#ffffff',
        themeBorder: '#33ffffff',
      }
  }
}

const COPY_MAP = {
  en: {
    title: 'Quick Translate',
    minimize: 'Minimize',
    maximize: 'Maximize',
    restore: 'Restore',
    close: 'Close',
    from: 'From',
    to: 'To',
    swap: 'Swap languages',
    placeholder: 'Enter text to translate...',
    translateBtn: 'Translate',
    translatingBtn: 'Translating...',
    paste: 'Paste',
    voice: 'Voice input',
    stopVoice: 'Stop listening',
    clear: 'Clear',
    copy: 'Copy',
    copied: 'Copied',
    resultLabel: 'Translation',
    openApiSettings: 'Open API Settings',
    pasteBlocked: 'Clipboard paste was blocked. Long-press the box to paste.',
    pasteEmpty: 'Clipboard is empty.',
    micDenied: 'Microphone permission was denied.',
    micUnsupported: 'Speech input is not supported in this browser.',
    floatOverApps: 'Float Over Apps',
    popOutPip: 'Pop Out Window',
    bgAutoOn: 'Background Float: On',
    bgAutoOff: 'Background Float: Off',
    overlayNeedPerm: 'Allow "Display over other apps" so Quick Translate keeps floating when you exit ME Translator.',
    grantOverlayPerm: 'Allow Display Over Apps',
    launchOverlayNow: 'Open Floating Bubble',
    overlayStartedNotice: 'Floating bubble launched! You can now switch to any app.',
    pipError: 'Could not open Picture-in-Picture window in this browser.',
  },
  my: {
    title: 'အမြန်ဘာသာပြန်',
    minimize: 'ချုံ့ထားမည်',
    maximize: 'ချဲ့ကြည့်မည်',
    restore: 'မူလအရွယ်ပြန်ထားမည်',
    close: 'ပိတ်မည်',
    from: 'မူရင်း',
    to: 'ဘာသာပြန်',
    swap: 'ဘာသာစကား လဲလှယ်မည်',
    placeholder: 'ဘာသာပြန်လိုသော စာသားရိုက်ထည့်ပါ...',
    translateBtn: 'ဘာသာပြန်မည်',
    translatingBtn: 'ဘာသာပြန်နေသည်...',
    paste: 'ကူးထည့်မည်',
    voice: 'အသံဖြင့်ရိုက်မည်',
    stopVoice: 'အသံသွင်းခြင်း ရပ်မည်',
    clear: 'ရှင်းလင်းမည်',
    copy: 'ကူးယူမည်',
    copied: 'ကူးပြီး',
    resultLabel: 'ဘာသာပြန်ရလဒ်',
    openApiSettings: 'API ဆက်တင်ဖွင့်မည်',
    pasteBlocked: 'Clipboard မှ တိုက်ရိုက်ကူးထည့်ခွင့် ပိတ်ထားပါသည်။ စာသားအကွက်ကို ဖိထားပြီး Paste လုပ်ပါ။',
    pasteEmpty: 'Clipboard ထဲတွင် စာသား မရှိသေးပါ။',
    micDenied: 'မိုက်ခရိုဖုန်း အသုံးပြုခွင့် ပိတ်ထားပါသည်။',
    micUnsupported: 'ဤစက်တွင် အသံဖြင့်စာရိုက်စနစ် အလုပ်မလုပ်ပါ။',
    floatOverApps: 'တခြားအက်ပ်ပေါ် ဖွင့်မည်',
    popOutPip: 'အပြင်ထုတ် ဖွင့်မည်',
    bgAutoOn: 'နောက်ခံ Float: ဖွင့်ထားသည်',
    bgAutoOff: 'နောက်ခံ Float: ပိတ်ထားသည်',
    overlayNeedPerm: 'အက်ပ်ထဲမှ ထွက်လိုက်သည့်အခါတွင်လည်း ဆက်လက်ဘာသာပြန်နိုင်ရန် "Display over other apps" ခွင့်ပြုချက် ဖွင့်ပေးပါ။',
    grantOverlayPerm: 'Display Over Apps ခွင့်ပြုမည်',
    launchOverlayNow: 'Floating Bubble ဖွင့်မည်',
    overlayStartedNotice: 'Floating Bubble ဖွင့်ပြီးပါပြီ — တခြားအက်ပ်များပေါ်သို့ ပြောင်း၍ ဘာသာပြန်နိုင်ပါပြီ။',
    pipError: 'ဤ Browser တွင် Picture-in-Picture ဝင်းဒိုး ဖွင့်၍မရပါ။',
  },
}

export default function FloatingTranslatorWindow({
  mode,
  onChangeMode,
  theme,
  themeConfig,
  themeHover,
  appLang,
  languages,
  targetLanguages,
  defaultSourceLang,
  defaultTargetLang,
  fontClass,
  myanmarFontClass,
  aiProvider,
  geminiModel,
  groqModel,
  geminiApiKey,
  groqApiKey,
  onTranslationSuccess,
  onOpenApiSettings,
  overlayPermissionGranted = false,
  autoFloatOnLeave = true,
  onToggleAutoFloat,
  onRequestOverlayPermission,
  onLaunchNativeOverlay,
}: FloatingTranslatorWindowProps) {
  const copy = COPY_MAP[appLang]
  const isCyber = theme === 'cyberpunk'
  const isGlass = theme === 'glass-modern'
  const isBrutal = theme === 'brutalist'

  const [sourceLang, setSourceLang] = useState(defaultSourceLang || 'Myanmar')
  const [targetLang, setTargetLang] = useState(defaultTargetLang || 'English')
  const [openLangMenu, setOpenLangMenu] = useState<'source' | 'target' | null>(null)
  const [inputText, setInputText] = useState('')
  const [outputText, setOutputText] = useState('')
  const [errorText, setErrorText] = useState<string | null>(null)
  const [noticeText, setNoticeText] = useState<string | null>(null)
  const [isTranslating, setIsTranslating] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [copiedOutput, setCopiedOutput] = useState(false)
  const [supportsPip, setSupportsPip] = useState(false)
  const [isCapacitorNative, setIsCapacitorNative] = useState(false)

  const langMenuRef = useRef<HTMLDivElement | null>(null)
  const recognitionRef = useRef<any>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const pipWindowRef = useRef<Window | null>(null)

  useEffect(() => {
    setIsCapacitorNative(isRunningInsideCapacitor())
    setSupportsPip(
      typeof window !== 'undefined' &&
        !isRunningInsideCapacitor() &&
        'documentPictureInPicture' in window
    )
  }, [])

  // Sync initial languages when opening from closed state
  const prevModeRef = useRef<FloatingWindowMode>(mode)
  useEffect(() => {
    if (prevModeRef.current === 'closed' && (mode === 'open' || mode === 'maximized')) {
      setSourceLang(defaultSourceLang || 'Myanmar')
      setTargetLang(defaultTargetLang || 'English')
      setOpenLangMenu(null)
      setTimeout(() => textareaRef.current?.focus(), 80)
    }
    if (mode === 'closed') {
      setOpenLangMenu(null)
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch {
          // ignore
        }
      }
      setIsListening(false)
    }
    prevModeRef.current = mode
  }, [mode, defaultSourceLang, defaultTargetLang])

  // Close language dropdown when clicking outside
  useEffect(() => {
    if (!openLangMenu) return
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target as Node)) {
        setOpenLangMenu(null)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    document.addEventListener('touchstart', handleOutside)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      document.removeEventListener('touchstart', handleOutside)
    }
  }, [openLangMenu])

  // Keyboard Escape support
  useEffect(() => {
    if (mode !== 'open' && mode !== 'maximized') return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (openLangMenu) {
          setOpenLangMenu(null)
        } else {
          onChangeMode('minimized')
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [mode, openLangMenu, onChangeMode])

  useEffect(() => {
    if (!noticeText) return
    const timer = setTimeout(() => setNoticeText(null), 4000)
    return () => clearTimeout(timer)
  }, [noticeText])

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch {
          // ignore
        }
      }
    }
  }, [])

  const handleSwapLanguages = () => {
    const nextSrc = sourceLang === 'Auto' ? targetLang : targetLang
    const nextTgt =
      sourceLang === 'Auto'
        ? targetLang === 'Myanmar'
          ? 'English'
          : 'Myanmar'
        : sourceLang
    setSourceLang(nextSrc)
    setTargetLang(nextTgt)
    setOpenLangMenu(null)
  }

  const handlePasteText = async () => {
    setNoticeText(null)
    try {
      const text = await readClipboardText()
      if (text && text.trim()) {
        setInputText((prev) => (prev ? `${prev}\n${text}` : text))
        textareaRef.current?.focus()
      } else {
        setNoticeText(copy.pasteEmpty)
      }
    } catch {
      setNoticeText(copy.pasteBlocked)
    }
  }

  const handleToggleVoice = async () => {
    setNoticeText(null)
    if (isListening) {
      try {
        recognitionRef.current?.stop()
      } catch {
        // ignore
      }
      setIsListening(false)
      return
    }

    const SpeechRecognition =
      typeof window !== 'undefined' &&
      ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
    if (!SpeechRecognition) {
      setNoticeText(copy.micUnsupported)
      return
    }

    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        stream.getTracks().forEach((track) => track.stop())
      } catch {
        setNoticeText(copy.micDenied)
        return
      }
    }

    try {
      const recognition = new SpeechRecognition()
      recognitionRef.current = recognition
      const selectedMeta = languages.find((item) => item.id === sourceLang)
      recognition.lang = selectedMeta?.speechLang || 'my-MM'
      recognition.interimResults = false
      recognition.maxAlternatives = 1

      recognition.onstart = () => setIsListening(true)
      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript
        if (transcript) {
          setInputText((prev) => (prev ? `${prev} ${transcript}` : transcript))
        }
      }
      recognition.onerror = () => setIsListening(false)
      recognition.onend = () => {
        setIsListening(false)
        recognitionRef.current = null
      }
      recognition.start()
    } catch {
      setIsListening(false)
      setNoticeText(copy.micDenied)
    }
  }

  const translateTextWithConfig = useCallback(
    async (
      rawText: string,
      src: string,
      tgt: string
    ): Promise<{ text?: string; error?: string; status?: number }> => {
      const textToTranslate = rawText.trim()
      if (!textToTranslate) return { error: '' }

      const activeKey = aiProvider === 'groq' ? groqApiKey : geminiApiKey
      const activeModel = aiProvider === 'groq' ? groqModel : geminiModel
      const MAX_RETRIES = 2
      let retryCount = 0

      const translateDirect = async (): Promise<{ text?: string; error?: string; status?: number }> => {
        const trimmedKey = activeKey.trim()
        if (!trimmedKey) {
          return {
            error:
              appLang === 'en'
                ? 'Please add your Gemini or Groq API Key in Settings > API first.'
                : 'ဘာသာပြန်နိုင်ရန် Settings > API ထဲတွင် သင်၏ API Key ကို ထည့်သွင်းပေးပါ။',
            status: 401,
          }
        }

        const isAutoSource = src.toLowerCase() === 'auto'
        const myanmarRule =
          tgt.toLowerCase() === 'myanmar'
            ? ' Ensure the Myanmar translation uses standard, polite, natural modern Burmese writing.'
            : ''
        const systemPrompt = isAutoSource
          ? `You are a master professional translator. Automatically detect the source language of the user's text and translate it accurately and naturally into ${tgt}.${myanmarRule} Output ONLY the translated text, with no introductory remarks, quotes, or explanations.`
          : `You are a master professional translator specializing in ${src} and ${tgt}. Translate accurately, naturally, and culturally appropriately from ${src} into ${tgt}.${myanmarRule} Output ONLY the translated text, with no introductory remarks, quotes, or explanations.`
        const userPrompt = isAutoSource
          ? `Detect the source language and translate the following text into ${tgt}. Only provide the translation:\n\n${textToTranslate}`
          : `Translate the following text from ${src} to ${tgt}. Only provide the translation:\n\n${textToTranslate}`

        if (aiProvider === 'groq') {
          const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${trimmedKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: activeModel || 'openai/gpt-oss-120b',
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
              ],
              temperature: 0.2,
            }),
          })
          const data = await res.json().catch(() => ({}))
          if (!res.ok) {
            return {
              error: data?.error?.message || `Groq API error (${res.status})`,
              status: res.status,
            }
          }
          const out = data?.choices?.[0]?.message?.content?.trim()
          return out ? { text: out } : { error: 'Empty response from Groq', status: 502 }
        }

        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
          activeModel || 'gemini-3.1-flash-lite'
        )}:generateContent?key=${encodeURIComponent(trimmedKey)}`
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          return {
            error: data?.error?.message || `Gemini API error (${res.status})`,
            status: res.status,
          }
        }
        const out = data?.candidates?.[0]?.content?.parts
          ?.map((p: any) => p?.text || '')
          .join('')
          .trim()
        return out ? { text: out } : { error: 'Empty response from Gemini', status: 502 }
      }

      const executeRequest = async (): Promise<{ text?: string; error?: string; status?: number }> => {
        try {
          if (isRunningInsideCapacitor()) {
            const direct = await translateDirect()
            if (direct.status === 429 && retryCount < MAX_RETRIES) {
              retryCount++
              await new Promise((r) => setTimeout(r, Math.pow(2, retryCount) * 800))
              return executeRequest()
            }
            return direct
          }

          const res = await fetch('/api/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: textToTranslate,
              sourceLang: src,
              targetLang: tgt,
              apiKey: activeKey.trim() || undefined,
              provider: aiProvider,
              model: activeModel,
            }),
          })

          if (res.status === 404) {
            return translateDirect()
          }

          const data = await res.json().catch(() => ({}))
          if (!res.ok) {
            const rawMsg = String(data?.details || data?.error || data?.message || `HTTP ${res.status}`)
            if (res.status === 429 && retryCount < MAX_RETRIES) {
              retryCount++
              await new Promise((r) => setTimeout(r, Math.pow(2, retryCount) * 800))
              return executeRequest()
            }
            return { error: rawMsg, status: res.status }
          }
          return data?.text ? { text: data.text } : { error: 'Empty translation response' }
        } catch (err: any) {
          return { error: err?.message || 'Network connection error' }
        }
      }

      return executeRequest()
    },
    [aiProvider, groqApiKey, geminiApiKey, groqModel, geminiModel, appLang]
  )

  const runQuickTranslate = useCallback(async () => {
    const textToTranslate = inputText.trim()
    if (!textToTranslate || isTranslating) return

    setIsTranslating(true)
    setErrorText(null)
    setNoticeText(null)

    try {
      const res = await translateTextWithConfig(textToTranslate, sourceLang, targetLang)
      if (res.error) {
        setErrorText(res.error)
      } else if (res.text) {
        setOutputText(res.text)
        onTranslationSuccess({ sourceLang, targetLang })
      }
    } finally {
      setIsTranslating(false)
    }
  }, [inputText, isTranslating, translateTextWithConfig, sourceLang, targetLang, onTranslationSuccess])

  const handleOpenDesktopPip = useCallback(async () => {
    try {
      const pipApi = (window as any).documentPictureInPicture
      if (!pipApi?.requestWindow) {
        setNoticeText(copy.pipError)
        return
      }
      if (pipWindowRef.current && !pipWindowRef.current.closed) {
        pipWindowRef.current.focus()
        return
      }

      const pipWin: Window = await pipApi.requestWindow({ width: 400, height: 520 })
      pipWindowRef.current = pipWin

      const doc = pipWin.document
      const pal = getThemeOverlayPalette(theme)
      doc.title = copy.title

      const styleEl = doc.createElement('style')
      styleEl.textContent = `
        * { box-sizing: border-box; font-family: system-ui, -apple-system, sans-serif; }
        html, body { margin: 0; padding: 0; background: ${pal.themeBg}; color: ${pal.themeText}; height: 100%; }
        .wrap { display: flex; flex-direction: column; height: 100%; padding: 12px; gap: 10px; }
        .top { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding-bottom: 8px; border-bottom: 1px solid ${pal.themeBorder}; }
        .title { font-size: 13px; font-weight: 700; }
        .btn { background: ${pal.themeCardBg}; color: ${pal.themeText}; border: 1px solid ${pal.themeBorder}; border-radius: 8px; padding: 6px 10px; font-size: 12px; font-weight: 600; cursor: pointer; min-height: 36px; }
        .primary { background: ${pal.themeAccent}; color: ${pal.themeAccentText}; border-color: ${pal.themeAccent}; width: 100%; min-height: 40px; font-weight: 700; }
        .lang-row { display: grid; grid-template-columns: 1fr auto 1fr; gap: 6px; align-items: center; }
        select { background: ${pal.themeCardBg}; color: ${pal.themeText}; border: 1px solid ${pal.themeBorder}; border-radius: 8px; padding: 8px; font-size: 12px; font-weight: 600; min-height: 38px; width: 100%; }
        textarea { width: 100%; min-height: 92px; resize: vertical; background: ${pal.themeCardBg}; color: ${pal.themeText}; border: 1px solid ${pal.themeBorder}; border-radius: 10px; padding: 10px; font-size: 13px; outline: none; }
        .actions { display: flex; gap: 6px; }
        .result { flex: 1; overflow-y: auto; background: ${pal.themeCardBg}; border: 1px solid ${pal.themeBorder}; border-radius: 10px; padding: 10px; font-size: 13px; line-height: 1.5; white-space: pre-wrap; word-break: break-word; user-select: text; }
        .err { color: #f87171; font-size: 12px; }
      `
      doc.head.appendChild(styleEl)

      const wrap = doc.createElement('div')
      wrap.className = 'wrap'

      const topBar = doc.createElement('div')
      topBar.className = 'top'
      const titleSpan = doc.createElement('span')
      titleSpan.className = 'title'
      titleSpan.textContent = `${copy.title} · ${aiProvider === 'groq' ? 'Groq' : 'Gemini'}`
      const backBtn = doc.createElement('button')
      backBtn.className = 'btn'
      backBtn.type = 'button'
      backBtn.textContent = copy.restore
      backBtn.onclick = () => {
        pipWin.close()
        window.focus()
        onChangeMode('open')
      }
      topBar.append(titleSpan, backBtn)

      const langRow = doc.createElement('div')
      langRow.className = 'lang-row'

      const srcSelect = doc.createElement('select')
      languages.forEach((opt) => {
        const o = doc.createElement('option')
        o.value = opt.id
        o.textContent = appLang === 'en' ? opt.labelEn : opt.labelMy
        if (opt.id === sourceLang) o.selected = true
        srcSelect.appendChild(o)
      })

      const tgtSelect = doc.createElement('select')
      targetLanguages.forEach((opt) => {
        const o = doc.createElement('option')
        o.value = opt.id
        o.textContent = appLang === 'en' ? opt.labelEn : opt.labelMy
        if (opt.id === targetLang) o.selected = true
        tgtSelect.appendChild(o)
      })

      const swapBtn = doc.createElement('button')
      swapBtn.className = 'btn'
      swapBtn.type = 'button'
      swapBtn.textContent = '⇄'
      swapBtn.onclick = () => {
        const prevSrc = srcSelect.value
        const prevTgt = tgtSelect.value
        srcSelect.value = prevTgt
        tgtSelect.value = prevSrc === 'Auto' ? (prevTgt === 'Myanmar' ? 'English' : 'Myanmar') : prevSrc
        setSourceLang(srcSelect.value)
        setTargetLang(tgtSelect.value)
      }
      srcSelect.onchange = () => setSourceLang(srcSelect.value)
      tgtSelect.onchange = () => setTargetLang(tgtSelect.value)
      langRow.append(srcSelect, swapBtn, tgtSelect)

      const textArea = doc.createElement('textarea')
      textArea.placeholder = copy.placeholder
      textArea.value = inputText

      const rowActions = doc.createElement('div')
      rowActions.className = 'actions'
      const pasteBtn = doc.createElement('button')
      pasteBtn.className = 'btn'
      pasteBtn.type = 'button'
      pasteBtn.textContent = copy.paste
      pasteBtn.onclick = async () => {
        try {
          const clip = await readClipboardText()
          if (clip && clip.trim()) {
            textArea.value = textArea.value ? `${textArea.value}\n${clip}` : clip
            setInputText(textArea.value)
          }
        } catch {
          // ignore
        }
      }
      const copyBtn = doc.createElement('button')
      copyBtn.className = 'btn'
      copyBtn.type = 'button'
      copyBtn.textContent = copy.copy

      const translateBtn = doc.createElement('button')
      translateBtn.className = 'btn primary'
      translateBtn.type = 'button'
      translateBtn.textContent = copy.translateBtn

      const resultDiv = doc.createElement('div')
      resultDiv.className = 'result'
      resultDiv.textContent = outputText || ''

      copyBtn.onclick = () => {
        const out = resultDiv.textContent || ''
        if (!out) return
        pipWin.navigator.clipboard?.writeText(out).catch(() => navigator.clipboard?.writeText(out).catch(() => {}))
        copyBtn.textContent = copy.copied
        setTimeout(() => {
          copyBtn.textContent = copy.copy
        }, 1500)
      }

      translateBtn.onclick = async () => {
        const val = textArea.value.trim()
        if (!val) return
        setInputText(textArea.value)
        translateBtn.disabled = true
        translateBtn.textContent = copy.translatingBtn
        resultDiv.className = 'result'
        const res = await translateTextWithConfig(val, srcSelect.value, tgtSelect.value)
        translateBtn.disabled = false
        translateBtn.textContent = copy.translateBtn
        if (res.error) {
          resultDiv.className = 'result err'
          resultDiv.textContent = res.error
        } else if (res.text) {
          resultDiv.textContent = res.text
          setOutputText(res.text)
          onTranslationSuccess({ sourceLang: srcSelect.value, targetLang: tgtSelect.value })
        }
      }

      rowActions.append(pasteBtn, copyBtn)
      wrap.append(topBar, langRow, textArea, rowActions, translateBtn, resultDiv)
      doc.body.appendChild(wrap)

      onChangeMode('minimized')
    } catch {
      setNoticeText(copy.pipError)
    }
  }, [
    copy,
    theme,
    aiProvider,
    languages,
    targetLanguages,
    appLang,
    sourceLang,
    targetLang,
    inputText,
    outputText,
    translateTextWithConfig,
    onTranslationSuccess,
    onChangeMode,
  ])

  const windowShellClasses = isCyber
    ? 'bg-black/95 border-2 border-[#00f2ff] text-[#00f2ff] shadow-[0_0_35px_rgba(0,242,255,0.35)]'
    : isBrutal
      ? 'bg-[#f8f8f5] border-4 border-black text-black shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] rounded-none'
      : isGlass
        ? 'bg-[#1a1c1e]/85 backdrop-blur-2xl border border-white/25 text-white shadow-[0_16px_48px_rgba(0,0,0,0.55)]'
        : theme === 'soft-minimal'
          ? 'bg-[#fafaf7] border border-[#dcdcd0] text-[#333333] shadow-2xl'
          : theme === 'light'
            ? 'bg-white border border-gray-200 text-gray-900 shadow-2xl'
            : theme === 'dark'
              ? 'bg-[#0a0a0a] border border-white/20 text-white shadow-2xl'
              : theme === 'midnight'
                ? 'bg-[#1a1c1e] border border-white/15 text-[#e2e2e2] shadow-2xl'
                : 'bg-[#212121] border border-white/15 text-white shadow-2xl'

  const cardSurfaceClasses = isCyber
    ? 'bg-black border-[#00f2ff]/35 text-[#00f2ff]'
    : isBrutal
      ? 'bg-white border-2 border-black text-black rounded-none shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]'
      : isGlass
        ? 'bg-white/10 backdrop-blur-md border-white/20 text-white'
        : themeConfig.isDark
          ? 'bg-white/5 border-white/10 text-white'
          : 'bg-white border-gray-200 text-gray-900 shadow-sm'

  const ctaButtonClasses = isCyber
    ? 'bg-[#00f2ff] text-black hover:bg-[#00d8e6] shadow-[0_0_20px_rgba(0,242,255,0.4)]'
    : isBrutal
      ? 'bg-[#ff3e00] text-white border-2 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
      : isGlass
        ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white border border-white/20 shadow-lg'
        : theme === 'dark'
          ? 'bg-white text-black hover:bg-gray-200'
          : theme === 'soft-minimal'
            ? 'bg-[#5A5A40] text-white hover:bg-[#4A4A30]'
            : theme === 'light'
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : theme === 'midnight'
                ? 'bg-[#5865f2] text-white hover:bg-[#4752c4]'
                : 'bg-emerald-600 text-white hover:bg-emerald-700'

  const fabClasses = isCyber
    ? 'bg-black/90 text-[#00f2ff] border-[#00f2ff]/60 shadow-[0_0_18px_rgba(0,242,255,0.4)] backdrop-blur-md'
    : isBrutal
      ? 'bg-[#ff3e00] text-white border-2 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
      : isGlass
        ? 'bg-white/15 text-white border-white/30 shadow-[0_8px_28px_rgba(31,38,135,0.4)] backdrop-blur-xl'
        : theme === 'soft-minimal'
          ? 'bg-white/95 text-[#5A5A40] border-[#dcdcd0] shadow-[0_6px_18px_rgba(90,90,64,0.18)] backdrop-blur-md'
          : theme === 'light'
            ? 'bg-white/95 text-blue-600 border-gray-200 shadow-[0_6px_18px_rgba(37,99,235,0.16)] backdrop-blur-md'
            : theme === 'dark'
              ? 'bg-[#141414]/95 text-white border-white/25 shadow-[0_6px_20px_rgba(0,0,0,0.75)] backdrop-blur-md'
              : theme === 'midnight'
                ? 'bg-[#2b2d31]/95 text-[#818cf8] border-[#5865f2]/45 shadow-[0_6px_20px_rgba(88,101,242,0.3)] backdrop-blur-md'
                : 'bg-[#2b2b2b]/90 text-emerald-400 border-white/15 shadow-[0_6px_20px_rgba(0,0,0,0.45)] backdrop-blur-md'

  const isBurmeseOutput =
    targetLang === 'Myanmar' || /[\u1000-\u109F\uAA60-\uAA7F]/.test(outputText)
  const isBurmeseInput =
    sourceLang === 'Myanmar' || /[\u1000-\u109F\uAA60-\uAA7F]/.test(inputText)

  const selectedSourceMeta = languages.find((l) => l.id === sourceLang)
  const selectedTargetMeta = targetLanguages.find((l) => l.id === targetLang)

  const handleCopyOutput = () => {
    if (!outputText) return
    navigator.clipboard?.writeText(outputText).catch(() => {})
    setCopiedOutput(true)
    setTimeout(() => setCopiedOutput(false), 1800)
  }

  return (
    <>
      {/* Top-Right Clean Floating Action Button (Shown when Closed) */}
      <AnimatePresence>
        {mode === 'closed' && (
          <motion.button
            key="quick-translate-fab"
            type="button"
            initial={{ opacity: 0, scale: 0.85, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: -6 }}
            transition={{ duration: 0.18 }}
            onClick={() => onChangeMode('open')}
            title={copy.title}
            aria-label={copy.title}
            className={cn(
              'absolute top-3 right-3 sm:top-4 sm:right-5 z-20 min-w-[44px] min-h-[44px] w-11 h-11 rounded-2xl border flex items-center justify-center transition-all duration-200',
              themeHover.surface,
              fabClasses
            )}
          >
            <Languages className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Minimized Desktop-Style Floating Bar (Top-Right Docked) */}
      <AnimatePresence>
        {mode === 'minimized' && (
          <motion.div
            key="quick-translate-minimized"
            initial={{ opacity: 0, scale: 0.9, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -6 }}
            transition={{ duration: 0.18 }}
            className={cn(
              'absolute top-3 right-3 sm:top-4 sm:right-5 z-30 flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-2xl border',
              windowShellClasses
            )}
          >
            <button
              type="button"
              onClick={() => onChangeMode('open')}
              className="flex items-center gap-2 min-h-[38px] pr-1 text-xs font-bold tracking-tight"
            >
              <Languages className={cn('w-4 h-4 shrink-0', themeConfig.icon)} />
              <span className="truncate max-w-[130px]">{copy.title}</span>
            </button>
            <div className="flex items-center gap-0.5 shrink-0">
              <button
                type="button"
                onClick={() => onChangeMode('open')}
                title={copy.restore}
                aria-label={copy.restore}
                className={cn(
                  'min-w-[36px] min-h-[36px] rounded-xl flex items-center justify-center transition-all duration-200',
                  themeHover.icon,
                  themeConfig.isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'
                )}
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onChangeMode('closed')}
                title={copy.close}
                aria-label={copy.close}
                className={cn(
                  'min-w-[36px] min-h-[36px] rounded-xl flex items-center justify-center transition-all duration-200',
                  themeHover.icon,
                  isCyber
                    ? 'hover:bg-red-500/20 text-red-400'
                    : themeConfig.isDark
                      ? 'hover:bg-red-500/20 text-red-400'
                      : 'hover:bg-red-50 text-red-600'
                )}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Open / Maximized Floating Quick Translator Window */}
      <AnimatePresence>
        {(mode === 'open' || mode === 'maximized') && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 pointer-events-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => onChangeMode('minimized')}
              className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
            />

            <motion.section
              layout
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 12 }}
              transition={{ duration: 0.2 }}
              aria-label={copy.title}
              className={cn(
                'relative z-10 flex flex-col overflow-hidden rounded-2xl border transition-[width,height] duration-200',
                mode === 'maximized'
                  ? 'w-full max-w-3xl h-[86dvh]'
                  : 'w-full max-w-md max-h-[84dvh]',
                windowShellClasses
              )}
            >
              {/* Window Title Bar with Computer-Style Minimize / Maximize / Close */}
              <div
                className={cn(
                  'shrink-0 flex items-center justify-between gap-2 px-3.5 sm:px-4 py-2.5 border-b',
                  isCyber
                    ? 'border-[#00f2ff]/25 bg-black/70'
                    : isBrutal
                      ? 'border-black bg-yellow-300'
                      : themeConfig.isDark
                        ? 'border-white/10 bg-white/[0.03]'
                        : 'border-black/10 bg-black/[0.02]'
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={cn(
                      'w-7 h-7 rounded-lg flex items-center justify-center shrink-0',
                      isCyber
                        ? 'bg-[#00f2ff]/15 text-[#00f2ff]'
                        : isBrutal
                          ? 'bg-black text-white rounded-none'
                          : cn(themeConfig.accent, themeConfig.accentText)
                    )}
                  >
                    <Languages className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex items-center gap-2">
                    <h2 className="text-xs sm:text-sm font-bold tracking-wide truncate">
                      {copy.title}
                    </h2>
                    <span
                      className={cn(
                        'hidden xs:inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border shrink-0',
                        isCyber
                          ? 'border-[#00f2ff]/40 text-[#00f2ff] bg-[#00f2ff]/10'
                          : isBrutal
                            ? 'border-black bg-white text-black rounded-none'
                            : themeConfig.isDark
                              ? 'border-white/15 bg-white/10 text-gray-200'
                              : 'border-black/10 bg-black/5 text-gray-700'
                      )}
                    >
                      {aiProvider === 'groq' ? (
                        <Zap className="w-2.5 h-2.5 text-amber-400" />
                      ) : (
                        <Sparkles className="w-2.5 h-2.5 text-emerald-400" />
                      )}
                      <span>{aiProvider === 'groq' ? 'Groq' : 'Gemini'}</span>
                    </span>
                  </div>
                </div>

                {/* Computer-style Minimize, Maximize/Restore, Close + Background Float Icons */}
                <div className="flex items-center gap-1 shrink-0">
                  {isCapacitorNative && (
                    <button
                      type="button"
                      onClick={() => {
                        if (!overlayPermissionGranted) {
                          onRequestOverlayPermission?.()
                        } else {
                          setNoticeText(copy.overlayStartedNotice)
                          onLaunchNativeOverlay?.()
                        }
                      }}
                      title={copy.floatOverApps}
                      aria-label={copy.floatOverApps}
                      className={cn(
                        'min-w-[38px] min-h-[38px] px-2 rounded-lg flex items-center justify-center gap-1.5 text-[11px] font-bold transition-all duration-200 border',
                        themeHover.surface,
                        overlayPermissionGranted
                          ? isCyber
                            ? 'border-[#00f2ff]/45 text-[#00f2ff] bg-[#00f2ff]/10'
                            : themeConfig.isDark
                              ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                              : 'border-emerald-300 bg-emerald-50 text-emerald-800'
                          : isCyber
                            ? 'border-amber-400/50 text-amber-300 bg-amber-500/10'
                            : themeConfig.isDark
                              ? 'border-amber-500/40 bg-amber-500/10 text-amber-200'
                              : 'border-amber-300 bg-amber-50 text-amber-800'
                      )}
                    >
                      <Layers className="w-3.5 h-3.5 shrink-0" />
                      <span className="hidden sm:inline whitespace-nowrap">{copy.floatOverApps}</span>
                    </button>
                  )}

                  {supportsPip && (
                    <button
                      type="button"
                      onClick={handleOpenDesktopPip}
                      title={copy.popOutPip}
                      aria-label={copy.popOutPip}
                      className={cn(
                        'min-w-[38px] min-h-[38px] rounded-lg flex items-center justify-center transition-all duration-200 border border-transparent',
                        themeHover.icon,
                        isCyber
                          ? 'text-[#00f2ff] hover:bg-[#00f2ff]/15 hover:border-[#00f2ff]/40'
                          : isBrutal
                            ? 'bg-white text-black border-black hover:bg-gray-100 rounded-none'
                            : themeConfig.isDark
                              ? 'text-gray-300 hover:bg-white/10 hover:text-white'
                              : 'text-gray-700 hover:bg-black/5 hover:text-black'
                      )}
                    >
                      <PictureInPicture2 className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => onChangeMode('minimized')}
                    title={copy.minimize}
                    aria-label={copy.minimize}
                    className={cn(
                      'min-w-[38px] min-h-[38px] rounded-lg flex items-center justify-center transition-all duration-200 border border-transparent',
                      themeHover.icon,
                      isCyber
                        ? 'text-[#00f2ff] hover:bg-[#00f2ff]/15 hover:border-[#00f2ff]/40'
                        : isBrutal
                          ? 'bg-white text-black border-black hover:bg-gray-100 rounded-none'
                          : themeConfig.isDark
                            ? 'text-gray-300 hover:bg-white/10 hover:text-white'
                            : 'text-gray-700 hover:bg-black/5 hover:text-black'
                    )}
                  >
                    <Minus className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      onChangeMode(mode === 'maximized' ? 'open' : 'maximized')
                    }
                    title={mode === 'maximized' ? copy.restore : copy.maximize}
                    aria-label={mode === 'maximized' ? copy.restore : copy.maximize}
                    className={cn(
                      'min-w-[38px] min-h-[38px] rounded-lg flex items-center justify-center transition-all duration-200 border border-transparent',
                      themeHover.icon,
                      isCyber
                        ? 'text-[#00f2ff] hover:bg-[#00f2ff]/15 hover:border-[#00f2ff]/40'
                        : isBrutal
                          ? 'bg-white text-black border-black hover:bg-gray-100 rounded-none'
                          : themeConfig.isDark
                            ? 'text-gray-300 hover:bg-white/10 hover:text-white'
                            : 'text-gray-700 hover:bg-black/5 hover:text-black'
                    )}
                  >
                    {mode === 'maximized' ? (
                      <Minimize2 className="w-4 h-4" />
                    ) : (
                      <Maximize2 className="w-4 h-4" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => onChangeMode('closed')}
                    title={copy.close}
                    aria-label={copy.close}
                    className={cn(
                      'min-w-[38px] min-h-[38px] rounded-lg flex items-center justify-center transition-all duration-200 border border-transparent',
                      themeHover.icon,
                      isBrutal
                        ? 'bg-[#ff3e00] text-white border-black rounded-none'
                        : isCyber
                          ? 'text-red-400 hover:bg-red-500/20 hover:border-red-400/50'
                          : themeConfig.isDark
                            ? 'text-gray-300 hover:bg-red-500/20 hover:text-red-300'
                            : 'text-gray-700 hover:bg-red-50 hover:text-red-600'
                    )}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Scrollable Window Body */}
              <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-3.5 sm:p-5 space-y-3.5 scrollbar-thin scrollbar-thumb-white/10">
                {/* Android Background Floating Bar */}
                {isCapacitorNative && (
                  <div
                    className={cn(
                      'rounded-xl border px-3 py-2.5 flex flex-col gap-2 text-xs',
                      cardSurfaceClasses
                    )}
                  >
                    {!overlayPermissionGranted ? (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-start gap-2 min-w-0">
                          <Shield className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                          <span className="leading-relaxed opacity-90">{copy.overlayNeedPerm}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => onRequestOverlayPermission?.()}
                          className={cn(
                            'min-h-[38px] px-3 py-1.5 rounded-lg font-bold text-xs shrink-0 transition-all',
                            themeHover.primary,
                            ctaButtonClasses
                          )}
                        >
                          {copy.grantOverlayPerm}
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => onToggleAutoFloat?.(!autoFloatOnLeave)}
                          className={cn(
                            'min-h-[36px] px-2.5 py-1 rounded-lg border text-xs font-semibold inline-flex items-center gap-1.5 transition-all',
                            themeHover.surface,
                            autoFloatOnLeave
                              ? isCyber
                                ? 'border-[#00f2ff]/50 bg-[#00f2ff]/15 text-[#00f2ff]'
                                : themeConfig.isDark
                                  ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                                  : 'border-emerald-300 bg-emerald-50 text-emerald-800'
                              : themeConfig.isDark
                                ? 'border-white/15 bg-white/5 text-gray-300'
                                : 'border-gray-300 bg-gray-100 text-gray-700'
                          )}
                        >
                          <Layers className="w-3.5 h-3.5 shrink-0" />
                          <span>{autoFloatOnLeave ? copy.bgAutoOn : copy.bgAutoOff}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setNoticeText(copy.overlayStartedNotice)
                            onLaunchNativeOverlay?.()
                          }}
                          className={cn(
                            'min-h-[36px] px-3 py-1 rounded-lg text-xs font-bold shrink-0 transition-all',
                            themeHover.primary,
                            ctaButtonClasses
                          )}
                        >
                          {copy.launchOverlayNow}
                        </button>
                      </div>
                    )}
                  </div>
                )}
                {/* Language Pair Selector Row */}
                <div ref={langMenuRef} className="relative">
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setOpenLangMenu((prev) => (prev === 'source' ? null : 'source'))
                      }
                      className={cn(
                        'min-h-[44px] px-3 py-2 rounded-xl border flex items-center justify-between gap-2 text-xs sm:text-sm font-bold transition-all duration-200 min-w-0',
                        themeHover.surface,
                        cardSurfaceClasses,
                        openLangMenu === 'source' &&
                          (isCyber ? 'border-[#00f2ff]' : 'ring-1 ring-current/25')
                      )}
                    >
                      <span className="truncate">
                        {appLang === 'en'
                          ? selectedSourceMeta?.labelEn || sourceLang
                          : selectedSourceMeta?.labelMy || sourceLang}
                      </span>
                      <ChevronDown
                        className={cn(
                          'w-4 h-4 shrink-0 opacity-70 transition-transform',
                          openLangMenu === 'source' && 'rotate-180'
                        )}
                      />
                    </button>

                    <button
                      type="button"
                      onClick={handleSwapLanguages}
                      title={copy.swap}
                      aria-label={copy.swap}
                      className={cn(
                        'min-w-[44px] min-h-[44px] rounded-xl border flex items-center justify-center transition-all duration-200',
                        themeHover.icon,
                        cardSurfaceClasses
                      )}
                    >
                      <ArrowLeftRight className={cn('w-4 h-4', themeConfig.icon)} />
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setOpenLangMenu((prev) => (prev === 'target' ? null : 'target'))
                      }
                      className={cn(
                        'min-h-[44px] px-3 py-2 rounded-xl border flex items-center justify-between gap-2 text-xs sm:text-sm font-bold transition-all duration-200 min-w-0',
                        themeHover.surface,
                        cardSurfaceClasses,
                        openLangMenu === 'target' &&
                          (isCyber ? 'border-[#00f2ff]' : 'ring-1 ring-current/25')
                      )}
                    >
                      <span className="truncate">
                        {appLang === 'en'
                          ? selectedTargetMeta?.labelEn || targetLang
                          : selectedTargetMeta?.labelMy || targetLang}
                      </span>
                      <ChevronDown
                        className={cn(
                          'w-4 h-4 shrink-0 opacity-70 transition-transform',
                          openLangMenu === 'target' && 'rotate-180'
                        )}
                      />
                    </button>
                  </div>

                  {/* Language Picker Dropdown */}
                  <AnimatePresence>
                    {openLangMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.14 }}
                        className={cn(
                          'absolute left-0 right-0 top-full mt-2 z-30 rounded-xl border shadow-2xl max-h-56 overflow-y-auto p-1',
                          isCyber
                            ? 'bg-black border-[#00f2ff] text-[#00f2ff]'
                            : isBrutal
                              ? 'bg-white border-4 border-black text-black rounded-none'
                              : themeConfig.isDark
                                ? 'bg-[#222222] border-white/15 text-white'
                                : 'bg-white border-gray-200 text-gray-900'
                        )}
                      >
                        {(openLangMenu === 'source' ? languages : targetLanguages).map(
                          (opt) => {
                            const isSelected =
                              openLangMenu === 'source'
                                ? sourceLang === opt.id
                                : targetLang === opt.id
                            return (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => {
                                  if (openLangMenu === 'source') {
                                    if (opt.id === targetLang) {
                                      setTargetLang(
                                        sourceLang === 'Auto'
                                          ? opt.id === 'English'
                                            ? 'Myanmar'
                                            : 'English'
                                          : sourceLang
                                      )
                                    }
                                    setSourceLang(opt.id)
                                  } else {
                                    if (opt.id === sourceLang) {
                                      setSourceLang(targetLang)
                                    }
                                    setTargetLang(opt.id)
                                  }
                                  setOpenLangMenu(null)
                                }}
                                className={cn(
                                  'w-full min-h-[42px] px-3 py-2 rounded-lg flex items-center justify-between gap-2 text-left text-xs transition-colors',
                                  isSelected
                                    ? isCyber
                                      ? 'bg-[#00f2ff] text-black font-bold'
                                      : isBrutal
                                        ? 'bg-black text-white font-bold rounded-none'
                                        : themeConfig.isDark
                                          ? 'bg-emerald-600/30 text-emerald-300 font-bold'
                                          : 'bg-emerald-50 text-emerald-800 font-bold'
                                    : isCyber
                                      ? 'hover:bg-[#00f2ff]/10'
                                      : themeConfig.isDark
                                        ? 'hover:bg-white/5'
                                        : 'hover:bg-gray-100'
                                )}
                              >
                                <span className="flex items-center gap-2 min-w-0">
                                  <span className="font-mono text-[11px] font-bold w-9 shrink-0 opacity-75">
                                    {opt.code}
                                  </span>
                                  <span className="truncate">
                                    {appLang === 'en'
                                      ? opt.labelEn
                                      : `${opt.labelMy} (${opt.labelEn})`}
                                  </span>
                                </span>
                                {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                              </button>
                            )
                          }
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Split Grid in Maximized Mode on Tablet/Desktop */}
                <div
                  className={cn(
                    'gap-3.5',
                    mode === 'maximized'
                      ? 'grid grid-cols-1 md:grid-cols-2 md:items-stretch'
                      : 'flex flex-col'
                  )}
                >
                  {/* Input Box Card + Translate CTA */}
                  <div className="flex flex-col gap-3 min-w-0">
                    <div
                      className={cn(
                        'rounded-2xl border p-3 flex flex-col gap-2 transition-colors',
                        cardSurfaceClasses
                      )}
                    >
                      <textarea
                        ref={textareaRef}
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={(e) => {
                          if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                            e.preventDefault()
                            runQuickTranslate()
                          }
                        }}
                        placeholder={copy.placeholder}
                        rows={mode === 'maximized' ? 7 : 4}
                        className={cn(
                          'w-full resize-none bg-transparent text-sm sm:text-base leading-relaxed focus:outline-none placeholder:opacity-50',
                          isBurmeseInput ? myanmarFontClass : fontClass
                        )}
                      />

                      <div
                        className={cn(
                          'flex items-center justify-between gap-2 pt-2 border-t',
                          isCyber
                            ? 'border-[#00f2ff]/20'
                            : isBrutal
                              ? 'border-black/15'
                              : themeConfig.isDark
                                ? 'border-white/10'
                                : 'border-black/10'
                        )}
                      >
                        <div className="text-[11px] opacity-60 tabular-nums">
                          {inputText.length > 0 ? `${inputText.length}` : ''}
                        </div>
                        <div className="flex items-center gap-1">
                          {inputText.length > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                setInputText('')
                                setOutputText('')
                                setErrorText(null)
                                textareaRef.current?.focus()
                              }}
                              title={copy.clear}
                              aria-label={copy.clear}
                              className={cn(
                                'min-w-[40px] min-h-[40px] rounded-xl flex items-center justify-center transition-all duration-200',
                                themeHover.icon,
                                themeConfig.isDark
                                  ? 'text-gray-300 hover:bg-white/10'
                                  : 'text-gray-600 hover:bg-black/5'
                              )}
                            >
                              <Eraser className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={handleToggleVoice}
                            title={isListening ? copy.stopVoice : copy.voice}
                            aria-label={isListening ? copy.stopVoice : copy.voice}
                            className={cn(
                              'min-w-[40px] min-h-[40px] rounded-xl flex items-center justify-center transition-all duration-200',
                              themeHover.icon,
                              isListening
                                ? 'bg-red-500/20 text-red-400 animate-pulse'
                                : themeConfig.isDark
                                  ? 'text-gray-300 hover:bg-white/10'
                                  : 'text-gray-600 hover:bg-black/5'
                            )}
                          >
                            {isListening ? (
                              <MicOff className="w-4 h-4" />
                            ) : (
                              <Mic className="w-4 h-4" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={handlePasteText}
                            title={copy.paste}
                            aria-label={copy.paste}
                            className={cn(
                              'min-w-[40px] min-h-[40px] rounded-xl flex items-center justify-center transition-all duration-200',
                              themeHover.icon,
                              themeConfig.isDark
                                ? 'text-gray-300 hover:bg-white/10'
                                : 'text-gray-600 hover:bg-black/5'
                            )}
                          >
                            <ClipboardPaste className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {noticeText && (
                      <div
                        className={cn(
                          'px-3 py-2 rounded-xl border text-xs flex items-center gap-2',
                          themeConfig.isDark
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                            : 'bg-amber-50 border-amber-200 text-amber-800'
                        )}
                      >
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>{noticeText}</span>
                      </div>
                    )}

                    {/* Primary Translate CTA */}
                    <button
                      type="button"
                      disabled={!inputText.trim() || isTranslating}
                      onClick={runQuickTranslate}
                      className={cn(
                        'w-full min-h-[46px] px-4 py-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-45 disabled:pointer-events-none',
                        themeHover.primary,
                        ctaButtonClasses
                      )}
                    >
                      {isTranslating ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Languages className="w-4 h-4" />
                      )}
                      <span>{isTranslating ? copy.translatingBtn : copy.translateBtn}</span>
                    </button>
                  </div>

                  {/* Output / Result Pane */}
                  {(outputText || errorText || mode === 'maximized') && (
                    <div
                      className={cn(
                        'rounded-2xl border p-3.5 flex flex-col justify-between gap-3 min-w-0 min-h-[130px]',
                        cardSurfaceClasses
                      )}
                    >
                      <div className="flex items-center justify-between gap-2 pb-2 border-b border-current/10">
                        <span className="text-[11px] font-bold uppercase tracking-wider opacity-70 truncate">
                          {copy.resultLabel} · {sourceLang} → {targetLang}
                        </span>
                        {outputText && (
                          <button
                            type="button"
                            onClick={handleCopyOutput}
                            className={cn(
                              'min-h-[34px] px-2.5 py-1 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 border transition-all duration-200 shrink-0',
                              themeHover.surface,
                              isCyber
                                ? 'border-[#00f2ff]/40 text-[#00f2ff] hover:bg-[#00f2ff]/10'
                                : themeConfig.isDark
                                  ? 'border-white/15 bg-white/5 text-gray-200 hover:bg-white/10'
                                  : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
                            )}
                          >
                            {copiedOutput ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                                <span className="text-emerald-500">{copy.copied}</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>{copy.copy}</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>

                      {errorText ? (
                        <div className="space-y-2.5 text-xs text-red-400">
                          <div className="flex items-start gap-2 leading-relaxed">
                            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                            <span className="break-words">{errorText}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              onChangeMode('minimized')
                              onOpenApiSettings()
                            }}
                            className={cn(
                              'min-h-[38px] px-3 py-1.5 rounded-lg border text-xs font-bold transition-all',
                              themeHover.surface,
                              isCyber
                                ? 'border-[#00f2ff]/40 text-[#00f2ff]'
                                : themeConfig.isDark
                                  ? 'border-white/20 text-white hover:bg-white/10'
                                  : 'border-gray-300 text-gray-800 hover:bg-gray-100'
                            )}
                          >
                            {copy.openApiSettings}
                          </button>
                        </div>
                      ) : outputText ? (
                        <div
                          className={cn(
                            'selectable-message prose prose-invert max-w-full min-w-0 text-sm sm:text-base leading-relaxed break-words [overflow-wrap:anywhere] flex-1 overflow-y-auto',
                            isBurmeseOutput ? myanmarFontClass : fontClass,
                            isCyber && 'prose-p:text-[#00f2ff] prose-strong:text-[#00f2ff]',
                            !themeConfig.isDark && !isBrutal && 'prose-p:text-gray-800 prose-strong:text-black',
                            isBrutal && 'prose-p:text-black prose-strong:text-black'
                          )}
                        >
                          <ReactMarkdown>{outputText}</ReactMarkdown>
                        </div>
                      ) : (
                        <div className="flex-1 flex items-center justify-center text-xs opacity-45 py-6 text-center">
                          {copy.placeholder}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </motion.section>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
