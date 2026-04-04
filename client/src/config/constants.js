// API Configuration
// Centralized API endpoint for all fetch calls
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Validate API_URL in development
if (import.meta.env.DEV && !import.meta.env.VITE_API_URL) {
  console.warn('⚠️ VITE_API_URL not set - using default localhost:5000');
}
