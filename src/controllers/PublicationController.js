// ============================================
// BACKEND - PublicationController.js (FIXED)
// ============================================

const Publication = require('../models/Publication');
const Utilisateur = require('../models/Utilisateur');
const nodemailer = require('nodemailer');
require('dotenv').config();

// Email configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.FROM_EMAIL,
        pass: process.env.AUTH_PASSWORD,
    },
});

// --- Create Publication ---
async function createPublication(req, res) {
    try {
        const { titre, description, specialiteRequise, budget, clientId } = req.body;

        if (!titre || !description || !clientId) {
            return res.status(400).json({ 
                error: "Missing required fields (titre, description, clientId)" 
            });
        }

        // Validate clientId is a valid ObjectId
        if (!clientId.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({ error: "Invalid client ID format" });
        }

        const client = await Utilisateur.findById(clientId);
        if (!client) {
            return res.status(403).json({ error: "Invalid client ID or role" });
        }

        const newPublication = await Publication.create({
            titre,
            description,
            client: clientId,
            specialiteRequise,
            budget,
            statut: 'Ouvert'
        });

        res.status(201).json({ 
            message: "Publication created successfully", 
            publication: newPublication 
        });
    } catch (error) {
        console.error("Error creating publication:", error);
        res.status(500).json({ error: "An error occurred while creating the publication" });
    }
}

// --- Apply to Publication ---
async function applyToPublication(req, res) {
    try {
        const { id } = req.params;
        const { candidatId, message, prixPropose, delaiPropose } = req.body;

        // Validation
        if (!candidatId || !message || !prixPropose || !delaiPropose) {
            return res.status(400).json({ 
                error: "Missing required fields (candidatId, message, prixPropose, delaiPropose)" 
            });
        }

        // Validate IDs are valid ObjectIds
        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({ error: "Invalid publication ID format" });
        }
        if (!candidatId.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({ error: "Invalid candidate ID format" });
        }

        // Check if publication exists
        const publication = await Publication.findById(id);
        if (!publication) {
            return res.status(404).json({ error: "Publication not found" });
        }

        // Check if candidate exists
        const candidate = await Utilisateur.findById(candidatId);
        if (!candidate) {
            return res.status(404).json({ error: "Candidate not found" });
        }

        // Check if already applied
        const alreadyApplied = publication.candidatures.some(
            c => c.candidatId.toString() === candidatId
        );
        if (alreadyApplied) {
            return res.status(400).json({ error: "You have already applied to this publication" });
        }

        // Create new candidature
        const nouvelleCandidature = {
            candidatId,
            message,
            prixPropose: Number(prixPropose),
            delaiPropose: Number(delaiPropose),
            dateCandidature: new Date(),
            statut: 'En attente'
        };

        publication.candidatures.push(nouvelleCandidature);
        await publication.save();

        // Populate for response
        const updatedPublication = await Publication.findById(id)
            .populate('client', 'nom prenom email')
            .populate('candidatures.candidatId', 'nom prenom email specialite');

        // Send notification email to client
        try {
            const clientEmail = updatedPublication.client.email;
            const emailContent = `
                <h2>Nouvelle candidature reçue</h2>
                <p><strong>Publication:</strong> ${publication.titre}</p>
                <p><strong>Candidat:</strong> ${candidate.nom} ${candidate.prenom}</p>
                <p><strong>Email:</strong> ${candidate.email}</p>
                <p><strong>Prix proposé:</strong> ${prixPropose} TND</p>
                <p><strong>Délai proposé:</strong> ${delaiPropose} jours</p>
                <p><strong>Message:</strong></p>
                <p>${message}</p>
                <br/>
                <p>Connectez-vous à votre tableau de bord pour voir toutes les candidatures.</p>
            `;

            await transporter.sendMail({
                from: process.env.FROM_EMAIL,
                to: clientEmail,
                subject: `Nouvelle candidature pour: ${publication.titre}`,
                html: emailContent
            });
        } catch (emailError) {
            console.error("Email sending failed (non-critical):", emailError);
            // Don't fail the request if email fails
        }

        res.status(201).json({ 
            message: "Application submitted successfully",
            candidature: nouvelleCandidature,
            publication: updatedPublication
        });

    } catch (error) {
        console.error("Error applying to publication:", error);
        res.status(500).json({ error: "An error occurred while applying" });
    }
}

// --- Accept Candidature ---
async function acceptCandidature(req, res) {
    try {
        const { publicationId, candidatureId } = req.params;
        const { clientId } = req.body;

        // Validate IDs
        if (!publicationId.match(/^[0-9a-fA-F]{24}$/) || !candidatureId.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({ error: "Invalid ID format" });
        }

        // Find publication
        const publication = await Publication.findById(publicationId);
        if (!publication) {
            return res.status(404).json({ error: "Publication not found" });
        }

        // Verify client owns this publication
        if (publication.client.toString() !== clientId) {
            return res.status(403).json({ error: "Not authorized to accept candidatures" });
        }

        // Find candidature
        const candidature = publication.candidatures.id(candidatureId);
        if (!candidature) {
            return res.status(404).json({ error: "Candidature not found" });
        }

        // Check if already accepted
        if (publication.candidatureAcceptee) {
            return res.status(400).json({ error: "A candidature has already been accepted" });
        }

        // Update candidature status
        candidature.statut = "Acceptée";
        
        // Update publication
        publication.candidatureAcceptee = candidature.candidatId;
        publication.prixFinal = candidature.prixPropose;
        publication.delaiFinal = candidature.delaiPropose;
        publication.statut = "En cours";

        await publication.save();

        // Populate for response
        const updatedPublication = await Publication.findById(publicationId)
            .populate('client', 'nom prenom email')
            .populate('candidatures.candidatId', 'nom prenom email specialite')
            .populate('candidatureAcceptee', 'nom prenom email');

        // Get accepted candidate info
        const acceptedCandidate = await Utilisateur.findById(candidature.candidatId);

        // Send emails (non-blocking)
        try {
            // Send acceptance email to candidate
            const acceptanceEmail = `
                <h2>🎉 Félicitations!</h2>
                <p>Votre candidature a été acceptée!</p>
                <p><strong>Publication:</strong> ${publication.titre}</p>
                <p><strong>Client:</strong> ${(await Utilisateur.findById(publication.client)).nom}</p>
                <p><strong>Prix accepté:</strong> ${candidature.prixPropose} TND</p>
                <p><strong>Délai accepté:</strong> ${candidature.delaiPropose} jours</p>
                <p>Le client vous contactera bientôt. Bonne chance!</p>
            `;

            await transporter.sendMail({
                from: process.env.FROM_EMAIL,
                to: acceptedCandidate.email,
                subject: `Candidature acceptée: ${publication.titre}`,
                html: acceptanceEmail
            });

            // Send rejection emails to other candidates
            for (const cand of publication.candidatures) {
                if (cand._id.toString() !== candidatureId && cand.statut === 'En attente') {
                    const rejectionEmail = `
                        <h2>Mise à jour de candidature</h2>
                        <p>Malheureusement, votre candidature pour la publication <strong>"${publication.titre}"</strong> n'a pas été sélectionnée.</p>
                        <p>Le client a choisi un autre candidat.</p>
                        <p>Continuez à chercher d'autres opportunités!</p>
                    `;

                    const candidatInfo = await Utilisateur.findById(cand.candidatId);
                    if (candidatInfo && candidatInfo.email) {
                        await transporter.sendMail({
                            from: process.env.FROM_EMAIL,
                            to: candidatInfo.email,
                            subject: `Candidature - ${publication.titre}`,
                            html: rejectionEmail
                        });
                    }

                    cand.statut = "Refusée";
                }
            }

            await publication.save();
        } catch (emailError) {
            console.error("Email sending failed (non-critical):", emailError);
            // Continue even if emails fail
        }

        res.status(200).json({ 
            message: "Candidature accepted successfully",
            publication: updatedPublication
        });

    } catch (error) {
        console.error("Error accepting candidature:", error);
        res.status(500).json({ error: "An error occurred while accepting the candidature" });
    }
}

// --- Get Freelancer Applications ---
async function getFreelanceCandidatures(req, res) {
    try {
        const { freelanceId } = req.params;

        // Validate ID
        if (!freelanceId.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({ error: "Invalid freelance ID format" });
        }

        const publications = await Publication.find({ "candidatures.candidatId": freelanceId })
            .populate('client', 'nom prenom email')
            .populate('candidatures.candidatId', 'nom prenom email specialite');

        const candidatures = [];
        publications.forEach(pub => {
            pub.candidatures.forEach(cand => {
                if (cand.candidatId._id.toString() === freelanceId) {
                    candidatures.push({
                        _id: cand._id,
                        publication: {
                            _id: pub._id,
                            titre: pub.titre,
                            description: pub.description,
                            budget: pub.budget,
                            dateLimite: pub.dateLimite,
                            statut: pub.statut
                        },
                        candidature: cand,
                        client: pub.client
                    });
                }
            });
        });

        res.status(200).json(candidatures);
    } catch (error) {
        console.error("Error fetching candidatures:", error);
        res.status(500).json({ error: "An error occurred while fetching candidatures" });
    }
}

// --- Get Client Publications with Candidatures ---
async function getClientPublications(req, res) {
    try {
        const { clientId } = req.params;

        // Validate ID
        if (!clientId || clientId === 'null' || !clientId.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({ error: "Invalid or missing client ID" });
        }

        const publications = await Publication.find({ client: clientId })
            .populate('client', 'nom prenom email')
            .populate('candidatures.candidatId', 'nom prenom email specialite');

        res.status(200).json(publications);
    } catch (error) {
        console.error("Error fetching publications:", error);
        res.status(500).json({ error: "An error occurred while fetching publications" });
    }
}

// --- Get all publications with filter ---
async function getAllPublications(req, res) {
    try {
        const { status } = req.query;
        
        let filter = {};
        if (status && status !== 'null') {
            filter.statut = status;
        }

        const publications = await Publication.find(filter)
            .populate('client', 'nom prenom email')
            .populate('candidatures.candidatId', 'nom prenom email specialite');

        res.status(200).json(publications);
    } catch (error) {
        console.error("Error fetching publications:", error);
        res.status(500).json({ error: "An error occurred while fetching publications" });
    }
}

// --- Get publication by ID ---
async function getPublicationById(req, res) {
    try {
        const { id } = req.params;

        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({ error: "Invalid publication ID format" });
        }

        const publication = await Publication.findById(id)
            .populate('client', 'nom prenom email')
            .populate('candidatures.candidatId', 'nom prenom email specialite');

        if (!publication) {
            return res.status(404).json({ error: "Publication not found" });
        }

        res.status(200).json(publication);
    } catch (error) {
        console.error("Error fetching publication:", error);
        res.status(500).json({ error: "An error occurred while fetching the publication" });
    }
}

// --- Update Publication ---
async function updatePublication(req, res) {
    try {
        const { id } = req.params;

        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({ error: "Invalid publication ID format" });
        }

        const updatedData = req.body;
        const publication = await Publication.findByIdAndUpdate(id, updatedData, { new: true })
            .populate('client', 'nom prenom email')
            .populate('candidatures.candidatId', 'nom prenom email specialite');

        if (!publication) {
            return res.status(404).json({ error: "Publication not found" });
        }

        res.status(200).json(publication);
    } catch (error) {
        console.error("Error updating publication:", error);
        res.status(500).json({ error: "An error occurred while updating the publication" });
    }
}

// --- Delete Publication ---
async function deletePublication(req, res) {
    try {
        const { id } = req.params;

        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({ error: "Invalid publication ID format" });
        }

        const publication = await Publication.findByIdAndDelete(id);

        if (!publication) {
            return res.status(404).json({ error: "Publication not found" });
        }

        res.status(200).json({ message: "Publication deleted successfully" });
    } catch (error) {
        console.error("Error deleting publication:", error);
        res.status(500).json({ error: "An error occurred while deleting the publication" });
    }
}

module.exports = {
    createPublication,
    applyToPublication,
    acceptCandidature,
    getFreelanceCandidatures,
    getClientPublications,
    getAllPublications,
    getPublicationById,
    updatePublication,
    deletePublication
};