// Helper function to get accurate status based on actions analysis
export const getAccurateStatus = (actions: Array<{ date: string; action: string }>, fallbackStatus?: string) => {
  if (!actions || actions.length === 0) {
    return fallbackStatus || 'Unknown';
  }

  // Sort actions by date (newest first) to get the most recent status
  const sortedActions = [...actions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  // Analyze actions to determine the most accurate current status
  for (const action of sortedActions) {
    const actionText = action.action.toLowerCase();
    
    // Check for enacted/law status (highest priority)
    if (actionText.includes('became public law') || 
        actionText.includes('signed by president') ||
        actionText.includes('enacted')) {
      return 'Enacted';
    }
    
    // Check for presidential action
    if (actionText.includes('presented to president') || 
        actionText.includes('sent to president') ||
        actionText.includes('placed on president')) {
      return 'Sent to President';
    }
    
    // Check for vetoed
    if (actionText.includes('vetoed by president') || 
        actionText.includes('returned to') ||
        actionText.includes('pocket veto')) {
      return 'Vetoed';
    }
    
    // Check for passed both chambers
    if (actionText.includes('passed congress')) {
      return 'Passed Congress';
    }
    
    // Check for chamber passage
    if (actionText.includes('passed house') || 
        actionText.includes('house passed') ||
        (actionText.includes('passed') && actionText.includes('house'))) {
      // Check if bill also passed other chamber
      const hasSenatePassed = sortedActions.some(a => 
        a.action.toLowerCase().includes('passed senate') ||
        a.action.toLowerCase().includes('senate passed')
      );
      if (hasSenatePassed) {
        return 'Passed Congress';
      }
      return 'Passed House';
    }
    
    if (actionText.includes('passed senate') || 
        actionText.includes('senate passed') ||
        (actionText.includes('passed') && actionText.includes('senate'))) {
      // Check if bill also passed other chamber
      const hasHousePassed = sortedActions.some(a => 
        a.action.toLowerCase().includes('passed house') ||
        a.action.toLowerCase().includes('house passed')
      );
      if (hasHousePassed) {
        return 'Passed Congress';
      }
      return 'Passed Senate';
    }
    
    // Check for committee action
    if (actionText.includes('reported by committee') || 
        actionText.includes('committee agreed') ||
        actionText.includes('ordered to be reported')) {
      return 'Reported by Committee';
    }
    
    // Check for committee referral/consideration
    if (actionText.includes('referred to committee') || 
        actionText.includes('referred to the committee') ||
        actionText.includes('committee consideration')) {
      return 'In Committee';
    }
    
    // Check for floor consideration
    if (actionText.includes('considered') || 
        actionText.includes('debated') ||
        actionText.includes('under consideration')) {
      return 'Under Consideration';
    }
  }
  
  // Fallback to "Introduced" if we have actions but none match major milestones
  return 'Introduced';
};

// Legacy function for backward compatibility - analyzes latest action text
export const getCleanStatus = (latestActionText: string): string => {
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
  
  // Enhanced check for passed one chamber - more robust pattern matching
  if (actionLower.includes('passed house') || 
      actionLower.includes('house passed') ||
      (actionLower.includes('passed') && actionLower.includes('house')) ||
      (actionLower.includes('motion') && actionLower.includes('house') && (actionLower.includes('agreed') || actionLower.includes('passed'))) ||
      actionLower.includes('house agreed to') ||
      actionLower.includes('agreed to in house')) {
    return 'Passed House';
  }
  
  if (actionLower.includes('passed senate') || 
      actionLower.includes('senate passed') ||
      (actionLower.includes('passed') && actionLower.includes('senate')) ||
      (actionLower.includes('motion') && actionLower.includes('senate') && (actionLower.includes('agreed') || actionLower.includes('passed'))) ||
      actionLower.includes('senate agreed to') ||
      actionLower.includes('agreed to in senate')) {
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