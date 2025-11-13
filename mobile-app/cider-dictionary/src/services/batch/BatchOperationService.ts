// Phase 4: Batch Operations Service
// Implements multi-select, bulk actions, progress tracking, and undo functionality

import {
  BatchOperation,
  BatchOperationResult,
  BatchProgress,
  UndoStackEntry,
  BatchCancellationToken,
} from '../../types/batch';
import { CiderMasterRecord } from '../../types/cider';

export class BatchOperationService {
  private static instance: BatchOperationService;
  private undoStack: UndoStackEntry[] = [];
  private readonly MAX_UNDO_STACK_SIZE = 10;
  private readonly UNDO_EXPIRATION_MS = 30 * 60 * 1000; // 30 minutes

  static getInstance(): BatchOperationService {
    if (!BatchOperationService.instance) {
      BatchOperationService.instance = new BatchOperationService();
    }
    return BatchOperationService.instance;
  }

  // =============================================================================
  // MAIN BATCH EXECUTION
  // =============================================================================

  async executeBatchOperation(
    operation: BatchOperation,
    ciders: Map<string, CiderMasterRecord>,
    progressCallback?: (progress: BatchProgress) => void,
    cancellationToken?: BatchCancellationToken
  ): Promise<BatchOperationResult> {
    const startTime = Date.now();
    const result: BatchOperationResult = {
      success: false,
      totalProcessed: 0,
      successCount: 0,
      failedCount: 0,
      errors: [],
      undoToken: null,
      duration: 0,
    };

    try {
      // Validate operation
      const validation = this.validateOperation(operation, ciders);
      if (!validation.valid) {
        result.errors.push({ itemId: 'validation', error: validation.error! });
        return result;
      }

      // Prepare
      progressCallback?.({
        operation: operation.type,
        status: 'preparing',
        totalItems: operation.targetItems.size,
        processedItems: 0,
        failedItems: 0,
        currentItem: null,
        progress: 0,
        estimatedTimeRemaining: 0,
        errors: [],
      });

      // Initialize undo data if undoable
      const undoData: UndoStackEntry | null = operation.undoable
        ? {
            undoToken: this.generateUUID(),
            operation: operation.type,
            timestamp: new Date(),
            affectedItems: [],
            canUndo: true,
            expiresAt: new Date(Date.now() + this.UNDO_EXPIRATION_MS),
          }
        : null;

      // Process items
      progressCallback?.({
        operation: operation.type,
        status: 'processing',
        totalItems: operation.targetItems.size,
        processedItems: 0,
        failedItems: 0,
        currentItem: null,
        progress: 5,
        estimatedTimeRemaining: 0,
        errors: [],
      });

      const itemsArray = Array.from(operation.targetItems);
      const totalItems = itemsArray.length;

      for (let i = 0; i < totalItems; i++) {
        const itemId = itemsArray[i];

        // Check cancellation
        if (cancellationToken?.isCancelled) {
          result.errors.push({
            itemId: 'cancellation',
            error: `Operation cancelled after processing ${result.totalProcessed} of ${totalItems} items`,
          });
          break;
        }

        try {
          const cider = ciders.get(itemId);
          if (!cider) {
            result.failedCount++;
            result.errors.push({ itemId, error: 'Cider not found' });
            continue;
          }

          // Save state for undo if needed
          if (undoData) {
            undoData.affectedItems.push({
              id: cider.id,
              name: cider.name,
              previousState: { ...cider },
            });
          }

          // Process item
          const itemResult = await this.processSingleItem(
            itemId,
            cider,
            operation
          );

          if (itemResult.success) {
            result.successCount++;
          } else {
            result.failedCount++;
            result.errors.push({
              itemId,
              error: itemResult.error || 'Unknown error',
            });
          }
        } catch (error) {
          result.failedCount++;
          result.errors.push({
            itemId,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }

        result.totalProcessed++;

        // Update progress
        const progress = Math.floor(((i + 1) / totalItems) * 90) + 5; // 5-95%
        const eta = this.calculateETA(startTime, result.totalProcessed, totalItems);

        progressCallback?.({
          operation: operation.type,
          status: 'processing',
          totalItems,
          processedItems: result.totalProcessed,
          failedItems: result.failedCount,
          currentItem: itemId,
          progress,
          estimatedTimeRemaining: eta,
          errors: result.errors.slice(-5), // Last 5 errors
        });

        // Yield to prevent UI blocking (every 10 items)
        if ((i + 1) % 10 === 0) {
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      }

      // Save undo data if applicable
      if (undoData && result.successCount > 0) {
        this.addToUndoStack(undoData);
        result.undoToken = undoData.undoToken;
      }

      // Complete
      progressCallback?.({
        operation: operation.type,
        status: 'completed',
        totalItems,
        processedItems: result.totalProcessed,
        failedItems: result.failedCount,
        currentItem: null,
        progress: 100,
        estimatedTimeRemaining: 0,
        errors: result.errors,
      });

      result.success = result.failedCount === 0;
      result.duration = Date.now() - startTime;

      return result;
    } catch (error) {
      result.success = false;
      result.errors.push({
        itemId: 'execution',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      result.duration = Date.now() - startTime;
      return result;
    }
  }

  // =============================================================================
  // SINGLE ITEM PROCESSING
  // =============================================================================

  private async processSingleItem(
    itemId: string,
    cider: CiderMasterRecord,
    operation: BatchOperation
  ): Promise<{ success: boolean; error?: string }> {
    switch (operation.type) {
      case 'delete':
        // Note: Actual deletion handled by store
        return { success: true };

      case 'addTags':
        if (!operation.parameters?.tags) {
          return { success: false, error: 'No tags specified' };
        }
        // Note: Actual tag addition handled by store
        return { success: true };

      case 'removeTags':
        if (!operation.parameters?.tags) {
          return { success: false, error: 'No tags specified' };
        }
        // Note: Actual tag removal handled by store
        return { success: true };

      case 'updateRating':
        if (!operation.parameters?.value) {
          return { success: false, error: 'No rating value specified' };
        }
        const newRating = this.calculateNewRating(
          cider.overallRating,
          operation.parameters
        );
        if (newRating < 1 || newRating > 10) {
          return { success: false, error: 'Invalid rating value' };
        }
        // Note: Actual rating update handled by store
        return { success: true };

      case 'archive':
      case 'unarchive':
        // Note: Archive functionality to be implemented
        return { success: true };

      default:
        return { success: false, error: 'Unknown operation type' };
    }
  }

  private calculateNewRating(
    currentRating: number | null,
    params: any
  ): number {
    const current = currentRating || 0;

    switch (params.type) {
      case 'set':
        return params.value;
      case 'increase':
        return Math.min(10, current + params.value);
      case 'decrease':
        return Math.max(1, current - params.value);
      default:
        return params.value;
    }
  }

  // =============================================================================
  // VALIDATION
  // =============================================================================

  private validateOperation(
    operation: BatchOperation,
    ciders: Map<string, CiderMasterRecord>
  ): { valid: boolean; error?: string } {
    // Check if there are items to process
    if (operation.targetItems.size === 0) {
      return { valid: false, error: 'No items selected' };
    }

    // Validate based on operation type
    switch (operation.type) {
      case 'addTags':
      case 'removeTags':
        if (
          !operation.parameters ||
          !operation.parameters.tags ||
          operation.parameters.tags.length === 0
        ) {
          return { valid: false, error: 'No tags specified' };
        }
        break;

      case 'updateRating':
        if (!operation.parameters || operation.parameters.value == null) {
          return { valid: false, error: 'No rating value specified' };
        }
        if (operation.parameters.value < 1 || operation.parameters.value > 10) {
          return { valid: false, error: 'Rating must be between 1 and 10' };
        }
        break;
    }

    return { valid: true };
  }

  // =============================================================================
  // UNDO SYSTEM
  // =============================================================================

  async undoBatchOperation(
    undoToken: string,
    progressCallback?: (progress: BatchProgress) => void
  ): Promise<BatchOperationResult> {
    const startTime = Date.now();
    const result: BatchOperationResult = {
      success: false,
      totalProcessed: 0,
      successCount: 0,
      failedCount: 0,
      errors: [],
      undoToken: null,
      duration: 0,
    };

    try {
      // Retrieve undo data
      const undoData = this.getUndoData(undoToken);

      if (!undoData) {
        result.errors.push({
          itemId: 'undo',
          error: 'Undo data not found or expired',
        });
        return result;
      }

      if (!undoData.canUndo) {
        result.errors.push({
          itemId: 'undo',
          error: 'This operation cannot be undone',
        });
        return result;
      }

      // Check expiration
      if (new Date() > undoData.expiresAt) {
        result.errors.push({ itemId: 'undo', error: 'Undo period has expired' });
        return result;
      }

      const totalItems = undoData.affectedItems.length;

      progressCallback?.({
        operation: `Undoing ${undoData.operation}`,
        status: 'processing',
        totalItems,
        processedItems: 0,
        failedItems: 0,
        currentItem: null,
        progress: 0,
        estimatedTimeRemaining: 0,
        errors: [],
      });

      // Restore each item
      for (let i = 0; i < totalItems; i++) {
        const item = undoData.affectedItems[i];

        try {
          // Note: Actual restoration handled by store
          result.successCount++;
        } catch (error) {
          result.failedCount++;
          result.errors.push({
            itemId: item.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }

        result.totalProcessed++;

        // Update progress
        const progress = Math.floor(((i + 1) / totalItems) * 100);

        progressCallback?.({
          operation: `Undoing ${undoData.operation}`,
          status: 'processing',
          totalItems,
          processedItems: result.totalProcessed,
          failedItems: result.failedCount,
          currentItem: item.id,
          progress,
          estimatedTimeRemaining: 0,
          errors: result.errors,
        });
      }

      // Mark undo data as used
      this.markUndoDataAsUsed(undoToken);

      progressCallback?.({
        operation: `Undoing ${undoData.operation}`,
        status: 'completed',
        totalItems,
        processedItems: result.totalProcessed,
        failedItems: result.failedCount,
        currentItem: null,
        progress: 100,
        estimatedTimeRemaining: 0,
        errors: result.errors,
      });

      result.success = result.failedCount === 0;
      result.duration = Date.now() - startTime;

      return result;
    } catch (error) {
      result.success = false;
      result.errors.push({
        itemId: 'undo',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      result.duration = Date.now() - startTime;
      return result;
    }
  }

  private addToUndoStack(entry: UndoStackEntry): void {
    this.undoStack.push(entry);

    // Limit stack size
    if (this.undoStack.length > this.MAX_UNDO_STACK_SIZE) {
      this.undoStack.shift();
    }

    console.log('Added to undo stack:', entry.undoToken);
  }

  private getUndoData(undoToken: string): UndoStackEntry | null {
    return this.undoStack.find((entry) => entry.undoToken === undoToken) || null;
  }

  private markUndoDataAsUsed(undoToken: string): void {
    const index = this.undoStack.findIndex(
      (entry) => entry.undoToken === undoToken
    );
    if (index !== -1) {
      this.undoStack[index].canUndo = false;
    }
  }

  getUndoStack(): UndoStackEntry[] {
    // Return only valid, unexpired undo entries
    const now = new Date();
    return this.undoStack.filter(
      (entry) => entry.canUndo && entry.expiresAt > now
    );
  }

  // =============================================================================
  // UTILITY FUNCTIONS
  // =============================================================================

  private calculateETA(
    startTime: number,
    processed: number,
    total: number
  ): number {
    if (processed === 0) return 0;

    const elapsed = (Date.now() - startTime) / 1000; // seconds
    const rate = processed / elapsed; // items per second
    const remaining = total - processed;
    const eta = remaining / rate;

    return Math.ceil(eta);
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  formatDuration(ms: number): string {
    if (ms < 1000) {
      return `${ms}ms`;
    } else {
      return `${(ms / 1000).toFixed(1)}s`;
    }
  }
}

// Singleton instance
export const batchOperationService = BatchOperationService.getInstance();
