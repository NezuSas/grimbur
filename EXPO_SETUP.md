# Mario Grid: Expo Setup & Run Guide 🚀

This project is built using **Expo**, a framework for universal React applications. Follow these steps to set up and run the game on your local machine, Android, and iOS.

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
1. **Node.js** (LTS version recommended)
2. **npm** (comes with Node.js) or **Yarn**
3. **Expo Go** app (optional, for quick testing on your physical phone)

---

## 🛠️ Installation

1. **Clone the repository** (if you haven't already).
2. **Install dependencies**:
   ```bash
   npm install
   ```

---

## 🚀 Running the Project

### 1. Start the Development Server
This command starts the Expo CLI and provides a QR code in your terminal.
```bash
npm start
```

### 2. Physical Devices (easiest)
- **Android**: Open the **Expo Go** app and scan the QR code from the terminal.
- **iOS**: Open the standard **Camera** app and scan the QR code. It will prompt you to open it in Expo Go.

### 3. Emulators & Simulators
- **Android Emulator**: Ensure an emulator is running (via Android Studio), then press `a` in the terminal after starting the server.
- **iOS Simulator**: (macOS only) Ensure a simulator is installed, then press `i` in the terminal.

---

## 📱 Platform Specific Commands

| Action | Command |
| :--- | :--- |
| **Android (Native Run)** | `npm run android` |
| **iOS (Native Run)** | `npm run ios` |
| **Clean Cache** | `npx expo start -c` |
| **Web Preview** | `npm run web` |

---

## 🧪 Running Tests

The project includes unit tests for the game engine and stress tests:
- **Engine Tests**: `npm run test:engine`
- **Stress Tests**: `npm run test:stress`
- **All Tests**: `npm test`

---

## 📦 Building for Production

To create a standalone APK or IPA for distribution:
1. Install EAS CLI: `npm install -g eas-cli`
2. Log in to your Expo account: `eas login`
3. Configure the build: `eas build:configure`
4. Run a build:
   - Android: `eas build -p android`
   - iOS: `eas build -p ios`

---

**Enjoy adventuring in Mario Grid!** 🍄🌟
