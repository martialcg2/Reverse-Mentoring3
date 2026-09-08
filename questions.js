// Banque de diagnostic : 3 items gradués par famille (Fondamental / Opérationnel / Expertise).
// Les scores des options (0-100) sont agrégés puis POSTés à /me/diagnostic ; le backend calcule les niveaux.
const o = (l, s, dk) => ({ l, s, dk: !!dk });
const Q = (fam, dim, q, options) => ({ fam, dim, q, options });
export const QUESTIONS = [
  Q("CUL", "Fondamental", "Que désigne le terme « FinTech » ?", [o("Une réglementation bancaire", 0), o("Une jeune pousse alliant finance et technologie", 100), o("Un produit d'épargne", 0), o("Je ne sais pas", 0, true)]),
  Q("CUL", "Opérationnel", "L'effet du digital sur votre métier ?", [o("Aucun effet notable", 0), o("Quelques outils en plus", 40), o("De nouveaux usages clients et internes", 70), o("Une transformation des processus, données et relation", 100)]),
  Q("CUL", "Expertise", "Une néobanque sans agence gagne des parts de marché :", [o("Un phénomène passager", 0), o("Une banque en ligne comme une autre", 40), o("Un modèle mobile qui déplace la relation", 70), o("Une rupture de la chaîne de valeur à réévaluer", 100)]),
  Q("COL", "Fondamental", "À quoi sert un espace documentaire partagé (SharePoint) ?", [o("Envoyer des SMS", 0), o("Stocker et partager des documents en équipe", 100), o("Calculer des taux", 0), o("Je ne sais pas", 0, true)]),
  Q("COL", "Opérationnel", "Co-rédaction d'une note à 3 sur 2 sites :", [o("Emails et fusion manuelle", 0), o("Lien partagé mais copies téléchargées", 40), o("Co-édition simultanée en ligne", 70), o("Co-édition + versions, commentaires, droits", 100)]),
  Q("COL", "Expertise", "Faire collaborer 8 agences sur un projet transverse :", [o("Réunions présentielles uniquement", 0), o("Un fil d'emails collectif", 40), o("Un espace partagé + visios", 70), o("Un espace structuré : rôles, rituels, suivi", 100)]),
  Q("DAT", "Fondamental", "Une donnée « de qualité », c'est :", [o("Une donnée récente", 0), o("Une donnée exacte, complète et cohérente", 100), o("Une donnée chiffrée", 0), o("Je ne sais pas", 0, true)]),
  Q("DAT", "Opérationnel", "Justifier une décision par les données :", [o("Mon intuition", 0), o("Un chiffre isolé", 40), o("Un indicateur pertinent et sa tendance", 70), o("Plusieurs indicateurs croisés, avec les limites", 100)]),
  Q("DAT", "Expertise", "Un tableau de bord montre une anomalie :", [o("Je transmets sans commentaire", 0), o("Je signale sans expliquer", 40), o("Je propose une cause probable", 70), o("J'isole le facteur et propose une action mesurable", 100)]),
  Q("CLI", "Fondamental", "L'« omnicanal » consiste à :", [o("Vendre en agence uniquement", 0), o("Offrir une expérience cohérente sur tous les canaux", 100), o("Un logiciel de caisse", 0), o("Je ne sais pas", 0, true)]),
  Q("CLI", "Opérationnel", "Un client bloque sur son parcours mobile :", [o("Je l'envoie en agence", 0), o("Je fais à sa place", 40), o("Je le guide pas à pas", 70), o("Je le guide et je note le point de friction", 100)]),
  Q("CLI", "Expertise", "Abandon récurrent à la vérification d'identité en ligne :", [o("On demande de venir en agence", 0), o("On refait au cas par cas", 40), o("On identifie le point de friction", 70), o("On corrige le parcours et on mesure la conversion", 100)]),
  Q("CYB", "Fondamental", "L'authentification multifacteur (MFA) :", [o("Un mot de passe long", 0), o("Une vérification par plusieurs preuves d'identité", 100), o("Un antivirus", 0), o("Je ne sais pas", 0, true)]),
  Q("CYB", "Opérationnel", "Partager son mot de passe en urgence :", [o("Acceptable si urgent", 0), o("Acceptable si oral", 40), o("À éviter", 70), o("Jamais, quelle que soit l'urgence", 100)]),
  Q("CYB", "Expertise", "Email « URGENT : confirmez vos identifiants » :", [o("Je clique pour vérifier", 0), o("Je transfère pour avis", 40), o("Je supprime", 70), o("Je ne clique pas, je signale le phishing", 100)]),
  Q("IA", "Fondamental", "Une IA générative :", [o("Un moteur de recherche", 0), o("Un système qui produit du contenu depuis des consignes", 100), o("Un tableur", 0), o("Je ne sais pas", 0, true)]),
  Q("IA", "Opérationnel", "Préparer une synthèse client avec une IA :", [o("Je n'en vois pas l'intérêt", 0), o("« Fais un résumé »", 40), o("Un prompt avec contexte et format", 70), o("Prompt structuré + relecture critique", 100)]),
  Q("IA", "Expertise", "Un collègue colle des données clients dans une IA publique :", [o("Je l'encourage", 0), o("Je ne réagis pas", 40), o("Je le mets en garde", 70), o("Je propose une alternative conforme et j'explique le risque", 100)]),
  Q("DBK", "Fondamental", "L'Open Banking permet :", [o("Ouvrir un compte sans pièce", 0), o("Partager des données bancaires avec des tiers autorisés", 100), o("Supprimer les frais", 0), o("Je ne sais pas", 0, true)]),
  Q("DBK", "Opérationnel", "Une API, c'est :", [o("Je ne sais pas", 0, true), o("Un site web", 40), o("Un moyen d'échanger des données entre systèmes", 70), o("Un contrat d'échange automatisé, sécurisé, versionné", 100)]),
  Q("DBK", "Expertise", "Un partenaire propose une connexion via API :", [o("Je ne sais pas gérer", 0), o("J'accepte sans conditions", 40), o("Je comprends le partage encadré", 70), o("J'évalue valeur, sécurité et cadre réglementaire", 100)]),
  Q("PRO", "Fondamental", "« RPA » signifie :", [o("Un robot physique", 0), o("L'automatisation logicielle de tâches répétitives", 100), o("Un réseau privé", 0), o("Je ne sais pas", 0, true)]),
  Q("PRO", "Opérationnel", "Améliorer un processus de réclamations :", [o("Garder l'existant", 0), o("Supprimer des étapes au hasard", 40), o("Repérer les étapes automatisables", 70), o("Cartographier, mesurer et proposer un workflow", 100)]),
  Q("PRO", "Expertise", "Une ouverture de dossier repose sur du papier :", [o("Je suis la procédure", 0), o("Je fais avec", 40), o("Je repère le dématérialisable", 70), o("Je cartographie et propose un workflow mesurable", 100)]),
];
