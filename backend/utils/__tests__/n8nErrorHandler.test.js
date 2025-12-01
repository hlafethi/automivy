/**
 * Tests unitaires pour n8nErrorHandler.js
 */

const { parseN8nError, getErrorMessage, handleN8nApiCall } = require('../n8nErrorHandler');

describe('n8nErrorHandler', () => {
  describe('parseN8nError', () => {
    it('devrait parser une erreur HTTP avec JSON', async () => {
      const mockResponse = {
        status: 400,
        text: jest.fn().mockResolvedValue(JSON.stringify({ message: 'Validation failed' }))
      };
      
      const result = await parseN8nError(mockResponse, 'create');
      
      expect(result.code).toBe(400);
      expect(result.details.message).toBe('Validation failed');
      expect(result.message).toContain('création du workflow');
    });

    it('devrait parser une erreur HTTP avec texte brut', async () => {
      const mockResponse = {
        status: 500,
        text: jest.fn().mockResolvedValue('Internal server error')
      };
      
      const result = await parseN8nError(mockResponse, 'update');
      
      expect(result.code).toBe(500);
      expect(result.details.message).toBe('Internal server error');
      expect(result.message).toContain('mise à jour du workflow');
    });

    it('devrait parser une Error avec message n8n', async () => {
      const error = new Error('n8n API error (404): {"message": "Not found"}');
      
      const result = await parseN8nError(error, 'get');
      
      expect(result.code).toBe(404);
      expect(result.details.message).toBe('Not found');
      expect(result.message).toContain('récupération du workflow');
    });

    it('devrait parser une Error générique', async () => {
      const error = new Error('Erreur réseau');
      
      const result = await parseN8nError(error, 'activate');
      
      expect(result.code).toBe(500);
      expect(result.details.message).toBe('Erreur réseau');
      expect(result.message).toContain('opération activate');
    });

    it('devrait gérer une erreur inconnue', async () => {
      const error = 'String error';
      
      const result = await parseN8nError(error, 'delete');
      
      expect(result.code).toBe(500);
      expect(result.message).toContain('opération delete');
    });
  });

  describe('getErrorMessage', () => {
    it('devrait retourner un message pour 400', () => {
      const message = getErrorMessage({ message: 'Invalid data' }, 400, 'create');
      expect(message).toContain('création du workflow');
      expect(message).toContain('Invalid data');
    });

    it('devrait retourner un message pour 401', () => {
      const message = getErrorMessage({}, 401, 'create');
      expect(message).toContain('authentification');
      expect(message).toContain('clé API');
    });

    it('devrait retourner un message pour 404', () => {
      const message = getErrorMessage({}, 404, 'get');
      expect(message).toContain('non trouvée');
      expect(message).toContain('récupération du workflow');
    });

    it('devrait retourner un message pour 422', () => {
      const message = getErrorMessage({ message: 'Invalid workflow' }, 422, 'create');
      expect(message).toContain('validation');
      expect(message).toContain('Invalid workflow');
    });

    it('devrait retourner un message pour 429', () => {
      const message = getErrorMessage({}, 429, 'activate');
      expect(message).toContain('Trop de requêtes');
    });

    it('devrait retourner un message pour 500', () => {
      const message = getErrorMessage({ message: 'Server error' }, 500, 'update');
      expect(message).toContain('serveur n8n');
      expect(message).toContain('mise à jour du workflow');
    });

    it('devrait retourner un message générique pour code inconnu', () => {
      const message = getErrorMessage({ message: 'Unknown' }, 999, 'create');
      expect(message).toContain('999');
      expect(message).toContain('création du workflow');
    });
  });

  describe('handleN8nApiCall', () => {
    it('devrait retourner le résultat si l\'appel réussit', async () => {
      const apiCall = jest.fn().mockResolvedValue({ id: '123', name: 'Workflow' });
      
      const result = await handleN8nApiCall(apiCall, 'create');
      
      expect(result).toEqual({ id: '123', name: 'Workflow' });
      expect(apiCall).toHaveBeenCalledTimes(1);
    });

    it('devrait parser et lancer une erreur améliorée si l\'appel échoue', async () => {
      const mockResponse = {
        status: 400,
        text: jest.fn().mockResolvedValue(JSON.stringify({ message: 'Validation failed' }))
      };
      const apiCall = jest.fn().mockRejectedValue(mockResponse);
      
      await expect(handleN8nApiCall(apiCall, 'create')).rejects.toThrow();
      
      try {
        await handleN8nApiCall(apiCall, 'create');
      } catch (error) {
        expect(error.message).toContain('création du workflow');
        expect(error.code).toBe(400);
        expect(error.details).toBeDefined();
        expect(error.operation).toBe('create');
      }
    });

    it('devrait gérer une Error standard', async () => {
      const error = new Error('Network error');
      const apiCall = jest.fn().mockRejectedValue(error);
      
      await expect(handleN8nApiCall(apiCall, 'update')).rejects.toThrow();
      
      try {
        await handleN8nApiCall(apiCall, 'update');
      } catch (error) {
        expect(error.message).toContain('opération update');
        expect(error.code).toBe(500);
      }
    });
  });
});

