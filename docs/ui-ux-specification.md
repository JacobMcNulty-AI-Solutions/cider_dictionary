# Cider Dictionary UI/UX Specification

## Design Philosophy
Modern, card-based interface with sleek animations, glassmorphism effects, and intuitive gestures. Prioritizes visual appeal with photo-dominant layouts while maintaining quick access to core functionality.

## Design System

### Color Palette
- **Primary Accent**: Cider amber (#D4A574)
- **Surface Colors**: White (#FFFFFF), Light Gray (#F8F9FA), Dark Gray (#343A40)
- **Semantic Colors**:
  - Success Green (#28A745)
  - Warning Amber (#FFC107)
  - Error Red (#DC3545)
- **Dark Mode**: Full support with appropriate surface adjustments

### Typography Scale
- **H1 Headings**: 28px, Bold
- **H2 Headings**: 24px, Semi-bold
- **H3 Headings**: 20px, Semi-bold
- **Body Text**: 16px, Regular
- **Caption Text**: 14px, Regular
- **Small Text**: 12px, Regular

### Layout System
- **Grid**: 8px base grid for consistent spacing
- **Corners**: 8px standard, 12px for cards, 16px for modals
- **Shadows**: Multi-layer soft shadows with blur
- **Safe Areas**: Full support for notched devices

## Navigation Structure

### Bottom Tab Navigation (4 Tabs)
The app uses a bottom tab navigation system for primary navigation between main sections:

```
┌──────────┬──────────┬──────────┬────┐
│Dictionary│Analytics │Progress  │ +  │
│   🗂️     │    📊    │    🎯    │    │
└──────────┴──────────┴──────────┴────┘
```

**Primary Navigation Tabs:**
1. **Dictionary** (🗂️) - Main cider collection with search and filtering
2. **Analytics** (📊) - Rankings, statistics, venue analysis, and map (3 sub-tabs)
3. **Progress** (🎯) - Collection progress, achievements, and gap analysis
4. **Add** (+) - Quick access to "Log New Cider" workflow

### Navigation Flow
```
Main Navigation:
Dictionary ↔ Analytics ↔ Progress ↔ Add

From Dictionary:
- Tap cider card → Cider Detail Page
- Swipe right on card → Quick Log Experience
- Search/filter → Filtered results (same page)

From Analytics:
- Swipe between: Ciders tab ↔ Venues tab ↔ Map tab
- Tap venue pin → Venue Detail Sheet
- Tap cider ranking → Cider Detail Page

From Cider Detail:
- "Log Experience" button → Quick Log Experience
- Back arrow → Return to Dictionary

From Quick Log/Add New:
- Save → Return to Dictionary
- Cancel → Return to previous page
```

### Secondary Navigation
- **Settings**: Profile icon in Dictionary header
- **Venue Details**: Bottom sheet from Map pins
- **Achievement Details**: Modal from Progress page taps

## Page Specifications

### 1. Cider Dictionary (Main Hub)

#### Layout Structure
- **Header**: Fixed floating search bar with glassmorphism effect
- **Body**: Staggered grid of cider cards
- **FAB**: Floating "+" button for "Log New Cider" (bottom-right)

#### Search Bar
- **Style**: Floating with 12px rounded corners and subtle shadow
- **Background**: Semi-transparent white with backdrop blur
- **Placeholder**: "Search your cider collection..."
- **Animation**: Expands 4px on focus with smooth transition (200ms)
- **Icon**: Magnifying glass (left), clear 'X' when typing (right)

#### Cider Cards
**Card Dimensions**:
- Mobile: 2 columns, ~160px width
- Tablet: 3 columns, ~200px width
- Desktop: 4 columns, ~240px width

**Card Structure**:
```
┌─────────────────────┐
│                     │
│    [Hero Photo]     │ 70% height
│                     │
│  [Rating] [Badge]   │ Overlay (top)
│                     │
│                     │
├─────────────────────┤
│ [Cider Name]        │ 20% height
│ [Brand Name]        │
│ [Price Indicator]   │
└─────────────────────┘ 10% height
```

**Card Content**:
- **Hero Photo**: Full bleed background image with 12px rounded corners
- **Rating Overlay**: 5 star display (top-right) with semi-transparent background
- **Times Tried Badge**: Small circular badge (bottom-left) showing visit count
- **Cider Name**: Bold white text with text shadow for readability
- **Brand Name**: Semi-transparent white text
- **Price Indicator**: Color-coded horizontal bar at bottom
  - Green (#28A745): Under £4
  - Amber (#FFC107): £4-£7
  - Red (#DC3545): Over £7

**Card Animations**:
- **Hover/Tap**: Scale to 1.02x with increased shadow (150ms ease-out)
- **Load**: Skeleton shimmer effect transitioning to content
- **Swipe Right**: Slide card 20px right, show "Log Experience" action
- **Haptic**: Light impact on tap

#### Modern Interactions
- **Pull-to-refresh**: Elastic animation with custom loading spinner
- **Infinite scroll**: Smooth pagination with loading indicator
- **Grid transitions**: Staggered fade-in when filtering (50ms delay between cards)

### 2. Quick Log Experience

#### Layout Structure
- **Header**: Fixed header with cider info and back button
- **Form**: Scrollable form sections with smooth transitions
- **Footer**: Fixed save button

#### Cider Header Card
- **Mini card** showing cider photo, name, brand
- **Glassmorphism background** with backdrop blur
- **Previous experience count** badge

#### Form Sections
**Venue Selection**:
- **Dropdown**: Custom styled with search functionality
- **Recent venues**: Quick selection chips (last 5 venues)
- **Animation**: Smooth expand/collapse with content sliding

**Price Input**:
- **Currency input** with automatic formatting
- **Container size**: Linked input with ml units
- **Price per ml**: Auto-calculated display with subtle color coding

**Notes Section**:
- **Expandable text area** starting at 2 lines
- **Character count** with fade-in at 80% limit
- **Auto-save** with subtle flash animation

#### Save Button
- **Fixed bottom button** with safe area support
- **Color**: Primary accent with white text
- **Animation**: Pulse effect on successful save
- **Loading state**: Spinner with button text change

### 3. Log New Cider

#### Layout Structure
- **Multi-step form** with progress indicator
- **Smooth page transitions** between steps
- **Bottom navigation** for step control

#### Step 1: Basic Info & Photo
- **Camera interface**: Native camera with custom overlay
- **Photo preview**: Rounded corners with retake option
- **Name/Brand inputs**: Clean text fields with floating labels

#### Step 2: Classification
- **Expandable sections** for each category
- **Chip selections**: Multi-select with smooth add/remove animations
- **Visual feedback**: Selected chips have accent color background

#### Step 3: Scoring
- **Rating sliders**: Custom 1-10 sliders with haptic feedback
- **Category labels**: Clear descriptions for each rating category
- **Real-time preview**: Overall score calculated and displayed

#### Step 4: Taste Tags
- **Tag cloud**: Flowing layout of selectable tags
- **Search**: Real-time filtering of available tags
- **Custom tags**: Ability to create new tags inline

### 4. Cider Detail Page

#### Layout Structure
- **Hero image**: Full-width photo with parallax scrolling
- **Content cards**: Stacked information sections
- **Floating actions**: Fixed "Log Experience" button

#### Hero Section
- **Full-screen photo** with gradient overlay
- **Back button**: Floating (top-left) with backdrop blur
- **Basic info overlay**: Name, brand, ABV (bottom of hero)

#### Information Cards
**Rating Card**:
- **6 rating categories** in 2x3 grid
- **Visual rating**: Progress bars with gradient fills
- **Overall score**: Large prominent display

**Classification Card**:
- **Collapsible sections** for each category
- **Tag displays**: Styled chips showing all classifications
- **Smooth expand/collapse** animations

**Experience History**:
- **Timeline layout** with venue icons
- **Expandable entries**: Tap to see full notes
- **Price trending**: Visual indicator of price changes

### 5. Analytics (Consolidated)

#### Layout Structure
- **Header**: Fixed header with app title and settings icon
- **Tab Bar**: 3 horizontal tabs (Ciders, Venues, Map)
- **Content**: Swipeable tab content with smooth transitions

#### Tab 1: Ciders
**Rankings Section:**
- **Leaderboard style**: Numbered list with cider cards
- **Podium display**: Top 3 with special styling and medals
- **Multiple rankings**:
  - Best Overall (by rating)
  - Worst Overall
  - Best Value (rating/price ratio)
  - Most Expensive
  - Category Leaders (best in each style)

**Statistics Cards:**
- **Your Statistics**: Clean number displays with icons
  - Total ciders tried
  - Average overall rating
  - Total money spent
  - Most frequent venue type
- **Trend indicators**: Up/down arrows with color coding
- **Chart integration**: Simple bar charts showing rating distribution

#### Tab 2: Venues
**Venue Rankings:**
- **Most Expensive**: Average price per ml ranking
- **Best Value**: Venues with highest-rated ciders for price
- **Most Visited**: Frequency-based ranking
- **Best Variety**: Venues with most unique ciders

**Venue Analytics:**
- **Price comparison charts**: Bar charts by venue type
- **Visit frequency**: Timeline of venue visits
- **Geographic spread**: Statistics on venue locations

#### Tab 3: Map
**Full-screen map component with:**
- **Heat map visualization**: Visit frequency color coding
  - 🔴 Red (Hot): 5+ visits
  - 🟠 Orange (Warm): 3-4 visits
  - 🟡 Yellow (Medium): 2 visits
  - 🔵 Blue (Cool): 1 visit
- **Clustering**: Automatic grouping with count badges
- **Custom pins**: Venue type icons with color coding
- **Search overlay**: Floating search for venue names
- **Filter controls**: Toggle venue types on/off

**Venue Detail Sheet:**
- **Slide-up animation**: Smooth bottom sheet reveal
- **Venue info**: Name, type, visit count, address
- **Cider list**: All ciders tried at this venue with ratings
- **Price analysis**: Average pricing and price range
- **Visit history**: Timeline of experiences at this venue

### 6. Collection Progress

#### Layout Structure
- **Progress overview**: Completion percentage with circular progress
- **Achievement grid**: Badge-style achievements
- **Gap analysis**: Missing categories highlighted

#### Style Matrix
- **Grid visualization**: Each style as a card
- **Color coding**:
  - Green: Completed
  - Amber: Partially completed
  - Gray: Not started
- **Tap interaction**: Shows examples needed for completion

#### Achievement Badges
- **Badge cards**: Circular icons with progress bars
- **Unlock animations**: Celebration effects when achieved
- **Sharing**: Social media integration for achievements

### 7. Settings & Profile

#### Layout Structure
- **Header**: Profile section with user statistics
- **Settings sections**: Grouped preferences with cards
- **Footer**: App version and support links

#### Profile Section
- **Statistics overview**: Total ciders, experiences, achievements
- **Collection milestone**: Progress toward major goals
- **Recent activity**: Last few ciders logged

#### Settings Categories
**Preferences:**
- **Default container size**: For quick logging
- **Rating scale**: 1-10 vs 1-5 options
- **Location**: Auto-capture GPS toggle
- **Notifications**: Reminder settings

**Data & Export:**
- **Backup data**: Cloud sync options
- **Export collection**: CSV, JSON export
- **Import data**: From other apps or backup

**About:**
- **App version**: Current version info
- **Privacy policy**: Data usage information
- **Support**: Contact and feedback options

## Animation Framework

### Micro-interactions
- **Button press**: 0.95x scale with spring animation (100ms)
- **Card tap**: 1.02x scale with shadow increase (150ms)
- **Toggle switches**: Smooth slide with color transition (200ms)
- **Input focus**: Border glow with color transition (150ms)

### Page Transitions
- **Navigation**: Slide left/right with parallax effect (300ms)
- **Modal present**: Scale up from 0.95x with fade (250ms)
- **Bottom sheet**: Slide up with backdrop blur (300ms)

### Loading States
- **Skeleton cards**: Shimmer animation across card structure
- **Button loading**: Spinner with text change
- **List loading**: Staggered fade-in of items (50ms delays)

### Gesture Animations
- **Pull-to-refresh**: Elastic resistance with spring-back
- **Swipe actions**: Card slide with action reveal
- **Pinch-to-zoom**: Smooth scale with momentum
- **Long press**: Scale down 0.95x with haptic feedback

## Responsive Design

### Mobile (320px - 768px)
- **Single column** layouts
- **Bottom navigation** for main sections
- **Floating action buttons** for primary actions
- **Full-screen modals** for forms

### Tablet (768px - 1024px)
- **Two-column** layouts where appropriate
- **Sidebar navigation** on larger screens
- **Modal dialogs** instead of full-screen
- **Grid layouts** with more columns

### Desktop (1024px+)
- **Multi-column** layouts
- **Hover states** for interactive elements
- **Keyboard navigation** support
- **Context menus** for secondary actions

## Accessibility

### WCAG Compliance
- **Color contrast**: Minimum 4.5:1 ratio for text
- **Touch targets**: Minimum 44px for interactive elements
- **Focus indicators**: Clear visual focus states
- **Screen reader**: Proper semantic markup and labels

### Inclusive Design
- **Reduced motion**: Respect system motion preferences
- **High contrast**: Support for high contrast mode
- **Large text**: Dynamic type scaling support
- **Voice control**: VoiceOver/TalkBack optimization