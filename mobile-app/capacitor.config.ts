import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.ecuisinefoods.app",
  appName: "eCuisine Foods",
  webDir: "web",
  server: {
    // Keep the existing live storefront and its Supabase-backed flows as the source of truth.
    url: "https://dubemascend-png.github.io/ecuisine-foods-online-store/",
    cleartext: false,
    allowNavigation: [
      "dubemascend-png.github.io",
      "zsepwkequzwwuxtrpmmy.supabase.co",
      "wa.me",
      "api.whatsapp.com"
    ]
  },
  android: {
    allowMixedContent: false
  }
};

export default config;
