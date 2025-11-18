const mongoose = require('mongoose');

const utilisateurSchema = new mongoose.Schema({
  nom: { type: String, required: true },
  prenom: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  mdp: { type: String, required: true },
  num_tel: { type: String },
  photo: { type: String },
  
  // Rôle: client ou freelance
  role: { 
    type: String, 
    enum: ['client', 'freelance', 'admin'],
    required: true 
  },
  
  // Champs spécifiques aux freelances
  specialite: { type: String }, // ex: "Développement Web", "Design"
  cv_pdf: { type: String },
  competences: [{ type: String }], // ex: ["React", "Node.js"]
  tarifHoraire: { type: Number }, // Tarif indicatif
  description: { type: String }, // Bio du freelance
  
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

// Index pour recherche optimisée
utilisateurSchema.index({ email: 1 });
utilisateurSchema.index({ role: 1, specialite: 1 });

const Utilisateur = mongoose.model('Utilisateur', utilisateurSchema);

module.exports = Utilisateur;