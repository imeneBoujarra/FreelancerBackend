const mongoose = require('mongoose');

// Schéma pour une candidature à une publication
const candidatureSchema = new mongoose.Schema({
  candidatId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Utilisateur',
    required: true 
  },
  dateCandidature: { 
    type: Date, 
    default: Date.now 
  },
  prixPropose: {
    type: Number,
    required: true
  },
  delaiPropose: {
    type: Number, // en jours
    required: true
  },
  message: { 
    type: String,
    required: true 
  },
  statut: {
    type: String,
    enum: ['En attente', 'Acceptée', 'Refusée'],
    default: 'En attente'
  }
});

// Schéma pour la publication (projet)
const publicationSchema = new mongoose.Schema({
  titre: { 
    type: String, 
    required: true, 
    trim: true 
  },
  description: { 
    type: String, 
    required: true 
  },
  client: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Utilisateur',
    required: true 
  },
  specialiteRequise: { 
    type: String 
  },
  budget: { 
    type: Number,
    required: true 
  },
  dateLimite: {
    type: Date
  },
  dateCreation: { 
    type: Date, 
    default: Date.now 
  },
  statut: {
    type: String,
    enum: ['Ouvert', 'En cours', 'Terminé', 'Annulé'],
    default: 'Ouvert' 
  },
  candidatures: [candidatureSchema],
  candidatureAcceptee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Utilisateur'
  },
  prixFinal: {
    type: Number
  },
  delaiFinal: {
    type: Number
  }
});

const Publication = mongoose.model('Publication', publicationSchema);

module.exports = Publication;