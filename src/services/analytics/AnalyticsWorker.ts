/**
 * AnalyticsWorker.ts
 *
 * Priority-based background task queue for heavy analytics computations.
 * Processes tasks sequentially to prevent UI freezing while maintaining responsiveness.
 *
 * Features:
 * - Priority-based task execution (1-10, higher = more important)
 * - Background processing with UI thread yielding
 * - Task cancellation support
 * - Result caching (max 10 results)
 * - Comprehensive error handling
 * - Queue status monitoring
 */

export type TaskType =
  | 'computeTrends'
  | 'computeDistributions'
  | 'computeHeatMap'
  | 'fullAnalytics'
  | 'computeStatistics';

export interface WorkerTask {
  taskId: string;
  type: TaskType;
  priority: number; // 1-10, higher = more important
  timestamp: Date;
  data?: any; // Optional task-specific data
}

export interface WorkerResult {
  taskId: string;
  success: boolean;
  data?: any;
  error?: string;
  completedAt: Date;
  duration: number; // milliseconds
}

/**
 * Singleton worker for processing analytics tasks in the background.
 * Uses a priority queue to ensure high-priority tasks are processed first.
 * Stores recent results for quick retrieval.
 */
class AnalyticsWorker {
  private static instance: AnalyticsWorker;
  private pendingTasks: WorkerTask[] = [];
  private processingTask: string | null = null;
  private results: Map<string, WorkerResult> = new Map();
  private readonly MAX_RESULTS = 10;
  private readonly DEFAULT_TASK_TIMEOUT = 30000; // 30 seconds
  private isProcessing = false;

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    console.log('[AnalyticsWorker] Worker initialized');
  }

  /**
   * Get the singleton instance of AnalyticsWorker
   */
  static getInstance(): AnalyticsWorker {
    if (!AnalyticsWorker.instance) {
      AnalyticsWorker.instance = new AnalyticsWorker();
    }
    return AnalyticsWorker.instance;
  }

  /**
   * Enqueue a task for background processing
   *
   * @param taskType - Type of analytics task to perform
   * @param priority - Priority level (1-10, higher = more important)
   *                   1-3: Low priority (background tasks, pre-warming cache)
   *                   4-6: Normal priority (typical user interactions)
   *                   7-9: High priority (user explicitly requested)
   *                   10: Critical priority (rarely used)
   * @param data - Optional task-specific data
   * @returns Task ID for tracking
   *
   * @example
   * const taskId = analyticsWorker.enqueue('fullAnalytics', 8, { dateRange: '30d' });
   */
  enqueue(taskType: TaskType, priority: number = 5, data?: any): string {
    // Validate priority
    const validPriority = Math.max(1, Math.min(10, priority));

    // Create task with UUID
    const task: WorkerTask = {
      taskId: this.generateTaskId(),
      type: taskType,
      priority: validPriority,
      timestamp: new Date(),
      data
    };

    // Add to pending queue
    this.pendingTasks.push(task);

    // Sort by priority (higher first), then by timestamp (older first)
    this.pendingTasks.sort((a, b) => {
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      return a.timestamp.getTime() - b.timestamp.getTime();
    });

    console.log(
      `[AnalyticsWorker] Task enqueued: ${task.taskId} (${taskType}, priority: ${validPriority})`
    );
    console.log(`[AnalyticsWorker] Queue size: ${this.pendingTasks.length}`);

    // Start processing if not already running
    if (!this.isProcessing) {
      this.processNextTask();
    }

    return task.taskId;
  }

  /**
   * Get result for a completed task
   *
   * @param taskId - ID of the task to retrieve
   * @returns WorkerResult if task is completed, null otherwise
   *
   * @example
   * const result = analyticsWorker.getResult(taskId);
   * if (result?.success) {
   *   console.log('Analytics data:', result.data);
   * }
   */
  getResult(taskId: string): WorkerResult | null {
    return this.results.get(taskId) || null;
  }

  /**
   * Cancel a pending task
   *
   * @param taskId - ID of the task to cancel
   * @returns true if task was found and cancelled, false otherwise
   *
   * @example
   * const cancelled = analyticsWorker.cancel(taskId);
   * if (cancelled) {
   *   console.log('Task cancelled successfully');
   * }
   */
  cancel(taskId: string): boolean {
    const initialLength = this.pendingTasks.length;
    this.pendingTasks = this.pendingTasks.filter(task => task.taskId !== taskId);

    const wasCancelled = this.pendingTasks.length < initialLength;

    if (wasCancelled) {
      console.log(`[AnalyticsWorker] Task cancelled: ${taskId}`);
    } else {
      console.log(`[AnalyticsWorker] Task not found or already processing: ${taskId}`);
    }

    return wasCancelled;
  }

  /**
   * Get current queue status
   *
   * @returns Object with queue statistics
   *
   * @example
   * const status = analyticsWorker.getQueueStatus();
   * console.log(`Pending: ${status.pending}, Processing: ${status.processing}`);
   */
  getQueueStatus(): {
    pending: number;
    processing: string | null;
    completed: number;
  } {
    return {
      pending: this.pendingTasks.length,
      processing: this.processingTask,
      completed: this.results.size
    };
  }

  /**
   * Clear all results from the cache
   *
   * @example
   * analyticsWorker.clearResults();
   */
  clearResults(): void {
    this.results.clear();
    console.log('[AnalyticsWorker] Results cleared');
  }

  /**
   * Check if worker is currently processing a task
   *
   * @returns true if worker is busy, false otherwise
   *
   * @example
   * if (!analyticsWorker.isBusy()) {
   *   console.log('Worker is idle');
   * }
   */
  isBusy(): boolean {
    return this.processingTask !== null;
  }

  /**
   * Get all pending tasks (for debugging/monitoring)
   *
   * @returns Array of pending tasks
   */
  getPendingTasks(): WorkerTask[] {
    return [...this.pendingTasks];
  }

  /**
   * Process next task in queue
   * Private method called recursively to process tasks sequentially
   */
  private async processNextTask(): Promise<void> {
    // If queue empty, mark as idle and return
    if (this.pendingTasks.length === 0) {
      this.processingTask = null;
      this.isProcessing = false;
      console.log('[AnalyticsWorker] Queue empty, worker idle');
      return;
    }

    // Mark as processing
    this.isProcessing = true;

    // Get next task (highest priority)
    const task = this.pendingTasks.shift();
    if (!task) {
      this.isProcessing = false;
      return;
    }

    // Set as processing
    this.processingTask = task.taskId;
    console.log(
      `[AnalyticsWorker] Processing task: ${task.taskId} (${task.type}, priority: ${task.priority})`
    );

    const startTime = Date.now();

    try {
      // Yield to UI thread before processing
      await new Promise(resolve => setTimeout(resolve, 0));

      // Execute task based on type
      const data = await this.executeTask(task);
      const duration = Date.now() - startTime;

      // Store successful result
      this.storeResult(task.taskId, {
        taskId: task.taskId,
        success: true,
        data,
        completedAt: new Date(),
        duration
      });

      console.log(
        `[AnalyticsWorker] Task completed: ${task.taskId} (${duration}ms)`
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Store error result
      this.storeResult(task.taskId, {
        taskId: task.taskId,
        success: false,
        error: errorMessage,
        completedAt: new Date(),
        duration
      });

      console.error(
        `[AnalyticsWorker] Task failed: ${task.taskId} (${duration}ms)`,
        errorMessage
      );
    }

    // Clear processing flag
    this.processingTask = null;

    // Yield to UI thread before processing next task
    await new Promise(resolve => setTimeout(resolve, 0));

    // Process next task (recursive)
    this.processNextTask();
  }

  /**
   * Execute specific task type
   * Calls appropriate service method based on task type
   *
   * @param task - Task to execute
   * @returns Promise resolving to task result data
   */
  private async executeTask(task: WorkerTask): Promise<any> {
    console.log(`[AnalyticsWorker] Executing ${task.type}...`);

    // Create timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Task ${task.type} timed out after ${this.DEFAULT_TASK_TIMEOUT}ms`)), this.DEFAULT_TASK_TIMEOUT);
    });

    // Create task promise
    const taskPromise = (async () => {
      switch (task.type) {
        case 'computeTrends':
          // TODO: Import and call TrendAnalyzer when implemented
          // const { trendAnalyzer } = await import('./TrendAnalyzer');
          // return await trendAnalyzer.analyzeTrends(task.data);

          // Placeholder implementation
          console.log('[AnalyticsWorker] TrendAnalyzer not yet implemented');
          await this.simulateWork(500); // Simulate processing time
          return {
            placeholder: 'TrendAnalyzer not yet implemented',
            taskType: task.type,
            requestedAt: task.timestamp
          };

        case 'computeDistributions':
          // TODO: Import and call DistributionAnalyzer when implemented
          // const { distributionAnalyzer } = await import('./DistributionAnalyzer');
          // return await distributionAnalyzer.computeDistributions(task.data);

          // Placeholder implementation
          console.log('[AnalyticsWorker] DistributionAnalyzer not yet implemented');
          await this.simulateWork(400);
          return {
            placeholder: 'DistributionAnalyzer not yet implemented',
            taskType: task.type,
            requestedAt: task.timestamp
          };

        case 'computeHeatMap':
          // TODO: Import and call HeatMapService when implemented
          // const { heatMapService } = await import('./HeatMapService');
          // return await heatMapService.computeHeatMap(task.data);

          // Placeholder implementation
          console.log('[AnalyticsWorker] HeatMapService not yet implemented');
          await this.simulateWork(600);
          return {
            placeholder: 'HeatMapService not yet implemented',
            taskType: task.type,
            requestedAt: task.timestamp
          };

        case 'fullAnalytics':
          // TODO: Import and call AdvancedAnalyticsService when implemented
          // const { advancedAnalyticsService } = await import('./AdvancedAnalyticsService');
          // return await advancedAnalyticsService.computeAnalytics(task.data);

          // Placeholder implementation
          console.log('[AnalyticsWorker] AdvancedAnalyticsService not yet implemented');
          await this.simulateWork(1000);
          return {
            placeholder: 'AdvancedAnalyticsService not yet implemented',
            taskType: task.type,
            requestedAt: task.timestamp
          };

        case 'computeStatistics':
          // TODO: Import and call StatisticsService when implemented
          // const { statisticsService } = await import('./StatisticsService');
          // return await statisticsService.computeStatistics(task.data);

          // Placeholder implementation
          console.log('[AnalyticsWorker] StatisticsService not yet implemented');
          await this.simulateWork(300);
          return {
            placeholder: 'StatisticsService not yet implemented',
            taskType: task.type,
            requestedAt: task.timestamp
          };

        default:
          throw new Error(`Unknown task type: ${(task as WorkerTask).type}`);
      }
    })();

    // Race between task and timeout
    return Promise.race([taskPromise, timeoutPromise]);
  }

  /**
   * Store result with automatic cleanup
   * Maintains max result cache size by removing oldest entries
   *
   * @param taskId - ID of the task
   * @param result - Result to store
   */
  private storeResult(taskId: string, result: WorkerResult): void {
    // Add to results map
    this.results.set(taskId, result);

    // If exceeds max results, remove oldest
    if (this.results.size > this.MAX_RESULTS) {
      const oldestKey = this.findOldestResult();
      if (oldestKey) {
        this.results.delete(oldestKey);
        console.log(
          `[AnalyticsWorker] Removed oldest result: ${oldestKey} (cache limit: ${this.MAX_RESULTS})`
        );
      }
    }
  }

  /**
   * Generate UUID for task ID
   *
   * @returns Unique task identifier
   */
  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Find oldest result for cleanup
   *
   * @returns Key of the oldest result, or null if no results exist
   */
  private findOldestResult(): string | null {
    let oldestKey: string | null = null;
    let oldestTime: number = Infinity;

    for (const [key, result] of this.results.entries()) {
      const completedTime = result.completedAt.getTime();
      if (completedTime < oldestTime) {
        oldestTime = completedTime;
        oldestKey = key;
      }
    }

    return oldestKey;
  }

  /**
   * Simulate work for placeholder implementations
   * Yields to UI thread periodically during simulation
   *
   * @param durationMs - Duration to simulate in milliseconds
   */
  private async simulateWork(durationMs: number): Promise<void> {
    const iterations = Math.ceil(durationMs / 50);
    for (let i = 0; i < iterations; i++) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }
}

/**
 * Singleton instance export for convenience
 */
export const analyticsWorker = AnalyticsWorker.getInstance();

/**
 * Class export for type definitions and testing
 */
export default AnalyticsWorker;
