 [DistributionsTab] Distributions computed successfully
 LOG  [VenueAnalyzer] Generating heat map for 1 experiences
 LOG  [VenueAnalyzer] Calculating insights for 1 experiences
 LOG  [AnalyticsCacheManager] Set cache entry: venue:insights:1 (TTL: 300000ms)
 LOG  [VenueAnalyzer] getVenuePointsFromTable: Found 1 total venues
 LOG  [VenueAnalyzer] Sample venues: [{"location": {"latitude": 51.4549781, "longitude": -0.2044713}, "name": "Testyieeees", "type": "retail", "visitCount": 1}]
 LOG  [VenueAnalyzer] getVenuePointsFromTable: 1 venues with valid location, 0 without location, 0 invalid coords
 LOG  [VenueAnalyzer] Returning 1 venue points for heat map
 LOG  [AnalyticsCacheManager] Set cache entry: venue:heat_map:1:100 (TTL: 300000ms)
 LOG  [VenueAnalyzer] Heat map generated in 25.52ms
 LOG  [VenuesTab] Analytics loaded in 27.04ms
 LOG  [VenueHeatMap] Received data: {"bounds": {"centerLat": 51.4549781, "centerLng": -0.2044713, "maxLat": 51.4549781, "maxLng": -0.2044713, "minLat": 51.4549781, "minLng": -0.2044713}, "firstPoint": {"experiences": 1, "latitude": 51.4549781, "longitude": -0.2044713, "venueNames": ["Testyieeees"], "weight": 1}, "metadata": {"clusterRadius": 100, "totalExperiences": 1, "totalVenues": 1}, "points": 1}
 LOG  [VenueAnalyzer] Heat map retrieved from cache
 LOG  [VenueAnalyzer] Insights retrieved from cache
 LOG  [VenuesTab] Analytics loaded in 1.60ms