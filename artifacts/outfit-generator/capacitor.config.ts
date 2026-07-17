import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mydigitalvault.app',
  appName: 'My Digital Vault',
  webDir: 'dist/public',

  // -------------------------------------------------------------------------
  // iOS-specific configuration
  // -------------------------------------------------------------------------
  ios: {
    // Allow the WKWebView to scroll; the app manages its own scroll areas
    scrollEnabled: true,
    // Prevents white flash on launch
    backgroundColor: '#111111',
    // Allow inline media playback (used for wardrobe image previews)
    allowsInlineMediaPlayback: true,
  },

  plugins: {
    // Keep the splash screen visible until the React app signals it is ready
    SplashScreen: {
      launchShowDuration: 1800,
      launchAutoHide: true,
      backgroundColor: '#111111',
      iosSpinnerStyle: 'small',
      showSpinner: false,
    },

    // Overlay the status bar so the cream background shows through the notch
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#111111',
      overlaysWebView: true,
    },
  },
};

export default config;
