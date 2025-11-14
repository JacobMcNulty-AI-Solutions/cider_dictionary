# Phase 5: Analytics Screen - Usage Guide

## Overview
The Analytics Screen is now a comprehensive tabbed interface providing 4 different views of your cider data.

## Navigation
Simply tap the Analytics tab in the bottom navigation to access all analytics features.

## The 4 Tabs

### 1. Overview Tab 📊
**Icon**: Analytics outline
**Purpose**: High-level snapshot of your cider collection

**Features**:
- **Collection Stats**
  - Total ciders in your collection
  - Total experiences logged
  - Average rating across all ciders
  - Collection completeness score

- **Value Analysis**
  - Average price per pint
  - Monthly spending (last 30 days)
  - Best value find (lowest price for quality)

- **Venue Insights**
  - Total venues visited
  - Most visited venue with visit count

- **Quick Trends**
  - Monthly activity chart (last 6 months)
  - Rating distribution chart

**Time Range**: Adjustable (1M, 3M, 6M, 1Y, All)

---

### 2. Trends Tab 📈
**Icon**: Trending up
**Purpose**: Analyze how your preferences and habits change over time

**Features**:
- **Collection Growth Trend**
  - Track how fast you're adding ciders
  - Prediction of future growth
  - Confidence indicator

- **Rating Trend**
  - See if your ratings are getting higher or lower
  - Understand your palate evolution
  - Forecast future rating patterns

- **Spending Trend**
  - Track your cider budget over time
  - See if you're spending more or less
  - Plan future purchases

- **ABV Preference Trend**
  - Discover if you prefer stronger or lighter ciders
  - Track preference changes
  - Understand your taste evolution

**Time Range**: Adjustable (1M, 3M, 6M, 1Y, All)
**Auto-Grouping**:
- 1M → Weekly data points
- 3M-1Y → Monthly data points
- ALL → Quarterly data points

---

### 3. Distributions Tab 📊
**Icon**: Bar chart
**Purpose**: Understand the composition of your collection

**Features**:
- **Rating Distribution**
  - See how you rate ciders (1-10 scale)
  - Identify your most common ratings
  - Statistical summary (mean, median, mode, std dev)

- **ABV Distribution**
  - Understand your alcohol preference ranges
  - See most common ABV brackets
  - Statistical analysis of ABV preferences

- **Style Breakdown**
  - Which cider styles do you try most?
  - Discover your style preferences
  - Track style diversity

- **Top Brands**
  - Your most-tried brands
  - Brand loyalty analysis
  - Discover favorite producers

- **Taste Tags**
  - Most common flavor profiles
  - See which tastes you prefer
  - Understand your palate

- **Price Distribution**
  - Price ranges you typically pay
  - Budget analysis
  - Value zones

- **Venue Types**
  - Where you drink cider most
  - Pub vs. Restaurant vs. Bar vs. Festival
  - Venue preference patterns

**Time Range**: Adjustable (1M, 3M, 6M, 1Y, All)

---

### 4. Venues Tab 🗺️
**Icon**: Map
**Purpose**: Geographic analysis and venue insights

**Features**:
- **Interactive Heat Map**
  - See all venues on a map
  - Clustered markers for nearby venues
  - Tap to see venue details
  - Visual density representation

- **Venue Insights**
  - Total unique venues visited
  - Total visits across all venues
  - Most visited venues (top 5)
  - Top-rated venues (top 5)
  - Venue type distribution

- **Statistics**
  - Visit counts per venue
  - Average ratings per venue
  - Venue type percentages
  - Geographic spread

**Time Range**: Not applicable (shows all-time data)

---

## Controls

### Time Range Selector
Located at the top of Overview, Trends, and Distributions tabs.

**Options**:
- **1M**: Last 30 days
- **3M**: Last 90 days (default)
- **6M**: Last 180 days
- **1Y**: Last 365 days
- **All**: All-time data

**How to use**:
1. Tap any time range button
2. Data automatically refreshes
3. Selection persists across tabs

**Note**: Venues tab doesn't use time filtering (always shows all venues)

### Pull to Refresh
Available on all tabs.

**How to use**:
1. Pull down on any tab
2. Release when you see the refresh indicator
3. Data will reload from database
4. Charts and stats update automatically

### Tab Switching
**How to use**:
1. Tap any of the 4 tab buttons at the top
2. Content switches immediately
3. Previous tab state is preserved
4. Time range selection persists (except Venues)

---

## Empty States

### No Data Yet
If you haven't added any ciders or logged experiences:
- Shows helpful message
- Guides you to add data
- Pull to refresh available

### Loading States
While calculating analytics:
- Shows loading spinner
- Displays progress message
- Typically completes in <500ms

### Error States
If data fails to load:
- Shows error icon and message
- Retry button available
- Pull to refresh available

---

## Performance

### Speed
- Analytics calculations: <500ms
- Tab switching: Instant (lazy loading)
- Data caching: Enabled
- Smooth scrolling on all tabs

### Data Updates
- Automatic refresh when screen gains focus
- Pull-to-refresh on all tabs
- Time range changes trigger recalculation
- Cached results when possible

---

## Tips & Best Practices

### Getting the Most from Analytics

1. **Regular Data Entry**
   - Log experiences consistently
   - Rate every cider you try
   - Add venue information
   - Include prices for value analysis

2. **Use Different Time Ranges**
   - 1M: Recent trends and quick insights
   - 3M: Balance of recent and historical (recommended)
   - 6M-1Y: Long-term patterns
   - All: Complete historical view

3. **Compare Tabs**
   - Check Overview for quick snapshot
   - Use Trends to see changes over time
   - Use Distributions to understand preferences
   - Use Venues to plan visits

4. **Watch Predictions**
   - High confidence (>80%): Strong trend
   - Medium confidence (50-80%): Moderate trend
   - Low confidence (<50%): Uncertain trend

5. **Review Regularly**
   - Weekly: Check Overview tab
   - Monthly: Review Trends for patterns
   - Quarterly: Analyze Distributions for insights
   - Yearly: Full analysis of all tabs

---

## Understanding the Charts

### Line Charts (Trends)
- **X-axis**: Time (dates)
- **Y-axis**: Value (count, rating, price, ABV)
- **Blue line**: Actual data
- **Dashed line**: Prediction
- **Shaded area**: Confidence range

### Bar Charts (Distributions)
- **X-axis**: Category or range
- **Y-axis**: Count or frequency
- **Colors**: Category-specific
- **Average line**: Mean value (when applicable)

### Heat Map (Venues)
- **Pins**: Individual venues
- **Clusters**: Multiple venues nearby
- **Color intensity**: Visit frequency
- **Tap**: Show venue details

---

## Accessibility

### Screen Reader Support
- All tabs have descriptive labels
- Tab states announced
- Chart descriptions available
- Button actions clearly labeled

### Interaction
- Large tap targets for tabs
- Clear visual feedback
- High contrast colors
- Readable fonts

---

## Troubleshooting

### Charts Not Showing
- Ensure you have data for that time range
- Try a longer time range (e.g., All)
- Pull to refresh to reload data
- Check that experiences have required fields

### Predictions Missing
- Need at least 3 data points
- Check time range has enough data
- Stable trends may not predict far
- Pull to refresh to recalculate

### Venues Not Appearing
- Ensure experiences have venue information
- Check venue has location data
- Verify database permissions
- Pull to refresh to reload

### Slow Performance
- Expected on first load (<500ms)
- Subsequent loads use cache
- Large datasets may take longer
- Pull to refresh clears cache

---

## Data Privacy

### What's Stored
- All analytics data is local on your device
- No data sent to external servers
- SQLite database in app sandbox
- Cached analytics for performance

### What's Calculated
- All calculations happen on device
- No external API calls
- Privacy-first design
- Your data stays yours

---

## Future Features (Planned)

- Custom date range picker
- Export analytics to PDF/CSV
- Share insights with friends
- Comparison views
- Custom filters
- More chart types
- Personalized recommendations

---

## Support

For issues or questions:
1. Check this guide
2. Pull to refresh to reload data
3. Restart the app
4. Contact support with specific tab/feature

## Version
Phase 5 - Integration & Polish (November 2025)
