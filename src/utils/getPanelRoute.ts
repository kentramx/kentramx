/**
 * Returns the appropriate panel route based on user's plan or role.
 * @param userRole - The user's role (agent, agency, developer)
 * @param planName - The subscription plan name (optional)
 * @returns The panel route path
 */
export function getPanelRoute(userRole?: string | null, planName?: string | null): string {
  // If we have the plan name, use it for more accuracy
  if (planName) {
    if (planName.includes('inmobiliaria')) return '/panel-inmobiliaria';
    if (planName.includes('desarrolladora')) return '/panel-desarrolladora';
    if (planName.includes('agente')) return '/panel-agente';
  }
  
  // Otherwise, use the user role
  if (userRole === 'agency') return '/panel-inmobiliaria';
  if (userRole === 'developer') return '/panel-desarrolladora';
  
  // Default for agents and buyers
  return '/panel-agente';
}

/**
 * Returns the subscription tab route for a panel
 * @param userRole - The user's role
 * @param planName - The subscription plan name
 * @returns The subscription panel route path with tab parameter
 */
export function getSubscriptionPanelRoute(userRole?: string | null, planName?: string | null): string {
  return `${getPanelRoute(userRole, planName)}?tab=subscription`;
}
