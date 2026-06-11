import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.evolve.billing',
  appName: 'Evolve Billing',
  webDir: 'dist',
  // Load the live site — so every website update = app auto-updates too
  server: {
    url: 'https://evolve-billing.netlify.app',
    cleartext: false,
    androidScheme: 'https',
  },
};

export default config;
