# ArfaChat Android Native Project

This directory contains the complete native Android application project for **ArfaChat CallingApp** (`com.arfachat.subarfa`).

## Project Details
- **App Name**: ArfaChat
- **Package ID**: `com.arfachat.subarfa`
- **Target SDK**: Android 15 (API 35)
- **Minimum SDK**: Android 7.0 Nougat (API 24)
- **Features**: Fullscreen native WebView wrapper with WebRTC auto-granted audio/video permissions, hardware acceleration, and back-button navigation.

## How to Open in Android Studio
1. Open **Android Studio**.
2. Select **Open an Existing Project** and choose the `/android` directory.
3. Allow Gradle to sync dependencies (`androidx.appcompat`, `material`, `webkit`).
4. Connect an Android device via USB (or start an Android Virtual Device / Emulator).
5. Click **Run** (`Shift + F10`) or **Build > Build Bundle(s) / APK(s) > Build APK(s)**.

## Pre-compiled APK
A signed release APK is also directly available in the root project:
- `/arfachat.apk`
- `/public/arfachat.apk` (Downloadable directly in the web browser at `/arfachat.apk`)
