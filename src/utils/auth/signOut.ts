
import { completeSignOut } from './sessionUtils';

export async function signOutUser(): Promise<void> {
  try {
    console.log('Starting user sign out...');
    await completeSignOut();
  } catch (error) {
    console.error('Error during sign out:', error);
    // Force redirect even if there's an error
    window.location.href = '/login';
  }
}
