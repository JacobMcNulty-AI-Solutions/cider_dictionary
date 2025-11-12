# Data Export System

## REFINEMENT NOTES

**Version**: 2.0
**Date Refined**: 2025-10-04
**Methodology**: SPARC Refinement Phase

### Changes Made:
- Added cancellation support for all export operations
- Implemented resumable export with checkpoint system
- Added progress persistence for interrupted exports
- Implemented streaming export for large datasets (5000+ ciders)
- Added export queue to prevent concurrent operations
- Enhanced error recovery with automatic resume capability
- Added export integrity validation
- Implemented disk space checking before export

### New Algorithms Added:
- `CancellableExport` - Support cancellation at any stage
- `ResumeExport` - Resume from checkpoint after interruption
- `StreamingJSONExport` - Memory-efficient streaming for large exports
- `ValidateExportIntegrity` - Verify export completeness
- `RecoverFromExportFailure` - Automatic recovery with retry logic

### Performance Improvements:
- Streaming reduces memory from 200MB+ to <100MB for large exports
- Checkpoint system prevents data loss on interruption
- Queue system prevents concurrent export conflicts
- Disk space validation prevents mid-export failures

---

## Purpose

Implements a comprehensive data export system supporting JSON and CSV formats with optional compression, date range filtering, selective data inclusion, cancellation support, and resumable exports. Designed for data portability, backup, and external analysis with robust error handling.

## Data Structures

### Export Configuration
```typescript
INTERFACE ExportOptions:
  // Format selection
  format: ENUM('json', 'csv')

  // Data inclusion flags
  includeImages: BOOLEAN
  includeExperiences: BOOLEAN
  includeVenues: BOOLEAN
  includeAnalytics: BOOLEAN

  // Filtering options
  dateRange: {
    start: DATE | NULL
    end: DATE | NULL
  }
  selectedCiders: ARRAY<STRING> | NULL // NULL = all ciders

  // Output options
  compression: BOOLEAN
  prettyPrint: BOOLEAN // JSON only
  delimiter: STRING    // CSV only, default ','
  includeHeaders: BOOLEAN // CSV only

  // Metadata
  exportName: STRING | NULL // Custom filename
  includeMetadata: BOOLEAN  // Export timestamp, version, etc.

  // Cancellation and resumability
  cancellationToken: CancellationToken | NULL
  resumeFromCheckpoint: BOOLEAN
  checkpointId: STRING | NULL
  streaming: BOOLEAN // For large datasets
```

### Export Cancellation Token
```typescript
INTERFACE ExportCancellationToken:
  cancelled: BOOLEAN
  reason: STRING | NULL
  timestamp: TIMESTAMP

  cancel: FUNCTION(reason: STRING)
  isCancelled: FUNCTION() → BOOLEAN
  throwIfCancelled: FUNCTION()
```

### Export Checkpoint
```typescript
INTERFACE ExportCheckpoint:
  checkpointId: STRING
  timestamp: TIMESTAMP
  stage: ENUM('gathering', 'formatting', 'writing', 'compressing')
  progress: NUMBER // 0-100
  lastProcessedIndex: NUMBER
  options: ExportOptions
  partialData: {
    ciders: ARRAY<CiderMasterRecord>
    experiences: ARRAY<ExperienceLog>
    venues: ARRAY<ConsolidatedVenue>
  }
  filePath: STRING | NULL
  expiresAt: TIMESTAMP // 1 hour
```

### Export Queue
```typescript
INTERFACE ExportQueue:
  queue: ARRAY<QueuedExport>
  currentExport: QueuedExport | NULL
  maxConcurrent: NUMBER // 1 (only one export at a time)

INTERFACE QueuedExport:
  id: STRING
  options: ExportOptions
  status: ENUM('pending', 'processing', 'completed', 'failed', 'cancelled')
  addedAt: TIMESTAMP
  startedAt: TIMESTAMP | NULL
  completedAt: TIMESTAMP | NULL
  result: ExportResult | NULL
```

### Streaming Export Config
```typescript
INTERFACE StreamingExportConfig:
  chunkSize: NUMBER // Items per chunk, default 100
  flushInterval: NUMBER // ms between flushes, default 100
  maxMemory: NUMBER // bytes, default 100MB
  onProgress: FUNCTION(chunksProcessed: NUMBER, totalChunks: NUMBER)
```

### Export Result
```typescript
INTERFACE ExportResult:
  success: BOOLEAN
  filePath: STRING | NULL
  fileSize: NUMBER // bytes
  recordCount: {
    ciders: NUMBER
    experiences: NUMBER
    venues: NUMBER
  }
  exportTime: NUMBER // milliseconds
  error: STRING | NULL
```

### Export Progress
```typescript
INTERFACE ExportProgress:
  stage: ENUM('gathering', 'formatting', 'writing', 'compressing', 'complete')
  progress: NUMBER // 0-100
  currentItem: NUMBER
  totalItems: NUMBER
  message: STRING
  cancellable: BOOLEAN
```

### JSON Export Structure
```typescript
INTERFACE JSONExportData:
  metadata: {
    exportDate: TIMESTAMP
    appVersion: STRING
    dataVersion: NUMBER
    exportOptions: ExportOptions
  }
  ciders: ARRAY<CiderMasterRecord>
  experiences: ARRAY<ExperienceLog> | NULL
  venues: ARRAY<ConsolidatedVenue> | NULL
  analytics: AnalyticsSummary | NULL
```

### CSV Export Structure
```typescript
INTERFACE CSVExportData:
  cidersCSV: STRING
  experiencesCSV: STRING | NULL
  venuesCSV: STRING | NULL
  analyticsCSV: STRING | NULL
```

## Core Algorithms

### 1. Main Export Orchestrator

```
ALGORITHM: ExportData
INPUT: options (ExportOptions), progressCallback (FUNCTION)
OUTPUT: result (ExportResult)

TIME COMPLEXITY: O(n + e + v) where n=ciders, e=experiences, v=venues
SPACE COMPLEXITY: O(n + e + v) for data storage during export

BEGIN
  startTime ← CurrentTimestamp()
  result ← NEW ExportResult()

  TRY
    // STAGE 1: Data Gathering
    progressCallback({
      stage: 'gathering',
      progress: 0,
      message: 'Gathering data...'
    })

    exportData ← GatherExportData(options, progressCallback)

    // STAGE 2: Format Conversion
    progressCallback({
      stage: 'formatting',
      progress: 40,
      message: 'Converting to ' + options.format + '...'
    })

    formattedData ← NULL
    SWITCH options.format
      CASE 'json':
        formattedData ← ConvertToJSON(exportData, options)
      CASE 'csv':
        formattedData ← ConvertToCSV(exportData, options)
      DEFAULT:
        THROW Error('Unsupported export format: ' + options.format)
    END SWITCH

    // STAGE 3: Compression (optional)
    IF options.compression THEN
      progressCallback({
        stage: 'compressing',
        progress: 70,
        message: 'Compressing data...'
      })

      formattedData ← CompressData(formattedData, options.format)
    END IF

    // STAGE 4: File Writing
    progressCallback({
      stage: 'writing',
      progress: 85,
      message: 'Writing file...'
    })

    filePath ← WriteToFile(formattedData, options)

    // STAGE 5: Complete
    progressCallback({
      stage: 'complete',
      progress: 100,
      message: 'Export complete!'
    })

    result.success ← TRUE
    result.filePath ← filePath
    result.fileSize ← GetFileSize(filePath)
    result.recordCount ← {
      ciders: exportData.ciders.length,
      experiences: exportData.experiences?.length || 0,
      venues: exportData.venues?.length || 0
    }
    result.exportTime ← CurrentTimestamp() - startTime

  CATCH error
    result.success ← FALSE
    result.error ← error.message
    Log('Export failed', error)
  END TRY

  RETURN result
END
```

### 2. Data Gathering

```
ALGORITHM: GatherExportData
INPUT: options (ExportOptions), progressCallback (FUNCTION)
OUTPUT: exportData (Object)

TIME COMPLEXITY: O(n + e + v)
SPACE COMPLEXITY: O(n + e + v)

BEGIN
  exportData ← {
    ciders: [],
    experiences: NULL,
    venues: NULL,
    analytics: NULL
  }

  // Gather ciders
  IF options.selectedCiders != NULL THEN
    // Export only selected ciders
    exportData.ciders ← GetCidersByIds(options.selectedCiders)
  ELSE
    // Export all ciders
    exportData.ciders ← GetAllCiders()
  END IF

  // Apply date range filter to ciders
  IF options.dateRange.start OR options.dateRange.end THEN
    exportData.ciders ← FilterByDateRange(
      exportData.ciders,
      options.dateRange.start,
      options.dateRange.end
    )
  END IF

  progressCallback({
    stage: 'gathering',
    progress: 15,
    currentItem: exportData.ciders.length,
    totalItems: exportData.ciders.length,
    message: 'Gathered ' + exportData.ciders.length + ' ciders'
  })

  // Gather experiences
  IF options.includeExperiences THEN
    ciderIds ← exportData.ciders.map(c => c.id)
    exportData.experiences ← GetExperiencesByCiderIds(ciderIds)

    // Apply date range to experiences
    IF options.dateRange.start OR options.dateRange.end THEN
      exportData.experiences ← FilterExperiencesByDateRange(
        exportData.experiences,
        options.dateRange.start,
        options.dateRange.end
      )
    END IF

    progressCallback({
      stage: 'gathering',
      progress: 25,
      message: 'Gathered ' + exportData.experiences.length + ' experiences'
    })
  END IF

  // Gather venues
  IF options.includeVenues THEN
    // Extract unique venue IDs from ciders and experiences
    venueIds ← NEW SET<STRING>()

    FOR EACH cider IN exportData.ciders DO
      IF cider.venue EXISTS THEN
        venueIds.add(cider.venue.id)
      END IF
    END FOR

    IF exportData.experiences != NULL THEN
      FOR EACH exp IN exportData.experiences DO
        venueIds.add(exp.venue.id)
      END FOR
    END IF

    exportData.venues ← GetVenuesByIds(Array.from(venueIds))

    progressCallback({
      stage: 'gathering',
      progress: 35,
      message: 'Gathered ' + exportData.venues.length + ' venues'
    })
  END IF

  // Gather analytics
  IF options.includeAnalytics THEN
    exportData.analytics ← CalculateAnalyticsSummary(
      exportData.ciders,
      exportData.experiences
    )

    progressCallback({
      stage: 'gathering',
      progress: 40,
      message: 'Calculated analytics'
    })
  END IF

  RETURN exportData
END

SUBROUTINE: FilterByDateRange
INPUT: ciders (ARRAY<CiderMasterRecord>), startDate (DATE | NULL), endDate (DATE | NULL)
OUTPUT: filtered (ARRAY<CiderMasterRecord>)

BEGIN
  IF startDate == NULL AND endDate == NULL THEN
    RETURN ciders
  END IF

  filtered ← []

  FOR EACH cider IN ciders DO
    ciderDate ← cider.createdAt

    include ← TRUE

    IF startDate != NULL AND ciderDate < startDate THEN
      include ← FALSE
    END IF

    IF endDate != NULL AND ciderDate > endDate THEN
      include ← FALSE
    END IF

    IF include THEN
      filtered.push(cider)
    END IF
  END FOR

  RETURN filtered
END
```

### 3. Cancellable Export with Checkpoints

```
ALGORITHM: CancellableExport
INPUT: options (ExportOptions), progressCallback (FUNCTION)
OUTPUT: result (ExportResult)

TIME COMPLEXITY: O(n + e + v) where n=ciders, e=experiences, v=venues
SPACE COMPLEXITY: O(n + e + v) for data storage

BEGIN
  startTime ← CurrentTimestamp()
  result ← NEW ExportResult()
  cancellationToken ← options.cancellationToken || CreateCancellationToken()

  // Check for existing checkpoint if resuming
  IF options.resumeFromCheckpoint AND options.checkpointId != NULL THEN
    checkpoint ← LoadCheckpoint(options.checkpointId)
    IF checkpoint != NULL AND NOT CheckpointExpired(checkpoint) THEN
      RETURN ResumeExport(checkpoint, options, progressCallback, cancellationToken)
    END IF
  END IF

  // Check disk space before starting
  requiredSpace ← EstimateExportSize(options)
  availableSpace ← GetAvailableDiskSpace()
  IF availableSpace < requiredSpace * 1.2 THEN // 20% buffer
    THROW Error('Insufficient disk space. Need ' + FormatBytes(requiredSpace) +
                ', have ' + FormatBytes(availableSpace))
  END IF

  checkpointId ← GenerateUUID()

  TRY
    // STAGE 1: Data Gathering (with cancellation checks)
    progressCallback({stage: 'gathering', progress: 0, cancellable: TRUE})
    CheckCancellation(cancellationToken)

    exportData ← GatherExportDataCancellable(options, progressCallback, cancellationToken)

    // Save checkpoint after gathering
    SaveCheckpoint({
      checkpointId: checkpointId,
      stage: 'gathering',
      progress: 40,
      lastProcessedIndex: 0,
      options: options,
      partialData: exportData,
      expiresAt: CurrentTimestamp() + 3600000 // 1 hour
    })

    // STAGE 2: Format Conversion
    CheckCancellation(cancellationToken)
    progressCallback({stage: 'formatting', progress: 40, cancellable: TRUE})

    formattedData ← NULL
    SWITCH options.format
      CASE 'json':
        IF ShouldUseStreaming(exportData, options) THEN
          formattedData ← StreamingJSONExport(exportData, options, cancellationToken)
        ELSE
          formattedData ← ConvertToJSON(exportData, options)
        END IF
      CASE 'csv':
        formattedData ← ConvertToCSV(exportData, options)
    END SWITCH

    // STAGE 3: Compression (optional)
    IF options.compression THEN
      CheckCancellation(cancellationToken)
      progressCallback({stage: 'compressing', progress: 70, cancellable: TRUE})
      formattedData ← CompressData(formattedData, options.format)
    END IF

    // STAGE 4: File Writing
    CheckCancellation(cancellationToken)
    progressCallback({stage: 'writing', progress: 85, cancellable: TRUE})

    filePath ← WriteToFile(formattedData, options)

    // STAGE 5: Validate integrity
    IF NOT ValidateExportIntegrity(filePath, exportData) THEN
      THROW Error('Export integrity validation failed')
    END IF

    // Complete
    progressCallback({stage: 'complete', progress: 100, cancellable: FALSE})

    result.success ← TRUE
    result.filePath ← filePath
    result.fileSize ← GetFileSize(filePath)
    result.recordCount ← {
      ciders: exportData.ciders.length,
      experiences: exportData.experiences?.length || 0,
      venues: exportData.venues?.length || 0
    }
    result.exportTime ← CurrentTimestamp() - startTime

    // Clean up checkpoint on success
    DeleteCheckpoint(checkpointId)

  CATCH CancelledException
    // Save checkpoint for later resume
    SaveCheckpoint({
      checkpointId: checkpointId,
      stage: currentStage,
      progress: currentProgress,
      lastProcessedIndex: lastIndex,
      options: options,
      partialData: exportData,
      expiresAt: CurrentTimestamp() + 3600000
    })

    result.success ← FALSE
    result.error ← 'Export cancelled by user'
    result.checkpointId ← checkpointId
    Log('Export cancelled, checkpoint saved: ' + checkpointId)

  CATCH error
    result.success ← FALSE
    result.error ← error.message

    // Try to recover
    IF CanRecover(error) THEN
      recoveryResult ← RecoverFromExportFailure(checkpoint, options, error)
      IF recoveryResult.success THEN
        RETURN recoveryResult
      END IF
    END IF

    Log('Export failed', error)
  END TRY

  RETURN result
END

ALGORITHM: ResumeExport
INPUT: checkpoint (ExportCheckpoint), options (ExportOptions),
       progressCallback (FUNCTION), cancellationToken (CancellationToken)
OUTPUT: result (ExportResult)

BEGIN
  Log('Resuming export from checkpoint: ' + checkpoint.checkpointId)

  progressCallback({
    stage: 'resuming',
    progress: checkpoint.progress,
    message: 'Resuming export from ' + checkpoint.stage + '...'
  })

  // Continue from where we left off
  exportData ← checkpoint.partialData

  TRY
    SWITCH checkpoint.stage
      CASE 'gathering':
        // Re-gather any missing data
        exportData ← CompleteDat Gathering(exportData, options, progressCallback, cancellationToken)

      CASE 'formatting':
        // Continue with formatting
        formattedData ← ConvertToJSON(exportData, options)
        // Continue to writing...

      CASE 'writing':
        // Re-attempt write
        filePath ← WriteToFile(checkpoint.partialData, options)

      CASE 'compressing':
        // Re-compress
        formattedData ← CompressData(checkpoint.partialData, options.format)
    END SWITCH

    // Complete the export
    result ← FinalizeExport(exportData, options, progressCallback)

    // Clean up checkpoint
    DeleteCheckpoint(checkpoint.checkpointId)

    RETURN result

  CATCH error
    THROW Error('Failed to resume export: ' + error.message)
  END TRY
END

SUBROUTINE: CheckCancellation
INPUT: cancellationToken (CancellationToken)
OUTPUT: void (throws if cancelled)

BEGIN
  IF cancellationToken != NULL AND cancellationToken.isCancelled() THEN
    THROW CancelledException('Export cancelled: ' + cancellationToken.reason)
  END IF
END

SUBROUTINE: ShouldUseStreaming
INPUT: exportData (Object), options (ExportOptions)
OUTPUT: shouldStream (BOOLEAN)

BEGIN
  // Use streaming for large datasets to avoid memory issues
  totalItems ← exportData.ciders.length +
               (exportData.experiences?.length || 0) +
               (exportData.venues?.length || 0)

  // Stream if > 5000 items or explicit streaming requested
  shouldStream ← totalItems > 5000 OR options.streaming == TRUE

  RETURN shouldStream
END
```

### 4. Streaming JSON Export

```
ALGORITHM: StreamingJSONExport
INPUT: exportData (Object), options (ExportOptions),
       cancellationToken (CancellationToken)
OUTPUT: filePath (STRING)

TIME COMPLEXITY: O(n) with constant memory overhead
SPACE COMPLEXITY: O(chunk_size) instead of O(n)

BEGIN
  filePath ← GenerateFilePath(options)
  stream ← CreateWriteStream(filePath)
  config ← {
    chunkSize: 100,
    flushInterval: 100,
    maxMemory: 100 * 1024 * 1024 // 100MB
  }

  TRY
    // Write opening metadata
    stream.write('{\n')
    stream.write('  "metadata": ')
    stream.write(JSON.stringify({
      exportDate: CurrentTimestamp().toISOString(),
      appVersion: GetAppVersion(),
      dataVersion: 1
    }))
    stream.write(',\n')

    // Stream ciders in chunks
    stream.write('  "ciders": [\n')
    totalCiders ← exportData.ciders.length

    FOR i ← 0 TO totalCiders - 1 STEP config.chunkSize DO
      CheckCancellation(cancellationToken)

      chunk ← exportData.ciders.slice(i, i + config.chunkSize)

      FOR j ← 0 TO chunk.length - 1 DO
        cider ← SerializeCiderForJSON(chunk[j], options)
        stream.write('    ' + JSON.stringify(cider))

        IF NOT (i + j == totalCiders - 1) THEN
          stream.write(',\n')
        ELSE
          stream.write('\n')
        END IF
      END FOR

      // Flush periodically
      IF i % (config.chunkSize * 5) == 0 THEN
        stream.flush()

        // Allow GC between chunks
        IF global.gc != NULL THEN
          global.gc()
        END IF
      END IF
    END FOR

    stream.write('  ]')

    // Stream experiences if included
    IF exportData.experiences != NULL THEN
      CheckCancellation(cancellationToken)
      stream.write(',\n  "experiences": [\n')

      totalExps ← exportData.experiences.length
      FOR i ← 0 TO totalExps - 1 STEP config.chunkSize DO
        CheckCancellation(cancellationToken)
        chunk ← exportData.experiences.slice(i, i + config.chunkSize)

        FOR j ← 0 TO chunk.length - 1 DO
          exp ← SerializeExperienceForJSON(chunk[j])
          stream.write('    ' + JSON.stringify(exp))

          IF NOT (i + j == totalExps - 1) THEN
            stream.write(',\n')
          ELSE
            stream.write('\n')
          END IF
        END FOR

        stream.flush()
      END FOR

      stream.write('  ]')
    END IF

    // Close JSON
    stream.write('\n}\n')
    stream.end()

    Log('Streaming export completed: ' + filePath)
    RETURN filePath

  CATCH error
    stream.close()
    DeleteFile(filePath) // Clean up partial file
    THROW error
  END TRY
END
```

### 5. Export Integrity Validation

```
ALGORITHM: ValidateExportIntegrity
INPUT: filePath (STRING), originalData (Object)
OUTPUT: isValid (BOOLEAN)

TIME COMPLEXITY: O(n) for validation scan
SPACE COMPLEXITY: O(1) for streaming validation

BEGIN
  TRY
    // Check file exists and is readable
    IF NOT FileExists(filePath) THEN
      Log('Validation failed: File does not exist')
      RETURN FALSE
    END IF

    fileSize ← GetFileSize(filePath)
    IF fileSize == 0 THEN
      Log('Validation failed: File is empty')
      RETURN FALSE
    END IF

    // Verify file is valid JSON or CSV
    IF filePath.endsWith('.json') OR filePath.endsWith('.json.gz') THEN
      // Try to parse JSON
      content ← ReadFile(filePath)
      IF filePath.endsWith('.gz') THEN
        content ← DecompressData(content)
      END IF

      parsed ← JSON.parse(content)

      // Verify structure
      IF NOT parsed.metadata OR NOT parsed.ciders THEN
        Log('Validation failed: Missing required fields')
        RETURN FALSE
      END IF

      // Verify counts match
      IF parsed.ciders.length != originalData.ciders.length THEN
        Log('Validation failed: Cider count mismatch. ' +
            'Expected ' + originalData.ciders.length + ', got ' + parsed.ciders.length)
        RETURN FALSE
      END IF

      IF originalData.experiences != NULL THEN
        IF parsed.experiences.length != originalData.experiences.length THEN
          Log('Validation failed: Experience count mismatch')
          RETURN FALSE
        END IF
      END IF

    ELSE IF filePath.endsWith('.csv') THEN
      // Validate CSV structure
      content ← ReadFile(filePath)
      lines ← content.split('\n').filter(line => line.trim().length > 0)

      // Should have at least header + data
      IF lines.length < 2 THEN
        Log('Validation failed: CSV has insufficient rows')
        RETURN FALSE
      END IF

      // Verify row count (rough check)
      dataRows ← lines.length - 1 // Minus header
      IF dataRows < originalData.ciders.length * 0.9 THEN // Allow 10% margin
        Log('Validation failed: CSV row count too low')
        RETURN FALSE
      END IF
    END IF

    Log('Export integrity validated successfully')
    RETURN TRUE

  CATCH error
    Log('Validation error: ' + error.message)
    RETURN FALSE
  END TRY
END
```

### 6. Export Recovery

```
ALGORITHM: RecoverFromExportFailure
INPUT: checkpoint (ExportCheckpoint), options (ExportOptions), error (Error)
OUTPUT: result (ExportResult)

BEGIN
  Log('Attempting to recover from export failure: ' + error.message)

  IF checkpoint.exists THEN
    // Resume from last successful batch
    Log('Resuming from checkpoint at progress ' + checkpoint.progress + '%')

    TRY
      result ← ResumeExport(
        checkpoint,
        options,
        (progress) => Log('Recovery progress: ' + progress.progress + '%'),
        CreateCancellationToken()
      )

      RETURN result

    CATCH recoveryError
      Log('Recovery from checkpoint failed: ' + recoveryError.message)
      // Fall through to retry logic
    END TRY
  END IF

  // Retry with smaller batch size to reduce memory pressure
  IF error.message.includes('memory') OR error.message.includes('space') THEN
    Log('Retrying with streaming enabled')

    modifiedOptions ← Clone(options)
    modifiedOptions.streaming ← TRUE
    modifiedOptions.includeImages ← FALSE // Reduce memory further

    TRY
      result ← CancellableExport(modifiedOptions, (progress) => {
        Log('Retry progress: ' + progress.progress + '%')
      })

      RETURN result

    CATCH retryError
      Log('Retry failed: ' + retryError.message)
    END TRY
  END IF

  // Final fallback: partial export
  result ← {
    success: FALSE,
    error: 'Export failed after recovery attempts: ' + error.message,
    suggestion: 'Try exporting with fewer items or without images'
  }

  RETURN result
END
```

### 7. JSON Export Formatter

```
ALGORITHM: ConvertToJSON
INPUT: exportData (Object), options (ExportOptions)
OUTPUT: jsonString (STRING)

TIME COMPLEXITY: O(n) for serialization
SPACE COMPLEXITY: O(n) for string output

BEGIN
  // Build export structure
  jsonData ← {
    metadata: {
      exportDate: CurrentTimestamp().toISOString(),
      appVersion: GetAppVersion(),
      dataVersion: 1,
      exportOptions: {
        format: options.format,
        includeImages: options.includeImages,
        includeExperiences: options.includeExperiences,
        includeVenues: options.includeVenues,
        dateRange: options.dateRange
      }
    },
    ciders: [],
    experiences: NULL,
    venues: NULL,
    analytics: NULL
  }

  // Process ciders
  FOR EACH cider IN exportData.ciders DO
    processedCider ← SerializeCiderForJSON(cider, options)
    jsonData.ciders.push(processedCider)
  END FOR

  // Process experiences
  IF exportData.experiences != NULL THEN
    jsonData.experiences ← []
    FOR EACH exp IN exportData.experiences DO
      processedExp ← SerializeExperienceForJSON(exp)
      jsonData.experiences.push(processedExp)
    END FOR
  END IF

  // Process venues
  IF exportData.venues != NULL THEN
    jsonData.venues ← []
    FOR EACH venue IN exportData.venues DO
      processedVenue ← SerializeVenueForJSON(venue)
      jsonData.venues.push(processedVenue)
    END FOR
  END IF

  // Include analytics
  IF exportData.analytics != NULL THEN
    jsonData.analytics ← exportData.analytics
  END IF

  // Serialize to JSON string
  IF options.prettyPrint THEN
    jsonString ← JSON.stringify(jsonData, null, 2)
  ELSE
    jsonString ← JSON.stringify(jsonData)
  END IF

  RETURN jsonString
END

SUBROUTINE: SerializeCiderForJSON
INPUT: cider (CiderMasterRecord), options (ExportOptions)
OUTPUT: serialized (Object)

BEGIN
  serialized ← {
    id: cider.id,
    name: cider.name,
    brand: cider.brand,
    abv: cider.abv,
    overallRating: cider.overallRating,
    createdAt: cider.createdAt.toISOString(),
    updatedAt: cider.updatedAt.toISOString()
  }

  // Include photo
  IF options.includeImages AND cider.photo EXISTS THEN
    // Convert image to base64 for portability
    serialized.photo ← ConvertImageToBase64(cider.photo)
  END IF

  // Include optional fields
  IF cider.notes EXISTS THEN
    serialized.notes ← cider.notes
  END IF

  IF cider.traditionalStyle EXISTS THEN
    serialized.traditionalStyle ← cider.traditionalStyle
  END IF

  IF cider.sweetness EXISTS THEN
    serialized.sweetness ← cider.sweetness
  END IF

  IF cider.carbonation EXISTS THEN
    serialized.carbonation ← cider.carbonation
  END IF

  IF cider.clarity EXISTS THEN
    serialized.clarity ← cider.clarity
  END IF

  IF cider.color EXISTS THEN
    serialized.color ← cider.color
  END IF

  IF cider.tasteTags EXISTS THEN
    serialized.tasteTags ← cider.tasteTags
  END IF

  IF cider.appleClassification EXISTS THEN
    serialized.appleClassification ← cider.appleClassification
  END IF

  IF cider.productionMethods EXISTS THEN
    serialized.productionMethods ← cider.productionMethods
  END IF

  IF cider.detailedRatings EXISTS THEN
    serialized.detailedRatings ← cider.detailedRatings
  END IF

  IF cider.venue EXISTS THEN
    serialized.venue ← {
      id: cider.venue.id,
      name: cider.venue.name,
      type: cider.venue.type
    }
  END IF

  RETURN serialized
END

SUBROUTINE: SerializeExperienceForJSON
INPUT: experience (ExperienceLog)
OUTPUT: serialized (Object)

BEGIN
  serialized ← {
    id: experience.id,
    ciderId: experience.ciderId,
    date: experience.date.toISOString(),
    venue: {
      id: experience.venue.id,
      name: experience.venue.name,
      type: experience.venue.type
    },
    price: experience.price,
    containerSize: experience.containerSize,
    containerType: experience.containerType,
    pricePerPint: experience.pricePerPint,
    createdAt: experience.createdAt.toISOString(),
    updatedAt: experience.updatedAt.toISOString()
  }

  // Include optional fields
  IF experience.notes EXISTS THEN
    serialized.notes ← experience.notes
  END IF

  IF experience.rating EXISTS THEN
    serialized.rating ← experience.rating
  END IF

  IF experience.weatherConditions EXISTS THEN
    serialized.weatherConditions ← experience.weatherConditions
  END IF

  IF experience.companionType EXISTS THEN
    serialized.companionType ← experience.companionType
  END IF

  IF experience.venue.location EXISTS THEN
    serialized.venue.location ← {
      latitude: experience.venue.location.latitude,
      longitude: experience.venue.location.longitude
    }
  END IF

  RETURN serialized
END
```

### 4. CSV Export Formatter

```
ALGORITHM: ConvertToCSV
INPUT: exportData (Object), options (ExportOptions)
OUTPUT: csvString (STRING)

TIME COMPLEXITY: O(n * f) where f = number of fields
SPACE COMPLEXITY: O(n)

BEGIN
  csvSections ← []

  // Add metadata header
  IF options.includeMetadata THEN
    metadataCSV ← GenerateMetadataSection(options)
    csvSections.push(metadataCSV)
    csvSections.push('\n\n')
  END IF

  // Convert ciders to CSV
  cidersCSV ← ConvertCidersToCSV(exportData.ciders, options)
  csvSections.push('# CIDERS\n')
  csvSections.push(cidersCSV)

  // Convert experiences to CSV
  IF exportData.experiences != NULL THEN
    csvSections.push('\n\n# EXPERIENCES\n')
    experiencesCSV ← ConvertExperiencesToCSV(exportData.experiences, options)
    csvSections.push(experiencesCSV)
  END IF

  // Convert venues to CSV
  IF exportData.venues != NULL THEN
    csvSections.push('\n\n# VENUES\n')
    venuesCSV ← ConvertVenuesToCSV(exportData.venues, options)
    csvSections.push(venuesCSV)
  END IF

  // Convert analytics to CSV
  IF exportData.analytics != NULL THEN
    csvSections.push('\n\n# ANALYTICS\n')
    analyticsCSV ← ConvertAnalyticsToCSV(exportData.analytics, options)
    csvSections.push(analyticsCSV)
  END IF

  csvString ← csvSections.join('')

  RETURN csvString
END

SUBROUTINE: ConvertCidersToCSV
INPUT: ciders (ARRAY<CiderMasterRecord>), options (ExportOptions)
OUTPUT: csv (STRING)

BEGIN
  // Define column headers
  headers ← [
    'ID', 'Name', 'Brand', 'ABV', 'Overall Rating',
    'Traditional Style', 'Sweetness', 'Carbonation', 'Clarity', 'Color',
    'Taste Tags', 'Notes', 'Has Photo', 'Created At', 'Updated At'
  ]

  rows ← []

  // Add headers
  IF options.includeHeaders THEN
    headerRow ← headers.map(h => EscapeCSVField(h, options.delimiter))
    rows.push(headerRow.join(options.delimiter))
  END IF

  // Add data rows
  FOR EACH cider IN ciders DO
    row ← [
      EscapeCSVField(cider.id, options.delimiter),
      EscapeCSVField(cider.name, options.delimiter),
      EscapeCSVField(cider.brand, options.delimiter),
      cider.abv.toString(),
      cider.overallRating.toString(),
      EscapeCSVField(cider.traditionalStyle || '', options.delimiter),
      EscapeCSVField(cider.sweetness || '', options.delimiter),
      EscapeCSVField(cider.carbonation || '', options.delimiter),
      EscapeCSVField(cider.clarity || '', options.delimiter),
      EscapeCSVField(cider.color || '', options.delimiter),
      EscapeCSVField(cider.tasteTags?.join(';') || '', options.delimiter),
      EscapeCSVField(cider.notes || '', options.delimiter),
      (cider.photo != NULL ? 'Yes' : 'No'),
      EscapeCSVField(cider.createdAt.toISOString(), options.delimiter),
      EscapeCSVField(cider.updatedAt.toISOString(), options.delimiter)
    ]

    rows.push(row.join(options.delimiter))
  END FOR

  csv ← rows.join('\n')

  RETURN csv
END

SUBROUTINE: EscapeCSVField
INPUT: field (STRING), delimiter (STRING)
OUTPUT: escaped (STRING)

BEGIN
  IF field == NULL OR field == '' THEN
    RETURN ''
  END IF

  // Convert to string if not already
  fieldStr ← field.toString()

  // Check if escaping is needed
  needsEscape ← (
    fieldStr.includes(delimiter) OR
    fieldStr.includes('"') OR
    fieldStr.includes('\n') OR
    fieldStr.includes('\r')
  )

  IF needsEscape THEN
    // Escape double quotes by doubling them
    escaped ← fieldStr.replace(/"/g, '""')
    // Wrap in double quotes
    escaped ← '"' + escaped + '"'
    RETURN escaped
  ELSE
    RETURN fieldStr
  END IF
END

SUBROUTINE: ConvertExperiencesToCSV
INPUT: experiences (ARRAY<ExperienceLog>), options (ExportOptions)
OUTPUT: csv (STRING)

BEGIN
  headers ← [
    'ID', 'Cider ID', 'Date', 'Venue Name', 'Venue Type',
    'Price', 'Container Size (ml)', 'Container Type', 'Price Per Pint',
    'Rating', 'Notes', 'Weather', 'Companion Type', 'Created At'
  ]

  rows ← []

  IF options.includeHeaders THEN
    headerRow ← headers.map(h => EscapeCSVField(h, options.delimiter))
    rows.push(headerRow.join(options.delimiter))
  END IF

  FOR EACH exp IN experiences DO
    row ← [
      EscapeCSVField(exp.id, options.delimiter),
      EscapeCSVField(exp.ciderId, options.delimiter),
      EscapeCSVField(exp.date.toISOString(), options.delimiter),
      EscapeCSVField(exp.venue.name, options.delimiter),
      EscapeCSVField(exp.venue.type, options.delimiter),
      exp.price.toFixed(2),
      exp.containerSize.toString(),
      EscapeCSVField(exp.containerType, options.delimiter),
      exp.pricePerPint.toFixed(2),
      EscapeCSVField(exp.rating?.toString() || '', options.delimiter),
      EscapeCSVField(exp.notes || '', options.delimiter),
      EscapeCSVField(exp.weatherConditions || '', options.delimiter),
      EscapeCSVField(exp.companionType || '', options.delimiter),
      EscapeCSVField(exp.createdAt.toISOString(), options.delimiter)
    ]

    rows.push(row.join(options.delimiter))
  END FOR

  csv ← rows.join('\n')

  RETURN csv
END
```

### 5. File System Operations

```
ALGORITHM: WriteToFile
INPUT: data (STRING), options (ExportOptions)
OUTPUT: filePath (STRING)

TIME COMPLEXITY: O(n) for file write
SPACE COMPLEXITY: O(1) streaming write

BEGIN
  // Generate filename
  filename ← GenerateFilename(options)

  // Get export directory
  exportDir ← GetExportDirectory()

  // Ensure directory exists
  EnsureDirectoryExists(exportDir)

  // Full file path
  filePath ← JoinPath(exportDir, filename)

  // Write file
  TRY
    // For large files, use streaming write
    IF data.length > 10_000_000 THEN // 10MB
      WriteFileStreaming(filePath, data)
    ELSE
      WriteFileSync(filePath, data, 'utf8')
    END IF

    Log('Export written to:', filePath)

  CATCH error
    THROW Error('Failed to write export file: ' + error.message)
  END TRY

  RETURN filePath
END

SUBROUTINE: GenerateFilename
INPUT: options (ExportOptions)
OUTPUT: filename (STRING)

BEGIN
  // Use custom name if provided
  IF options.exportName != NULL THEN
    basename ← SanitizeFilename(options.exportName)
  ELSE
    // Generate default name
    timestamp ← CurrentTimestamp().toISOString().split('T')[0]
    basename ← 'cider_dictionary_' + timestamp
  END IF

  // Add extension
  extension ← options.format

  // Add .gz if compressed
  IF options.compression THEN
    extension ← extension + '.gz'
  END IF

  filename ← basename + '.' + extension

  RETURN filename
END

SUBROUTINE: SanitizeFilename
INPUT: filename (STRING)
OUTPUT: sanitized (STRING)

BEGIN
  // Remove invalid characters
  sanitized ← filename.replace(/[^a-zA-Z0-9_\-\.]/g, '_')

  // Limit length
  IF sanitized.length > 100 THEN
    sanitized ← sanitized.substring(0, 100)
  END IF

  // Remove leading/trailing dots or underscores
  sanitized ← sanitized.replace(/^[\._]+|[\._]+$/g, '')

  // Ensure not empty
  IF sanitized.length == 0 THEN
    sanitized ← 'export'
  END IF

  RETURN sanitized
END

SUBROUTINE: GetExportDirectory
OUTPUT: path (STRING)

BEGIN
  // Platform-specific export directory
  IF Platform.OS == 'ios' THEN
    path ← DocumentDirectory + '/Exports'
  ELSE IF Platform.OS == 'android' THEN
    path ← ExternalStorageDirectory + '/CiderDictionary/Exports'
  ELSE
    path ← DocumentDirectory + '/Exports'
  END IF

  RETURN path
END
```

### 6. Compression

```
ALGORITHM: CompressData
INPUT: data (STRING), format (STRING)
OUTPUT: compressed (BUFFER)

TIME COMPLEXITY: O(n) where n = data size
SPACE COMPLEXITY: O(n) for compressed output

BEGIN
  TRY
    // Use gzip compression
    compressed ← GzipCompress(data, {
      level: 6, // Compression level (0-9)
      memLevel: 8
    })

    // Log compression ratio
    originalSize ← data.length
    compressedSize ← compressed.length
    ratio ← ((1 - compressedSize / originalSize) * 100).toFixed(1)

    Log('Compression ratio: ' + ratio + '%')
    Log('Original size: ' + FormatBytes(originalSize))
    Log('Compressed size: ' + FormatBytes(compressedSize))

    RETURN compressed

  CATCH error
    Log('Compression failed, using uncompressed data', error)
    RETURN data
  END TRY
END

SUBROUTINE: FormatBytes
INPUT: bytes (NUMBER)
OUTPUT: formatted (STRING)

BEGIN
  IF bytes < 1024 THEN
    RETURN bytes + ' B'
  ELSE IF bytes < 1048576 THEN
    RETURN (bytes / 1024).toFixed(2) + ' KB'
  ELSE
    RETURN (bytes / 1048576).toFixed(2) + ' MB'
  END IF
END
```

### 7. Share Integration

```
ALGORITHM: ShareExportFile
INPUT: filePath (STRING), options (ExportOptions)
OUTPUT: shared (BOOLEAN)

BEGIN
  TRY
    // Determine MIME type
    mimeType ← GetMimeType(options.format, options.compression)

    // Share options
    shareOptions ← {
      title: 'Export Cider Dictionary Data',
      message: 'Your cider collection export is ready',
      url: 'file://' + filePath,
      type: mimeType,
      subject: 'Cider Dictionary Export'
    }

    // Open share dialog
    result ← AWAIT Share.open(shareOptions)

    RETURN result.success

  CATCH error
    IF error.message != 'User did not share' THEN
      Log('Share failed:', error)
      THROW error
    END IF
    RETURN FALSE
  END TRY
END

SUBROUTINE: GetMimeType
INPUT: format (STRING), compressed (BOOLEAN)
OUTPUT: mimeType (STRING)

BEGIN
  IF compressed THEN
    RETURN 'application/gzip'
  ELSE IF format == 'json' THEN
    RETURN 'application/json'
  ELSE IF format == 'csv' THEN
    RETURN 'text/csv'
  ELSE
    RETURN 'application/octet-stream'
  END IF
END
```

## Edge Cases

### 1. No Data to Export
```
CASE: User tries to export with no ciders
SOLUTION: Show error message, prevent export
VALIDATION: Check cider count before starting export
```

### 2. Disk Space Insufficient (Enhanced)
```
CASE: Not enough disk space for export
SOLUTION: Check available space before writing with 20% buffer
FALLBACK: Offer to export without images or use compression
RECOVERY: Automatically enable streaming and retry
EXAMPLE:
  Required: 120MB
  Available: 100MB
  → Offer: "Enable compression? (estimated 30MB)"
  → OR: "Export without images? (estimated 40MB)"
```

### 3. Disk Full Mid-Export (New)
```
CASE: Disk fills up during export
SOLUTION: Detect space during write, offer options
FALLBACK: Save checkpoint, allow user to free space and resume
RECOVERY: Cleanup partial files, resume from checkpoint
EXAMPLE:
  Export at 60%: Disk full error
  → Save checkpoint
  → Show: "Free up 50MB and tap Resume"
  → User frees space
  → Resume from 60%
```

### 4. Very Large Export (Enhanced)
```
CASE: Export > 100MB or 5000+ items
SOLUTION: Automatically use streaming, show progress
WARNING: Warn user about file size and time estimate
OPTIMIZATION: Chunk processing, periodic GC
EXAMPLE:
  10,000 ciders + 50,000 experiences
  → Automatic streaming (100-item chunks)
  → Memory stays < 100MB
  → Progress shown every 500 items
```

### 5. Memory Pressure During Export (New)
```
CASE: System memory warning during export
SOLUTION: Immediate switch to streaming mode
RECOVERY: Save checkpoint, clear memory, resume with streaming
IMPLEMENTATION: Monitor memory, trigger GC, reduce batch size
```

### 6. Export Interruption (New)
```
CASE: App backgrounded, killed, or crashes during export
SOLUTION: Checkpoint saved after each stage
RECOVERY: Offer to resume on next app launch
PERSISTENCE: Checkpoints expire after 1 hour
EXAMPLE:
  Export at "formatting" stage (40%)
  → App crashes
  → Restart app
  → Show: "Resume export from 40%?"
  → Resume seamlessly
```

### 7. User Cancellation (New)
```
CASE: User cancels export mid-operation
SOLUTION: Check cancellation token periodically
CLEANUP: Save checkpoint for potential resume
UI: Show "Export cancelled. Resume later?" option
EXAMPLE:
  User taps Cancel at 70%
  → Save checkpoint
  → Clean up temp files
  → Show undo/resume option
```

### 8. Network Interruption (Future Cloud Exports) (New)
```
CASE: Network drops during cloud upload
SOLUTION: Save export file locally, retry upload
RECOVERY: Exponential backoff retry with checkpoint
FALLBACK: Allow manual retry or save to device only
```

### 9. Invalid Date Range
```
CASE: End date before start date
SOLUTION: Validate dates, swap if needed
WARNING: Show validation error before export starts
```

### 10. Image Conversion Failure (Enhanced)
```
CASE: Image cannot be converted to base64
SOLUTION: Skip image, log error, continue export
FALLBACK: Export without that specific image
REPORTING: Include skipped images count in export summary
EXAMPLE:
  Export completes successfully
  Summary: "Exported 100 ciders, 3 images skipped (corrupted)"
```

### 11. Special Characters in CSV
```
CASE: Field contains delimiter or quotes
SOLUTION: Use proper CSV escaping (RFC 4180)
IMPLEMENTATION: EscapeCSVField() handles all cases
```

### 12. Corrupt Image Data (New)
```
CASE: Image file corrupted or unreadable
SOLUTION: Skip corrupt images, continue export
REPORTING: Report skipped images in summary
VALIDATION: Include image validation in integrity check
```

## Performance Considerations

### Time Complexity
| Operation | Complexity | Notes |
|-----------|------------|-------|
| Data gathering | O(n + e + v) | n=ciders, e=experiences, v=venues |
| JSON serialization | O(n) | Linear in data size |
| CSV conversion | O(n * f) | f=fields per record |
| Compression | O(n) | GZIP compression |
| File write | O(n) | Streaming for large files |
| **Total** | **O(n)** | Linear in data size |

### Space Complexity
| Component | Complexity | Notes |
|-----------|------------|-------|
| Export data | O(n + e + v) | In-memory data |
| Formatted output | O(n) | JSON/CSV string |
| Compressed output | O(n) | Usually smaller than input |
| **Peak** | **O(2n)** | Data + formatted output |

### Optimization Strategies
- ✅ Streaming write for files > 10MB
- ✅ Lazy image conversion (on-demand)
- ✅ Chunked processing for large datasets
- ✅ Progress callbacks for UX
- ✅ Compression for files > 1MB
- ✅ Cancellation support

## Testing Approach

### Unit Tests
```
TEST: ConvertToJSON
  - Empty ciders array
  - Single cider with all fields
  - Ciders with optional fields missing
  - Include/exclude images
  - Pretty print vs compact
  - Date serialization

TEST: ConvertToCSV
  - Proper CSV escaping
  - Delimiter handling
  - Quote escaping
  - Newline handling
  - Empty fields
  - Multiple sections

TEST: CompressData
  - Compression reduces size
  - Compressed data can be decompressed
  - Handles large files
  - Graceful degradation on failure

TEST: EscapeCSVField
  - No escaping needed
  - Contains delimiter
  - Contains quotes
  - Contains newlines
  - Multiple special characters
```

### Integration Tests
```
TEST: Full Export Flow
  - Export all ciders to JSON
  - Export selected ciders to CSV
  - Export with date range
  - Export with compression
  - Export with all options enabled

TEST: File System
  - File created successfully
  - File readable after creation
  - Correct file size
  - Proper permissions
  - Directory creation

TEST: Share Integration
  - Share dialog opens
  - File shared successfully
  - Cancellation handled
```

### Performance Tests
```
TEST: Large Dataset Performance
  - 100 ciders: < 1s
  - 500 ciders: < 2s
  - 1000 ciders: < 3s
  - 5000 ciders: < 10s (with streaming)

TEST: Memory Usage
  - No memory leaks during export
  - Peak memory < 200MB for 1000 ciders
  - Proper cleanup after export
```

---

**Complexity Analysis**: Export is O(n) linear in data size with O(2n) peak memory usage.

**File Size Estimates**:
- 100 ciders JSON: ~500KB uncompressed, ~100KB compressed
- 100 ciders + experiences JSON: ~1MB uncompressed, ~200KB compressed
- CSV typically 20-30% larger than JSON

**Recommendation**: Always offer compression for exports > 1MB. Use streaming for exports > 10MB.
