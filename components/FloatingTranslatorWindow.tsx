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

  const langMenuRef = useRef<HTMLDivElement | null>(null)
  const recognitionRef = useRef<any>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

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

  const runQuickTranslate = useCallback(async () => {
    const textToTranslate = inputText.trim()
    if (!textToTranslate || isTranslating) return

    setIsTranslating(true)
    setErrorText(null)
    setNoticeText(null)

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

      const isAutoSource = sourceLang.toLowerCase() === 'auto'
      const myanmarRule =
        targetLang.toLowerCase() === 'myanmar'
          ? ' Ensure the Myanmar translation uses standard, polite, natural modern Burmese writing.'
          : ''
      const systemPrompt = isAutoSource
        ? `You are a master professional translator. Automatically detect the source language of the user's text and translate it accurately and naturally into ${targetLang}.${myanmarRule} Output ONLY the translated text, with no introductory remarks, quotes, or explanations.`
        : `You are a master professional translator specializing in ${sourceLang} and ${targetLang}. Translate accurately, naturally, and culturally appropriately from ${sourceLang} into ${targetLang}.${myanmarRule} Output ONLY the translated text, with no introductory remarks, quotes, or explanations.`
      const userPrompt = isAutoSource
        ? `Detect the source language and translate the following text into ${targetLang}. Only provide the translation:\n\n${textToTranslate}`
        : `Translate the following text from ${sourceLang} to ${targetLang}. Only provide the translation:\n\n${textToTranslate}`

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
            sourceLang,
            targetLang,
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

    try {
      const res = await executeRequest()
      if (res.error) {
        setErrorText(res.error)
      } else if (res.text) {
        setOutputText(res.text)
        onTranslationSuccess({ sourceLang, targetLang })
      }
    } finally {
      setIsTranslating(false)
    }
  }, [
    inputText,
    isTranslating,
    aiProvider,
    groqApiKey,
    geminiApiKey,
    groqModel,
    geminiModel,
    appLang,
    sourceLang,
    targetLang,
    onTranslationSuccess,
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

                {/* Computer-style Minimize, Maximize/Restore, Close Icons */}
                <div className="flex items-center gap-1 shrink-0">
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
