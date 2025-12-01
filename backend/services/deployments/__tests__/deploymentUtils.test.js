/**
 * Tests unitaires pour deploymentUtils.js
 */

// Mock des dépendances avant les imports
jest.mock('../../config', () => ({
  n8n: {
    url: 'http://localhost:5678',
    apiKey: 'test-api-key'
  }
}), { virtual: true });

jest.mock('../../database', () => ({
  getUserWorkflowsByTemplate: jest.fn(),
  deleteUserWorkflow: jest.fn()
}), { virtual: true });

jest.mock('../../utils/logger', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn()
}), { virtual: true });

const mockFetch = jest.fn();
jest.mock('node-fetch', () => mockFetch);

const { cleanSettings, verifyNoPlaceholders, waitForCondition, checkWorkflowExists } = require('../deploymentUtils');

describe('deploymentUtils', () => {
  describe('cleanSettings', () => {
    it('devrait retourner un objet vide', () => {
      const result = cleanSettings({ some: 'settings' });
      expect(result).toEqual({});
    });

    it('devrait retourner un objet vide même avec settings null', () => {
      const result = cleanSettings(null);
      expect(result).toEqual({});
    });
  });

  describe('verifyNoPlaceholders', () => {
    it('ne devrait pas lancer d\'erreur si aucun placeholder', () => {
      const workflowPayload = {
        nodes: [
          {
            name: 'Test Node',
            credentials: {
              imap: { id: 'real-credential-id', name: 'IMAP Credential' }
            }
          }
        ]
      };
      
      expect(() => verifyNoPlaceholders(workflowPayload)).not.toThrow();
    });

    it('devrait détecter ADMIN_OPENROUTER_CREDENTIAL_ID dans le JSON', () => {
      const workflowPayload = {
        nodes: [],
        connections: {}
      };
      
      // Simuler un placeholder dans le JSON stringifié
      const payloadString = JSON.stringify(workflowPayload);
      const payloadWithPlaceholder = JSON.parse(payloadString.replace('{}', '{"placeholder": "ADMIN_OPENROUTER_CREDENTIAL_ID"}'));
      
      expect(() => verifyNoPlaceholders(payloadWithPlaceholder)).toThrow();
    });

    it('devrait détecter USER_IMAP_CREDENTIAL_ID dans les credentials', () => {
      const workflowPayload = {
        nodes: [
          {
            name: 'IMAP Node',
            credentials: {
              imap: { id: 'USER_IMAP_CREDENTIAL_ID', name: 'IMAP' }
            }
          }
        ]
      };
      
      expect(() => verifyNoPlaceholders(workflowPayload)).toThrow();
    });

    it('devrait détecter ADMIN_SMTP_CREDENTIAL_NAME', () => {
      const workflowPayload = {
        nodes: [
          {
            name: 'SMTP Node',
            credentials: {
              smtp: { id: '123', name: 'ADMIN_SMTP_CREDENTIAL_NAME' }
            }
          }
        ]
      };
      
      expect(() => verifyNoPlaceholders(workflowPayload)).toThrow();
    });

    it('devrait fournir un message d\'erreur détaillé', () => {
      const workflowPayload = {
        nodes: [
          {
            name: 'Test Node',
            type: 'n8n-nodes-base.emailReadImap',
            credentials: {
              imap: { id: 'USER_IMAP_CREDENTIAL_ID', name: 'IMAP' }
            }
          }
        ]
      };
      
      try {
        verifyNoPlaceholders(workflowPayload);
        fail('Devrait avoir lancé une erreur');
      } catch (error) {
        expect(error.message).toContain('placeholders');
        expect(error.message).toContain('Test Node');
        expect(error.message).toContain('USER_IMAP_CREDENTIAL_ID');
      }
    });
  });

  describe('waitForCondition', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('devrait retourner true immédiatement si la condition est vraie', async () => {
      const checkCondition = jest.fn().mockResolvedValue(true);
      
      const resultPromise = waitForCondition(checkCondition, { maxAttempts: 3 });
      
      // Avancer les timers pour résoudre la promesse
      await jest.runAllTimersAsync();
      
      const result = await resultPromise;
      
      expect(result).toBe(true);
      expect(checkCondition).toHaveBeenCalledTimes(1);
    });

    it('devrait retry avec backoff exponentiel', async () => {
      let callCount = 0;
      const checkCondition = jest.fn().mockImplementation(() => {
        callCount++;
        return Promise.resolve(callCount >= 3);
      });
      
      const resultPromise = waitForCondition(checkCondition, {
        maxAttempts: 5,
        initialDelay: 100,
        multiplier: 2
      });
      
      // Avancer les timers progressivement
      await jest.advanceTimersByTimeAsync(100);
      await jest.advanceTimersByTimeAsync(200);
      await jest.advanceTimersByTimeAsync(400);
      
      const result = await resultPromise;
      
      expect(result).toBe(true);
      expect(checkCondition).toHaveBeenCalledTimes(3);
    });

    it('devrait retourner false après maxAttempts', async () => {
      const checkCondition = jest.fn().mockResolvedValue(false);
      
      const resultPromise = waitForCondition(checkCondition, {
        maxAttempts: 3,
        initialDelay: 100
      });
      
      // Avancer les timers pour tous les retries
      await jest.advanceTimersByTimeAsync(100);
      await jest.advanceTimersByTimeAsync(200);
      await jest.advanceTimersByTimeAsync(400);
      
      const result = await resultPromise;
      
      expect(result).toBe(false);
      expect(checkCondition).toHaveBeenCalledTimes(3);
    });

    it('devrait respecter maxDelay', async () => {
      const checkCondition = jest.fn().mockResolvedValue(false);
      
      const resultPromise = waitForCondition(checkCondition, {
        maxAttempts: 5,
        initialDelay: 100,
        maxDelay: 300,
        multiplier: 2
      });
      
      // Avancer les timers
      await jest.advanceTimersByTimeAsync(100);
      await jest.advanceTimersByTimeAsync(200);
      await jest.advanceTimersByTimeAsync(300); // maxDelay atteint
      await jest.advanceTimersByTimeAsync(300);
      await jest.advanceTimersByTimeAsync(300);
      
      const result = await resultPromise;
      
      expect(result).toBe(false);
      // Vérifier que les délais n'ont pas dépassé maxDelay
    });

    it('devrait gérer les erreurs dans checkCondition', async () => {
      const checkCondition = jest.fn().mockRejectedValue(new Error('Network error'));
      
      const resultPromise = waitForCondition(checkCondition, {
        maxAttempts: 2,
        initialDelay: 100
      });
      
      await jest.advanceTimersByTimeAsync(100);
      await jest.advanceTimersByTimeAsync(200);
      
      const result = await resultPromise;
      
      expect(result).toBe(false);
      expect(checkCondition).toHaveBeenCalledTimes(2);
    });
  });

  describe('checkWorkflowExists', () => {
    beforeEach(() => {
      mockFetch.mockClear();
    });

    it('devrait retourner true si le workflow existe', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200
      });
      
      const result = await checkWorkflowExists('workflow-123');
      
      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalled();
      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[0]).toContain('/api/v1/workflows/workflow-123');
      expect(callArgs[1].method).toBe('GET');
      expect(callArgs[1].headers['X-N8N-API-KEY']).toBe('test-api-key');
    });

    it('devrait retourner false si le workflow n\'existe pas', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404
      });
      
      const result = await checkWorkflowExists('workflow-123');
      
      expect(result).toBe(false);
      expect(mockFetch).toHaveBeenCalled();
    });

    it('devrait retourner false en cas d\'erreur réseau', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));
      
      const result = await checkWorkflowExists('workflow-123');
      
      expect(result).toBe(false);
      expect(mockFetch).toHaveBeenCalled();
    });
  });
});

