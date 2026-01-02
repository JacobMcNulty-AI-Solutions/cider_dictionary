// Authentication utility helpers
// Provides consistent user ID access across the app

// Default user ID for offline/unauthenticated mode
// This will be replaced with actual Firebase Auth UID when Phase 4 is implemented
const DEFAULT_USER_ID = 'default-user';

/**
 * Get current authenticated user ID
 * Returns 'default-user' until Firebase Auth is implemented in Phase 4
 *
 * Usage:
 * - Always use this helper instead of hardcoding 'default-user'
 * - When Phase 4 Auth is implemented, this will return the actual Firebase UID
 * - All database queries should filter by this userId for data isolation
 */
export function getCurrentUserId(): string {
  // TODO: Phase 4 - Replace with Firebase Auth integration
  // const auth = getAuth();
  // if (auth?.currentUser?.uid) {
  //   return auth.currentUser.uid;
  // }

  return DEFAULT_USER_ID;
}

/**
 * Check if user is authenticated
 * Always returns false until Firebase Auth is implemented
 */
export function isAuthenticated(): boolean {
  // TODO: Phase 4 - Check actual Firebase Auth state
  return false;
}

/**
 * Get user display name
 * Returns null until Firebase Auth is implemented
 */
export function getUserDisplayName(): string | null {
  // TODO: Phase 4 - Return actual user display name
  return null;
}
