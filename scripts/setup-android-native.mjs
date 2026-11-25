import fs from 'node:fs';
import path from 'node:path';

const versionCode = parseInt(process.argv[2] || '111', 10) || 111;
const versionName = process.argv[3] || '1.1.0';
const rootDir = process.cwd();
const androidDir = path.join(rootDir, 'android');

if (!fs.existsSync(androidDir)) {
  console.error('android/ directory does not exist. Run `npx cap add android` first.');
  process.exit(1);
}

// 1. Update versionCode, versionName, and optional persistent release keystore in android/app/build.gradle
const buildGradlePath = path.join(androidDir, 'app', 'build.gradle');
let buildGradle = fs.readFileSync(buildGradlePath, 'utf8');
buildGradle = buildGradle
  .replace(/versionCode\s+\d+/, `versionCode ${versionCode}`)
  .replace(/versionName\s+"[^"]*"/, `versionName "${versionName}"`);

const builtInKeystorePath = path.join(rootDir, 'signing', 'me-translator.keystore');
const hasEnvKeystore = Boolean(
  process.env.ANDROID_KEYSTORE_PATH &&
  fs.existsSync(process.env.ANDROID_KEYSTORE_PATH) &&
  process.env.ANDROID_KEYSTORE_PASSWORD &&
  process.env.ANDROID_KEY_ALIAS &&
  process.env.ANDROID_KEY_PASSWORD
);

const keystorePath = hasEnvKeystore ? process.env.ANDROID_KEYSTORE_PATH : builtInKeystorePath;
const keystorePassword = hasEnvKeystore ? process.env.ANDROID_KEYSTORE_PASSWORD : 'metranslator2026';
const keyAlias = hasEnvKeystore ? process.env.ANDROID_KEY_ALIAS : 'me-translator';
const keyPassword = hasEnvKeystore ? process.env.ANDROID_KEY_PASSWORD : 'metranslator2026';

if (keystorePath && fs.existsSync(keystorePath) && keystorePassword && keyAlias && keyPassword) {
  const escapedPath = keystorePath.replace(/\\/g, '/');
  const storeTypeLine = hasEnvKeystore ? '' : '\n            storeType "PKCS12"';
  const signingBlock = `
    signingConfigs {
        persistent {
            storeFile file("${escapedPath}")${storeTypeLine}
            storePassword "${keystorePassword}"
            keyAlias "${keyAlias}"
            keyPassword "${keyPassword}"
            enableV1Signing true
            enableV2Signing true
            enableV3Signing true
        }
    }
`;
  if (!buildGradle.includes('signingConfigs {')) {
    buildGradle = buildGradle.replace('buildTypes {', `${signingBlock}\n    buildTypes {`);
  }
  if (!buildGradle.includes('signingConfig signingConfigs.persistent')) {
    buildGradle = buildGradle.replace(
      /buildTypes\s*\{/,
      `buildTypes {\n        debug {\n            signingConfig signingConfigs.persistent\n        }`
    );
    buildGradle = buildGradle.replace(
      /release\s*\{/,
      `release {\n            signingConfig signingConfigs.persistent`
    );
  }
  console.log(
    hasEnvKeystore
      ? 'Configured persistent Android signing keystore from environment secrets.'
      : 'Configured persistent Android signing keystore from signing/me-translator.keystore.'
  );
} else {
  console.warn('Warning: No persistent Android signing keystore found.');
}

fs.writeFileSync(buildGradlePath, buildGradle, 'utf8');

// 2. Ensure required AndroidManifest.xml permissions (Audio + Package Install Prompt)
const manifestPath = path.join(androidDir, 'app', 'src', 'main', 'AndroidManifest.xml');
let manifest = fs.readFileSync(manifestPath, 'utf8');
const requiredPermissions = [
  'android.permission.RECORD_AUDIO',
  'android.permission.MODIFY_AUDIO_SETTINGS',
  'android.permission.REQUEST_INSTALL_PACKAGES',
  'android.permission.SYSTEM_ALERT_WINDOW',
  'android.permission.FOREGROUND_SERVICE',
  'android.permission.FOREGROUND_SERVICE_SPECIAL_USE',
  'android.permission.POST_NOTIFICATIONS',
];

const missingPerms = requiredPermissions.filter((perm) => !manifest.includes(perm));
if (missingPerms.length > 0) {
  const permTags = missingPerms
    .map((perm) => `    <uses-permission android:name="${perm}" />`)
    .join('\n');
  manifest = manifest.replace(
    '<uses-permission android:name="android.permission.INTERNET" />',
    `<uses-permission android:name="android.permission.INTERNET" />\n${permTags}`
  );
}

if (!manifest.includes('FloatingOverlayService')) {
  const serviceXml = `
        <service
            android:name=".FloatingOverlayService"
            android:enabled="true"
            android:exported="false"
            android:foregroundServiceType="specialUse">
            <property
                android:name="android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE"
                android:value="Floating Quick Translator overlay displayed over other apps" />
        </service>
`;
  manifest = manifest.replace('</application>', `${serviceXml}    </application>`);
}

if (manifest.includes('android:windowSoftInputMode=')) {
  manifest = manifest.replace(
    /android:windowSoftInputMode="[^"]*"/g,
    'android:windowSoftInputMode="adjustResize"'
  );
} else {
  manifest = manifest.replace(
    /<activity\b/,
    '<activity\n            android:windowSoftInputMode="adjustResize"'
  );
}

fs.writeFileSync(manifestPath, manifest, 'utf8');

// 3. Ensure FileProvider paths cover cacheDir & filesDir for direct APK installation
const filePathsXml = path.join(androidDir, 'app', 'src', 'main', 'res', 'xml', 'file_paths.xml');
fs.mkdirSync(path.dirname(filePathsXml), { recursive: true });
fs.writeFileSync(
  filePathsXml,
  `<?xml version="1.0" encoding="utf-8"?>
<paths xmlns:android="http://schemas.android.com/apk/res/android">
    <cache-path name="my_cache_images" path="." />
    <files-path name="internal_files" path="." />
    <external-path name="my_images" path="." />
</paths>
`,
  'utf8'
);

// 4. Write native AppInstallerPlugin.java + FloatingOverlayService.java
const javaPkgDir = path.join(androidDir, 'app', 'src', 'main', 'java', 'com', 'metranslator', 'app');
fs.mkdirSync(javaPkgDir, { recursive: true });

const floatingOverlayJava = `package com.metranslator.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ServiceInfo;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.ColorFilter;
import android.graphics.Paint;
import android.graphics.PixelFormat;
import android.graphics.RectF;
import android.graphics.Typeface;
import android.graphics.drawable.Drawable;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.provider.Settings;
import android.text.InputType;
import android.text.TextUtils;
import android.util.DisplayMetrics;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.view.inputmethod.InputMethodManager;
import android.widget.Button;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import androidx.core.app.NotificationCompat;
import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.json.JSONArray;
import org.json.JSONObject;

public class FloatingOverlayService extends Service {
    public static final String PREFS_NAME = "me_translator_overlay";
    public static final String ACTION_START_BUBBLE = "com.metranslator.app.START_BUBBLE";
    public static final String ACTION_START_PANEL = "com.metranslator.app.START_PANEL";
    public static final String ACTION_STOP = "com.metranslator.app.STOP_OVERLAY";
    public static final String ACTION_REFRESH_THEME = "com.metranslator.app.REFRESH_OVERLAY";

    private static final String CHANNEL_ID = "me_translator_floating_channel";
    private static final int NOTIFICATION_ID = 4029;

    public static volatile boolean isServiceRunning = false;
    private static volatile boolean startedAutomatically = false;
    private static volatile boolean suppressNextBackground = false;

    private static final String[] SOURCE_LANG_IDS = new String[] {
        "Auto", "Myanmar", "English", "Thai", "Japanese", "Korean", "Chinese",
        "Malay", "Indonesian", "Hindi", "French", "German", "Spanish", "Arabic", "Russian"
    };
    private static final String[] TARGET_LANG_IDS = new String[] {
        "Myanmar", "English", "Thai", "Japanese", "Korean", "Chinese",
        "Malay", "Indonesian", "Hindi", "French", "German", "Spanish", "Arabic", "Russian"
    };

    private final ExecutorService networkExecutor = Executors.newSingleThreadExecutor();
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    private WindowManager windowManager;
    private View bubbleView;
    private View panelView;
    private WindowManager.LayoutParams bubbleParams;
    private WindowManager.LayoutParams panelParams;
    private boolean isExpanded = false;
    private boolean isTranslating = false;

    private EditText inputEdit;
    private TextView outputText;
    private TextView statusText;
    private Button translateBtn;
    private Button copyBtn;
    private Button sourceLangBtn;
    private Button targetLangBtn;
    private ScrollView langPickerScroll;
    private LinearLayout langPickerList;
    private String openPickerKind = null;
    private String selectedSourceLang = "Myanmar";
    private String selectedTargetLang = "English";

    private int colorBg = 0xFF1F2124;
    private int colorCard = 0xFF2B2E33;
    private int colorText = 0xFFFFFFFF;
    private int colorMuted = 0xFFA1A1AA;
    private int colorAccent = 0xFF10B981;
    private int colorAccentText = 0xFFFFFFFF;
    private int colorBorder = 0x33FFFFFF;

    public static void suppressNextBackgroundOnce() {
        suppressNextBackground = true;
    }

    public static boolean canDrawOverlays(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            return Settings.canDrawOverlays(context);
        }
        return true;
    }

    public static void handleAppBackgrounded(Context context) {
        if (suppressNextBackground) {
            suppressNextBackground = false;
            return;
        }
        if (!canDrawOverlays(context)) {
            return;
        }
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        boolean autoFloat = prefs.getBoolean("autoFloatOnLeave", true);
        if (!autoFloat) {
            return;
        }
        if (isServiceRunning) {
            return;
        }
        startedAutomatically = true;
        Intent intent = new Intent(context, FloatingOverlayService.class);
        intent.setAction(ACTION_START_BUBBLE);
        startCompat(context, intent);
    }

    public static void handleAppForegrounded(Context context) {
        if (isServiceRunning && startedAutomatically) {
            startedAutomatically = false;
            Intent intent = new Intent(context, FloatingOverlayService.class);
            intent.setAction(ACTION_STOP);
            context.startService(intent);
        }
    }

    public static void startCompat(Context context, Intent intent) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(intent);
        } else {
            context.startService(intent);
        }
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        isServiceRunning = true;
        windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);
        createNotificationChannel();
        startForegroundCompat();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent != null ? intent.getAction() : ACTION_START_BUBBLE;
        if (ACTION_STOP.equals(action)) {
            startedAutomatically = false;
            stopSelf();
            return START_NOT_STICKY;
        }

        if (!canDrawOverlays(this)) {
            stopSelf();
            return START_NOT_STICKY;
        }

        loadThemeColors();

        if (ACTION_START_PANEL.equals(action)) {
            startedAutomatically = false;
            showExpandedPanel();
        } else if (ACTION_REFRESH_THEME.equals(action)) {
            if (isExpanded) {
                showExpandedPanel();
            } else {
                showBubble();
            }
        } else {
            if (!isExpanded) {
                showBubble();
            }
        }
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        isServiceRunning = false;
        removeViews();
        networkExecutor.shutdownNow();
        super.onDestroy();
    }

    private void startForegroundCompat() {
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        boolean isMy = "my".equals(prefs.getString("appLang", "en"));

        Intent openAppIntent = new Intent(this, MainActivity.class);
        openAppIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        int piFlags = PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0);
        PendingIntent openPending = PendingIntent.getActivity(this, 10, openAppIntent, piFlags);

        Intent stopIntent = new Intent(this, FloatingOverlayService.class);
        stopIntent.setAction(ACTION_STOP);
        PendingIntent stopPending = PendingIntent.getService(this, 11, stopIntent, piFlags);

        Notification notif = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(getApplicationInfo().icon)
            .setContentTitle(isMy ? "ME Translator · အမြန်ဘာသာပြန်" : "ME Translator · Quick Translate")
            .setContentText(isMy ? "တခြားအက်ပ်များပေါ်မှ ဘာသာပြန်ရန် ခလုတ်ကို နှိပ်ပါ" : "Tap the floating bubble to translate over any app")
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setContentIntent(openPending)
            .addAction(0, isMy ? "ပိတ်မည်" : "Close", stopPending)
            .build();

        if (Build.VERSION.SDK_INT >= 34) {
            startForeground(NOTIFICATION_ID, notif, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE);
        } else {
            startForeground(NOTIFICATION_ID, notif);
        }
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Floating Quick Translator",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Keeps Floating Quick Translator active over other apps");
            channel.setShowBadge(false);
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    private int parseHexColor(String hex, int fallback) {
        if (hex == null || hex.trim().isEmpty()) return fallback;
        try {
            return Color.parseColor(hex.trim());
        } catch (Exception e) {
            return fallback;
        }
    }

    private void loadThemeColors() {
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        colorBg = parseHexColor(prefs.getString("themeBg", ""), 0xFF1F2124);
        colorCard = parseHexColor(prefs.getString("themeCardBg", ""), 0xFF2B2E33);
        colorText = parseHexColor(prefs.getString("themeText", ""), 0xFFFFFFFF);
        colorMuted = parseHexColor(prefs.getString("themeMuted", ""), 0xFFA1A1AA);
        colorAccent = parseHexColor(prefs.getString("themeAccent", ""), 0xFF10B981);
        colorAccentText = parseHexColor(prefs.getString("themeAccentText", ""), 0xFFFFFFFF);
        colorBorder = parseHexColor(prefs.getString("themeBorder", ""), 0x33FFFFFF);
    }

    private int dp(int value) {
        return Math.round(TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_DIP,
            value,
            getResources().getDisplayMetrics()
        ));
    }

    private int getOverlayWindowType() {
        return Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
            ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            : WindowManager.LayoutParams.TYPE_PHONE;
    }

    private void removeViews() {
        if (windowManager == null) return;
        if (bubbleView != null) {
            try { windowManager.removeView(bubbleView); } catch (Exception ignored) {}
            bubbleView = null;
        }
        if (panelView != null) {
            try { windowManager.removeView(panelView); } catch (Exception ignored) {}
            panelView = null;
        }
    }

    private void showBubble() {
        isExpanded = false;
        if (panelView != null) {
            try { windowManager.removeView(panelView); } catch (Exception ignored) {}
            panelView = null;
        }
        if (bubbleView != null) {
            try { windowManager.removeView(bubbleView); } catch (Exception ignored) {}
            bubbleView = null;
        }

        DisplayMetrics dm = getResources().getDisplayMetrics();
        int size = dp(54);

        FrameLayout container = new FrameLayout(this);
        GradientDrawable bg = new GradientDrawable();
        bg.setShape(GradientDrawable.RECTANGLE);
        bg.setCornerRadius(dp(18));
        bg.setColor(colorBg);
        bg.setStroke(dp(2), colorAccent);
        container.setBackground(bg);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            container.setElevation(dp(8));
        }

        // Crisp drawn dual-bubble / translate glyph
        View glyph = new View(this);
        glyph.setBackground(new Drawable() {
            private final Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
            @Override
            public void draw(Canvas canvas) {
                int w = getBounds().width();
                int h = getBounds().height();
                p.setStyle(Paint.Style.STROKE);
                p.setStrokeWidth(dp(2));
                p.setColor(colorAccent);
                canvas.drawRoundRect(new RectF(w * 0.22f, h * 0.24f, w * 0.66f, h * 0.62f), dp(4), dp(4), p);
                p.setStyle(Paint.Style.FILL);
                p.setColor(colorAccent);
                canvas.drawRoundRect(new RectF(w * 0.36f, h * 0.42f, w * 0.78f, h * 0.78f), dp(4), dp(4), p);
                p.setColor(colorAccentText);
                p.setTextAlign(Paint.Align.CENTER);
                p.setTypeface(Typeface.DEFAULT_BOLD);
                p.setTextSize(w * 0.22f);
                canvas.drawText("ME", w * 0.57f, h * 0.66f, p);
            }
            @Override public void setAlpha(int alpha) {}
            @Override public void setColorFilter(ColorFilter cf) {}
            @Override public int getOpacity() { return PixelFormat.TRANSLUCENT; }
        });
        FrameLayout.LayoutParams glyphLp = new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
        );
        container.addView(glyph, glyphLp);

        if (bubbleParams == null) {
            bubbleParams = new WindowManager.LayoutParams(
                size,
                size,
                getOverlayWindowType(),
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
                PixelFormat.TRANSLUCENT
            );
            bubbleParams.gravity = Gravity.TOP | Gravity.START;
            bubbleParams.x = dm.widthPixels - size - dp(12);
            bubbleParams.y = Math.max(dp(90), dm.heightPixels / 4);
        } else {
            bubbleParams.width = size;
            bubbleParams.height = size;
        }

        container.setOnTouchListener(new View.OnTouchListener() {
            private int initialX, initialY;
            private float initialTouchX, initialTouchY;
            private boolean moved = false;

            @Override
            public boolean onTouch(View v, MotionEvent event) {
                switch (event.getAction()) {
                    case MotionEvent.ACTION_DOWN:
                        initialX = bubbleParams.x;
                        initialY = bubbleParams.y;
                        initialTouchX = event.getRawX();
                        initialTouchY = event.getRawY();
                        moved = false;
                        return true;
                    case MotionEvent.ACTION_MOVE:
                        int dx = Math.round(event.getRawX() - initialTouchX);
                        int dy = Math.round(event.getRawY() - initialTouchY);
                        if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
                            moved = true;
                        }
                        bubbleParams.x = Math.max(0, Math.min(dm.widthPixels - size, initialX + dx));
                        bubbleParams.y = Math.max(dp(24), Math.min(dm.heightPixels - size - dp(24), initialY + dy));
                        if (bubbleView != null && windowManager != null) {
                            windowManager.updateViewLayout(bubbleView, bubbleParams);
                        }
                        return true;
                    case MotionEvent.ACTION_UP:
                        if (!moved) {
                            showExpandedPanel();
                        } else {
                            // Snap to left or right edge cleanly
                            bubbleParams.x = (bubbleParams.x + size / 2) < (dm.widthPixels / 2)
                                ? dp(10)
                                : dm.widthPixels - size - dp(10);
                            if (bubbleView != null && windowManager != null) {
                                windowManager.updateViewLayout(bubbleView, bubbleParams);
                            }
                        }
                        return true;
                }
                return false;
            }
        });

        bubbleView = container;
        windowManager.addView(bubbleView, bubbleParams);
    }

    private GradientDrawable makeCardBg(int bgColor, int strokeColor, int radiusDp) {
        GradientDrawable gd = new GradientDrawable();
        gd.setShape(GradientDrawable.RECTANGLE);
        gd.setCornerRadius(dp(radiusDp));
        gd.setColor(bgColor);
        gd.setStroke(dp(1), strokeColor);
        return gd;
    }

    private void renderLangPicker(final SharedPreferences prefs) {
        if (langPickerScroll == null || langPickerList == null) return;
        langPickerList.removeAllViews();
        if (openPickerKind == null) {
            langPickerScroll.setVisibility(View.GONE);
            return;
        }
        final boolean isSource = "source".equals(openPickerKind);
        final String[] items = isSource ? SOURCE_LANG_IDS : TARGET_LANG_IDS;
        final String current = isSource ? selectedSourceLang : selectedTargetLang;

        for (final String langId : items) {
            Button itemBtn = new Button(this);
            boolean isSelected = langId.equalsIgnoreCase(current);
            itemBtn.setText(langId + (isSelected ? "  ✓" : ""));
            itemBtn.setTextColor(isSelected ? colorAccentText : colorText);
            itemBtn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 13);
            itemBtn.setTypeface(isSelected ? Typeface.DEFAULT_BOLD : Typeface.DEFAULT);
            itemBtn.setAllCaps(false);
            itemBtn.setGravity(Gravity.CENTER_VERTICAL | Gravity.START);
            itemBtn.setPadding(dp(12), dp(8), dp(12), dp(8));
            itemBtn.setBackground(makeCardBg(isSelected ? colorAccent : colorCard, colorBorder, 8));
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                dp(40)
            );
            lp.bottomMargin = dp(4);
            itemBtn.setOnClickListener(v -> {
                if (isSource) {
                    if (langId.equalsIgnoreCase(selectedTargetLang)) {
                        selectedTargetLang = "Auto".equalsIgnoreCase(selectedSourceLang)
                            ? ("English".equalsIgnoreCase(langId) ? "Myanmar" : "English")
                            : selectedSourceLang;
                    }
                    selectedSourceLang = langId;
                } else {
                    if (langId.equalsIgnoreCase(selectedSourceLang)) {
                        selectedSourceLang = selectedTargetLang;
                    }
                    selectedTargetLang = langId;
                }
                prefs.edit()
                    .putString("sourceLang", selectedSourceLang)
                    .putString("targetLang", selectedTargetLang)
                    .apply();
                if (sourceLangBtn != null) sourceLangBtn.setText(selectedSourceLang + " ▾");
                if (targetLangBtn != null) targetLangBtn.setText(selectedTargetLang + " ▾");
                openPickerKind = null;
                renderLangPicker(prefs);
            });
            langPickerList.addView(itemBtn, lp);
        }
        langPickerScroll.setVisibility(View.VISIBLE);
    }

    private Button makeHeaderActionBtn(String label, int textColor, int bgColor) {
        Button btn = new Button(this);
        btn.setText(label);
        btn.setTextColor(textColor);
        btn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 15);
        btn.setTypeface(Typeface.DEFAULT_BOLD);
        btn.setAllCaps(false);
        btn.setPadding(0, 0, 0, 0);
        btn.setBackground(makeCardBg(bgColor, colorBorder, 8));
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(dp(36), dp(36));
        lp.leftMargin = dp(4);
        btn.setLayoutParams(lp);
        return btn;
    }

    private void showExpandedPanel() {
        isExpanded = true;
        if (bubbleView != null) {
            try { windowManager.removeView(bubbleView); } catch (Exception ignored) {}
            bubbleView = null;
        }
        if (panelView != null) {
            try { windowManager.removeView(panelView); } catch (Exception ignored) {}
            panelView = null;
        }

        final SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        final boolean isMy = "my".equals(prefs.getString("appLang", "en"));
        String provider = prefs.getString("aiProvider", "gemini");

        DisplayMetrics dm = getResources().getDisplayMetrics();
        int panelWidth = Math.min(dm.widthPixels - dp(20), dp(380));

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackground(makeCardBg(colorBg, colorAccent, 16));
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            root.setElevation(dp(12));
        }

        // 1. Draggable Title Bar (with Computer-style Minimize / Maximize / Close)
        LinearLayout titleBar = new LinearLayout(this);
        titleBar.setOrientation(LinearLayout.HORIZONTAL);
        titleBar.setGravity(Gravity.CENTER_VERTICAL);
        titleBar.setPadding(dp(14), dp(10), dp(10), dp(10));
        titleBar.setBackgroundColor(colorCard);

        TextView titleTv = new TextView(this);
        titleTv.setText((isMy ? "အမြန်ဘာသာပြန် · " : "Quick Translate · ") + ("groq".equalsIgnoreCase(provider) ? "Groq" : "Gemini"));
        titleTv.setTextColor(colorText);
        titleTv.setTextSize(TypedValue.COMPLEX_UNIT_SP, 13);
        titleTv.setTypeface(Typeface.DEFAULT_BOLD);
        titleTv.setSingleLine(true);
        titleTv.setEllipsize(TextUtils.TruncateAt.END);
        LinearLayout.LayoutParams titleLp = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f);
        titleBar.addView(titleTv, titleLp);

        Button minBtn = makeHeaderActionBtn("—", colorText, colorBg);
        minBtn.setContentDescription(isMy ? "ချုံ့မည်" : "Minimize");
        minBtn.setOnClickListener(v -> {
            hideKeyboard();
            showBubble();
        });

        Button maxBtn = makeHeaderActionBtn("□", colorText, colorBg);
        maxBtn.setContentDescription(isMy ? "အက်ပ်ဖွင့်မည်" : "Maximize");
        maxBtn.setOnClickListener(v -> {
            hideKeyboard();
            startedAutomatically = false;
            Intent appIntent = new Intent(this, MainActivity.class);
            appIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            startActivity(appIntent);
            stopSelf();
        });

        Button closeBtn = makeHeaderActionBtn("×", 0xFFF87171, colorBg);
        closeBtn.setContentDescription(isMy ? "ပိတ်မည်" : "Close");
        closeBtn.setOnClickListener(v -> {
            hideKeyboard();
            startedAutomatically = false;
            stopSelf();
        });

        titleBar.addView(minBtn);
        titleBar.addView(maxBtn);
        titleBar.addView(closeBtn);
        root.addView(titleBar);

        // Make title bar draggable
        titleBar.setOnTouchListener(new View.OnTouchListener() {
            private int initialX, initialY;
            private float initialTouchX, initialTouchY;
            @Override
            public boolean onTouch(View v, MotionEvent event) {
                switch (event.getAction()) {
                    case MotionEvent.ACTION_DOWN:
                        initialX = panelParams.x;
                        initialY = panelParams.y;
                        initialTouchX = event.getRawX();
                        initialTouchY = event.getRawY();
                        return true;
                    case MotionEvent.ACTION_MOVE:
                        panelParams.x = initialX + Math.round(event.getRawX() - initialTouchX);
                        panelParams.y = Math.max(dp(12), initialY + Math.round(event.getRawY() - initialTouchY));
                        if (panelView != null && windowManager != null) {
                            windowManager.updateViewLayout(panelView, panelParams);
                        }
                        return true;
                }
                return false;
            }
        });

        // 2. Body container
        LinearLayout body = new LinearLayout(this);
        body.setOrientation(LinearLayout.VERTICAL);
        body.setPadding(dp(12), dp(12), dp(12), dp(12));

        selectedSourceLang = prefs.getString("sourceLang", "Myanmar");
        selectedTargetLang = prefs.getString("targetLang", "English");
        openPickerKind = null;

        // Language row
        LinearLayout langRow = new LinearLayout(this);
        langRow.setOrientation(LinearLayout.HORIZONTAL);
        langRow.setGravity(Gravity.CENTER_VERTICAL);

        sourceLangBtn = new Button(this);
        sourceLangBtn.setText(selectedSourceLang + " ▾");
        sourceLangBtn.setTextColor(colorText);
        sourceLangBtn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 13);
        sourceLangBtn.setTypeface(Typeface.DEFAULT_BOLD);
        sourceLangBtn.setAllCaps(false);
        sourceLangBtn.setSingleLine(true);
        sourceLangBtn.setEllipsize(TextUtils.TruncateAt.END);
        sourceLangBtn.setBackground(makeCardBg(colorCard, colorBorder, 10));
        sourceLangBtn.setOnClickListener(v -> {
            openPickerKind = "source".equals(openPickerKind) ? null : "source";
            renderLangPicker(prefs);
        });

        targetLangBtn = new Button(this);
        targetLangBtn.setText(selectedTargetLang + " ▾");
        targetLangBtn.setTextColor(colorText);
        targetLangBtn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 13);
        targetLangBtn.setTypeface(Typeface.DEFAULT_BOLD);
        targetLangBtn.setAllCaps(false);
        targetLangBtn.setSingleLine(true);
        targetLangBtn.setEllipsize(TextUtils.TruncateAt.END);
        targetLangBtn.setBackground(makeCardBg(colorCard, colorBorder, 10));
        targetLangBtn.setOnClickListener(v -> {
            openPickerKind = "target".equals(openPickerKind) ? null : "target";
            renderLangPicker(prefs);
        });

        Button swapBtn = new Button(this);
        swapBtn.setText("⇄");
        swapBtn.setTextColor(colorAccent);
        swapBtn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 15);
        swapBtn.setAllCaps(false);
        swapBtn.setPadding(0, 0, 0, 0);
        swapBtn.setBackground(makeCardBg(colorCard, colorBorder, 10));
        LinearLayout.LayoutParams swapLp = new LinearLayout.LayoutParams(dp(42), dp(42));
        swapLp.leftMargin = dp(6);
        swapLp.rightMargin = dp(6);
        swapBtn.setLayoutParams(swapLp);
        swapBtn.setOnClickListener(v -> {
            String curSrc = selectedSourceLang;
            String curTgt = selectedTargetLang;
            selectedSourceLang = curTgt;
            selectedTargetLang = "Auto".equalsIgnoreCase(curSrc)
                ? ("Myanmar".equalsIgnoreCase(curTgt) ? "English" : "Myanmar")
                : curSrc;
            sourceLangBtn.setText(selectedSourceLang + " ▾");
            targetLangBtn.setText(selectedTargetLang + " ▾");
            prefs.edit().putString("sourceLang", selectedSourceLang).putString("targetLang", selectedTargetLang).apply();
            openPickerKind = null;
            renderLangPicker(prefs);
        });

        LinearLayout.LayoutParams spinLp = new LinearLayout.LayoutParams(0, dp(42), 1f);
        langRow.addView(sourceLangBtn, spinLp);
        langRow.addView(swapBtn);
        langRow.addView(targetLangBtn, spinLp);
        body.addView(langRow);

        langPickerScroll = new ScrollView(this);
        langPickerScroll.setVisibility(View.GONE);
        LinearLayout.LayoutParams pickerLp = new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            dp(180)
        );
        pickerLp.topMargin = dp(8);
        langPickerList = new LinearLayout(this);
        langPickerList.setOrientation(LinearLayout.VERTICAL);
        langPickerScroll.addView(langPickerList);
        body.addView(langPickerScroll, pickerLp);

        // Input box
        inputEdit = new EditText(this);
        inputEdit.setHint(isMy ? "ဘာသာပြန်လိုသော စာသားရိုက်ထည့်ပါ..." : "Enter or paste text to translate...");
        inputEdit.setHintTextColor(colorMuted);
        inputEdit.setTextColor(colorText);
        inputEdit.setTextSize(TypedValue.COMPLEX_UNIT_SP, 14);
        inputEdit.setGravity(Gravity.TOP | Gravity.START);
        inputEdit.setMinLines(3);
        inputEdit.setMaxLines(5);
        inputEdit.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_FLAG_MULTI_LINE | InputType.TYPE_TEXT_FLAG_CAP_SENTENCES);
        inputEdit.setBackground(makeCardBg(colorCard, colorBorder, 12));
        inputEdit.setPadding(dp(12), dp(10), dp(12), dp(10));
        inputEdit.setOnClickListener(v -> {
            inputEdit.requestFocus();
            InputMethodManager imm = (InputMethodManager) getSystemService(INPUT_METHOD_SERVICE);
            if (imm != null) imm.showSoftInput(inputEdit, InputMethodManager.SHOW_IMPLICIT);
        });
        LinearLayout.LayoutParams inputLp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        inputLp.topMargin = dp(10);
        body.addView(inputEdit, inputLp);

        // Action row: Paste | Clear | Translate
        LinearLayout actionRow = new LinearLayout(this);
        actionRow.setOrientation(LinearLayout.HORIZONTAL);
        actionRow.setGravity(Gravity.CENTER_VERTICAL);
        LinearLayout.LayoutParams actionRowLp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        actionRowLp.topMargin = dp(10);

        Button pasteBtn = new Button(this);
        pasteBtn.setText(isMy ? "ကူးထည့်" : "Paste");
        pasteBtn.setTextColor(colorText);
        pasteBtn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12);
        pasteBtn.setTypeface(Typeface.DEFAULT_BOLD);
        pasteBtn.setAllCaps(false);
        pasteBtn.setBackground(makeCardBg(colorCard, colorBorder, 10));
        pasteBtn.setOnClickListener(v -> {
            ClipboardManager cm = (ClipboardManager) getSystemService(CLIPBOARD_SERVICE);
            if (cm != null && cm.hasPrimaryClip()) {
                ClipData clip = cm.getPrimaryClip();
                if (clip != null && clip.getItemCount() > 0) {
                    CharSequence cs = clip.getItemAt(0).coerceToText(this);
                    if (cs != null && cs.length() > 0) {
                        String existing = inputEdit.getText().toString();
                        inputEdit.setText(existing.isEmpty() ? cs.toString() : existing + "\\n" + cs.toString());
                        inputEdit.setSelection(inputEdit.getText().length());
                        if (statusText != null) statusText.setVisibility(View.GONE);
                        return;
                    }
                }
            }
            if (statusText != null) {
                statusText.setText(isMy ? "Clipboard ထဲတွင် စာသား မရှိသေးပါ။" : "Clipboard is empty.");
                statusText.setVisibility(View.VISIBLE);
            }
        });

        Button clearBtn = new Button(this);
        clearBtn.setText(isMy ? "ရှင်း" : "Clear");
        clearBtn.setTextColor(colorMuted);
        clearBtn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12);
        clearBtn.setTypeface(Typeface.DEFAULT_BOLD);
        clearBtn.setAllCaps(false);
        clearBtn.setBackground(makeCardBg(colorCard, colorBorder, 10));
        clearBtn.setOnClickListener(v -> {
            inputEdit.setText("");
            outputText.setText("");
            outputText.setVisibility(View.GONE);
            copyBtn.setVisibility(View.GONE);
            statusText.setVisibility(View.GONE);
        });

        translateBtn = new Button(this);
        translateBtn.setText(isMy ? "ဘာသာပြန်မည်" : "Translate");
        translateBtn.setTextColor(colorAccentText);
        translateBtn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 13);
        translateBtn.setTypeface(Typeface.DEFAULT_BOLD);
        translateBtn.setAllCaps(false);
        translateBtn.setBackground(makeCardBg(colorAccent, colorAccent, 10));
        translateBtn.setOnClickListener(v -> runNativeTranslation(isMy));

        LinearLayout.LayoutParams smallBtnLp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, dp(42));
        smallBtnLp.rightMargin = dp(6);
        actionRow.addView(pasteBtn, smallBtnLp);
        actionRow.addView(clearBtn, smallBtnLp);
        actionRow.addView(translateBtn, new LinearLayout.LayoutParams(0, dp(42), 1f));
        body.addView(actionRow, actionRowLp);

        // Status / error notice
        statusText = new TextView(this);
        statusText.setTextColor(0xFFFBBF24);
        statusText.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12);
        statusText.setPadding(dp(4), dp(8), dp(4), 0);
        statusText.setVisibility(View.GONE);
        body.addView(statusText);

        // Scrollable Result Output
        ScrollView resultScroll = new ScrollView(this);
        LinearLayout.LayoutParams scrollLp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        scrollLp.topMargin = dp(10);

        outputText = new TextView(this);
        outputText.setTextColor(colorText);
        outputText.setTextSize(TypedValue.COMPLEX_UNIT_SP, 14);
        outputText.setTextIsSelectable(true);
        outputText.setBackground(makeCardBg(colorCard, colorBorder, 12));
        outputText.setPadding(dp(12), dp(10), dp(12), dp(10));
        outputText.setVisibility(View.GONE);
        resultScroll.addView(outputText);
        body.addView(resultScroll, scrollLp);

        copyBtn = new Button(this);
        copyBtn.setText(isMy ? "ဘာသာပြန်စာ ကူးယူမည်" : "Copy Translation");
        copyBtn.setTextColor(colorText);
        copyBtn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12);
        copyBtn.setTypeface(Typeface.DEFAULT_BOLD);
        copyBtn.setAllCaps(false);
        copyBtn.setBackground(makeCardBg(colorCard, colorBorder, 10));
        copyBtn.setVisibility(View.GONE);
        LinearLayout.LayoutParams copyLp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(40));
        copyLp.topMargin = dp(8);
        copyBtn.setOnClickListener(v -> {
            String out = outputText.getText().toString();
            if (!out.isEmpty()) {
                ClipboardManager cm = (ClipboardManager) getSystemService(CLIPBOARD_SERVICE);
                if (cm != null) {
                    cm.setPrimaryClip(ClipData.newPlainText("ME Translator", out));
                    copyBtn.setText(isMy ? "ကူးယူပြီး!" : "Copied!");
                    mainHandler.postDelayed(() -> {
                        if (copyBtn != null) copyBtn.setText(isMy ? "ဘာသာပြန်စာ ကူးယူမည်" : "Copy Translation");
                    }, 1600);
                }
            }
        });
        body.addView(copyBtn, copyLp);

        root.addView(body);

        panelParams = new WindowManager.LayoutParams(
            panelWidth,
            WindowManager.LayoutParams.WRAP_CONTENT,
            getOverlayWindowType(),
            WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL | WindowManager.LayoutParams.FLAG_WATCH_OUTSIDE_TOUCH,
            PixelFormat.TRANSLUCENT
        );
        panelParams.gravity = Gravity.TOP | Gravity.CENTER_HORIZONTAL;
        panelParams.y = dp(48);
        panelParams.softInputMode = WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE;

        root.setOnTouchListener((v, event) -> {
            if (event.getAction() == MotionEvent.ACTION_OUTSIDE) {
                hideKeyboard();
            }
            return false;
        });

        panelView = root;
        windowManager.addView(panelView, panelParams);
    }

    private void hideKeyboard() {
        if (inputEdit == null) return;
        try {
            inputEdit.clearFocus();
            InputMethodManager imm = (InputMethodManager) getSystemService(INPUT_METHOD_SERVICE);
            if (imm != null) {
                imm.hideSoftInputFromWindow(inputEdit.getWindowToken(), 0);
            }
        } catch (Exception ignored) {}
    }

    private void runNativeTranslation(final boolean isMy) {
        if (isTranslating || inputEdit == null) return;
        final String textToTranslate = inputEdit.getText().toString().trim();
        if (textToTranslate.isEmpty()) return;

        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        final String provider = prefs.getString("aiProvider", "gemini");
        final String geminiModel = prefs.getString("geminiModel", "gemini-3.1-flash-lite");
        final String groqModel = prefs.getString("groqModel", "openai/gpt-oss-120b");
        final String geminiKey = prefs.getString("geminiApiKey", "").trim();
        final String groqKey = prefs.getString("groqApiKey", "").trim();
        final String srcLang = selectedSourceLang;
        final String tgtLang = selectedTargetLang;
        final String activeKey = "groq".equalsIgnoreCase(provider) ? groqKey : geminiKey;

        if (activeKey.isEmpty()) {
            statusText.setText(isMy
                ? "Settings > API ထဲတွင် API Key အရင်ထည့်သွင်းပေးပါ (□ ခလုတ်နှိပ်၍ အက်ပ်ဖွင့်နိုင်သည်)။"
                : "Please add your Gemini or Groq API Key in ME Translator Settings > API first.");
            statusText.setVisibility(View.VISIBLE);
            return;
        }

        isTranslating = true;
        statusText.setVisibility(View.GONE);
        translateBtn.setEnabled(false);
        translateBtn.setText(isMy ? "ဘာသာပြန်နေသည်..." : "Translating...");

        networkExecutor.execute(() -> {
            String result = null;
            String error = null;
            HttpURLConnection conn = null;
            try {
                boolean isAuto = "Auto".equalsIgnoreCase(srcLang);
                String myanmarRule = "Myanmar".equalsIgnoreCase(tgtLang)
                    ? " Ensure the Myanmar translation uses standard, polite, natural modern Burmese writing."
                    : "";
                String systemPrompt = isAuto
                    ? "You are a master professional translator. Automatically detect the source language of the user's text and translate it accurately and naturally into " + tgtLang + "." + myanmarRule + " Output ONLY the translated text, with no introductory remarks, quotes, or explanations."
                    : "You are a master professional translator specializing in " + srcLang + " and " + tgtLang + ". Translate accurately, naturally, and culturally appropriately from " + srcLang + " into " + tgtLang + "." + myanmarRule + " Output ONLY the translated text, with no introductory remarks, quotes, or explanations.";
                String userPrompt = isAuto
                    ? "Detect the source language and translate the following text into " + tgtLang + ". Only provide the translation:\\n\\n" + textToTranslate
                    : "Translate the following text from " + srcLang + " to " + tgtLang + ". Only provide the translation:\\n\\n" + textToTranslate;

                if ("groq".equalsIgnoreCase(provider)) {
                    URL url = new URL("https://api.groq.com/openai/v1/chat/completions");
                    conn = (HttpURLConnection) url.openConnection();
                    conn.setRequestMethod("POST");
                    conn.setConnectTimeout(20000);
                    conn.setReadTimeout(45000);
                    conn.setDoOutput(true);
                    conn.setRequestProperty("Authorization", "Bearer " + activeKey);
                    conn.setRequestProperty("Content-Type", "application/json");

                    JSONObject payload = new JSONObject();
                    payload.put("model", groqModel.isEmpty() ? "openai/gpt-oss-120b" : groqModel);
                    payload.put("temperature", 0.2);
                    JSONArray messages = new JSONArray();
                    messages.put(new JSONObject().put("role", "system").put("content", systemPrompt));
                    messages.put(new JSONObject().put("role", "user").put("content", userPrompt));
                    payload.put("messages", messages);

                    try (OutputStream os = conn.getOutputStream()) {
                        os.write(payload.toString().getBytes(StandardCharsets.UTF_8));
                    }

                    int code = conn.getResponseCode();
                    String bodyStr = readStream(code >= 200 && code < 300 ? conn.getInputStream() : conn.getErrorStream());
                    JSONObject respJson = new JSONObject(bodyStr.isEmpty() ? "{}" : bodyStr);
                    if (code < 200 || code >= 300) {
                        JSONObject errObj = respJson.optJSONObject("error");
                        error = errObj != null ? errObj.optString("message", "Groq error (" + code + ")") : ("Groq error (" + code + ")");
                    } else {
                        JSONArray choices = respJson.optJSONArray("choices");
                        if (choices != null && choices.length() > 0) {
                            JSONObject msg = choices.getJSONObject(0).optJSONObject("message");
                            result = msg != null ? msg.optString("content", "").trim() : "";
                        }
                    }
                } else {
                    String modelName = geminiModel.isEmpty() ? "gemini-3.1-flash-lite" : geminiModel;
                    String endpoint = "https://generativelanguage.googleapis.com/v1beta/models/"
                        + URLEncoder.encode(modelName, "UTF-8")
                        + ":generateContent?key="
                        + URLEncoder.encode(activeKey, "UTF-8");
                    URL url = new URL(endpoint);
                    conn = (HttpURLConnection) url.openConnection();
                    conn.setRequestMethod("POST");
                    conn.setConnectTimeout(20000);
                    conn.setReadTimeout(45000);
                    conn.setDoOutput(true);
                    conn.setRequestProperty("Content-Type", "application/json");

                    JSONObject payload = new JSONObject();
                    payload.put("systemInstruction", new JSONObject().put("parts", new JSONArray().put(new JSONObject().put("text", systemPrompt))));
                    payload.put("contents", new JSONArray().put(
                        new JSONObject().put("role", "user").put("parts", new JSONArray().put(new JSONObject().put("text", userPrompt)))
                    ));

                    try (OutputStream os = conn.getOutputStream()) {
                        os.write(payload.toString().getBytes(StandardCharsets.UTF_8));
                    }

                    int code = conn.getResponseCode();
                    String bodyStr = readStream(code >= 200 && code < 300 ? conn.getInputStream() : conn.getErrorStream());
                    JSONObject respJson = new JSONObject(bodyStr.isEmpty() ? "{}" : bodyStr);
                    if (code < 200 || code >= 300) {
                        JSONObject errObj = respJson.optJSONObject("error");
                        error = errObj != null ? errObj.optString("message", "Gemini error (" + code + ")") : ("Gemini error (" + code + ")");
                    } else {
                        JSONArray candidates = respJson.optJSONArray("candidates");
                        if (candidates != null && candidates.length() > 0) {
                            JSONObject content = candidates.getJSONObject(0).optJSONObject("content");
                            JSONArray parts = content != null ? content.optJSONArray("parts") : null;
                            if (parts != null) {
                                StringBuilder sb = new StringBuilder();
                                for (int i = 0; i < parts.length(); i++) {
                                    sb.append(parts.getJSONObject(i).optString("text", ""));
                                }
                                result = sb.toString().trim();
                            }
                        }
                    }
                }
            } catch (Exception e) {
                error = e.getMessage() != null ? e.getMessage() : "Network error";
            } finally {
                if (conn != null) conn.disconnect();
            }

            final String finalResult = result;
            final String finalError = error;
            mainHandler.post(() -> {
                isTranslating = false;
                if (translateBtn != null) {
                    translateBtn.setEnabled(true);
                    translateBtn.setText(isMy ? "ဘာသာပြန်မည်" : "Translate");
                }
                if (finalError != null && !finalError.isEmpty()) {
                    if (statusText != null) {
                        statusText.setText(finalError);
                        statusText.setVisibility(View.VISIBLE);
                    }
                } else if (finalResult != null && !finalResult.isEmpty()) {
                    if (outputText != null) {
                        outputText.setText(finalResult);
                        outputText.setVisibility(View.VISIBLE);
                    }
                    if (copyBtn != null) {
                        copyBtn.setVisibility(View.VISIBLE);
                    }
                }
            });
        });
    }

    private String readStream(InputStream is) {
        if (is == null) return "";
        try (BufferedReader br = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8))) {
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = br.readLine()) != null) {
                sb.append(line);
            }
            return sb.toString();
        } catch (Exception e) {
            return "";
        }
    }
}
`;

fs.writeFileSync(path.join(javaPkgDir, 'FloatingOverlayService.java'), floatingOverlayJava, 'utf8');

const pluginJava = `package com.metranslator.app;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.os.SystemClock;
import android.provider.Settings;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(
    name = "AppInstaller",
    permissions = {
        @Permission(strings = { Manifest.permission.RECORD_AUDIO }, alias = "microphone")
    }
)
public class AppInstallerPlugin extends Plugin {
    private static final ExecutorService DOWNLOAD_EXECUTOR = Executors.newSingleThreadExecutor();

    private String mapPermissionState(PermissionState state) {
        if (state == PermissionState.GRANTED) {
            return "granted";
        }
        if (state == PermissionState.DENIED) {
            return "denied";
        }
        return "prompt";
    }

    @PluginMethod
    public void hasAudioPermission(PluginCall call) {
        JSObject result = new JSObject();
        result.put("state", mapPermissionState(getPermissionState("microphone")));
        call.resolve(result);
    }

    @PluginMethod
    public void requestAudioPermission(PluginCall call) {
        if (getPermissionState("microphone") == PermissionState.GRANTED) {
            JSObject result = new JSObject();
            result.put("state", "granted");
            call.resolve(result);
            return;
        }
        requestPermissionForAlias("microphone", call, "audioPermissionCallback");
    }

    @PermissionCallback
    private void audioPermissionCallback(PluginCall call) {
        JSObject result = new JSObject();
        result.put("state", mapPermissionState(getPermissionState("microphone")));
        call.resolve(result);
    }

    @PluginMethod
    public void openAppSettings(PluginCall call) {
        FloatingOverlayService.suppressNextBackgroundOnce();
        Intent intent = new Intent(
            Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
            Uri.parse("package:" + getContext().getPackageName())
        );
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        call.resolve();
    }

    @PluginMethod
    public void canDrawOverlays(PluginCall call) {
        JSObject result = new JSObject();
        result.put("granted", FloatingOverlayService.canDrawOverlays(getContext()));
        call.resolve(result);
    }

    @PluginMethod
    public void openOverlayPermissionSettings(PluginCall call) {
        FloatingOverlayService.suppressNextBackgroundOnce();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Intent intent = new Intent(
                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:" + getContext().getPackageName())
            );
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
        }
        call.resolve();
    }

    @PluginMethod
    public void syncFloatingConfig(PluginCall call) {
        SharedPreferences prefs = getContext().getSharedPreferences(FloatingOverlayService.PREFS_NAME, Context.MODE_PRIVATE);
        SharedPreferences.Editor editor = prefs.edit();
        editor.putString("aiProvider", call.getString("aiProvider", "gemini"));
        editor.putString("geminiModel", call.getString("geminiModel", "gemini-3.1-flash-lite"));
        editor.putString("groqModel", call.getString("groqModel", "openai/gpt-oss-120b"));
        editor.putString("geminiApiKey", call.getString("geminiApiKey", ""));
        editor.putString("groqApiKey", call.getString("groqApiKey", ""));
        editor.putString("sourceLang", call.getString("sourceLang", "Myanmar"));
        editor.putString("targetLang", call.getString("targetLang", "English"));
        editor.putString("appLang", call.getString("appLang", "en"));
        editor.putBoolean("autoFloatOnLeave", Boolean.TRUE.equals(call.getBoolean("autoFloatOnLeave", true)));
        editor.putString("themeBg", call.getString("themeBg", "#1f2124"));
        editor.putString("themeCardBg", call.getString("themeCardBg", "#2b2e33"));
        editor.putString("themeText", call.getString("themeText", "#ffffff"));
        editor.putString("themeMuted", call.getString("themeMuted", "#a1a1aa"));
        editor.putString("themeAccent", call.getString("themeAccent", "#10b981"));
        editor.putString("themeAccentText", call.getString("themeAccentText", "#ffffff"));
        editor.putString("themeBorder", call.getString("themeBorder", "#33ffffff"));
        editor.apply();

        if (FloatingOverlayService.isServiceRunning) {
            Intent refreshIntent = new Intent(getContext(), FloatingOverlayService.class);
            refreshIntent.setAction(FloatingOverlayService.ACTION_REFRESH_THEME);
            FloatingOverlayService.startCompat(getContext(), refreshIntent);
        }
        call.resolve();
    }

    @PluginMethod
    public void startFloatingOverlay(PluginCall call) {
        JSObject result = new JSObject();
        if (!FloatingOverlayService.canDrawOverlays(getContext())) {
            result.put("status", "permission_needed");
            call.resolve(result);
            return;
        }
        boolean expanded = Boolean.TRUE.equals(call.getBoolean("expanded", false));
        Intent intent = new Intent(getContext(), FloatingOverlayService.class);
        intent.setAction(expanded ? FloatingOverlayService.ACTION_START_PANEL : FloatingOverlayService.ACTION_START_BUBBLE);
        FloatingOverlayService.startCompat(getContext(), intent);
        result.put("status", "started");
        call.resolve(result);
    }

    @PluginMethod
    public void stopFloatingOverlay(PluginCall call) {
        Intent intent = new Intent(getContext(), FloatingOverlayService.class);
        intent.setAction(FloatingOverlayService.ACTION_STOP);
        getContext().startService(intent);
        call.resolve();
    }

    @PluginMethod
    public void getFloatingOverlayState(PluginCall call) {
        SharedPreferences prefs = getContext().getSharedPreferences(FloatingOverlayService.PREFS_NAME, Context.MODE_PRIVATE);
        JSObject result = new JSObject();
        result.put("running", FloatingOverlayService.isServiceRunning);
        result.put("granted", FloatingOverlayService.canDrawOverlays(getContext()));
        result.put("autoFloatOnLeave", prefs.getBoolean("autoFloatOnLeave", true));
        call.resolve(result);
    }

    private boolean hasInstallPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            return getContext().getPackageManager().canRequestPackageInstalls();
        }
        return true;
    }

    private boolean isAllowedUrl(String urlStr) {
        try {
            URL parsed = new URL(urlStr);
            if (!"https".equalsIgnoreCase(parsed.getProtocol())) {
                return false;
            }
            String host = parsed.getHost().toLowerCase();
            return host.equals("github.com")
                || host.endsWith(".github.com")
                || host.equals("objects.githubusercontent.com")
                || host.equals("release-assets.githubusercontent.com")
                || host.endsWith(".githubusercontent.com");
        } catch (Exception e) {
            return false;
        }
    }

    private void launchApkInstaller(File apkFile) {
        FloatingOverlayService.suppressNextBackgroundOnce();
        Context context = getContext();
        Uri contentUri = FileProvider.getUriForFile(
            context,
            context.getPackageName() + ".fileprovider",
            apkFile
        );
        Intent intent = new Intent(Intent.ACTION_VIEW);
        intent.setDataAndType(contentUri, "application/vnd.android.package-archive");
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_GRANT_READ_URI_PERMISSION);
        intent.putExtra(Intent.EXTRA_NOT_UNKNOWN_SOURCE, true);
        context.startActivity(intent);
    }

    @PluginMethod
    public void canRequestPackageInstalls(PluginCall call) {
        JSObject result = new JSObject();
        result.put("granted", hasInstallPermission());
        call.resolve(result);
    }

    @PluginMethod
    public void openInstallPermissionSettings(PluginCall call) {
        FloatingOverlayService.suppressNextBackgroundOnce();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Intent intent = new Intent(
                Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                Uri.parse("package:" + getContext().getPackageName())
            );
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
        }
        call.resolve();
    }

    @PluginMethod
    public void installApkFile(PluginCall call) {
        String filePath = call.getString("path");
        if (filePath == null || filePath.trim().isEmpty()) {
            call.reject("Missing APK file path");
            return;
        }

        File apkFile = new File(filePath);
        if (!apkFile.exists()) {
            call.reject("Downloaded APK file not found");
            return;
        }

        JSObject result = new JSObject();
        if (!hasInstallPermission()) {
            result.put("status", "permission_needed");
            call.resolve(result);
            return;
        }

        try {
            launchApkInstaller(apkFile);
            result.put("status", "installing");
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Failed to open Android installer: " + e.getMessage());
        }
    }

    @PluginMethod
    public void downloadAndInstallApk(PluginCall call) {
        String downloadUrl = call.getString("url");
        String rawFilename = call.getString("filename", "ME-Translator-update.apk");

        if (downloadUrl == null || !isAllowedUrl(downloadUrl)) {
            call.reject("Invalid APK download URL");
            return;
        }

        String safeName = rawFilename.replaceAll("[^a-zA-Z0-9._-]", "_");
        if (!safeName.toLowerCase().endsWith(".apk")) {
            safeName = safeName + ".apk";
        }
        final String finalName = safeName;

        DOWNLOAD_EXECUTOR.execute(() -> {
            HttpURLConnection conn = null;
            try {
                String currentUrl = downloadUrl;
                int redirects = 0;
                while (redirects < 6) {
                    URL url = new URL(currentUrl);
                    conn = (HttpURLConnection) url.openConnection();
                    conn.setInstanceFollowRedirects(false);
                    conn.setConnectTimeout(20000);
                    conn.setReadTimeout(60000);
                    conn.setRequestProperty("User-Agent", "ME-Translator-Android-Updater");
                    conn.connect();

                    int code = conn.getResponseCode();
                    if (code >= 300 && code < 400) {
                        String location = conn.getHeaderField("Location");
                        conn.disconnect();
                        if (location == null) {
                            throw new SecurityException("Empty redirect destination");
                        }
                        String resolvedLocation = new URL(url, location).toString();
                        if (!isAllowedUrl(resolvedLocation)) {
                            throw new SecurityException("Blocked redirect destination");
                        }
                        currentUrl = resolvedLocation;
                        redirects++;
                        continue;
                    }
                    break;
                }

                int finalCode = conn != null ? conn.getResponseCode() : -1;
                if (finalCode < 200 || finalCode >= 300) {
                    call.reject("Download failed with HTTP " + finalCode);
                    return;
                }

                long totalBytes = conn.getContentLengthLong();
                File updatesDir = new File(getContext().getCacheDir(), "updates");
                if (!updatesDir.exists()) {
                    updatesDir.mkdirs();
                }

                // Clean older cached APKs before saving new one
                File[] oldFiles = updatesDir.listFiles();
                if (oldFiles != null) {
                    for (File oldFile : oldFiles) {
                        oldFile.delete();
                    }
                }

                File tempFile = new File(updatesDir, finalName + ".tmp");
                File targetFile = new File(updatesDir, finalName);

                try (InputStream in = new BufferedInputStream(conn.getInputStream());
                     FileOutputStream out = new FileOutputStream(tempFile)) {
                    byte[] buffer = new byte[16384];
                    long loaded = 0;
                    long lastEmit = 0;
                    int read;
                    while ((read = in.read(buffer)) != -1) {
                        out.write(buffer, 0, read);
                        loaded += read;
                        long now = SystemClock.uptimeMillis();
                        if (now - lastEmit >= 120) {
                            lastEmit = now;
                            JSObject progressObj = new JSObject();
                            progressObj.put("loaded", loaded);
                            progressObj.put("total", Math.max(totalBytes, 0));
                            int pct = totalBytes > 0 ? (int) Math.min(99, (loaded * 100L) / totalBytes) : 0;
                            progressObj.put("percent", pct);
                            notifyListeners("downloadProgress", progressObj);
                        }
                    }
                    out.flush();
                }

                if (targetFile.exists()) {
                    targetFile.delete();
                }
                if (!tempFile.renameTo(targetFile)) {
                    throw new IllegalStateException("Could not finalize downloaded APK file");
                }

                JSObject finalProgress = new JSObject();
                finalProgress.put("loaded", targetFile.length());
                finalProgress.put("total", targetFile.length());
                finalProgress.put("percent", 100);
                notifyListeners("downloadProgress", finalProgress);

                JSObject result = new JSObject();
                result.put("path", targetFile.getAbsolutePath());

                if (!hasInstallPermission()) {
                    result.put("status", "permission_needed");
                    call.resolve(result);
                    return;
                }

                launchApkInstaller(targetFile);
                result.put("status", "installing");
                call.resolve(result);
            } catch (Exception e) {
                call.reject(e.getMessage() != null ? e.getMessage() : "Download failed");
            } finally {
                if (conn != null) {
                    conn.disconnect();
                }
            }
        });
    }
}
`;

fs.writeFileSync(path.join(javaPkgDir, 'AppInstallerPlugin.java'), pluginJava, 'utf8');

// 5. Register AppInstallerPlugin & lifecycle hooks in MainActivity.java
const mainActivityPath = path.join(javaPkgDir, 'MainActivity.java');
const mainActivityJava = `package com.metranslator.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AppInstallerPlugin.class);
        super.onCreate(savedInstanceState);
    }

    @Override
    public void onStop() {
        super.onStop();
        if (!isChangingConfigurations()) {
            FloatingOverlayService.handleAppBackgrounded(this);
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        FloatingOverlayService.handleAppForegrounded(this);
    }
}
`;
fs.writeFileSync(mainActivityPath, mainActivityJava, 'utf8');

// 6. Copy app icons across mipmap densities
const mipmaps192 = ['mipmap-mdpi', 'mipmap-hdpi', 'mipmap-xhdpi'];
const mipmaps512 = ['mipmap-xxhdpi', 'mipmap-xxxhdpi'];

for (const folder of mipmaps192) {
  const dest = path.join(androidDir, 'app', 'src', 'main', 'res', folder);
  fs.mkdirSync(dest, { recursive: true });
  fs.copyFileSync(path.join(rootDir, 'public', 'pwa-192x192.png'), path.join(dest, 'ic_launcher.png'));
  fs.copyFileSync(path.join(rootDir, 'public', 'pwa-192x192.png'), path.join(dest, 'ic_launcher_round.png'));
  fs.copyFileSync(path.join(rootDir, 'public', 'pwa-maskable-512x512.png'), path.join(dest, 'ic_launcher_foreground.png'));
}

for (const folder of mipmaps512) {
  const dest = path.join(androidDir, 'app', 'src', 'main', 'res', folder);
  fs.mkdirSync(dest, { recursive: true });
  fs.copyFileSync(path.join(rootDir, 'public', 'pwa-512x512.png'), path.join(dest, 'ic_launcher.png'));
  fs.copyFileSync(path.join(rootDir, 'public', 'pwa-512x512.png'), path.join(dest, 'ic_launcher_round.png'));
  fs.copyFileSync(path.join(rootDir, 'public', 'pwa-maskable-512x512.png'), path.join(dest, 'ic_launcher_foreground.png'));
}

console.log(`Configured Android native project (v${versionName}, code ${versionCode}) with AppInstallerPlugin & FloatingOverlayService.`);
