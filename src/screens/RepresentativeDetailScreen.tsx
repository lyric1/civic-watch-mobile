import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Linking,
  Share,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface RepresentativeDetail {
  id: string;
  fullName: string;
  chamber: string;
  level: string;
  party: string;
  biography?: string;
  photoUrl?: string;
  contactInfo?: string;
  state?: string;
  phone?: string;
  email?: string;
  website?: string;
  office_address?: string;
  bio?: string;
  district?: string;
  committees?: string[];
  recent_votes?: Array<{
    bill_title: string;
    vote: string;
    date: string;
  }>;
}

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
  sponsor?: string;
}

// Add function to clean up bill status
const getCleanStatus = (latestActionText: string): string => {
  if (!latestActionText) return 'Introduced';
  
  const actionLower = latestActionText.toLowerCase();
  
  // Check for enacted/law status
  if (actionLower.includes('became public law') || actionLower.includes('signed by president')) {
    return 'Enacted';
  }
  
  // Check for presidential action
  if (actionLower.includes('presented to president') || actionLower.includes('sent to president')) {
    return 'Sent to President';
  }
  
  // Check for passed both chambers
  if (actionLower.includes('passed congress') || 
      (actionLower.includes('passed house') && actionLower.includes('passed senate'))) {
    return 'Passed Congress';
  }
  
  // Check for passed one chamber
  if (actionLower.includes('passed house')) {
    return 'Passed House';
  }
  if (actionLower.includes('passed senate')) {
    return 'Passed Senate';
  }
  
  // Check for committee action
  if (actionLower.includes('reported by committee') || actionLower.includes('committee agreed')) {
    return 'Reported by Committee';
  }
  if (actionLower.includes('referred to committee') || actionLower.includes('referred to the committee')) {
    return 'In Committee';
  }
  
  // Check for floor action
  if (actionLower.includes('agreed to') && (actionLower.includes('house') || actionLower.includes('senate'))) {
    return 'Agreed to';
  }
  
  // Check for introduced
  if (actionLower.includes('introduced') || actionLower.includes('received in')) {
    return 'Introduced';
  }
  
  // Check for vetoed
  if (actionLower.includes('vetoed')) {
    return 'Vetoed';
  }
  
  // If none of the above, try to extract a shorter version
  if (latestActionText.length > 30) {
    // Try to find key action words and create a shorter status
    if (actionLower.includes('committee')) return 'Committee Action';
    if (actionLower.includes('floor')) return 'Floor Action';
    if (actionLower.includes('amendment')) return 'Amendment';
    if (actionLower.includes('motion')) return 'Motion';
    if (actionLower.includes('debate')) return 'In Debate';
    
    return 'In Progress';
  }
  
  return latestActionText;
};

export default function RepresentativeDetailScreen({ route, navigation }: any) {
  const { repId, fromCongressAPI } = route.params;
  const { user } = useAuth();
  const [representative, setRepresentative] = useState<RepresentativeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [billsLoading, setBillsLoading] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [activeTab, setActiveTab] = useState<'sponsored' | 'cosponsored'>('sponsored');
  const [sponsoredBills, setSponsoredBills] = useState<Bill[]>([]);
  const [cosponsoredBills, setCosponsoredBills] = useState<Bill[]>([]);

  useEffect(() => {
    loadRepresentativeDetail();
    checkTrackingStatus();
  }, [repId]);

  useEffect(() => {
    if (representative) {
      loadBills();
    }
  }, [representative, activeTab]);

  const loadRepresentativeDetail = async () => {
    try {
      console.log('🔍 Loading representative detail for:', repId, 'fromCongressAPI:', fromCongressAPI);
      
      let data = null;
      let needsApiData = true;
      
      // Only try database lookup if not specifically from Congress API
      if (!fromCongressAPI) {
        const { data: dbData, error } = await supabase
          .from('representatives')
          .select('*')
          .eq('id', repId)
          .single();

        if (error && error.code !== 'PGRST116') {
          // Real error, not just "no rows found"
          console.error('❌ Database error loading representative:', error);
        }

        if (dbData) {
          data = dbData;
          console.log('✅ Representative data loaded from database:', {
            name: data.fullName,
            chamber: data.chamber,
            party: data.party,
            state: data.state,
            hasPhoto: !!data.photoUrl,
            hasContactInfo: !!data.contactInfo
          });

          // Check if we need to fetch from Congress API
          needsApiData = !data.fullName || 
                        data.fullName === 'Unknown' || 
                        !data.chamber || 
                        !data.party;
        } else {
          console.log('📡 Representative not found in database, will fetch from Congress API');
        }
      } else {
        console.log('🌐 Skipping database lookup, loading directly from Congress API');
      }

      // Initialize repData
      let repData: RepresentativeDetail = data ? {
        ...data,
        phone: data.contactInfo 
          ? (JSON.parse(data.contactInfo)?.phone || data.phone) 
          : data?.phone,
        email: data.contactInfo 
          ? (JSON.parse(data.contactInfo)?.email || data.email) 
          : data?.email,
        website: data.contactInfo 
          ? (JSON.parse(data.contactInfo)?.website || JSON.parse(data.contactInfo)?.office || data.website)
          : data?.website,
        office_address: data.contactInfo 
          ? (JSON.parse(data.contactInfo)?.office || data.office_address) 
          : data?.office_address,
        bio: data.biography || data.bio,
      } : {
        id: repId,
        fullName: 'Loading...',
        chamber: 'U.S. Congress',
        level: 'federal',
        party: 'Unknown'
      };

      // Fetch from Congress API if needed or if explicitly requested
      if (needsApiData || fromCongressAPI) {
        console.log('🌐 Fetching representative data from Congress API...');
        
        try {
          const apiKey = process.env.EXPO_PUBLIC_CONGRESS_API_KEY || process.env.NEXT_PUBLIC_CONGRESS_API_KEY;
          const apiUrl = `https://api.congress.gov/v3/member/${repId}?api_key=${apiKey}`;
          
          console.log(`🔑 API Key available: ${!!apiKey}`);
          console.log(`🌐 API URL: ${apiUrl.replace(apiKey || '', '[REDACTED]')}`);
          
          const response = await fetch(apiUrl);
          console.log(`📡 Congress API response status: ${response.status}`);
          
          if (!response.ok) {
            console.log(`❌ Congress API error: ${response.status}`);
            const errorText = await response.text();
            console.log(`❌ Error details: ${errorText.substring(0, 200)}`);
            throw new Error(`Failed to load representative from Congress API: ${response.status}`);
          } else {
            const apiData = await response.json();
            const member = apiData.member;
            
            console.log(`📋 Congress API member data:`, {
              hasApiData: !!apiData,
              hasMember: !!member,
              memberKeys: member ? Object.keys(member) : 'no member',
              name: member?.name,
              firstName: member?.firstName,
              lastName: member?.lastName,
              party: member?.partyName || member?.party,
              state: member?.state
            });

            if (member) {
              // Determine chamber from ID and API data
              let chamber = null;
              const currentTerm = member?.terms?.[member?.terms?.length - 1];
              
              if (currentTerm?.chamber) {
                if (currentTerm.chamber.toLowerCase().includes('senate')) {
                  chamber = 'U.S. Senate';
                } else if (currentTerm.chamber.toLowerCase().includes('house')) {
                  chamber = 'U.S. House';
                }
              }
              
              // Fallback to ID-based detection
              if (!chamber) {
                if (repId.startsWith('S')) {
                  chamber = 'U.S. Senate';
                } else if (repId.startsWith('H') || repId.startsWith('C') || repId.startsWith('O')) {
                  chamber = 'U.S. House';
                } else if (repId.startsWith('D')) {
                  const apiChamber = member?.chamber;
                  if (apiChamber) {
                    if (apiChamber.toLowerCase().includes('senate')) {
                      chamber = 'U.S. Senate';
                    } else if (apiChamber.toLowerCase().includes('house')) {
                      chamber = 'U.S. House';
                    } else {
                      chamber = `U.S. ${apiChamber}`;
                    }
                  } else {
                    chamber = 'U.S. Congress';
                  }
                }
              }

              console.log(`🏛️ Chamber detection: ${chamber}`);

              // Extract party information from partyHistory (most recent entry)
              let partyInfo = 'Unknown';
              if (member?.partyHistory && member.partyHistory.length > 0) {
                // Get the most recent party (usually the last entry, or one without endYear)
                const currentParty = member.partyHistory.find((p: any) => !p.endYear) || 
                                   member.partyHistory[member.partyHistory.length - 1];
                partyInfo = currentParty?.partyName || currentParty?.partyAbbreviation || 'Unknown';
                console.log(`🎭 Party from partyHistory: ${partyInfo}`, currentParty);
              }

              // Update representative data with API info
              repData = {
                ...repData,
                fullName: member?.name || member?.directOrderName || `${member?.firstName || ''} ${member?.lastName || ''}`.trim() || repData.fullName,
                chamber: chamber || repData.chamber,
                party: partyInfo || repData.party,
                biography: member?.directOrderName || member?.bioText || repData.biography,
                photoUrl: member?.depiction?.imageUrl || `https://www.congress.gov/img/member/${repId.toLowerCase()}_200.jpg` || repData.photoUrl,
                district: member?.district || member?.terms?.[0]?.district || repData.district,
                state: member?.state || member?.terms?.[0]?.state || repData.state,
                bio: member?.bioText || `Member of the U.S. Congress representing ${member?.state || repData.state}`,
                // Update contact info with API data
                website: member?.officialWebsiteUrl || repData.website,
                office_address: member?.address?.[0]?.formattedAddress || repData.office_address,
              };

              console.log('✅ Updated representative with Congress API data:', {
                name: repData.fullName,
                chamber: repData.chamber,
                party: repData.party,
                state: repData.state,
                district: repData.district,
                hasPhoto: !!repData.photoUrl,
                hasWebsite: !!repData.website
              });
            }
          }
        } catch (apiError) {
          console.error('❌ Error fetching from Congress API:', apiError);
          // If this was a Congress API-only request and it failed, show error
          if (fromCongressAPI) {
            Alert.alert('Error', 'Failed to load representative details from Congress API');
            navigation.goBack();
            return;
          }
        }
      }

      console.log('📞 Final contact info:', {
        phone: repData.phone,
        email: repData.email,
        website: repData.website,
        office: repData.office_address
      });

      setRepresentative(repData);
    } catch (error) {
      console.error('❌ Exception loading representative detail:', error);
      Alert.alert('Error', 'Failed to load representative details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const loadBills = async () => {
    if (!representative) return;
    
    setBillsLoading(true);
    console.log(`🔍 Loading ${activeTab} bills for:`, representative.fullName, `(ID: ${repId})`);

    try {
      const apiKey = process.env.EXPO_PUBLIC_CONGRESS_API_KEY || process.env.NEXT_PUBLIC_CONGRESS_API_KEY;
      
      let apiBills: Bill[] = [];
      
      if (apiKey) {
        try {
          let apiUrl = '';
          
          if (activeTab === 'sponsored') {
            // Get bills sponsored by this specific member
            apiUrl = `https://api.congress.gov/v3/member/${repId}/sponsored-legislation?api_key=${apiKey}&limit=20`;
          } else {
            // Get bills cosponsored by this specific member  
            apiUrl = `https://api.congress.gov/v3/member/${repId}/cosponsored-legislation?api_key=${apiKey}&limit=20`;
          }
          
          console.log(`🌐 Fetching ${activeTab} bills for ${repId}: ${apiUrl.replace(apiKey, '[REDACTED]')}`);
          
          const response = await fetch(apiUrl);
          console.log(`📡 Bills API response status: ${response.status}`);
          
          if (response.ok) {
            const data = await response.json();
            console.log(`📊 Congress API ${activeTab} bills response:`, {
              totalBills: data.sponsoredLegislation?.length || data.cosponsoredLegislation?.length || 0,
              hasData: !!(data.sponsoredLegislation || data.cosponsoredLegislation)
            });
            
            const billsList = data.sponsoredLegislation || data.cosponsoredLegislation || [];
            
            if (billsList && billsList.length > 0) {
              console.log(`🎯 Found ${billsList.length} ${activeTab} bills for ${representative.fullName}`);
              
              // Transform API bills to our format using the basic info provided
              const seenIds = new Set<string>();
              for (const billData of billsList) {
                try {
                  // Ensure we have valid data for ID generation
                  const billType = billData.type || 'UNKNOWN';
                  const billNumber = billData.number || Math.random().toString(36).substr(2, 9);
                  const congress = billData.congress || '118';
                  
                  // Create unique ID and check for duplicates
                  let billId = `${billType}${billNumber}-${congress}`;
                  if (seenIds.has(billId)) {
                    billId = `${billId}-${Math.random().toString(36).substr(2, 5)}`;
                  }
                  seenIds.add(billId);
                  
                  const transformedBill: Bill = {
                    id: billId,
                    title: billData.title || 'No title available',
                    summary: billData.policyArea?.name || 'Policy area information not available',
                    status: getCleanStatus(billData.latestAction?.text || 'Introduced'),
                    chamber: billData.type === 'S' ? 'Senate' : 'House',
                    introducedDate: billData.introducedDate || new Date().toISOString(),
                    number: `${billType} ${billNumber}`,
                    committees: 'Various Committees', // Not provided in basic response
                    latestAction: billData.latestAction?.text || 'Introduced in Congress',
                    latestActionDate: billData.latestAction?.actionDate || billData.introducedDate || new Date().toISOString(),
                    cosponsors: 0, // Not provided in basic response
                    sponsor: activeTab === 'sponsored' ? representative.fullName : 'Unknown'
                  };
                  
                  apiBills.push(transformedBill);
                  console.log(`✅ Added ${activeTab} bill: ${transformedBill.number} - ${transformedBill.title.substring(0, 50)}...`);
                } catch (billError) {
                  console.error('❌ Error transforming bill data:', billError);
                }
              }
              
              console.log(`🎯 Successfully loaded ${apiBills.length} ${activeTab} bills from Congress API`);
            } else {
              console.log(`📝 No ${activeTab} bills found for ${representative.fullName}`);
            }
          } else {
            console.log(`❌ Congress API ${activeTab} bills error: ${response.status}`);
            const errorText = await response.text();
            console.log(`❌ Error details: ${errorText.substring(0, 200)}`);
          }
        } catch (apiError) {
          console.error(`❌ Error fetching ${activeTab} bills from Congress API:`, apiError);
        }
      }
      
      // If no API bills, fall back to database
      if (apiBills.length === 0) {
        console.log('📊 No bills from API, falling back to database...');
        
        const { data: bills, error } = await supabase
          .from('bills')
          .select('*')
          .order('introducedDate', { ascending: false })
          .limit(10);

        if (!error && bills && bills.length > 0) {
          console.log(`📊 Total bills loaded from database: ${bills.length}`);
          
          if (activeTab === 'sponsored') {
            apiBills = bills.slice(0, 3);
          } else {
            apiBills = bills.slice(3, 6);
          }
          
          console.log(`🎯 Using ${apiBills.length} bills from database as fallback`);
        }
      }

      // Update state based on active tab
      if (activeTab === 'sponsored') {
        setSponsoredBills(apiBills);
        console.log(`📝 Set sponsored bills: ${apiBills.length}`);
      } else {
        setCosponsoredBills(apiBills);
        console.log(`🤝 Set co-sponsored bills: ${apiBills.length}`);
      }
      
    } catch (error) {
      console.error('❌ Error loading bills:', error);
    } finally {
      setBillsLoading(false);
    }
  };

  const checkTrackingStatus = async () => {
    if (!user) return;

    try {
      console.log(`🔍 Checking tracking status for rep ${repId} and user ${user.id}`);
      
      const { data, error } = await supabase
        .from('user_tracked_representatives')
        .select('userId, repId')
        .eq('userId', user.id)
        .eq('repId', repId)
        .single();

      console.log(`📊 Tracking check result:`, { data, error, isTracking: !!data });
      
      if (error && error.code !== 'PGRST116') {
        // PGRST116 means no rows found, which is expected when not tracking
        console.error('❌ Error checking tracking status:', error);
      }
      
      setIsTracking(!!data);
      console.log(`🔍 Tracking status for ${repId}:`, !!data);
    } catch (error) {
      console.error('❌ Exception checking tracking status:', error);
      // Not tracking - this is expected when not found
      setIsTracking(false);
    }
  };

  const toggleTracking = async () => {
    if (!user) {
      Alert.alert('Please sign in', 'You need to sign in to track representatives');
      return;
    }

    try {
      if (isTracking) {
        // Remove from tracking
        const { error } = await supabase
          .from('user_tracked_representatives')
          .delete()
          .eq('userId', user.id)
          .eq('repId', repId);

        if (error) throw error;
        setIsTracking(false);
        console.log('✅ Representative removed from tracking');
        Alert.alert('Success', 'Representative removed from tracking');
      } else {
        // Add to tracking - use upsert to handle duplicates
        const { error } = await supabase
          .from('user_tracked_representatives')
          .upsert({
            userId: user.id,
            repId: repId,
            createdAt: new Date().toISOString(),
          }, {
            onConflict: 'userId,repId'
          });

        if (error) throw error;
        setIsTracking(true);
        console.log('✅ Representative added to tracking');
        Alert.alert('Success', 'Representative added to tracking');
      }
    } catch (error: any) {
      console.error('❌ Error toggling tracking:', error);
      Alert.alert('Error', error.message || 'Failed to update tracking status');
    }
  };

  const handleContact = () => {
    console.log('📞 Contact button pressed');
    console.log('Contact info available:', {
      phone: representative?.phone,
      email: representative?.email
    });

    if (representative?.phone && representative.phone !== 'Not available') {
      const cleanPhone = representative.phone.replace(/[^\d]/g, '');
      const phoneUrl = `tel:${cleanPhone}`;
      console.log('📞 Opening phone:', phoneUrl);
      Linking.openURL(phoneUrl).catch(err => {
        console.error('❌ Error opening phone:', err);
        Alert.alert('Error', 'Unable to open phone app');
      });
    } else if (representative?.email && representative.email !== 'Not available') {
      const emailUrl = `mailto:${representative.email}`;
      console.log('📧 Opening email:', emailUrl);
      Linking.openURL(emailUrl).catch(err => {
        console.error('❌ Error opening email:', err);
        Alert.alert('Error', 'Unable to open email app');
      });
    } else {
      Alert.alert('Contact Info', 'No contact information available for this representative');
    }
  };

  const handleWebsite = () => {
    console.log('🌐 Website button pressed');
    console.log('Website available:', representative?.website);

    if (representative?.website && representative.website !== 'Not available') {
      let url = representative.website;
      
      // Ensure URL has protocol
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = `https://${url}`;
      }
      
      console.log('🌐 Opening website:', url);
      Linking.openURL(url).catch(err => {
        console.error('❌ Error opening website:', err);
        Alert.alert('Error', 'Unable to open website');
      });
    } else {
      // Try to construct a congress.gov URL
      const congressUrl = `https://www.congress.gov/member/${representative?.fullName.toLowerCase().replace(/\s+/g, '-')}`;
      console.log('🌐 Opening fallback congress.gov URL:', congressUrl);
      
      Linking.openURL(congressUrl).catch(err => {
        console.error('❌ Error opening congress.gov:', err);
        Alert.alert('Website', 'No website available for this representative');
      });
    }
  };

  const getPartyColor = (party: string) => {
    const partyLower = party?.toLowerCase() || '';
    if (partyLower.includes('republican')) return '#dc2626';
    if (partyLower.includes('democrat')) return '#2563eb';
    if (partyLower.includes('independent')) return '#7c3aed';
    return '#6b7280';
  };

  const getPartyAbbreviation = (party: string) => {
    const partyLower = party?.toLowerCase() || '';
    if (partyLower.includes('republican')) return 'R';
    if (partyLower.includes('democrat')) return 'D';
    if (partyLower.includes('independent')) return 'I';
    return '?';
  };

  const getChamberTitle = (chamber: string) => {
    if (chamber?.toLowerCase().includes('senate')) return 'U.S. Senator';
    if (chamber?.toLowerCase().includes('house')) return 'U.S. Representative';
    return chamber || 'Member of Congress';
  };

  const getDistrictInfo = (representative: RepresentativeDetail) => {
    if (representative.district) {
      return `Congressional District ${representative.district}`;
    }
    return representative.state ? `${representative.state}` : '';
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

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } catch {
      return dateString;
    }
  };

  const handleBillPress = (billId: string) => {
    navigation.navigate('BillDetail', { billId });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b5bdb" />
        <Text style={styles.loadingText}>Loading representative details...</Text>
      </View>
    );
  }

  if (!representative) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="person-outline" size={48} color="#6b7280" />
        <Text style={styles.errorText}>Representative not found</Text>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentBills = activeTab === 'sponsored' ? sponsoredBills : cosponsoredBills;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header Section */}
      <View style={styles.header}>
        <View style={styles.profileSection}>
          <View style={styles.profileImageContainer}>
            {representative.photoUrl ? (
              <Image source={{ uri: representative.photoUrl }} style={styles.profileImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {representative.fullName.split(' ').map(n => n.charAt(0)).join('').slice(0, 2)}
                </Text>
              </View>
            )}
            {representative.party && (
              <View style={[styles.partyBadge, { backgroundColor: getPartyColor(representative.party) }]}>
                <Text style={styles.partyBadgeText}>{getPartyAbbreviation(representative.party)}</Text>
              </View>
            )}
          </View>
          
          <View style={styles.profileInfo}>
            <Text style={styles.name}>{representative.fullName}</Text>
            <Text style={styles.title}>{getChamberTitle(representative.chamber)}</Text>
            <Text style={styles.district}>{getDistrictInfo(representative)}</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, isTracking ? styles.trackedButton : styles.trackButton]}
            onPress={toggleTracking}
          >
            <Text style={styles.actionButtonText}>
              {isTracking ? 'Tracking' : 'Track'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleContact}>
            <Ionicons name="chatbubble-outline" size={16} color="#9ca3af" />
            <Text style={styles.actionButtonTextSecondary}>Contact</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleWebsite}>
            <Ionicons name="globe-outline" size={16} color="#9ca3af" />
            <Text style={styles.actionButtonTextSecondary}>Website</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content Sections */}
      <View style={styles.content}>
        {/* Biography Section */}
        <View style={styles.biographySection}>
          <Text style={styles.sectionTitle}>Biography</Text>
          <Text style={styles.biographyText}>
            {representative.bio || 
             `${representative.fullName} represents ${representative.state}${representative.district ? `'s ${representative.district}th Congressional District` : ''} in the ${representative.chamber || 'U.S. Congress'} as a member of the ${representative.party || 'party'}.`}
          </Text>
        </View>

        {/* Information Section */}
        <View style={styles.informationSection}>
          <Text style={styles.sectionTitle}>Information</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Party</Text>
              <Text style={styles.infoValue}>{representative.party || 'Unknown'}</Text>
            </View>
            
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Chamber</Text>
              <Text style={styles.infoValue}>{representative.chamber || 'Unknown'}</Text>
            </View>
            
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>State</Text>
              <Text style={styles.infoValue}>{representative.state || 'Unknown'}</Text>
            </View>
            
            {representative.district && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>District</Text>
                <Text style={styles.infoValue}>{representative.district}</Text>
              </View>
            )}
            
            {representative.office_address && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Office</Text>
                <Text style={styles.infoValue}>{representative.office_address}</Text>
              </View>
            )}
            
            {representative.phone && representative.phone !== 'Not available' && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Phone</Text>
                <Text style={styles.infoValue}>{representative.phone}</Text>
              </View>
            )}
            
            {representative.email && representative.email !== 'Not available' && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{representative.email}</Text>
              </View>
            )}
            
            {representative.website && representative.website !== 'Not available' && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Website</Text>
                <Text style={styles.infoValueLink} numberOfLines={1}>
                  {representative.website.replace(/^https?:\/\//, '')}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Legislative Activity */}
        <View style={styles.legislativeSection}>
          <View style={styles.legislativeHeader}>
            <Ionicons name="list-outline" size={20} color="#ffffff" />
            <Text style={styles.legislativeSectionTitle}>Legislative Activity</Text>
          </View>

          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'sponsored' && styles.activeTab]}
              onPress={() => setActiveTab('sponsored')}
            >
              <Ionicons name="create-outline" size={16} color={activeTab === 'sponsored' ? '#ffffff' : '#9ca3af'} />
              <Text style={[styles.tabText, activeTab === 'sponsored' && styles.activeTabText]}>
                Sponsored Bills
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, activeTab === 'cosponsored' && styles.activeTab]}
              onPress={() => setActiveTab('cosponsored')}
            >
              <Ionicons name="people-outline" size={16} color={activeTab === 'cosponsored' ? '#ffffff' : '#9ca3af'} />
              <Text style={[styles.tabText, activeTab === 'cosponsored' && styles.activeTabText]}>
                Co-sponsored Bills
              </Text>
            </TouchableOpacity>
          </View>

          {/* Bills List */}
          <View style={styles.billsList}>
            {billsLoading ? (
              <View style={styles.billsLoadingContainer}>
                <ActivityIndicator size="small" color="#3b5bdb" />
                <Text style={styles.billsLoadingText}>Loading bills...</Text>
              </View>
            ) : currentBills.length > 0 ? (
              currentBills.map((bill) => (
                <TouchableOpacity 
                  key={bill.id}
                  style={styles.billItem}
                  onPress={() => handleBillPress(bill.id)}
                >
                  <Text style={styles.billDate}>
                    Introduced {formatDate(bill.introducedDate)}
                  </Text>
                  <View style={styles.billInfo}>
                    <Text style={styles.billNumber}>{bill.number}</Text>
                    <View style={[styles.billStatus, { backgroundColor: getStatusColor(bill.status) }]}>
                      <Text style={styles.billStatusText}>{bill.status.toUpperCase()}</Text>
                    </View>
                  </View>
                  <Text style={styles.billTitle} numberOfLines={2}>
                    {bill.title}
                  </Text>
                  {bill.summary && (
                    <Text style={styles.billSummary} numberOfLines={3}>
                      {bill.summary}
                    </Text>
                  )}
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.noBillsContainer}>
                <Ionicons name="document-outline" size={32} color="#6b7280" />
                <Text style={styles.noBillsText}>
                  No {activeTab} bills found
                </Text>
                <Text style={styles.noBillsSubtext}>
                  This representative may not have any {activeTab} bills in our current database.
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#151c2e',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#151c2e',
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#151c2e',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#ef4444',
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#374151',
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#151c2e',
    alignItems: 'center',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  profileImageContainer: {
    position: 'relative',
    marginRight: 16,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  partyBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1e2642', // navy-light
  },
  partyBadgeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  profileInfo: {
    flex: 1,
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    color: '#9ca3af',
    marginBottom: 4,
  },
  district: {
    fontSize: 16,
    color: '#9ca3af',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
    backgroundColor: '#374151',
    borderWidth: 1,
    borderColor: '#4b5563',
  },
  trackButton: {
    backgroundColor: '#3b5bdb',
    borderColor: '#3b5bdb',
  },
  trackedButton: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  actionButtonTextSecondary: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#9ca3af',
  },
  content: {
    padding: 20,
  },
  biographySection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
  },
  biographyText: {
    fontSize: 16,
    color: '#d1d5db',
    lineHeight: 24,
    backgroundColor: '#1e2642', // navy-light
    padding: 16,
    borderRadius: 8,
  },
  informationSection: {
    marginBottom: 32,
  },
  infoGrid: {
    flexDirection: 'column',
    gap: 0,
    backgroundColor: '#1e2642', // navy-light
    borderRadius: 8,
    overflow: 'hidden',
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#9ca3af',
  },
  infoValue: {
    fontSize: 16,
    color: '#ffffff',
  },
  infoValueLink: {
    fontSize: 16,
    color: '#3b82f6',
    textDecorationLine: 'underline',
  },
  legislativeSection: {
    marginTop: 8,
  },
  legislativeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
  },
  legislativeSectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 12,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
    backgroundColor: '#374151',
    borderWidth: 1,
    borderColor: '#4b5563',
  },
  activeTab: {
    backgroundColor: '#3b5bdb',
    borderColor: '#3b5bdb',
  },
  tabText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#9ca3af',
  },
  activeTabText: {
    color: '#ffffff',
  },
  billsList: {
    backgroundColor: '#1e2642', // navy-light
    borderRadius: 8,
    padding: 16,
    minHeight: 200,
  },
  billsLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  billsLoadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  noBillsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noBillsText: {
    fontSize: 18,
    color: '#ffffff',
    fontWeight: 'bold',
    marginTop: 12,
  },
  noBillsSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 20,
  },
  billItem: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  billDate: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 8,
  },
  billInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  billNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  billStatus: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  billStatusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  billTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
    lineHeight: 22,
  },
  billSummary: {
    fontSize: 14,
    color: '#d1d5db',
    lineHeight: 20,
  },
  contentContainer: {
    paddingBottom: 100,
  },
  profileCard: {
    backgroundColor: '#1e2642', // navy-light
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  contactCard: {
    backgroundColor: '#1e2642', // navy-light
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  billCard: {
    backgroundColor: '#1e2642', // navy-light
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 0, // remove border
  },
}); 