// Dynamic Expo configuration - reads from environment variables
// https://docs.expo.dev/workflow/configuration/#dynamic-configuration

export default {
  expo: {
    name: "Cider Dictionary",
    slug: "cider-dictionary",
    version: "1.0.0",
    orientation: "portrait",
    userInterfaceStyle: "light",
    splash: {
      backgroundColor: "#007AFF"
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.ciderdictionary.app"
    },
    android: {
      adaptiveIcon: {
        backgroundColor: "#007AFF"
      },
      package: "com.ciderdictionary.app",
      permissions: [
        "ACCESS_FINE_LOCATION",
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE"
      ],
      config: {
        googleMaps: {
          apiKey: process.env.GOOGLE_MAPS_API_KEY || ""
        }
      }
    },
    platforms: ["ios", "android", "web"],
    updates: {
      enabled: false
    },
    extra: {
      eas: {
        projectId: "77f93163-708d-4844-9fdf-324b16a150f7"
      }
    },
    plugins: [
      "expo-font",
      "expo-sqlite"
    ]
  }
};
