"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processFamiliarRequests = exports.deleteSocioAccount = exports.registrarAccesoPersona = exports.searchSocio = exports.solicitarCambioGrupoFamiliar = exports.getNextSocioNumber = exports.createSocioProfile = exports.registrarIngreso = exports.backfillAlgolia = exports.onInvitadoWrite = exports.onSocioWrite = void 0;
// =================================================================
// IMPORTS
// =================================================================
const firestore_1 = require("firebase-functions/v2/firestore");
const https_1 = require("firebase-functions/v2/https");
const logger = __importStar(require("firebase-functions/logger"));
const cors_1 = __importDefault(require("cors"));
const admin = __importStar(require("firebase-admin"));
// Internal services for lazy initialization
const services_1 = require("./services");
// =================================================================
// ALOGLIA SYNC HELPERS
// =================================================================
const extractCommonData = (person) => {
    return {
        nombre: person.nombre || "",
        apellido: person.apellido || "",
        nombreCompleto: `${person.nombre || ""} ${person.apellido || ""}`.trim(),
        dni: person.dni || "",
        fechaNacimiento: person.fechaNacimiento || "",
        fotoUrl: person.fotoUrl || person.fotoPerfil || "",
        aptoMedico: person.aptoMedico,
    };
};
// =================================================================
// ALOGLIA SYNC FIRESTORE TRIGGERS
// =================================================================
exports.onSocioWrite = (0, firestore_1.onDocumentWritten)({
    document: "socios/{socioId}",
    region: "us-central1"
}, async (event) => {
    const index = (0, services_1.getAlgoliaIndex)();
    const socioId = event.params.socioId;
    if (!event.data) {
        logger.log("No data associated with the event, skipping.");
        return;
    }
    // Handle DELETE
    if (!event.data.after.exists) {
        const socioDeleted = event.data.before.data();
        if (!socioDeleted)
            return;
        const objectIDsToDelete = [socioId];
        if (socioDeleted.adherentes) {
            socioDeleted.adherentes.forEach((adh) => {
                if (adh.dni)
                    objectIDsToDelete.push(`${socioId}-${adh.dni}`);
            });
        }
        if (socioDeleted.familiares) { // Corrected from grupoFamiliar
            socioDeleted.familiares.forEach((fam) => {
                if (fam.dni)
                    objectIDsToDelete.push(`${socioId}-${fam.dni}`);
            });
        }
        try {
            await index.deleteObjects(objectIDsToDelete);
            logger.log(`Algolia: Deleted ${objectIDsToDelete.length} records for socioId: ${socioId}`);
        }
        catch (error) {
            logger.error(`Error deleting objects from Algolia for socioId: ${socioId}`, error);
        }
        return;
    }
    // Handle CREATE / UPDATE
    const socioData = event.data.after.data();
    if (!socioData)
        return;
    const records = [];
    records.push(Object.assign({ objectID: socioId, type: "Socio Titular", numeroSocio: socioData.numeroSocio || "" }, extractCommonData(socioData)));
    if (socioData.adherentes) {
        socioData.adherentes.forEach((adherente) => {
            if (!adherente.dni)
                return;
            records.push(Object.assign({ objectID: `${socioId}-${adherente.dni}`, type: "Adherente", socioTitularId: socioId, socioTitularNombre: `${socioData.nombre} ${socioData.apellido}`.trim() }, extractCommonData(adherente)));
        });
    }
    if (socioData.familiares) { // Corrected from grupoFamiliar
        socioData.familiares.forEach((familiar) => {
            if (!familiar.dni)
                return;
            records.push(Object.assign({ objectID: `${socioId}-${familiar.dni}`, type: "Familiar", socioTitularId: socioId, socioTitularNombre: `${socioData.nombre} ${socioData.apellido}`.trim() }, extractCommonData(familiar)));
        });
    }
    try {
        await index.saveObjects(records);
        logger.log(`Algolia: Synced ${records.length} records for socioId: ${socioId}`);
    }
    catch (error) {
        logger.error(`Error saving objects to Algolia for socioId: ${socioId}`, error);
    }
});
exports.onInvitadoWrite = (0, firestore_1.onDocumentWritten)({
    document: "solicitudesInvitadosDiarios/{solicitudId}",
    region: "us-central1"
}, async (event) => {
    const index = (0, services_1.getAlgoliaIndex)();
    const solicitudId = event.params.solicitudId;
    if (!event.data) {
        logger.log("No data associated with the event for onInvitadoWrite, skipping.");
        return;
    }
    // Handle DELETE
    if (!event.data.after.exists) {
        const solicitudDeleted = event.data.before.data();
        if (!solicitudDeleted || !solicitudDeleted.listaInvitadosDiarios)
            return;
        const objectIDsToDelete = solicitudDeleted.listaInvitadosDiarios.map((inv) => `${solicitudDeleted.idSocioTitular}-${inv.dni}-${solicitudDeleted.fecha}`);
        try {
            await index.deleteObjects(objectIDsToDelete);
            logger.log(`Algolia: Deleted ${objectIDsToDelete.length} guest records for solicitudId: ${solicitudId}`);
        }
        catch (error) {
            logger.error(`Error deleting guest objects from Algolia for solicitudId: ${solicitudId}`, error);
        }
        return;
    }
    // Handle CREATE / UPDATE
    const solicitudData = event.data.after.data();
    if (!solicitudData || !solicitudData.listaInvitadosDiarios)
        return;
    const socioTitularSnapshot = await (0, services_1.getDb)().collection('socios').doc(solicitudData.idSocioTitular).get();
    const socioTitularData = socioTitularSnapshot.data();
    const socioTitularNombre = socioTitularData ? `${socioTitularData.nombre} ${socioTitularData.apellido}`.trim() : "N/A";
    const records = solicitudData.listaInvitadosDiarios.map((invitado) => {
        if (!invitado.dni)
            return null;
        return Object.assign({ objectID: `${solicitudData.idSocioTitular}-${invitado.dni}-${solicitudData.fecha}`, type: "Invitado Diario", socioTitularId: solicitudData.idSocioTitular, socioTitularNombre: socioTitularNombre, fechaVisita: solicitudData.fecha }, extractCommonData(invitado));
    }).filter((p) => p !== null);
    if (records.length > 0) {
        try {
            await index.saveObjects(records);
            logger.log(`Algolia: Synced ${records.length} guest records for solicitudId: ${solicitudId}`);
        }
        catch (error) {
            logger.error(`Error saving guest objects to Algolia for solicitudId: ${solicitudId}`, error);
        }
    }
});
// =================================================================
// HTTP REQUEST FUNCTIONS (REFACTORED FOR LAZY INIT)
// =================================================================
const corsHandler = (0, cors_1.default)({ origin: true });
exports.backfillAlgolia = (0, https_1.onRequest)({ region: "us-central1" }, (req, res) => {
    corsHandler(req, res, async () => {
        var _a;
        logger.log("backfillAlgolia function invoked.");
        // 1. Authentication
        if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
            logger.error("No authorization token found.");
            res.status(403).send('Unauthorized');
            return;
        }
        const idToken = req.headers.authorization.split('Bearer ')[1];
        let decodedToken;
        try {
            decodedToken = await (0, services_1.getAuth)().verifyIdToken(idToken);
        }
        catch (error) {
            logger.error('Error verifying ID token:', error);
            res.status(403).send('Unauthorized');
            return;
        }
        const uid = decodedToken.uid;
        // 2. Authorization
        try {
            const adminUserDoc = await (0, services_1.getDb)().collection("adminUsers").doc(uid).get();
            if (!adminUserDoc.exists || ((_a = adminUserDoc.data()) === null || _a === void 0 ? void 0 : _a.role) !== 'admin') {
                logger.error(`Permission denied for user ${uid}. Not an admin.`);
                res.status(403).send('Permission Denied');
                return;
            }
            logger.log(`Backfill requested by admin user: ${uid}`);
        }
        catch (error) {
            logger.error(`Error checking admin status for user ${uid}:`, error);
            res.status(500).send('Internal Server Error');
            return;
        }
        // 3. Business Logic
        try {
            const index = (0, services_1.getAlgoliaIndex)();
            const records = [];
            // Backfill Socios, Familiares, Adherentes
            const sociosSnapshot = await (0, services_1.getDb)().collection("socios").get();
            logger.log(`Found ${sociosSnapshot.size} socios in Firestore.`);
            for (const doc of sociosSnapshot.docs) {
                const socioId = doc.id;
                const socioData = doc.data();
                records.push(Object.assign({ objectID: socioId, type: "Socio Titular", numeroSocio: socioData.numeroSocio || "" }, extractCommonData(socioData)));
                if (socioData.adherentes) {
                    socioData.adherentes.forEach((adherente) => {
                        if (!adherente.dni)
                            return;
                        records.push(Object.assign({ objectID: `${socioId}-${adherente.dni}`, type: "Adherente", socioTitularId: socioId, socioTitularNombre: `${socioData.nombre} ${socioData.apellido}`.trim() }, extractCommonData(adherente)));
                    });
                }
                if (socioData.familiares) { // Corrected
                    socioData.familiares.forEach((familiar) => {
                        if (!familiar.dni)
                            return;
                        records.push(Object.assign({ objectID: `${socioId}-${familiar.dni}`, type: "Familiar", socioTitularId: socioId, socioTitularNombre: `${socioData.nombre} ${socioData.apellido}`.trim() }, extractCommonData(familiar)));
                    });
                }
            }
            // Backfill Invitados Diarios
            const solicitudesSnapshot = await (0, services_1.getDb)().collection("solicitudesInvitadosDiarios").get();
            logger.log(`Found ${solicitudesSnapshot.size} solicitudes de invitados in Firestore.`);
            const socioNameCache = new Map();
            for (const doc of solicitudesSnapshot.docs) {
                const solicitudData = doc.data();
                if (!solicitudData.listaInvitadosDiarios || !solicitudData.idSocioTitular)
                    continue;
                let socioTitularNombre = socioNameCache.get(solicitudData.idSocioTitular);
                if (!socioTitularNombre) {
                    const socioTitularSnapshot = await (0, services_1.getDb)().collection('socios').doc(solicitudData.idSocioTitular).get();
                    const socioTitularData = socioTitularSnapshot.data();
                    socioTitularNombre = socioTitularData ? `${socioTitularData.nombre} ${socioTitularData.apellido}`.trim() : "N/A";
                    socioNameCache.set(solicitudData.idSocioTitular, socioTitularNombre);
                }
                solicitudData.listaInvitadosDiarios.forEach((invitado) => {
                    if (!invitado.dni)
                        return;
                    records.push(Object.assign({ objectID: `${solicitudData.idSocioTitular}-${invitado.dni}-${solicitudData.fecha}`, type: "Invitado Diario", socioTitularId: solicitudData.idSocioTitular, socioTitularNombre: socioTitularNombre, fechaVisita: solicitudData.fecha }, extractCommonData(invitado)));
                });
            }
            // Final Sync to Algolia
            if (records.length > 0) {
                await index.clearObjects(); // Clear the index before backfilling
                logger.log("Algolia index cleared successfully.");
                await index.saveObjects(records);
                const successMessage = `✅ Backfill complete! ${records.length} records synced to Algolia.`;
                logger.log(successMessage);
                res.status(200).json({ success: true, message: successMessage, count: records.length });
            }
            else {
                const message = "No records found to backfill.";
                logger.log(message);
                res.status(200).json({ success: true, message: message, count: 0 });
            }
        }
        catch (error) {
            logger.error("\n❌ An error occurred during the Algolia upload:", error);
            res.status(500).send('An error occurred during the Algolia upload.');
        }
    });
});
exports.registrarIngreso = (0, https_1.onRequest)({ region: "us-central1" }, (req, res) => {
    corsHandler(req, res, async () => {
        if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
            res.status(403).send('Unauthorized');
            return;
        }
        const idToken = req.headers.authorization.split('Bearer ')[1];
        try {
            await (0, services_1.getAuth)().verifyIdToken(idToken);
        }
        catch (error) {
            logger.error('Error verifying ID token:', error);
            res.status(403).send('Unauthorized');
            return;
        }
        const tipo = req.body.data.tipo;
        const validTypes = ["titular", "familiar", "adherente", "invitadoDiario", "invitadoCumpleanos"];
        if (!tipo || !validTypes.includes(tipo)) {
            res.status(400).send('El tipo de ingreso no es válido.');
            return;
        }
        const todayISO = new Date().toISOString().split('T')[0];
        const docRef = (0, services_1.getDb)().collection("estadisticasIngresos").doc(todayISO);
        try {
            await (0, services_1.getDb)().runTransaction(async (transaction) => {
                var _a, _b;
                const doc = await transaction.get(docRef);
                if (!doc.exists) {
                    transaction.set(docRef, {
                        fecha: todayISO,
                        totalIngresos: 1,
                        desglose: { [tipo]: 1 },
                    });
                }
                else {
                    const newTotal = (((_a = doc.data()) === null || _a === void 0 ? void 0 : _a.totalIngresos) || 0) + 1;
                    const newDesgloseValue = (((_b = doc.data()) === null || _b === void 0 ? void 0 : _b.desglose[tipo]) || 0) + 1;
                    transaction.update(docRef, { totalIngresos: newTotal, [`desglose.${tipo}`]: newDesgloseValue });
                }
            });
            res.status(200).json({ success: true });
        }
        catch (error) {
            logger.error("Error en registrarIngreso:", error);
            res.status(500).send('Error al registrar el ingreso.');
        }
    });
});
// =================================================================
// CALLABLE FUNCTIONS
// =================================================================
exports.createSocioProfile = (0, https_1.onCall)({ cors: ["http://localhost:3002", "https://clubzenith.web.app", "https://mazallegro.com"], region: "us-central1" }, async (request) => {
    var _a;
    const uid = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid;
    const socioData = request.data.socioData;
    logger.log('socioData recibido:', JSON.stringify(socioData));
    logger.log('fechaNacimiento recibido:', socioData.fechaNacimiento);
    logger.log('fechaNacimiento tipo:', typeof socioData.fechaNacimiento);
    if (!uid) {
        logger.error("createSocioProfile error: User is not authenticated.");
        throw new https_1.HttpsError("unauthenticated", "La operación requiere autenticación.");
    }
    if (!socioData) {
        logger.error(`createSocioProfile error: Missing socioData for user ${uid}.`);
        throw new https_1.HttpsError("invalid-argument", "Faltan los datos del socio.");
    }
    if (uid !== socioData.id) {
        logger.error(`createSocioProfile error: Authenticated user ${uid} cannot create data for user ${socioData.id}.`);
        throw new https_1.HttpsError("permission-denied", "No tienes permiso para realizar esta acción.");
    }
    // Convertir fechas serializadas a Timestamps reales de Firestore
    const convertToTimestamp = (field) => {
        if (field && typeof field === 'object' && 'seconds' in field) {
            // Necesitamos una instancia de admin.firestore.Timestamp, no de cliente
            return admin.firestore.Timestamp.fromMillis(field.seconds * 1000);
        }
        return field;
    };
    socioData.fechaNacimiento = convertToTimestamp(socioData.fechaNacimiento);
    socioData.createdAt = convertToTimestamp(socioData.createdAt);
    socioData.updatedAt = convertToTimestamp(socioData.updatedAt);
    socioData.miembroDesde = convertToTimestamp(socioData.miembroDesde);
    try {
        logger.log(`Creating profile for user: ${uid}`);
        await (0, services_1.getDb)().collection("socios").doc(uid).set(socioData);
        logger.log(`Successfully created document in 'socios' for user: ${uid}`);
        await (0, services_1.getDb)().collection("adminUsers").doc(uid).set({
            role: 'socio',
            nombre: socioData.nombre,
            apellido: socioData.apellido,
            email: socioData.email,
            uid: uid,
        });
        logger.log(`Successfully created document in 'adminUsers' for user: ${uid}`);
        return { success: true, message: `Socio profile created for ${uid}` };
    }
    catch (error) {
        logger.error(`Error creating socio profile for user ${uid}:`, error);
        throw new https_1.HttpsError("internal", "Ocurrió un error al crear el perfil del socio.");
    }
});
exports.getNextSocioNumber = (0, https_1.onCall)({ cors: true, region: "us-central1" }, async (request) => {
    const counterRef = (0, services_1.getDb)().collection('counters').doc('socioNumber');
    const initialSocioNumber = 10000;
    try {
        const nextNumber = await (0, services_1.getDb)().runTransaction(async (transaction) => {
            var _a;
            const doc = await transaction.get(counterRef);
            let currentNumber;
            if (!doc.exists) {
                currentNumber = initialSocioNumber;
                transaction.set(counterRef, { lastNumber: currentNumber });
            }
            else {
                const lastNumber = (_a = doc.data()) === null || _a === void 0 ? void 0 : _a.lastNumber;
                currentNumber = (typeof lastNumber === 'number' ? lastNumber : initialSocioNumber - 1) + 1;
                transaction.update(counterRef, { lastNumber: currentNumber });
            }
            return currentNumber;
        });
        return { numeroSocio: nextNumber.toString() };
    }
    catch (error) {
        logger.error("Error generating next socio number:", error);
        throw new https_1.HttpsError('internal', 'Unable to generate a new socio number.');
    }
});
// Helper to compare dates loosely (Timestamp vs String vs Date)
const areDatesEqual = (d1, d2) => {
    if (!d1 && !d2)
        return true;
    if (!d1 || !d2)
        return false;
    const getDate = (d) => {
        if ((d === null || d === void 0 ? void 0 : d.toDate) && typeof d.toDate === 'function')
            return d.toDate(); // Firestore Timestamp
        if (d instanceof Date)
            return d;
        return new Date(d);
    };
    const date1 = getDate(d1);
    const date2 = getDate(d2);
    return date1.getTime() === date2.getTime();
};
const normalizeString = (s) => (s || "").toString().trim();
const isSemanticallyEqual = (obj1, obj2) => {
    const fieldsToCheck = ['nombre', 'apellido', 'dni', 'relacion', 'email', 'telefono', 'direccion'];
    for (const field of fieldsToCheck) {
        if (normalizeString(obj1[field]) !== normalizeString(obj2[field])) {
            return false;
        }
    }
    if (!areDatesEqual(obj1.fechaNacimiento, obj2.fechaNacimiento)) {
        return false;
    }
    return true;
};
exports.solicitarCambioGrupoFamiliar = (0, https_1.onCall)({ region: "us-central1", cors: true }, async (request) => {
    try {
        if (!request.auth) {
            throw new https_1.HttpsError("unauthenticated", "El usuario debe estar autenticado.");
        }
        const uid = request.auth.uid;
        const { cambiosData } = request.data;
        if (!cambiosData || !Array.isArray(cambiosData)) {
            throw new https_1.HttpsError("invalid-argument", "Faltan los datos de los cambios o el formato es incorrecto.");
        }
        const db = (0, services_1.getDb)();
        const socioRef = db.collection("socios").doc(uid);
        const solicitudsRef = db.collection("solicitudesCambioFoto");
        await db.runTransaction(async (transaction) => {
            const socioDoc = await transaction.get(socioRef);
            if (!socioDoc.exists) {
                throw new https_1.HttpsError("not-found", "Socio no encontrado.");
            }
            const socioData = socioDoc.data();
            const actuales = socioData.familiares || [];
            const socioNombre = `${socioData.nombre} ${socioData.apellido}`;
            const socioNumero = socioData.numeroSocio || '';
            const finalPendientes = [];
            let hasNonPhotoChanges = false;
            const photoFields = ['fotoPerfil', 'fotoDniFrente', 'fotoDniDorso', 'fotoCarnet'];
            // Process each candidate in the proposed state
            for (const candidato of cambiosData) {
                if (!candidato.nombre || !candidato.apellido || !candidato.dni || !candidato.relacion) {
                    throw new https_1.HttpsError("invalid-argument", "Cada familiar debe tener nombre, apellido, dni y relación.");
                }
                const original = actuales.find((a) => a.id === candidato.id);
                if (original) {
                    // Existing familiar: Check for photo changes
                    let photoChanged = false;
                    for (const field of photoFields) {
                        // Basic strict equality check for URL strings
                        if (candidato[field] !== original[field]) {
                            const newVal = candidato[field];
                            const oldVal = original[field];
                            if (newVal && newVal !== oldVal) {
                                // Create photo change request
                                const newId = solicitudsRef.doc().id;
                                transaction.set(solicitudsRef.doc(newId), {
                                    id: newId,
                                    socioId: uid,
                                    socioNombre,
                                    socioNumero,
                                    tipoPersona: 'Familiar',
                                    familiarId: original.id,
                                    tipoFoto: field,
                                    fotoActualUrl: oldVal || null,
                                    fotoNuevaUrl: newVal,
                                    estado: 'Pendiente',
                                    fechaSolicitud: admin.firestore.Timestamp.now(),
                                });
                                photoChanged = true;
                            }
                        }
                    }
                    if (photoChanged) {
                        logger.info(`Detectados cambios de foto para familiar ${original.id} de socio ${uid}`);
                    }
                    // To determine if there are data changes (non-photo), we use the candidate
                    // but REVERT the photo fields to original to compare data only.
                    const searchCandidate = Object.assign({}, candidato);
                    photoFields.forEach(f => searchCandidate[f] = original[f]);
                    if (!isSemanticallyEqual(searchCandidate, original)) {
                        hasNonPhotoChanges = true;
                        finalPendientes.push(searchCandidate);
                    }
                    else {
                        // If semantically equal (no data changes), use EXACT original object
                        // to avoid false positives in frontend 'isModified' checks due to serialization diffs
                        finalPendientes.push(original);
                    }
                }
                else {
                    // New familiar found
                    finalPendientes.push(candidato);
                    hasNonPhotoChanges = true;
                }
            }
            // Check for deletions: If an item in 'actuales' is NOT in 'cambiosData'
            const deletions = actuales.filter((a) => !cambiosData.some((c) => c.id === a.id));
            if (deletions.length > 0) {
                hasNonPhotoChanges = true;
            }
            const updateData = {
                cambiosPendientesFamiliares: finalPendientes
            };
            if (hasNonPhotoChanges) {
                updateData.estadoCambioFamiliares = "Pendiente";
                updateData.motivoRechazoFamiliares = null;
            }
            else {
                // If only photo changes occurred (or no changes at all), we clear the "Pendiente" flag
                // But we still save finalPendientes which might be mostly originals
                updateData.estadoCambioFamiliares = "Ninguno";
            }
            transaction.update(socioRef, updateData);
        });
        return { success: true, message: "Solicitud enviada correctamente." };
    }
    catch (error) {
        logger.error("Error en solicitarCambioGrupoFamiliar:", error);
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError("internal", "Ocurrió un error al procesar la solicitud.", error.message);
    }
});
exports.searchSocio = (0, https_1.onCall)({ cors: true, region: "us-central1" }, async (request) => {
    var _a;
    logger.info("Iniciando searchSocio para el usuario:", (_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid);
    try {
        const { searchTerm } = request.data;
        if (!request.auth) {
            logger.error("Error de autenticación: la solicitud no tiene 'auth'.");
            throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
        }
        const userDoc = await (0, services_1.getDb)().collection('adminUsers').doc(request.auth.uid).get();
        const userData = userDoc.data();
        logger.info(`Datos de adminUsers para ${request.auth.uid}:`, userData);
        const userRole = userData === null || userData === void 0 ? void 0 : userData.role;
        logger.info(`Rol del usuario extraído: ${userRole}`);
        const allowedRoles = ['admin', 'medico', 'portero'];
        const hasPermission = userData && allowedRoles.includes(userRole);
        logger.info(`Verificación de permisos: ${hasPermission ? 'APROBADA' : 'DENEGADA'}`);
        if (!hasPermission) {
            throw new https_1.HttpsError('permission-denied', `User role '${userRole}' does not have permission to search.`);
        }
        if (!searchTerm) {
            return { results: [] };
        }
        const algoliaIndex = (0, services_1.getAlgoliaIndex)();
        const { hits } = await algoliaIndex.search(searchTerm, { hitsPerPage: 10 });
        logger.info('Búsqueda completada', { uid: request.auth.uid, resultsCount: hits.length });
        return { results: hits };
    }
    catch (error) {
        logger.error('Error en searchSocio:', error);
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError('internal', error.message || 'Search failed');
    }
});
exports.registrarAccesoPersona = (0, https_1.onCall)({ cors: true, region: "us-central1" }, async (request) => {
    var _a;
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "La operación requiere autenticación.");
    }
    const registrarUid = request.auth.uid;
    try {
        const adminUserDoc = await (0, services_1.getDb)().collection("adminUsers").doc(registrarUid).get();
        const userRole = (_a = adminUserDoc.data()) === null || _a === void 0 ? void 0 : _a.role;
        if (!['admin', 'medico', 'portero'].includes(userRole)) {
            throw new https_1.HttpsError("permission-denied", "No tienes permiso para registrar accesos.");
        }
    }
    catch (error) {
        logger.error(`Error checking admin status for user ${registrarUid}:`, error);
        throw new https_1.HttpsError("internal", "Error al verificar permisos.");
    }
    const registro = request.data;
    if (!registro || !registro.personaId || !registro.tipoRegistro) {
        throw new https_1.HttpsError("invalid-argument", "Los datos para el registro de acceso son inválidos.");
    }
    try {
        const newRegistroRef = (0, services_1.getDb)().collection("registros_acceso").doc();
        await newRegistroRef.set({
            id: newRegistroRef.id,
            personaId: registro.personaId,
            nombre: registro.nombre,
            dni: registro.dni,
            tipoPersona: registro.tipoPersona,
            timestamp: registro.timestamp, // Should be a Timestamp object from the client
            tipoRegistro: registro.tipoRegistro, // 'entrada' or 'salida'
            registradoPor: registrarUid,
            registradoPorNombre: registro.registradoPorNombre,
        });
        logger.log(`Acceso registrado exitosamente por ${registrarUid}`, { registroId: newRegistroRef.id, personaId: registro.personaId });
        return { success: true, message: "Registro de acceso exitoso.", id: newRegistroRef.id };
    }
    catch (error) {
        logger.error(`Error al guardar el registro de acceso para persona ${registro.personaId}:`, error);
        throw new https_1.HttpsError("internal", "Ocurrió un error al guardar el registro de acceso.");
    }
});
// Note: The 'actualizarSolicitudDiaria' and 'generateOptimizedImages' functions were omitted as they were either complex to refactor on the fly
// without full context or commented out. They can be refactored following the same lazy-loading pattern if needed.
exports.deleteSocioAccount = (0, https_1.onCall)({ region: "us-central1", cors: true }, async (request) => {
    if (!request.auth) {
        logger.error("deleteSocioAccount error: User is not authenticated.");
        throw new https_1.HttpsError("unauthenticated", "La operación requiere autenticación.");
    }
    const uid = request.auth.uid;
    logger.log(`Account deletion requested by user: ${uid}`);
    try {
        // 1. Delete Storage files
        const bucket = (0, services_1.getStorage)().bucket();
        const folderPath = `socios/${uid}/`;
        await bucket.deleteFiles({ prefix: folderPath });
        logger.log(`Successfully deleted storage folder ${folderPath} for user: ${uid}`);
        // 2. Delete Firestore document
        await (0, services_1.getDb)().collection("socios").doc(uid).delete();
        logger.log(`Successfully deleted firestore document for user: ${uid}`);
        // 3. Delete Auth user
        await (0, services_1.getAuth)().deleteUser(uid);
        logger.log(`Successfully deleted auth user: ${uid}`);
        return { success: true, message: "La cuenta ha sido eliminada permanentemente." };
    }
    catch (error) {
        logger.error(`Error deleting account for user ${uid}:`, error);
        throw new https_1.HttpsError("internal", "Ocurrió un error al eliminar la cuenta.");
    }
});
exports.processFamiliarRequests = (0, https_1.onCall)({ region: "us-central1", cors: true, invoker: "public" }, async (request) => {
    var _a;
    // 1. Authentication
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "La operación requiere autenticación.");
    }
    const adminUid = request.auth.uid;
    // 2. Authorization
    try {
        const adminUserDoc = await (0, services_1.getDb)().collection("adminUsers").doc(adminUid).get();
        if (!adminUserDoc.exists || ((_a = adminUserDoc.data()) === null || _a === void 0 ? void 0 : _a.role) !== 'admin') {
            throw new https_1.HttpsError("permission-denied", "No tienes permiso para realizar esta acción.");
        }
    }
    catch (error) {
        logger.error(`Error checking admin status for user ${adminUid}:`, error);
        throw new https_1.HttpsError("internal", "Error al verificar permisos.");
    }
    // 3. Data Validation
    const { socioId, familiaresDecisiones } = request.data;
    if (!socioId || !Array.isArray(familiaresDecisiones)) {
        throw new https_1.HttpsError("invalid-argument", "Faltan datos o el formato es incorrecto.");
    }
    // 4. Business Logic
    const socioRef = (0, services_1.getDb)().collection("socios").doc(socioId);
    try {
        await (0, services_1.getDb)().runTransaction(async (transaction) => {
            const socioDoc = await transaction.get(socioRef);
            if (!socioDoc.exists) {
                throw new https_1.HttpsError("not-found", "No se encontró al socio especificado.");
            }
            const socioData = socioDoc.data();
            let actuales = socioData.familiares || [];
            const aprobados = familiaresDecisiones.filter(f => f.estadoAprobacion === 'aprobado');
            const rechazados = familiaresDecisiones.filter(f => f.estadoAprobacion === 'rechazado');
            // Actualizar familiares actuales con los aprobados
            aprobados.forEach(aprobado => {
                // Limpiar campos de la solicitud
                delete aprobado.estadoAprobacion;
                delete aprobado.motivoRechazo;
                delete aprobado.fechaDecision;
                delete aprobado.decidoPor;
                const index = actuales.findIndex((a) => a.id === aprobado.id);
                if (index > -1) {
                    // Si ya existe, se actualiza (caso de modificación)
                    actuales[index] = aprobado;
                }
                else {
                    // Si no existe, se añade (caso de nuevo familiar)
                    actuales.push(aprobado);
                }
            });
            // Determinar estado final de la solicitud
            let estadoFinal = 'Aprobado';
            if (aprobados.length === 0 && rechazados.length > 0) {
                estadoFinal = 'Rechazado';
            }
            else if (aprobados.length > 0 && rechazados.length > 0) {
                estadoFinal = 'Parcial';
            }
            transaction.update(socioRef, {
                familiares: actuales,
                familiaresRechazados: rechazados, // Guardar los rechazados para que el socio los vea
                estadoCambioFamiliares: estadoFinal,
                cambiosPendientesFamiliares: [], // Limpiar la solicitud
                motivoRechazoFamiliares: null // Limpiar el motivo de rechazo general
            });
        });
        logger.log(`Decisiones de familiares para socio ${socioId} procesadas por admin ${adminUid}.`);
        return { success: true, message: "Las decisiones han sido guardadas correctamente." };
    }
    catch (error) {
        logger.error(`Error processing familiar requests for socio ${socioId}:`, error);
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError("internal", "Ocurrió un error al procesar la solicitud.", error.message);
    }
});
//# sourceMappingURL=index.js.map