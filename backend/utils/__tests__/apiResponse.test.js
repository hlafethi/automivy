/**
 * Tests unitaires pour apiResponse.js
 */

const { sendSuccess, sendError, sendValidationError, sendNotFound } = require('../apiResponse');

describe('apiResponse', () => {
  let mockRes;

  beforeEach(() => {
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  describe('sendSuccess', () => {
    it('devrait envoyer une réponse de succès avec data', () => {
      const data = { workflow: { id: '123', name: 'Test' } };
      
      sendSuccess(mockRes, data);
      
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: data
      });
    });

    it('devrait inclure metadata si fourni', () => {
      const data = { workflows: [] };
      const metadata = { retrievedAt: '2025-01-01T00:00:00.000Z' };
      
      sendSuccess(mockRes, data, metadata);
      
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: data,
        metadata: metadata
      });
    });

    it('devrait utiliser un code de statut personnalisé', () => {
      const data = { created: true };
      
      sendSuccess(mockRes, data, {}, 201);
      
      expect(mockRes.status).toHaveBeenCalledWith(201);
    });

    it('ne devrait pas inclure metadata si vide', () => {
      const data = { workflows: [] };
      
      sendSuccess(mockRes, data);
      
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: data
      });
      expect(mockRes.json.mock.calls[0][0]).not.toHaveProperty('metadata');
    });
  });

  describe('sendError', () => {
    it('devrait envoyer une réponse d\'erreur avec message', () => {
      const error = 'Erreur lors du déploiement';
      
      sendError(mockRes, error);
      
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: error
      });
    });

    it('devrait inclure details si fourni', () => {
      const error = 'Erreur de validation';
      const details = 'Le workflow contient des placeholders';
      
      sendError(mockRes, error, details);
      
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: error,
        details: details
      });
    });

    it('devrait inclure context si fourni', () => {
      const error = 'Template non trouvé';
      const context = { workflowId: '123', userId: '456' };
      
      sendError(mockRes, error, null, context);
      
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: error,
        context: context
      });
    });

    it('devrait utiliser un code de statut personnalisé', () => {
      const error = 'Ressource non trouvée';
      
      sendError(mockRes, error, null, {}, 404);
      
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('sendValidationError', () => {
    it('devrait envoyer une erreur 400 avec message', () => {
      const error = 'Workflow ID requis';
      
      sendValidationError(mockRes, error);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: error
      });
    });

    it('devrait inclure details et context', () => {
      const error = 'JSON invalide';
      const details = 'Caractère invalide à la position 42';
      const context = { templateId: '123' };
      
      sendValidationError(mockRes, error, details, context);
      
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: error,
        details: details,
        context: context
      });
    });
  });

  describe('sendNotFound', () => {
    it('devrait envoyer une erreur 404', () => {
      const error = 'Template non trouvé';
      
      sendNotFound(mockRes, error);
      
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: error
      });
    });

    it('devrait inclure context si fourni', () => {
      const error = 'Workflow non trouvé';
      const context = { workflowId: '123' };
      
      sendNotFound(mockRes, error, context);
      
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: error,
        context: context
      });
    });
  });
});

