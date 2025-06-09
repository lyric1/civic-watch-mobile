import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Share,
  ActivityIndicator,
  Linking,
  Modal,
  SafeAreaView,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import MemberCard from '../components/MemberCard';
import { getAccurateStatus, getCleanStatus } from '../utils/billStatus';

interface BillDetail {
  id: string;
  title: string;
  summary: string;
  full_text?: string;
  status: string;
  chamber: string;
  introducedDate: string;
  number: string;
  sponsor?: string;
  subjects?: string[];
  committees?: string;
  latestAction?: string;
  latestActionDate?: string;
  cosponsors?: number;
  actions?: Array<{
    date: string;
    action: string;
  }>;
}

interface Sponsor {
  name: string;
  party: string;
  state: string;
  bioguideId?: string;
  district?: string;
}

interface Committee {
  name: string;
  chamber: string;
}

interface BillTextVersion {
  date: string;
  type: string;
  url: string;
  description: string;
}

// Add progress tracker component
const BillProgressTracker = ({ bill, actions }: { bill: BillDetail; actions: Array<{ date: string; action: string }> }) => {
  // Determine bill type
  const getBillType = () => {
    if (!bill.number) return 'bill';
    const billNumberUpper = bill.number.toUpperCase();
    
    console.log('🔍 Bill number:', bill.number, 'Upper:', billNumberUpper);
    console.log('🏛️ Bill chamber:', bill.chamber);
    
    // Check for resolution types first
    if (billNumberUpper.includes('H.RES.') || billNumberUpper.includes('HRES')) {
      return 'house-resolution';
    } else if (billNumberUpper.includes('S.RES.') || billNumberUpper.includes('SRES')) {
      return 'senate-resolution';
    } else if (billNumberUpper.includes('H.CON.RES.') || billNumberUpper.includes('HCONRES')) {
      return 'house-concurrent';
    } else if (billNumberUpper.includes('S.CON.RES.') || billNumberUpper.includes('SCONRES')) {
      return 'senate-concurrent';
    } else if (billNumberUpper.includes('H.J.RES.') || billNumberUpper.includes('HJRES')) {
      return 'house-joint';
    } else if (billNumberUpper.includes('S.J.RES.') || billNumberUpper.includes('SJRES')) {
      return 'senate-joint';
    } else if (billNumberUpper.includes('H.R.') || billNumberUpper.includes('HR ')) {
      return 'house-bill';
    } else if (billNumberUpper.match(/^S\.(\s|\d)/i) || billNumberUpper.match(/^S\s/i)) {
      return 'senate-bill';
    }
    
    // If bill number doesn't have chamber prefix, use chamber property
    if (bill.chamber) {
      const chamberLower = bill.chamber.toLowerCase();
      if (chamberLower.includes('house')) {
        return 'house-bill';
      } else if (chamberLower.includes('senate')) {
        return 'senate-bill';
      }
    }
    
    return 'bill';
  };

  const billType = getBillType();
  console.log('📋 Detected bill type:', billType);
  
  // Define stages based on bill type
  const getStages = () => {
    // Determine originating chamber - use chamber property first, then bill number
    let isHouseOrigin = false;
    
    if (bill.chamber) {
      isHouseOrigin = bill.chamber.toLowerCase().includes('house');
    } else {
      const billNumberUpper = bill.number.toUpperCase();
      isHouseOrigin = billNumberUpper.includes('H.R.') || billNumberUpper.includes('HR ') || 
                     billNumberUpper.includes('H.RES') || billNumberUpper.includes('H.CON') || 
                     billNumberUpper.includes('H.J.RES') || billNumberUpper.includes('HJRES');
    }
    
    console.log('🏛️ Is House origin:', isHouseOrigin);
    
    if (billType === 'house-resolution') {
      return ['Intro', 'Comm', 'House Vote', 'Adopted'];
    } else if (billType === 'senate-resolution') {
      return ['Intro', 'Comm', 'Senate Vote', 'Adopted'];
    } else if (billType === 'house-concurrent') {
      return ['Intro', 'Comm', 'House', 'Senate', 'Adopted'];
    } else if (billType === 'senate-concurrent') {
      return ['Intro', 'Comm', 'Senate', 'House', 'Adopted'];
    } else if (billType === 'house-joint' || billType === 'house-bill') {
      return ['Intro', 'Comm', 'House', 'Senate', 'President', 'Law'];
    } else if (billType === 'senate-joint' || billType === 'senate-bill') {
      return ['Intro', 'Comm', 'Senate', 'House', 'President', 'Law'];
    } else {
      // Default - determine based on chamber
      if (isHouseOrigin) {
        return ['Intro', 'Comm', 'House', 'Senate', 'President', 'Law'];
      } else {
        return ['Intro', 'Comm', 'Senate', 'House', 'President', 'Law'];
      }
    }
  };

  const stages = getStages();
  console.log('📊 Stages for this bill:', stages);

  // Determine current stage based on status
  const getCurrentStage = () => {
    if (!actions || actions.length === 0) {
      // Fallback to status-based detection
      const statusLower = bill.status.toLowerCase();
      
      if (statusLower.includes('became law') || statusLower.includes('public law') || statusLower.includes('enacted')) {
        return stages.length - 1; // Last stage (law)
      } else if (statusLower.includes('president') || statusLower.includes('signed') || statusLower.includes('sent to president')) {
        return Math.max(0, stages.findIndex(s => s.includes('President')));
      } else if (statusLower.includes('passed congress') || 
                 (statusLower.includes('passed house') && statusLower.includes('passed senate'))) {
        const presidentIndex = stages.findIndex(s => s.includes('President'));
        return presidentIndex > 0 ? presidentIndex - 1 : stages.length - 1;
      } else if (statusLower.includes('passed house')) {
        const houseIndex = stages.findIndex(s => s === 'House' || s.includes('House'));
        return houseIndex >= 0 ? houseIndex : 2;
      } else if (statusLower.includes('passed senate')) {
        const senateIndex = stages.findIndex(s => s === 'Senate' || s.includes('Senate'));
        return senateIndex >= 0 ? senateIndex : 2;
      } else if (statusLower.includes('reported') || statusLower.includes('ordered to be reported')) {
        return Math.max(1, stages.findIndex(s => s.includes('Comm')));
      } else if (statusLower.includes('committee') || statusLower.includes('referred')) {
        return 1; // Committee stage
      } else if (statusLower.includes('introduced')) {
        return 0; // Introduced stage
      }
      
      return 0; // Default to introduced
    }

    // Analyze actions to determine current stage
    let currentStage = 0; // Start with introduced
    
    // Sort actions by date to analyze chronologically
    const sortedActions = [...actions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    for (const action of sortedActions) {
      const actionText = action.action.toLowerCase();
      
      console.log('📊 Analyzing action for stage:', actionText.substring(0, 100));
      
      // Check for law/enacted (highest stage)
      if (actionText.includes('became public law') || 
          actionText.includes('signed by president') ||
          actionText.includes('enacted')) {
        currentStage = Math.max(currentStage, stages.length - 1);
        console.log('🏛️ Found enacted/law action, stage:', stages.length - 1);
        continue;
      }
      
      // Check for president stage
      if (actionText.includes('presented to president') || 
          actionText.includes('sent to president') ||
          actionText.includes('placed on president')) {
        const presidentIndex = stages.findIndex(s => s.includes('President'));
        if (presidentIndex >= 0) {
          currentStage = Math.max(currentStage, presidentIndex);
          console.log('🏛️ Found president action, stage:', presidentIndex);
        }
        continue;
      }
      
      // Check for chamber passage
      if (actionText.includes('passed house') || 
          actionText.includes('house passed') ||
          (actionText.includes('passed') && actionText.includes('house'))) {
        const houseIndex = stages.findIndex(s => s === 'House' || s.includes('House Vote'));
        if (houseIndex >= 0) {
          currentStage = Math.max(currentStage, houseIndex);
          console.log('🏛️ Found House passage, stage:', houseIndex);
        }
        continue;
      }
      
      if (actionText.includes('passed senate') || 
          actionText.includes('senate passed') ||
          (actionText.includes('passed') && actionText.includes('senate'))) {
        const senateIndex = stages.findIndex(s => s === 'Senate' || s.includes('Senate Vote'));
        if (senateIndex >= 0) {
          currentStage = Math.max(currentStage, senateIndex);
          console.log('🏛️ Found Senate passage, stage:', senateIndex);
        }
        continue;
      }
      
      // Check for committee action
      if (actionText.includes('reported by committee') || 
          actionText.includes('committee agreed') ||
          actionText.includes('ordered to be reported')) {
        const commIndex = stages.findIndex(s => s.includes('Comm'));
        if (commIndex >= 0) {
          currentStage = Math.max(currentStage, commIndex);
          console.log('🏛️ Found committee report, stage:', commIndex);
        }
        continue;
      }
      
      // Check for committee referral
      if (actionText.includes('referred to committee') || 
          actionText.includes('referred to the committee') ||
          actionText.includes('committee referral')) {
        const commIndex = stages.findIndex(s => s.includes('Comm'));
        if (commIndex >= 0) {
          currentStage = Math.max(currentStage, commIndex);
          console.log('🏛️ Found committee referral, stage:', commIndex);
        }
        continue;
      }
      
      // Check for introduction
      if (actionText.includes('introduced') || 
          actionText.includes('received in') ||
          actionText.includes('read the first time')) {
        currentStage = Math.max(currentStage, 0);
        console.log('🏛️ Found introduction, stage:', 0);
        continue;
      }
    }
    
    console.log('📊 Final determined stage:', currentStage, 'out of', stages.length - 1);
    return currentStage;
  };

  const currentStage = getCurrentStage();
  const progressPercentage = stages.length > 1 ? (currentStage / (stages.length - 1)) * 100 : 0;

  return (
    <View style={styles.progressTracker}>
      <Text style={styles.progressTitle}>Legislative Progress</Text>
      
      {/* Stage labels */}
      <View style={styles.stageLabels}>
        {stages.map((stage, index) => (
          <Text key={index} style={[
            styles.stageLabel,
            index <= currentStage && styles.activeStageLabelText
          ]}>
            {stage}
          </Text>
        ))}
      </View>
      
      {/* Progress bar container */}
      <View style={styles.progressBarContainer}>
        {/* Background progress bar */}
        <View style={styles.progressBarBackground} />
        
        {/* Active progress bar */}
        <View style={[
          styles.progressBarFill,
          { width: `${progressPercentage}%` }
        ]} />
        
        {/* Stage indicators */}
        {stages.map((stage, index) => (
          <View
            key={index}
            style={[
              styles.stageIndicator,
              {
                left: `${(index / (stages.length - 1)) * 100}%`,
                backgroundColor: index <= currentStage ? '#3b5bdb' : '#6b7280'
              }
            ]}
          />
        ))}
      </View>
      
      {/* Progress info */}
      <View style={styles.progressInfo}>
        <Text style={styles.progressPercentage}>{Math.round(progressPercentage)}% Complete</Text>
        <Text style={styles.progressDescription}>
          {billType.includes('resolution') 
            ? "Resolutions express opinions and don't become law."
            : "Bills must pass both chambers and be signed to become law."
          }
        </Text>
      </View>
    </View>
  );
};

type TabType = 'summary' | 'sponsors' | 'committees' | 'timeline' | 'actions' | 'write';

// Helper function to format names as "First Last"
const formatMemberName = (fullName: string): string => {
  if (!fullName || fullName === 'Unknown Sponsor' || fullName === 'Unknown Cosponsor') {
    return fullName;
  }
  
  console.log('🏷️ Original name:', fullName);
  
  // Start with the original name
  let cleanName = fullName.trim();
  
  // Only remove common congressional titles at the beginning
  cleanName = cleanName.replace(/^(Rep\.\s+|Sen\.\s+)/i, '');
  
  console.log('🏷️ After removing Rep./Sen.:', cleanName);
  
  // Handle "Last, First Middle" format (common in Congress API)
  if (cleanName.includes(',') && cleanName.split(',').length === 2) {
    const parts = cleanName.split(',').map(part => part.trim());
    const lastName = parts[0];
    const firstAndMiddle = parts[1];
    
    // Remove any bracketed info from the end first
    const cleanFirstAndMiddle = firstAndMiddle.replace(/\s*\[.*?\].*$/, '').trim();
    
    cleanName = `${cleanFirstAndMiddle} ${lastName}`;
    console.log('🏷️ Converted from "Last, First" format:', cleanName);
  } else {
    // For "First Last" format, just remove bracketed party/state info
    cleanName = cleanName.replace(/\s*\[.*?\].*$/, '').trim();
    console.log('🏷️ Removed brackets from "First Last" format:', cleanName);
  }
  
  console.log('🏷️ Final formatted name:', cleanName);
  
  return cleanName;
};

export default function BillDetailScreen({ route, navigation }: any) {
  const { billId } = route.params;
  const { user } = useAuth();
  
  const [bill, setBill] = useState<BillDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('summary');
  const [isTracking, setIsTracking] = useState(false);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [committees, setCommittees] = useState<Committee[]>([]);
  const [actions, setActions] = useState<Array<{ date: string; action: string }>>([]);
  const [billTextVersions, setBillTextVersions] = useState<BillTextVersion[]>([]);
  const [showPdfViewer, setShowPdfViewer] = useState(false);
  const [currentPdfUrl, setCurrentPdfUrl] = useState('');
  const [currentOriginalUrl, setCurrentOriginalUrl] = useState('');
  const [currentBillVersion, setCurrentBillVersion] = useState<BillTextVersion | null>(null);
  const [readingProgress, setReadingProgress] = useState(0);
  const webViewRef = useRef<any>(null);

  // Add deduplication function for actions
  const deduplicateActions = (actionsList: Array<{ date: string; action: string }>) => {
    const seen = new Set<string>();
    const deduped = actionsList.filter(action => {
      // Create a unique key based on date and action text (normalized)
      const normalizedAction = action.action.trim().toLowerCase();
      const key = `${action.date}:${normalizedAction}`;
      
      if (seen.has(key)) {
        console.log(`🔄 Removing duplicate action: ${action.action} on ${action.date}`);
        return false;
      }
      
      seen.add(key);
      return true;
    });
    
    console.log(`✅ Deduplication: ${actionsList.length} → ${deduped.length} actions`);
    return deduped;
  };

  useEffect(() => {
    loadBillDetail();
    checkTrackingStatus();
  }, [billId]);

  const loadBillDetail = async () => {
    try {
      console.log('🔍 Loading bill detail for:', billId);
      
      // First try to load from database
      const { data, error } = await supabase
        .from('bills')
        .select('*')
        .eq('id', billId)
        .single();

      if (error && error.code !== 'PGRST116') {
        // Real error, not just "no rows found"
        console.error('❌ Database error loading bill:', error);
        throw error;
      }

      if (data) {
        console.log('✅ Bill data loaded from database:', {
          title: data.title?.substring(0, 50) + '...',
          number: data.number,
          status: data.status
        });
        
        setBill(data);
        
        // Parse committees if available
        if (data.committees) {
          try {
            const committeesData = typeof data.committees === 'string' 
              ? [{ name: data.committees, chamber: data.chamber || 'Unknown' }]
              : [{ name: 'Various Committees', chamber: data.chamber || 'Unknown' }];
            setCommittees(committeesData);
          } catch (e) {
            console.warn('Failed to parse committees:', e);
          }
        }
        
        // Set up sponsors data from database
        if (data.sponsor) {
          setSponsors([{
            name: data.sponsor,
            party: 'Unknown',
            state: 'Unknown',
            bioguideId: 'unknown'
          }]);
        }
        
        // Set up basic actions for database bills
        const dbActions = [
          {
            date: data.introducedDate || data.introduced_date || new Date().toISOString(),
            action: `Introduced in ${data.chamber || 'Congress'}`
          }
        ];
        
        if (data.latestAction && data.latestActionDate) {
          dbActions.push({
            date: data.latestActionDate || data.latest_action_date,
            action: data.latestAction || data.latest_action
          });
        }
        
        setActions(dbActions);
        
        return; // Successfully loaded from database
      }

      // Bill not found in database, try Congress API
      console.log('📡 Bill not found in database, fetching from Congress API...');
      
      const apiKey = process.env.EXPO_PUBLIC_CONGRESS_API_KEY || process.env.NEXT_PUBLIC_CONGRESS_API_KEY;
      
      if (!apiKey) {
        console.error('❌ No Congress API key available');
        throw new Error('Bill not found and no API key available');
      }

      // Parse bill ID to extract congress, type, and number
      // Expected format: "119-hr-1" or "118-s-1234" etc.
      let congress = '118'; // Default to current congress
      let billType = 'hr';
      let billNumber = '';
      
      if (billId.includes('-')) {
        const parts = billId.split('-');
        if (parts.length === 3) {
          // Format: "119-hr-1"
          congress = parts[0];
          billType = parts[1].toLowerCase();
          billNumber = parts[2];
        } else if (parts.length === 2) {
          // Could be "HR2823-119" format (fallback)
          const [firstPart, secondPart] = parts;
          const match = firstPart.match(/^([A-Z]+)(\d+)$/i);
          if (match) {
            billType = match[1].toLowerCase();
            billNumber = match[2];
            congress = secondPart;
          } else {
            // Try "119-hr1" format
            congress = firstPart;
            const typeMatch = secondPart.match(/^([A-Z]+)(\d+)$/i);
            if (typeMatch) {
              billType = typeMatch[1].toLowerCase();
              billNumber = typeMatch[2];
            }
          }
        }
      } else {
        // Try to parse without congress number
        const match = billId.match(/^([A-Z]+)(\d+)$/i);
        if (match) {
          billType = match[1].toLowerCase();
          billNumber = match[2];
        }
      }
      
      console.log('🔍 Parsed bill ID:', { congress, billType, billNumber, originalId: billId });
      
      // Fetch from Congress API
      const apiUrl = `https://api.congress.gov/v3/bill/${congress}/${billType}/${billNumber}?api_key=${apiKey}`;
      console.log(`🌐 Fetching from Congress API: ${apiUrl.replace(apiKey, '[REDACTED]')}`);
      
      const response = await fetch(apiUrl);
      console.log(`📡 Congress API response status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log(`❌ Congress API error: ${response.status} - ${errorText.substring(0, 200)}`);
        throw new Error(`Bill not found: ${billId}`);
      }

      const apiData = await response.json();
      const apiBill = apiData.bill;
      
      if (!apiBill) {
        throw new Error(`No bill data returned from API for ${billId}`);
      }

      console.log('✅ Bill data loaded from Congress API:', {
        title: apiBill.title?.substring(0, 50) + '...',
        number: apiBill.number,
        status: apiBill.latestAction?.text || 'Unknown',
        sponsorsCount: apiBill.sponsors?.length || 0,
        cosponsorsCount: apiBill.cosponsors?.length || 0,
        cosponsorsData: apiBill.cosponsors
      });

      // Transform API data to our format
      const billData: BillDetail = {
        id: billId,
        title: apiBill.title || 'No title available',
        summary: apiBill.summary?.text || apiBill.policyArea?.name || 'No summary available',
        status: getCleanStatus(apiBill.latestAction?.text || 'Introduced'),
        chamber: apiBill.originChamber || (billType === 's' ? 'Senate' : 'House'),
        introducedDate: apiBill.introducedDate || new Date().toISOString(),
        number: apiBill.number || billId,
        sponsor: apiBill.sponsors?.[0]?.fullName || 'Unknown Sponsor',
        committees: apiBill.committees?.[0]?.name || 'Various Committees',
        latestAction: apiBill.latestAction?.text,
        latestActionDate: apiBill.latestAction?.actionDate,
        cosponsors: apiBill.cosponsors?.count || 0
      };

      setBill(billData);
      
      // Debug: Check what committee data we have
      console.log('🏛️ Raw committee data from API:', apiBill.committees);
      console.log('🏛️ Committee data structure:', {
        hasCommittees: !!apiBill.committees,
        committeesLength: apiBill.committees?.length || 0,
        firstCommittee: apiBill.committees?.[0]
      });
      
      // Try to fetch committees from separate API endpoint since main endpoint might not include them
      let committeesData: Committee[] = [];
      
      try {
        console.log('🏛️ Fetching committees from separate API...');
        const committeesUrl = `https://api.congress.gov/v3/bill/${congress}/${billType}/${billNumber}/committees?api_key=${apiKey}`;
        console.log(`🌐 Committees API URL: ${committeesUrl.replace(apiKey, '[REDACTED]')}`);
        
        const committeesResponse = await fetch(committeesUrl);
        console.log(`📡 Committees API response status: ${committeesResponse.status}`);
        
        if (committeesResponse.ok) {
          const committeesApiData = await committeesResponse.json();
          console.log('📊 Committees API response:', {
            hasCommittees: !!committeesApiData.committees,
            committeesCount: committeesApiData.committees?.length || 0,
            firstFewCommittees: committeesApiData.committees?.slice(0, 3)
          });
          
          if (committeesApiData.committees && committeesApiData.committees.length > 0) {
            committeesData = committeesApiData.committees.map((committee: any) => ({
              name: committee.name || 'Unknown Committee',
              chamber: committee.chamber || billData.chamber
            }));
            console.log(`✅ Loaded ${committeesData.length} committees from separate API`);
          }
        } else {
          console.log(`❌ Committees API error: ${committeesResponse.status}`);
        }
      } catch (committeesError) {
        console.error('❌ Error fetching committees:', committeesError);
      }
      
      // Fallback to main API data if separate endpoint failed
      if (committeesData.length === 0 && apiBill.committees && apiBill.committees.length > 0) {
        console.log('📊 Using committees from main bill API data');
        committeesData = apiBill.committees.map((committee: any) => ({
          name: committee.name || 'Unknown Committee',
          chamber: committee.chamber || billData.chamber
        }));
      }
      
      // Final fallback if no committees found
      if (committeesData.length === 0) {
        console.log('⚠️ No committee data found, using fallback');
        committeesData = [{ name: 'No committee information available', chamber: billData.chamber }];
      }
      
      setCommittees(committeesData);
      
      // Set up sponsors data from API
      const sponsorsData: Sponsor[] = [];
      
      // Add primary sponsor
      if (apiBill.sponsors && apiBill.sponsors.length > 0) {
        console.log('🎯 Raw sponsor data:', apiBill.sponsors[0]);
        
        // Extract party information - Congress API provides party as single letter
        let sponsorPartyName = 'Unknown';
        if (apiBill.sponsors[0].party) {
          switch (apiBill.sponsors[0].party.toUpperCase()) {
            case 'D':
              sponsorPartyName = 'Democratic';
              break;
            case 'R':
              sponsorPartyName = 'Republican';
              break;
            case 'I':
              sponsorPartyName = 'Independent';
              break;
            default:
              sponsorPartyName = apiBill.sponsors[0].party;
          }
        }
        
        console.log(`🎭 Primary sponsor ${apiBill.sponsors[0].fullName} party: ${apiBill.sponsors[0].party} → ${sponsorPartyName}`);
        
        sponsorsData.push({
          name: apiBill.sponsors[0].fullName || 'Unknown Sponsor',
          party: sponsorPartyName,
          state: apiBill.sponsors[0].state || 'Unknown',
          bioguideId: apiBill.sponsors[0].bioguideId || 'unknown',
          district: apiBill.sponsors[0].district || 'Unknown'
        });
        
        console.log(`🏛️ Primary sponsor district: ${apiBill.sponsors[0].district} for ${apiBill.sponsors[0].fullName}`);
      } else {
        sponsorsData.push({
          name: billData.sponsor || 'Unknown Sponsor',
          party: 'Unknown',
          state: 'Unknown',
          bioguideId: 'unknown',
          district: 'Unknown'
        });
      }
      
      // Try to fetch cosponsors from separate API endpoint
      try {
        console.log('🤝 Attempting to fetch cosponsors from separate API...');
        const cosponsorsUrl = `https://api.congress.gov/v3/bill/${congress}/${billType}/${billNumber}/cosponsors?api_key=${apiKey}`;
        console.log(`🌐 Cosponsors API URL: ${cosponsorsUrl.replace(apiKey, '[REDACTED]')}`);
        
        const cosponsorsResponse = await fetch(cosponsorsUrl);
        console.log(`📡 Cosponsors API response status: ${cosponsorsResponse.status}`);
        
        if (cosponsorsResponse.ok) {
          const cosponsorsData = await cosponsorsResponse.json();
          console.log('📊 Cosponsors API response:', {
            hasCosponsors: !!cosponsorsData.cosponsors,
            cosponsorsCount: cosponsorsData.cosponsors?.length || 0,
            firstFewCosponsors: cosponsorsData.cosponsors?.slice(0, 3)
          });
          
          if (cosponsorsData.cosponsors && cosponsorsData.cosponsors.length > 0) {
            const cosponsorList = cosponsorsData.cosponsors.slice(0, 10).map((cosponsor: any) => {
              console.log('🤝 Raw cosponsor data:', cosponsor);
              
              // Extract party information - Congress API provides party as single letter
              let partyName = 'Unknown';
              if (cosponsor.party) {
                switch (cosponsor.party.toUpperCase()) {
                  case 'D':
                    partyName = 'Democratic';
                    break;
                  case 'R':
                    partyName = 'Republican';
                    break;
                  case 'I':
                    partyName = 'Independent';
                    break;
                  default:
                    partyName = cosponsor.party;
                }
              }
              
              console.log(`🎭 Cosponsor ${cosponsor.fullName} party: ${cosponsor.party} → ${partyName}`);
              
              return {
                name: cosponsor.fullName || 'Unknown Cosponsor',
                party: partyName,
                state: cosponsor.state || 'Unknown',
                bioguideId: cosponsor.bioguideId || 'unknown',
                district: cosponsor.district || 'Unknown'
              };
              
              console.log(`🏛️ Cosponsor district: ${cosponsor.district} for ${cosponsor.fullName}`);
            });
            sponsorsData.push(...cosponsorList);
            console.log(`✅ Added ${cosponsorList.length} cosponsors from separate API`);
          }
        } else {
          console.log(`❌ Cosponsors API error: ${cosponsorsResponse.status}`);
        }
      } catch (cosponsorsError) {
        console.error('❌ Error fetching cosponsors:', cosponsorsError);
      }
      
      // Fallback: Add cosponsors if available from main bill data (this might not work)
      if (apiBill.cosponsors && apiBill.cosponsors.length > 0) {
        console.log('📊 Using cosponsors from main bill API data');
        const cosponsorList = apiBill.cosponsors.slice(0, 10).map((cosponsor: any) => {
          console.log('🤝 Raw fallback cosponsor data:', cosponsor);
          return {
            name: cosponsor.fullName || 'Unknown Cosponsor',
            party: cosponsor.party || 'Unknown',
            state: cosponsor.state || 'Unknown',
            bioguideId: cosponsor.bioguideId || 'unknown',
            district: cosponsor.district || 'Unknown'
          };
        });
        sponsorsData.push(...cosponsorList);
      }
      
      console.log(`🎯 Final sponsors data: ${sponsorsData.length} total (1 sponsor + ${sponsorsData.length - 1} cosponsors)`);
      setSponsors(sponsorsData);

      // Fetch bill actions for timeline
      try {
        console.log('📜 Fetching bill actions from Congress API...');
        const actionsUrl = `https://api.congress.gov/v3/bill/${congress}/${billType}/${billNumber}/actions?api_key=${apiKey}`;
        console.log(`🌐 Actions API URL: ${actionsUrl.replace(apiKey, '[REDACTED]')}`);
        
        const actionsResponse = await fetch(actionsUrl);
        console.log(`📡 Actions API response status: ${actionsResponse.status}`);
        
        if (actionsResponse.ok) {
          const actionsData = await actionsResponse.json();
          console.log('📊 Actions API response:', {
            hasActions: !!actionsData.actions,
            actionsCount: actionsData.actions?.length || 0,
            firstFewActions: actionsData.actions?.slice(0, 3)
          });
          
          if (actionsData.actions && actionsData.actions.length > 0) {
            const actionsList = actionsData.actions.map((action: any) => ({
              date: action.actionDate || action.date || new Date().toISOString(),
              action: action.text || action.description || 'Unknown action'
            }));
            
            // Sort by date (newest first)
            actionsList.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
            
            // Add deduplication function for actions
            const dedupedActions = deduplicateActions(actionsList);
            
            setActions(dedupedActions);
            console.log(`✅ Loaded ${dedupedActions.length} actions from API`);
          } else {
            // Fallback to basic actions
            const fallbackActions = [
              {
                date: billData.introducedDate,
                action: `Introduced in ${billData.chamber}`
              }
            ];
            
            if (billData.latestAction && billData.latestActionDate) {
              fallbackActions.push({
                date: billData.latestActionDate,
                action: billData.latestAction
              });
            }
            
            setActions(deduplicateActions(fallbackActions));
            console.log('📝 Using fallback actions');
          }
        } else {
          console.log(`❌ Actions API error: ${actionsResponse.status}`);
          // Use fallback actions
          const fallbackActions = [
            {
              date: billData.introducedDate,
              action: `Introduced in ${billData.chamber}`
            }
          ];
          
          if (billData.latestAction && billData.latestActionDate) {
            fallbackActions.push({
              date: billData.latestActionDate,
              action: billData.latestAction
            });
          }
          
          setActions(deduplicateActions(fallbackActions));
        }
      } catch (actionsError) {
        console.error('❌ Error fetching actions:', actionsError);
        // Use fallback actions
        const fallbackActions = [
          {
            date: billData.introducedDate,
            action: `Introduced in ${billData.chamber}`
          }
        ];
        
        if (billData.latestAction && billData.latestActionDate) {
          fallbackActions.push({
            date: billData.latestActionDate,
            action: billData.latestAction
          });
        }
        
        setActions(deduplicateActions(fallbackActions));
      }

      // Fetch bill text versions
      try {
        console.log('📄 Fetching bill text versions...');
        const textUrl = `https://api.congress.gov/v3/bill/${congress}/${billType}/${billNumber}/text?api_key=${apiKey}`;
        console.log(`🌐 Text API URL: ${textUrl.replace(apiKey, '[REDACTED]')}`);
        
        const textResponse = await fetch(textUrl);
        console.log(`📡 Text API response status: ${textResponse.status}`);
        
        if (textResponse.ok) {
          const textData = await textResponse.json();
          console.log('📊 Text API response:', {
            hasTextVersions: !!textData.textVersions,
            versionsCount: textData.textVersions?.length || 0
          });
          
          if (textData.textVersions && textData.textVersions.length > 0) {
            const versions: BillTextVersion[] = textData.textVersions.map((version: any) => {
              console.log('📄 Processing version:', {
                type: version.type,
                formats: version.formats?.map((f: any) => ({ type: f.type, url: f.url?.substring(0, 50) + '...' })),
                formatsCount: version.formats?.length
              });
              
              // Look for PDF format first, then fallback to other formats
              let pdfUrl = '';
              if (version.formats && Array.isArray(version.formats)) {
                // Find PDF format
                const pdfFormat = version.formats.find((format: any) => 
                  format.type?.toLowerCase() === 'pdf' || 
                  format.url?.toLowerCase().includes('.pdf')
                );
                
                if (pdfFormat) {
                  pdfUrl = pdfFormat.url;
                  console.log('✅ Found PDF format:', pdfUrl.substring(0, 50) + '...');
                } else {
                  // Fallback to first available format
                  pdfUrl = version.formats[0]?.url || '';
                  console.log('📄 Using fallback format:', pdfUrl.substring(0, 50) + '...');
                }
              } else {
                pdfUrl = version.url || '';
                console.log('📄 Using direct URL:', pdfUrl.substring(0, 50) + '...');
              }

              return {
                date: version.date || new Date().toISOString(),
                type: version.type || 'Unknown',
                url: pdfUrl,
                description: getVersionDescription(version.type) + (version.date ? ` (${formatDate(version.date)})` : '')
              };
            });
            
            // Sort by date (newest first)
            versions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            
            setBillTextVersions(versions);
            console.log(`✅ Loaded ${versions.length} text versions`);
          } else {
            console.log('📝 No text versions found');
            setBillTextVersions([]);
          }
        } else {
          console.log(`❌ Text API error: ${textResponse.status}`);
          setBillTextVersions([]);
        }
      } catch (textError) {
        console.error('❌ Error fetching text versions:', textError);
        setBillTextVersions([]);
      }

    } catch (error) {
      console.error('❌ Error loading bill:', error);
      Alert.alert('Error', 'Failed to load bill details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const checkTrackingStatus = async () => {
    if (!user) return;

    try {
      console.log(`🔍 Checking tracking status for bill ${billId} and user ${user.id}`);
      
      const { data, error } = await supabase
        .from('user_tracked_bills')
        .select('userId, billId')
        .eq('userId', user.id)
        .eq('billId', billId)
        .single();

      console.log(`📊 Tracking check result:`, { data, error, isTracking: !!data });
      
      if (error && error.code !== 'PGRST116') {
        // PGRST116 means no rows found, which is expected when not tracking
        console.error('❌ Error checking tracking status:', error);
      }
      
      setIsTracking(!!data);
      console.log(`🔍 Tracking status for ${billId}:`, !!data);
    } catch (error) {
      console.error('❌ Exception checking tracking status:', error);
      // Not tracking - this is expected when not found
      setIsTracking(false);
    }
  };

  const toggleTracking = async () => {
    if (!user) {
      Alert.alert('Please sign in', 'You need to sign in to track bills');
      return;
    }

    try {
      if (isTracking) {
        // Remove from tracking
        const { error } = await supabase
          .from('user_tracked_bills')
          .delete()
          .eq('userId', user.id)
          .eq('billId', billId);

        if (error) throw error;
        setIsTracking(false);
        console.log('✅ Bill removed from tracking');
        Alert.alert('Success', 'Bill removed from tracking');
      } else {
        // Add to tracking - use upsert to handle duplicates
        const { error } = await supabase
          .from('user_tracked_bills')
          .upsert({
            userId: user.id,
            billId: billId,
            createdAt: new Date().toISOString(),
          }, {
            onConflict: 'userId,billId'
          });

        if (error) throw error;
        setIsTracking(true);
        console.log('✅ Bill added to tracking');
        Alert.alert('Success', 'Bill added to tracking');
      }
    } catch (error: any) {
      console.error('❌ Error toggling tracking:', error);
      Alert.alert('Error', error.message || 'Failed to update tracking status');
    }
  };

  const shareBill = async () => {
    if (!bill) return;

    try {
      await Share.share({
        message: `Check out this bill: ${bill.title}\n\n${bill.summary}`,
        title: bill.title,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
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
        month: 'short', 
        day: 'numeric' 
      });
    } catch {
      return dateString;
    }
  };

  const getVersionDescription = (type: string) => {
    const versionTypes: { [key: string]: string } = {
      'ih': 'Introduced in House',
      'is': 'Introduced in Senate',
      'eh': 'Engrossed in House',
      'es': 'Engrossed in Senate',
      'rh': 'Reported in House',
      'rs': 'Reported in Senate',
      'pp': 'Public Print',
      'enr': 'Enrolled',
      'eas': 'Engrossed Amendment Senate',
      'eah': 'Engrossed Amendment House',
      'ash': 'Additional Sponsors House',
      'ats': 'Agreed to Senate',
      'ath': 'Agreed to House',
      'sc': 'Senate Committee Print',
      'hc': 'House Committee Print',
    };
    
    return versionTypes[type?.toLowerCase()] || `Version ${type}` || 'Bill Text';
  };

  const handleViewTextVersion = async (version: BillTextVersion) => {
    if (!version.url) {
      Alert.alert('Error', 'No URL available for this version');
      return;
    }

    console.log('📄 Opening PDF viewer with URL:', version.url);
    
    // Store original URL for fallback
    setCurrentOriginalUrl(version.url);
    setCurrentBillVersion(version);
    
    // Always try direct URL first for better PDF rendering
    setCurrentPdfUrl(version.url);
    setShowPdfViewer(true);
    setReadingProgress(0);
  };

  const handleDownloadTextVersion = async (version: BillTextVersion) => {
    if (!version.url) {
      Alert.alert('Error', 'No URL available for this version');
      return;
    }

    try {
      const supported = await Linking.canOpenURL(version.url);
      if (supported) {
        await Linking.openURL(version.url);
      } else {
        Alert.alert('Cannot Open', 'Unable to open this document');
      }
    } catch (error) {
      console.error('Error opening URL:', error);
      Alert.alert('Error', 'Failed to open document');
    }
  };



  const renderTabContent = () => {
    if (!bill) return null;

    switch (activeTab) {
      case 'summary':
        return (
          <View style={styles.summaryContent}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryText}>{bill.summary}</Text>
            </View>
            
            {/* Add Progress Tracker */}
            <BillProgressTracker bill={bill} actions={actions} />
            
            {/* Bill Text Versions Section */}
            {billTextVersions.length > 0 && (
              <View style={styles.textVersionsSection}>
                <Text style={styles.sectionTitle}>Bill Text Versions</Text>
                                 {billTextVersions.map((version, index) => (
                   <View key={`${version.type}-${version.date}-${index}`} style={styles.textVersionCard}>
                     <View style={styles.textVersionHeader}>
                       <View style={styles.textVersionInfo}>
                         <Text style={styles.textVersionTitle} numberOfLines={2}>{version.description}</Text>
                         <Text style={styles.textVersionDate}>{formatDate(version.date)}</Text>
                       </View>
                     </View>
                     <View style={styles.textVersionActions}>
                       <TouchableOpacity
                         style={styles.textVersionButton}
                         onPress={() => handleViewTextVersion(version)}
                       >
                         <Ionicons name="eye-outline" size={16} color="#3b5bdb" />
                         <Text style={styles.textVersionButtonText}>View</Text>
                       </TouchableOpacity>
                       <TouchableOpacity
                         style={styles.textVersionButton}
                         onPress={() => handleDownloadTextVersion(version)}
                       >
                         <Ionicons name="download-outline" size={16} color="#3b5bdb" />
                         <Text style={styles.textVersionButtonText}>Download</Text>
                       </TouchableOpacity>
                     </View>
                   </View>
                 ))}
              </View>
            )}
          </View>
        );

      case 'sponsors':
        return (
          <View style={styles.tabContent}>
            {/* Primary Sponsor Section */}
            {sponsors.length > 0 && (
              <View style={styles.sponsorSection}>
                <Text style={styles.sectionTitle}>Sponsor</Text>
                <MemberCard
                  key={sponsors[0].bioguideId || 0}
                  name={formatMemberName(sponsors[0].name)}
                  party={sponsors[0].party}
                  state={sponsors[0].state}
                  chamber={bill.chamber || 'U.S. Congress'}
                  district={sponsors[0].district ? `${sponsors[0].district}` : 'Unknown'}
                  bioguideId={sponsors[0].bioguideId}
                  contactButtonText="View"
                  onContact={() => {
                    if (sponsors[0].bioguideId && sponsors[0].bioguideId !== 'unknown') {
                      // Navigate using the bioguideId from Congress API
                      navigation.navigate('RepresentativeDetail', { 
                        repId: sponsors[0].bioguideId,
                        fromCongressAPI: true // Flag to indicate this comes from Congress API
                      });
                    } else {
                      Alert.alert('Representative Info', `${sponsors[0].name}\n${sponsors[0].party} - ${sponsors[0].state}\n\nNo additional details available.`);
                    }
                  }}
                />
              </View>
            )}

            {/* Co-sponsors Section */}
            {sponsors.length > 1 && (
              <View style={styles.cosponsorSection}>
                <Text style={styles.sectionTitle}>Co-sponsors ({sponsors.length - 1})</Text>
                <View style={styles.cosponsorsContainer}>
                  {sponsors.slice(1).map((sponsor, index) => (
                    <MemberCard
                      key={sponsor.bioguideId || `cosponsor-${index}`}
                      name={formatMemberName(sponsor.name)}
                      party={sponsor.party}
                      state={sponsor.state}
                      chamber={bill.chamber || 'U.S. Congress'}
                      district={sponsor.district ? `${sponsor.district}` : 'Unknown'}
                      bioguideId={sponsor.bioguideId}
                      contactButtonText="View"
                      onContact={() => {
                        if (sponsor.bioguideId && sponsor.bioguideId !== 'unknown') {
                          // Navigate using the bioguideId from Congress API
                          navigation.navigate('RepresentativeDetail', { 
                            repId: sponsor.bioguideId,
                            fromCongressAPI: true // Flag to indicate this comes from Congress API
                          });
                        } else {
                          Alert.alert('Representative Info', `${sponsor.name}\n${sponsor.party} - ${sponsor.state}\n\nNo additional details available.`);
                        }
                      }}
                    />
                  ))}
                </View>
              </View>
            )}

            {/* Empty State */}
            {sponsors.length === 0 && (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No sponsor information available</Text>
              </View>
            )}
          </View>
        );

      case 'committees':
        return (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>Committees</Text>
            {committees.length > 0 ? (
              <View style={styles.committeesContainer}>
                {committees.map((committee, index) => (
                  <View key={`${committee.name}-${index}`} style={styles.committeeCard}>
                    <View style={styles.committeeHeader}>
                      <Ionicons name="business-outline" size={20} color="#3b5bdb" />
                      <Text style={styles.committeeName}>{committee.name}</Text>
                    </View>
                    <Text style={styles.committeeChamber}>{committee.chamber}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="business-outline" size={48} color="#6b7280" />
                <Text style={styles.emptyText}>No committee information available</Text>
                <Text style={styles.emptySubtext}>
                  Committee assignments may not be available for all bills
                </Text>
              </View>
            )}
          </View>
        );

      case 'timeline':
        return (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>Legislative History</Text>
            <View style={styles.historyList}>
              {actions.length > 0 ? (
                actions.map((action, index) => (
                  <View key={`${index}-${action.date}-${action.action.substring(0, 20)}`} style={styles.historyItem}>
                    <Text style={styles.historyDate}>
                      {formatDate(action.date)}
                    </Text>
                    <Text style={styles.historyAction}>{action.action}</Text>
                  </View>
                ))
              ) : (
                <View style={styles.historyItem}>
                  <Text style={styles.historyDate}>
                    {formatDate(bill.introducedDate)}
                  </Text>
                  <Text style={styles.historyAction}>
                    Introduced in {bill.chamber}
                  </Text>
                </View>
              )}
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b5bdb" />
        <Text style={styles.loadingText}>Loading bill details...</Text>
      </View>
    );
  }

  if (!bill) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="document-outline" size={48} color="#6b7280" />
        <Text style={styles.errorText}>Bill not found</Text>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.billNumber}>{bill.number}</Text>
          <Text style={styles.billTitle}>{bill.title}</Text>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsContent}
          >
            <TouchableOpacity
              style={[styles.tab, activeTab === 'summary' && styles.activeTab]}
              onPress={() => setActiveTab('summary')}
            >
              <Ionicons 
                name="document-text" 
                size={14} 
                color={activeTab === 'summary' ? '#ffffff' : '#9ca3af'} 
              />
              <Text style={[styles.tabText, activeTab === 'summary' && styles.activeTabText]}>
                Summary
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, activeTab === 'sponsors' && styles.activeTab]}
              onPress={() => setActiveTab('sponsors')}
            >
              <Ionicons 
                name="people" 
                size={14} 
                color={activeTab === 'sponsors' ? '#ffffff' : '#9ca3af'} 
              />
              <Text style={[styles.tabText, activeTab === 'sponsors' && styles.activeTabText]}>
                Sponsors
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, activeTab === 'committees' && styles.activeTab]}
              onPress={() => setActiveTab('committees')}
            >
              <Ionicons 
                name="business" 
                size={14} 
                color={activeTab === 'committees' ? '#ffffff' : '#9ca3af'} 
              />
              <Text style={[styles.tabText, activeTab === 'committees' && styles.activeTabText]}>
                Committees
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, activeTab === 'timeline' && styles.activeTab]}
              onPress={() => setActiveTab('timeline')}
            >
              <Ionicons 
                name="list" 
                size={14} 
                color={activeTab === 'timeline' ? '#ffffff' : '#9ca3af'} 
              />
              <Text style={[styles.tabText, activeTab === 'timeline' && styles.activeTabText]}>
                History
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Tab Content */}
        {renderTabContent()}
      </ScrollView>

      {/* Status Bar */}
      <View style={styles.statusBar}>
        <View style={styles.statusInfo}>
          <View style={styles.statusIndicator}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(getAccurateStatus(actions, bill.status)) }]} />
            <Text style={styles.statusText}>{getAccurateStatus(actions, bill.status)}</Text>
          </View>
          <Text style={styles.statusDivider}>•</Text>
          <Text style={styles.statusDate}>
            {bill.latestActionDate ? formatDate(bill.latestActionDate) : formatDate(bill.introducedDate)}
          </Text>
          <Text style={styles.statusDivider}>•</Text>
          <Text style={styles.statusChamber}>{bill.chamber}</Text>
        </View>
      </View>

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.trackButton, isTracking && styles.trackingButton]}
          onPress={toggleTracking}
        >
          <Text style={styles.trackButtonText}>
            {isTracking ? 'Tracking' : 'Track'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionButton, styles.shareButton]} onPress={shareBill}>
          <Text style={styles.shareButtonText}>Share</Text>
        </TouchableOpacity>
      </View>

      {/* PDF Viewer Modal */}
      <Modal
        visible={showPdfViewer}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <SafeAreaView style={styles.pdfModalContainer}>
          <View style={styles.pdfHeader}>
            <TouchableOpacity
              style={styles.pdfCloseButton}
              onPress={() => setShowPdfViewer(false)}
            >
              <Ionicons name="close" size={24} color="#ffffff" />
            </TouchableOpacity>
            <View style={styles.pdfHeaderInfo}>
              <Text style={styles.pdfHeaderTitle}>
                {bill?.number} - {currentBillVersion?.description || 'Bill Text'}
              </Text>
              {readingProgress > 0 && (
                <View style={styles.progressBarContainer}>
                  <View style={[styles.progressBar, { width: `${readingProgress}%` }]} />
                </View>
              )}
            </View>
            <View style={styles.pdfHeaderActions}>
              <TouchableOpacity
                style={styles.pdfActionButton}
                onPress={() => {
                  if (bill) {
                    Share.share({
                      message: `${bill.title}\n\n${currentBillVersion?.description}\n\n${currentOriginalUrl}`,
                      title: `${bill.number} - Bill Text`,
                    });
                  }
                }}
              >
                <Ionicons name="share-outline" size={20} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>
          

          
                     {currentPdfUrl ? (
             <WebView
               ref={webViewRef}
               source={{ uri: currentPdfUrl }}
               style={styles.pdfWebView}
               startInLoadingState={true}
               javaScriptEnabled={true}
               domStorageEnabled={true}
               allowsInlineMediaPlayback={true}
               renderLoading={() => (
                 <View style={styles.pdfLoadingContainer}>
                   <ActivityIndicator size="large" color="#3b5bdb" />
                   <Text style={styles.pdfLoadingText}>Loading document...</Text>
                 </View>
               )}
               onError={(syntheticEvent) => {
                 const { nativeEvent } = syntheticEvent;
                 console.error('WebView error: ', nativeEvent);
                 Alert.alert(
                   'Document Load Error', 
                   'Unable to load document in viewer. Would you like to open it externally?',
                   [
                     { text: 'Cancel', style: 'cancel' },
                     { 
                       text: 'Open Externally', 
                       onPress: () => {
                         setShowPdfViewer(false);
                         Linking.openURL(currentOriginalUrl || currentPdfUrl);
                       }
                     }
                   ]
                 );
               }}
               onLoadEnd={() => {
                 console.log('✅ PDF loaded successfully');
               }}
             />
           ) : (
             <View style={styles.pdfErrorContainer}>
               <Text style={styles.pdfErrorText}>No document URL available</Text>
             </View>
           )}
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#151c2e', // navy from web
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#151c2e', // navy
  },
  loadingText: {
    fontSize: 16,
    color: '#9ca3af', // muted text
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#151c2e', // navy
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
    backgroundColor: '#1e2642', // navy-light
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
    backgroundColor: '#151c2e', // navy - seamless
    alignItems: 'center',
  },
  billNumber: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
  },
  billTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    lineHeight: 32,
    marginBottom: 20,
  },
  tabsContainer: {
    backgroundColor: '#151c2e', // navy
    paddingBottom: 16,
  },
  tabsContent: {
    paddingHorizontal: 16,
    gap: 4,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
    gap: 4,
    backgroundColor: 'transparent',
  },
  activeTab: {
    backgroundColor: '#3b5bdb', // civic-blue
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9ca3af',
  },
  activeTabText: {
    color: '#ffffff',
  },
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 100,
  },
  summaryContent: {
    padding: 20,
  },
  tabContent: {
    padding: 20,
  },
  aiSummaryCard: {
    backgroundColor: '#1e2642', // navy-light
    borderRadius: 12,
    padding: 20,
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  aiIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiIconText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  aiTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  summaryText: {
    fontSize: 16,
    color: '#d1d5db',
    lineHeight: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
  },
  historyList: {
    gap: 16,
  },
  historyItem: {
    backgroundColor: '#1e2642', // navy-light
    padding: 16,
    borderRadius: 8,
  },
  historyDate: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '600',
    marginBottom: 8,
  },
  historyAction: {
    fontSize: 14,
    color: '#ffffff',
    lineHeight: 20,
  },
  statusBar: {
    padding: 20,
    backgroundColor: '#1e2642', // navy-light
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
  },
  statusDivider: {
    fontSize: 14,
    color: '#9ca3af',
    fontWeight: '600',
  },
  statusDate: {
    fontSize: 14,
    color: '#9ca3af',
  },
  statusChamber: {
    fontSize: 14,
    color: '#9ca3af',
  },
  bottomActions: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: '#1e2642', // navy-light
    borderTopWidth: 1,
    borderTopColor: '#374151',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackButton: {
    backgroundColor: '#3b5bdb', // civic-blue
  },
  trackingButton: {
    backgroundColor: '#10b981',
  },
  trackButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  shareButton: {
    backgroundColor: '#374151',
    borderWidth: 1,
    borderColor: '#4b5563',
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#9ca3af',
  },
  progressTracker: {
    backgroundColor: '#1e2642', // navy-light
    borderRadius: 12,
    padding: 20,
    marginTop: 20,
  },
  progressTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
  },
  stageLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingHorizontal: 0,
  },
  stageLabel: {
    fontSize: 11,
    color: '#9ca3af',
    textAlign: 'center',
    flex: 1,
    fontWeight: '500',
  },
  activeStageLabelText: {
    color: '#3b5bdb', // civic-blue
    fontWeight: '700',
  },
  progressBarContainer: {
    position: 'relative',
    height: 8,
    backgroundColor: '#374151',
    borderRadius: 4,
    marginBottom: 16,
    marginHorizontal: 4,
  },
  progressBarBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#374151',
    borderRadius: 4,
  },
  progressBarFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: '#3b5bdb', // civic-blue
    borderRadius: 4,
  },
  progressInfo: {
    alignItems: 'center',
    gap: 8,
  },
  progressPercentage: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
    textAlign: 'center',
  },
  progressDescription: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 16,
  },
  stageIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    position: 'absolute',
    top: -4,
    borderWidth: 2,
    borderColor: '#1e2642', // navy-light
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#9ca3af',
  },
  sponsorSection: {
    marginBottom: 20,
  },
  cosponsorSection: {
    marginBottom: 20,
  },
  cosponsorsContainer: {
    gap: 12,
  },
  summaryCard: {
    backgroundColor: '#1e2642', // navy-light
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  textVersionsSection: {
    marginTop: 20,
  },
  textVersionCard: {
    backgroundColor: '#1e2642', // navy-light
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  textVersionHeader: {
    padding: 16,
  },
  textVersionInfo: {
    flex: 1,
  },
  textVersionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  textVersionDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  textVersionActions: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 16,
    justifyContent: 'center',
  },
  textVersionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(59, 91, 219, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3b5bdb',
    gap: 4,
  },
  textVersionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3b5bdb',
  },
  // PDF Viewer Modal Styles
  pdfModalContainer: {
    flex: 1,
    backgroundColor: '#151c2e',
  },
  pdfHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1e2642',
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  pdfCloseButton: {
    padding: 8,
  },
  pdfHeaderInfo: {
    flex: 1,
    marginHorizontal: 12,
  },
  pdfHeaderTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 4,
  },
  pdfHeaderActions: {
    flexDirection: 'row',
    gap: 8,
  },
  pdfActionButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  progressBar: {
    height: 2,
    backgroundColor: '#3b5bdb',
    borderRadius: 1,
  },
  pdfWebView: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  pdfLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#151c2e',
  },
  pdfLoadingText: {
    fontSize: 16,
    color: '#9ca3af',
    marginTop: 12,
  },
  pdfErrorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#151c2e',
  },
  pdfErrorText: {
    fontSize: 16,
    color: '#ef4444',
  },
  // Reading Tools Panel Styles
  toolsPanel: {
    position: 'absolute',
    top: 72, // Below header
    left: 0,
    right: 0,
    backgroundColor: '#1e2642',
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
    zIndex: 1000,
    maxHeight: 160,
  },
  toolsSection: {
    padding: 16,
  },
  toolsSectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
  },
  toolRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  toolLabel: {
    fontSize: 14,
    color: '#d1d5db',
    fontWeight: '500',
  },
  fontControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  fontButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3b5bdb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fontSizeText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
    minWidth: 40,
    textAlign: 'center',
  },
  quickJumpSection: {
    marginTop: 4,
  },
  quickJumpScroll: {
    marginTop: 8,
  },
  quickJumpButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#374151',
    borderRadius: 6,
    marginRight: 8,
  },
  quickJumpText: {
    fontSize: 12,
    color: '#d1d5db',
    fontWeight: '500',
  },
  // PDF Notice and Disabled States
  pdfNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  pdfNoticeText: {
    fontSize: 12,
    color: '#f59e0b',
    fontWeight: '500',
    flex: 1,
    lineHeight: 16,
  },
  disabledTool: {
    opacity: 0.5,
  },
  disabledText: {
    color: '#6b7280',
  },
  disabledButton: {
    backgroundColor: '#374151',
    opacity: 0.6,
  },
  // Committees Tab Styles
  committeesContainer: {
    gap: 12,
  },
  committeeCard: {
    backgroundColor: '#1e2642', // navy-light
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  committeeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  committeeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    flex: 1,
    flexWrap: 'wrap',
  },
  committeeChamber: {
    fontSize: 14,
    color: '#9ca3af',
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
}); 