import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, ActivityIndicator } from 'react-native';
import Mapbox, { Camera, MapView, ShapeSource, FillLayer } from '@rnmapbox/maps';

// Initialize Mapbox (you'll need to set your access token)
const MAPBOX_ACCESS_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || '';
if (MAPBOX_ACCESS_TOKEN) {
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
  };
  properties: {
    DISTRICT: string;
    STATE: string;
    NAME: string;
  };
}

export default function DistrictMap({ 
  userAddress, 
  districtNumber = "6", 
  stateCode = "IL",
  style 
}: DistrictMapProps) {
  const [districtBoundary, setDistrictBoundary] = useState<DistrictBoundary | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
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
            }
          }
        } catch (geocodeError) {
          console.error('Error geocoding address:', geocodeError);
        }
      }

      // Get congressional district boundary from Mapbox's datasets
      // For now, we'll use a simplified approach with basic district info
      // In a full implementation, you'd want to use actual GeoJSON district boundaries
      
      // Create a mock district boundary for demonstration
      // In production, you'd fetch real district boundaries from:
      // - US Census Bureau
      // - Mapbox's administrative boundaries
      // - GeoJSON files for congressional districts
      
      const mockDistrictCenter: [number, number] = userLocation || [-87.6298, 41.8781]; // Chicago area default
      
      // Create a simple polygon around the district center
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
      
    } catch (err) {
      console.error('Error loading district data:', err);
      setError('Failed to load district information');
    } finally {
      setLoading(false);
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
      <MapView style={styles.map} styleURL="mapbox://styles/mapbox/dark-v11">
        {userLocation && (
          <Camera
            centerCoordinate={userLocation}
            zoomLevel={10}
            animationDuration={1000}
          />
        )}
        
        {districtBoundary && (
          <ShapeSource id="district-boundary" shape={districtBoundary}>
            <FillLayer
              id="district-fill"
              style={{
                fillColor: '#3b5bdb',
                fillOpacity: 0.3,
                fillOutlineColor: '#3b5bdb'
              }}
            />
          </ShapeSource>
        )}
      </MapView>
      
      <View style={styles.overlay}>
        <Text style={styles.overlayText}>
          {stateCode} District {districtNumber}
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
    backgroundColor: '#151c2e',
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#151c2e',
  },
  loadingText: {
    color: '#9ca3af',
    fontSize: 14,
    marginTop: 8,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#151c2e',
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
}); 