/**
 * API Services Index
 * Central export point for all API services
 */

import apiClient from './apiClient';
import authService from './authService';
import resourceService from './resourceService';
import userService from './userService';
import feedbackService from './feedbackService';

// Export all services
export {
  apiClient,
  authService,
  resourceService,
  userService,
  feedbackService,
};

// Default export
export default {
  auth: authService,
  resources: resourceService,
  users: userService,
  feedback: feedbackService,
};
