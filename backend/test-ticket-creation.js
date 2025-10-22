const { Pool } = require('pg');

const pool = new Pool({
  user: 'fethi',
  host: '147.93.58.155',
  database: 'automivy',
  password: 'Fethi@2025!',
  port: 5432,
});

async function testTicketCreation() {
  try {
    // Créer un ticket de test
    const result = await pool.query(
      'INSERT INTO tickets (user_id, title, description, priority, category) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      ['8c210030-7d0a-48ee-97d2-b74564b1efef', 'Test Ticket', 'Description du ticket de test', 'medium', 'general']
    );
    
    console.log('✅ Ticket créé:', result.rows[0]);
    
    // Vérifier tous les tickets
    const allTickets = await pool.query('SELECT * FROM tickets');
    console.log('Tous les tickets:', allTickets.rows);
    
    // Vérifier les notifications
    const notifications = await pool.query('SELECT * FROM ticket_notifications');
    console.log('Notifications créées:', notifications.rows);
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await pool.end();
  }
}

testTicketCreation();
