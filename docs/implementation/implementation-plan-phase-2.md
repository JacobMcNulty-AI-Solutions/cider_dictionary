
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