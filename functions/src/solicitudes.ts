
import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import admin from 'firebase-admin';
import cors from 'cors';
import express from 'express';

// Ensure Firebase Admin SDK is initialized
if (admin.apps.length === 0) {
  admin.initializeApp();
}

// Lazy initialization for Firestore
let db: admin.firestore.Firestore;
function getDb() {
  if (!db) {
    db = admin.firestore();
  }
  return db;
}

const corsOptions = {
  origin: [
    "http://localhost:3002",
    "https://clubzenith.web.app",
    "https://clubzenith-efa8b.web.app"
  ],
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

const solicitarCambioApp = express();
solicitarCambioApp.use(cors(corsOptions));
solicitarCambioApp.options("*", cors(corsOptions));

solicitarCambioApp.post('/', async (req, res) => {
    if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
        logger.error("solicitarCambioGrupoFamiliar error: No authorization token found.");
        res.status(403).send({ error: 'Unauthorized', message: 'La operación requiere autenticación.' });
        return;
    }
    const idToken = req.headers.authorization.split('Bearer ')[1];
    let decodedToken;
    try {
        decodedToken = await admin.auth().verifyIdToken(idToken);
    } catch (error) {
        logger.error('solicitarCambioGrupoFamiliar error: Error verifying ID token:', error);
        res.status(403).send({ error: 'Unauthorized', message: 'Token de autenticación inválido.' });
        return;
    }
    const uid = decodedToken.uid;

    const cambiosData = req.body.data?.cambiosData;
    if (!cambiosData) {
        logger.error(`solicitarCambioGrupoFamiliar error: Missing cambiosData for user ${uid}.`);
        res.status(400).send({ error: 'invalid-argument', message: 'Faltan los datos de los cambios.' });
        return;
    }

    if (!Array.isArray(cambiosData)) {
      res.status(400).send({ 
        error: 'invalid-argument', 
        message: 'cambiosData debe ser un array de familiares.' 
      });
      return;
    }

    // Validar estructura básica de cada familiar
    for (const familiar of cambiosData) {
      if (!familiar.nombre || !familiar.apellido || !familiar.dni || !familiar.relacion) {
        res.status(400).send({ 
          error: 'invalid-argument', 
          message: 'Cada familiar debe tener nombre, apellido, dni y relación.' 
        });
        return;
      }
    }

    try {
        logger.log(`User ${uid} is requesting a family group change.`);
        const socioRef = getDb().collection("socios").doc(uid);

        const dataToUpdate = {
            cambiosPendientesFamiliares: cambiosData, // Renombrado
            estadoCambioFamiliares: 'Pendiente',       // Renombrado
            motivoRechazoFamiliares: null        // Renombrado
        };

        await socioRef.update(dataToUpdate);

        logger.log(`Successfully submitted family group change request for user: ${uid}`);
        res.status(200).json({ success: true, message: "Solicitud de cambio enviada correctamente." });

    } catch (error) {
        logger.error(`Error submitting family group change for user ${uid}:`, error);
        res.status(500).send({ error: 'internal', message: 'Ocurrió un error al enviar la solicitud.' });
    }
});

export const solicitarCambioGrupoFamiliar = onRequest({ region: "us-central1", invoker: 'public' }, solicitarCambioApp);
