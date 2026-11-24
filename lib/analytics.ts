import { APP_VERSION } from '@/lib/app-config';
import { isRunningInsideCapacitor } from '@/lib/app-update';

const GA_MEASUREMENT_ID_PATTERN = /^G-[A-Z0-9]{4,20}$/i;
const GA_CLIENT_ID_STORAGE_KEY = 'me_translator_ga_client_id';
const GA_SCRIPT_ELEMENT_ID = 'me-translator-ga4-script';

export type AppPlatform = 'android_apk' | 'pwa_standalone' | 'web';

type GtagFn = (...args: unknown[]) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: GtagFn;
    __meTranslatorGaInitialized?: string;
  }
}

export function normalizeMeasurementId(rawId?: string | null): string {
  const trimmed = (rawId ?? '').trim();
  return GA_MEASUREMENT_ID_PATTERN.test(trimmed) ? trimmed.toUpperCase() : '';
}

export function getEnvMeasurementId(): string {
  return normalizeMeasurementId(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID);
}

export function detectAppPlatform(): AppPlatform {
  if (typeof window === 'undefined') return 'web';
  if (isRunningInsideCapacitor()) return 'android_apk';

  const isStandalone =
    window.matchMedia?.('(display-mode: standalone)')?.matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

  return isStandalone ? 'pwa_standalone' : 'web';
}

function getOrCreateAnonymousClientId(): string {
  if (typeof window === 'undefined') return '';
  try {
    const existing = window.localStorage.getItem(GA_CLIENT_ID_STORAGE_KEY);
    if (existing && /^[a-z0-9._-]{8,64}$/i.test(existing)) {
      return existing;
    }
    const generated =
      typeof window.crypto?.randomUUID === 'function'
        ? window.crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
    window.localStorage.setItem(GA_CLIENT_ID_STORAGE_KEY, generated);
    return generated;
  } catch {
    return '';
  }
}

function getSanitizedPageLocation(platform: AppPlatform): string {
  if (typeof window === 'undefined') return 'https://metranslator.app/';
  const pathname = window.location?.pathname || '/';
  if (
    platform === 'android_apk' ||
    window.location?.protocol === 'capacitor:' ||
    window.location?.protocol === 'file:'
  ) {
    return `https://android.metranslator.app${pathname.startsWith('/') ? pathname : '/'}`;
  }
  return window.location?.href || 'https://metranslator.app/';
}

function ensureGtagQueue(): void {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag !== 'function') {
    window.gtag = function gtag(...args: unknown[]) {
      window.dataLayer?.push(args);
    };
  }
}

export function initGoogleAnalytics(overrideMeasurementId?: string): string {
  if (typeof window === 'undefined') return '';

  const measurementId =
    normalizeMeasurementId(overrideMeasurementId) ||
    getEnvMeasurementId() ||
    normalizeMeasurementId(window.__meTranslatorGaInitialized);
  if (!measurementId) return '';

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return '';
  }

  const platform = detectAppPlatform();
  const clientId = getOrCreateAnonymousClientId();
  const pageLocation = getSanitizedPageLocation(platform);

  ensureGtagQueue();

  if (!document.getElementById(GA_SCRIPT_ELEMENT_ID)) {
    const script = document.createElement('script');
    script.id = GA_SCRIPT_ELEMENT_ID;
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
    document.head.appendChild(script);
  }

  if (window.__meTranslatorGaInitialized !== measurementId) {
    window.__meTranslatorGaInitialized = measurementId;
    window.gtag?.('js', new Date());
    window.gtag?.('config', measurementId, {
      send_page_view: false,
      anonymize_ip: true,
      cookie_flags: 'SameSite=Lax',
      ...(clientId ? { client_id: clientId } : {}),
    });

    window.gtag?.('set', 'user_properties', {
      app_platform: platform,
      app_version: APP_VERSION,
    });

    window.gtag?.('event', 'page_view', {
      page_title: document.title || 'ME Translator',
      page_location: pageLocation,
      app_platform: platform,
      app_version: APP_VERSION,
    });
  }

  return measurementId;
}

export function trackAnalyticsEvent(
  eventName: string,
  params: Record<string, string | number | boolean> = {},
  overrideMeasurementId?: string
): void {
  if (typeof window === 'undefined') return;
  const measurementId = initGoogleAnalytics(overrideMeasurementId);
  if (!measurementId || typeof window.gtag !== 'function') return;

  const platform = detectAppPlatform();
  window.gtag('event', eventName, {
    ...params,
    app_platform: platform,
    app_version: APP_VERSION,
  });
}

export function trackTranslationCompleted(options: {
  provider: string;
  sourceLang: string;
  targetLang: string;
  uiLanguage: string;
}): void {
  trackAnalyticsEvent('translation_completed', {
    ai_provider: options.provider.slice(0, 32),
    source_lang: options.sourceLang.slice(0, 32),
    target_lang: options.targetLang.slice(0, 32),
    ui_language: options.uiLanguage.slice(0, 12),
  });
}
