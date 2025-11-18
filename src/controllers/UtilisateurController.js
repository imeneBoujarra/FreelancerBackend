const bcrypt = require("bcrypt"); // utilisation de bycypt pour le hachage des mots passe
const Utilisateur = require("../models/Utilisateur.js");
require("dotenv").config();
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken"); // utilisation de json web token 
const ResetPasswordTemplate  = require("../TemplateAuth/ResetPasswordTemplate.js");
const UserEmailTemplate= require("../TemplateAuth/UserEmailTemplate.js")
const multer = require('multer');
require('../config.js'); // Importer la configuration pour créer les dossiers

const FROM_EMAIL = process.env.MAILER_EMAIL_ID;
const AUTH_PASSWORD = process.env.MAILER_PASSWORD;
const API_ENDPOINT =
    process.env.NODE_ENV === "production"
        ? process.env.PRODUCTION_API_URL
        : process.env.DEVELOPMENT_API_URL;

const smtpTransport = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    service: "gmail",
    auth: {
        user: FROM_EMAIL,
        pass: AUTH_PASSWORD,
    },
});

// const storage = multer.diskStorage({
//     destination: (req, file, cb) => {
//       const fileType = file.mimetype.split('/')[0];
//       if (fileType === 'image') {
//         cb(null, 'uploads/images'); 
//       } else if (fileType === 'application' && file.mimetype.includes('pdf')) {
//         cb(null, 'uploads/cvs'); 
//       } else {
//         cb(new Error('Invalid file type'), false);
//       }
//     },
//     filename: (req, file, cb) => {
//       const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
//       cb(null, file.fieldname + '-' + uniqueSuffix + '.' + file.mimetype.split('/')[1]);
//     }
//   });
  
//   const upload = multer({
//     storage: storage,
//     limits: { fileSize: 10 * 1024 * 1024 }, 
//   }).fields([
//     { name: 'photo', maxCount: 1 }, 
//     { name: 'cv_pdf', maxCount: 1 }, 
//   ]);

// async function registerUser(req, res) {
//     try {
//         const { nom, prenom, role, email, mdp, num_tel, num_cin, photo, specialite, cv_pdf } = req.body;

//         if (!nom || !prenom || !role || !email || !mdp) {
//             return res.status(400).json({ error: "Missing required fields" });
//         }

//         // Génération du salt et hachage du mot de passe
//         const salt = await bcrypt.genSalt(10);
//         const hashedPassword = await bcrypt.hash(mdp, salt);

//         const userData = {
//             nom,
//             prenom,
//             role,
//             email,
//             mdp: hashedPassword,
//             num_tel,  
//             num_cin, 
//             photo
//         };

//         if (specialite) userData.specialite = specialite;
//         if (cv_pdf) userData.cv_pdf = cv_pdf;

//         const newUser = await Utilisateur.create(userData);

//         res.status(201).json({
//             message: "Utilisateur registered successfully",
//         });
//     } catch (error) {
//         console.error(error); // Log l'erreur pour le débogage
//         res.status(500).json({ error: "An error occurred" });
//     }
// }
// async function registerUser(req, res) {
//     upload(req, res, async (err) => {
//       if (err) {
//         return res.status(400).json({ error: "File upload error", message: err.message });
//       }
  
//       try {
//         const { nom, prenom, role, email, mdp, num_tel, num_cin, specialite } = req.body;
//         const { photo, cv_pdf } = req.files;
  
//         if (!nom || !prenom || !role || !email || !mdp) {
//           return res.status(400).json({ error: "Missing required fields" });
//         }
//         const salt = await bcrypt.genSalt(10);
//         const hashedPassword = await bcrypt.hash(mdp, salt);
  
//         const userData = {
//           nom,
//           prenom,
//           role,
//           email,
//           mdp: hashedPassword,
//           num_tel,
//           num_cin,
//         };
  
//         if (photo) userData.photo = photo[0].path; 
//         if (cv_pdf) userData.cv_pdf = cv_pdf[0].path; 
  
        
//         if (specialite) userData.specialite = specialite;
  
//         const newUser = await Utilisateur.create(userData);
  
//         res.status(201).json({
//           message: "Utilisateur enregistré avec succès",
//         });
//       } catch (error) {
//         console.error(error); 
//         res.status(500).json({ error: "An error occurred" });
//       }
//     });
//   }


const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const fileType = file.mimetype.split('/')[0];
      if (fileType === 'image') {
        cb(null, 'uploads/images'); // Enregistrer les images dans le dossier 'uploads/images'
      } else if (fileType === 'application' && file.mimetype.includes('pdf')) {
        cb(null, 'uploads/cvs'); // Enregistrer les PDF dans le dossier 'uploads/cvs'
      } else {
        cb(new Error('Invalid file type'), false); // Erreur pour un type de fichier non valide
      }
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + '.' + file.mimetype.split('/')[1]); // Générer un nom de fichier unique
    }
  });
  
  const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // Limite de taille de fichier à 10MB
  }).fields([
    { name: 'photo', maxCount: 1 }, // Permettre un seul fichier photo
    { name: 'cv_pdf', maxCount: 1 }, // Permettre un seul fichier CV
  ]);
  async function registerUser(req, res) {
    upload(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ error: "File upload error", message: err.message });
        }

        try {
            const { nom, prenom, role, email, mdp, num_tel, num_cin, specialite } = req.body;
            const { photo, cv_pdf } = req.files; // Récupérer les fichiers photo et CV

            // Vérification des champs requis
            if (!nom || !prenom || !role || !email || !mdp || !num_cin) {
                return res.status(400).json({ error: "Missing required fields" });
            }

            // Vérification si un CV a été téléchargé et s'il est bien en PDF
            if (cv_pdf && cv_pdf[0].mimetype !== 'application/pdf') {
                return res.status(400).json({ error: "Le fichier CV doit être au format PDF" });
            }

            // Hachage du mot de passe
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(mdp, salt);

            // Préparation des chemins pour les fichiers photo et CV
            const photoPath = photo ? `uploads/images/${photo[0].filename}` : null;
            const cvPath = cv_pdf ? `uploads/cvs/${cv_pdf[0].filename}` : null;

            // Création de l'objet utilisateur
            const userData = {
                nom,
                prenom,
                role,
                email,
                mdp: hashedPassword,
                num_tel,
                num_cin,
                photo: photoPath,
                specialite: specialite || null,
                cv_pdf: cvPath, // Stocker le chemin du CV
            };

            // Création de l'utilisateur dans la base de données
            const newUser = await Utilisateur.create(userData);

            // Envoi de l'email de confirmation
            const smtpTransport = nodemailer.createTransport({
                service: "Gmail",
                auth: {
                    user: process.env.FROM_EMAIL,
                    pass: process.env.AUTH_PASSWORD,
                },
            });

            const mailOptions = {
                from: 'votre.email@gmail.com',
                to: email,
                subject: 'Confirmation de votre inscription sur notre plateforme',
                html: `
                    <h1>Bienvenue sur notre plateforme, ${prenom} ${nom} !</h1>
                    <p>Nous sommes ravis de vous accueillir parmi nous. Votre inscription a été effectuée avec succès.</p>
                    <ul>
                        <li><strong>Email :</strong> ${email}</li>
                        <li><strong>Rôle :</strong> ${role}</li>
                    </ul>
                    <p>Si vous avez des questions ou des problèmes, n'hésitez pas à nous contacter.</p>
                    <p>L’équipe de la plateforme</p>
                `,
            };

            await smtpTransport.sendMail(mailOptions);

            // Réponse avec l'utilisateur enregistré
            res.status(201).json({
                message: "Utilisateur enregistré avec succès",
                user: {
                    _id: newUser._id,
                    nom: newUser.nom,
                    prenom: newUser.prenom,
                    email: newUser.email,
                    num_cin: newUser.num_cin,
                    photo: newUser.photo,
                    role: newUser.role,
                    specialite: newUser.specialite,
                    cv_pdf: newUser.cv_pdf, // Inclure le chemin du CV
                    __v: newUser.__v,
                },
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: "Une erreur est survenue lors de l'enregistrement" });
        }
    });
}


  async function getCandidatsCount(req, res) { 
    try {
        const candidatsCount = await Utilisateur.countDocuments({ role: 'candidat' });
        res.status(200).json({ message: 'Nombre de candidats', count: candidatsCount });
    } catch (error) {
        console.error(error); // Afficher l'erreur dans la console pour un débogage plus détaillé
        res.status(500).json({ message: error.message });
    }
}
async function getAllUsers(req, res) {
    try {
        const users = await Utilisateur.find();
        console.log("here", users);
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}
async function getAllSpecialities(req, res) {
    try {
        // Récupérer uniquement les utilisateurs avec un champ "specialite"
        const users = await Utilisateur.find({}, { specialite: 1, _id: 0 });

        // Extraire les spécialités uniques (si nécessaire)
        const specialities = users
            .map(user => user.specialite)
            .filter((speciality, index, self) => speciality && self.indexOf(speciality) === index);

        res.status(200).json(specialities);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

async function getUserByEmail(req, res) {
    try {
        const userEmail = req.params.email;
        
        // Recherche d'un utilisateur par son email
        const user = await Utilisateur.findOne({ email: userEmail });  // Utilisez findOne avec un objet pour rechercher par email
        
        console.log(user);  // Vérifiez la réponse

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json(user);  // Si l'utilisateur est trouvé, renvoyer la réponse
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}


async function getUserById1(req, res) {
    console.log("hi")
    try {
        const userId = req.params.id;
        console.log(userId)
        const user = await Utilisateur.findById(userId);
console.log(user)
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}
// async function updateUser(req, res) {
//     try {
//         const userId = req.params.id; // Récupère l'ID utilisateur depuis les paramètres de la requête
//         console.log('User ID:', userId);

//         // Extrait les champs à mettre à jour du corps de la requête
//         const { nom, prenom, photo, num_tel, num_cin, email, mdp, specialite } = req.body;

//         // Recherche et mise à jour de l'utilisateur par ID
//         const updatedUser = await Utilisateur.findByIdAndUpdate(
//             userId, // ID de l'utilisateur à mettre à jour
//             {
//                 nom,
//                 prenom,
//                 photo,
//                 num_tel,
//                 num_cin,
//                 email,
//                 mdp,
//                 specialite,
//             },
//             { new: true } // Retourne le document mis à jour
//         );

//         // Si l'utilisateur n'a pas été trouvé
//         if (!updatedUser) {
//             return res.status(404).json({ error: "Utilisateur not found" });
//         }

//         // Répond avec l'utilisateur mis à jour
//         res.status(200).json(updatedUser);

//     } catch (error) {
//         console.error(error); // Log l'erreur pour faciliter le débogage
//         res.status(500).json({ error: "An error occurred", details: error.message });
//     }
// }
async function updateUser(req, res) {
    upload(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ error: "Erreur de téléchargement du fichier", message: err.message });
        }

        try {
            const userId = req.params.id; 
            const { nom, prenom, role, email, mdp, num_tel, num_cin, specialite } = req.body;
            const { photo } = req.files; 

            const existingUser = await Utilisateur.findById(userId);
            if (!existingUser) {
                return res.status(404).json({ error: "Utilisateur non trouvé" });
            }

            let updatedUserData = {};

            if (mdp) {
                const salt = await bcrypt.genSalt(10);
                updatedUserData.mdp = await bcrypt.hash(mdp, salt);
            }

            if (nom) updatedUserData.nom = nom;
            if (prenom) updatedUserData.prenom = prenom;
            if (role) updatedUserData.role = role;
            if (email) updatedUserData.email = email;
            if (num_tel) updatedUserData.num_tel = num_tel;
            if (num_cin) updatedUserData.num_cin = num_cin;
            if (specialite) updatedUserData.specialite = specialite;

            // Gestion de la photo si elle est téléchargée
            if (photo) {
                updatedUserData.photo = `uploads/images/${photo[0].filename}`;
            } else {
                updatedUserData.photo = existingUser.photo;  
            }

            const updatedUser = await Utilisateur.findByIdAndUpdate(userId, updatedUserData, { new: true });

            // Retourner une réponse avec les données mises à jour de l'utilisateur
            res.status(200).json({
                message: "Utilisateur mis à jour avec succès",
                user: {
                    _id: updatedUser._id,
                    nom: updatedUser.nom,
                    prenom: updatedUser.prenom,
                    email: updatedUser.email,
                    num_cin: updatedUser.num_cin,
                    photo: updatedUser.photo,
                    role: updatedUser.role,
                    __v: updatedUser.__v,
                },
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: "Une erreur est survenue lors de la mise à jour" });
        }
    });
}



async function deleteUser(req, res) {
    try {
        const userId = req.params.id;

        const user = await Utilisateur.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "Utilisateur not found" });
        }

        await Utilisateur.deleteOne({ _id: userId });

        res.status(200).json({ message: "Utilisateur deleted successfully" });
    } catch (error) {
        console.error(error);  
        res.status(500).json({ message: "Error suspendu" });
    }
}


// async function loginUser(req, res) {
//     try {
//         const { email, mdp } = req.body;
//         console.log('Email:', email); 
//         console.log('Password:', mdp);

//         if (!email || !mdp) {
//             return res.status(400).json({ error: "Missing email or password" });
//         }

//         const user = await Utilisateur.findOne({ email });
//         console.log("Retrieved User:", user ? user.mdp : "User not found");

//         if (!user) {
//             return res.status(401).json({ error: "Invalid email" });
//         }

//         const isPasswordValid = await bcrypt.compare(mdp, user.mdp);
//         console.log("Password comparison result:", isPasswordValid);

//         if (!isPasswordValid) {
//             return res.status(401).json({ error: "Invalid password" });
//         }

//         // Création du token JWT
//         const token = jwt.sign({ UserId: user._id }, "secret_key", { expiresIn: "12h" });
//         res.json({ user: { email: user.email }, token });

//     } catch (error) {
//         console.error("Error during login:", error); 
//         res.status(500).json({ error: "An error occurred", details: error.message });
//     }
// }
async function loginUser(req, res) {
    try {
        const { email, mdp } = req.body;
        console.log('Email:', email); 
        console.log('Password:', mdp);

        if (!email || !mdp) {
            return res.status(400).json({ error: "Missing email or password" });
        }

        const user = await Utilisateur.findOne({ email });
        console.log("Retrieved User:", user ? user.mdp : "User not found");

        if (!user) {
            return res.status(401).json({ error: "Invalid email" });
        }

        const isPasswordValid = await bcrypt.compare(mdp, user.mdp);
        console.log("Password comparison result:", isPasswordValid);

        if (!isPasswordValid) {
            return res.status(401).json({ error: "Invalid password" });
        }

        // Création du token JWT
        const token = jwt.sign({ UserId: user._id }, "secret_key", { expiresIn: "12h" });

        // ✅ FIXED: Don't use localStorage (Node.js backend)
        // localStorage is ONLY for frontend (browser)
        // Send user data and token to frontend - frontend will store in localStorage

        const userData = {
            id: user._id,                    // Add user ID
            nom: user.nom,
            prenom: user.prenom,
            email: user.email,
            role: user.role,
            photo: user.photo || null,      // Include photo
            specialite: user.specialite || null,
            num_tel: user.num_tel || null,
            num_cin: user.num_cin || null
        };

        // Renvoi de l'utilisateur et du token
        res.json({ 
            message: "Login successful",
            user: userData, 
            token 
        });
       
    } catch (error) {
        console.error("Error during login:", error); 
        res.status(500).json({ error: "An error occurred", details: error.message });
    }
}


async function forgotPassword(req, res) {
    try {
        // Trouver l'utilisateur par email
        const user = await Utilisateur.findOne({ email: req.body.email });

        if (!user) {
            return res.status(404).json({ message: "Utilisateur not found." });
        }

        // Générer un token aléatoire
        const token = Math.floor(1000 + Math.random() * 9000);

        // Mettre à jour l'utilisateur avec le token et sa date d'expiration
        user.resetPasswordToken = token;
        user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 heure
        await user.save();

        // Construire le modèle de courriel pour la réinitialisation
        const template = UserEmailTemplate(user.nom, user.email, API_ENDPOINT, token);

        // Configuration de nodemailer
        const smtpTransport = nodemailer.createTransport({
            service: "Gmail", // Remplacez par votre service d'email
            auth: {
                user: process.env.FROM_EMAIL,
                pass: process.env.AUTH_PASSWORD,
            },
        });

        const data = {
            from: FROM_EMAIL,
            to: user.email,
            subject: "Réinitialisez votre mot de passe",
            html: template,
        };

        // Envoyer l'e-mail
        await smtpTransport.sendMail(data);

        return res.json({
           message : "Check your e-mail !"
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
}


async function resetPassword(req, res) {
    try {
        const user = await Utilisateur.findOne({
            where: {
                resetPasswordToken: req.params.token,
                resetPasswordExpires: { $gt : new Date () },
            },
        });

        console.log("resetPasswordToken",req.params.token);
        console.log("new Date()",new Date());
        console.log("user",user);

        if (!user) {
            console.log("Token invalid or expired");
            return res.status(400).send({
                message: "Password reset token is invalid or has expired.",
            });
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(req.body.newPassword, salt);

        await Utilisateur.update(
            {
                mdp: hashedPassword,
                resetPasswordToken: null,
                resetPasswordExpires: null,
            },
            { where: { idUtilisateur: user.idUtilisateur } }
        );

        const template = ResetPasswordTemplate(user.nom_prenom);
        const data = {
            to: user.email,
            from: FROM_EMAIL,
            subject: "Confirmation de réinitialisation du mot de passe",
            html: template,
        };

        await smtpTransport.sendMail(data);

        return res.json({ message: "Réinitialisation du mot de passe" });
    } catch (error) {
        console.error("Error in resetPassword:", error);
        return res.status(500).json({ message: error.message });
    }
}

//Methode de vérification du token de la réunitialisation du mdp
async function checkResetToken(req, res) {
    try {
        const user = await Utilisateur.findOne({
            where: {
                resetPasswordToken: req.params.token,
                resetPasswordExpires: { $gt: new Date() },
            },
        });

        if (!user) {
            return res.status(400).json({
                isValid: false,
                message: "Password reset token is invalid or has expired.",
            });
        }

        return res.json({ isValid: true });
    } catch (error) {
        return res.status(500).json({ isValid: false, message: error.message });
    }
}
async function getAllCandidats(req, res) {
    try {
      const users = await Utilisateur.find({ role: 'candidat' });
      res.status(200).json(users);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
  
  
  async function getAllFormateurs(req, res) {
    try {
      const users = await Utilisateur.find({ role: 'formateur' });
      res.status(200).json(users);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
  async function getFormateursCount(req, res) {
    try {
        const formateursCount = await Utilisateur.countDocuments({ role: 'formateur' });
        res.status(200).json({ message: 'Nombre de formateurs', count: formateursCount });
    } catch (error) {
        console.error(error); // Afficher l'erreur dans la console pour un débogage plus détaillé
        res.status(500).json({ message: error.message });
    }
}


module.exports = {
    registerUser,
    getAllUsers,
    getUserByEmail,
    getUserById1,
    updateUser,
    deleteUser,
    loginUser,
    forgotPassword,
    resetPassword,
    checkResetToken,
    getAllCandidats,
    getAllFormateurs,
    getCandidatsCount,
    getFormateursCount,
    getAllSpecialities,
}