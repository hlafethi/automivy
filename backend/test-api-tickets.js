const fetch = require('node-fetch');

async function testTicketsAPI() {
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjhjMjEwMDMwLTdkMGEtNDhlZS05N2QyLWI3NDU2NGIxZWZlZiIsImVtYWlsIjoidXNlckBoZWxlYW0uY29tIiwicm9sZSI6InVzZXIiLCJpYXQiOjE3NjExMTQ0NDAsImV4cCI6MTc2MTIwMDg0MH0.6wfzgBWhUWUCnE_L2LRZTj3OVRSCsfhzUc_K35eDnv4';
  
  try {
    console.log('🔍 Test de l\'API tickets...');
    
    // Test GET /api/tickets
    const response = await fetch('http://localhost:3004/api/tickets', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('✅ Réponse API tickets:', data);
    
    // Test GET /api/tickets/notifications/unread
    const notificationsResponse = await fetch('http://localhost:3004/api/tickets/notifications/unread', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (notificationsResponse.ok) {
      const notificationsData = await notificationsResponse.json();
      console.log('✅ Réponse notifications:', notificationsData);
    } else {
      console.log('❌ Erreur notifications:', notificationsResponse.status);
    }
    
  } catch (error) {
    console.error('❌ Erreur lors du test API:', error.message);
  }
}

testTicketsAPI();
