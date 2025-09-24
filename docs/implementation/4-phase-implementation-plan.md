# Cider Dictionary: 4-Phase Implementation Plan

## Executive Summary

This document outlines a comprehensive 4-phase implementation plan for the Cider Dictionary React Native application, based on the existing SPARC documentation and technical specifications. The plan is designed for implementation by a single developer, building incrementally from a basic prototype to a full-featured MVP within performance targets.

**Key Performance Targets:**
- 30-second quick entry target
- Sub-200ms search response time
- 60fps animations throughout
- Offline-first architecture with Firebase sync
- Zero monthly operating costs (free tier compliance)

**Technology Stack:**
- React Native 0.75.4 + Expo SDK 54 + TypeScript
- Firebase (Auth, Firestore, Storage) + SQLite offline storage
- Zustand state management + React Query caching
- Progressive disclosure UI pattern

---

## Phase 1: Prototype - Simply Runs
*Target Duration: 2-3 weeks*

### Phase Overview
Create a minimal working application with basic navigation and core data structures. Focus on getting the app running with fundamental architecture in place. This phase establishes the foundation for all subsequent development.

### Core Deliverables

#### 1.1 Application Shell
- **Expo/React Native Setup**: Initialize project with Expo SDK 54 and React Native 0.75.4
- **TypeScript Configuration**: Strict mode setup with proper tsconfig
- **Basic Navigation**: Bottom tab navigator with placeholder screens
- **Essential Dependencies**: Core libraries installation and configuration

#### 1.2 Data Layer Foundation
- **SQLite Database**: Basic schema for ciders table only (minimal fields)
- **Firebase Project**: Basic setup with Authentication only
- **Core Type Definitions**: Essential TypeScript interfaces (simplified CiderRecord)
- **Basic Storage**: Simple SQLite CRUD operations for ciders

#### 1.3 Basic UI Framework
- **Design System**: Color scheme, typography, and basic components
- **Theme Provider**: React Native Elements or similar UI library setup
- **Navigation Structure**: Tab-based navigation with proper TypeScript typing
- **Loading States**: Basic skeleton screens and loading indicators

### Technical Implementation

#### File Structure Creation
```
src/
├── components/
│   ├── common/
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── LoadingSpinner.tsx
│   │   └── SafeAreaContainer.tsx
│   └── cards/
│       └── CiderCard.tsx (basic version)
├── screens/
│   ├── Collection/
│   │   └── CollectionScreen.tsx (placeholder)
│   ├── QuickEntry/
│   │   └── QuickEntryScreen.tsx (basic form)
│   ├── Analytics/
│   │   └── AnalyticsScreen.tsx (placeholder)
│   └── Settings/
│       └── SettingsScreen.tsx (basic)
├── services/
│   ├── database/
│   │   └── sqlite.ts (basic CRUD only)
│   └── firebase/
│       └── config.ts (basic setup)
├── types/
│   ├── cider.ts (basic fields only)
│   └── navigation.ts
└── navigation/
    ├── AppNavigator.tsx
    └── TabNavigator.tsx
```

#### Key Components

##### Basic Cider Form (QuickEntryScreen)
```typescript
interface QuickEntryForm {
  name: string;
  brand: string;
  abv: number;
  overallRating: number;
}

const QuickEntryScreen: React.FC = () => {
  const [formData, setFormData] = useState<QuickEntryForm>({
    name: '',
    brand: '',
    abv: 0,
    overallRating: 0
  });

  const handleSubmit = async () => {
    // Basic validation
    // Save to SQLite
    // Show success message
  };

  return (
    <SafeAreaContainer>
      {/* Basic form inputs - no progressive disclosure yet */}
      <Input label="Cider Name" value={formData.name} />
      <Input label="Brand" value={formData.brand} />
      <Input label="ABV %" value={formData.abv.toString()} />
      <RatingInput rating={formData.overallRating} />
      <Button title="Save Cider" onPress={handleSubmit} />
    </SafeAreaContainer>
  );
};
```

##### Local Data Encryption Service
```typescript
import CryptoJS from 'crypto-js';
import { Keychain } from 'react-native-keychain';

interface EncryptionConfig {
  algorithm: 'AES-256-GCM';
  keyDerivation: 'PBKDF2';
  keyIterations: 10000;
  saltLength: 32;
}

class LocalEncryptionService {
  private static instance: LocalEncryptionService;
  private config: EncryptionConfig = {
    algorithm: 'AES-256-GCM',
    keyDerivation: 'PBKDF2',
    keyIterations: 10000,
    saltLength: 32
  };

  static getInstance(): LocalEncryptionService {
    if (!LocalEncryptionService.instance) {
      LocalEncryptionService.instance = new LocalEncryptionService();
    }
    return LocalEncryptionService.instance;
  }

  async encryptSensitiveData(plaintext: string, keyIdentifier: string): Promise<string> {
    try {
      // Get or generate encryption key
      const encryptionKey = await this.getOrCreateKey(keyIdentifier);

      // Generate random salt and IV
      const salt = CryptoJS.lib.WordArray.random(this.config.saltLength);
      const iv = CryptoJS.lib.WordArray.random(16);

      // Derive key using PBKDF2
      const key = CryptoJS.PBKDF2(encryptionKey, salt, {
        keySize: 256 / 32,
        iterations: this.config.keyIterations
      });

      // Encrypt data using AES-256-GCM
      const encrypted = CryptoJS.AES.encrypt(plaintext, key, {
        iv: iv,
        mode: CryptoJS.mode.GCM,
        padding: CryptoJS.pad.NoPadding
      });

      // Combine salt + iv + encrypted data for storage
      const combined = salt.concat(iv).concat(encrypted.ciphertext);

      return CryptoJS.enc.Base64.stringify(combined);
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt sensitive data');
    }
  }

  async decryptSensitiveData(encryptedData: string, keyIdentifier: string): Promise<string> {
    try {
      // Get encryption key
      const encryptionKey = await this.getOrCreateKey(keyIdentifier);

      // Parse combined data (salt + iv + ciphertext)
      const combined = CryptoJS.enc.Base64.parse(encryptedData);
      const salt = CryptoJS.lib.WordArray.create(combined.words.slice(0, 8));
      const iv = CryptoJS.lib.WordArray.create(combined.words.slice(8, 12));
      const ciphertext = CryptoJS.lib.WordArray.create(combined.words.slice(12));

      // Derive key using same parameters
      const key = CryptoJS.PBKDF2(encryptionKey, salt, {
        keySize: 256 / 32,
        iterations: this.config.keyIterations
      });

      // Decrypt data
      const decrypted = CryptoJS.AES.decrypt(
        { ciphertext: ciphertext } as any,
        key,
        { iv: iv, mode: CryptoJS.mode.GCM, padding: CryptoJS.pad.NoPadding }
      );

      return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt sensitive data');
    }
  }

  private async getOrCreateKey(keyIdentifier: string): Promise<string> {
    try {
      // Try to retrieve existing key from secure keystore
      const credentials = await Keychain.getInternetCredentials(keyIdentifier);

      if (credentials) {
        return credentials.password;
      }

      // Generate new key if none exists
      const newKey = CryptoJS.lib.WordArray.random(256 / 8).toString();

      // Store in secure keystore
      await Keychain.setInternetCredentials(keyIdentifier, keyIdentifier, newKey);

      return newKey;
    } catch (error) {
      console.error('Key management failed:', error);
      throw new Error('Failed to manage encryption keys');
    }
  }

  // Encrypt specific sensitive fields
  async encryptCiderNotes(notes: string): Promise<string> {
    return this.encryptSensitiveData(notes, 'cider_notes_key');
  }

  async decryptCiderNotes(encryptedNotes: string): Promise<string> {
    return this.decryptSensitiveData(encryptedNotes, 'cider_notes_key');
  }

  async encryptLocationData(locationData: string): Promise<string> {
    return this.encryptSensitiveData(locationData, 'location_key');
  }

  async decryptLocationData(encryptedLocation: string): Promise<string> {
    return this.decryptSensitiveData(encryptedLocation, 'location_key');
  }
}

export default LocalEncryptionService;
```

##### Firebase Cost Monitoring Service
```typescript
interface FirebaseUsageLimits {
  firestore: {
    reads: { limit: 50000; warning: 40000 };
    writes: { limit: 20000; warning: 16000 };
    deletes: { limit: 20000; warning: 16000 };
  };
  storage: {
    downloadGb: { limit: 1; warning: 0.8 };
    uploadGb: { limit: 1; warning: 0.8 };
    totalStorageGb: { limit: 5; warning: 4 };
  };
  authentication: {
    verifications: { limit: 10000; warning: 8000 };
  };
}

class FirebaseCostMonitor {
  private static instance: FirebaseCostMonitor;
  private usageTracking: Map<string, number> = new Map();
  private limits: FirebaseUsageLimits = {
    firestore: {
      reads: { limit: 50000, warning: 40000 },
      writes: { limit: 20000, warning: 16000 },
      deletes: { limit: 20000, warning: 16000 }
    },
    storage: {
      downloadGb: { limit: 1, warning: 0.8 },
      uploadGb: { limit: 1, warning: 0.8 },
      totalStorageGb: { limit: 5, warning: 4 }
    },
    authentication: {
      verifications: { limit: 10000, warning: 8000 }
    }
  };

  static getInstance(): FirebaseCostMonitor {
    if (!FirebaseCostMonitor.instance) {
      FirebaseCostMonitor.instance = new FirebaseCostMonitor();
    }
    return FirebaseCostMonitor.instance;
  }

  // Track Firestore operations
  trackFirestoreRead(count: number = 1): void {
    this.incrementUsage('firestore_reads', count);
    this.checkUsageThreshold('firestore_reads', this.limits.firestore.reads);
  }

  trackFirestoreWrite(count: number = 1): void {
    this.incrementUsage('firestore_writes', count);
    this.checkUsageThreshold('firestore_writes', this.limits.firestore.writes);
  }

  trackFirestoreDelete(count: number = 1): void {
    this.incrementUsage('firestore_deletes', count);
    this.checkUsageThreshold('firestore_deletes', this.limits.firestore.deletes);
  }

  // Track Storage operations
  trackStorageUpload(sizeBytes: number): void {
    const sizeGb = sizeBytes / (1024 * 1024 * 1024);
    this.incrementUsage('storage_upload_gb', sizeGb);
    this.checkUsageThreshold('storage_upload_gb', this.limits.storage.uploadGb);
  }

  trackStorageDownload(sizeBytes: number): void {
    const sizeGb = sizeBytes / (1024 * 1024 * 1024);
    this.incrementUsage('storage_download_gb', sizeGb);
    this.checkUsageThreshold('storage_download_gb', this.limits.storage.downloadGb);
  }

  // Track Authentication operations
  trackAuthVerification(count: number = 1): void {
    this.incrementUsage('auth_verifications', count);
    this.checkUsageThreshold('auth_verifications', this.limits.authentication.verifications);
  }

  private incrementUsage(service: string, amount: number): void {
    const currentUsage = this.usageTracking.get(service) || 0;
    const newUsage = currentUsage + amount;
    this.usageTracking.set(service, newUsage);

    // Persist usage tracking locally
    this.persistUsageData();
  }

  private checkUsageThreshold(
    service: string,
    limits: { limit: number; warning: number }
  ): void {
    const currentUsage = this.usageTracking.get(service) || 0;
    const warningPercentage = (currentUsage / limits.limit) * 100;

    if (currentUsage >= limits.warning && currentUsage < limits.limit) {
      this.triggerUsageWarning(service, currentUsage, limits.limit, warningPercentage);
    } else if (currentUsage >= limits.limit) {
      this.triggerUsageLimit(service, currentUsage, limits.limit);
    }
  }

  private triggerUsageWarning(
    service: string,
    currentUsage: number,
    limit: number,
    percentage: number
  ): void {
    console.warn(`Firebase ${service} usage warning: ${currentUsage}/${limit} (${percentage.toFixed(1)}%)`);

    // Show user-friendly warning
    this.showCostWarningToUser(service, percentage);
  }

  private triggerUsageLimit(service: string, currentUsage: number, limit: number): void {
    console.error(`Firebase ${service} usage limit reached: ${currentUsage}/${limit}`);

    // Implement cost protection measures
    this.enableCostProtectionMode(service);
  }

  private showCostWarningToUser(service: string, percentage: number): void {
    // This would integrate with your app's notification system
    const message = `Firebase usage for ${service} is at ${percentage.toFixed(1)}% of free tier limit. Consider optimizing usage.`;

    // Show non-intrusive notification to user
    // You can implement this with react-native-toast-message or similar
    console.log('User warning:', message);
  }

  private enableCostProtectionMode(service: string): void {
    // Implement protective measures when approaching limits
    switch (service) {
      case 'firestore_reads':
        // Enable aggressive caching, reduce sync frequency
        this.reduceFirestoreReads();
        break;
      case 'firestore_writes':
        // Batch writes more aggressively, delay non-critical writes
        this.batchFirestoreWrites();
        break;
      case 'storage_upload_gb':
        // Reduce image quality, defer uploads
        this.reduceStorageUploads();
        break;
    }
  }

  private async persistUsageData(): Promise<void> {
    try {
      const usageData = Object.fromEntries(this.usageTracking);
      await AsyncStorage.setItem('@firebase_usage', JSON.stringify(usageData));
    } catch (error) {
      console.error('Failed to persist usage data:', error);
    }
  }

  async loadUsageData(): Promise<void> {
    try {
      const storedData = await AsyncStorage.getItem('@firebase_usage');
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        this.usageTracking = new Map(Object.entries(parsedData));
      }
    } catch (error) {
      console.error('Failed to load usage data:', error);
    }
  }

  // Monthly reset (call at beginning of each month)
  resetMonthlyUsage(): void {
    this.usageTracking.clear();
    this.persistUsageData();
    console.log('Firebase usage tracking reset for new month');
  }

  // Get current usage report
  getUsageReport(): Record<string, any> {
    return {
      firestore: {
        reads: this.usageTracking.get('firestore_reads') || 0,
        writes: this.usageTracking.get('firestore_writes') || 0,
        deletes: this.usageTracking.get('firestore_deletes') || 0
      },
      storage: {
        uploadGb: this.usageTracking.get('storage_upload_gb') || 0,
        downloadGb: this.usageTracking.get('storage_download_gb') || 0
      },
      authentication: {
        verifications: this.usageTracking.get('auth_verifications') || 0
      },
      limits: this.limits
    };
  }

  private reduceFirestoreReads(): void {
    // Implement read reduction strategies
    console.log('Enabling Firestore read reduction mode');
  }

  private batchFirestoreWrites(): void {
    // Implement write batching strategies
    console.log('Enabling Firestore write batching mode');
  }

  private reduceStorageUploads(): void {
    // Implement storage upload reduction
    console.log('Enabling storage upload reduction mode');
  }
}

export default FirebaseCostMonitor;
```

##### Firebase Performance Monitoring Service
```typescript
import perf from '@react-native-firebase/perf';
import analytics from '@react-native-firebase/analytics';

interface PerformanceTargets {
  quickEntry: 30000; // 30 seconds max
  searchResponse: 200; // 200ms max
  formValidation: 100; // 100ms max
  imageLoad: 2000; // 2 seconds max
}

interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  target: number;
  isWithinTarget?: boolean;
}

class FirebasePerformanceMonitor {
  private static instance: FirebasePerformanceMonitor;
  private metrics: Map<string, PerformanceMetric> = new Map();
  private traces: Map<string, any> = new Map();

  private readonly targets: PerformanceTargets = {
    quickEntry: 30000,
    searchResponse: 200,
    formValidation: 100,
    imageLoad: 2000
  };

  static getInstance(): FirebasePerformanceMonitor {
    if (!FirebasePerformanceMonitor.instance) {
      FirebasePerformanceMonitor.instance = new FirebasePerformanceMonitor();
    }
    return FirebasePerformanceMonitor.instance;
  }

  // Initialize performance monitoring
  async initialize(): Promise<void> {
    try {
      // Set up performance collection
      await perf().setPerformanceCollectionEnabled(true);

      // Log initialization
      console.log('Firebase Performance monitoring initialized');

      // Set up custom metrics
      this.setupCustomMetrics();
    } catch (error) {
      console.error('Failed to initialize performance monitoring:', error);
    }
  }

  private setupCustomMetrics(): void {
    // Pre-define performance traces for critical operations
    const criticalOperations = [
      'cider_quick_entry',
      'search_query_execution',
      'form_validation_check',
      'image_load_optimization',
      'database_query',
      'sync_operation'
    ];

    criticalOperations.forEach(operation => {
      this.metrics.set(operation, {
        name: operation,
        startTime: 0,
        target: this.getTargetForOperation(operation)
      });
    });
  }

  private getTargetForOperation(operation: string): number {
    switch (operation) {
      case 'cider_quick_entry':
        return this.targets.quickEntry;
      case 'search_query_execution':
        return this.targets.searchResponse;
      case 'form_validation_check':
        return this.targets.formValidation;
      case 'image_load_optimization':
        return this.targets.imageLoad;
      default:
        return 1000; // Default 1 second
    }
  }

  // Start tracking a performance metric
  startTrace(traceName: string): void {
    try {
      const trace = perf().newTrace(traceName);
      trace.start();

      this.traces.set(traceName, trace);

      // Also track locally for immediate feedback
      const metric: PerformanceMetric = {
        name: traceName,
        startTime: Date.now(),
        target: this.getTargetForOperation(traceName)
      };

      this.metrics.set(traceName, metric);

      console.log(`Started performance trace: ${traceName}`);
    } catch (error) {
      console.error(`Failed to start trace ${traceName}:`, error);
    }
  }

  // Stop tracking and evaluate performance
  stopTrace(traceName: string, additionalData?: Record<string, any>): boolean {
    try {
      const trace = this.traces.get(traceName);
      const metric = this.metrics.get(traceName);

      if (!trace || !metric) {
        console.warn(`No trace found for: ${traceName}`);
        return false;
      }

      // Stop Firebase trace
      if (additionalData) {
        Object.entries(additionalData).forEach(([key, value]) => {
          trace.putAttribute(key, String(value));
        });
      }

      trace.stop();
      this.traces.delete(traceName);

      // Calculate performance
      const endTime = Date.now();
      const duration = endTime - metric.startTime;
      const isWithinTarget = duration <= metric.target;

      // Update metric
      metric.endTime = endTime;
      metric.duration = duration;
      metric.isWithinTarget = isWithinTarget;

      // Log result
      const status = isWithinTarget ? 'PASS' : 'FAIL';
      console.log(`Performance trace ${traceName}: ${duration}ms (target: ${metric.target}ms) - ${status}`);

      // Alert if performance target missed
      if (!isWithinTarget) {
        this.handlePerformanceViolation(traceName, duration, metric.target);
      }

      // Send to Firebase Analytics
      this.logPerformanceMetric(traceName, duration, metric.target, isWithinTarget);

      return isWithinTarget;
    } catch (error) {
      console.error(`Failed to stop trace ${traceName}:`, error);
      return false;
    }
  }

  // Quick Entry Performance Tracking (Critical)
  startQuickEntry(): void {
    this.startTrace('cider_quick_entry');
  }

  stopQuickEntry(ciderData?: any): boolean {
    const additionalData = ciderData ? {
      disclosure_level: ciderData.disclosureLevel || 'casual',
      field_count: Object.keys(ciderData).length.toString()
    } : {};

    return this.stopTrace('cider_quick_entry', additionalData);
  }

  // Search Performance Tracking (Critical)
  startSearch(query: string): void {
    this.startTrace('search_query_execution');

    // Add search-specific attributes
    const trace = this.traces.get('search_query_execution');
    if (trace) {
      trace.putAttribute('query_length', query.length.toString());
      trace.putAttribute('query_type', query.includes(' ') ? 'multi_word' : 'single_word');
    }
  }

  stopSearch(resultCount: number): boolean {
    return this.stopTrace('search_query_execution', {
      result_count: resultCount.toString()
    });
  }

  // Form Validation Performance Tracking
  startValidation(fieldName: string): void {
    this.startTrace(`form_validation_${fieldName}`);
  }

  stopValidation(fieldName: string, isValid: boolean): boolean {
    return this.stopTrace(`form_validation_${fieldName}`, {
      validation_result: isValid ? 'valid' : 'invalid'
    });
  }

  // Image Load Performance Tracking
  startImageLoad(imageUri: string): void {
    this.startTrace('image_load_optimization');

    const trace = this.traces.get('image_load_optimization');
    if (trace) {
      trace.putAttribute('image_source', imageUri.startsWith('http') ? 'remote' : 'local');
    }
  }

  stopImageLoad(success: boolean, imageSize?: { width: number; height: number }): boolean {
    const additionalData: Record<string, any> = {
      load_success: success ? 'true' : 'false'
    };

    if (imageSize) {
      additionalData.image_width = imageSize.width.toString();
      additionalData.image_height = imageSize.height.toString();
    }

    return this.stopTrace('image_load_optimization', additionalData);
  }

  private handlePerformanceViolation(traceName: string, actualMs: number, targetMs: number): void {
    const violationPercentage = ((actualMs - targetMs) / targetMs) * 100;

    console.warn(`PERFORMANCE VIOLATION: ${traceName} took ${actualMs}ms (${violationPercentage.toFixed(1)}% over target)`);

    // For critical performance violations, show user notification
    if (traceName === 'cider_quick_entry' || traceName === 'search_query_execution') {
      this.notifyPerformanceIssue(traceName, actualMs, targetMs);
    }
  }

  private async logPerformanceMetric(
    traceName: string,
    duration: number,
    target: number,
    withinTarget: boolean
  ): Promise<void> {
    try {
      await analytics().logEvent('performance_metric', {
        trace_name: traceName,
        duration_ms: duration,
        target_ms: target,
        within_target: withinTarget,
        violation_percentage: withinTarget ? 0 : ((duration - target) / target) * 100
      });
    } catch (error) {
      console.error('Failed to log performance metric:', error);
    }
  }

  private notifyPerformanceIssue(traceName: string, actualMs: number, targetMs: number): void {
    // This would integrate with your notification system
    const message = `Performance slower than expected for ${traceName.replace('_', ' ')}`;
    console.log('Performance notification:', message);
  }

  // Get performance report
  getPerformanceReport(): Record<string, any> {
    const report: Record<string, any> = {};

    this.metrics.forEach((metric, name) => {
      if (metric.duration !== undefined) {
        report[name] = {
          duration: metric.duration,
          target: metric.target,
          withinTarget: metric.isWithinTarget,
          violationPercentage: metric.isWithinTarget ? 0 : ((metric.duration - metric.target) / metric.target) * 100
        };
      }
    });

    return report;
  }
}

export default FirebasePerformanceMonitor;
```

##### Basic Cider Type (Phase 1 Prototype Only)
```typescript
// Simplified CiderRecord for prototype - only essential fields
interface BasicCiderRecord {
  id: string;
  name: string;
  brand: string;
  abv: number;
  overallRating: number;
  createdAt: Date;
}
```

##### Basic SQLite Service (Phase 1)
```typescript
// Simple CRUD operations for prototype
class BasicSQLiteService {
  private db: any;

  async initializeDatabase(): Promise<void> {
    this.db = await SQLite.openDatabase('cider_dictionary.db');

    // Create basic ciders table
    await this.db.executeSql(`
      CREATE TABLE IF NOT EXISTS ciders (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        brand TEXT NOT NULL,
        abv REAL NOT NULL,
        overallRating INTEGER NOT NULL,
        createdAt TEXT NOT NULL
      )
    `);
  }

  async createCider(cider: Omit<BasicCiderRecord, 'id' | 'createdAt'>): Promise<BasicCiderRecord> {
    const id = Date.now().toString();
    const createdAt = new Date();

    const newCider: BasicCiderRecord = {
      id,
      ...cider,
      createdAt
    };

    await this.db.executeSql(
      'INSERT INTO ciders (id, name, brand, abv, overallRating, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
      [id, cider.name, cider.brand, cider.abv, cider.overallRating, createdAt.toISOString()]
    );

    return newCider;
  }

  async getAllCiders(): Promise<BasicCiderRecord[]> {
    const [results] = await this.db.executeSql('SELECT * FROM ciders ORDER BY createdAt DESC');

    const ciders: BasicCiderRecord[] = [];
    for (let i = 0; i < results.rows.length; i++) {
      const row = results.rows.item(i);
      ciders.push({
        id: row.id,
        name: row.name,
        brand: row.brand,
        abv: row.abv,
        overallRating: row.overallRating,
        createdAt: new Date(row.createdAt)
      });
    }

    return ciders;
  }
}

export default BasicSQLiteService;
```

##### Basic Collection Screen (Phase 1)
```typescript
const CollectionScreen: React.FC = () => {
  const [ciders, setCiders] = useState<BasicCiderRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCiders();
  }, []);

  const loadCiders = async () => {
    try {
      const sqliteService = new BasicSQLiteService();
      const cidersData = await sqliteService.getAllCiders();
      setCiders(cidersData);
    } catch (error) {
      console.error('Failed to load ciders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={ciders}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.ciderItem}>
            <Text style={styles.ciderName}>{item.name}</Text>
            <Text style={styles.ciderBrand}>{item.brand}</Text>
            <Text style={styles.ciderDetails}>
              {item.abv}% ABV • Rating: {item.overallRating}/10
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text>No ciders added yet</Text>
            <Text>Tap the + button to add your first cider</Text>
          </View>
        }
      />
    </View>
  );
};
```

##### Comprehensive Error Handling System
```typescript
// Error handling types for systematic recovery
interface ErrorContext {
  errorId: string;
  timestamp: number;
  errorType: ErrorType;
  severity: ErrorSeverity;
  component: string;
  action: string;
  userMessage: string;
  technicalDetails: any;
  stackTrace?: string;
  userId?: string;
  sessionId: string;
  retryCount: number;
}

type ErrorType =
  | 'network_error'
  | 'database_error'
  | 'auth_error'
  | 'validation_error'
  | 'permission_error'
  | 'sync_error'
  | 'performance_error'
  | 'unknown_error';

type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

interface ErrorRecoveryStrategy {
  strategyType: 'retry' | 'fallback' | 'graceful_degradation' | 'user_intervention';
  maxRetries: number;
  retryDelay: number; // Exponential backoff
  fallbackAction?: () => Promise<void>;
  userGuidance: string;
  requiresUserInput: boolean;
  recoveryTimeout: number;
}

class ComprehensiveErrorHandler {
  private static instance: ComprehensiveErrorHandler;
  private errorLog: Map<string, ErrorContext> = new Map();
  private recoveryStrategies: Map<ErrorType, ErrorRecoveryStrategy> = new Map();

  static getInstance(): ComprehensiveErrorHandler {
    if (!ComprehensiveErrorHandler.instance) {
      ComprehensiveErrorHandler.instance = new ComprehensiveErrorHandler();
    }
    return ComprehensiveErrorHandler.instance;
  }

  constructor() {
    this.setupRecoveryStrategies();
  }

  private setupRecoveryStrategies(): void {
    // Network error recovery
    this.recoveryStrategies.set('network_error', {
      strategyType: 'retry',
      maxRetries: 3,
      retryDelay: 2000, // 2s, then 4s, then 8s
      userGuidance: 'Check your internet connection and we\'ll try again',
      requiresUserInput: false,
      recoveryTimeout: 30000
    });

    // Database error recovery
    this.recoveryStrategies.set('database_error', {
      strategyType: 'fallback',
      maxRetries: 2,
      retryDelay: 1000,
      fallbackAction: this.resetLocalDatabase,
      userGuidance: 'We\'re fixing a data issue. Your information is safe.',
      requiresUserInput: false,
      recoveryTimeout: 10000
    });

    // Authentication error recovery
    this.recoveryStrategies.set('auth_error', {
      strategyType: 'user_intervention',
      maxRetries: 1,
      retryDelay: 0,
      userGuidance: 'Please sign in again to continue',
      requiresUserInput: true,
      recoveryTimeout: 300000 // 5 minutes
    });

    // Validation error recovery
    this.recoveryStrategies.set('validation_error', {
      strategyType: 'graceful_degradation',
      maxRetries: 0,
      retryDelay: 0,
      userGuidance: 'Please check your input and try again',
      requiresUserInput: true,
      recoveryTimeout: 0
    });

    // Sync error recovery
    this.recoveryStrategies.set('sync_error', {
      strategyType: 'retry',
      maxRetries: 5,
      retryDelay: 10000, // Start with 10s
      fallbackAction: this.queueForLaterSync,
      userGuidance: 'Your changes are saved locally and will sync when possible',
      requiresUserInput: false,
      recoveryTimeout: 60000
    });

    // Performance error recovery
    this.recoveryStrategies.set('performance_error', {
      strategyType: 'graceful_degradation',
      maxRetries: 1,
      retryDelay: 0,
      fallbackAction: this.enablePerformanceMode,
      userGuidance: 'Optimizing performance for your device',
      requiresUserInput: false,
      recoveryTimeout: 5000
    });
  }

  // Main error handling entry point
  async handleError(error: Error | any, context: Partial<ErrorContext>): Promise<boolean> {
    try {
      // Create comprehensive error context
      const errorContext: ErrorContext = {
        errorId: this.generateErrorId(),
        timestamp: Date.now(),
        errorType: this.classifyError(error),
        severity: this.determineSeverity(error, context),
        component: context.component || 'unknown',
        action: context.action || 'unknown',
        userMessage: this.generateUserMessage(error),
        technicalDetails: {
          message: error?.message,
          code: error?.code,
          name: error?.name,
          ...context.technicalDetails
        },
        stackTrace: error?.stack,
        userId: context.userId,
        sessionId: context.sessionId || this.getSessionId(),
        retryCount: 0
      };

      // Log error
      this.logError(errorContext);

      // Attempt recovery
      const recovered = await this.attemptRecovery(errorContext);

      // Report to monitoring if needed
      if (errorContext.severity === 'high' || errorContext.severity === 'critical') {
        await this.reportToCrashlytics(errorContext);
      }

      return recovered;
    } catch (handlingError) {
      // Meta-error: error handling itself failed
      console.error('Error handler failed:', handlingError);
      await this.fallbackErrorHandling(error, context);
      return false;
    }
  }

  private async attemptRecovery(errorContext: ErrorContext): Promise<boolean> {
    const strategy = this.recoveryStrategies.get(errorContext.errorType);

    if (!strategy) {
      // No specific strategy, use default graceful degradation
      await this.gracefulDegradation(errorContext);
      return false;
    }

    switch (strategy.strategyType) {
      case 'retry':
        return await this.retryWithBackoff(errorContext, strategy);

      case 'fallback':
        return await this.executeFallback(errorContext, strategy);

      case 'graceful_degradation':
        return await this.gracefulDegradation(errorContext, strategy);

      case 'user_intervention':
        return await this.requestUserIntervention(errorContext, strategy);

      default:
        return false;
    }
  }

  private async retryWithBackoff(
    errorContext: ErrorContext,
    strategy: ErrorRecoveryStrategy
  ): Promise<boolean> {
    let currentRetry = errorContext.retryCount;

    while (currentRetry < strategy.maxRetries) {
      currentRetry++;

      // Exponential backoff delay
      const delay = strategy.retryDelay * Math.pow(2, currentRetry - 1);
      await this.delay(delay);

      try {
        // Attempt to retry the original operation
        const retrySuccess = await this.retryOriginalOperation(errorContext);

        if (retrySuccess) {
          await this.notifyRecoverySuccess(errorContext, currentRetry);
          return true;
        }
      } catch (retryError) {
        errorContext.technicalDetails.retryErrors =
          errorContext.technicalDetails.retryErrors || [];
        errorContext.technicalDetails.retryErrors.push(retryError?.message);
      }
    }

    // All retries failed, execute fallback if available
    if (strategy.fallbackAction) {
      return await this.executeFallback(errorContext, strategy);
    }

    await this.notifyRecoveryFailure(errorContext);
    return false;
  }

  private async executeFallback(
    errorContext: ErrorContext,
    strategy: ErrorRecoveryStrategy
  ): Promise<boolean> {
    try {
      if (strategy.fallbackAction) {
        await strategy.fallbackAction();
        await this.showUserMessage({
          title: 'Issue Resolved',
          message: strategy.userGuidance,
          type: 'success',
          autoHide: true,
          duration: 3000
        });
        return true;
      }
      return false;
    } catch (fallbackError) {
      console.error('Fallback failed:', fallbackError);
      return await this.gracefulDegradation(errorContext);
    }
  }

  private async gracefulDegradation(
    errorContext: ErrorContext,
    strategy?: ErrorRecoveryStrategy
  ): Promise<boolean> {
    // Disable non-essential features to maintain core functionality
    await this.disableNonEssentialFeatures(errorContext.errorType);

    const message = strategy?.userGuidance ||
      'Some features are temporarily limited. Core functionality remains available.';

    await this.showUserMessage({
      title: 'Running in Safe Mode',
      message,
      type: 'warning',
      autoHide: false,
      actions: [
        {
          label: 'Retry',
          action: () => this.retryAfterDegradation(errorContext),
          style: 'primary'
        }
      ]
    });

    return true; // Degraded state is still considered "recovery"
  }

  private async requestUserIntervention(
    errorContext: ErrorContext,
    strategy: ErrorRecoveryStrategy
  ): Promise<boolean> {
    return new Promise((resolve) => {
      this.showUserMessage({
        title: 'Action Required',
        message: strategy.userGuidance,
        type: 'error',
        autoHide: false,
        actions: [
          {
            label: 'Try Again',
            action: async () => {
              const retry = await this.retryOriginalOperation(errorContext);
              resolve(retry);
            },
            style: 'primary'
          },
          {
            label: 'Skip',
            action: () => resolve(false),
            style: 'secondary'
          }
        ]
      });

      // Timeout for user intervention
      setTimeout(() => {
        resolve(false);
      }, strategy.recoveryTimeout);
    });
  }

  // Recovery action implementations
  private async resetLocalDatabase(): Promise<void> {
    // Implementation for database reset
    console.log('Resetting local database...');
  }

  private async queueForLaterSync(): Promise<void> {
    // Implementation for queueing sync operations
    console.log('Queueing operations for later sync...');
  }

  private async enablePerformanceMode(): Promise<void> {
    // Implementation for enabling performance mode
    console.log('Enabling performance mode...');
  }

  private async disableNonEssentialFeatures(errorType: ErrorType): Promise<void> {
    // Implementation for disabling features based on error type
    console.log(`Disabling non-essential features for ${errorType}...`);
  }

  // Utility methods
  private classifyError(error: any): ErrorType {
    if (error?.code?.includes('network') || error?.message?.includes('fetch')) {
      return 'network_error';
    }
    if (error?.code?.includes('auth') || error?.message?.includes('authentication')) {
      return 'auth_error';
    }
    if (error?.code?.includes('database') || error?.code?.includes('sqlite')) {
      return 'database_error';
    }
    if (error?.name === 'ValidationError') {
      return 'validation_error';
    }
    return 'unknown_error';
  }

  private determineSeverity(error: any, context: Partial<ErrorContext>): ErrorSeverity {
    if (context.severity) return context.severity;

    // Auto-determine based on error characteristics
    if (error?.name === 'ValidationError') return 'low';
    if (error?.code?.includes('network')) return 'medium';
    if (error?.code?.includes('auth')) return 'high';
    if (error?.code?.includes('database')) return 'critical';

    return 'medium';
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateUserMessage(error: any): string {
    // Generate user-friendly error messages
    const errorMessages: Record<string, string> = {
      network_error: 'Unable to connect. Please check your internet connection.',
      database_error: 'There was an issue accessing your data. We\'re working to fix it.',
      auth_error: 'Please sign in again to continue.',
      validation_error: 'Please check your input and try again.',
      sync_error: 'Your changes are saved locally and will sync when possible.',
      performance_error: 'The app is running slowly. We\'re optimizing performance.'
    };

    return errorMessages[this.classifyError(error)] || 'Something went wrong. Please try again.';
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private logError(errorContext: ErrorContext): void {
    this.errorLog.set(errorContext.errorId, errorContext);
    console.error(`[${errorContext.errorId}] ${errorContext.errorType}:`, errorContext);
  }

  private getSessionId(): string {
    // Implementation for getting/generating session ID
    return 'session_' + Date.now();
  }

  // Placeholder implementations
  private async retryOriginalOperation(errorContext: ErrorContext): Promise<boolean> {
    // This would contain logic to retry the original failed operation
    return false;
  }

  private async notifyRecoverySuccess(errorContext: ErrorContext, retryCount: number): Promise<void> {
    console.log(`Recovery successful after ${retryCount} attempts`);
  }

  private async notifyRecoveryFailure(errorContext: ErrorContext): Promise<void> {
    console.log(`Recovery failed for ${errorContext.errorId}`);
  }

  private async retryAfterDegradation(errorContext: ErrorContext): Promise<void> {
    // Implementation for retrying after graceful degradation
  }

  private async showUserMessage(message: any): Promise<void> {
    // This would integrate with your notification/toast system
    console.log('User message:', message);
  }

  private async reportToCrashlytics(errorContext: ErrorContext): Promise<void> {
    // Implementation for reporting to Firebase Crashlytics
    console.log('Reporting to crashlytics:', errorContext.errorId);
  }

  private async fallbackErrorHandling(error: any, context: any): Promise<void> {
    // Last resort error handling
    console.error('Fallback error handling for:', error);
  }
}

export default ComprehensiveErrorHandler;
```

##### Intelligent Duplicate Detection Engine
```typescript
interface DuplicateCheckResult {
  isDuplicate: boolean;
  hasSimilar?: boolean;
  confidence: number;
  matchType: 'exact' | 'fuzzy' | 'none';
  existingCider?: CiderMasterRecord;
  suggestion: string;
}

class DuplicateDetectionEngine {
  private static cache = new Map<string, DuplicateCheckResult>();
  private static debounceTimers = new Map<string, NodeJS.Timeout>();

  static async checkForDuplicatesAsync(name: string, brand: string): Promise<void> {
    const cacheKey = `${name}|${brand}`;

    // Clear existing timer for this key
    const existingTimer = this.debounceTimers.get(cacheKey);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Debounce rapid successive calls
    const timer = setTimeout(async () => {
      try {
        const result = await this.performDuplicateCheck(name, brand);
        // This would update the form state via callback
        this.notifyDuplicateResult(result);
      } catch (error) {
        console.error('Duplicate detection failed:', error);
      }
    }, 300);

    this.debounceTimers.set(cacheKey, timer);
  }

  static async performDuplicateCheck(name: string, brand: string): Promise<DuplicateCheckResult> {
    // Step 1: Normalize inputs
    const normalizedName = this.normalizeCiderName(name);
    const normalizedBrand = this.normalizeBrand(brand);
    const combinedKey = `${normalizedName}|${normalizedBrand}`;

    // Step 2: Check cache first
    if (this.cache.has(combinedKey)) {
      return this.cache.get(combinedKey)!;
    }

    // Step 3: Get user's cider collection
    const userCiders = await getUserCiders(); // From your cider store

    // Step 4: Exact match check
    const exactMatch = userCiders.find(cider =>
      this.normalizeCiderName(cider.name) === normalizedName &&
      this.normalizeBrand(cider.brand) === normalizedBrand
    );

    if (exactMatch) {
      const result: DuplicateCheckResult = {
        isDuplicate: true,
        confidence: 1.0,
        matchType: 'exact',
        existingCider: exactMatch,
        suggestion: 'This cider already exists in your collection'
      };
      this.cache.set(combinedKey, result);
      return result;
    }

    // Step 5: Fuzzy matching for similar entries
    const similarMatches: Array<{
      cider: CiderMasterRecord;
      score: number;
      nameScore: number;
      brandScore: number;
    }> = [];

    for (const cider of userCiders) {
      const nameScore = this.calculateSimilarity(normalizedName, this.normalizeCiderName(cider.name));
      const brandScore = this.calculateSimilarity(normalizedBrand, this.normalizeBrand(cider.brand));

      // Combined score with name weighted higher
      const combinedScore = (nameScore * 0.7) + (brandScore * 0.3);

      if (combinedScore > 0.8) {
        similarMatches.push({
          cider,
          score: combinedScore,
          nameScore,
          brandScore
        });
      }
    }

    // Step 6: Process results
    if (similarMatches.length > 0) {
      const bestMatch = similarMatches.sort((a, b) => b.score - a.score)[0];

      const result: DuplicateCheckResult = {
        isDuplicate: false,
        hasSimilar: true,
        confidence: bestMatch.score,
        matchType: 'fuzzy',
        existingCider: bestMatch.cider,
        suggestion: `Similar to "${bestMatch.cider.name}" by ${bestMatch.cider.brand}`
      };
      this.cache.set(combinedKey, result);
      return result;
    }

    // No matches found
    const result: DuplicateCheckResult = {
      isDuplicate: false,
      confidence: 0,
      matchType: 'none',
      suggestion: 'No similar ciders found'
    };
    this.cache.set(combinedKey, result);
    return result;
  }

  private static normalizeCiderName(name: string): string {
    if (!name) return '';

    return name
      .toLowerCase()
      .trim()
      // Remove common cider suffixes
      .replace(/\s+(cider|cidre)$/, '')
      // Remove articles
      .replace(/^(the|a|an)\s+/, '')
      // Normalize common words
      .replace(/\b(scrumpy|farmhouse|traditional)\b/g, match => match.toLowerCase())
      // Remove extra whitespace
      .replace(/\s+/g, ' ')
      .trim();
  }

  private static normalizeBrand(brand: string): string {
    if (!brand) return '';

    return brand
      .toLowerCase()
      .trim()
      // Remove common company suffixes
      .replace(/\s+(ltd|limited|inc|incorporated|co|company|brewery|cidery)\.?$/, '')
      // Remove articles
      .replace(/^(the|a|an)\s+/, '')
      // Normalize common variations
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Levenshtein distance-based similarity scoring
  private static calculateSimilarity(str1: string, str2: string): number {
    const len1 = str1.length;
    const len2 = str2.length;

    if (len1 === 0 || len2 === 0) return 0;

    // Create matrix
    const matrix: number[][] = [];
    for (let i = 0; i <= len1; i++) {
      matrix[i] = [];
      matrix[i][0] = i;
    }
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    // Fill matrix
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,      // deletion
          matrix[i][j - 1] + 1,      // insertion
          matrix[i - 1][j - 1] + cost // substitution
        );
      }
    }

    // Convert distance to similarity (0-1 scale)
    const maxLength = Math.max(len1, len2);
    const distance = matrix[len1][len2];
    return (maxLength - distance) / maxLength;
  }

  private static notifyDuplicateResult(result: DuplicateCheckResult): void {
    // This would integrate with your form state management
    // For now, just log the result
    console.log('Duplicate check result:', result);
  }

  // Cache management
  static clearCache(): void {
    this.cache.clear();
  }

  static clearTimers(): void {
    this.debounceTimers.forEach(timer => clearTimeout(timer));
    this.debounceTimers.clear();
  }
}

export default DuplicateDetectionEngine;
```

##### Collection Screen Placeholder
```typescript
const CollectionScreen: React.FC = () => {
  const [ciders, setCiders] = useState<CiderMasterRecord[]>([]);

  useEffect(() => {
    loadCiders(); // Basic SQLite query
  }, []);

  return (
    <SafeAreaContainer>
      <FlatList
        data={ciders}
        renderItem={({ item }) => <CiderCard cider={item} />}
        keyExtractor={(item) => item.id}
      />
    </SafeAreaContainer>
  );
};
```

### Success Criteria
- [ ] App launches without errors on iOS and Android
- [ ] Basic tab navigation works between screens
- [ ] Can create basic cider record with 5 essential fields (name, brand, abv, rating)
- [ ] Can view saved ciders in simple list format
- [ ] SQLite database stores and retrieves data correctly
- [ ] Firebase project configured (authentication only)
- [ ] TypeScript compilation successful with no errors

### Dependencies
- None (foundation phase)

### Estimated Timeline
- **Week 1**: Project setup, navigation, basic UI components
- **Week 2**: SQLite integration, basic forms, Firebase configuration
- **Week 3**: Testing, bug fixes, documentation

### Testing Strategy
- **Manual Testing**: App functionality on device/simulator
- **Unit Tests**: Basic service functions (SQLite CRUD)
- **Integration Tests**: Database connection and basic data flow

### Risk Mitigation
- **Expo SDK Issues**: Use stable release and follow documentation closely
- **Firebase Setup**: Use Firebase CLI for proper project initialization
- **TypeScript Errors**: Start with looser configuration and gradually stricten

### Integration Points
- Sets up foundation for Phase 2 feature development
- Establishes data flow patterns for progressive disclosure
- Creates reusable component library for future phases

---

## Phase 2: Basic Functionality - Core Features Only
*Target Duration: 3-4 weeks*

### Phase Overview
Implement core functionality with focus on the 30-second quick entry target and basic collection management. This phase makes the app genuinely useful for cider logging while maintaining performance targets.

### Core Deliverables

#### 2.1 30-Second Quick Entry System
- **Progressive Disclosure Form**: 3-level complexity (casual → enthusiast → expert)
- **Smart Defaults**: Intelligent field pre-population
- **Real-time Form Validation**: Immediate visual feedback, live error highlighting, field-level validation
- **Intelligent Duplicate Detection**: Advanced fuzzy matching with 80%+ confidence scoring
- **Performance Optimization**: Sub-30-second entry time tracking

#### 2.2 Collection Management
- **Cider Cards**: Enhanced display with key information
- **Basic Search**: Name and brand fuzzy matching
- **View Modes**: List and grid layouts with smooth transitions
- **CRUD Operations**: Full create, read, update, delete functionality

#### 2.3 Core Data Services
- **Zustand Store**: Global state management implementation
- **Enhanced SQLite**: Complete data model with all fields
- **Local Encryption**: AES-256-GCM encryption service for sensitive data
- **Image Handling**: Camera integration with local storage
- **Data Validation**: Comprehensive input validation and sanitization

#### 2.4 UK Venue Consolidation System
- **Chain Store Recognition**: Automatic consolidation of UK retail chains (Tesco variants, Sainsbury's, etc.)
- **Pub Chain Matching**: Recognition and normalization of pub groups (Wetherspoons, Greene King)
- **Fuzzy Venue Matching**: Intelligent duplicate venue detection with location validation
- **Venue Type Detection**: Automatic categorization (pub, restaurant, retail, festival, brewery)

### Technical Implementation

#### Progressive Disclosure Form Architecture
```typescript
// Enhanced validation interfaces for real-time feedback
interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

interface FieldValidationState {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
  showFeedback: boolean;
}

interface FormCompleteness {
  percentage: number;
  canSubmit: boolean;
  missingFields: string[];
}

interface QuickEntryFormState {
  disclosureLevel: 'casual' | 'enthusiast' | 'expert';
  formData: Partial<CiderMasterRecord>;
  validationState: Record<string, FieldValidationState>;
  fieldStates: Record<string, 'default' | 'valid' | 'error' | 'warning'>;
  formCompleteness: FormCompleteness;
  duplicateWarning: {
    type: 'duplicate' | 'similar';
    message: string;
    confidence?: number;
    existingCider?: CiderMasterRecord;
  } | null;
  isSubmitting: boolean;
  startTime: number;
}

// Progressive disclosure configuration
const DISCLOSURE_CONFIGS = {
  casual: {
    fields: ['name', 'brand', 'abv', 'overallRating'],
    targetTime: 30, // seconds
    optional: ['photo']
  },
  enthusiast: {
    fields: ['name', 'brand', 'abv', 'overallRating', 'tasteTags', 'containerType'],
    targetTime: 120,
    optional: ['photo', 'notes', 'traditionalStyle']
  },
  expert: {
    fields: ['name', 'brand', 'abv', 'overallRating', 'tasteTags', 'containerType',
             'appleCategories', 'sweetnessLevel', 'carbonation'],
    targetTime: 300,
    optional: ['all_other_characteristics']
  }
};

interface QuickEntryScreenState {
  currentLevel: 'casual' | 'enthusiast' | 'expert';
  formData: Partial<CiderMasterRecord>;
  validationErrors: Record<string, string>;
  startTime: number;
  isDirty: boolean;
}

const QuickEntryScreen: React.FC = () => {
  const [state, setState] = useState<QuickEntryScreenState>({
    currentLevel: 'casual',
    formData: {},
    validationErrors: {},
    startTime: Date.now(),
    isDirty: false
  });

  // Performance timer
  const elapsedTime = useMemo(() =>
    (Date.now() - state.startTime) / 1000, [state.startTime]);

  // Real-time validation with immediate visual feedback
  const validateField = useCallback((field: string, value: any) => {
    // Immediate validation (no debouncing for instant feedback)
    const validationResult = validateCiderFieldDetailed(field, value);

    setState(prev => ({
      ...prev,
      validationState: {
        ...prev.validationState,
        [field]: {
          isValid: validationResult.isValid,
          errors: validationResult.errors,
          warnings: validationResult.warnings,
          suggestions: validationResult.suggestions,
          showFeedback: true // Always show feedback for immediate user response
        }
      },
      // Update visual state for field highlighting
      fieldStates: {
        ...prev.fieldStates,
        [field]: validationResult.isValid ? 'valid' : 'error'
      }
    }));

    // Trigger duplicate detection for name/brand fields
    if (field === 'name' || field === 'brand') {
      checkForDuplicates(field === 'name' ? value : state.formData.name,
                        field === 'brand' ? value : state.formData.brand);
    }

    // Live form-level validation
    validateFormCompleteness();
  }, [state.formData]);

  // Live form completeness validation
  const validateFormCompleteness = useCallback(() => {
    const requiredFields = DISCLOSURE_CONFIGS[state.disclosureLevel].fields;
    const completedFields = requiredFields.filter(field =>
      state.formData[field] && state.validationState[field]?.isValid
    );

    const completionPercentage = (completedFields.length / requiredFields.length) * 100;
    const canSubmit = completedFields.length === requiredFields.length;

    setState(prev => ({
      ...prev,
      formCompleteness: {
        percentage: completionPercentage,
        canSubmit,
        missingFields: requiredFields.filter(field =>
          !state.formData[field] || !state.validationState[field]?.isValid
        )
      }
    }));
  }, [state.formData, state.validationState, state.disclosureLevel]);

  // Enhanced field validation with detailed feedback
  const validateCiderFieldDetailed = (field: string, value: any): ValidationResult => {
    switch (field) {
      case 'name':
        return validateCiderName(value);
      case 'brand':
        return validateBrandName(value);
      case 'abv':
        return validateABV(value);
      case 'overallRating':
        return validateRating(value);
      default:
        return { isValid: true, errors: [], warnings: [], suggestions: [] };
    }
  };

  const validateCiderName = (name: string): ValidationResult => {
    const result: ValidationResult = { isValid: false, errors: [], warnings: [], suggestions: [] };

    if (!name || name.trim().length === 0) {
      result.errors.push('Cider name is required');
      return result;
    }

    if (name.length < 2) {
      result.errors.push('Cider name must be at least 2 characters');
      return result;
    }

    if (name.length > 100) {
      result.errors.push('Cider name must be less than 100 characters');
      return result;
    }

    // Real-time warnings for best practices
    if (name !== name.trim()) {
      result.warnings.push('Remove extra spaces at the beginning or end');
    }

    if (name.toUpperCase() === name && name.length > 3) {
      result.suggestions.push('Consider using normal capitalization');
    }

    // Live autocomplete suggestions
    if (name.length >= 2) {
      const suggestions = getSimilarCiderNames(name);
      result.suggestions.push(...suggestions.slice(0, 3));
    }

    result.isValid = result.errors.length === 0;
    return result;
  };

  const validateABV = (abv: any): ValidationResult => {
    const result: ValidationResult = { isValid: false, errors: [], warnings: [], suggestions: [] };

    if (!abv && abv !== 0) {
      result.errors.push('ABV is required');
      return result;
    }

    const numericABV = parseFloat(abv);

    if (isNaN(numericABV)) {
      result.errors.push('ABV must be a number');
      return result;
    }

    if (numericABV < 0) {
      result.errors.push('ABV cannot be negative');
      return result;
    }

    if (numericABV > 20) {
      result.errors.push('ABV cannot exceed 20%');
      return result;
    }

    // Live contextual warnings
    if (numericABV < 3) {
      result.warnings.push('ABV is unusually low for cider (typically 3-12%)');
    } else if (numericABV > 12) {
      result.warnings.push('ABV is unusually high for cider (typically 3-12%)');
    }

    result.isValid = result.errors.length === 0;
    return result;
  };

  // Intelligent duplicate detection with debouncing
  const checkForDuplicates = useCallback(
    debounce(async (name: string, brand: string) => {
      if (!name || name.length < 2) return;

      try {
        const duplicateResult = await DuplicateDetectionEngine.performDuplicateCheck(name, brand);

        setState(prev => ({
          ...prev,
          duplicateWarning: duplicateResult.isDuplicate ? {
            type: 'duplicate',
            message: duplicateResult.suggestion,
            existingCider: duplicateResult.existingCider
          } : duplicateResult.hasSimilar ? {
            type: 'similar',
            message: duplicateResult.suggestion,
            confidence: duplicateResult.confidence,
            existingCider: duplicateResult.existingCider
          } : null
        }));
      } catch (error) {
        console.error('Duplicate detection failed:', error);
      }
    }, 500),
    []
  );

  // Progressive disclosure expansion
  const expandToLevel = useCallback((level: 'enthusiast' | 'expert') => {
    setState(prev => ({
      ...prev,
      currentLevel: level
    }));
    // Animate form expansion
  }, []);

  const handleSubmit = useCallback(async () => {
    const completionTime = (Date.now() - state.startTime) / 1000;

    // Record performance metric
    recordEntryTime(state.currentLevel, completionTime);

    // Save to database
    const ciderId = await saveCiderRecord(state.formData);

    // Navigate with success feedback
    navigation.navigate('CiderDetail', { ciderId });
  }, [state]);

  return (
    <KeyboardAvoidingView>
      <ProgressHeader
        level={state.currentLevel}
        elapsedTime={elapsedTime}
        targetTime={DISCLOSURE_CONFIGS[state.currentLevel].targetTime}
      />

      <ScrollView>
        {/* Core fields - always visible */}
        <FormSection title="Essential Details">
          <ValidatedInput
            label="Cider Name"
            value={state.formData.name}
            onChangeText={(text) => handleFieldChange('name', text)}
            onBlur={() => validateField('name', state.formData.name)}
            error={state.validationErrors.name}
            autoFocus
          />
          {/* Other core fields */}
        </FormSection>

        {/* Expandable sections based on current level */}
        {state.currentLevel !== 'casual' && (
          <FormSection title="Additional Details" collapsible>
            {/* Enthusiast-level fields */}
          </FormSection>
        )}

        {state.currentLevel === 'expert' && (
          <FormSection title="Expert Classification" collapsible>
            {/* Expert-level fields */}
          </FormSection>
        )}
      </ScrollView>

      <QuickEntryFooter
        canSubmit={isFormValid(state.formData, state.currentLevel)}
        onSubmit={handleSubmit}
        onExpandLevel={expandToLevel}
        currentLevel={state.currentLevel}
      />
    </KeyboardAvoidingView>
  );
};
```

#### UK Venue Consolidation Implementation
```typescript
// Venue consolidation service for UK market
class VenueConsolidationService {
  private static readonly CHAIN_CONSOLIDATION_RULES = {
    'tesco': ['tesco extra', 'tesco superstore', 'tesco express', 'tesco metro', 'tesco petrol'],
    'sainsburys': ['sainsbury\'s', 'sainsburys local', 'sainsbury\'s local', 'sainsbury\'s superstore'],
    'asda': ['asda superstore', 'asda supermarket', 'asda living'],
    'morrisons': ['morrisons supermarket', 'morrisons daily'],
    'waitrose': ['waitrose & partners', 'little waitrose', 'waitrose local'],
    'wetherspoons': ['wetherspoons', 'the moon under water', 'the cross keys', 'lloyds bar'],
    'greene king': ['hungry horse', 'flame grill', 'farmhouse inns', 'old english inns'],
    'mitchells & butlers': ['all bar one', 'browns', 'harvester', 'toby carvery', 'vintage inns']
  };

  static async consolidateVenueName(
    rawVenueName: string,
    location: { latitude: number; longitude: number }
  ): Promise<ConsolidatedVenue> {
    // Step 1: Normalize venue name
    const normalizedName = this.normalizeVenueName(rawVenueName);

    // Step 2: Check for existing similar venues
    const existingVenues = await findSimilarVenues(normalizedName, location);

    if (existingVenues.length > 0) {
      const bestMatch = this.findBestVenueMatch(normalizedName, location, existingVenues);

      if (bestMatch.confidence > 0.8) {
        return {
          id: bestMatch.venue.id,
          name: bestMatch.venue.name,
          type: bestMatch.venue.type,
          location: location,
          isExisting: true,
          consolidatedFrom: rawVenueName
        };
      }
    }

    // Step 3: Create new venue with proper classification
    const venueType = this.detectVenueType(normalizedName, location);

    return {
      id: generateUUID(),
      name: normalizedName,
      type: venueType,
      location: location,
      isExisting: false,
      originalName: rawVenueName
    };
  }

  private static normalizeVenueName(rawName: string): string {
    let normalized = rawName.toLowerCase().trim();

    // Apply UK chain consolidation rules
    for (const [chainName, variants] of Object.entries(this.CHAIN_CONSOLIDATION_RULES)) {
      for (const variant of variants) {
        if (normalized.includes(variant)) {
          normalized = chainName;
          break;
        }
      }
    }

    // Remove common prefixes/suffixes
    normalized = normalized.replace(/^(the\s+|ye\s+olde\s+)/, '');
    normalized = normalized.replace(/\s+(pub|bar|inn|restaurant|cafe)$/, '');

    return this.capitalizeWords(normalized);
  }

  private static detectVenueType(venueName: string, location: any): VenueType {
    const name = venueName.toLowerCase();

    // Chain store detection
    if (this.CHAIN_CONSOLIDATION_RULES.tesco.some(variant => name.includes(variant))) return 'retail';
    if (this.CHAIN_CONSOLIDATION_RULES.sainsburys.some(variant => name.includes(variant))) return 'retail';

    // Pub chain detection
    if (this.CHAIN_CONSOLIDATION_RULES.wetherspoons.some(variant => name.includes(variant))) return 'pub';

    // Generic detection
    if (name.includes('festival') || name.includes('fest')) return 'festival';
    if (name.includes('brewery') || name.includes('cidery')) return 'brewery';
    if (name.includes('restaurant') || name.includes('cafe')) return 'restaurant';

    return 'pub'; // Default for UK market
  }
}

interface ConsolidatedVenue {
  id: string;
  name: string;
  type: VenueType;
  location: { latitude: number; longitude: number };
  isExisting: boolean;
  consolidatedFrom?: string;
  originalName?: string;
}
```

#### Comprehensive Data Model (Phase 2 - Full Implementation)
```typescript
// Complete CiderMasterRecord interface with all 50+ fields from specifications
interface CiderMasterRecord {
  // Core identification
  id: string;
  userId: string;

  // Basic required fields (casual level - 30-second target)
  name: string;
  brand: string;
  abv: number;
  overallRating: number;

  // Basic optional fields (casual level)
  photo?: string;
  notes?: string; // Encrypted in Phase 2

  // Enthusiast level fields
  traditionalStyle?: TraditionalStyle;
  basicCharacteristics?: {
    sweetness: 'bone_dry' | 'dry' | 'off_dry' | 'medium' | 'sweet';
    carbonation: 'still' | 'light_sparkling' | 'sparkling' | 'highly_carbonated';
    clarity: 'crystal_clear' | 'clear' | 'hazy' | 'cloudy' | 'opaque';
  };
  tasteTags?: string[];
  containerType?: 'bottle' | 'can' | 'bag_in_box' | 'draught' | 'other';

  // Expert level fields
  appleClassification?: {
    categories: ('bittersweet' | 'bittersharp' | 'sweet' | 'sharp' | 'culinary' | 'unknown')[];
    varieties?: string[];
    longAshtonClassification?: string;
  };

  productionMethods?: {
    fermentation?: 'wild' | 'cultured_yeast' | 'mixed' | 'unknown';
    specialProcesses?: ('keeved' | 'pet_nat' | 'barrel_aged' | 'ice_cider' | 'other')[];
  };

  // All additional expert fields...
  detailedRatings?: {
    appearance: number;
    aroma: number;
    taste: number;
    mouthfeel: number;
  };

  // System fields
  createdAt: Date;
  updatedAt: Date;
  syncStatus: 'synced' | 'pending' | 'conflict' | 'error';
  version: number;
}

type TraditionalStyle = 'traditional_english' | 'modern_craft' | 'heritage' | 'international' | 'fruit_cider' | 'perry' | 'ice_cider' | 'other';
```

#### Enhanced Collection Management
```typescript
interface CollectionScreenState {
  ciders: CiderMasterRecord[];
  searchQuery: string;
  viewMode: 'list' | 'grid';
  sortOrder: 'name' | 'rating' | 'dateAdded';
  isLoading: boolean;
}

const CollectionScreen: React.FC = () => {
  const [state, setState] = useState<CollectionScreenState>({
    ciders: [],
    searchQuery: '',
    viewMode: 'list',
    sortOrder: 'dateAdded',
    isLoading: false
  });

  // Debounced search
  const debouncedSearch = useCallback(
    debounce((query: string) => {
      setState(prev => ({ ...prev, searchQuery: query }));
    }, 300),
    []
  );

  // Filtered and sorted ciders
  const filteredCiders = useMemo(() => {
    let filtered = state.ciders;

    if (state.searchQuery) {
      filtered = fuzzySearchCiders(state.ciders, state.searchQuery);
    }

    return sortCiders(filtered, state.sortOrder);
  }, [state.ciders, state.searchQuery, state.sortOrder]);

  // Performance: memoized render item
  const renderCiderItem = useCallback(({ item }: { item: CiderMasterRecord }) => (
    <CiderCard
      cider={item}
      viewMode={state.viewMode}
      onPress={() => navigation.navigate('CiderDetail', { ciderId: item.id })}
    />
  ), [state.viewMode]);

  return (
    <SafeAreaContainer>
      <CollectionHeader
        totalCount={state.ciders.length}
        filteredCount={filteredCiders.length}
        viewMode={state.viewMode}
        onViewModeChange={(mode) => setState(prev => ({ ...prev, viewMode: mode }))}
        onSortChange={(order) => setState(prev => ({ ...prev, sortOrder: order }))}
      />

      <SearchBar
        placeholder="Search your collection..."
        onChangeText={debouncedSearch}
        showFilters={false}
      />

      <FlatList
        data={filteredCiders}
        renderItem={renderCiderItem}
        keyExtractor={(item) => item.id}
        numColumns={state.viewMode === 'grid' ? 2 : 1}
        key={state.viewMode} // Force re-render on layout change
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />

      <FloatingActionButton
        icon="plus"
        onPress={() => navigation.navigate('QuickEntry')}
      />
    </SafeAreaContainer>
  );
};
```

#### Zustand Store Implementation
```typescript
interface CiderStore {
  ciders: CiderMasterRecord[];
  isLoading: boolean;
  error: string | null;

  // Actions
  addCider: (cider: Omit<CiderMasterRecord, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateCider: (id: string, updates: Partial<CiderMasterRecord>) => Promise<void>;
  deleteCider: (id: string) => Promise<void>;
  loadCiders: () => Promise<void>;
  searchCiders: (query: string) => CiderMasterRecord[];
}

export const useCiderStore = create<CiderStore>((set, get) => ({
  ciders: [],
  isLoading: false,
  error: null,

  addCider: async (ciderData) => {
    set({ isLoading: true });
    try {
      const newCider: CiderMasterRecord = {
        id: generateUUID(),
        ...ciderData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        timesTried: 0,
        syncStatus: 'pending'
      };

      // Save to SQLite
      await insertCider(newCider);

      // Update store
      set(state => ({
        ciders: [...state.ciders, newCider],
        isLoading: false
      }));

      return newCider.id;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  loadCiders: async () => {
    set({ isLoading: true });
    try {
      const ciders = await getAllCiders();
      set({ ciders, isLoading: false });
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },

  searchCiders: (query: string) => {
    const { ciders } = get();
    return fuzzySearchCiders(ciders, query);
  }
}));
```

### Success Criteria
- [ ] Can complete basic cider entry in under 30 seconds
- [ ] Progressive disclosure form works across all 3 levels
- [ ] Search returns results in under 200ms for 50+ ciders
- [ ] Collection view supports both list and grid layouts
- [ ] Image capture and local storage works reliably
- [ ] All CRUD operations function correctly
- [ ] App maintains 60fps during animations
- [ ] No memory leaks during extended usage

### Dependencies
- **Phase 1**: Application shell and basic navigation
- **Core Infrastructure**: Database and Firebase setup

### Estimated Timeline
- **Week 1**: Progressive disclosure form implementation
- **Week 2**: Collection management and search functionality
- **Week 3**: Zustand store integration and image handling
- **Week 4**: Performance optimization and testing

### Testing Strategy
- **Performance Testing**: 30-second entry time measurement
- **Search Performance**: Query response time validation
- **Component Testing**: Form validation and state management
- **Integration Testing**: Database operations and image storage

### Risk Mitigation
- **Performance Issues**: Profile with Flipper, optimize re-renders
- **Form Complexity**: Start simple, add progressive enhancement
- **Search Performance**: Implement debouncing and indexing
- **Image Memory**: Use proper compression and cleanup

### Integration Points
- **Phase 3**: Establishes core functionality for experience logging
- **Analytics**: Provides data foundation for collection insights
- **Sync**: Core data structures ready for Firebase synchronization

---

## Phase 3: MVP - Minimum Viable Product
*Target Duration: 4-5 weeks*

### Phase Overview
Transform the basic functionality into a complete MVP with offline storage, Firebase sync, experience logging, and core analytics. This phase creates a production-ready application that delivers full value to users.

### Core Deliverables

#### 3.1 Offline-First Architecture
- **SQLite Primary Storage**: Complete offline functionality implementation
- **Firebase Sync Service**: Background synchronization with conflict resolution
- **Offline Queue Management**: Image uploads and data sync queuing
- **Network State Handling**: Graceful online/offline transitions

#### 3.2 Experience Logging System
- **Quick Experience Entry**: 30-second venue/price logging
- **Location Services**: GPS capture with venue detection
- **Price per ml Calculation**: Automatic value computation
- **Experience History**: Complete drinking history per cider

#### 3.3 Basic Analytics Dashboard
- **Collection Overview**: Total ciders, ratings distribution, personal completion percentage
- **Personal Completeness Algorithm**: Multi-dimensional scoring based on user's own collection diversity
- **Basic Value Analytics**: Best/worst value ciders, simple spending totals
- **Simple Venue Lists**: Most visited locations (list view only)
- **Basic Charts**: Simple bar/pie charts for key metrics (no complex interactivity)

#### 3.4 Production Architecture
- **Error Handling**: Comprehensive error boundaries and recovery
- **Performance Monitoring**: Firebase Performance integration with 30s/200ms target tracking
- **Firebase Cost Monitoring**: Automated usage tracking with 80% free tier alerts
- **Security**: Firebase security rules and data validation

### Technical Implementation

#### Offline-First Sync Architecture
```typescript
class SyncManager {
  private syncQueue: SyncOperation[] = [];
  private isOnline: boolean = true;
  private syncInProgress: boolean = false;

  constructor() {
    // Monitor network state
    NetInfo.addEventListener(state => {
      this.isOnline = state.isConnected || false;
      if (this.isOnline && !this.syncInProgress) {
        this.processSyncQueue();
      }
    });

    // Process queue on app foreground
    AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active' && this.isOnline) {
        this.processSyncQueue();
      }
    });
  }

  async queueOperation(operation: SyncOperation): Promise<void> {
    // Add to SQLite queue table
    await insertSyncOperation(operation);
    this.syncQueue.push(operation);

    // Process immediately if online
    if (this.isOnline) {
      this.processSyncQueue();
    }
  }

  private async processSyncQueue(): Promise<void> {
    if (this.syncInProgress || !this.isOnline) return;

    this.syncInProgress = true;

    try {
      while (this.syncQueue.length > 0) {
        const operation = this.syncQueue.shift()!;
        await this.executeOperation(operation);
        await removeSyncOperation(operation.id);
      }
    } catch (error) {
      console.error('Sync queue processing failed:', error);
      // Operations remain in queue for retry
    } finally {
      this.syncInProgress = false;
    }
  }

  private async executeOperation(operation: SyncOperation): Promise<void> {
    switch (operation.type) {
      case 'CREATE_CIDER':
        await firestore().collection('ciders').doc(operation.data.id).set(operation.data);
        await updateLocalSyncStatus(operation.data.id, 'synced');
        break;

      case 'UPDATE_CIDER':
        await firestore().collection('ciders').doc(operation.data.id).update(operation.data);
        await updateLocalSyncStatus(operation.data.id, 'synced');
        break;

      case 'CREATE_EXPERIENCE':
        await firestore().collection('experiences').doc(operation.data.id).set(operation.data);
        await updateLocalSyncStatus(operation.data.id, 'synced');
        break;

      case 'UPLOAD_IMAGE':
        const downloadURL = await this.uploadImage(operation.data.localPath, operation.data.remotePath);
        await this.updateCiderImage(operation.data.ciderId, downloadURL);
        break;
    }
  }

  private async uploadImage(localPath: string, remotePath: string): Promise<string> {
    const reference = storage().ref(remotePath);
    await reference.putFile(localPath);
    return reference.getDownloadURL();
  }
}
```

#### Experience Logging Implementation
```typescript
interface ExperienceFormState {
  ciderId: string;
  venue: {
    name: string;
    type: VenueType;
    location: {
      latitude: number;
      longitude: number;
    } | null;
    address?: string;
  };
  price: number;
  containerSize: number; // ml
  notes: string;
  date: Date;
}

const ExperienceLogScreen: React.FC = () => {
  const route = useRoute<RouteProp<RootStackParamList, 'ExperienceLog'>>();
  const { ciderId } = route.params;

  const [formState, setFormState] = useState<ExperienceFormState>({
    ciderId,
    venue: {
      name: '',
      type: 'pub',
      location: null
    },
    price: 0,
    containerSize: 500, // Default pint
    notes: '',
    date: new Date()
  });

  const [cider] = useCider(ciderId);
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [startTime] = useState(Date.now());

  // Auto-capture GPS location
  useEffect(() => {
    getCurrentPosition()
      .then(position => {
        setCurrentLocation(position);
        setFormState(prev => ({
          ...prev,
          venue: {
            ...prev.venue,
            location: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            }
          }
        }));
      })
      .catch(error => console.log('Location access denied:', error));
  }, []);

  // Smart venue suggestions based on location
  const venueSuggestions = useNearbyVenues(currentLocation);

  // Auto-calculate price per ml
  const pricePerMl = useMemo(() => {
    if (formState.price > 0 && formState.containerSize > 0) {
      return formState.price / formState.containerSize;
    }
    return 0;
  }, [formState.price, formState.containerSize]);

  const handleSubmit = useCallback(async () => {
    const completionTime = (Date.now() - startTime) / 1000;

    const experience: ExperienceLog = {
      id: generateUUID(),
      userId: getCurrentUserId(),
      ciderId: formState.ciderId,
      date: firestore.Timestamp.fromDate(formState.date),
      venue: formState.venue,
      price: formState.price,
      containerSize: formState.containerSize,
      pricePerMl,
      notes: formState.notes,
      createdAt: firestore.Timestamp.now(),
      syncStatus: 'pending'
    };

    try {
      // Save locally first (optimistic update)
      await insertExperience(experience);

      // Update cider stats
      await updateCiderStats(ciderId, {
        timesTried: increment(1),
        lastTriedDate: experience.date,
        averagePrice: calculateNewAverage(cider.averagePrice, cider.timesTried, formState.price)
      });

      // Queue for sync
      await syncManager.queueOperation({
        type: 'CREATE_EXPERIENCE',
        data: experience
      });

      // Record performance
      recordExperienceEntryTime(completionTime);

      // Show success and navigate
      showSuccessToast('Experience logged successfully!');
      navigation.goBack();

    } catch (error) {
      console.error('Failed to log experience:', error);
      showErrorToast('Failed to log experience. Please try again.');
    }
  }, [formState, ciderId, cider, pricePerMl, startTime]);

  return (
    <KeyboardAvoidingView style={styles.container}>
      <ScrollView contentContainerStyle={styles.formContainer}>
        {/* Cider Reference */}
        <CiderReferenceCard cider={cider} compact />

        {/* Venue Information */}
        <FormSection title="Where did you try it?">
          <VenueInput
            value={formState.venue.name}
            onChangeText={(name) => handleVenueNameChange(name)}
            suggestions={venueSuggestions}
            location={currentLocation}
          />

          <VenueTypeSelector
            value={formState.venue.type}
            onSelect={(type) => handleVenueTypeChange(type)}
          />
        </FormSection>

        {/* Price & Size */}
        <FormSection title="Price & Container">
          <PriceInput
            label="Price (£)"
            value={formState.price}
            onChangeText={(price) => handlePriceChange(parseFloat(price))}
          />

          <ContainerSizeSelector
            value={formState.containerSize}
            onSelect={(size) => handleContainerSizeChange(size)}
            presets={[330, 440, 500, 568]} // ml
          />

          <PricePerMlDisplay value={pricePerMl} />
        </FormSection>

        {/* Notes */}
        <FormSection title="Notes (optional)">
          <TextAreaInput
            value={formState.notes}
            onChangeText={(notes) => handleNotesChange(notes)}
            placeholder="How was it? Any thoughts?"
            maxLength={500}
          />
        </FormSection>
      </ScrollView>

      <ActionButton
        title="Log Experience"
        onPress={handleSubmit}
        disabled={!isFormValid(formState)}
        style={styles.submitButton}
      />
    </KeyboardAvoidingView>
  );
};
```

#### Analytics Dashboard Implementation
```typescript
interface AnalyticsData {
  collectionStats: {
    totalCiders: number;
    averageRating: number;
    completionPercentage: number;
    totalExperiences: number;
  };
  valueAnalytics: {
    bestValue: CiderMasterRecord;
    worstValue: CiderMasterRecord;
    averagePricePerMl: number;
    monthlySpending: number;
  };
  venueAnalytics: {
    mostVisited: VenueRecord;
    cheapest: VenueRecord;
    mostExpensive: VenueRecord;
    totalVenues: number;
  };
  trends: {
    monthlyTrend: { month: string; count: number; spending: number }[];
    ratingDistribution: { rating: number; count: number }[];
  };
}

const AnalyticsScreen: React.FC = () => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'1M' | '3M' | '6M' | '1Y' | 'ALL'>('3M');

  useEffect(() => {
    loadAnalyticsData();
  }, [selectedTimeRange]);

  const loadAnalyticsData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await calculateAnalytics(selectedTimeRange);
      setAnalyticsData(data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedTimeRange]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!analyticsData) {
    return <ErrorState onRetry={loadAnalyticsData} />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Time Range Selector */}
      <TimeRangeSelector
        selected={selectedTimeRange}
        onSelect={setSelectedTimeRange}
        options={[
          { value: '1M', label: '1 Month' },
          { value: '3M', label: '3 Months' },
          { value: '6M', label: '6 Months' },
          { value: '1Y', label: '1 Year' },
          { value: 'ALL', label: 'All Time' }
        ]}
      />

      {/* Collection Overview */}
      <AnalyticsSection title="Collection Overview">
        <StatsGrid>
          <StatCard
            title="Total Ciders"
            value={analyticsData.collectionStats.totalCiders}
            icon="beer"
            color={COLORS.primary}
          />
          <StatCard
            title="Experiences"
            value={analyticsData.collectionStats.totalExperiences}
            icon="map-marker"
            color={COLORS.secondary}
          />
          <StatCard
            title="Average Rating"
            value={analyticsData.collectionStats.averageRating.toFixed(1)}
            icon="star"
            color={COLORS.warning}
          />
          <StatCard
            title="Completion"
            value={`${analyticsData.collectionStats.completionPercentage.toFixed(0)}%`}
            icon="check-circle"
            color={COLORS.success}
          />
        </StatsGrid>
      </AnalyticsSection>

      {/* Value Analytics */}
      <AnalyticsSection title="Value Analysis">
        <ValueAnalyticsChart
          bestValue={analyticsData.valueAnalytics.bestValue}
          worstValue={analyticsData.valueAnalytics.worstValue}
          averagePricePerMl={analyticsData.valueAnalytics.averagePricePerMl}
        />

        <MonthlySpendingDisplay
          amount={analyticsData.valueAnalytics.monthlySpending}
          timeRange={selectedTimeRange}
        />
      </AnalyticsSection>

      {/* Venue Analytics */}
      <AnalyticsSection title="Venue Insights">
        <VenueRankingList venues={[
          analyticsData.venueAnalytics.mostVisited,
          analyticsData.venueAnalytics.cheapest,
          analyticsData.venueAnalytics.mostExpensive
        ]} />
      </AnalyticsSection>

      {/* Trends */}
      <AnalyticsSection title="Trends">
        <TrendChart
          data={analyticsData.trends.monthlyTrend}
          timeRange={selectedTimeRange}
        />

        <RatingDistributionChart
          data={analyticsData.trends.ratingDistribution}
        />
      </AnalyticsSection>
    </ScrollView>
  );
};

// Personal Collection Completeness Algorithm (CRITICAL - Personal Only)
async function calculatePersonalCompleteness(userCiders: CiderMasterRecord[]): Promise<number> {
  // IMPORTANT: This algorithm calculates completeness based ONLY on the user's own collection
  // NOT against a global database - this ensures personal diversity scoring

  const weights = {
    producer: 0.3,      // Brand diversity within user's collection
    style: 0.25,        // Style diversity within user's collection
    region: 0.2,        // Regional diversity within user's collection
    specific: 0.15,     // Specific characteristic diversity
    quality: 0.1        // Quality distribution balance
  };

  // Calculate diversity scores based on user's collection only
  const [
    producerScore,
    styleScore,
    regionScore,
    specificScore,
    qualityScore
  ] = await Promise.all([
    calculateProducerDiversity(userCiders),      // How many different producers
    calculateStyleDiversity(userCiders),        // How many different styles
    calculateRegionalDiversity(userCiders),     // How many different regions
    calculateCharacteristicDiversity(userCiders), // ABV, sweetness, etc. spread
    calculateQualityDistribution(userCiders)    // Rating distribution balance
  ]);

  // Weighted combination with diminishing returns
  const completenessScore =
    (producerScore * weights.producer) +
    (styleScore * weights.style) +
    (regionScore * weights.region) +
    (specificScore * weights.specific) +
    (qualityScore * weights.quality);

  return Math.min(completenessScore, 100.0);
}

function calculateStyleDiversity(ciders: CiderMasterRecord[]): number {
  // Calculate Shannon entropy for style diversity within user's collection
  const styleCounts = ciders.reduce((acc, cider) => {
    const style = cider.traditionalStyle || 'unknown';
    acc[style] = (acc[style] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const totalCiders = ciders.length;
  let entropy = 0;

  for (const count of Object.values(styleCounts)) {
    const probability = count / totalCiders;
    entropy -= probability * Math.log2(probability);
  }

  // Normalize to 0-100 scale based on possible styles in user's collection
  const maxPossibleEntropy = Math.log2(Object.keys(styleCounts).length);
  return maxPossibleEntropy > 0 ? (entropy / maxPossibleEntropy) * 100 : 0;
}

// Performance-optimized analytics calculation
async function calculateAnalytics(timeRange: string): Promise<AnalyticsData> {
  const cutoffDate = getTimeRangeCutoff(timeRange);

  // Parallel data fetching for performance
  const [ciders, experiences, venues] = await Promise.all([
    getCidersFromDate(cutoffDate),
    getExperiencesFromDate(cutoffDate),
    getVenuesFromDate(cutoffDate)
  ]);

  // Calculate personal completeness based on user's collection only
  const completionPercentage = await calculatePersonalCompleteness(ciders);

  // Memoized calculations to prevent re-computation
  return {
    collectionStats: {
      ...calculateCollectionStats(ciders, experiences),
      completionPercentage // Personal diversity score, not global comparison
    },
    valueAnalytics: calculateValueAnalytics(ciders, experiences),
    venueAnalytics: calculateVenueAnalytics(venues, experiences),
    trends: calculateTrends(experiences, timeRange)
  };
}
```

### Success Criteria
- [ ] Complete offline functionality - all features work without internet
- [ ] Firebase sync works reliably with conflict resolution
- [ ] Experience logging completes in under 30 seconds
- [ ] Analytics dashboard loads in under 500ms
- [ ] GPS location capture works reliably
- [ ] Image upload queue processes automatically
- [ ] No data loss during network transitions
- [ ] Firebase free tier usage stays under limits
- [ ] App performance remains smooth with 100+ ciders

### Dependencies
- **Phase 2**: Core functionality and data structures
- **Location Services**: GPS permissions and Google Places API
- **Firebase Services**: Authentication and cloud storage setup

### Estimated Timeline
- **Week 1**: Offline-first architecture and sync implementation
- **Week 2**: Experience logging system and location services
- **Week 3**: Analytics dashboard and data visualization
- **Week 4**: Firebase integration and cloud sync
- **Week 5**: Testing, optimization, and bug fixes

### Testing Strategy
- **Offline Testing**: Network disconnection scenarios
- **Sync Testing**: Conflict resolution and data consistency
- **Performance Testing**: Analytics calculation speed
- **Integration Testing**: Firebase operations and data flow
- **Location Testing**: GPS accuracy and venue detection

### Risk Mitigation
- **Sync Conflicts**: Implement last-write-wins with user notification
- **Performance Degradation**: Profile analytics calculations, add pagination
- **Firebase Costs**: Monitor usage with automated alerts
- **Location Privacy**: Clear permissions and opt-out options

### Integration Points
- **Phase 4**: Foundation for advanced features and optimizations
- **Production**: Ready for app store submission
- **Monitoring**: Performance and error tracking in place

---

## Phase 4: Full Features - Production Ready
*Target Duration: 3-4 weeks*

### Phase Overview
Complete the application with advanced features, performance optimizations, and production-ready deployment. This phase transforms the MVP into a polished, feature-complete application ready for app store submission.

### Core Deliverables

#### 4.1 Advanced Features
- **Advanced Search**: Multi-field filtering with instant results
- **Collection Export**: JSON/CSV data export functionality
- **Batch Operations**: Multi-select and bulk actions
- **Progressive Web Features**: Deep linking and sharing capabilities

#### 4.2 Advanced Analytics & Visualizations
- **Interactive Charts**: Complex data visualizations with zoom/pan/filter
- **Interactive Maps**: Heat map visualizations of venue visits with clustering
- **Advanced Value Analytics**: Detailed spending patterns, price trends over time
- **Venue Analytics Dashboard**: Geographic analysis, route optimization
- **Trend Analysis**: Time-series charts showing collection growth and preferences
- **Comparative Analytics**: Side-by-side cider comparisons and recommendations

#### 4.3 Performance Optimizations
- **List Virtualization**: FlashList for large collections (1000+ items)
- **Image Optimization**: Compression, caching, and lazy loading
- **Memory Management**: Proper cleanup and garbage collection
- **Bundle Optimization**: Code splitting and tree shaking

#### 4.4 Production Architecture
- **Error Tracking**: Crashlytics integration and reporting
- **Performance Monitoring**: Real-time performance metrics
- **Security Hardening**: Security rules and input sanitization
- **Deployment Pipeline**: Automated builds and testing

#### 4.5 User Experience Polish
- **Animations**: Smooth transitions and micro-interactions
- **Accessibility**: Screen reader support and keyboard navigation
- **Haptic Feedback**: Tactile responses for user actions
- **Dark Mode**: Complete theme support

### Technical Implementation

#### Advanced Search Implementation
```typescript
interface SearchState {
  query: string;
  filters: {
    ratingRange: [number, number];
    abvRange: [number, number];
    priceRange: [number, number];
    tasteTags: string[];
    traditionalStyles: string[];
    venues: string[];
    dateRange: [Date, Date];
  };
  sortBy: 'name' | 'rating' | 'abv' | 'price' | 'dateAdded' | 'lastTried';
  sortDirection: 'asc' | 'desc';
}

const AdvancedSearchScreen: React.FC = () => {
  const [searchState, setSearchState] = useState<SearchState>({
    query: '',
    filters: {
      ratingRange: [1, 10],
      abvRange: [3, 12],
      priceRange: [0, 20],
      tasteTags: [],
      traditionalStyles: [],
      venues: [],
      dateRange: [new Date(2020, 0, 1), new Date()]
    },
    sortBy: 'name',
    sortDirection: 'asc'
  });

  const [searchResults, setSearchResults] = useState<CiderMasterRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Debounced search with performance optimization
  const debouncedSearch = useCallback(
    debounce(async (state: SearchState) => {
      setIsLoading(true);
      try {
        const results = await performAdvancedSearch(state);
        setSearchResults(results);
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setIsLoading(false);
      }
    }, 300),
    []
  );

  useEffect(() => {
    debouncedSearch(searchState);
  }, [searchState, debouncedSearch]);

  return (
    <View style={styles.container}>
      {/* Search Header */}
      <SearchHeader
        query={searchState.query}
        onQueryChange={(query) =>
          setSearchState(prev => ({ ...prev, query }))
        }
        onFilterPress={() => showFilterModal()}
        filterCount={getActiveFilterCount(searchState.filters)}
      />

      {/* Quick Filter Tags */}
      <QuickFilterBar
        activeFilters={searchState.filters}
        onFilterToggle={(filter, value) =>
          updateFilter(filter, value)
        }
      />

      {/* Search Results */}
      <FlashList
        data={searchResults}
        renderItem={({ item }) => (
          <CiderSearchResultCard
            cider={item}
            searchQuery={searchState.query}
          />
        )}
        estimatedItemSize={120}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={() => (
          <EmptySearchState
            query={searchState.query}
            hasFilters={hasActiveFilters(searchState.filters)}
          />
        )}
        ListHeaderComponent={() => (
          <SearchResultsHeader
            count={searchResults.length}
            sortBy={searchState.sortBy}
            sortDirection={searchState.sortDirection}
            onSortChange={(sortBy, direction) =>
              setSearchState(prev => ({
                ...prev,
                sortBy,
                sortDirection: direction
              }))
            }
          />
        )}
      />

      {/* Filter Modal */}
      <AdvancedFilterModal
        visible={filterModalVisible}
        filters={searchState.filters}
        onFiltersChange={(filters) =>
          setSearchState(prev => ({ ...prev, filters }))
        }
        onClose={() => setFilterModalVisible(false)}
      />
    </View>
  );
};

// Performance-optimized search implementation
async function performAdvancedSearch(state: SearchState): Promise<CiderMasterRecord[]> {
  // Start with all ciders
  let results = await getAllCiders();

  // Text search with fuzzy matching
  if (state.query) {
    results = fuzzySearchCiders(results, state.query);
  }

  // Apply filters
  results = results.filter(cider => {
    // Rating filter
    if (cider.overallRating < state.filters.ratingRange[0] ||
        cider.overallRating > state.filters.ratingRange[1]) {
      return false;
    }

    // ABV filter
    if (cider.abv < state.filters.abvRange[0] ||
        cider.abv > state.filters.abvRange[1]) {
      return false;
    }

    // Taste tags filter
    if (state.filters.tasteTags.length > 0) {
      const hasMatchingTags = state.filters.tasteTags.some(tag =>
        cider.tasteTags?.includes(tag)
      );
      if (!hasMatchingTags) return false;
    }

    // Date range filter
    const ciderDate = new Date(cider.createdAt);
    if (ciderDate < state.filters.dateRange[0] ||
        ciderDate > state.filters.dateRange[1]) {
      return false;
    }

    return true;
  });

  // Apply sorting
  results = sortCiders(results, state.sortBy, state.sortDirection);

  return results;
}
```

#### Performance Optimizations
```typescript
// Virtualized list implementation for large collections
const OptimizedCollectionList: React.FC<{
  ciders: CiderMasterRecord[];
  viewMode: 'list' | 'grid';
}> = ({ ciders, viewMode }) => {
  // Memoized render item to prevent unnecessary re-renders
  const renderItem = useCallback(({ item, index }: {
    item: CiderMasterRecord;
    index: number;
  }) => (
    <MemoizedCiderCard
      key={item.id}
      cider={item}
      viewMode={viewMode}
      index={index}
    />
  ), [viewMode]);

  // Dynamic item sizing for performance
  const getItemSize = useCallback((item: CiderMasterRecord, index: number) => {
    switch (viewMode) {
      case 'grid': return 220;
      case 'list': return 120;
      default: return 120;
    }
  }, [viewMode]);

  return (
    <FlashList
      data={ciders}
      renderItem={renderItem}
      getItemType={() => viewMode} // Optimize for view mode changes
      estimatedItemSize={viewMode === 'grid' ? 220 : 120}
      numColumns={viewMode === 'grid' ? 2 : 1}
      keyExtractor={(item) => item.id}
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      windowSize={10}
      initialNumToRender={8}
      updateCellsBatchingPeriod={50}
    />
  );
};

// Image optimization with caching
class ImageOptimizer {
  private static instance: ImageOptimizer;
  private cache = new Map<string, string>();

  static getInstance(): ImageOptimizer {
    if (!ImageOptimizer.instance) {
      ImageOptimizer.instance = new ImageOptimizer();
    }
    return ImageOptimizer.instance;
  }

  async optimizeImage(uri: string, options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
  } = {}): Promise<string> {
    const cacheKey = `${uri}_${JSON.stringify(options)}`;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    try {
      const optimizedUri = await ImageResizer.createResizedImage(
        uri,
        options.maxWidth || 1920,
        options.maxHeight || 1080,
        'JPEG',
        options.quality || 80,
        0, // rotation
        undefined, // output path
        false, // keep metadata
        { mode: 'contain' }
      );

      this.cache.set(cacheKey, optimizedUri.uri);
      return optimizedUri.uri;
    } catch (error) {
      console.error('Image optimization failed:', error);
      return uri; // Return original on failure
    }
  }

  clearCache(): void {
    this.cache.clear();
  }
}

// Memory management utilities
class MemoryManager {
  private static timers: NodeJS.Timeout[] = [];
  private static subscriptions: (() => void)[] = [];

  static addTimer(timer: NodeJS.Timeout): void {
    this.timers.push(timer);
  }

  static addSubscription(unsubscribe: () => void): void {
    this.subscriptions.push(unsubscribe);
  }

  static cleanup(): void {
    // Clear all timers
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers = [];

    // Unsubscribe from all subscriptions
    this.subscriptions.forEach(unsubscribe => unsubscribe());
    this.subscriptions = [];

    // Clear image cache
    ImageOptimizer.getInstance().clearCache();
  }
}

// Use in components with proper cleanup
const useMemoryManagement = () => {
  useEffect(() => {
    return () => {
      MemoryManager.cleanup();
    };
  }, []);
};
```

#### Data Export Implementation
```typescript
interface ExportOptions {
  format: 'json' | 'csv';
  includeImages: boolean;
  includeExperiences: boolean;
  dateRange?: [Date, Date];
}

class DataExporter {
  static async exportCollection(options: ExportOptions): Promise<string> {
    const data = await this.gatherExportData(options);

    switch (options.format) {
      case 'json':
        return this.exportToJSON(data);
      case 'csv':
        return this.exportToCSV(data);
      default:
        throw new Error('Unsupported export format');
    }
  }

  private static async gatherExportData(options: ExportOptions) {
    const ciders = await getAllCiders();
    let experiences: ExperienceLog[] = [];

    if (options.includeExperiences) {
      experiences = await getAllExperiences();

      if (options.dateRange) {
        experiences = experiences.filter(exp => {
          const expDate = exp.date.toDate();
          return expDate >= options.dateRange![0] && expDate <= options.dateRange![1];
        });
      }
    }

    return { ciders, experiences };
  }

  private static async exportToJSON(data: { ciders: CiderMasterRecord[], experiences: ExperienceLog[] }): Promise<string> {
    const exportData = {
      exportDate: new Date().toISOString(),
      version: '1.0',
      ciders: data.ciders.map(cider => ({
        ...cider,
        createdAt: cider.createdAt.toString(),
        updatedAt: cider.updatedAt.toString(),
      })),
      experiences: data.experiences.map(exp => ({
        ...exp,
        date: exp.date.toDate().toISOString(),
        createdAt: exp.createdAt.toDate().toISOString()
      }))
    };

    return JSON.stringify(exportData, null, 2);
  }

  private static async exportToCSV(data: { ciders: CiderMasterRecord[], experiences: ExperienceLog[] }): Promise<string> {
    const cidersCSV = this.convertCidersToCSV(data.ciders);
    const experiencesCSV = this.convertExperiencesToCSV(data.experiences);

    return `# Cider Dictionary Export - ${new Date().toISOString()}\n\n# Ciders\n${cidersCSV}\n\n# Experiences\n${experiencesCSV}`;
  }

  private static convertCidersToCSV(ciders: CiderMasterRecord[]): string {
    const headers = [
      'Name', 'Brand', 'ABV', 'Overall Rating', 'Container Types',
      'Taste Tags', 'Traditional Style', 'Notes', 'Times Tried',
      'Average Price', 'Created At', 'Updated At'
    ];

    const rows = ciders.map(cider => [
      cider.name,
      cider.brand,
      cider.abv.toString(),
      cider.overallRating.toString(),
      cider.containerTypes?.join(';') || '',
      cider.tasteTags?.join(';') || '',
      cider.traditionalStyle || '',
      cider.notes || '',
      cider.timesTried.toString(),
      cider.averagePrice?.toString() || '',
      cider.createdAt.toString(),
      cider.updatedAt.toString()
    ]);

    return [headers, ...rows]
      .map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
      .join('\n');
  }
}

// Export screen component
const DataExportScreen: React.FC = () => {
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'json',
    includeImages: false,
    includeExperiences: true
  });
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const exportData = await DataExporter.exportCollection(exportOptions);
      const filename = `cider_dictionary_${new Date().toISOString().split('T')[0]}.${exportOptions.format}`;

      // Save to device
      await RNFS.writeFile(
        `${RNFS.DocumentDirectoryPath}/${filename}`,
        exportData,
        'utf8'
      );

      // Share file
      await Share.open({
        title: 'Export Cider Dictionary Data',
        url: `file://${RNFS.DocumentDirectoryPath}/${filename}`,
        type: exportOptions.format === 'json' ? 'application/json' : 'text/csv'
      });

      showSuccessToast('Data exported successfully!');
    } catch (error) {
      console.error('Export failed:', error);
      showErrorToast('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <ExportHeader />

        <OptionSection title="Format">
          <RadioGroup
            options={[
              { value: 'json', label: 'JSON (Complete Data)' },
              { value: 'csv', label: 'CSV (Spreadsheet)' }
            ]}
            value={exportOptions.format}
            onValueChange={(format) =>
              setExportOptions(prev => ({ ...prev, format: format as 'json' | 'csv' }))
            }
          />
        </OptionSection>

        <OptionSection title="Include">
          <CheckboxGroup
            options={[
              {
                key: 'includeExperiences',
                label: 'Experience Log',
                value: exportOptions.includeExperiences
              },
              {
                key: 'includeImages',
                label: 'Images (JSON only)',
                value: exportOptions.includeImages,
                disabled: exportOptions.format === 'csv'
              }
            ]}
            onChange={(key, value) =>
              setExportOptions(prev => ({ ...prev, [key]: value }))
            }
          />
        </OptionSection>

        <DateRangeSelector
          value={exportOptions.dateRange}
          onChange={(dateRange) =>
            setExportOptions(prev => ({ ...prev, dateRange }))
          }
        />
      </ScrollView>

      <ActionButton
        title={isExporting ? 'Exporting...' : 'Export Data'}
        onPress={handleExport}
        disabled={isExporting}
        loading={isExporting}
        style={styles.exportButton}
      />
    </SafeAreaView>
  );
};
```

### Success Criteria
- [ ] Advanced search returns results in under 100ms for 1000+ ciders
- [ ] FlashList performs smoothly with 1000+ items
- [ ] Image loading and caching works efficiently
- [ ] Data export completes successfully for all formats
- [ ] App memory usage remains under 100MB during normal operation
- [ ] Crashlytics reports zero crashes in production
- [ ] Performance metrics show consistent 60fps
- [ ] App store review process passes all requirements
- [ ] Accessibility audit passes all WCAG guidelines

### Dependencies
- **Phase 3**: Complete MVP functionality
- **Performance Tools**: Profiling and monitoring setup
- **App Store Preparation**: Developer accounts and certificates

### Estimated Timeline
- **Week 1**: Advanced search and filtering implementation
- **Week 2**: Performance optimizations and virtualization
- **Week 3**: Data export, error tracking, and monitoring
- **Week 4**: Polish, accessibility, and app store preparation

### Testing Strategy
- **Performance Testing**: Large dataset simulation and memory profiling
- **Stress Testing**: 1000+ cider collections and heavy usage scenarios
- **Accessibility Testing**: Screen reader and keyboard navigation testing
- **Production Testing**: Beta testing with real users
- **App Store Testing**: Submission and review process validation

### Risk Mitigation
- **Performance Regression**: Continuous profiling and benchmarking
- **Memory Leaks**: Regular memory audits and cleanup verification
- **App Store Rejection**: Thorough guidelines review and compliance testing
- **User Data Loss**: Comprehensive backup and export capabilities

### Integration Points
- **Production Deployment**: Ready for app store submission
- **User Feedback**: Analytics and crash reporting for post-launch improvements
- **Future Development**: Extensible architecture for additional features

---

## Cross-Phase Considerations

### Performance Targets Throughout All Phases

#### Response Time Requirements
- **App Startup**: < 3 seconds (cold start)
- **Quick Entry**: < 30 seconds (end-to-end)
- **Search Results**: < 200ms (local database)
- **Analytics Load**: < 500ms (cached calculations)
- **Sync Operations**: < 5 seconds (background)

#### Memory Management
- **Baseline Memory**: < 50MB at rest
- **Peak Usage**: < 150MB during heavy operations
- **Image Cache**: < 100MB with automatic cleanup
- **Database Size**: < 100MB for 100 ciders + 500 experiences

#### Network Optimization
- **Firebase Reads**: < 1,000 per day per user
- **Firebase Writes**: < 100 per day per user
- **Image Storage**: < 50MB per user
- **Background Sync**: Batched operations with exponential backoff

### Code Quality and Maintainability

#### Development Standards
- **TypeScript**: Strict mode with comprehensive type coverage
- **ESLint**: Airbnb configuration with custom rules
- **Prettier**: Consistent code formatting
- **Jest**: > 80% test coverage for business logic
- **Detox**: E2E tests for critical user journeys

#### Architecture Patterns
- **Repository Pattern**: Data access abstraction
- **Observer Pattern**: State management with Zustand
- **Factory Pattern**: Component creation and configuration
- **Singleton Pattern**: Service management (sync, analytics)

#### Documentation Standards
- **Code Comments**: JSDoc for all public interfaces
- **README Files**: Setup and development instructions
- **Architecture Decision Records**: Design decisions and rationale
- **API Documentation**: Service interfaces and usage examples

### Security and Privacy

#### Data Protection
- **Local Storage**: SQLite with optional encryption
- **Network Communication**: HTTPS for all external requests
- **Firebase Security**: Comprehensive security rules
- **User Privacy**: No personally identifiable information in analytics

#### Authentication and Authorization
- **Firebase Auth**: Email/password and Google OAuth
- **Session Management**: Secure token handling and refresh
- **Data Isolation**: User can only access own data
- **Logout Security**: Complete data cleanup on sign out

### Monitoring and Analytics

#### Performance Monitoring
- **Firebase Performance**: Real-time app performance tracking
- **Custom Metrics**: 30-second entry time success rate
- **Error Tracking**: Firebase Crashlytics integration
- **Usage Analytics**: Feature adoption and user behavior

#### Cost Monitoring
- **Firebase Usage**: Automated alerts at 80% of free tier limits
- **Google Maps API**: Usage tracking and optimization
- **Storage Optimization**: Automatic image compression and cleanup
- **Query Efficiency**: Firestore read/write minimization

### Deployment and DevOps

#### Development Workflow
- **Git Flow**: Feature branches with pull request reviews
- **Continuous Integration**: GitHub Actions for testing and builds
- **Environment Management**: Development, staging, and production
- **Version Control**: Semantic versioning with automated releases

#### App Store Deployment
- **iOS**: TestFlight beta testing before App Store submission
- **Android**: Internal testing track before Play Store release
- **Release Notes**: User-facing changelog for each version
- **Rollback Strategy**: Previous version available for emergency rollback

---

## Success Metrics and KPIs

### User Experience Metrics
- **30-Second Entry Success Rate**: > 90% of quick entries completed within target
- **Search Performance**: > 95% of searches return results within 200ms
- **App Responsiveness**: Maintain 60fps during all interactions
- **Crash Rate**: < 0.1% crashes per user session

### Technical Performance Metrics
- **Bundle Size**: < 50MB total app size
- **Memory Usage**: < 100MB during normal operation
- **Battery Impact**: Minimal background processing
- **Storage Efficiency**: < 1MB per 10 ciders stored locally

### Business Metrics
- **User Retention**: > 70% retention after 7 days
- **Feature Adoption**: > 50% of users try advanced features
- **Data Quality**: < 5% duplicate cider entries
- **Sync Success Rate**: > 99% successful sync operations

### Cost Efficiency Metrics
- **Firebase Costs**: £0 monthly (within free tier)
- **Google Maps Costs**: £0 monthly (within free tier)
- **Development Velocity**: Complete each phase within estimated timeline
- **Maintenance Burden**: < 2 hours/week maintenance required

---

## Post-Launch Considerations

### Version 1.1 Roadmap (Future Enhancements)
- **Social Features**: Cider recommendations and sharing
- **Advanced Analytics**: Machine learning insights
- **Web Companion**: Browser-based collection viewing
- **Apple Watch**: Quick logging from wrist

### Scalability Planning
- **Paid Tier Migration**: Firebase paid plan transition strategy
- **Multi-User Features**: Friends and following capabilities
- **API Development**: Third-party integration possibilities
- **Database Optimization**: Sharding strategies for growth

### Community and Support
- **User Feedback**: In-app feedback collection system
- **Documentation**: User guide and FAQ development
- **Community Building**: Discord/Reddit community management
- **Feature Requests**: Public roadmap and voting system

This comprehensive 4-phase implementation plan provides a structured, incremental approach to building the Cider Dictionary application while maintaining focus on performance, user experience, and technical excellence throughout the development process.