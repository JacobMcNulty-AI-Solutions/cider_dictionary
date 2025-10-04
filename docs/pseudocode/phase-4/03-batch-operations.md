# Batch Operations System

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

### 2. Batch Operation Executor

```
ALGORITHM: ExecuteBatchOperation
INPUT: operation (BatchOperation), progressCallback (FUNCTION)
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

  // Validate operation
  validationResult ← ValidateBatchOperation(operation)
  IF NOT validationResult.valid THEN
    result.success ← FALSE
    result.errors.push({
      itemId: 'validation',
      error: validationResult.error
    })
    RETURN result
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

    // Allow cancellation check points
    IF ShouldCancelBatchOperation() THEN
      progressCallback({
        status: 'cancelled',
        progress: progress
      })
      result.success ← FALSE
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

### 5. Validation and Confirmation

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

TEST: Undo System
  - Save undo data
  - Retrieve undo data
  - Undo operation
  - Expired undo data
  - Undo stack limit
```

### Integration Tests
```
TEST: End-to-End Batch Operations
  - Select items → delete → undo
  - Select all → add tags → verify
  - Filtered selection → batch update
  - Large batch (100+ items) performance
```

### Performance Tests
```
TEST: Large Batch Performance
  - 100 items: < 2s
  - 500 items: < 8s
  - 1000 items: < 15s
  - UI remains responsive during processing
```

---

**Complexity Analysis**: Batch operations are O(n) per item, with chunking to maintain UI responsiveness. Undo data limited to prevent memory issues.

**Memory Safety**: Undo data expires after 30 minutes and stack limited to 10 operations, preventing unbounded growth.

**Recommendation**: Process large batches (>500 items) in background with progress UI. Offer cancellation for long-running operations.
