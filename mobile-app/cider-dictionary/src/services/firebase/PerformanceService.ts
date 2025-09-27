// Phase 3: Firebase Performance Monitoring and Cost Tracking
// Comprehensive monitoring with automated alerts for free tier limits

// Mock Firebase Performance for development
// import perf, { FirebasePerformanceTypes } from '@react-native-firebase/perf';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock Firebase Performance Types for development
interface FirebasePerformanceTypes {
  Trace: any;
  HttpMetric: any;
}

// Mock performance monitoring for development environment
const mockPerf = () => ({
  newTrace: (traceName: string) => ({
    start: () => Promise.resolve(),
    stop: () => Promise.resolve(),
    putAttribute: () => {},
    putMetric: () => {},
    incrementMetric: () => {},
  }),
  newHttpMetric: (url: string, method: string) => ({
    start: () => Promise.resolve(),
    stop: () => Promise.resolve(),
    putAttribute: () => {},
  })
});

const perf = mockPerf;

interface PerformanceMetrics {
  experienceEntryTime: number[];
  analyticsLoadTime: number[];
  syncOperationCount: number;
  dailyFirestoreReads: number;
  dailyFirestoreWrites: number;
  monthlyStorageBytes: number;
}

interface CostAlert {
  service: string;
  usage: number;
  limit: number;
  percentage: number;
  timestamp: Date;
}

class PerformanceService {
  private static instance: PerformanceService;
  private metrics: PerformanceMetrics = {
    experienceEntryTime: [],
    analyticsLoadTime: [],
    syncOperationCount: 0,
    dailyFirestoreReads: 0,
    dailyFirestoreWrites: 0,
    monthlyStorageBytes: 0
  };

  // Firebase free tier limits
  private readonly FREE_TIER_LIMITS = {
    FIRESTORE_READS_DAILY: 50000,
    FIRESTORE_WRITES_DAILY: 20000,
    STORAGE_GB_MONTHLY: 5,
    CLOUD_FUNCTIONS_INVOCATIONS: 125000
  };

  private readonly STORAGE_KEY = 'firebase_metrics';
  private readonly ALERT_THRESHOLD = 0.8; // 80% of limit

  static getInstance(): PerformanceService {
    if (!PerformanceService.instance) {
      PerformanceService.instance = new PerformanceService();
    }
    return PerformanceService.instance;
  }

  constructor() {
    this.loadMetrics();
    this.startDailyReset();
  }

  // Experience Entry Performance Tracking
  async recordExperienceEntryTime(timeInSeconds: number): Promise<void> {
    try {
      this.metrics.experienceEntryTime.push(timeInSeconds);

      // Keep only last 100 entries for rolling average
      if (this.metrics.experienceEntryTime.length > 100) {
        this.metrics.experienceEntryTime.shift();
      }

      // Record custom trace
      const trace = perf().newTrace('experience_entry');
      trace.putMetric('duration_seconds', timeInSeconds);
      trace.putAttribute('target_seconds', '30');

      if (timeInSeconds > 30) {
        trace.putAttribute('performance_issue', 'slow_entry');
        console.warn(`Experience entry took ${timeInSeconds}s (target: <30s)`);
      }

      await trace.start();
      await trace.stop();

      await this.saveMetrics();
    } catch (error) {
      console.error('Failed to record experience entry time:', error);
    }
  }

  // Analytics Load Performance Tracking
  async recordAnalyticsLoadTime(timeInMs: number): Promise<void> {
    try {
      this.metrics.analyticsLoadTime.push(timeInMs);

      // Keep only last 50 entries
      if (this.metrics.analyticsLoadTime.length > 50) {
        this.metrics.analyticsLoadTime.shift();
      }

      // Record custom trace
      const trace = perf().newTrace('analytics_load');
      trace.putMetric('duration_ms', timeInMs);
      trace.putAttribute('target_ms', '500');

      if (timeInMs > 500) {
        trace.putAttribute('performance_issue', 'slow_analytics');
        console.warn(`Analytics load took ${timeInMs}ms (target: <500ms)`);
      }

      await trace.start();
      await trace.stop();

      await this.saveMetrics();
    } catch (error) {
      console.error('Failed to record analytics load time:', error);
    }
  }

  // Firestore Usage Tracking
  async recordFirestoreRead(count: number = 1): Promise<void> {
    try {
      this.metrics.dailyFirestoreReads += count;

      // Check for alert threshold
      const usage = this.metrics.dailyFirestoreReads / this.FREE_TIER_LIMITS.FIRESTORE_READS_DAILY;
      if (usage > this.ALERT_THRESHOLD) {
        await this.triggerCostAlert('Firestore Reads', this.metrics.dailyFirestoreReads, this.FREE_TIER_LIMITS.FIRESTORE_READS_DAILY);
      }

      await this.saveMetrics();
    } catch (error) {
      console.error('Failed to record Firestore read:', error);
    }
  }

  async recordFirestoreWrite(count: number = 1): Promise<void> {
    try {
      this.metrics.dailyFirestoreWrites += count;

      // Check for alert threshold
      const usage = this.metrics.dailyFirestoreWrites / this.FREE_TIER_LIMITS.FIRESTORE_WRITES_DAILY;
      if (usage > this.ALERT_THRESHOLD) {
        await this.triggerCostAlert('Firestore Writes', this.metrics.dailyFirestoreWrites, this.FREE_TIER_LIMITS.FIRESTORE_WRITES_DAILY);
      }

      await this.saveMetrics();
    } catch (error) {
      console.error('Failed to record Firestore write:', error);
    }
  }

  // Storage Usage Tracking
  async recordStorageUsage(bytesUploaded: number): Promise<void> {
    try {
      this.metrics.monthlyStorageBytes += bytesUploaded;

      // Convert to GB for comparison
      const storageGB = this.metrics.monthlyStorageBytes / (1024 * 1024 * 1024);
      const usage = storageGB / this.FREE_TIER_LIMITS.STORAGE_GB_MONTHLY;

      if (usage > this.ALERT_THRESHOLD) {
        await this.triggerCostAlert('Cloud Storage', storageGB, this.FREE_TIER_LIMITS.STORAGE_GB_MONTHLY);
      }

      await this.saveMetrics();
    } catch (error) {
      console.error('Failed to record storage usage:', error);
    }
  }

  // Sync Operation Tracking
  recordSyncOperation(): void {
    this.metrics.syncOperationCount++;
  }

  // Performance Report Generation
  async generatePerformanceReport(): Promise<{
    experienceEntry: {
      averageTime: number;
      targetMet: boolean;
      recentTrend: 'improving' | 'stable' | 'degrading';
    };
    analyticsLoad: {
      averageTime: number;
      targetMet: boolean;
      recentTrend: 'improving' | 'stable' | 'degrading';
    };
    sync: {
      totalOperations: number;
      dailyAverage: number;
    };
    costUsage: {
      firestoreReads: number;
      firestoreWrites: number;
      storageGB: number;
      alerts: CostAlert[];
    };
  }> {
    const experienceEntryStats = this.calculateStats(this.metrics.experienceEntryTime);
    const analyticsLoadStats = this.calculateStats(this.metrics.analyticsLoadTime);

    return {
      experienceEntry: {
        averageTime: experienceEntryStats.average,
        targetMet: experienceEntryStats.average <= 30,
        recentTrend: this.calculateTrend(this.metrics.experienceEntryTime)
      },
      analyticsLoad: {
        averageTime: analyticsLoadStats.average,
        targetMet: analyticsLoadStats.average <= 500,
        recentTrend: this.calculateTrend(this.metrics.analyticsLoadTime)
      },
      sync: {
        totalOperations: this.metrics.syncOperationCount,
        dailyAverage: this.metrics.syncOperationCount / 30 // Approximate monthly to daily
      },
      costUsage: {
        firestoreReads: this.metrics.dailyFirestoreReads,
        firestoreWrites: this.metrics.dailyFirestoreWrites,
        storageGB: this.metrics.monthlyStorageBytes / (1024 * 1024 * 1024),
        alerts: await this.getRecentAlerts()
      }
    };
  }

  // Custom HTTP request monitoring
  async monitorHTTPRequest(url: string, method: string): Promise<FirebasePerformanceTypes.HttpMetric> {
    const httpMetric = perf().newHttpMetric(url, method);
    await httpMetric.start();
    return httpMetric;
  }

  // Screen performance monitoring
  async startScreenTrace(screenName: string): Promise<FirebasePerformanceTypes.Trace> {
    const trace = perf().newTrace(`screen_${screenName.toLowerCase()}`);
    await trace.start();
    return trace;
  }

  // Private helper methods
  private calculateStats(data: number[]): { average: number; median: number; min: number; max: number } {
    if (data.length === 0) {
      return { average: 0, median: 0, min: 0, max: 0 };
    }

    const sorted = [...data].sort((a, b) => a - b);
    const average = data.reduce((sum, val) => sum + val, 0) / data.length;
    const median = sorted[Math.floor(sorted.length / 2)];

    return {
      average: Math.round(average * 100) / 100,
      median: Math.round(median * 100) / 100,
      min: sorted[0],
      max: sorted[sorted.length - 1]
    };
  }

  private calculateTrend(data: number[]): 'improving' | 'stable' | 'degrading' {
    if (data.length < 10) return 'stable';

    const recent = data.slice(-5);
    const previous = data.slice(-10, -5);

    const recentAvg = recent.reduce((sum, val) => sum + val, 0) / recent.length;
    const previousAvg = previous.reduce((sum, val) => sum + val, 0) / previous.length;

    const changePercentage = ((recentAvg - previousAvg) / previousAvg) * 100;

    if (changePercentage < -5) return 'improving'; // Performance improved (lower is better)
    if (changePercentage > 10) return 'degrading'; // Performance degraded
    return 'stable';
  }

  private async triggerCostAlert(service: string, usage: number, limit: number): Promise<void> {
    const percentage = (usage / limit) * 100;
    const alert: CostAlert = {
      service,
      usage,
      limit,
      percentage,
      timestamp: new Date()
    };

    try {
      // Store alert
      const alerts = await this.getRecentAlerts();
      alerts.push(alert);

      // Keep only last 10 alerts
      const trimmedAlerts = alerts.slice(-10);
      await AsyncStorage.setItem('cost_alerts', JSON.stringify(trimmedAlerts));

      // Log warning
      console.warn(`Firebase Cost Alert: ${service} usage at ${percentage.toFixed(1)}% (${usage}/${limit})`);

      // In production, you might want to send this to analytics or show user notification
    } catch (error) {
      console.error('Failed to trigger cost alert:', error);
    }
  }

  private async getRecentAlerts(): Promise<CostAlert[]> {
    try {
      const alertsJson = await AsyncStorage.getItem('cost_alerts');
      return alertsJson ? JSON.parse(alertsJson) : [];
    } catch (error) {
      console.error('Failed to get recent alerts:', error);
      return [];
    }
  }

  private async loadMetrics(): Promise<void> {
    try {
      const metricsJson = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (metricsJson) {
        const savedMetrics = JSON.parse(metricsJson);
        this.metrics = { ...this.metrics, ...savedMetrics };
      }
    } catch (error) {
      console.error('Failed to load metrics:', error);
    }
  }

  private async saveMetrics(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.metrics));
    } catch (error) {
      console.error('Failed to save metrics:', error);
    }
  }

  private startDailyReset(): void {
    // Reset daily counters at midnight
    const msUntilMidnight = new Date().setHours(24, 0, 0, 0) - Date.now();

    setTimeout(() => {
      this.metrics.dailyFirestoreReads = 0;
      this.metrics.dailyFirestoreWrites = 0;
      this.saveMetrics();

      // Set up recurring daily reset
      setInterval(() => {
        this.metrics.dailyFirestoreReads = 0;
        this.metrics.dailyFirestoreWrites = 0;
        this.saveMetrics();
      }, 24 * 60 * 60 * 1000); // 24 hours
    }, msUntilMidnight);

    // Reset monthly storage counter on first of each month
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const msUntilNextMonth = nextMonth.getTime() - now.getTime();

    setTimeout(() => {
      this.metrics.monthlyStorageBytes = 0;
      this.saveMetrics();

      // Set up recurring monthly reset
      setInterval(() => {
        this.metrics.monthlyStorageBytes = 0;
        this.saveMetrics();
      }, 30 * 24 * 60 * 60 * 1000); // ~30 days
    }, msUntilNextMonth);
  }

  // Public getter for metrics
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  // Health check for performance
  isPerformanceHealthy(): {
    experienceEntry: boolean;
    analyticsLoad: boolean;
    costUsage: boolean;
  } {
    const experienceAvg = this.calculateStats(this.metrics.experienceEntryTime).average;
    const analyticsAvg = this.calculateStats(this.metrics.analyticsLoadTime).average;

    return {
      experienceEntry: experienceAvg <= 30 || this.metrics.experienceEntryTime.length === 0,
      analyticsLoad: analyticsAvg <= 500 || this.metrics.analyticsLoadTime.length === 0,
      costUsage: (
        this.metrics.dailyFirestoreReads < this.FREE_TIER_LIMITS.FIRESTORE_READS_DAILY * 0.9 &&
        this.metrics.dailyFirestoreWrites < this.FREE_TIER_LIMITS.FIRESTORE_WRITES_DAILY * 0.9
      )
    };
  }
}

export const performanceService = PerformanceService.getInstance();
export default PerformanceService;