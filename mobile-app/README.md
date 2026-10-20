# eCuisine Foods for Android

The Android app opens the existing live eCuisine Foods storefront so current shopping, sign-in, order tracking, affiliate referrals, and the owner dashboard remain connected to the existing Supabase-backed website.

## Build

The GitHub Actions workflow builds a debug APK with the Android SDK and publishes the verified output to the website download directory.

## Important release note

The initial downloadable APK is an installable direct-download build, not a Play Store-signed release. Because the app loads the live website, an internet connection is required. The website and Supabase remain the source of truth for account and order data.
