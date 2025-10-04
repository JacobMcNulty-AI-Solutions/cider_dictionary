# Data Export System

## Purpose

Implements a comprehensive data export system supporting JSON and CSV formats with optional compression, date range filtering, and selective data inclusion. Designed for data portability, backup, and external analysis.

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

### 3. JSON Export Formatter

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

### 2. Disk Space Insufficient
```
CASE: Not enough disk space for export
SOLUTION: Check available space before writing
FALLBACK: Offer to export without images or compression
```

### 3. Very Large Export
```
CASE: Export > 100MB
SOLUTION: Use streaming write, show progress
WARNING: Warn user about file size
```

### 4. Invalid Date Range
```
CASE: End date before start date
SOLUTION: Validate dates, swap if needed
WARNING: Show validation error
```

### 5. Image Conversion Failure
```
CASE: Image cannot be converted to base64
SOLUTION: Skip image, log error, continue export
FALLBACK: Export without that specific image
```

### 6. Special Characters in CSV
```
CASE: Field contains delimiter or quotes
SOLUTION: Use proper CSV escaping (RFC 4180)
IMPLEMENTATION: EscapeCSVField() handles all cases
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
