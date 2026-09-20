import apiClient from './apiClient';

/**
 * Subscription Service
 * Handles API calls to subscription-service
 */
const subscriptionService = {
  getPlans: async () => {
    try {
      const response = await apiClient.get('/subscriptions/plans');
      return response;
    } catch (error) {
      throw error;
    }
  },

  getMe: async () => {
    try {
      const response = await apiClient.get('/subscriptions/me');
      return response;
    } catch (error) {
      throw error;
    }
  },

  createCheckout: async (planId, paymentMethod = 'CARD') => {
    try {
      const response = await apiClient.post('/subscriptions/checkout', { planId, paymentMethod });
      return response;
    } catch (error) {
      throw error;
    }
  },

  submitWebhook: async (payload, signature = '') => {
    try {
      const headers = {};
      if (signature) {
        headers['X-Zyndex-Signature'] = signature;
      }
      const response = await apiClient.post('/subscriptions/webhook', payload, { headers });
      return response;
    } catch (error) {
      throw error;
    }
  },

  getPaymentStatus: async (paymentId) => {
    try {
      const response = await apiClient.get(`/subscriptions/payment-status/${paymentId}`);
      return response;
    } catch (error) {
      throw error;
    }
  },

  getPayments: async () => {
    try {
      const response = await apiClient.get('/subscriptions/payments');
      return response;
    } catch (error) {
      throw error;
    }
  },

  cancelSubscription: async () => {
    try {
      const response = await apiClient.post('/subscriptions/cancel');
      return response;
    } catch (error) {
      throw error;
    }
  }
};

export default subscriptionService;
