import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

interface SearchResult {
  id: string;
  title: string;
  type: 'bill' | 'representative' | 'committee';
  subtitle?: string;
  status?: string;
  party?: string;
  chamber?: string;
  state?: string;
  district?: string;
}

export default function DiscoverScreen({ navigation }: any) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'all' | 'bills' | 'representatives' | 'committees'>('all');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const searchTypes = [
    { key: 'all', label: 'All', icon: 'search' },
    { key: 'bills', label: 'Bills', icon: 'document-text' },
    { key: 'representatives', label: 'Members', icon: 'people' },
    { key: 'committees', label: 'Committees', icon: 'business' },
  ];

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      Alert.alert('Search Required', 'Please enter a search term');
      return;
    }

    setLoading(true);
    setResults([]);

    try {
      let allResults: SearchResult[] = [];

      // Search Bills
      if (searchType === 'all' || searchType === 'bills') {
        const { data: bills, error: billsError } = await supabase
          .from('bills')
          .select('*')
          .or(`title.ilike.%${searchQuery}%, summary.ilike.%${searchQuery}%, number.ilike.%${searchQuery}%`)
          .limit(20);

        if (!billsError && bills) {
          const billResults: SearchResult[] = bills.map(bill => ({
            id: bill.id,
            title: bill.title || 'Untitled Bill',
            type: 'bill' as const,
            subtitle: bill.number || 'Unknown Number',
            status: getCleanStatus(bill.latestAction || 'Introduced'),
            chamber: bill.chamber
          }));
          allResults.push(...billResults);
        }
      }

      // Search Representatives
      if (searchType === 'all' || searchType === 'representatives') {
        const { data: reps, error: repsError } = await supabase
          .from('representatives')
          .select('*')
          .or(`fullName.ilike.%${searchQuery}%, state.ilike.%${searchQuery}%`)
          .limit(20);

        if (!repsError && reps) {
          const repResults: SearchResult[] = reps.map(rep => ({
            id: rep.id,
            title: rep.fullName || 'Unknown Representative',
            type: 'representative' as const,
            subtitle: getChamberTitle(rep.chamber),
            party: rep.party,
            state: rep.state,
            district: rep.district,
            chamber: rep.chamber
          }));
          allResults.push(...repResults);
        }
      }

      // Search via Congress API for better coverage
      if (searchQuery.trim().length > 2) {
        try {
          const apiKey = process.env.EXPO_PUBLIC_CONGRESS_API_KEY || process.env.NEXT_PUBLIC_CONGRESS_API_KEY;
          
          if (apiKey && (searchType === 'all' || searchType === 'bills')) {
            // Search recent bills from Congress API
            const billSearchUrl = `https://api.congress.gov/v3/bill?api_key=${apiKey}&limit=10`;
            const response = await fetch(billSearchUrl);
            
            if (response.ok) {
              const data = await response.json();
              const apiBills = data.bills || [];
              
              // Filter bills that match our search query
              const matchingBills = apiBills.filter((bill: any) => 
                bill.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                bill.number?.toLowerCase().includes(searchQuery.toLowerCase())
              );
              
              const apiResults: SearchResult[] = matchingBills.map((bill: any) => ({
                id: `${bill.type}${bill.number}-${bill.congress}`,
                title: bill.title || 'Untitled Bill',
                type: 'bill' as const,
                subtitle: `${bill.type} ${bill.number}`,
                status: getCleanStatus(bill.latestAction?.text || 'Introduced'),
                chamber: bill.originChamber || (bill.type === 'S' ? 'Senate' : 'House')
              }));
              
              // Avoid duplicates
              const existingIds = new Set(allResults.map(r => r.id));
              const newResults = apiResults.filter(r => !existingIds.has(r.id));
              allResults.push(...newResults);
            }
          }
        } catch (apiError) {
          console.error('API search error:', apiError);
          // Continue with local results
        }
      }

      setResults(allResults.slice(0, 50)); // Limit to 50 results
      
      if (allResults.length === 0) {
        Alert.alert('No Results', 'No items found matching your search criteria.');
      }

    } catch (error) {
      console.error('Search error:', error);
      Alert.alert('Search Error', 'An error occurred while searching. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getCleanStatus = (latestActionText: string): string => {
    if (!latestActionText) return 'Introduced';
    
    const actionLower = latestActionText.toLowerCase();
    
    if (actionLower.includes('became public law') || actionLower.includes('signed by president')) {
      return 'Enacted';
    }
    if (actionLower.includes('presented to president') || actionLower.includes('sent to president')) {
      return 'Sent to President';
    }
    if (actionLower.includes('passed congress')) {
      return 'Passed Congress';
    }
    if (actionLower.includes('passed house')) {
      return 'Passed House';
    }
    if (actionLower.includes('passed senate')) {
      return 'Passed Senate';
    }
    if (actionLower.includes('committee')) {
      return 'In Committee';
    }
    if (actionLower.includes('introduced')) {
      return 'Introduced';
    }
    
    return 'In Progress';
  };

  const getChamberTitle = (chamber: string) => {
    if (chamber?.toLowerCase().includes('senate')) return 'U.S. Senator';
    if (chamber?.toLowerCase().includes('house')) return 'U.S. Representative';
    return chamber || 'Member of Congress';
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

  const getPartyColor = (party: string) => {
    const partyLower = party?.toLowerCase() || '';
    if (partyLower.includes('republican')) return '#dc2626';
    if (partyLower.includes('democrat')) return '#2563eb';
    if (partyLower.includes('independent')) return '#7c3aed';
    return '#6b7280';
  };

  const handleResultPress = (result: SearchResult) => {
    if (result.type === 'bill') {
      navigation.navigate('BillDetail', { billId: result.id });
    } else if (result.type === 'representative') {
      navigation.navigate('RepresentativeDetail', { repId: result.id });
    }
  };

  const renderResult = (result: SearchResult, index: number) => (
    <TouchableOpacity
      key={`${result.type}-${result.id}-${index}`}
      style={styles.resultItem}
      onPress={() => handleResultPress(result)}
    >
      <View style={styles.resultIcon}>
        <Ionicons
          name={result.type === 'bill' ? 'document-text' : result.type === 'representative' ? 'person' : 'business'}
          size={20}
          color="#3b5bdb"
        />
      </View>
      
      <View style={styles.resultContent}>
        <Text style={styles.resultTitle} numberOfLines={2}>
          {result.title}
        </Text>
        
        <Text style={styles.resultSubtitle}>
          {result.subtitle}
        </Text>
        
        <View style={styles.resultMeta}>
          {result.status && (
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(result.status) }]}>
              <Text style={styles.statusText}>{result.status}</Text>
            </View>
          )}
          
          {result.party && (
            <View style={[styles.partyBadge, { backgroundColor: getPartyColor(result.party) }]}>
              <Text style={styles.partyText}>
                {result.party.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          
          {result.state && (
            <Text style={styles.stateText}>{result.state}</Text>
          )}
          
          {result.chamber && (
            <Text style={styles.chamberText}>{result.chamber}</Text>
          )}
        </View>
      </View>
      
      <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Discover</Text>
        <Text style={styles.headerSubtitle}>Search bills, representatives, and committees</Text>
      </View>

      {/* Search Section */}
      <View style={styles.searchSection}>
        {/* Search Type Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
          {searchTypes.map((type) => (
            <TouchableOpacity
              key={type.key}
              style={[
                styles.filterButton,
                searchType === type.key && styles.activeFilterButton
              ]}
              onPress={() => setSearchType(type.key as any)}
            >
              <Ionicons
                name={type.icon as any}
                size={16}
                color={searchType === type.key ? '#ffffff' : '#9ca3af'}
              />
              <Text
                style={[
                  styles.filterText,
                  searchType === type.key && styles.activeFilterText
                ]}
              >
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Search Input */}
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for bills, representatives, or committees..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              style={styles.clearButton}
            >
              <Ionicons name="close-circle" size={20} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>

        {/* Search Button */}
        <TouchableOpacity
          style={[styles.searchButton, loading && styles.searchButtonDisabled]}
          onPress={handleSearch}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Ionicons name="search" size={20} color="#ffffff" />
          )}
          <Text style={styles.searchButtonText}>
            {loading ? 'Searching...' : 'Search'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Results */}
      <ScrollView style={styles.resultsContainer} contentContainerStyle={styles.resultsContentContainer} showsVerticalScrollIndicator={false}>
        {results.length > 0 && (
          <View style={styles.resultsHeader}>
            <Text style={styles.resultsTitle}>
              {results.length} Result{results.length !== 1 ? 's' : ''} Found
            </Text>
          </View>
        )}
        
        {results.map((result, index) => renderResult(result, index))}
        
        {results.length === 0 && !loading && (
          <View style={styles.emptyState}>
            <Ionicons name="search" size={64} color="#6b7280" />
            <Text style={styles.emptyStateTitle}>Start Your Search</Text>
            <Text style={styles.emptyStateText}>
              Enter a search term above to find bills, representatives, and committees
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
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
    backgroundColor: '#151c2e', // navy - seamless
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#9ca3af',
  },
  searchSection: {
    padding: 20,
    backgroundColor: '#151c2e', // navy
  },
  filterContainer: {
    marginBottom: 16,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1e2642', // navy-light
    marginRight: 8,
    gap: 6,
  },
  activeFilterButton: {
    backgroundColor: '#3b5bdb', // civic-blue
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9ca3af',
  },
  activeFilterText: {
    color: '#ffffff',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e2642', // navy-light
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#ffffff',
  },
  clearButton: {
    padding: 4,
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b5bdb', // civic-blue
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  searchButtonDisabled: {
    backgroundColor: '#374151',
  },
  searchButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  resultsContainer: {
    flex: 1,
    backgroundColor: '#151c2e', // navy
  },
  resultsContentContainer: {
    paddingBottom: 100,
  },
  resultsHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e2642', // navy-light
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 12,
    gap: 12,
  },
  resultIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3b5bdb20', // civic-blue with opacity
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultContent: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
    lineHeight: 22,
  },
  resultSubtitle: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 8,
    lineHeight: 18,
  },
  resultMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  partyBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  partyText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  stateText: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '600',
  },
  chamberText: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 20,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 24,
  },
}); 