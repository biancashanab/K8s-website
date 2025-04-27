// chat/frontend/src/environments/environment.prod.ts
export const environment = {
  production: true,
  // When running in production with direct service access
  apiUrl: 'http://chat-backend:88',
  wsUrl: 'ws://chat-backend:88/chat'
};