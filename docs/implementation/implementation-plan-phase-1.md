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