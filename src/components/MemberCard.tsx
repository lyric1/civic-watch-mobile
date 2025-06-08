import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface MemberCardProps {
  name: string;
  role?: string; // Sponsor, Cosponsor, Representative, etc.
  party: string;
  state: string;
  district?: string;
  chamber?: string; // U.S. House, U.S. Senate, etc.
  photoUrl?: string;
  bioguideId?: string; // Add bioguideId for better photo fallbacks
  onContact?: () => void;
  onPress?: () => void;
  contactButtonText?: string;
}

export default function MemberCard({
  name,
  role,
  party,
  state,
  district,
  chamber,
  photoUrl,
  bioguideId,
  onContact,
  onPress,
  contactButtonText = 'Contact'
}: MemberCardProps) {
  const [imageError, setImageError] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  
  // Generate fallback photo URLs
  const getPhotoUrls = () => {
    const urls: string[] = [];
    
    if (photoUrl) {
      urls.push(photoUrl);
    }
    
    if (bioguideId && bioguideId !== 'unknown') {
      urls.push(
        `https://www.congress.gov/img/member/${bioguideId.toLowerCase()}_200.jpg`,
        `https://bioguide.congress.gov/bioguide/photo/${bioguideId.charAt(0).toUpperCase()}/${bioguideId.toUpperCase()}.jpg`,
        `https://theunitedstates.io/images/congress/225x275/${bioguideId}.jpg`
      );
    }
    
    return [...new Set(urls)]; // Remove duplicates
  };
  
  const photoUrls = getPhotoUrls();
  const currentPhotoUrl = photoUrls[currentPhotoIndex];
  
  const handleImageError = () => {
    console.log(`❌ Photo failed for ${name}: ${currentPhotoUrl}`);
    // Try next photo URL
    if (currentPhotoIndex < photoUrls.length - 1) {
      console.log(`🔄 Trying next photo URL for ${name}...`);
      setCurrentPhotoIndex(currentPhotoIndex + 1);
    } else {
      console.log(`❌ All photo URLs failed for ${name}, using placeholder`);
      setImageError(true);
    }
  };
  
  const getPartyBadgeStyle = (party: string) => {
    const partyLower = party?.toLowerCase() || '';
    if (partyLower.includes('democrat') || partyLower.includes('democratic')) {
      return [styles.partyBadge, styles.demBadge];
    } else if (partyLower.includes('republican') || partyLower.includes('rep')) {
      return [styles.partyBadge, styles.repBadge];
    } else {
      return [styles.partyBadge, styles.indBadge];
    }
  };

  const getPartyAbbreviation = (party: string) => {
    const partyLower = party?.toLowerCase() || '';
    if (partyLower.includes('democrat') || partyLower.includes('democratic')) return 'D';
    if (partyLower.includes('republican') || partyLower.includes('rep')) return 'R';
    if (partyLower.includes('independent') || partyLower.includes('ind')) return 'I';
    return party?.charAt(0)?.toUpperCase() || 'U';
  };

  const formatLocation = (state: string, district?: string, chamber?: string) => {
    // Only show district for House representatives
    const isHouse = chamber?.toLowerCase().includes('house');
    
    if (isHouse && district) {
      return `${state} • Congressional District ${district}`;
    }
    return state;
  };

  const formatChamberAndParty = (chamber?: string, party?: string) => {
    const partyAbbrev = getPartyAbbreviation(party || '');
    if (chamber && party) {
      return `${chamber} (${partyAbbrev})`;
    } else if (chamber) {
      return chamber;
    } else if (party) {
      return partyAbbrev;
    }
    return 'Unknown';
  };

  const CardContent = (
    <View style={styles.card}>
      {/* Profile Photo */}
      <View style={styles.avatarContainer}>
        {(imageError || (!currentPhotoUrl && photoUrls.length === 0)) ? (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>
              {name.split(' ').map(n => n[0]).join('').toUpperCase()}
            </Text>
          </View>
        ) : currentPhotoUrl ? (
          <Image source={{ uri: currentPhotoUrl }} style={styles.avatar} onError={handleImageError} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>
              {name.split(' ').map(n => n[0]).join('').toUpperCase()}
            </Text>
          </View>
        )}
        {/* Party Badge Overlay */}
        <View style={[styles.partyBadge, getPartyBadgeStyle(party)[1]]}>
          <Text style={styles.partyText}>
            {getPartyAbbreviation(party)}
          </Text>
        </View>
      </View>

      {/* Member Info */}
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>{name}</Text>
        {role && (
          <Text style={styles.memberRole}>{role}</Text>
        )}
        <View style={styles.detailsContainer}>
          <View style={styles.chamberRow}>
            {chamber && (
              <Text style={styles.memberChamber}>{chamber}</Text>
            )}
            {chamber && (
              <Text style={styles.separator}> • </Text>
            )}
            <Text style={styles.stateText}>{state}</Text>
          </View>
          {district && chamber?.toLowerCase().includes('house') && (
            <Text style={styles.districtText}>
              Congressional District {district}
            </Text>
          )}
        </View>
      </View>

      {/* Contact Button */}
      {onContact && (
        <TouchableOpacity style={styles.contactButton} onPress={onContact}>
          <Text style={styles.contactButtonText}>{contactButtonText}</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {CardContent}
      </TouchableOpacity>
    );
  }

  return CardContent;
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f2937',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#374151',
  },
  avatarContainer: {
    marginRight: 10,
    position: 'relative',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  memberInfo: {
    flex: 1,
    marginRight: 8,
  },
  memberName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 2,
  },
  memberRole: {
    fontSize: 11,
    color: '#9ca3af',
    marginBottom: 4,
  },
  memberChamber: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '500',
  },
  detailsContainer: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  partyBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1f2937',
  },
  demBadge: {
    backgroundColor: '#3b82f6',
  },
  repBadge: {
    backgroundColor: '#ef4444',
  },
  indBadge: {
    backgroundColor: '#7c3aed',
  },
  partyText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  stateText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  contactButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#60a5fa',
    borderRadius: 6,
  },
  contactButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  separator: {
    fontSize: 12,
    color: '#9ca3af',
  },
  chamberRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  districtText: {
    fontSize: 12,
    color: '#9ca3af',
  },
}); 