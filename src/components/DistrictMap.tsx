import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, ActivityIndicator } from 'react-native';
// Conditional import for Expo Go compatibility
let Mapbox: any = null;
let Camera: any = null;
let MapView: any = null;
let ShapeSource: any = null;
let FillLayer: any = null;
let LineLayer: any = null;
let PointAnnotation: any = null;

try {
  const mapboxModule = require('@rnmapbox/maps');
  Mapbox = mapboxModule.default;
  Camera = mapboxModule.Camera;
  MapView = mapboxModule.MapView;
  ShapeSource = mapboxModule.ShapeSource;
  FillLayer = mapboxModule.FillLayer;
  LineLayer = mapboxModule.LineLayer;
  PointAnnotation = mapboxModule.PointAnnotation;
} catch (error) {
  console.log('Mapbox not available in this environment (Expo Go)');
}

// Initialize Mapbox (you'll need to set your access token)
const MAPBOX_ACCESS_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN ||
                            process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || 
                            process.env.EXPO_NEXT_PUBLIC_MAPBOX_TOKEN || 
                            process.env.EPXO_NEXT_PUBLIC_MAPBOX_TOKEN || 
                            process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

// Cloudflare R2 URL for district boundaries
const R2_BASE_URL = process.env.EXPO_PUBLIC_R2_URL || 
                    process.env.NEXT_PUBLIC_R2_URL || 
                    process.env.EXPO_PUBLIC_CLOUDFLARE_R2_URL ||
                    process.env.NEXT_PUBLIC_CLOUDFLARE_R2_URL || '';

console.log('🗺️ Mapbox Token Debug:', {
  EXPO_PUBLIC_MAPBOX_TOKEN: process.env.EXPO_PUBLIC_MAPBOX_TOKEN ? 'SET' : 'NOT SET',
  EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN: process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ? 'SET' : 'NOT SET',
  EXPO_NEXT_PUBLIC_MAPBOX_TOKEN: process.env.EXPO_NEXT_PUBLIC_MAPBOX_TOKEN ? 'SET' : 'NOT SET', 
  EPXO_NEXT_PUBLIC_MAPBOX_TOKEN: process.env.EPXO_NEXT_PUBLIC_MAPBOX_TOKEN ? 'SET' : 'NOT SET',
  finalToken: MAPBOX_ACCESS_TOKEN ? 'SET' : 'NOT SET',
  tokenLength: MAPBOX_ACCESS_TOKEN ? MAPBOX_ACCESS_TOKEN.length : 0
});

console.log('🗺️ R2 CDN Debug:', {
  R2_BASE_URL: R2_BASE_URL ? 'SET' : 'NOT SET',
  R2_URL_LENGTH: R2_BASE_URL ? R2_BASE_URL.length : 0
});

if (MAPBOX_ACCESS_TOKEN && Mapbox) {
  Mapbox.setAccessToken(MAPBOX_ACCESS_TOKEN);
}

interface DistrictMapProps {
  userAddress?: string;
  districtNumber?: string;
  stateCode?: string;
  style?: any;
}

interface DistrictBoundary {
  type: "Feature";
  geometry: {
    type: "Polygon";
    coordinates: number[][][];
  } | {
    type: "MultiPolygon";
    coordinates: number[][][][];
  };
  properties: {
    DISTRICT?: string;
    STATE?: string;
    NAME?: string;
    CD?: string;
    STATEFP?: string;
    [key: string]: any;
  };
}

export default function DistrictMap({ 
  userAddress, 
  districtNumber = "6", 
  stateCode = "IL",
  style 
}: DistrictMapProps) {
  // If Mapbox is not available (Expo Go), show a fallback component
  if (!Mapbox || !MapView) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.fallbackContainer}>
          <Text style={styles.fallbackTitle}>Map Not Available</Text>
          <Text style={styles.fallbackText}>
            Congressional District {districtNumber}, {stateCode}
          </Text>
          <Text style={styles.fallbackSubtext}>
            Maps require a development build. This is a development environment limitation.
          </Text>
        </View>
      </View>
    );
  }

  const [districtBoundary, setDistrictBoundary] = useState<DistrictBoundary | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [districtCenter, setDistrictCenter] = useState<[number, number] | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(8);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDistrictData();
  }, [stateCode, districtNumber, userAddress]);

  const loadDistrictData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // If we have an address, geocode it first
      if (userAddress && MAPBOX_ACCESS_TOKEN) {
        try {
          const geocodeResponse = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(userAddress)}.json?access_token=${MAPBOX_ACCESS_TOKEN}&limit=1`
          );
          
          if (geocodeResponse.ok) {
            const geocodeData = await geocodeResponse.json();
            if (geocodeData.features && geocodeData.features.length > 0) {
              const [lng, lat] = geocodeData.features[0].center;
              setUserLocation([lng, lat]);
              console.log('🗺️ Geocoded address:', { lng, lat });
            }
          }
        } catch (geocodeError) {
          console.error('Error geocoding address:', geocodeError);
        }
      }

            // Fetch actual district boundary from Cloudflare R2 CDN
      if (R2_BASE_URL && stateCode && districtNumber) {
        try {
          // Get state FIPS code mapping
          const stateFipsMap: { [key: string]: string } = {
            'AL': '01', 'AK': '02', 'AZ': '04', 'AR': '05', 'CA': '06', 'CO': '08', 'CT': '09', 'DE': '10',
            'FL': '12', 'GA': '13', 'HI': '15', 'ID': '16', 'IL': '17', 'IN': '18', 'IA': '19', 'KS': '20',
            'KY': '21', 'LA': '22', 'ME': '23', 'MD': '24', 'MA': '25', 'MI': '26', 'MN': '27', 'MS': '28',
            'MO': '29', 'MT': '30', 'NE': '31', 'NV': '32', 'NH': '33', 'NJ': '34', 'NM': '35', 'NY': '36',
            'NC': '37', 'ND': '38', 'OH': '39', 'OK': '40', 'OR': '41', 'PA': '42', 'RI': '44', 'SC': '45',
            'SD': '46', 'TN': '47', 'TX': '48', 'UT': '49', 'VT': '50', 'VA': '51', 'WA': '53', 'WV': '54',
            'WI': '55', 'WY': '56', 'DC': '11'
          };
          
          const stateFips = stateFipsMap[stateCode.toUpperCase()];
          const formattedDistrict = districtNumber.toString().padStart(2, '0');
          
          if (!stateFips) {
            throw new Error(`Unknown state code: ${stateCode}`);
          }
          
          // Try multiple possible file paths and naming conventions
          const fileName = `${stateFips}${formattedDistrict}.geojson`;
          const possiblePaths = [
            `cd118/${fileName}`,                  // cd118 (118th Congress) - correct path
            `cd119/${fileName}`,                  // cd119 (119th Congress) 
            `cd117/${fileName}`,                  // cd117 (117th Congress)
            `districts/cd118/${fileName}`,        // with districts prefix (backup)
            `districts/cd119/${fileName}`,        // with districts prefix (backup)
            `districts/${fileName}`,              // directly in districts folder
            `congressional-districts/${fileName}`, // alternative folder name
          ];
          
          console.log('🌐 Attempting to fetch district boundary from R2 CDN...');
          console.log('🗺️ District info:', { 
            stateCode, 
            districtNumber, 
            stateFips, 
            formattedDistrict, 
            fileName
          });
          
          let boundaryData = null;
          
          // Try each possible path until we find one that works
          for (const filePath of possiblePaths) {
            const fullUrl = `${R2_BASE_URL.replace(/\/$/, '')}/${filePath}`;
            console.log(`🔍 Trying: ${fullUrl}`);
            
            try {
              const response = await fetch(fullUrl);
              if (response.ok) {
                const data = await response.json();
                console.log('✅ Found district boundary at:', filePath);
                boundaryData = data;
                break; // Found it, stop trying other paths
              } else {
                console.log(`❌ Not found at ${filePath} (${response.status})`);
              }
            } catch (fetchError) {
              console.log(`❌ Error fetching ${filePath}:`, (fetchError as Error).message);
            }
          }
          
          // If none of the paths worked, throw an error
          if (!boundaryData) {
            throw new Error('District boundary not found at any expected path');
          }
          
          if (boundaryData) {
            // Handle both single Feature and FeatureCollection
            let districtFeature = null;
            
            if (boundaryData.type === 'FeatureCollection' && boundaryData.features?.length > 0) {
              // Find the feature for our specific district
              districtFeature = boundaryData.features.find((feature: any) => {
                const props = feature.properties || {};
                const cd = props.CD || props.DISTRICT || props.district;
                return cd === formattedDistrict || cd === districtNumber || cd === parseInt(districtNumber, 10);
              });
              
              // If not found by district number, take the first feature
              if (!districtFeature) {
                districtFeature = boundaryData.features[0];
              }
            } else if (boundaryData.type === 'Feature') {
              districtFeature = boundaryData;
            }
            
            if (districtFeature) {
              console.log('🎯 District boundary loaded successfully');
              console.log('📐 Geometry type:', districtFeature.geometry?.type);
              console.log('📊 Properties:', districtFeature.properties);
              
              setDistrictBoundary(districtFeature);
              
              // Calculate the bounding box and center of the district for optimal camera view
              if (districtFeature.geometry) {
                let minLng = Infinity, maxLng = -Infinity;
                let minLat = Infinity, maxLat = -Infinity;
                let centerLng = 0, centerLat = 0, pointCount = 0;
                
                const processCoordinates = (coords: any) => {
                  if (Array.isArray(coords)) {
                    if (typeof coords[0] === 'number') {
                      // It's a coordinate pair [lng, lat]
                      const lng = coords[0];
                      const lat = coords[1];
                      
                      // Update bounding box
                      minLng = Math.min(minLng, lng);
                      maxLng = Math.max(maxLng, lng);
                      minLat = Math.min(minLat, lat);
                      maxLat = Math.max(maxLat, lat);
                      
                      // Calculate center
                      centerLng += lng;
                      centerLat += lat;
                      pointCount++;
                    } else {
                      // It's an array of coordinates
                      coords.forEach(processCoordinates);
                    }
                  }
                };
                
                if (districtFeature.geometry.type === 'Polygon') {
                  districtFeature.geometry.coordinates.forEach(processCoordinates);
                } else if (districtFeature.geometry.type === 'MultiPolygon') {
                  districtFeature.geometry.coordinates.forEach((polygon: any) => {
                    polygon.forEach(processCoordinates);
                  });
                }
                
                if (pointCount > 0) {
                  const calculatedDistrictCenter: [number, number] = [centerLng / pointCount, centerLat / pointCount];
                  
                  // Calculate zoom level based on district bounds
                  const lngDiff = maxLng - minLng;
                  const latDiff = maxLat - minLat;
                  const maxDiff = Math.max(lngDiff, latDiff);
                  
                  // Zoom level calculation (roughly fits the district with some padding)
                  let calculatedZoom = 8; // Default zoom
                  if (maxDiff > 2) calculatedZoom = 6;
                  else if (maxDiff > 1) calculatedZoom = 7;
                  else if (maxDiff > 0.5) calculatedZoom = 8;
                  else if (maxDiff > 0.2) calculatedZoom = 9;
                  else calculatedZoom = 10;
                  
                  setUserLocation(calculatedDistrictCenter);
                  setDistrictCenter(calculatedDistrictCenter);
                  setZoomLevel(calculatedZoom);
                  
                  console.log('📍 District bounds:', { 
                    minLng, maxLng, minLat, maxLat, 
                    center: districtCenter, 
                    zoomLevel: calculatedZoom,
                    boundingBoxSize: maxDiff 
                  });
                }
              }
            } else {
              console.error('❌ No valid district feature found in boundary data');
              throw new Error('Invalid district boundary data structure');
            }
          } else {
            console.error('❌ Could not fetch district boundary from any path');
            throw new Error('District boundary not found in CDN');
          }
          
        } catch (r2Error) {
          console.error('❌ Error fetching from R2 CDN:', r2Error);
          // Fall back to a simple mock boundary if R2 fetch fails
          await createFallbackBoundary();
        }
      } else {
        console.log('⚠️ R2 URL not configured, using fallback boundary');
        await createFallbackBoundary();
      }
      
    } catch (err) {
      console.error('Error loading district data:', err);
      setError('Failed to load district information');
    } finally {
      setLoading(false);
    }
  };

  const createFallbackBoundary = async () => {
    console.log('🔄 Creating fallback boundary...');
    
    const mockDistrictCenter: [number, number] = userLocation || [-87.6298, 41.8781]; // Chicago area default
    
    // Create a simple polygon around the district center as fallback
    const mockBoundary: DistrictBoundary = {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [[
          [mockDistrictCenter[0] - 0.1, mockDistrictCenter[1] - 0.1],
          [mockDistrictCenter[0] + 0.1, mockDistrictCenter[1] - 0.1],
          [mockDistrictCenter[0] + 0.1, mockDistrictCenter[1] + 0.1],
          [mockDistrictCenter[0] - 0.1, mockDistrictCenter[1] + 0.1],
          [mockDistrictCenter[0] - 0.1, mockDistrictCenter[1] - 0.1]
        ]]
      },
      properties: {
        DISTRICT: districtNumber,
        STATE: stateCode,
        NAME: `${stateCode} Congressional District ${districtNumber}`
      }
    };
    
    setDistrictBoundary(mockBoundary);
    
    // If no user location was found through geocoding, use the district center
    if (!userLocation) {
      setUserLocation(mockDistrictCenter);
    }
  };

  if (!MAPBOX_ACCESS_TOKEN) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Mapbox access token required</Text>
          <Text style={styles.errorSubtext}>Please set EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN</Text>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b5bdb" />
          <Text style={styles.loadingText}>Loading district map...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <MapView 
        style={styles.map} 
        styleURL="mapbox://styles/mapbox/dark-v11"
        attributionEnabled={false}
        scaleBarEnabled={false}
        logoEnabled={false}
      >
        {userLocation && (
          <Camera
            centerCoordinate={userLocation}
            zoomLevel={zoomLevel}
            animationDuration={1000}
          />
        )}
        
        {districtBoundary && (
          <ShapeSource id="district-boundary" shape={districtBoundary}>
            <FillLayer
              id="district-fill"
              style={{
                fillColor: '#3b82f6',
                fillOpacity: 0.2,
              }}
            />
            <LineLayer
              id="district-outline"
              style={{
                lineColor: '#3b82f6',
                lineWidth: 3,
                lineOpacity: 0.8,
              }}
            />
          </ShapeSource>
        )}
        
        {userLocation && (
          <PointAnnotation
            id="user-location"
            coordinate={userLocation}
          >
            <View style={styles.userLocationMarker} />
          </PointAnnotation>
        )}
        
      </MapView>
      
      {/* District Title Overlay */}
      <View style={styles.districtTitleOverlay}>
        <Text style={styles.districtTitleText}>
          District {districtNumber}
        </Text>
      </View>
      
      <View style={styles.overlay}>
        <Text style={styles.overlayText}>
          MAP
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 200,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#1e293b', // Navy background to match web
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1e293b',
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 14,
    marginTop: 8,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    padding: 16,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  errorSubtext: {
    color: '#9ca3af',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  overlay: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(30, 38, 66, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  overlayText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  // User location marker styles - matches web version
  userLocationMarker: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#3b82f6',
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  // District title overlay - positioned at top of map
  districtTitleOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    zIndex: 10,
  },
  districtTitleText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  fallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    padding: 20,
  },
  fallbackTitle: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  fallbackText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  fallbackSubtext: {
    color: '#9ca3af',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
}); 