'use client';

import { registerPlugin, type PluginListenerHandle } from '@capacitor/core';

export interface DownloadProgressEvent {
  loaded: number;
  total: number;
  percent: number;
}

export interface FloatingOverlayConfig {
  aiProvider: 'gemini' | 'groq';
  geminiModel: string;
  groqModel: string;
  geminiApiKey: string;
  groqApiKey: string;
  sourceLang: string;
  targetLang: string;
  appLang: 'en' | 'my';
  autoFloatOnLeave: boolean;
  themeBg: string;
  themeCardBg: string;
  themeText: string;
  themeMuted: string;
  themeAccent: string;
  themeAccentText: string;
  themeBorder: string;
}

export interface AppInstallerPlugin {
  canRequestPackageInstalls(): Promise<{ granted: boolean }>;
  openInstallPermissionSettings(): Promise<void>;
  hasAudioPermission(): Promise<{ state: 'granted' | 'denied' | 'prompt' }>;
  requestAudioPermission(): Promise<{ state: 'granted' | 'denied' | 'prompt' }>;
  openAppSettings(): Promise<void>;
  canDrawOverlays(): Promise<{ granted: boolean }>;
  openOverlayPermissionSettings(): Promise<void>;
  syncFloatingConfig(config: FloatingOverlayConfig): Promise<void>;
  startFloatingOverlay(options?: {
    expanded?: boolean;
  }): Promise<{ status: 'started' | 'permission_needed' }>;
  stopFloatingOverlay(): Promise<void>;
  getFloatingOverlayState(): Promise<{
    running: boolean;
    granted: boolean;
    autoFloatOnLeave: boolean;
  }>;
  downloadAndInstallApk(options: {
    url: string;
    filename: string;
  }): Promise<{ status: 'installing' | 'permission_needed'; path: string }>;
  installApkFile(options: {
    path: string;
  }): Promise<{ status: 'installing' | 'permission_needed' }>;
  addListener(
    eventName: 'downloadProgress',
    listenerFunc: (event: DownloadProgressEvent) => void
  ): Promise<PluginListenerHandle>;
}

export const AppInstaller = registerPlugin<AppInstallerPlugin>('AppInstaller');
