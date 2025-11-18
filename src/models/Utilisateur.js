const mongoose = require('mongoose');

const utilisateurSchema = new mongoose.Schema({
  nom: { type: String, required: true },
  prenom: { type: String, required: true },
  email: { 
    type: String, 
    required: true, 
    unique: true
    // ✅ REMOVED: index: true (duplicate with unique: true)
    // unique: true automatically creates an index
  },
  mdp: { type: String, required: true },
  num_tel: { type: String },
  photo: { type: String },
  
  // Rôle: client ou freelance
  role: { 
    type: String, 
    enum: ['client', 'freelance', 'admin', 'candidat', 'formateur'],
    required: true 
  },
  
  // Champs spécifiques aux freelances
  specialite: { type: String },
  cv_pdf: { type: String },
  competences: [{ type: String }],
  tarifHoraire: { type: Number },
  description: { type: String },
  
  // Système de notation
  note: { type: Number, default: 0 },
  nombreAvis: { type: Number, default: 0 },
  
  // Vérification
  emailVerifie: { type: Boolean, default: false },
  
  // Réinitialisation mot de passe
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
  
  // Dates
  dateInscription: { type: Date, default: Date.now },
  derniereConnexion: { type: Date }
}, {
  timestamps: true
});

// ✅ REMOVED: Duplicate index definition
// utilisateurSchema.index({ email: 1 });
// (Already created by unique: true)

utilisateurSchema.index({ role: 1, specialite: 1 });

const Utilisateur = mongoose.model('Utilisateur', utilisateurSchema);

module.exports = Utilisateur;