## Phase 3: MVP - Minimum Viable Product
*Target Duration: 4-5 weeks*

### Phase Overview
Transform the basic functionality into a complete MVP with offline storage, Firebase sync, experience logging, and core analytics. This phase creates a production-ready application that delivers full value to users.

### Core Deliverables

#### 3.1 Offline-First Architecture
- **SQLite Primary Storage**: Complete offline functionality implementation
- **Firebase Sync Service**: Background synchronization with conflict resolution
- **Offline Queue Management**: Image uploads and data sync queuing
- **Network State Handling**: Graceful online/offline transitions

#### 3.2 Experience Logging System
- **Quick Experience Entry**: 30-second venue/price logging
- **Location Services**: GPS capture with venue detection
- **Price per ml Calculation**: Automatic value computation
- **Experience History**: Complete drinking history per cider

#### 3.3 Basic Analytics Dashboard
- **Collection Overview**: Total ciders, ratings distribution, personal completion percentage
- **Personal Completeness Algorithm**: Multi-dimensional scoring based on user's own collection diversity
- **Basic Value Analytics**: Best/worst value ciders, simple spending totals
- **Simple Venue Lists**: Most visited locations (list view only)
- **Basic Charts**: Simple bar/pie charts for key metrics (no complex interactivity)

#### 3.4 Production Architecture
- **Error Handling**: Comprehensive error boundaries and recovery
- **Performance Monitoring**: Firebase Performance integration with 30s/200ms target tracking
- **Firebase Cost Monitoring**: Automated usage tracking with 80% free tier alerts
- **Security**: Firebase security rules and data validation

### Technical Implementation

#### Offline-First Sync Architecture
```typescript
class SyncManager {
  private syncQueue: SyncOperation[] = [];
  private isOnline: boolean = true;
  private syncInProgress: boolean = false;

  constructor() {
    // Monitor network state
    NetInfo.addEventListener(state => {
      this.isOnline = state.isConnected || false;
      if (this.isOnline && !this.syncInProgress) {
        this.processSyncQueue();
      }
    });

    // Process queue on app foreground
    AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active' && this.isOnline) {
        this.processSyncQueue();
      }
    });
  }

  async queueOperation(operation: SyncOperation): Promise<void> {
    // Add to SQLite queue table
    await insertSyncOperation(operation);
    this.syncQueue.push(operation);

    // Process immediately if online
    if (this.isOnline) {
      this.processSyncQueue();
    }
  }

  private async processSyncQueue(): Promise<void> {
    if (this.syncInProgress || !this.isOnline) return;

    this.syncInProgress = true;

    try {
      while (this.syncQueue.length > 0) {
        const operation = this.syncQueue.shift()!;
        await this.executeOperation(operation);
        await removeSyncOperation(operation.id);
      }
    } catch (error) {
      console.error('Sync queue processing failed:', error);
      // Operations remain in queue for retry
    } finally {
      this.syncInProgress = false;
    }
  }

  private async executeOperation(operation: SyncOperation): Promise<void> {
    switch (operation.type) {
      case 'CREATE_CIDER':
        await firestore().collection('ciders').doc(operation.data.id).set(operation.data);
        await updateLocalSyncStatus(operation.data.id, 'synced');
        break;

      case 'UPDATE_CIDER':
        await firestore().collection('ciders').doc(operation.data.id).update(operation.data);
        await updateLocalSyncStatus(operation.data.id, 'synced');
        break;

      case 'CREATE_EXPERIENCE':
        await firestore().collection('experiences').doc(operation.data.id).set(operation.data);
        await updateLocalSyncStatus(operation.data.id, 'synced');
        break;

      case 'UPLOAD_IMAGE':
        const downloadURL = await this.uploadImage(operation.data.localPath, operation.data.remotePath);
        await this.updateCiderImage(operation.data.ciderId, downloadURL);
        break;
    }
  }

  private async uploadImage(localPath: string, remotePath: string): Promise<string> {
    const reference = storage().ref(remotePath);
    await reference.putFile(localPath);
    return reference.getDownloadURL();
  }
}
```

#### Experience Logging Implementation
```typescript
interface ExperienceFormState {
  ciderId: string;
  venue: {
    name: string;
    type: VenueType;
    location: {
      latitude: number;
      longitude: number;
    } | null;
    address?: string;
  };
  price: number;
  containerSize: number; // ml
  notes: string;
  date: Date;
}

const ExperienceLogScreen: React.FC = () => {
  const route = useRoute<RouteProp<RootStackParamList, 'ExperienceLog'>>();
  const { ciderId } = route.params;

  const [formState, setFormState] = useState<ExperienceFormState>({
    ciderId,
    venue: {
      name: '',
      type: 'pub',
      location: null
    },
    price: 0,
    containerSize: 500, // Default pint
    notes: '',
    date: new Date()
  });

  const [cider] = useCider(ciderId);
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [startTime] = useState(Date.now());

  // Auto-capture GPS location
  useEffect(() => {
    getCurrentPosition()
      .then(position => {
        setCurrentLocation(position);
        setFormState(prev => ({
          ...prev,
          venue: {
            ...prev.venue,
            location: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            }
          }
        }));
      })
      .catch(error => console.log('Location access denied:', error));
  }, []);

  // Smart venue suggestions based on location
  const venueSuggestions = useNearbyVenues(currentLocation);

  // Auto-calculate price per ml
  const pricePerMl = useMemo(() => {
    if (formState.price > 0 && formState.containerSize > 0) {
      return formState.price / formState.containerSize;
    }
    return 0;
  }, [formState.price, formState.containerSize]);

  const handleSubmit = useCallback(async () => {
    const completionTime = (Date.now() - startTime) / 1000;

    const experience: ExperienceLog = {
      id: generateUUID(),
      userId: getCurrentUserId(),
      ciderId: formState.ciderId,
      date: firestore.Timestamp.fromDate(formState.date),
      venue: formState.venue,
      price: formState.price,
      containerSize: formState.containerSize,
      pricePerMl,
      notes: formState.notes,
      createdAt: firestore.Timestamp.now(),
      syncStatus: 'pending'
    };

    try {
      // Save locally first (optimistic update)
      await insertExperience(experience);

      // Update cider stats
      await updateCiderStats(ciderId, {
        timesTried: increment(1),
        lastTriedDate: experience.date,
        averagePrice: calculateNewAverage(cider.averagePrice, cider.timesTried, formState.price)
      });

      // Queue for sync
      await syncManager.queueOperation({
        type: 'CREATE_EXPERIENCE',
        data: experience
      });

      // Record performance
      recordExperienceEntryTime(completionTime);

      // Show success and navigate
      showSuccessToast('Experience logged successfully!');
      navigation.goBack();

    } catch (error) {
      console.error('Failed to log experience:', error);
      showErrorToast('Failed to log experience. Please try again.');
    }
  }, [formState, ciderId, cider, pricePerMl, startTime]);

  return (
    <KeyboardAvoidingView style={styles.container}>
      <ScrollView contentContainerStyle={styles.formContainer}>
        {/* Cider Reference */}
        <CiderReferenceCard cider={cider} compact />

        {/* Venue Information */}
        <FormSection title="Where did you try it?">
          <VenueInput
            value={formState.venue.name}
            onChangeText={(name) => handleVenueNameChange(name)}
            suggestions={venueSuggestions}
            location={currentLocation}
          />

          <VenueTypeSelector
            value={formState.venue.type}
            onSelect={(type) => handleVenueTypeChange(type)}
          />
        </FormSection>

        {/* Price & Size */}
        <FormSection title="Price & Container">
          <PriceInput
            label="Price (£)"
            value={formState.price}
            onChangeText={(price) => handlePriceChange(parseFloat(price))}
          />

          <ContainerSizeSelector
            value={formState.containerSize}
            onSelect={(size) => handleContainerSizeChange(size)}
            presets={[330, 440, 500, 568]} // ml
          />

          <PricePerMlDisplay value={pricePerMl} />
        </FormSection>

        {/* Notes */}
        <FormSection title="Notes (optional)">
          <TextAreaInput
            value={formState.notes}
            onChangeText={(notes) => handleNotesChange(notes)}
            placeholder="How was it? Any thoughts?"
            maxLength={500}
          />
        </FormSection>
      </ScrollView>

      <ActionButton
        title="Log Experience"
        onPress={handleSubmit}
        disabled={!isFormValid(formState)}
        style={styles.submitButton}
      />
    </KeyboardAvoidingView>
  );
};
```

#### Analytics Dashboard Implementation
```typescript
interface AnalyticsData {
  collectionStats: {
    totalCiders: number;
    averageRating: number;
    completionPercentage: number;
    totalExperiences: number;
  };
  valueAnalytics: {
    bestValue: CiderMasterRecord;
    worstValue: CiderMasterRecord;
    averagePricePerMl: number;
    monthlySpending: number;
  };
  venueAnalytics: {
    mostVisited: VenueRecord;
    cheapest: VenueRecord;
    mostExpensive: VenueRecord;
    totalVenues: number;
  };
  trends: {
    monthlyTrend: { month: string; count: number; spending: number }[];
    ratingDistribution: { rating: number; count: number }[];
  };
}

const AnalyticsScreen: React.FC = () => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'1M' | '3M' | '6M' | '1Y' | 'ALL'>('3M');

  useEffect(() => {
    loadAnalyticsData();
  }, [selectedTimeRange]);

  const loadAnalyticsData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await calculateAnalytics(selectedTimeRange);
      setAnalyticsData(data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedTimeRange]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!analyticsData) {
    return <ErrorState onRetry={loadAnalyticsData} />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Time Range Selector */}
      <TimeRangeSelector
        selected={selectedTimeRange}
        onSelect={setSelectedTimeRange}
        options={[
          { value: '1M', label: '1 Month' },
          { value: '3M', label: '3 Months' },
          { value: '6M', label: '6 Months' },
          { value: '1Y', label: '1 Year' },
          { value: 'ALL', label: 'All Time' }
        ]}
      />

      {/* Collection Overview */}
      <AnalyticsSection title="Collection Overview">
        <StatsGrid>
          <StatCard
            title="Total Ciders"
            value={analyticsData.collectionStats.totalCiders}
            icon="beer"
            color={COLORS.primary}
          />
          <StatCard
            title="Experiences"
            value={analyticsData.collectionStats.totalExperiences}
            icon="map-marker"
            color={COLORS.secondary}
          />
          <StatCard
            title="Average Rating"
            value={analyticsData.collectionStats.averageRating.toFixed(1)}
            icon="star"
            color={COLORS.warning}
          />
          <StatCard
            title="Completion"
            value={`${analyticsData.collectionStats.completionPercentage.toFixed(0)}%`}
            icon="check-circle"
            color={COLORS.success}
          />
        </StatsGrid>
      </AnalyticsSection>

      {/* Value Analytics */}
      <AnalyticsSection title="Value Analysis">
        <ValueAnalyticsChart
          bestValue={analyticsData.valueAnalytics.bestValue}
          worstValue={analyticsData.valueAnalytics.worstValue}
          averagePricePerMl={analyticsData.valueAnalytics.averagePricePerMl}
        />

        <MonthlySpendingDisplay
          amount={analyticsData.valueAnalytics.monthlySpending}
          timeRange={selectedTimeRange}
        />
      </AnalyticsSection>

      {/* Venue Analytics */}
      <AnalyticsSection title="Venue Insights">
        <VenueRankingList venues={[
          analyticsData.venueAnalytics.mostVisited,
          analyticsData.venueAnalytics.cheapest,
          analyticsData.venueAnalytics.mostExpensive
        ]} />
      </AnalyticsSection>

      {/* Trends */}
      <AnalyticsSection title="Trends">
        <TrendChart
          data={analyticsData.trends.monthlyTrend}
          timeRange={selectedTimeRange}
        />

        <RatingDistributionChart
          data={analyticsData.trends.ratingDistribution}
        />
      </AnalyticsSection>
    </ScrollView>
  );
};

// Personal Collection Completeness Algorithm (CRITICAL - Personal Only)
async function calculatePersonalCompleteness(userCiders: CiderMasterRecord[]): Promise<number> {
  // IMPORTANT: This algorithm calculates completeness based ONLY on the user's own collection
  // NOT against a global database - this ensures personal diversity scoring

  const weights = {
    producer: 0.3,      // Brand diversity within user's collection
    style: 0.25,        // Style diversity within user's collection
    region: 0.2,        // Regional diversity within user's collection
    specific: 0.15,     // Specific characteristic diversity
    quality: 0.1        // Quality distribution balance
  };

  // Calculate diversity scores based on user's collection only
  const [
    producerScore,
    styleScore,
    regionScore,
    specificScore,
    qualityScore
  ] = await Promise.all([
    calculateProducerDiversity(userCiders),      // How many different producers
    calculateStyleDiversity(userCiders),        // How many different styles
    calculateRegionalDiversity(userCiders),     // How many different regions
    calculateCharacteristicDiversity(userCiders), // ABV, sweetness, etc. spread
    calculateQualityDistribution(userCiders)    // Rating distribution balance
  ]);

  // Weighted combination with diminishing returns
  const completenessScore =
    (producerScore * weights.producer) +
    (styleScore * weights.style) +
    (regionScore * weights.region) +
    (specificScore * weights.specific) +
    (qualityScore * weights.quality);

  return Math.min(completenessScore, 100.0);
}

function calculateStyleDiversity(ciders: CiderMasterRecord[]): number {
  // Calculate Shannon entropy for style diversity within user's collection
  const styleCounts = ciders.reduce((acc, cider) => {
    const style = cider.traditionalStyle || 'unknown';
    acc[style] = (acc[style] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const totalCiders = ciders.length;
  let entropy = 0;

  for (const count of Object.values(styleCounts)) {
    const probability = count / totalCiders;
    entropy -= probability * Math.log2(probability);
  }

  // Normalize to 0-100 scale based on possible styles in user's collection
  const maxPossibleEntropy = Math.log2(Object.keys(styleCounts).length);
  return maxPossibleEntropy > 0 ? (entropy / maxPossibleEntropy) * 100 : 0;
}

// Performance-optimized analytics calculation
async function calculateAnalytics(timeRange: string): Promise<AnalyticsData> {
  const cutoffDate = getTimeRangeCutoff(timeRange);

  // Parallel data fetching for performance
  const [ciders, experiences, venues] = await Promise.all([
    getCidersFromDate(cutoffDate),
    getExperiencesFromDate(cutoffDate),
    getVenuesFromDate(cutoffDate)
  ]);

  // Calculate personal completeness based on user's collection only
  const completionPercentage = await calculatePersonalCompleteness(ciders);

  // Memoized calculations to prevent re-computation
  return {
    collectionStats: {
      ...calculateCollectionStats(ciders, experiences),
      completionPercentage // Personal diversity score, not global comparison
    },
    valueAnalytics: calculateValueAnalytics(ciders, experiences),
    venueAnalytics: calculateVenueAnalytics(venues, experiences),
    trends: calculateTrends(experiences, timeRange)
  };
}
```

### Success Criteria
- [ ] Complete offline functionality - all features work without internet
- [ ] Firebase sync works reliably with conflict resolution
- [ ] Experience logging completes in under 30 seconds
- [ ] Analytics dashboard loads in under 500ms
- [ ] GPS location capture works reliably
- [ ] Image upload queue processes automatically
- [ ] No data loss during network transitions
- [ ] Firebase free tier usage stays under limits
- [ ] App performance remains smooth with 100+ ciders

### Dependencies
- **Phase 2**: Core functionality and data structures
- **Location Services**: GPS permissions and Google Places API
- **Firebase Services**: Authentication and cloud storage setup

### Estimated Timeline
- **Week 1**: Offline-first architecture and sync implementation
- **Week 2**: Experience logging system and location services
- **Week 3**: Analytics dashboard and data visualization
- **Week 4**: Firebase integration and cloud sync
- **Week 5**: Testing, optimization, and bug fixes

### Testing Strategy
- **Offline Testing**: Network disconnection scenarios
- **Sync Testing**: Conflict resolution and data consistency
- **Performance Testing**: Analytics calculation speed
- **Integration Testing**: Firebase operations and data flow
- **Location Testing**: GPS accuracy and venue detection

### Risk Mitigation
- **Sync Conflicts**: Implement last-write-wins with user notification
- **Performance Degradation**: Profile analytics calculations, add pagination
- **Firebase Costs**: Monitor usage with automated alerts
- **Location Privacy**: Clear permissions and opt-out options

### Integration Points
- **Phase 4**: Foundation for advanced features and optimizations
- **Production**: Ready for app store submission
- **Monitoring**: Performance and error tracking in place

---