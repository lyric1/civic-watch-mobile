import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import MemberCard from '../components/MemberCard';
import { getAccurateStatus, getCleanStatus } from '../utils/billStatus';

interface TrackedBill {
  id: string;
  title: string;
  number: string;
  status: string;
  chamber: string;
  introducedDate: string;
  latestAction?: string;
  latestActionDate?: string;
}

interface TrackedRepresentative {
  id: string;
  fullName: string;
  chamber: string;
  party: string;
  state: string;
  district?: string;
  photoUrl?: string;
}

export default function TrackedScreen({ navigation }: any) {
  const { user } = useAuth();
  const [trackedBills, setTrackedBills] = useState<TrackedBill[]>([]);
  const [trackedRepresentatives, setTrackedRepresentatives] = useState<TrackedRepresentative[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'bills' | 'representatives'>('bills');

  useEffect(() => {
    loadTrackedData();
  }, [user]);

  const loadTrackedData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      await Promise.all([loadTrackedBills(), loadTrackedRepresentatives()]);
    } catch (error) {
      console.error('Error loading tracked data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTrackedBills = async () => {
    if (!user) return;

    try {
      console.log('🔍 Loading tracked bills for user:', user.id);
      
      // Get user's tracked bill IDs
      const { data: trackedBillIds, error: trackingError } = await supabase
        .from('user_tracked_bills')
        .select('billId')
        .eq('userId', user.id);

      if (trackingError) {
        console.error('❌ Error loading tracked bill IDs:', trackingError);
        return;
      }

      if (!trackedBillIds || trackedBillIds.length === 0) {
        console.log('📝 No tracked bills found');
        setTrackedBills([]);
        return;
      }

      const billIds = trackedBillIds.map(item => item.billId).filter(Boolean);
      console.log('📋 Bill IDs to fetch:', billIds);

      if (billIds.length === 0) {
        console.log('❌ No valid bill IDs found');
        setTrackedBills([]);
        return;
      }

      // Fetch the actual bills from database
      const { data: billsData, error: billsError } = await supabase
        .from('bills')
        .select('*')
        .in('id', billIds)
        .order('introducedDate', { ascending: false });

      let allBills: TrackedBill[] = [];

      if (!billsError && billsData && billsData.length > 0) {
        console.log('✅ Bills loaded from database:', billsData.length);
        const mappedBills = billsData.map(bill => ({
          ...bill,
          introducedDate: bill.introducedDate || bill.introduced_date,
          latestAction: bill.latestAction || bill.latest_action
        }));
        allBills.push(...mappedBills);
      }

      // For missing bills, try to fetch from Congress API
      const foundBillIds = allBills.map(bill => bill.id);
      const missingBillIds = billIds.filter(id => !foundBillIds.includes(id));
      
      if (missingBillIds.length > 0) {
        console.log('🌐 Fetching missing bills from Congress API:', missingBillIds);
        
        const apiKey = process.env.EXPO_PUBLIC_CONGRESS_API_KEY || process.env.NEXT_PUBLIC_CONGRESS_API_KEY;
        
        if (apiKey) {
          for (const billId of missingBillIds) {
            try {
              // Parse bill ID format (e.g., "119-hr-2823" or "HR2823-119")
              let congress, type, number;
              
              if (billId.includes('-')) {
                const parts = billId.split('-');
                if (parts.length === 3) {
                  [congress, type, number] = parts;
                } else if (parts.length === 2) {
                  // Could be "HR2823-119" format
                  const match = parts[0].match(/([A-Z]+)(\d+)/);
                  if (match) {
                    type = match[1].toLowerCase();
                    number = match[2];
                    congress = parts[1];
                  } else {
                    const [congress, rest] = parts;
                    const restMatch = rest?.match(/([A-Z]+)(\d+)/);
                    if (restMatch) {
                      type = restMatch[1].toLowerCase();
                      number = restMatch[2];
                    }
                  }
                }
              }
              
              if (congress && type && number) {
                const apiUrl = `https://api.congress.gov/v3/bill/${congress}/${type}/${number}?api_key=${apiKey}`;
                console.log(`🌐 Fetching bill: ${billId} from ${apiUrl.replace(apiKey, '[REDACTED]')}`);
                
                const response = await fetch(apiUrl);
                if (response.ok) {
                  const data = await response.json();
                  const bill = data.bill;
                  
                  if (bill) {
                    const apiBill: TrackedBill = {
                      id: billId,
                      title: bill.title || 'Untitled Bill',
                      number: `${type.toUpperCase()} ${number}`,
                      status: bill.latestAction?.text || 'Introduced',
                      chamber: bill.originChamber || (type === 's' ? 'Senate' : 'House'),
                      introducedDate: bill.introducedDate || new Date().toISOString(),
                      latestAction: bill.latestAction?.text,
                      latestActionDate: bill.latestAction?.actionDate
                    };
                    
                    allBills.push(apiBill);
                    console.log(`✅ Loaded bill from API: ${bill.title?.substring(0, 50)}`);
                  }
                }
              }
            } catch (apiError) {
              console.error(`❌ Error fetching bill ${billId} from API:`, apiError);
            }
          }
        }
      }

      console.log('📊 Total bills loaded:', allBills.length);
      setTrackedBills(allBills);
      
    } catch (error) {
      console.error('❌ Exception loading tracked bills:', error);
    }
  };

  const loadTrackedRepresentatives = async () => {
    if (!user) return;

    try {
      console.log('🔍 Loading tracked representatives for user:', user.id);
      
      // Get user's tracked representative IDs
      const { data: trackedRepIds, error: trackingError } = await supabase
        .from('user_tracked_representatives')
        .select('repId')
        .eq('userId', user.id);

      if (trackingError) {
        console.error('❌ Error loading tracked rep IDs:', trackingError);
        return;
      }

      if (!trackedRepIds || trackedRepIds.length === 0) {
        console.log('📝 No tracked representatives found');
        setTrackedRepresentatives([]);
        return;
      }

      const repIds = trackedRepIds.map(item => item.repId).filter(Boolean);
      console.log('📋 Rep IDs to fetch:', repIds);

      if (repIds.length === 0) {
        console.log('❌ No valid rep IDs found');
        setTrackedRepresentatives([]);
        return;
      }

      // Fetch the actual representatives
      const { data: repsData, error: repsError } = await supabase
        .from('representatives')
        .select('*')
        .in('id', repIds)
        .order('fullName', { ascending: true });

      if (repsError) {
        console.error('❌ Error loading representatives data:', repsError);
        setTrackedRepresentatives([]);
        return;
      }

      console.log('✅ Tracked representatives loaded from database:', repsData?.length || 0);
      
      if (!repsData || repsData.length === 0) {
        setTrackedRepresentatives([]);
        return;
      }

      // Enhance reps with missing data from Congress API
      const apiKey = process.env.EXPO_PUBLIC_CONGRESS_API_KEY || process.env.NEXT_PUBLIC_CONGRESS_API_KEY;
      const enhancedReps: TrackedRepresentative[] = [];

      for (const rep of repsData) {
        let enhancedRep = { ...rep };
        
        // Check if data is missing or incomplete
        const needsEnhancement = !rep.fullName || 
                               rep.fullName === 'Unknown' || 
                               !rep.party || 
                               rep.party === 'Unknown' ||
                               !rep.chamber ||
                               rep.chamber === 'Unknown';

        if (needsEnhancement && apiKey && rep.id) {
          try {
            console.log(`🌐 Enhancing rep data for ${rep.id} from Congress API...`);
            const apiUrl = `https://api.congress.gov/v3/member/${rep.id}?api_key=${apiKey}`;
            
            const response = await fetch(apiUrl);
            if (response.ok) {
              const data = await response.json();
              const member = data.member;
              
              if (member) {
                // Determine chamber
                let chamber = rep.chamber;
                if (!chamber || chamber === 'Unknown') {
                  const currentTerm = member.terms?.[member.terms.length - 1];
                  if (currentTerm?.chamber) {
                    if (currentTerm.chamber.toLowerCase().includes('senate')) {
                      chamber = 'U.S. Senate';
                    } else if (currentTerm.chamber.toLowerCase().includes('house')) {
                      chamber = 'U.S. House';
                    }
                  } else if (rep.id.startsWith('S')) {
                    chamber = 'U.S. Senate';
                  } else if (rep.id.startsWith('H') || rep.id.startsWith('C') || rep.id.startsWith('O')) {
                    chamber = 'U.S. House';
                  }
                }

                // Get party information
                let party = rep.party;
                if (!party || party === 'Unknown') {
                  if (member.partyHistory && member.partyHistory.length > 0) {
                    const currentParty = member.partyHistory.find((p: any) => !p.endYear) || 
                                       member.partyHistory[member.partyHistory.length - 1];
                    party = currentParty?.partyName || currentParty?.partyAbbreviation;
                  }
                }

                enhancedRep = {
                  ...enhancedRep,
                  fullName: member.name || member.directOrderName || `${member.firstName || ''} ${member.lastName || ''}`.trim() || rep.fullName,
                  party: party || 'Unknown Party',
                  chamber: chamber || 'Unknown Chamber',
                  photoUrl: member.depiction?.imageUrl || rep.photoUrl,
                  district: member.district || rep.district
                };

                console.log(`✅ Enhanced rep: ${enhancedRep.fullName} (${enhancedRep.party})`);
              }
            }
          } catch (apiError) {
            console.error(`❌ Error enhancing rep ${rep.id}:`, apiError);
          }
        }

        // Apply final defaults
        const finalRep: TrackedRepresentative = {
          ...enhancedRep,
          fullName: enhancedRep.fullName || 'Unknown Representative',
          party: enhancedRep.party || 'Unknown Party',
          chamber: enhancedRep.chamber || 'Unknown Chamber',
          state: enhancedRep.state || 'Unknown State'
        };

        enhancedReps.push(finalRep);
      }

      console.log('📊 Final enhanced representatives:', enhancedReps.length);
      setTrackedRepresentatives(enhancedReps);
      
    } catch (error) {
      console.error('❌ Exception loading tracked representatives:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTrackedData();
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    const statusLower = status?.toLowerCase() || '';
    
    if (statusLower.includes('law') || statusLower.includes('enacted')) {
      return '#10b981';
    } else if (statusLower.includes('president')) {
      return '#059669';
    } else if (statusLower.includes('passed')) {
      return '#1d4ed8';
    } else if (statusLower.includes('committee')) {
      return '#a16207';
    } else if (statusLower.includes('introduced')) {
      return '#7c3aed';
    } else {
      return '#6b7280';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch {
      return dateString;
    }
  };

  const handleBillPress = (billId: string) => {
    navigation.navigate('BillDetail', { billId });
  };

  const handleRepresentativePress = (repId: string) => {
    navigation.navigate('RepresentativeDetail', { repId });
  };

  const renderBillCard = (bill: TrackedBill) => {
    console.log('🎫 Rendering bill card:', {
      id: bill.id,
      title: bill.title?.substring(0, 50),
      number: bill.number,
      status: bill.status,
      chamber: bill.chamber,
      introducedDate: bill.introducedDate,
      latestAction: bill.latestAction?.substring(0, 50)
    });
    
    return (
      <TouchableOpacity
        key={bill.id}
        style={styles.billCard}
        onPress={() => handleBillPress(bill.id)}
      >
        <View style={styles.billHeader}>
          <Text style={styles.billNumber}>{bill.number || 'Unknown Number'}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(getCleanStatus(bill.latestAction || bill.status || 'Unknown')) }]}>
            <Text style={styles.statusText}>{getCleanStatus(bill.latestAction || bill.status || 'Unknown')}</Text>
          </View>
        </View>
        
        <Text style={styles.billTitle} numberOfLines={2}>
          {bill.title || 'Untitled Bill'}
        </Text>
        
        <View style={styles.billMeta}>
          <Text style={styles.billDate}>
            Introduced {formatDate(bill.introducedDate || new Date().toISOString())}
          </Text>
          <Text style={styles.billChamber}>{bill.chamber || 'Unknown Chamber'}</Text>
        </View>
        
        {bill.latestAction && (
          <Text style={styles.billLatestAction} numberOfLines={2}>
            Latest: {bill.latestAction}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  const renderRepresentativeCard = (rep: TrackedRepresentative) => {
    console.log('👤 Rendering rep card:', {
      id: rep.id,
      name: rep.fullName,
      party: rep.party,
      state: rep.state,
      chamber: rep.chamber,
      district: rep.district
    });
    
    return (
      <MemberCard
        key={rep.id}
        name={rep.fullName || 'Unknown Representative'}
        party={rep.party || 'Unknown Party'}
        state={rep.state || 'Unknown State'}
        chamber={rep.chamber || 'Unknown Chamber'}
        district={rep.district}
        photoUrl={rep.photoUrl}
        contactButtonText="View"
        onContact={() => handleRepresentativePress(rep.id)}
      />
    );
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Tracked Items</Text>
        </View>
        <View style={styles.signInPrompt}>
          <Ionicons name="person-outline" size={64} color="#6b7280" />
          <Text style={styles.signInTitle}>Sign In Required</Text>
          <Text style={styles.signInText}>
            Please sign in to view your tracked bills and representatives
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tracked Items</Text>
        <Text style={styles.headerSubtitle}>
          {trackedBills.length + trackedRepresentatives.length} items tracked
        </Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'bills' && styles.activeTab]}
            onPress={() => setActiveTab('bills')}
          >
            <Ionicons
              name="document-text"
              size={20}
              color={activeTab === 'bills' ? '#ffffff' : '#9ca3af'}
            />
            <Text style={[styles.tabText, activeTab === 'bills' && styles.activeTabText]}>
              Bills ({trackedBills.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'representatives' && styles.activeTab]}
            onPress={() => setActiveTab('representatives')}
          >
            <Ionicons
              name="people"
              size={20}
              color={activeTab === 'representatives' ? '#ffffff' : '#9ca3af'}
            />
            <Text style={[styles.tabText, activeTab === 'representatives' && styles.activeTabText]}>
              Members ({trackedRepresentatives.length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b5bdb" />
        }
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3b5bdb" />
            <Text style={styles.loadingText}>Loading tracked items...</Text>
          </View>
        ) : (
          <>
            {/* Bills Tab */}
            {activeTab === 'bills' && (
              <View style={styles.tabContent}>
                {trackedBills.length > 0 ? (
                  <View style={styles.billsList}>
                    {trackedBills.map(bill => renderBillCard(bill))}
                  </View>
                ) : (
                  <View style={styles.emptyState}>
                    <Ionicons name="document-outline" size={64} color="#6b7280" />
                    <Text style={styles.emptyStateTitle}>No Tracked Bills</Text>
                    <Text style={styles.emptyStateText}>
                      Start tracking bills to stay updated on their progress
                    </Text>
                    <TouchableOpacity
                      style={styles.discoverButton}
                      onPress={() => navigation.navigate('Discover')}
                    >
                      <Text style={styles.discoverButtonText}>Discover Bills</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {/* Representatives Tab */}
            {activeTab === 'representatives' && (
              <View style={styles.tabContent}>
                {trackedRepresentatives.length > 0 ? (
                  <View style={styles.representativesList}>
                    {trackedRepresentatives.map(rep => renderRepresentativeCard(rep))}
                  </View>
                ) : (
                  <View style={styles.emptyState}>
                    <Ionicons name="people-outline" size={64} color="#6b7280" />
                    <Text style={styles.emptyStateTitle}>No Tracked Representatives</Text>
                    <Text style={styles.emptyStateText}>
                      Start tracking representatives to follow their legislative activity
                    </Text>
                    <TouchableOpacity
                      style={styles.discoverButton}
                      onPress={() => navigation.navigate('Discover')}
                    >
                      <Text style={styles.discoverButtonText}>Discover Members</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#151c2e',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#151c2e',
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
  addButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#3b5bdb',
  },
  tabContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#151c2e',
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: 'transparent',
    gap: 8,
  },
  activeTab: {
    backgroundColor: '#3b5bdb',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9ca3af',
  },
  activeTabText: {
    color: '#ffffff',
  },
  content: {
    flex: 1,
    padding: 20,
    backgroundColor: '#151c2e',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
  },
  billsList: {
    gap: 12,
  },
  billCard: {
    backgroundColor: '#1e2642',
    borderRadius: 8,
    padding: 16,
    borderWidth: 0,
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
    lineHeight: 22,
  },
  billMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  billDate: {
    fontSize: 14,
    color: '#9ca3af',
  },
  billChamber: {
    fontSize: 14,
    color: '#9ca3af',
  },
  billLatestAction: {
    fontSize: 14,
    color: '#d1d5db',
    fontStyle: 'italic',
    lineHeight: 18,
  },
  representativesList: {
    gap: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  discoverButton: {
    backgroundColor: '#3b5bdb',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  discoverButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  signInPrompt: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  signInTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 16,
    marginBottom: 8,
  },
  signInText: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 24,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    color: '#9ca3af',
    marginTop: 12,
  },
  tabContent: {
    padding: 20,
  },
  contentContainer: {
    paddingBottom: 100,
  },
}); 