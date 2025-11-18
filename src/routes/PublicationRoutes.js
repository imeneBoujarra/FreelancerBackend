const express = require('express');
const publicationController = require('../controllers/PublicationController');

const router = express.Router();

// Client: Créer une publication
router.post('/publications', publicationController.createPublication);

// Freelance: Postuler à une publication
router.post('/publications/:id/apply', publicationController.applyToPublication);

// Client: Accepter une candidature
router.put('/publications/:publicationId/candidatures/:candidatureId/accept', 
    publicationController.acceptCandidature);

// Récupérer toutes les publications (avec filtres optionnels)
router.get('/publications', publicationController.getAllPublications);

// Récupérer une publication par ID
router.get('/publications/:id', publicationController.getPublicationById);

// Récupérer les publications d'un client
router.get('/publications/client/:clientId', publicationController.getClientPublications);

// Récupérer les candidatures d'un freelance
router.get('/publications/freelance/:freelanceId/candidatures', 
    publicationController.getFreelanceCandidatures);

// Mettre à jour une publication
router.put('/publications/:id', publicationController.updatePublication);

// Supprimer une publication
router.delete('/publications/:id', publicationController.deletePublication);

module.exports = router;