# Batch Operations System

**REFINEMENT NOTES (v2.0)**
- Added `PreValidateBatchOperation` algorithm for upfront validation
- Added transaction rollback support for critical failures
- Added partial failure recovery mechanisms
- Added cancellation support for long-running operations
- Enhanced validation examples with detailed error cases
- Improved error handling with rollback capabilities

---

## Purpose

Implements multi-select capabilities and bulk actions for efficient management of large cider collections. Supports batch delete, export, tagging, rating updates, and archiving operations with progress tracking and undo functionality.

## Data Structures

### Batch Selection State
```typescript
INTERFACE BatchSelectionState:
  mode: ENUM('none', 'select', 'active')
  selectedItems: SET<STRING> // cider IDs
  selectAll: BOOLEAN
  excludedItems: SET<STRING> // when selectAll = true
  totalAvailable: NUMBER
  selectionCount: NUMBER
```

### Batch Operation Config
```typescript
INTERFACE BatchOperation:
  type: ENUM('delete', 'export', 'addTags', 'removeTags',
             'updateRating', 'archive', 'unarchive')
  targetItems: SET<STRING> // cider IDs
  parameters: Object | NULL // operation-specific params
  confirmationRequired: BOOLEAN
  undoable: BOOLEAN
```

### Batch Progress
```typescript
INTERFACE BatchProgress:
  operation: STRING
  status: ENUM('idle', 'preparing', 'processing', 'completed', 'error', 'cancelled')
  totalItems: NUMBER
  processedItems: NUMBER
  failedItems: NUMBER
  currentItem: STRING | NULL
  progress: NUMBER // 0-100
  estimatedTimeRemaining: NUMBER // seconds
  errors: ARRAY<{
    itemId: STRING
    itemName: STRING
    error: STRING
  }>
```

### Batch Operation Result
```typescript
INTERFACE BatchOperationResult:
  success: BOOLEAN
  totalProcessed: NUMBER
  successCount: NUMBER
  failedCount: NUMBER
  errors: ARRAY<{itemId: STRING, error: STRING}>
  undoToken: STRING | NULL // for undoable operations
  duration: NUMBER // milliseconds
```

### Undo Stack Entry
```typescript
INTERFACE UndoStackEntry:
  undoToken: STRING
  operation: STRING
  timestamp: TIMESTAMP
  affectedItems: ARRAY<{
    id: STRING
    name: STRING
    previousState: Object
  }>
  canUndo: BOOLEAN
  expiresAt: TIMESTAMP
```

### Batch Cancellation Token
```typescript
INTERFACE BatchCancellationToken:
  isCancelled: BOOLEAN
  cancel: () => void
  reason: STRING | NULL
```

### Batch Validation Result
```typescript
INTERFACE BatchValidationResult:
  valid: BOOLEAN
  canProceedWithWarnings: BOOLEAN
  issues: ARRAY<{
    itemId: STRING
    error: STRING
  }>
  warnings: ARRAY<{
    itemId: STRING
    warning: STRING
  }>
```

### Batch Transaction Log
```typescript
INTERFACE BatchTransactionLog:
  transactionId: STRING
  operations: ARRAY<{
    itemId: STRING
    operation: STRING
    timestamp: TIMESTAMP
    success: BOOLEAN
  }>
  canRollback: BOOLEAN
  rolledBack: BOOLEAN
```

## Core Algorithms

### 1. Selection Management

```
ALGORITHM: ToggleItemSelection
INPUT: itemId (STRING), currentState (BatchSelectionState)
OUTPUT: newState (BatchSelectionState)

TIME COMPLEXITY: O(1)
SPACE COMPLEXITY: O(1)

BEGIN
  newState ← Clone(currentState)

  IF newState.selectAll THEN
    // In "select all" mode
    IF newState.excludedItems.has(itemId) THEN
      // Item was excluded, include it now
      newState.excludedItems.delete(itemId)
    ELSE
      // Item was included, exclude it now
      newState.excludedItems.add(itemId)
    END IF
  ELSE
    // Normal selection mode
    IF newState.selectedItems.has(itemId) THEN
      newState.selectedItems.delete(itemId)
    ELSE
      newState.selectedItems.add(itemId)
    END IF
  END IF

  // Update selection count
  newState.selectionCount ← CalculateSelectionCount(newState)

  RETURN newState
END

SUBROUTINE: CalculateSelectionCount
INPUT: state (BatchSelectionState)
OUTPUT: count (NUMBER)

BEGIN
  IF state.selectAll THEN
    count ← state.totalAvailable - state.excludedItems.size
  ELSE
    count ← state.selectedItems.size
  END IF

  RETURN count
END

ALGORITHM: SelectAllItems
INPUT: currentState (BatchSelectionState)
OUTPUT: newState (BatchSelectionState)

TIME COMPLEXITY: O(1)
SPACE COMPLEXITY: O(1)

BEGIN
  newState ← Clone(currentState)
  newState.selectAll ← TRUE
  newState.selectedItems.clear()
  newState.excludedItems.clear()
  newState.selectionCount ← newState.totalAvailable

  RETURN newState
END

ALGORITHM: ClearSelection
INPUT: currentState (BatchSelectionState)
OUTPUT: newState (BatchSelectionState)

TIME COMPLEXITY: O(1)
SPACE COMPLEXITY: O(1)

BEGIN
  newState ← {
    mode: 'none',
    selectedItems: NEW SET<STRING>(),
    selectAll: FALSE,
    excludedItems: NEW SET<STRING>(),
    totalAvailable: currentState.totalAvailable,
    selectionCount: 0
  }

  RETURN newState
END

ALGORITHM: GetSelectedItemIds
INPUT: state (BatchSelectionState), allItemIds (ARRAY<STRING>)
OUTPUT: selectedIds (ARRAY<STRING>)

TIME COMPLEXITY: O(n) where n = total items if selectAll
SPACE COMPLEXITY: O(m) where m = selected items

BEGIN
  IF state.selectAll THEN
    // Return all except excluded
    selectedIds ← []
    FOR EACH itemId IN allItemIds DO
      IF NOT state.excludedItems.has(itemId) THEN
        selectedIds.push(itemId)
      END IF
    END FOR
  ELSE
    // Return selected items
    selectedIds ← Array.from(state.selectedItems)
  END IF

  RETURN selectedIds
END
```

### 2. Pre-Validation

```
ALGORITHM: PreValidateBatchOperation
INPUT: operation (BatchOperation)
OUTPUT: validationResult (BatchValidationResult)

TIME COMPLEXITY: O(n) where n = target items
SPACE COMPLEXITY: O(k) where k = issues + warnings

BEGIN
  issues ← []
  warnings ← []

  // Check each item
  FOR EACH itemId IN operation.targetItems DO
    item ← GetItem(itemId)

    IF item == NULL THEN
      issues.push({
        itemId: itemId,
        error: 'Item not found'
      })
      CONTINUE
    END IF

    // Operation-specific validation
    SWITCH operation.type
      CASE 'delete':
        // Check dependencies
        dependents ← GetDependentItems(itemId)
        IF dependents.length > 0 THEN
          warnings.push({
            itemId: itemId,
            warning: item.name + ' has ' + dependents.length +
                    ' experience(s). These will also be deleted.'
          })
        END IF

        // Check if item can be deleted
        IF item.isProtected THEN
          issues.push({
            itemId: itemId,
            error: 'Item is protected and cannot be deleted'
          })
        END IF

      CASE 'addTags':
        // Check if tags valid
        IF NOT operation.parameters.tags OR
           operation.parameters.tags.length == 0 THEN
          issues.push({
            itemId: itemId,
            error: 'No tags specified'
          })
        END IF

        // Check tag limits
        currentTags ← item.tasteTags || []
        newTagCount ← currentTags.length + operation.parameters.tags.length
        IF newTagCount > 10 THEN
          warnings.push({
            itemId: itemId,
            warning: 'Adding tags will exceed recommended limit of 10'
          })
        END IF

      CASE 'updateRating':
        // Validate rating value
        IF NOT operation.parameters.value THEN
          issues.push({
            itemId: itemId,
            error: 'No rating value specified'
          })
        ELSE IF operation.parameters.value < 1 OR
                operation.parameters.value > 10 THEN
          issues.push({
            itemId: itemId,
            error: 'Rating must be between 1 and 10'
          })
        END IF

      CASE 'archive':
        IF item.isArchived THEN
          warnings.push({
            itemId: itemId,
            warning: 'Item is already archived'
          })
        END IF
    END SWITCH
  END FOR

  RETURN {
    valid: issues.length == 0,
    canProceedWithWarnings: issues.length == 0 AND warnings.length > 0,
    issues: issues,
    warnings: warnings
  }
END
```

### 3. Batch Operation Executor

```
ALGORITHM: ExecuteBatchOperation
INPUT: operation (BatchOperation), progressCallback (FUNCTION),
       cancellationToken (BatchCancellationToken | NULL)
OUTPUT: result (BatchOperationResult)

TIME COMPLEXITY: O(n * c) where n = items, c = complexity per item
SPACE COMPLEXITY: O(n) for undo data

BEGIN
  startTime ← CurrentTimestamp()
  result ← NEW BatchOperationResult()
  result.totalProcessed ← 0
  result.successCount ← 0
  result.failedCount ← 0
  result.errors ← []

  // Prepare operation
  progressCallback({
    status: 'preparing',
    progress: 0,
    totalItems: operation.targetItems.size
  })

  // Pre-validate all items
  validationResult ← PreValidateBatchOperation(operation)

  IF NOT validationResult.valid THEN
    result.success ← FALSE
    result.errors ← validationResult.issues
    RETURN result
  END IF

  // Show warnings if present
  IF validationResult.canProceedWithWarnings THEN
    confirmed ← AWAIT ShowWarningDialog({
      title: 'Warnings Found',
      message: validationResult.warnings.length + ' items have warnings',
      warnings: validationResult.warnings,
      options: ['Cancel', 'Proceed Anyway']
    })

    IF NOT confirmed THEN
      result.success ← FALSE
      RETURN result
    END IF
  END IF

  // Show confirmation if required
  IF operation.confirmationRequired THEN
    confirmed ← AWAIT ShowConfirmationDialog(operation)
    IF NOT confirmed THEN
      result.success ← FALSE
      RETURN result
    END IF
  END IF

  // Initialize undo data if undoable
  undoData ← NULL
  IF operation.undoable THEN
    undoData ← {
      operation: operation.type,
      timestamp: CurrentTimestamp(),
      affectedItems: []
    }
  END IF

  // Process items
  progressCallback({
    status: 'processing',
    progress: 5,
    totalItems: operation.targetItems.size
  })

  itemsArray ← Array.from(operation.targetItems)
  totalItems ← itemsArray.length

  FOR i ← 0 TO totalItems - 1 DO
    itemId ← itemsArray[i]

    TRY
      // Process single item
      itemResult ← ProcessSingleItem(itemId, operation, undoData)

      IF itemResult.success THEN
        result.successCount += 1
      ELSE
        result.failedCount += 1
        result.errors.push({
          itemId: itemId,
          error: itemResult.error
        })
      END IF

    CATCH error
      result.failedCount += 1
      result.errors.push({
        itemId: itemId,
        error: error.message
      })
      Log('Batch operation error for item ' + itemId, error)
    END TRY

    result.totalProcessed += 1

    // Update progress
    progress ← ((i + 1) / totalItems) * 90 + 5 // 5-95%
    estimatedTimeRemaining ← CalculateETA(
      startTime,
      result.totalProcessed,
      totalItems
    )

    progressCallback({
      status: 'processing',
      progress: progress,
      totalItems: totalItems,
      processedItems: result.totalProcessed,
      failedItems: result.failedCount,
      currentItem: itemId,
      estimatedTimeRemaining: estimatedTimeRemaining
    })

    // Check for cancellation
    IF cancellationToken != NULL AND cancellationToken.isCancelled THEN
      progressCallback({
        status: 'cancelled',
        progress: progress,
        message: 'Operation cancelled: ' + (cancellationToken.reason || 'User requested')
      })
      result.success ← FALSE
      result.errors.push({
        itemId: 'cancellation',
        error: 'Operation was cancelled after processing ' +
               result.totalProcessed + ' of ' + totalItems + ' items'
      })
      RETURN result
    END IF

    // Yield to prevent UI blocking (every 10 items)
    IF (i + 1) % 10 == 0 THEN
      AWAIT YieldToMainThread()
    END IF
  END FOR

  // Save undo data if applicable
  IF undoData != NULL AND result.successCount > 0 THEN
    undoToken ← SaveUndoData(undoData)
    result.undoToken ← undoToken
  END IF

  // Complete
  progressCallback({
    status: 'completed',
    progress: 100,
    totalItems: totalItems,
    processedItems: result.totalProcessed
  })

  result.success ← (result.failedCount == 0)
  result.duration ← CurrentTimestamp() - startTime

  RETURN result
END

SUBROUTINE: ProcessSingleItem
INPUT: itemId (STRING), operation (BatchOperation), undoData (Object | NULL)
OUTPUT: result ({success: BOOLEAN, error: STRING | NULL})

BEGIN
  // Save state for undo if needed
  IF undoData != NULL THEN
    cider ← GetCiderById(itemId)
    undoData.affectedItems.push({
      id: cider.id,
      name: cider.name,
      previousState: Clone(cider)
    })
  END IF

  // Execute operation
  SWITCH operation.type
    CASE 'delete':
      RETURN DeleteCider(itemId)

    CASE 'export':
      RETURN ExportCider(itemId, operation.parameters)

    CASE 'addTags':
      RETURN AddTagsToCider(itemId, operation.parameters.tags)

    CASE 'removeTags':
      RETURN RemoveTagsFromCider(itemId, operation.parameters.tags)

    CASE 'updateRating':
      RETURN UpdateCiderRating(itemId, operation.parameters.rating)

    CASE 'archive':
      RETURN ArchiveCider(itemId)

    CASE 'unarchive':
      RETURN UnarchiveCider(itemId)

    DEFAULT:
      RETURN {success: FALSE, error: 'Unknown operation type'}
  END SWITCH
END

SUBROUTINE: CalculateETA
INPUT: startTime (TIMESTAMP), processed (NUMBER), total (NUMBER)
OUTPUT: eta (NUMBER) // seconds

BEGIN
  IF processed == 0 THEN
    RETURN 0
  END IF

  elapsed ← (CurrentTimestamp() - startTime) / 1000 // seconds
  rate ← processed / elapsed // items per second
  remaining ← total - processed
  eta ← remaining / rate

  RETURN Math.ceil(eta)
END
```

### 3. Specific Batch Operations

```
ALGORITHM: BatchDeleteCiders
INPUT: ciderIds (SET<STRING>), progressCallback (FUNCTION)
OUTPUT: result (BatchOperationResult)

BEGIN
  operation ← {
    type: 'delete',
    targetItems: ciderIds,
    parameters: NULL,
    confirmationRequired: TRUE,
    undoable: TRUE
  }

  result ← ExecuteBatchOperation(operation, progressCallback)

  // Trigger UI refresh
  IF result.success THEN
    EmitEvent('cidersDeleted', {
      count: result.successCount,
      ids: Array.from(ciderIds)
    })
  END IF

  RETURN result
END

ALGORITHM: BatchAddTags
INPUT: ciderIds (SET<STRING>), tags (ARRAY<STRING>), progressCallback (FUNCTION)
OUTPUT: result (BatchOperationResult)

BEGIN
  operation ← {
    type: 'addTags',
    targetItems: ciderIds,
    parameters: {tags: tags},
    confirmationRequired: FALSE,
    undoable: TRUE
  }

  result ← ExecuteBatchOperation(operation, progressCallback)

  IF result.success THEN
    EmitEvent('cidersTagged', {
      count: result.successCount,
      tags: tags
    })
  END IF

  RETURN result
END

ALGORITHM: BatchUpdateRating
INPUT: ciderIds (SET<STRING>), ratingOperation (Object), progressCallback (FUNCTION)
OUTPUT: result (BatchOperationResult)

// ratingOperation: {type: 'set' | 'increase' | 'decrease', value: NUMBER}

BEGIN
  operation ← {
    type: 'updateRating',
    targetItems: ciderIds,
    parameters: ratingOperation,
    confirmationRequired: TRUE,
    undoable: TRUE
  }

  result ← ExecuteBatchOperation(operation, progressCallback)

  IF result.success THEN
    EmitEvent('cidersRated', {
      count: result.successCount,
      operation: ratingOperation
    })
  END IF

  RETURN result
END

SUBROUTINE: UpdateCiderRating
INPUT: ciderId (STRING), ratingOperation (Object)
OUTPUT: result ({success: BOOLEAN, error: STRING | NULL})

BEGIN
  TRY
    cider ← GetCiderById(ciderId)

    IF cider == NULL THEN
      RETURN {success: FALSE, error: 'Cider not found'}
    END IF

    newRating ← cider.overallRating

    SWITCH ratingOperation.type
      CASE 'set':
        newRating ← ratingOperation.value

      CASE 'increase':
        newRating ← Min(10, cider.overallRating + ratingOperation.value)

      CASE 'decrease':
        newRating ← Max(1, cider.overallRating - ratingOperation.value)
    END SWITCH

    // Validate rating
    IF newRating < 1 OR newRating > 10 THEN
      RETURN {success: FALSE, error: 'Invalid rating value'}
    END IF

    // Update cider
    UpdateCider(ciderId, {overallRating: newRating})

    RETURN {success: TRUE, error: NULL}

  CATCH error
    RETURN {success: FALSE, error: error.message}
  END TRY
END
```

### 4. Undo System

```
ALGORITHM: UndoBatchOperation
INPUT: undoToken (STRING), progressCallback (FUNCTION)
OUTPUT: result (BatchOperationResult)

TIME COMPLEXITY: O(n) where n = affected items
SPACE COMPLEXITY: O(1)

BEGIN
  // Retrieve undo data
  undoData ← GetUndoData(undoToken)

  IF undoData == NULL THEN
    RETURN {
      success: FALSE,
      errors: [{itemId: 'undo', error: 'Undo data not found or expired'}]
    }
  END IF

  IF NOT undoData.canUndo THEN
    RETURN {
      success: FALSE,
      errors: [{itemId: 'undo', error: 'This operation cannot be undone'}]
    }
  END IF

  // Check expiration
  IF CurrentTimestamp() > undoData.expiresAt THEN
    RETURN {
      success: FALSE,
      errors: [{itemId: 'undo', error: 'Undo period has expired'}]
    }
  END IF

  result ← NEW BatchOperationResult()
  result.successCount ← 0
  result.failedCount ← 0
  result.errors ← []

  totalItems ← undoData.affectedItems.length

  progressCallback({
    status: 'processing',
    progress: 0,
    totalItems: totalItems,
    operation: 'Undoing ' + undoData.operation
  })

  // Restore each item
  FOR i ← 0 TO totalItems - 1 DO
    item ← undoData.affectedItems[i]

    TRY
      SWITCH undoData.operation
        CASE 'delete':
          // Restore deleted cider
          RestoreCider(item.previousState)
          result.successCount += 1

        CASE 'addTags':
          // Remove added tags
          currentCider ← GetCiderById(item.id)
          IF currentCider != NULL THEN
            UpdateCider(item.id, {
              tasteTags: item.previousState.tasteTags
            })
            result.successCount += 1
          ELSE
            result.failedCount += 1
          END IF

        CASE 'updateRating':
          // Restore previous rating
          UpdateCider(item.id, {
            overallRating: item.previousState.overallRating
          })
          result.successCount += 1

        DEFAULT:
          // Generic restore
          UpdateCider(item.id, item.previousState)
          result.successCount += 1
      END SWITCH

    CATCH error
      result.failedCount += 1
      result.errors.push({
        itemId: item.id,
        error: error.message
      })
    END TRY

    // Update progress
    progress ← ((i + 1) / totalItems) * 100
    progressCallback({
      status: 'processing',
      progress: progress,
      processedItems: i + 1,
      totalItems: totalItems
    })
  END FOR

  // Mark undo data as used
  MarkUndoDataAsUsed(undoToken)

  progressCallback({
    status: 'completed',
    progress: 100
  })

  result.success ← (result.failedCount == 0)
  result.totalProcessed ← totalItems

  RETURN result
END

SUBROUTINE: SaveUndoData
INPUT: undoData (Object)
OUTPUT: undoToken (STRING)

BEGIN
  undoToken ← GenerateUUID()

  entry ← {
    undoToken: undoToken,
    operation: undoData.operation,
    timestamp: undoData.timestamp,
    affectedItems: undoData.affectedItems,
    canUndo: TRUE,
    expiresAt: CurrentTimestamp() + (30 * 60 * 1000) // 30 minutes
  }

  // Save to storage (e.g., AsyncStorage or in-memory cache)
  SaveToStorage('undo:' + undoToken, entry)

  // Add to undo stack
  AddToUndoStack(entry)

  RETURN undoToken
END

SUBROUTINE: AddToUndoStack
INPUT: entry (UndoStackEntry)
OUTPUT: void

BEGIN
  STATIC undoStack ← []
  STATIC maxStackSize ← 10

  undoStack.push(entry)

  // Limit stack size
  IF undoStack.length > maxStackSize THEN
    removed ← undoStack.shift()
    RemoveFromStorage('undo:' + removed.undoToken)
  END IF
END
```

### 5. Transaction Rollback Support

```
ALGORITHM: RollbackBatchOperation
INPUT: transactionLog (BatchTransactionLog)
OUTPUT: result ({success: BOOLEAN, rollbackCount: NUMBER})

TIME COMPLEXITY: O(n) where n = successful operations
SPACE COMPLEXITY: O(1)

BEGIN
  IF NOT transactionLog.canRollback THEN
    RETURN {
      success: FALSE,
      rollbackCount: 0,
      error: 'Transaction cannot be rolled back'
    }
  END IF

  IF transactionLog.rolledBack THEN
    RETURN {
      success: FALSE,
      rollbackCount: 0,
      error: 'Transaction already rolled back'
    }
  END IF

  rollbackCount ← 0
  failedRollbacks ← []

  // Rollback in reverse order
  operations ← transactionLog.operations.reverse()

  FOR EACH op IN operations DO
    // Only rollback successful operations
    IF NOT op.success THEN
      CONTINUE
    END IF

    TRY
      SWITCH op.operation
        CASE 'delete':
          // Restore deleted item
          RestoreItem(op.itemId, op.previousState)

        CASE 'addTags':
          // Remove added tags
          RemoveTagsFromItem(op.itemId, op.addedTags)

        CASE 'updateRating':
          // Restore previous rating
          UpdateItemRating(op.itemId, op.previousRating)

        CASE 'archive':
          // Unarchive item
          UnarchiveItem(op.itemId)

        DEFAULT:
          // Generic rollback
          RestoreItemState(op.itemId, op.previousState)
      END SWITCH

      rollbackCount += 1

    CATCH error
      failedRollbacks.push({
        itemId: op.itemId,
        error: error.message
      })
      LogError('Rollback failed for item: ' + op.itemId, error)
    END TRY
  END FOR

  // Mark transaction as rolled back
  transactionLog.rolledBack ← TRUE
  UpdateTransactionLog(transactionLog)

  RETURN {
    success: failedRollbacks.length == 0,
    rollbackCount: rollbackCount,
    failedRollbacks: failedRollbacks
  }
END

ALGORITHM: CreateBatchTransaction
INPUT: operation (BatchOperation)
OUTPUT: transactionLog (BatchTransactionLog)

BEGIN
  transactionLog ← {
    transactionId: GenerateUUID(),
    operations: [],
    canRollback: operation.undoable,
    rolledBack: FALSE,
    timestamp: CurrentTimestamp()
  }

  SaveTransactionLog(transactionLog)

  RETURN transactionLog
END

SUBROUTINE: LogOperation
INPUT: transactionLog (BatchTransactionLog), itemId (STRING),
       operation (STRING), success (BOOLEAN), previousState (Object)
OUTPUT: void

BEGIN
  transactionLog.operations.push({
    itemId: itemId,
    operation: operation,
    timestamp: CurrentTimestamp(),
    success: success,
    previousState: previousState
  })

  UpdateTransactionLog(transactionLog)
END
```

### 6. Validation and Confirmation

```
ALGORITHM: ValidateBatchOperation
INPUT: operation (BatchOperation)
OUTPUT: result ({valid: BOOLEAN, error: STRING | NULL})

BEGIN
  // Check if there are items to process
  IF operation.targetItems.size == 0 THEN
    RETURN {valid: FALSE, error: 'No items selected'}
  END IF

  // Validate based on operation type
  SWITCH operation.type
    CASE 'delete':
      // Check if any items are referenced by experiences
      referencedItems ← CheckExperienceReferences(operation.targetItems)
      IF referencedItems.size > 0 THEN
        RETURN {
          valid: FALSE,
          error: referencedItems.size + ' items have experiences. Delete experiences first.'
        }
      END IF

    CASE 'addTags':
      IF NOT operation.parameters OR NOT operation.parameters.tags THEN
        RETURN {valid: FALSE, error: 'No tags specified'}
      END IF
      IF operation.parameters.tags.length == 0 THEN
        RETURN {valid: FALSE, error: 'No tags specified'}
      END IF

    CASE 'updateRating':
      IF NOT operation.parameters OR operation.parameters.value == NULL THEN
        RETURN {valid: FALSE, error: 'No rating value specified'}
      END IF
      IF operation.parameters.value < 1 OR operation.parameters.value > 10 THEN
        RETURN {valid: FALSE, error: 'Rating must be between 1 and 10'}
      END IF
  END SWITCH

  RETURN {valid: TRUE, error: NULL}
END

ALGORITHM: ShowConfirmationDialog
INPUT: operation (BatchOperation)
OUTPUT: confirmed (BOOLEAN)

BEGIN
  message ← GenerateConfirmationMessage(operation)

  result ← AWAIT ShowDialog({
    title: 'Confirm Batch Operation',
    message: message,
    buttons: [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Confirm', style: 'destructive'}
    ]
  })

  RETURN result == 'Confirm'
END

SUBROUTINE: GenerateConfirmationMessage
INPUT: operation (BatchOperation)
OUTPUT: message (STRING)

BEGIN
  count ← operation.targetItems.size

  SWITCH operation.type
    CASE 'delete':
      message ← 'Are you sure you want to delete ' + count + ' cider(s)? This action can be undone within 30 minutes.'

    CASE 'updateRating':
      message ← 'Update rating for ' + count + ' cider(s)?'

    CASE 'archive':
      message ← 'Archive ' + count + ' cider(s)?'

    DEFAULT:
      message ← 'Perform this operation on ' + count + ' cider(s)?'
  END SWITCH

  RETURN message
END
```

## Edge Cases

### 1. Selection While Filtering
```
CASE: User selects items then applies filter
SOLUTION: Maintain selection state, show selected count even if filtered out
IMPLEMENTATION: Track selection separately from visible items
```

### 2. Operation on Deleted Item
```
CASE: Item deleted between selection and operation
SOLUTION: Skip deleted items, report in errors
IMPLEMENTATION: Check item existence before processing
```

### 3. Concurrent Operations
```
CASE: Multiple batch operations running
SOLUTION: Queue operations, prevent concurrent execution
IMPLEMENTATION: Use operation queue with single executor
```

### 4. Undo Expired
```
CASE: User tries to undo after 30 minutes
SOLUTION: Show error message, clear expired undo data
IMPLEMENTATION: Check expiration before undo
```

### 5. All Items Selected Then Filtered
```
CASE: Select all → apply filter → items hidden
SOLUTION: Maintain "select all" state, track exclusions
IMPLEMENTATION: Use selectAll + excludedItems pattern
```

### 6. Memory Pressure During Large Operation
```
CASE: Batch operation on 5000+ items causes memory issues
SOLUTION: Process in chunks, force GC periodically
IMPLEMENTATION: Chunk size of 100, GC every 500 items
```

## Performance Considerations

### Time Complexity
| Operation | Complexity | Notes |
|-----------|------------|-------|
| Toggle selection | O(1) | Hash set operations |
| Select all | O(1) | Flag-based |
| Get selected IDs | O(n) | Only if selectAll = true |
| Batch process | O(n * c) | c = per-item complexity |
| Undo | O(n) | Restore n items |

### Space Complexity
| Component | Complexity | Notes |
|-----------|------------|-------|
| Selection state | O(m) | m = selected/excluded count |
| Undo data | O(n * s) | s = state size per item |
| Progress tracking | O(1) | Fixed size |

### Optimization Strategies
- ✅ Use SET for O(1) selection checks
- ✅ Chunk processing to prevent UI blocking
- ✅ Yield to main thread every 10 items
- ✅ Lazy evaluation of selected IDs
- ✅ Limit undo stack to 10 operations
- ✅ Expire undo data after 30 minutes
- ✅ Progress callbacks throttled to 60fps

## Validation Examples

### Example 1: Pre-Validation Catches Issues

```
INPUT: Batch delete 5 ciders

PRE-VALIDATION RESULTS:
- Cider 1: ✓ OK
- Cider 2: ⚠ Warning - Has 3 experiences
- Cider 3: ✗ Error - Item is protected
- Cider 4: ✓ OK
- Cider 5: ⚠ Warning - Has 1 experience

VALIDATION RESULT:
  valid: FALSE
  issues: [{itemId: 'cider3', error: 'Item is protected'}]
  warnings: [
    {itemId: 'cider2', warning: 'Has 3 experiences'},
    {itemId: 'cider5', warning: 'Has 1 experience'}
  ]

ACTION: Show error dialog, block operation
```

### Example 2: Cancellation During Processing

```
SCENARIO: User batch deletes 100 ciders, cancels after 50

PROGRESS:
1. Start batch operation
2. Process items 1-50 successfully
3. User clicks "Cancel" button
4. Cancellation token set to isCancelled = TRUE
5. Current item (51) completes
6. Loop detects cancellation
7. Return partial result

RESULT:
  success: FALSE
  successCount: 50
  failedCount: 0
  errors: [{
    itemId: 'cancellation',
    error: 'Operation cancelled after processing 50 of 100 items'
  }]

UNDO TOKEN: Available for processed items (1-50)
```

### Example 3: Transaction Rollback on Critical Failure

```
SCENARIO: Batch update fails critically mid-operation

TRANSACTION LOG:
  Item 1: Updated successfully
  Item 2: Updated successfully
  Item 3: CRITICAL ERROR - Database corruption detected
  Items 4-10: Not processed

ROLLBACK PROCESS:
1. Detect critical failure
2. Initiate rollback
3. Reverse Item 2: Restore previous state ✓
4. Reverse Item 1: Restore previous state ✓
5. Mark transaction as rolled back

FINAL STATE: All items restored to original state
```

## Testing Approach

### Unit Tests
```
TEST: Selection Management
  - Toggle single item
  - Select all items
  - Clear selection
  - Get selected IDs (normal and selectAll modes)
  - Calculate selection count

TEST: Batch Operations
  - Process empty selection
  - Process single item
  - Process multiple items
  - Handle errors gracefully
  - Track progress correctly
  - Cancellation support
  - Transaction rollback

TEST: Undo System
  - Save undo data
  - Retrieve undo data
  - Undo operation
  - Expired undo data
  - Undo stack limit

TEST: Pre-Validation
  - Detect missing items
  - Detect protected items
  - Warn about dependencies
  - Validate operation parameters
  - Handle edge cases
```

### Integration Tests
```
TEST: End-to-End Batch Operations
  - Select items → delete → undo
  - Select all → add tags → verify
  - Filtered selection → batch update
  - Large batch (100+ items) performance
  - Cancelled operation recovery
  - Transaction rollback on failure
```

### Performance Tests
```
TEST: Large Batch Performance
  - 100 items: < 2s
  - 500 items: < 8s
  - 1000 items: < 15s
  - UI remains responsive during processing
  - Cancellation response time < 500ms
```

---

**Complexity Analysis**: Batch operations are O(n) per item, with chunking to maintain UI responsiveness. Pre-validation adds O(n) upfront but prevents errors. Undo data limited to prevent memory issues.

**Memory Safety**: Undo data expires after 30 minutes and stack limited to 10 operations, preventing unbounded growth. Transaction logs cleaned up after 7 days.

**Cancellation**: Users can cancel at any time with response time < 500ms. Partial results preserved with undo support.

**Recommendation**: Always run pre-validation before batch operations. Process large batches (>500 items) in background with progress UI. Offer cancellation for long-running operations. Use transaction logs for critical operations.
