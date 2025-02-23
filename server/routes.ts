import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertClientSchema, insertAppointmentSchema, insertUserSchema, insertTeamSchema } from "@shared/schema";
import PDFDocument from "pdfkit";
import { scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

function parseId(id: string): number | null {
  const parsed = parseInt(id, 10);
  return isNaN(parsed) ? null : parsed;
}

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(null, false);
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // User management routes
  app.post("/api/users", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "admin") return res.sendStatus(403);

    const userData = insertUserSchema.parse({
      ...req.body,
      createdBy: req.user.id,
    });
    const user = await storage.createUser(userData);
    res.status(201).json(user);
  });

  app.get("/api/users", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "admin") return res.sendStatus(403);

    const users = await storage.getAllUsers();
    res.json(users);
  });

  app.post("/api/users/change-password", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "admin") return res.sendStatus(403);

    const { currentPassword, newPassword } = req.body;
    const user = await storage.getUser(req.user.id);

    if (!user || !(await comparePasswords(currentPassword, user.password))) {
      return res.status(400).send("Current password is incorrect");
    }

    await storage.updateUserPassword(user.id, newPassword);
    res.json({ message: "Password updated successfully" });
  });

  // Team management routes
  app.post("/api/teams", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "admin") return res.sendStatus(403);

    const teamData = insertTeamSchema.parse({
      ...req.body,
      createdBy: req.user.id,
    });
    const team = await storage.createTeam(teamData);
    res.status(201).json(team);
  });

  app.get("/api/teams", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "admin") return res.sendStatus(403);

    const teams = await storage.getAllTeams();
    res.json(teams);
  });

  app.get("/api/teams/:id/members", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "admin") return res.sendStatus(403);

    const id = parseId(req.params.id);
    if (id === null) return res.status(400).send("Invalid team ID");

    const members = await storage.getTeamMembers(id);
    res.json(members);
  });

  app.post("/api/teams/members", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "admin") return res.sendStatus(403);

    const { teamId, userId } = req.body;

    // teamId of 0 means remove from current team
    if (teamId === 0) {
      await storage.removeTeamMember(teamId, userId);
      res.json({ message: "Member removed from team" });
      return;
    }

    const teamMember = await storage.addTeamMember({
      teamId,
      userId,
      addedBy: req.user.id,
    });

    // Update the user's team
    await storage.updateUserTeam(userId, teamId);

    res.status(201).json(teamMember);
  });

  // Client routes
  app.post("/api/clients", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "collector") return res.sendStatus(403);

    const clientData = insertClientSchema.parse(req.body);
    const client = await storage.createClient(clientData);
    res.status(201).json(client);
  });

  app.get("/api/clients", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const clients = await storage.getAllClients();
    res.json(clients);
  });

  app.get("/api/clients/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const id = parseId(req.params.id);
    if (id === null) return res.status(400).send("Invalid ID");

    const client = await storage.getClient(id);
    if (!client) return res.sendStatus(404);
    res.json(client);
  });

  // Appointment routes
  app.post("/api/appointments", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "collector") return res.sendStatus(403);

    const appointmentData = insertAppointmentSchema.parse({
      ...req.body,
      collectedBy: req.user.id,
      status: "pending",
      createdAt: new Date().toISOString(),
    });

    const appointment = await storage.createAppointment(appointmentData);
    res.status(201).json(appointment);
  });

  app.patch("/api/appointments/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "approver") return res.sendStatus(403);

    const id = parseId(req.params.id);
    if (id === null) return res.status(400).send("Invalid ID");

    const appointment = await storage.getAppointment(id);
    if (!appointment) return res.sendStatus(404);

    const updated = await storage.updateAppointment(id, {
      ...appointment,
      ...req.body,
      approvedBy: req.user.id,
      status: "approved",
    });

    res.json(updated);
  });

  app.post("/api/appointments/:id/pdf", upload.single('pdf'), async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user.role !== "approver") return res.sendStatus(403);

    const id = parseId(req.params.id);
    if (id === null) return res.status(400).send("Invalid ID");

    const appointment = await storage.getAppointment(id);
    if (!appointment) return res.sendStatus(404);

    if (!req.file) {
      return res.status(400).send("No PDF file uploaded");
    }

    const pdfUrl = `/api/appointments/${id}/download-pdf`;
    await storage.storePdf(id, req.file.buffer);

    const updated = await storage.updateAppointment(id, {
      ...appointment,
      pdfUrl,
    });

    res.json(updated);
  });

  app.get("/api/appointments/:id/download-pdf", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const id = parseId(req.params.id);
    if (id === null) return res.status(400).send("Invalid ID");

    const appointment = await storage.getAppointment(id);
    if (!appointment) return res.sendStatus(404);

    const pdfContent = await storage.getPdf(id);
    if (!pdfContent) return res.sendStatus(404);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=appointment-${id}.pdf`);
    res.send(pdfContent);
  });

  app.get("/api/appointments", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const appointments = await storage.getAllAppointments();
    res.json(appointments);
  });

  app.get("/api/appointments/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const id = parseId(req.params.id);
    if (id === null) return res.status(400).send("Invalid ID");

    const appointment = await storage.getAppointment(id);
    if (!appointment) return res.sendStatus(404);
    res.json(appointment);
  });

  app.get("/api/appointments/:id/pdf", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const id = parseId(req.params.id);
    if (id === null) return res.status(400).send("Invalid ID");

    const appointment = await storage.getAppointment(id);
    if (!appointment) return res.sendStatus(404);

    const client = await storage.getClient(appointment.clientId);
    if (!client) return res.sendStatus(404);

    const doc = new PDFDocument();

    // Generate PDF content
    doc.fontSize(25).text('Appointment Details', { align: 'center' });
    doc.moveDown();
    doc.fontSize(14);
    doc.text(`Client: ${client.fullName}`);
    doc.text(`Passport Number: ${client.passportNumber}`);
    doc.text(`National ID: ${client.nationalId}`);
    doc.text(`Status: ${appointment.status}`);
    doc.text(`Booking Details: ${JSON.stringify(appointment.bookingDetails, null, 2)}`);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=appointment-${appointment.id}.pdf`);

    doc.pipe(res);
    doc.end();
  });


  const httpServer = createServer(app);
  return httpServer;
}