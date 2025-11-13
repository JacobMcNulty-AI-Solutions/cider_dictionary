// Batch Operations Types for Phase 4

import { CiderMasterRecord } from './cider';

export type BatchOperationType =
  | 'delete'
  | 'export'
  | 'addTags'
  | 'removeTags'
  | 'updateRating'
  | 'archive'
  | 'unarchive';

export type BatchSelectionMode = 'none' | 'select' | 'active';

export type BatchStatus = 'idle' | 'preparing' | 'processing' | 'completed' | 'error' | 'cancelled';

export interface BatchSelectionState {
  mode: BatchSelectionMode;
  selectedItems: Set<string>; // cider IDs
  selectAll: boolean;
  excludedItems: Set<string>; // when selectAll = true
  totalAvailable: number;
  selectionCount: number;
}

export interface BatchOperation {
  type: BatchOperationType;
  targetItems: Set<string>; // cider IDs
  parameters?: any; // operation-specific params
  confirmationRequired: boolean;
  undoable: boolean;
}

export interface BatchProgress {
  operation: string;
  status: BatchStatus;
  totalItems: number;
  processedItems: number;
  failedItems: number;
  currentItem: string | null;
  progress: number; // 0-100
  estimatedTimeRemaining: number; // seconds
  errors: Array<{
    itemId: string;
    itemName: string;
    error: string;
  }>;
}

export interface BatchOperationResult {
  success: boolean;
  totalProcessed: number;
  successCount: number;
  failedCount: number;
  errors: Array<{ itemId: string; error: string }>;
  undoToken: string | null; // for undoable operations
  duration: number; // milliseconds
}

export interface UndoStackEntry {
  undoToken: string;
  operation: string;
  timestamp: Date;
  affectedItems: Array<{
    id: string;
    name: string;
    previousState: Partial<CiderMasterRecord>;
  }>;
  canUndo: boolean;
  expiresAt: Date;
}

export interface BatchCancellationToken {
  isCancelled: boolean;
  cancel: (reason?: string) => void;
  reason: string | null;
}

// Default selection state
export const DEFAULT_BATCH_SELECTION: BatchSelectionState = {
  mode: 'none',
  selectedItems: new Set(),
  selectAll: false,
  excludedItems: new Set(),
  totalAvailable: 0,
  selectionCount: 0,
};

// Helper functions
export function createCancellationToken(): BatchCancellationToken {
  const token: BatchCancellationToken = {
    isCancelled: false,
    reason: null,
    cancel: (reason?: string) => {
      token.isCancelled = true;
      token.reason = reason || 'User cancelled';
    },
  };
  return token;
}

export function calculateSelectionCount(state: BatchSelectionState): number {
  if (state.selectAll) {
    return state.totalAvailable - state.excludedItems.size;
  } else {
    return state.selectedItems.size;
  }
}

export function getSelectedItemIds(
  state: BatchSelectionState,
  allItemIds: string[]
): string[] {
  if (state.selectAll) {
    // Return all except excluded
    return allItemIds.filter((id) => !state.excludedItems.has(id));
  } else {
    // Return selected items
    return Array.from(state.selectedItems);
  }
}
