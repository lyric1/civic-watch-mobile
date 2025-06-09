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
import MemberCard from '../components/MemberCard';

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
  photoUrl?: string;
  bioguideId?: string;
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

      // Search only Congress API (no local database)
      console.log('🔍 Searching Congress API only...');

      // Enhanced Congress API search for better coverage
      if (searchQuery.trim().length > 2) {
        try {
          const apiKey = process.env.EXPO_PUBLIC_CONGRESS_API_KEY || process.env.NEXT_PUBLIC_CONGRESS_API_KEY;
          
          if (apiKey) {
                          // Search bills from Congress API - multiple congress sessions
              if (searchType === 'all' || searchType === 'bills') {
                console.log('🔍 Searching Congress API for bills...');
                
                // First, try to search for specific bill if format matches HR1, S1, etc.
                const billFormatRegex = /^(h\.?r\.?|hr|house|s\.?|s|senate)\s*(\d+)$/i;
                const match = searchQuery.toLowerCase().trim().match(billFormatRegex);
                
                if (match) {
                  const searchType = match[1].toLowerCase().replace(/\./g, '');
                  const searchNumber = match[2];
                  
                  // Map search types to API types
                  const typeMap: { [key: string]: string } = {
                    'hr': 'hr',
                    'house': 'hr',
                    's': 's',
                    'senate': 's'
                  };
                  
                  const billType = typeMap[searchType] || typeMap[searchType.substring(0, 2)];
                  
                  if (billType) {
                    console.log(`🎯 Searching for specific bill: ${billType.toUpperCase()} ${searchNumber}`);
                    
                    // Try to fetch the specific bill directly
                    try {
                      const specificBillUrl = `https://api.congress.gov/v3/bill/119/${billType}/${searchNumber}?api_key=${apiKey}`;
                      console.log(`🔍 Trying direct bill fetch: ${specificBillUrl}`);
                      
                      const specificResponse = await fetch(specificBillUrl);
                      if (specificResponse.ok) {
                        const specificData = await specificResponse.json();
                        const bill = specificData.bill;
                        
                        if (bill) {
                          console.log(`✅ Found specific bill: ${bill.type} ${bill.number} - ${bill.title?.substring(0, 100)}`);
                          
                          const specificResult: SearchResult = {
                            id: `119-${bill.type?.toLowerCase()}-${bill.number}`,
                            title: bill.title || 'Untitled Bill',
                            type: 'bill' as const,
                            subtitle: `${bill.type} ${bill.number} (119th Congress)`,
                            status: getCleanStatus(bill.latestAction?.text || 'Introduced'),
                            chamber: bill.originChamber || (bill.type?.toLowerCase() === 's' ? 'Senate' : 'House')
                          };
                          
                          allResults.push(specificResult);
                          console.log(`🎯 Added specific bill result`);
                        }
                      } else {
                        console.log(`❌ Specific bill not found: ${specificResponse.status}`);
                      }
                    } catch (specificError) {
                      console.error('❌ Error fetching specific bill:', specificError);
                    }
                  }
                }
                
                // Then do the general search across congress sessions
                const congressSessions = ['119', '118', '117'];
                
                for (const congress of congressSessions) {
                  try {
                    const billSearchUrl = `https://api.congress.gov/v3/bill/${congress}?api_key=${apiKey}&limit=250`;
                    const response = await fetch(billSearchUrl);
                  
                  if (response.ok) {
                    const data = await response.json();
                    const apiBills = data.bills || [];
                    
                    console.log(`📊 API returned ${apiBills.length} total bills for ${congress}th Congress`);
                    
                    // Log first few bills to see structure
                    if (apiBills.length > 0) {
                      console.log('📋 Sample bill structure:', {
                        title: apiBills[0]?.title?.substring(0, 100),
                        number: apiBills[0]?.number,
                        type: apiBills[0]?.type,
                        policyArea: apiBills[0]?.policyArea?.name
                      });
                    }
                    
                    // More lenient search - if no search query, show recent bills
                    let matchingBills;
                    if (searchQuery.trim().length < 3) {
                      // Show recent bills if search is too short
                      matchingBills = apiBills.slice(0, 20);
                      console.log(`📝 Showing ${matchingBills.length} recent bills (search too short)`);
                    } else {
                      // Enhanced search - look in title, number, and policyArea
                      matchingBills = apiBills.filter((bill: any) => {
                        const searchLower = searchQuery.toLowerCase().trim();
                        
                        // Standard matches
                        const titleMatch = bill.title?.toLowerCase().includes(searchLower);
                        const policyMatch = bill.policyArea?.name?.toLowerCase().includes(searchLower);
                        const summaryMatch = bill.summary?.toLowerCase().includes(searchLower);
                        
                        // Enhanced bill number and type matching
                        const billNumber = bill.number?.toString() || '';
                        const billType = bill.type?.toString() || '';
                        
                        // Direct number match
                        const numberMatch = billNumber.toLowerCase().includes(searchLower);
                        
                        // Direct type match
                        const typeMatch = billType.toLowerCase().includes(searchLower);
                        
                        // Smart bill format matching (e.g., "hr 1", "h.r. 1", "hr1")
                        let smartBillMatch = false;
                        
                        // Parse common bill formats: "hr 1", "hr1", "h.r. 1", "house 1", etc.
                        const billFormatRegex = /^(h\.?r\.?|hr|house|s\.?|s|senate)\s*(\d+)$/i;
                        const match = searchLower.match(billFormatRegex);
                        
                        if (match) {
                          const searchType = match[1].toLowerCase().replace(/\./g, '');
                          const searchNumber = match[2];
                          
                          // Map search types to API types
                          const typeMap: { [key: string]: string[] } = {
                            'hr': ['HR', 'H'],
                            'house': ['HR', 'H', 'HJRES', 'HRES', 'HCONRES'],
                            's': ['S'],
                            'senate': ['S', 'SJRES', 'SRES', 'SCONRES']
                          };
                          
                          const matchingTypes = typeMap[searchType] || typeMap[searchType.substring(0, 2)] || [];
                          const typeMatches = matchingTypes.some(t => billType.startsWith(t));
                          const numberMatches = billNumber === searchNumber;
                          
                          smartBillMatch = typeMatches && numberMatches;
                          
                          console.log(`🔍 Smart bill matching: "${searchQuery}" -> type: ${searchType}, number: ${searchNumber}, bill: ${billType}${billNumber}, matches: ${smartBillMatch}`);
                        }
                        
                        // Also try reverse format: "1 hr", "1 house", etc.
                        const reverseFormatRegex = /^(\d+)\s+(h\.?r\.?|hr|house|s\.?|s|senate)$/i;
                        const reverseMatch = searchLower.match(reverseFormatRegex);
                        
                        if (reverseMatch && !smartBillMatch) {
                          const searchNumber = reverseMatch[1];
                          const searchType = reverseMatch[2].toLowerCase().replace(/\./g, '');
                          
                          const typeMap: { [key: string]: string[] } = {
                            'hr': ['HR', 'H'],
                            'house': ['HR', 'H', 'HJRES', 'HRES', 'HCONRES'],
                            's': ['S'],
                            'senate': ['S', 'SJRES', 'SRES', 'SCONRES']
                          };
                          
                          const matchingTypes = typeMap[searchType] || typeMap[searchType.substring(0, 2)] || [];
                          const typeMatches = matchingTypes.some(t => billType.startsWith(t));
                          const numberMatches = billNumber === searchNumber;
                          
                          smartBillMatch = typeMatches && numberMatches;
                        }
                        
                        return titleMatch || numberMatch || policyMatch || typeMatch || summaryMatch || smartBillMatch;
                      });
                      
                      console.log(`🔍 Filtered to ${matchingBills.length} matching bills for query "${searchQuery}"`);
                    }
                    
                    const apiResults: SearchResult[] = matchingBills.slice(0, 20).map((bill: any) => ({
                      id: `${congress}-${bill.type?.toLowerCase() || 'unknown'}-${bill.number || '0'}`,
                      title: bill.title || 'Untitled Bill',
                      type: 'bill' as const,
                      subtitle: `${bill.type || 'Unknown'} ${bill.number || ''} (${congress}th Congress)`,
                      status: getCleanStatus(bill.latestAction?.text || 'Introduced'),
                      chamber: bill.originChamber || (bill.type?.toLowerCase() === 's' ? 'Senate' : 'House')
                    }));
                    
                    // Avoid duplicates
                    const existingIds = new Set(allResults.map(r => r.id));
                    const newResults = apiResults.filter(r => !existingIds.has(r.id));
                    allResults.push(...newResults);
                    
                    console.log(`✅ Added ${newResults.length} new bills from ${congress}th Congress`);
                  }
                } catch (congressError) {
                  console.error(`❌ Error searching ${congress}th Congress:`, congressError);
                }
              }
            }
            
            // Search representatives from Congress API
            if (searchType === 'all' || searchType === 'representatives') {
              console.log('🔍 Searching Congress API for representatives...');
              
              try {
                // Get ALL current members using pagination (Congress has ~535 total members)
                let allMembers: any[] = [];
                let offset = 0;
                const limit = 250;
                let hasMore = true;

                while (hasMore && allMembers.length < 600) { // Safety limit
                  const memberSearchUrl = `https://api.congress.gov/v3/member?api_key=${apiKey}&currentMember=true&limit=${limit}&offset=${offset}`;
                  const response = await fetch(memberSearchUrl);
                  
                  if (response.ok) {
                    const data = await response.json();
                    const members = data.members || [];
                    
                    if (members.length > 0) {
                      allMembers.push(...members);
                      offset += limit;
                      hasMore = members.length === limit; // Continue if we got a full page
                      console.log(`📊 Fetched ${members.length} members (total: ${allMembers.length})`);
                    } else {
                      hasMore = false;
                    }
                  } else {
                    console.error('❌ Failed to fetch members page:', response.status);
                    hasMore = false;
                  }
                }

                console.log(`📋 Total members fetched: ${allMembers.length}`);
                console.log('📋 Sample member data:', allMembers.slice(0, 2).map((m: any) => ({
                  name: m.name,
                  directOrderName: m.directOrderName,
                  firstName: m.firstName,
                  lastName: m.lastName,
                  bioguideId: m.bioguideId,
                  partyName: m.partyName,
                  party: m.party,
                  state: m.state,
                  district: m.district,
                  terms: m.terms?.length || 0
                })));
                
                // Filter members that match search query
                const matchingMembers = allMembers.filter((member: any) => {
                  const searchLower = searchQuery.toLowerCase();
                  const nameMatch = member.name?.toLowerCase().includes(searchLower) || 
                                  member.directOrderName?.toLowerCase().includes(searchLower) ||
                                  member.firstName?.toLowerCase().includes(searchLower) ||
                                  member.lastName?.toLowerCase().includes(searchLower);
                  const stateMatch = member.state?.toLowerCase().includes(searchLower);
                  const districtMatch = member.district?.toString().includes(searchQuery);
                  const partyMatch = member.partyName?.toLowerCase().includes(searchLower);
                  
                  return nameMatch || stateMatch || districtMatch || partyMatch;
                });

                console.log(`🎯 Found ${matchingMembers.length} matching members for "${searchQuery}"`);
                
                                 // Process matching members efficiently (without individual API calls for basic info)
                 const memberResults: SearchResult[] = matchingMembers.slice(0, 30).map((member: any) => {
                   // Format name - prefer directOrderName, then member.name, then construct from firstName/lastName
                   let rawName = member.directOrderName || member.name;
                   if (!rawName && member.firstName && member.lastName) {
                     rawName = `${member.firstName} ${member.lastName}`;
                   }
                   
                   // Apply proper name formatting to convert "Last, First" to "First Last"
                   const formattedName = formatMemberName(rawName || 'Unknown Representative');
                  
                  // Get chamber from member data
                  let chamber = 'Unknown';
                  let formattedChamber = 'U.S. Congress';
                  
                  // Try to determine chamber from bioguideId pattern or other data
                  if (member.bioguideId) {
                    // Senate bioguideIds often start with certain patterns, but this isn't reliable
                    // Better to use terms data if available
                    if (member.terms && member.terms.length > 0) {
                      const currentTerm = member.terms[member.terms.length - 1];
                      chamber = currentTerm.chamber || 'Unknown';
                    }
                  }
                  
                  if (chamber.toLowerCase().includes('senate')) {
                    formattedChamber = 'U.S. Senate';
                  } else if (chamber.toLowerCase().includes('house')) {
                    formattedChamber = 'U.S. House';
                  } else {
                    // Fallback: try to infer from district (House members have districts, Senators don't)
                    if (member.district && member.district !== 'At Large') {
                      formattedChamber = 'U.S. House';
                    } else if (!member.district || member.district === 'At Large') {
                      formattedChamber = 'U.S. Senate';
                    }
                  }
                  
                                     return {
                     id: member.bioguideId || `member-${Date.now()}-${Math.random()}`,
                     title: formattedName,
                    type: 'representative' as const,
                    subtitle: getChamberTitle(chamber),
                    party: member.partyName || 'Unknown',
                    state: member.state || 'Unknown',
                    district: member.district?.toString() || undefined,
                    chamber: formattedChamber,
                    bioguideId: member.bioguideId,
                    photoUrl: member.bioguideId ? `https://www.congress.gov/img/member/${member.bioguideId.toLowerCase()}_200.jpg` : undefined
                  };
                });
                
                // Avoid duplicates
                const existingIds = new Set(allResults.map(r => r.id));
                const newResults = memberResults.filter(r => !existingIds.has(r.id));
                allResults.push(...newResults);
                
                console.log(`✅ Added ${newResults.length} new representative search results`);
              } catch (memberError) {
                console.error('❌ Error searching members:', memberError);
              }
            }
          }
        } catch (apiError) {
          console.error('API search error:', apiError);
          // Continue with local results
        }
      }

      // Sort results by relevance (exact matches first, then partial matches)
      const sortedResults = allResults.sort((a, b) => {
        const searchLower = searchQuery.toLowerCase();
        
        // Exact title matches first
        const aExactTitle = a.title.toLowerCase() === searchLower;
        const bExactTitle = b.title.toLowerCase() === searchLower;
        if (aExactTitle && !bExactTitle) return -1;
        if (!aExactTitle && bExactTitle) return 1;
        
        // Then partial title matches starting with search term
        const aStartsWithTitle = a.title.toLowerCase().startsWith(searchLower);
        const bStartsWithTitle = b.title.toLowerCase().startsWith(searchLower);
        if (aStartsWithTitle && !bStartsWithTitle) return -1;
        if (!aStartsWithTitle && bStartsWithTitle) return 1;
        
        // Then by type (bills first, then representatives)
        if (a.type !== b.type) {
          if (a.type === 'bill') return -1;
          if (b.type === 'bill') return 1;
        }
        
        return 0;
      });
      
      setResults(sortedResults.slice(0, 50)); // Limit to 50 results
      
      console.log(`🎯 Search completed: ${sortedResults.length} total results`);
      
      if (sortedResults.length === 0) {
        Alert.alert('No Results', `No items found matching "${searchQuery}". Try different keywords or check spelling.`);
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

  const formatMemberName = (name: string): string => {
    if (!name) return 'Unknown Representative';
    
    // Check if name is in "Last, First" format
    if (name.includes(',') && name.split(',').length === 2) {
      const parts = name.split(',').map(part => part.trim());
      const lastName = parts[0];
      const firstName = parts[1];
      
      // Remove any bracketed info from the end (like party/state info)
      const cleanFirstName = firstName.replace(/\s*\[.*?\].*$/, '').trim();
      
      return `${cleanFirstName} ${lastName}`;
    }
    
    // For names already in "First Last" format, just remove any bracketed info
    return name.replace(/\s*\[.*?\].*$/, '').trim();
  };

  const renderBillCard = (result: SearchResult, index: number) => (
    <TouchableOpacity
      key={`bill-${result.id}-${index}`}
      style={styles.billCard}
      onPress={() => handleResultPress(result)}
    >
             <View style={styles.billHeader}>
         <Text style={styles.billNumber}>{result.subtitle || 'Unknown Number'}</Text>
         {result.status && (
           <View style={[styles.statusBadge, { backgroundColor: getStatusColor(result.status) }]}>
             <Text style={styles.statusText}>{result.status}</Text>
           </View>
         )}
       </View>
       
       <Text style={styles.billTitle} numberOfLines={2}>
         {result.title}
       </Text>
      
      <View style={styles.billMeta}>
        {result.chamber && (
          <Text style={styles.billMetaText}>{result.chamber}</Text>
        )}
        {result.state && (
          <Text style={styles.billMetaText}>{result.state}</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderRepresentativeCard = (result: SearchResult, index: number) => (
    <MemberCard
      key={`rep-${result.id}-${index}`}
      name={result.title}
      party={result.party || 'Unknown Party'}
      state={result.state || 'Unknown State'}
      chamber={result.chamber || 'Unknown Chamber'}
      district={result.district}
      photoUrl={result.photoUrl}
      bioguideId={result.bioguideId}
      contactButtonText="View"
      onContact={() => handleResultPress(result)}
    />
  );

  const renderResult = (result: SearchResult, index: number) => {
    if (result.type === 'bill') {
      return renderBillCard(result, index);
    } else if (result.type === 'representative') {
      return renderRepresentativeCard(result, index);
    }
    
    // Fallback for other types (committees, etc.)
    return (
      <TouchableOpacity
        key={`${result.type}-${result.id}-${index}`}
        style={styles.resultItem}
        onPress={() => handleResultPress(result)}
      >
        <View style={styles.resultIcon}>
          <Ionicons
            name="business"
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
  };

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
     billCard: {
     backgroundColor: '#1e2642', // navy-light
     borderRadius: 12,
     padding: 16,
     marginHorizontal: 20,
     marginBottom: 12,
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
   billTitle: {
     fontSize: 16,
     fontWeight: 'bold',
     color: '#ffffff',
     marginBottom: 12,
     lineHeight: 22,
   },
   billMeta: {
     flexDirection: 'row',
     gap: 12,
     marginBottom: 8,
   },
   billMetaText: {
     fontSize: 12,
     color: '#9ca3af',
   },
}); 