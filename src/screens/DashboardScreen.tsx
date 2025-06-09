import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import MemberCard from '../components/MemberCard';
import DistrictMap from '../components/DistrictMap';
import { getAccurateStatus, getCleanStatus } from '../utils/billStatus';

interface Bill {
  id: string;
  title: string;
  summary: string;
  status: string;
  chamber: string;
  introducedDate: string;
  number: string;
  committees: string;
  latestAction: string;
  latestActionDate: string;
  cosponsors: number;
}

interface Representative {
  id: string;
  fullName: string;
  chamber: string;
  level: string;
  party: string;
  biography: string;
  photoUrl?: string;
  district?: string;
  state?: string;
}

interface DistrictInfo {
  congressional_district?: string;
  state_house_district?: string;
  state_senate_district?: string;
}

export default function DashboardScreen({ navigation }: any) {
  const { userProfile, user, session, loading: authLoading } = useAuth();
  const [bills, setBills] = useState<Bill[]>([]);
  const [representatives, setRepresentatives] = useState<Representative[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Get user address and district info from user profile
  const address = userProfile?.address && userProfile?.city && userProfile?.state && userProfile?.zip
    ? `${userProfile.address}, ${userProfile.city}, ${userProfile.state} ${userProfile.zip}`
    : undefined;

  const [districtInfo, setDistrictInfo] = useState<DistrictInfo>({
    congressional_district: "",
    state_house_district: "", 
    state_senate_district: ""
  });

  useEffect(() => {
    console.log('🔐 Dashboard useEffect - Auth state:', {
      userProfile: !!userProfile,
      user: !!user,
      session: !!session,
      authLoading,
      userId: userProfile?.id
    });
    
    if (!authLoading) {
      loadData();
    }
  }, [userProfile, authLoading]);

  const loadData = async () => {
    console.log('🚀 Starting data load...');
    console.log('🔐 Current auth state:', {
      userProfile: !!userProfile,
      userId: userProfile?.id,
      userEmail: userProfile?.email
    });
    
    // Test database connection
    try {
      console.log('🔌 Testing database connection...');
      const { data: connectionTest, error: connectionError } = await supabase
        .from('users')
        .select('count')
        .limit(1);
      
      console.log('📡 Connection test result:', { connectionTest, connectionError });
      
      if (connectionError) {
        console.error('❌ Database connection failed:', connectionError);
        Alert.alert('Database Error', `Failed to connect to database: ${connectionError.message}`);
        return;
      } else {
        console.log('✅ Database connection successful');
      }
    } catch (connError) {
      console.error('❌ Connection test error:', connError);
      Alert.alert('Database Error', 'Failed to test database connection');
      return;
    }

    try {
      await Promise.all([
        loadBills(),
        loadRepresentatives(),
        loadDistrictInfo(),
      ]);
    } catch (error) {
      console.error('❌ Error loading dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const loadBills = async () => {
    console.log('🔍 Loading user tracked bills...');
    
    if (!userProfile?.id) {
      console.log('❌ No user profile, skipping bills load');
      setBills([]);
      return;
    }

    try {
      // First, get user's tracked bill IDs
      const { data: trackedBillIds, error: trackingError } = await supabase
        .from('user_tracked_bills')
        .select('billId')
        .eq('userId', userProfile.id);

      console.log('📊 User tracked bill IDs:', { data: trackedBillIds, error: trackingError, count: trackedBillIds?.length });
      
      if (trackingError) {
        console.error('❌ Error loading tracked bill IDs:', trackingError);
        setBills([]);
        return;
      }

      if (!trackedBillIds || trackedBillIds.length === 0) {
        console.log('📝 No tracked bills found for user');
        setBills([]);
        return;
      }

      // Extract bill IDs
      const billIds = trackedBillIds.map(item => item.billId);
      console.log('📋 Bill IDs to fetch:', billIds);

      // Debug: Let's also check what bills actually exist in the database
      const { data: allBillsDebug, error: allBillsError } = await supabase
        .from('bills')
        .select('id')
        .limit(10);
      console.log('🔍 Sample bill IDs in database:', allBillsDebug?.map(b => b.id));

      // Then fetch the actual bills
      const { data: billsData, error: billsError } = await supabase
        .from('bills')
        .select('*')
        .in('id', billIds)
        .order('introducedDate', { ascending: false });

      console.log('📊 Bills data result:', { data: billsData, error: billsError, count: billsData?.length });
      
      if (billsError) {
        console.error('❌ Error loading bills data:', billsError);
        setBills([]);
      } else {
        console.log('✅ User tracked bills loaded successfully:', billsData?.length || 0);
        setBills(billsData || []);
      }
    } catch (error) {
      console.error('❌ Exception loading user tracked bills:', error);
      setBills([]);
    }
  };

  const loadRepresentatives = async () => {
    console.log('🔍 Loading user\'s congress members based on address...');
    
    if (!userProfile?.id) {
      console.log('❌ No user profile, skipping representatives load');
      setRepresentatives([]);
      return;
    }

    try {
      // Build full address from user profile
      const addressParts = [
        userProfile.address,
        userProfile.city,
        userProfile.state,
        userProfile.zip
      ].filter(Boolean);
      
      if (addressParts.length === 0) {
        console.log('❌ No address information in user profile');
        setRepresentatives([]);
        return;
      }
      
      const fullAddress = addressParts.join(', ');
      console.log('🏠 User address:', fullAddress);

      const apiKey = process.env.EXPO_PUBLIC_CONGRESS_API_KEY || process.env.NEXT_PUBLIC_CONGRESS_API_KEY;
      
      if (!apiKey) {
        console.error('❌ No Congress API key available');
        setRepresentatives([]);
        return;
      }

      // Get congressional district from Census API
      let stateCode = userProfile.state?.toUpperCase() || 'DC';
      let districtNumber = '01'; // Default
      
      try {
        console.log('🌐 Getting district info from Census API...');
        const censusUrl = `https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress?address=${encodeURIComponent(fullAddress)}&benchmark=Public_AR_Current&vintage=Current_Current&format=json&layers=all`;
        
        const censusResponse = await fetch(censusUrl, {
          headers: {
            'User-Agent': 'CivicWatch/1.0'
          }
        });
        
        if (censusResponse.ok) {
          const censusData = await censusResponse.json();
          console.log('📊 Census API response:', {
            hasResult: !!censusData.result,
            hasMatches: !!censusData.result?.addressMatches,
            matchCount: censusData.result?.addressMatches?.length || 0
          });
          
          if (censusData.result?.addressMatches?.length > 0) {
            const match = censusData.result.addressMatches[0];
            const geographies = match.geographies;
            
            // Extract state
            if (geographies?.States?.[0]?.STUSAB) {
              stateCode = geographies.States[0].STUSAB.toUpperCase();
              console.log(`✅ State from Census: ${stateCode}`);
            }
            
            // Extract congressional district
            if (geographies?.['119th Congressional Districts']?.[0]?.CD119) {
              const cd = geographies['119th Congressional Districts'][0].CD119;
              districtNumber = cd === '00' ? 'At-Large' : cd.padStart(2, '0');
              console.log(`✅ Congressional District from Census: ${districtNumber}`);
            } else if (geographies?.['118th Congressional Districts']?.[0]?.CD118) {
              const cd = geographies['118th Congressional Districts'][0].CD118;
              districtNumber = cd === '00' ? 'At-Large' : cd.padStart(2, '0');
              console.log(`✅ Congressional District from Census (118th): ${districtNumber}`);
            }
          }
        } else {
          console.log(`❌ Census API error: ${censusResponse.status}`);
        }
      } catch (censusError) {
        console.error('❌ Error with Census API:', censusError);
      }
      
      console.log(`🏛️ Looking up representatives for ${stateCode} district ${districtNumber}`);

      // Helper function to format names from "Last, First" to "First Last"
      const formatName = (nameString: string) => {
        if (!nameString) return 'Unknown';
        
        // Handle "Last, First" format from Congress API
        if (nameString.includes(', ')) {
          const parts = nameString.split(', ');
          if (parts.length >= 2) {
            return `${parts[1]} ${parts[0]}`.trim();
          }
        }
        
        // Return as-is if not in expected format
        return nameString;
      };

      // Fetch current congress members for the user's state and district
      const representatives: Representative[] = [];

      // 1. Fetch House Representative for their district using specific endpoint
      try {
        console.log('🏛️ Fetching House representative...');
        // Use the specific district endpoint for House rep
        const houseUrl = `https://api.congress.gov/v3/member/${stateCode}/${districtNumber}?format=json&currentMember=true&api_key=${apiKey}`;
        const houseResponse = await fetch(houseUrl);
        
        if (houseResponse.ok) {
          const houseData = await houseResponse.json();
          console.log(`📊 House API response: ${houseData.members?.length || 0} members found`);
          
          // The district-specific endpoint should return the House rep directly
          if (houseData.members && houseData.members.length > 0) {
            const houseRep = houseData.members[0]; // Should be the district rep
            const formattedName = formatName(houseRep.name);
            
            console.log(`✅ Found House rep: ${formattedName} (${houseRep.partyName}-${houseRep.state}-${houseRep.district})`);
            representatives.push({
              id: houseRep.bioguideId || `house-${stateCode}-${districtNumber}`,
              fullName: formattedName,
              chamber: 'U.S. House',
              level: 'FEDERAL',
              party: houseRep.partyName || 'Unknown',
              biography: `Representative for ${stateCode} District ${houseRep.district || districtNumber}`,
              photoUrl: houseRep.depiction?.imageUrl || `https://www.congress.gov/img/member/${houseRep.bioguideId?.toLowerCase()}_200.jpg`,
              district: houseRep.district || districtNumber,
              state: houseRep.state
            });
          } else {
            console.log(`❌ No House representative found for ${stateCode} district ${districtNumber}`);
          }
        } else {
          console.log(`❌ House API error: ${houseResponse.status}`);
        }
      } catch (houseError) {
        console.error('❌ Error fetching House representative:', houseError);
      }

      // 2. Fetch all state members and filter for Senators
      try {
        console.log('🏛️ Fetching Senators...');
        // Use the state endpoint to get all members, then filter for Senators
        const stateUrl = `https://api.congress.gov/v3/member/${stateCode}?format=json&currentMember=true&limit=50&api_key=${apiKey}`;
        const stateResponse = await fetch(stateUrl);
        
        if (stateResponse.ok) {
          const stateData = await stateResponse.json();
          console.log(`📊 State members API response: ${stateData.members?.length || 0} total members`);
          
          // Filter for Senators (members without district property)
          const senators = stateData.members?.filter((member: any) => {
            // Senators don't have a district property
            const isSenator = member.district === undefined || member.district === null;
            
            // Additional check: verify chamber in terms if available
            if (member.terms?.item && Array.isArray(member.terms.item)) {
              const hasSenateTerms = member.terms.item.some((term: any) => term.chamber === 'Senate');
              return isSenator && hasSenateTerms;
            }
            
            return isSenator;
          }) || [];
          
          console.log(`🔍 Found ${senators.length} senators for ${stateCode}`);
          
          senators.forEach((senator: any, index: number) => {
            const formattedName = formatName(senator.name);
            console.log(`✅ Found Senator ${index + 1}: ${formattedName} (${senator.partyName}-${senator.state})`);
            representatives.push({
              id: senator.bioguideId || `senate-${stateCode}-${index}`,
              fullName: formattedName,
              chamber: 'U.S. Senate',
              level: 'FEDERAL',
              party: senator.partyName || 'Unknown',
              biography: `Senator from ${stateCode}`,
              photoUrl: senator.depiction?.imageUrl || `https://www.congress.gov/img/member/${senator.bioguideId?.toLowerCase()}_200.jpg`,
              state: senator.state
            });
          });
        } else {
          console.log(`❌ State API error: ${stateResponse.status}`);
        }
      } catch (senateError) {
        console.error('❌ Error fetching Senators:', senateError);
      }

      console.log(`🎯 Final representatives: ${representatives.length} total (should be 3: 1 House + 2 Senate)`);
      representatives.forEach(rep => {
        console.log(`  📋 ${rep.fullName} - ${rep.chamber} (${rep.party})`);
      });
      
      setRepresentatives(representatives);
    } catch (error) {
      console.error('❌ Exception loading user\'s congress members:', error);
      setRepresentatives([]);
    }
  };

  const loadDistrictInfo = async () => {
    console.log('🏛️ Loading district information...');
    
    if (!userProfile?.address || !userProfile?.city || !userProfile?.state || !userProfile?.zip) {
      console.log('❌ Incomplete address information');
      setDistrictInfo({
        congressional_district: "",
        state_house_district: "",
        state_senate_district: ""
      });
      return;
    }

    try {
      const fullAddress = `${userProfile.address}, ${userProfile.city}, ${userProfile.state} ${userProfile.zip}`;
      console.log('🏠 Getting district info for address:', fullAddress);

      // Get district info from Census API
      const censusUrl = `https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress?address=${encodeURIComponent(fullAddress)}&benchmark=Public_AR_Current&vintage=Current_Current&format=json&layers=all`;
      
      const censusResponse = await fetch(censusUrl, {
        headers: {
          'User-Agent': 'CivicWatch/1.0'
        }
      });
      
      if (censusResponse.ok) {
        const censusData = await censusResponse.json();
        console.log('📊 Census API response for district info:', {
          hasResult: !!censusData.result,
          hasMatches: !!censusData.result?.addressMatches,
          matchCount: censusData.result?.addressMatches?.length || 0
        });
        
        if (censusData.result?.addressMatches?.length > 0) {
          const match = censusData.result.addressMatches[0];
          const geographies = match.geographies;
          
          let congressional_district = "";
          
          // Extract congressional district
          if (geographies?.['119th Congressional Districts']?.[0]?.CD119) {
            const cd = geographies['119th Congressional Districts'][0].CD119;
            congressional_district = cd === '00' ? 'At-Large' : `District ${parseInt(cd, 10)}`;
            console.log(`✅ Congressional District: ${congressional_district}`);
          } else if (geographies?.['118th Congressional Districts']?.[0]?.CD118) {
            const cd = geographies['118th Congressional Districts'][0].CD118;
            congressional_district = cd === '00' ? 'At-Large' : `District ${parseInt(cd, 10)}`;
            console.log(`✅ Congressional District (118th): ${congressional_district}`);
          }
          
          setDistrictInfo({
            congressional_district,
            state_house_district: "", // TODO: Add state-level district fetching if needed
            state_senate_district: ""
          });
        } else {
          console.log('❌ No matches found in Census API');
          setDistrictInfo({
            congressional_district: "Unable to determine",
            state_house_district: "",
            state_senate_district: ""
          });
        }
      } else {
        console.log(`❌ Census API error: ${censusResponse.status}`);
        setDistrictInfo({
          congressional_district: "Error loading district",
          state_house_district: "",
          state_senate_district: ""
        });
      }
    } catch (error) {
      console.error('❌ Exception loading district info:', error);
      setDistrictInfo({
        congressional_district: "Error loading district",
        state_house_district: "",
        state_senate_district: ""
      });
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    const statusLower = status?.toLowerCase() || '';
    
    if (statusLower.includes('law') || statusLower.includes('enacted')) {
      return '#10b981'; // green-700 equivalent
    } else if (statusLower.includes('president')) {
      return '#059669'; // emerald-600 equivalent
    } else if (statusLower.includes('passed congress')) {
      return '#1e40af'; // blue-800 equivalent
    } else if (statusLower.includes('passed house') || statusLower.includes('passed senate')) {
      return '#1d4ed8'; // blue-700 equivalent
    } else if (statusLower.includes('agreed to')) {
      return '#4338ca'; // indigo-700 equivalent
    } else if (statusLower.includes('reported')) {
      return '#c2410c'; // orange-700 equivalent
    } else if (statusLower.includes('committee') || statusLower.includes('referred')) {
      return '#a16207'; // yellow-700 equivalent
    } else if (statusLower.includes('introduced')) {
      return '#7c3aed'; // purple-700 equivalent
    } else if (statusLower.includes('vetoed')) {
      return '#b91c1c'; // red-700 equivalent
    } else {
      return '#6b7280'; // gray-600 equivalent
    }
  };

  const getPartyColor = (party: string) => {
    const partyLower = party?.toLowerCase() || '';
    if (partyLower.includes('republican')) return '#dc2626';
    if (partyLower.includes('democrat')) return '#2563eb';
    if (partyLower.includes('independent')) return '#7c3aed';
    return '#6b7280';
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerContent}>
        <View>
          <Text style={styles.headerTitle}>Your Dashboard</Text>
          <Text style={styles.headerSubtitle}>Welcome back, {userProfile?.fullName || 'User'}</Text>
        </View>
        <TouchableOpacity style={styles.settingsButton} onPress={() => navigation.getParent()?.navigate('Profile')}>
          <Ionicons name="settings" size={20} color="#9ca3af" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderInfoCard = () => (
    <View style={styles.infoCard}>
      <Text style={styles.cardTitle}>INFO</Text>
      <View style={styles.infoContent}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Congressional District:</Text>
          <Text style={styles.infoValue}>
            {districtInfo.congressional_district || (address ? 'Loading...' : 'Add address to see district')}
          </Text>
        </View>
        {!address && (
          <TouchableOpacity 
            style={styles.addAddressButton}
            onPress={() => navigation.navigate('AddressSetup')}
          >
            <Text style={styles.addAddressButtonText}>Add Your Address</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderRepresentativesCard = () => (
    <View style={styles.repsCard}>
      <Text style={styles.cardTitle}>Your Congress Members</Text>
      <Text style={styles.cardSubtitle}>Based on your address</Text>
      <View style={styles.repsContent}>
        {representatives.length > 0 ? (
          representatives.map(rep => (
            <MemberCard
              key={rep.id}
              name={rep.fullName || 'Unknown Representative'}
              party={rep.party || 'Unknown'}
              state={rep.state || 'Unknown'}
              chamber={rep.chamber}
              district={rep.district}
              photoUrl={rep.photoUrl}
              contactButtonText="View"
              onContact={() => navigation.navigate('RepresentativeDetail', { repId: rep.id })}
            />
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              {!userProfile?.address ? 'Add your address in profile to see your representatives' : 'Unable to find representatives for your area'}
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  const renderDistrictMap = () => {
    // Only show map if user has address and district info
    if (!address || !districtInfo.congressional_district) {
      return (
        <View style={styles.mapCard}>
          <Text style={styles.mapPlaceholderText}>
            {!address ? 'Add your address to view district map' : 'Loading district information...'}
          </Text>
        </View>
      );
    }

    return (
      <DistrictMap
        userAddress={address}
        districtNumber={districtInfo.congressional_district.replace('District ', '')}
        stateCode={userProfile?.state?.toUpperCase() || 'IL'}
        style={styles.mapCard}
      />
    );
  };

  const renderRepCard = (rep: Representative) => (
    <TouchableOpacity
      key={rep.id}
      style={styles.repCard}
      onPress={() => navigation.navigate('RepresentativeDetail', { repId: rep.id })}
    >
      <View style={styles.repCardHeader}>
        <Text style={styles.repCardName}>{rep.fullName}</Text>
        <View style={[styles.partyBadge, { backgroundColor: getPartyColor(rep.party) }]}>
          <Text style={styles.statusText}>{rep.party}</Text>
        </View>
      </View>
      <Text style={styles.repCardTitle}>{rep.chamber}</Text>
      <View style={styles.repCardFooter}>
        <Text style={styles.repCardMeta}>{rep.level}</Text>
        <Text style={styles.repCardMeta}>{rep.party}</Text>
      </View>
    </TouchableOpacity>
  );

  if (authLoading || loading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#3b5bdb" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  if (!userProfile) {
    return (
      <View style={styles.authScreen}>
        <Text style={styles.authTitle}>Sign In Required</Text>
        <Text style={styles.authText}>
          Please sign in to access your dashboard and track bills and representatives.
        </Text>
        <TouchableOpacity 
          style={styles.signInButton}
          onPress={() => navigation.navigate('Auth')}
        >
          <Text style={styles.signInButtonText}>Sign In / Sign Up</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b5bdb" />
      }
      showsVerticalScrollIndicator={false}
    >
      {renderHeader()}
      
      {/* Address Display */}
      {address && (
        <View style={styles.addressContainer}>
          <Text style={styles.addressText}>{address}</Text>
        </View>
      )}
      
      <View style={styles.content}>
        {/* Info Card */}
        {renderInfoCard()}

        {/* Representatives Card */}
        {renderRepresentativesCard()}

        {/* District Map - Only show if Mapbox token is available */}
        {(process.env.EXPO_PUBLIC_MAPBOX_TOKEN || process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN) && renderDistrictMap()}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#151c2e', // navy from web
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#151c2e', // navy - blend with container
    borderBottomWidth: 0, // remove border for seamless look
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#9ca3af',
    fontWeight: '500',
    marginTop: 2,
  },
  settingsButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: 'transparent',
  },
  addressContainer: {
    padding: 20,
    paddingTop: 0,
    backgroundColor: '#151c2e', // navy
  },
  addressText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '500',
  },
  content: {
    padding: 16,
    gap: 16,
    backgroundColor: '#151c2e', // navy
  },
  infoCard: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#1e2642', // navy-light from web
    borderWidth: 0, // remove border for cleaner look
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#9ca3af',
    fontWeight: '500',
    marginBottom: 12,
  },
  infoContent: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 16,
    color: '#9ca3af',
  },
  infoValue: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  repsCard: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#1e2642', // navy-light from web
    borderWidth: 0, // remove border
  },
  repsContent: {
    gap: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#9ca3af',
    fontWeight: '500',
  },
  mapCard: {
    borderRadius: 8,
    backgroundColor: '#1e2642', // navy-light from web
    borderWidth: 0, // remove border
    overflow: 'hidden',
    height: 200,
  },
  mapPlaceholderText: {
    color: '#9ca3af',
    fontSize: 16,
    textAlign: 'center',
    padding: 20,
    alignSelf: 'center',
    marginTop: 60,
  },
  loadingScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#151c2e', // navy
  },
  loadingText: {
    color: '#9ca3af',
    fontSize: 16,
    marginTop: 12,
  },
  authScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#151c2e', // navy
  },
  authTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
  },
  authText: {
    fontSize: 16,
    color: '#ffffff',
    marginBottom: 16,
    textAlign: 'center',
  },
  signInButton: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#3b5bdb', // civic-blue from web
    alignItems: 'center',
  },
  signInButtonText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  billCard: {
    backgroundColor: '#1e2642', // navy-light from web
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 0, // remove border
  },
  billHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  billNumber: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  billTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
  },
  billMeta: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  billMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  billMetaText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  billFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  billAction: {
    fontSize: 14,
    color: '#ffffff',
    flex: 1,
  },
  repCard: {
    backgroundColor: '#1e2642', // navy-light from web
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 0, // remove border
  },
  repCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  repCardName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  partyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  repCardTitle: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  repCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  repCardMeta: {
    fontSize: 12,
    color: '#9ca3af',
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    fontWeight: 'bold',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  contentContainer: {
    paddingBottom: 100, // Add bottom padding to prevent content from being hidden behind the navigation bar
  },
  addAddressButton: {
    backgroundColor: '#3b5bdb',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  addAddressButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
}); 