# Cider Dictionary: Build and Deployment Architecture

## Executive Summary

This document defines the comprehensive build and deployment architecture for the Cider Dictionary React Native application, focusing on development workflow optimization, continuous integration/continuous deployment (CI/CD) patterns, and production-ready deployment strategies. The architecture emphasizes zero-cost deployment using Firebase hosting, Expo managed workflow, and GitHub Actions for automation.

## Development Workflow Architecture

### Environment Strategy

```mermaid
graph TB
    subgraph "Development Environments"
        LOCAL[Local Development<br/>- Metro bundler<br/>- Firebase emulators<br/>- Device/simulator testing]

        STAGING[Staging Environment<br/>- Firebase project (staging)<br/>- TestFlight/Internal testing<br/>- Pre-production validation]

        PROD[Production Environment<br/>- Firebase project (prod)<br/>- App Store distribution<br/>- Live user traffic]
    end

    subgraph "Branch Strategy"
        FEATURE[Feature Branches<br/>feature/quick-entry<br/>feature/analytics]

        DEVELOP[Develop Branch<br/>Integration testing<br/>Staging deployment]

        MAIN[Main Branch<br/>Production ready<br/>Release deployment]
    end

    subgraph "Deployment Targets"
        EXPO_DEV[Expo Development<br/>- Development builds<br/>- Hot reload<br/>- Debug mode]

        EXPO_PREVIEW[Expo Preview<br/>- Preview builds<br/>- Stakeholder review<br/>- UAT testing]

        APP_STORES[App Stores<br/>- iOS App Store<br/>- Google Play Store<br/>- Production release]
    end

    FEATURE --> DEVELOP
    DEVELOP --> MAIN

    LOCAL --> EXPO_DEV
    STAGING --> EXPO_PREVIEW
    PROD --> APP_STORES

    LOCAL -.-> FEATURE
    STAGING -.-> DEVELOP
    PROD -.-> MAIN
```

### Development Environment Setup

```bash
# Development Environment Configuration Script
#!/bin/bash

echo "🍺 Setting up Cider Dictionary Development Environment"

# Prerequisites Check
check_prerequisites() {
    echo "Checking prerequisites..."

    # Node.js version check
    if ! command -v node &> /dev/null || ! node --version | grep -q "v18"; then
        echo "❌ Node.js 18.x is required"
        exit 1
    fi

    # Expo CLI check
    if ! command -v expo &> /dev/null; then
        echo "Installing Expo CLI..."
        npm install -g @expo/cli
    fi

    # Firebase CLI check
    if ! command -v firebase &> /dev/null; then
        echo "Installing Firebase CLI..."
        npm install -g firebase-tools
    fi

    echo "✅ Prerequisites verified"
}

# Environment Configuration
setup_environment() {
    echo "Setting up environment configuration..."

    # Copy environment templates
    cp .env.example .env.local
    cp .env.staging.example .env.staging
    cp .env.production.example .env.production

    # Install dependencies
    npm install

    # iOS pods installation
    if [[ "$OSTYPE" == "darwin"* ]]; then
        cd ios && pod install && cd ..
    fi

    echo "✅ Environment configured"
}

# Firebase Setup
setup_firebase() {
    echo "Setting up Firebase environment..."

    # Login to Firebase
    firebase login

    # Initialize Firebase project
    firebase init emulators

    # Start emulators for development
    firebase emulators:start --only firestore,auth,storage &

    echo "✅ Firebase emulators started"
}

# Development Tools Setup
setup_dev_tools() {
    echo "Setting up development tools..."

    # Install development dependencies
    npm install --save-dev \
        @testing-library/react-native \
        @testing-library/jest-native \
        detox \
        jest \
        eslint \
        prettier \
        typescript

    # Setup Git hooks
    npx husky install
    npx husky add .husky/pre-commit "npm run lint-staged"
    npx husky add .husky/commit-msg "npm run commitlint"

    echo "✅ Development tools configured"
}

# Run setup
check_prerequisites
setup_environment
setup_firebase
setup_dev_tools

echo "🎉 Development environment ready!"
echo "Run 'npm start' to begin development"
```

### Development Scripts Configuration

```json
{
  "scripts": {
    "start": "expo start",
    "start:dev": "expo start --dev-client",
    "start:tunnel": "expo start --tunnel",

    "android": "expo run:android",
    "android:dev": "expo run:android --variant debug",
    "android:release": "expo run:android --variant release",

    "ios": "expo run:ios",
    "ios:dev": "expo run:ios --configuration Debug",
    "ios:release": "expo run:ios --configuration Release",

    "web": "expo start --web",

    "build:android": "eas build --platform android",
    "build:ios": "eas build --platform ios",
    "build:all": "eas build --platform all",

    "build:dev": "eas build --profile development",
    "build:preview": "eas build --profile preview",
    "build:production": "eas build --profile production",

    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:unit": "jest --testPathPattern=__tests__",
    "test:integration": "jest --testPathPattern=integration",
    "test:e2e": "detox test",
    "test:e2e:ios": "detox test --configuration ios.sim.debug",
    "test:e2e:android": "detox test --configuration android.emu.debug",

    "lint": "eslint . --ext .js,.jsx,.ts,.tsx",
    "lint:fix": "eslint . --ext .js,.jsx,.ts,.tsx --fix",
    "format": "prettier --write \"**/*.{js,jsx,ts,tsx,json,md}\"",
    "format:check": "prettier --check \"**/*.{js,jsx,ts,tsx,json,md}\"",
    "type-check": "tsc --noEmit",

    "firebase:emulators": "firebase emulators:start",
    "firebase:deploy:staging": "firebase deploy --project staging",
    "firebase:deploy:production": "firebase deploy --project production",

    "prebuild": "expo prebuild",
    "prebuild:clean": "expo prebuild --clean",

    "postinstall": "patch-package && jetify",

    "version:patch": "npm version patch && git push --tags",
    "version:minor": "npm version minor && git push --tags",
    "version:major": "npm version major && git push --tags"
  }
}
```

## Build Configuration Architecture

### Expo Application Services (EAS) Configuration

```json
{
  "cli": {
    "version": ">= 5.9.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "resourceClass": "m-medium",
        "simulator": true,
        "buildConfiguration": "Debug"
      },
      "android": {
        "gradleCommand": ":app:assembleDebug",
        "resourceClass": "medium"
      },
      "channel": "development"
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "resourceClass": "m-medium",
        "buildConfiguration": "Release",
        "simulator": false
      },
      "android": {
        "buildType": "apk",
        "gradleCommand": ":app:assembleRelease",
        "resourceClass": "medium"
      },
      "channel": "preview"
    },
    "production": {
      "ios": {
        "resourceClass": "m-medium",
        "buildConfiguration": "Release",
        "simulator": false,
        "autoIncrement": "buildNumber"
      },
      "android": {
        "buildType": "aab",
        "gradleCommand": ":app:bundleRelease",
        "resourceClass": "medium",
        "autoIncrement": "versionCode"
      },
      "channel": "production"
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-apple-id@email.com",
        "ascAppId": "your-app-store-connect-app-id",
        "appleTeamId": "your-apple-team-id"
      },
      "android": {
        "serviceAccountKeyPath": "./google-service-account.json",
        "track": "production"
      }
    }
  }
}
```

### Environment-Specific Configuration

```typescript
// config/environments.ts
export interface EnvironmentConfig {
  name: string;
  firebase: {
    projectId: string;
    apiKey: string;
    authDomain: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
  };
  api: {
    baseUrl: string;
    timeout: number;
  };
  features: {
    analytics: boolean;
    crashReporting: boolean;
    performanceMonitoring: boolean;
  };
  debug: boolean;
}

const development: EnvironmentConfig = {
  name: 'development',
  firebase: {
    projectId: 'cider-dictionary-dev',
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY_DEV!,
    authDomain: 'cider-dictionary-dev.firebaseapp.com',
    storageBucket: 'cider-dictionary-dev.appspot.com',
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID_DEV!,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID_DEV!,
  },
  api: {
    baseUrl: 'http://localhost:5001/cider-dictionary-dev/us-central1',
    timeout: 10000,
  },
  features: {
    analytics: false,
    crashReporting: false,
    performanceMonitoring: true,
  },
  debug: true,
};

const staging: EnvironmentConfig = {
  name: 'staging',
  firebase: {
    projectId: 'cider-dictionary-staging',
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY_STAGING!,
    authDomain: 'cider-dictionary-staging.firebaseapp.com',
    storageBucket: 'cider-dictionary-staging.appspot.com',
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID_STAGING!,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID_STAGING!,
  },
  api: {
    baseUrl: 'https://us-central1-cider-dictionary-staging.cloudfunctions.net',
    timeout: 8000,
  },
  features: {
    analytics: true,
    crashReporting: true,
    performanceMonitoring: true,
  },
  debug: false,
};

const production: EnvironmentConfig = {
  name: 'production',
  firebase: {
    projectId: 'cider-dictionary-prod',
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY_PROD!,
    authDomain: 'cider-dictionary-prod.firebaseapp.com',
    storageBucket: 'cider-dictionary-prod.appspot.com',
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID_PROD!,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID_PROD!,
  },
  api: {
    baseUrl: 'https://us-central1-cider-dictionary-prod.cloudfunctions.net',
    timeout: 5000,
  },
  features: {
    analytics: true,
    crashReporting: true,
    performanceMonitoring: true,
  },
  debug: false,
};

function getEnvironment(): EnvironmentConfig {
  const env = process.env.EXPO_PUBLIC_ENVIRONMENT || 'development';

  switch (env) {
    case 'staging':
      return staging;
    case 'production':
      return production;
    default:
      return development;
  }
}

export default getEnvironment();
```

### Build Optimization Configuration

```typescript
// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Bundle optimization
config.resolver.sourceExts.push('cjs');

// Asset optimization
config.transformer.minifierConfig = {
  keep_fnames: true,
  mangle: {
    keep_fnames: true,
  },
};

// Development optimizations
if (process.env.NODE_ENV === 'development') {
  config.resolver.platforms = ['native', 'android', 'ios'];
}

// Production optimizations
if (process.env.NODE_ENV === 'production') {
  config.transformer.minifierConfig = {
    ...config.transformer.minifierConfig,
    compress: {
      drop_console: true,
      drop_debugger: true,
    },
  };
}

module.exports = config;
```

## CI/CD Pipeline Architecture

### GitHub Actions Workflow

```yaml
# .github/workflows/ci-cd.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]
  release:
    types: [published]

env:
  NODE_VERSION: '18'
  EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}

jobs:
  # Quality Gates
  quality-check:
    name: Quality Check
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: TypeScript type check
        run: npm run type-check

      - name: ESLint
        run: npm run lint

      - name: Prettier format check
        run: npm run format:check

      - name: Security audit
        run: npm audit --audit-level moderate

      - name: Bundle analyzer
        run: |
          npm run build:web
          npx bundlesize

  # Test Suite
  test-suite:
    name: Test Suite
    runs-on: ubuntu-latest
    needs: quality-check
    services:
      firebase:
        image: firebase/firebase-tools:latest
        ports:
          - 8080:8080
          - 9199:9199
          - 4000:4000

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Start Firebase emulators
        run: |
          npm install -g firebase-tools
          firebase emulators:start --only firestore,auth,storage &
          sleep 30

      - name: Run unit tests
        run: npm run test:unit -- --coverage --maxWorkers=2

      - name: Run integration tests
        run: npm run test:integration
        env:
          FIRESTORE_EMULATOR_HOST: localhost:8080
          FIREBASE_AUTH_EMULATOR_HOST: localhost:9099
          FIREBASE_STORAGE_EMULATOR_HOST: localhost:9199

      - name: Upload coverage reports
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/coverage-final.json
          fail_ci_if_error: true

  # Development Build
  build-development:
    name: Build Development
    runs-on: ubuntu-latest
    needs: test-suite
    if: github.ref == 'refs/heads/develop'
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Expo
        uses: expo/expo-github-action@v8
        with:
          expo-version: latest
          token: ${{ secrets.EXPO_TOKEN }}

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build development app
        run: eas build --profile development --platform all --non-interactive

  # Staging Deployment
  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    needs: test-suite
    if: github.ref == 'refs/heads/develop'
    environment: staging
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Expo
        uses: expo/expo-github-action@v8
        with:
          expo-version: latest
          token: ${{ secrets.EXPO_TOKEN }}

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Deploy to Firebase Staging
        run: |
          npm install -g firebase-tools
          firebase deploy --project staging --token "${{ secrets.FIREBASE_TOKEN }}"

      - name: Build preview app
        run: eas build --profile preview --platform all --non-interactive

      - name: Create preview comment
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '🚀 Preview build available! Check Expo dashboard for download links.'
            })

  # Production Deployment
  deploy-production:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: test-suite
    if: github.ref == 'refs/heads/main' && github.event_name == 'release'
    environment: production
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Expo
        uses: expo/expo-github-action@v8
        with:
          expo-version: latest
          token: ${{ secrets.EXPO_TOKEN }}

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Deploy Firebase Functions
        run: |
          npm install -g firebase-tools
          firebase deploy --only functions --project production --token "${{ secrets.FIREBASE_TOKEN }}"

      - name: Deploy Firestore Rules
        run: |
          firebase deploy --only firestore:rules --project production --token "${{ secrets.FIREBASE_TOKEN }}"

      - name: Build production app
        run: eas build --profile production --platform all --non-interactive

      - name: Submit to app stores
        run: eas submit --platform all --latest --non-interactive

  # E2E Testing
  e2e-tests:
    name: E2E Tests
    runs-on: macos-latest
    needs: deploy-staging
    if: github.ref == 'refs/heads/develop'
    strategy:
      matrix:
        platform: [ios, android]
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Setup iOS Simulator
        if: matrix.platform == 'ios'
        run: |
          xcrun simctl create iPhone14 "iPhone 14" iOS16.0
          xcrun simctl boot iPhone14

      - name: Setup Android Emulator
        if: matrix.platform == 'android'
        uses: reactivecircus/android-emulator-runner@v2
        with:
          api-level: 30
          target: google_apis
          arch: x86_64
          script: echo "Android emulator started"

      - name: Build test app
        run: |
          if [ "${{ matrix.platform }}" == "ios" ]; then
            eas build --profile preview --platform ios --local
          else
            eas build --profile preview --platform android --local
          fi

      - name: Run E2E tests
        run: npm run test:e2e:${{ matrix.platform }}

      - name: Upload test artifacts
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: e2e-artifacts-${{ matrix.platform }}
          path: |
            e2e/artifacts/
            screenshots/

  # Performance Testing
  performance-tests:
    name: Performance Tests
    runs-on: ubuntu-latest
    needs: deploy-staging
    if: github.ref == 'refs/heads/develop'
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run performance tests
        run: npm run test:performance

      - name: Generate lighthouse report
        uses: treosh/lighthouse-ci-action@v9
        with:
          configPath: './lighthouse.config.js'
          uploadArtifacts: true
          temporaryPublicStorage: true

      - name: Bundle size analysis
        run: |
          npm run build:web
          npx bundlesize --config bundlesize.config.json

      - name: Performance regression check
        run: npm run performance:compare-baseline
```

### Automated Release Management

```typescript
// scripts/release-automation.ts
import { exec } from 'child_process';
import { promisify } from 'util';
import semver from 'semver';

const execAsync = promisify(exec);

interface ReleaseConfig {
  type: 'patch' | 'minor' | 'major';
  prerelease?: boolean;
  dryRun?: boolean;
}

class ReleaseManager {
  async getCurrentVersion(): Promise<string> {
    const { stdout } = await execAsync('git describe --tags --abbrev=0');
    return stdout.trim();
  }

  async generateChangelog(fromTag: string, toTag: string): Promise<string> {
    const { stdout } = await execAsync(
      `git log ${fromTag}..${toTag} --pretty=format:"- %s (%h)" --grep="feat:" --grep="fix:" --grep="BREAKING CHANGE:"`
    );
    return stdout.trim();
  }

  async createRelease(config: ReleaseConfig): Promise<void> {
    console.log(`🚀 Creating ${config.type} release...`);

    // Get current version
    const currentVersion = await this.getCurrentVersion();
    const newVersion = semver.inc(currentVersion, config.type);

    if (!newVersion) {
      throw new Error('Failed to increment version');
    }

    console.log(`📈 Version: ${currentVersion} → ${newVersion}`);

    if (config.dryRun) {
      console.log('🔍 Dry run mode - no changes will be made');
      return;
    }

    // Update version in package.json
    await execAsync(`npm version ${config.type} --no-git-tag-version`);

    // Update app.json version
    await this.updateAppVersion(newVersion);

    // Generate changelog
    const changelog = await this.generateChangelog(currentVersion, 'HEAD');

    // Commit changes
    await execAsync('git add .');
    await execAsync(`git commit -m "chore: release v${newVersion}"`);

    // Create and push tag
    await execAsync(`git tag -a v${newVersion} -m "Release v${newVersion}"`);
    await execAsync('git push origin main --tags');

    // Create GitHub release
    await this.createGitHubRelease(newVersion, changelog);

    console.log(`✅ Release v${newVersion} created successfully!`);
  }

  private async updateAppVersion(version: string): Promise<void> {
    const appJson = require('../app.json');
    appJson.expo.version = version;

    // Auto-increment build numbers
    if (appJson.expo.ios?.buildNumber) {
      appJson.expo.ios.buildNumber = String(
        parseInt(appJson.expo.ios.buildNumber) + 1
      );
    }

    if (appJson.expo.android?.versionCode) {
      appJson.expo.android.versionCode = appJson.expo.android.versionCode + 1;
    }

    await execAsync(`echo '${JSON.stringify(appJson, null, 2)}' > app.json`);
  }

  private async createGitHubRelease(version: string, changelog: string): Promise<void> {
    const releaseNotes = `
# Release v${version}

## Changes
${changelog}

## Installation
- iOS: Download from TestFlight or App Store
- Android: Download from Play Store or GitHub releases

## Firebase Updates
- Database schema: No changes
- Security rules: Updated if applicable
- Cloud functions: Deployed automatically
    `.trim();

    await execAsync(`gh release create v${version} --title "Release v${version}" --notes "${releaseNotes}"`);
  }
}

// CLI interface
async function main() {
  const releaseType = process.argv[2] as 'patch' | 'minor' | 'major';
  const dryRun = process.argv.includes('--dry-run');

  if (!['patch', 'minor', 'major'].includes(releaseType)) {
    console.error('Usage: npm run release [patch|minor|major] [--dry-run]');
    process.exit(1);
  }

  const releaseManager = new ReleaseManager();

  try {
    await releaseManager.createRelease({
      type: releaseType,
      dryRun,
    });
  } catch (error) {
    console.error('❌ Release failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
```

## Deployment Strategy Architecture

### Firebase Deployment Configuration

```json
{
  "projects": {
    "development": "cider-dictionary-dev",
    "staging": "cider-dictionary-staging",
    "production": "cider-dictionary-prod"
  },
  "targets": {
    "cider-dictionary-dev": {
      "hosting": {
        "web": ["cider-dictionary-dev-web"]
      }
    },
    "cider-dictionary-staging": {
      "hosting": {
        "web": ["cider-dictionary-staging-web"]
      }
    },
    "cider-dictionary-prod": {
      "hosting": {
        "web": ["cider-dictionary-prod-web"]
      }
    }
  },
  "hosting": [
    {
      "target": "web",
      "public": "web-build",
      "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
      "rewrites": [
        {
          "source": "**",
          "destination": "/index.html"
        }
      ],
      "headers": [
        {
          "source": "/static/**",
          "headers": [
            {
              "key": "Cache-Control",
              "value": "public, max-age=31536000, immutable"
            }
          ]
        }
      ]
    }
  ],
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "functions": [
    {
      "source": "functions",
      "codebase": "default",
      "ignore": [
        "node_modules",
        ".git",
        "firebase-debug.log",
        "firebase-debug.*.log"
      ]
    }
  ],
  "storage": {
    "rules": "storage.rules"
  },
  "emulators": {
    "auth": {
      "port": 9099
    },
    "firestore": {
      "port": 8080
    },
    "functions": {
      "port": 5001
    },
    "hosting": {
      "port": 5000
    },
    "storage": {
      "port": 9199
    },
    "ui": {
      "enabled": true,
      "port": 4000
    },
    "singleProjectMode": true
  }
}
```

### Deployment Scripts

```bash
#!/bin/bash
# scripts/deploy.sh

set -e

ENVIRONMENT=${1:-staging}
BUILD_PROFILE=${2:-preview}

echo "🚀 Deploying to $ENVIRONMENT environment"

# Environment validation
validate_environment() {
    case $ENVIRONMENT in
        development|staging|production)
            echo "✅ Valid environment: $ENVIRONMENT"
            ;;
        *)
            echo "❌ Invalid environment: $ENVIRONMENT"
            echo "Valid options: development, staging, production"
            exit 1
            ;;
    esac
}

# Pre-deployment checks
pre_deployment_checks() {
    echo "🔍 Running pre-deployment checks..."

    # Verify Firebase CLI is logged in
    if ! firebase projects:list &> /dev/null; then
        echo "❌ Firebase CLI not authenticated"
        echo "Run: firebase login"
        exit 1
    fi

    # Verify Expo CLI is logged in
    if ! expo whoami &> /dev/null; then
        echo "❌ Expo CLI not authenticated"
        echo "Run: expo login"
        exit 1
    fi

    # Run tests
    echo "🧪 Running test suite..."
    npm run test:unit

    # Type checking
    echo "🔍 Type checking..."
    npm run type-check

    # Linting
    echo "🔍 Linting..."
    npm run lint

    echo "✅ Pre-deployment checks passed"
}

# Firebase deployment
deploy_firebase() {
    echo "🔥 Deploying Firebase services to $ENVIRONMENT..."

    # Deploy Firestore rules and indexes
    firebase deploy --only firestore --project $ENVIRONMENT

    # Deploy storage rules
    firebase deploy --only storage --project $ENVIRONMENT

    # Deploy functions (if any)
    if [ -d "functions" ]; then
        firebase deploy --only functions --project $ENVIRONMENT
    fi

    echo "✅ Firebase deployment completed"
}

# Mobile app deployment
deploy_mobile_app() {
    echo "📱 Building mobile app for $ENVIRONMENT..."

    # Set environment variables
    export EXPO_PUBLIC_ENVIRONMENT=$ENVIRONMENT

    # Build app
    case $BUILD_PROFILE in
        development)
            eas build --profile development --platform all --non-interactive
            ;;
        preview)
            eas build --profile preview --platform all --non-interactive
            ;;
        production)
            eas build --profile production --platform all --non-interactive

            # Auto-submit to app stores for production
            if [ "$ENVIRONMENT" == "production" ]; then
                echo "🏪 Submitting to app stores..."
                eas submit --platform all --latest --non-interactive
            fi
            ;;
    esac

    echo "✅ Mobile app deployment completed"
}

# Post-deployment verification
post_deployment_verification() {
    echo "🔍 Running post-deployment verification..."

    # Health check endpoints
    case $ENVIRONMENT in
        staging)
            curl -f https://cider-dictionary-staging.firebaseapp.com/health || echo "⚠️ Staging health check failed"
            ;;
        production)
            curl -f https://cider-dictionary-prod.firebaseapp.com/health || echo "⚠️ Production health check failed"
            ;;
    esac

    echo "✅ Post-deployment verification completed"
}

# Notification
send_deployment_notification() {
    echo "📢 Sending deployment notification..."

    # Slack notification (if webhook is configured)
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"🚀 Cider Dictionary deployed to $ENVIRONMENT\"}" \
            $SLACK_WEBHOOK_URL
    fi

    # Discord notification (if webhook is configured)
    if [ -n "$DISCORD_WEBHOOK_URL" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"content\":\"🚀 Cider Dictionary deployed to $ENVIRONMENT\"}" \
            $DISCORD_WEBHOOK_URL
    fi
}

# Main deployment flow
main() {
    validate_environment
    pre_deployment_checks
    deploy_firebase
    deploy_mobile_app
    post_deployment_verification
    send_deployment_notification

    echo "🎉 Deployment to $ENVIRONMENT completed successfully!"
}

# Error handling
trap 'echo "❌ Deployment failed!"; exit 1' ERR

# Run deployment
main
```

## Monitoring and Observability

### Application Performance Monitoring

```typescript
// services/MonitoringService.ts
import * as Sentry from '@sentry/react-native';
import crashlytics from '@react-native-firebase/crashlytics';
import analytics from '@react-native-firebase/analytics';
import perf from '@react-native-firebase/perf';

export class MonitoringService {
  private static instance: MonitoringService;

  static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  async initialize(environment: string): Promise<void> {
    // Sentry initialization
    Sentry.init({
      dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
      environment,
      tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
      enabled: environment !== 'development',
    });

    // Firebase Crashlytics
    if (environment !== 'development') {
      await crashlytics().setCrashlyticsCollectionEnabled(true);
    }

    // Firebase Analytics
    if (environment === 'production') {
      await analytics().setAnalyticsCollectionEnabled(true);
    }

    console.log(`📊 Monitoring initialized for ${environment}`);
  }

  // Performance tracking
  async trackScreenLoad(screenName: string): Promise<() => void> {
    const trace = perf().newTrace(`screen_load_${screenName}`);
    await trace.start();

    return async () => {
      await trace.stop();
    };
  }

  async trackApiCall(endpoint: string): Promise<() => void> {
    const trace = perf().newTrace(`api_call_${endpoint.replace(/\//g, '_')}`);
    await trace.start();

    return async () => {
      await trace.stop();
    };
  }

  // Error tracking
  trackError(error: Error, context?: Record<string, any>): void {
    console.error('Error tracked:', error);

    // Sentry
    Sentry.captureException(error, {
      extra: context,
    });

    // Firebase Crashlytics
    if (context) {
      crashlytics().setAttributes(context);
    }
    crashlytics().recordError(error);
  }

  // Analytics tracking
  async trackEvent(event: string, parameters?: Record<string, any>): Promise<void> {
    await analytics().logEvent(event, parameters);
  }

  async trackUserProperty(name: string, value: string): Promise<void> {
    await analytics().setUserProperty(name, value);
  }

  // Custom metrics
  async trackCustomMetric(name: string, value: number): Promise<void> {
    const trace = perf().newTrace(name);
    await trace.start();
    trace.putMetric(name, value);
    await trace.stop();
  }

  // User feedback collection
  async collectUserFeedback(feedback: {
    type: 'bug' | 'feature' | 'improvement';
    message: string;
    rating?: number;
  }): Promise<void> {
    // Track feedback event
    await this.trackEvent('user_feedback_submitted', {
      feedback_type: feedback.type,
      has_rating: feedback.rating !== undefined,
    });

    // Send to Sentry as user feedback
    Sentry.captureUserFeedback({
      event_id: Sentry.lastEventId(),
      name: 'Anonymous User',
      email: 'feedback@ciderdictionary.app',
      comments: feedback.message,
    });
  }
}

// React Hook for monitoring
export function useMonitoring() {
  const monitoring = MonitoringService.getInstance();

  const trackScreenLoad = (screenName: string) => {
    return monitoring.trackScreenLoad(screenName);
  };

  const trackApiCall = (endpoint: string) => {
    return monitoring.trackApiCall(endpoint);
  };

  const trackError = (error: Error, context?: Record<string, any>) => {
    monitoring.trackError(error, context);
  };

  const trackEvent = (event: string, parameters?: Record<string, any>) => {
    return monitoring.trackEvent(event, parameters);
  };

  return {
    trackScreenLoad,
    trackApiCall,
    trackError,
    trackEvent,
  };
}
```

### Deployment Health Checks

```typescript
// services/HealthCheckService.ts
export interface HealthCheck {
  name: string;
  status: 'healthy' | 'warning' | 'error';
  message: string;
  timestamp: number;
  duration?: number;
}

export class HealthCheckService {
  async performHealthChecks(): Promise<HealthCheck[]> {
    const checks: HealthCheck[] = [];

    // Firebase connectivity
    checks.push(await this.checkFirebaseConnectivity());

    // Local storage
    checks.push(await this.checkLocalStorage());

    // Network connectivity
    checks.push(await this.checkNetworkConnectivity());

    // App permissions
    checks.push(await this.checkPermissions());

    // Performance metrics
    checks.push(await this.checkPerformanceMetrics());

    return checks;
  }

  private async checkFirebaseConnectivity(): Promise<HealthCheck> {
    const startTime = Date.now();

    try {
      // Simple Firestore read to test connectivity
      await firestore().collection('health_check').limit(1).get();

      return {
        name: 'Firebase Connectivity',
        status: 'healthy',
        message: 'Successfully connected to Firebase',
        timestamp: Date.now(),
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        name: 'Firebase Connectivity',
        status: 'error',
        message: `Firebase connection failed: ${error.message}`,
        timestamp: Date.now(),
        duration: Date.now() - startTime,
      };
    }
  }

  private async checkLocalStorage(): Promise<HealthCheck> {
    const startTime = Date.now();

    try {
      // Test SQLite connectivity
      const testData = { id: 'health_check', timestamp: Date.now() };
      await SQLiteService.insert('health_checks', testData);
      await SQLiteService.delete('health_checks', { id: 'health_check' });

      return {
        name: 'Local Storage',
        status: 'healthy',
        message: 'Local storage is functioning correctly',
        timestamp: Date.now(),
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        name: 'Local Storage',
        status: 'error',
        message: `Local storage error: ${error.message}`,
        timestamp: Date.now(),
        duration: Date.now() - startTime,
      };
    }
  }

  private async checkNetworkConnectivity(): Promise<HealthCheck> {
    const startTime = Date.now();

    try {
      const networkState = await NetInfo.fetch();

      if (!networkState.isConnected) {
        return {
          name: 'Network Connectivity',
          status: 'warning',
          message: 'Device is offline',
          timestamp: Date.now(),
          duration: Date.now() - startTime,
        };
      }

      return {
        name: 'Network Connectivity',
        status: 'healthy',
        message: `Connected via ${networkState.type}`,
        timestamp: Date.now(),
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        name: 'Network Connectivity',
        status: 'error',
        message: `Network check failed: ${error.message}`,
        timestamp: Date.now(),
        duration: Date.now() - startTime,
      };
    }
  }

  private async checkPermissions(): Promise<HealthCheck> {
    const startTime = Date.now();

    try {
      const locationPermission = await check(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
      const cameraPermission = await check(PERMISSIONS.IOS.CAMERA);

      const issues = [];
      if (locationPermission !== RESULTS.GRANTED) {
        issues.push('Location permission not granted');
      }
      if (cameraPermission !== RESULTS.GRANTED) {
        issues.push('Camera permission not granted');
      }

      if (issues.length > 0) {
        return {
          name: 'App Permissions',
          status: 'warning',
          message: `Permission issues: ${issues.join(', ')}`,
          timestamp: Date.now(),
          duration: Date.now() - startTime,
        };
      }

      return {
        name: 'App Permissions',
        status: 'healthy',
        message: 'All required permissions granted',
        timestamp: Date.now(),
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        name: 'App Permissions',
        status: 'error',
        message: `Permission check failed: ${error.message}`,
        timestamp: Date.now(),
        duration: Date.now() - startTime,
      };
    }
  }

  private async checkPerformanceMetrics(): Promise<HealthCheck> {
    const startTime = Date.now();

    try {
      const memoryUsage = await getMemoryUsage();
      const isLowMemory = memoryUsage.availableMemory < 100 * 1024 * 1024; // 100MB

      if (isLowMemory) {
        return {
          name: 'Performance Metrics',
          status: 'warning',
          message: `Low memory available: ${Math.round(memoryUsage.availableMemory / 1024 / 1024)}MB`,
          timestamp: Date.now(),
          duration: Date.now() - startTime,
        };
      }

      return {
        name: 'Performance Metrics',
        status: 'healthy',
        message: `Memory usage normal: ${Math.round(memoryUsage.usedMemory / 1024 / 1024)}MB used`,
        timestamp: Date.now(),
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        name: 'Performance Metrics',
        status: 'error',
        message: `Performance check failed: ${error.message}`,
        timestamp: Date.now(),
        duration: Date.now() - startTime,
      };
    }
  }
}
```

This comprehensive build and deployment architecture provides a robust foundation for developing, testing, and deploying the Cider Dictionary React Native application with automated workflows, quality gates, and monitoring capabilities that ensure reliable production deployments while maintaining zero operational costs through strategic use of Firebase free tier and open-source tooling.