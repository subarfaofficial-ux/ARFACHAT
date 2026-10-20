#!/usr/bin/env python3
"""
ArfaChat Android APK Generator
Compiles and packages ArfaChat into a standalone Android APK (.apk) file.
Embeds the web app into an Android WebView wrapper with WebRTC camera/microphone permissions.
"""

import os
import sys
import shutil
import subprocess
import glob
from pathlib import Path

PROJECT_ROOT = Path("/app/applet").resolve()
ANDROID_JAR = "/usr/lib/android-sdk/platforms/android-23/android.jar"
BUILD_DIR = PROJECT_ROOT / "build-apk-tmp"
PACKAGE_NAME = "com.arfachat.subarfa"
APP_NAME = "ArfaChat"
VERSION_NAME = "1.0.0"
VERSION_CODE = "1001"

def run(cmd, cwd=PROJECT_ROOT):
    print(f"[RUN] {cmd}")
    res = subprocess.run(cmd, shell=True, cwd=cwd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if res.returncode != 0:
        print(f"[ERROR] stdout: {res.stdout}")
        print(f"[ERROR] stderr: {res.stderr}")
        raise RuntimeError(f"Command failed with code {res.returncode}: {cmd}")
    return res.stdout

def main():
    print("=== Step 1: Building Web Application Assets ===")
    run("npm run build", cwd=PROJECT_ROOT)

    dist_dir = PROJECT_ROOT / "dist"
    if not dist_dir.exists():
        raise FileNotFoundError(f"Dist directory {dist_dir} was not created!")

    print(f"Web assets built successfully in {dist_dir}")

    # Prepare temp build directory
    if BUILD_DIR.exists():
        shutil.rmtree(BUILD_DIR)
    BUILD_DIR.mkdir(parents=True, exist_ok=True)

    src_java_dir = BUILD_DIR / "src" / "com" / "arfachat" / "subarfa"
    src_java_dir.mkdir(parents=True, exist_ok=True)
    res_dir = BUILD_DIR / "res"
    values_dir = res_dir / "values"
    values_dir.mkdir(parents=True, exist_ok=True)
    mipmap_dir = res_dir / "mipmap-hdpi"
    mipmap_dir.mkdir(parents=True, exist_ok=True)
    assets_dir = BUILD_DIR / "assets"
    assets_www = assets_dir / "www"
    assets_www.mkdir(parents=True, exist_ok=True)

    print("=== Step 2: Generating AndroidManifest.xml ===")
    manifest_content = f"""<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="{PACKAGE_NAME}"
    android:versionCode="{VERSION_CODE}"
    android:versionName="{VERSION_NAME}">

    <uses-sdk android:minSdkVersion="24" android:targetSdkVersion="35" />

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
    <uses-permission android:name="android.permission.VIBRATE" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />

    <uses-feature android:name="android.hardware.camera" android:required="false" />
    <uses-feature android:name="android.hardware.camera.autofocus" android:required="false" />
    <uses-feature android:name="android.hardware.microphone" android:required="false" />

    <application
        android:label="{APP_NAME}"
        android:icon="@mipmap/ic_launcher"
        android:theme="@android:style/Theme.NoTitleBar.Fullscreen"
        android:hardwareAccelerated="true"
        android:usesCleartextTraffic="true">
        <activity
            android:name="{PACKAGE_NAME}.MainActivity"
            android:exported="true"
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|uiMode"
            android:screenOrientation="portrait">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
"""
    (BUILD_DIR / "AndroidManifest.xml").write_text(manifest_content)

    print("=== Step 3: Generating Android Resources & Launcher Icons ===")
    strings_content = f"""<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">{APP_NAME}</string>
</resources>
"""
    (values_dir / "strings.xml").write_text(strings_content)

    avatar_path = PROJECT_ROOT / "src/assets/images/avatar_female_sarah_1792395181383.jpg"
    for density, size in [("mdpi", 48), ("hdpi", 72), ("xhdpi", 96), ("xxhdpi", 144)]:
        d_dir = res_dir / f"mipmap-{density}"
        d_dir.mkdir(parents=True, exist_ok=True)
        out_png = d_dir / "ic_launcher.png"
        if avatar_path.exists():
            run(f"convert {avatar_path} -resize {size}x{size} {out_png}")
        else:
            run(f"convert -size {size}x{size} xc:#2563EB {out_png}")

    print("=== Step 4: Generating MainActivity.java ===")
    # Android MainActivity with WebView and WebChromeClient supporting WebRTC camera/microphone prompts
    main_activity_content = f"""package {PACKAGE_NAME};

import android.app.Activity;
import android.os.Bundle;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.PermissionRequest;
import android.view.Window;
import android.view.WindowManager;

public class MainActivity extends Activity {{
    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {{
        super.onCreate(savedInstanceState);
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_FULLSCREEN,
            WindowManager.LayoutParams.FLAG_FULLSCREEN
        );

        webView = new WebView(this);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setMediaPlaybackRequiresUserGesture(false);

        webView.setWebViewClient(new WebViewClient() {{
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {{
                view.loadUrl(url);
                return true;
            }}
        }});

        webView.setWebChromeClient(new WebChromeClient() {{
            @Override
            public void onPermissionRequest(final PermissionRequest request) {{
                // Auto grant Camera and Microphone for WebRTC calls inside ArfaChat
                runOnUiThread(new Runnable() {{
                    @Override
                    public void run() {{
                        request.grant(request.getResources());
                    }}
                }});
            }}
        }});

        // Load ArfaChat Web Interface
        webView.loadUrl("file:///android_asset/www/index.html");
    }}

    @Override
    public void onBackPressed() {{
        if (webView != null && webView.canGoBack()) {{
            webView.goBack();
        }} else {{
            super.onBackPressed();
        }}
    }}
}}
"""
    (src_java_dir / "MainActivity.java").write_text(main_activity_content)

    print("=== Step 5: Copying Web Assets into APK Assets ===")
    for item in dist_dir.iterdir():
        if item.is_dir():
            shutil.copytree(item, assets_www / item.name)
        else:
            shutil.copy(item, assets_www / item.name)

    print("=== Step 6: Compiling Resources with aapt ===")
    gen_dir = BUILD_DIR / "gen"
    gen_dir.mkdir(parents=True, exist_ok=True)
    obj_dir = BUILD_DIR / "obj"
    obj_dir.mkdir(parents=True, exist_ok=True)

    # aapt package to generate R.java
    run(f"aapt package -m -J {gen_dir} -M {BUILD_DIR}/AndroidManifest.xml -S {res_dir} -I {ANDROID_JAR}")

    print("=== Step 7: Compiling Java Sources with javac ===")
    java_files = list(src_java_dir.glob("*.java")) + list(gen_dir.rglob("*.java"))
    java_files_str = " ".join(f'"{str(f)}"' for f in java_files)
    run(f"javac -source 1.8 -target 1.8 -cp {ANDROID_JAR} -d {obj_dir} {java_files_str}")

    print("=== Step 8: Generating classes.dex with dalvik-exchange ===")
    dex_file = BUILD_DIR / "classes.dex"
    run(f"/usr/bin/dalvik-exchange --dex --output={dex_file} {obj_dir}")

    print("=== Step 9: Creating Base APK Package with aapt ===")
    unsigned_apk = BUILD_DIR / "app-unsigned.apk"
    run(f"aapt package -f -M {BUILD_DIR}/AndroidManifest.xml -S {res_dir} -A {assets_dir} -I {ANDROID_JAR} -F {unsigned_apk}")

    print("=== Step 10: Adding classes.dex into APK ===")
    run(f"aapt add {unsigned_apk} classes.dex", cwd=BUILD_DIR)

    print("=== Step 11: Generating Release Keystore and Signing APK ===")
    keystore_path = BUILD_DIR / "release.keystore"
    keystore_pass = "arfachat123"
    alias = "arfachat"

    run(f'keytool -genkeypair -v -keystore {keystore_path} -alias {alias} -keyalg RSA -keysize 2048 -validity 10000 -storepass {keystore_pass} -keypass {keystore_pass} -dname "CN=Subarfa, OU=Engineering, O=ArfaChat, L=Jakarta, ST=DKI, C=ID"')

    signed_apk = BUILD_DIR / "app-signed.apk"
    shutil.copy(unsigned_apk, signed_apk)
    run(f"jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 -keystore {keystore_path} -storepass {keystore_pass} {signed_apk} {alias}")

    print("=== Step 12: Aligning APK with zipalign ===")
    aligned_apk = BUILD_DIR / "arfachat-v1.0.apk"
    run(f"zipalign -v -p 4 {signed_apk} {aligned_apk}")

    print("=== Step 13: Publishing APK Directly to Project Files ===")
    # 1. public/ folder for direct browser download and Vite dev server serving
    public_dir = PROJECT_ROOT / "public"
    public_dir.mkdir(parents=True, exist_ok=True)
    public_downloads = public_dir / "downloads"
    public_downloads.mkdir(parents=True, exist_ok=True)

    dest_public_apk = public_dir / "arfachat.apk"
    dest_public_named_apk = public_downloads / "arfachat-v1.0.apk"
    dest_root_apk = PROJECT_ROOT / "arfachat.apk"
    dest_dist_apk = dist_dir / "arfachat.apk"

    shutil.copy(aligned_apk, dest_public_apk)
    shutil.copy(aligned_apk, dest_public_named_apk)
    shutil.copy(aligned_apk, dest_root_apk)
    shutil.copy(aligned_apk, dest_dist_apk)

    size_bytes = dest_root_apk.stat().st_size
    size_mb = size_bytes / (1024 * 1024)

    print(f"\nSUCCESS! Android APK Generated Successfully:")
    print(f"  -> Project Root: {dest_root_apk} ({size_mb:.2f} MB)")
    print(f"  -> Public Asset: {dest_public_apk}")
    print(f"  -> Public Downloads: {dest_public_named_apk}")
    print(f"  -> Dist Asset: {dest_dist_apk}")
    print(f"  Package: {PACKAGE_NAME}")
    print(f"  Version: {VERSION_NAME} (Code {VERSION_CODE})")

if __name__ == "__main__":
    main()
