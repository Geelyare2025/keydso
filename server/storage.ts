import { User, InsertUser, Client, InsertClient, Appointment, InsertAppointment, Team, InsertTeam, TeamMember, InsertTeamMember } from "@shared/schema";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { users, clients, appointments, teams, teamMembers } from "@shared/schema";

const PostgresSessionStore = connectPg(session);
const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUserPassword(id: number, newPassword: string): Promise<void>;
  updateUserTeam(userId: number, teamId: number | null): Promise<void>;

  // Team operations
  createTeam(team: InsertTeam): Promise<Team>;
  getTeam(id: number): Promise<Team | undefined>;
  getAllTeams(): Promise<Team[]>;
  getTeamMembers(teamId: number): Promise<User[]>;
  addTeamMember(teamMember: InsertTeamMember): Promise<TeamMember>;
  removeTeamMember(teamId: number, userId: number): Promise<void>;

  // Client operations
  createClient(client: InsertClient): Promise<Client>;
  getClient(id: number): Promise<Client | undefined>;
  getAllClients(): Promise<Client[]>;

  // Appointment operations
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateAppointment(id: number, appointment: Partial<Appointment>): Promise<Appointment>;
  getAppointment(id: number): Promise<Appointment | undefined>;
  getAllAppointments(): Promise<Appointment[]>;
  getTeamAppointments(teamId: number): Promise<Appointment[]>;

  // PDF operations
  storePdf(appointmentId: number, pdfBuffer: Buffer): Promise<void>;
  getPdf(appointmentId: number): Promise<Buffer | undefined>;

  // Session store
  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  readonly sessionStore: session.Store;
  private pdfStorage: Map<number, Buffer>;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      conObject: {
        connectionString: process.env.DATABASE_URL,
      },
      createTableIfMissing: true,
    });
    this.pdfStorage = new Map();

    // Create initial admin user
    this.ensureAdminUser();
  }

  private async ensureAdminUser() {
    const adminUser = await this.getUserByUsername("admin");
    if (!adminUser) {
      await this.createUser({
        username: "admin",
        password: "admin123",
        role: "admin",
      });
    }
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const hashedPassword = await hashPassword(insertUser.password);
    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        password: hashedPassword,
      })
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async updateUserPassword(id: number, newPassword: string): Promise<void> {
    const hashedPassword = await hashPassword(newPassword);
    await db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, id));
  }

  async updateUserTeam(userId: number, teamId: number | null): Promise<void> {
    await db
      .update(users)
      .set({ teamId })
      .where(eq(users.id, userId));
  }

  // Team operations
  async createTeam(insertTeam: InsertTeam): Promise<Team> {
    const [team] = await db
      .insert(teams)
      .values([insertTeam])
      .returning();
    return team;
  }

  async getTeam(id: number): Promise<Team | undefined> {
    if (!Number.isInteger(id) || id < 1) return undefined;
    const [team] = await db.select().from(teams).where(eq(teams.id, id));
    return team;
  }

  async getAllTeams(): Promise<Team[]> {
    return await db.select().from(teams);
  }

  async getTeamMembers(teamId: number): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(eq(users.teamId, teamId));
  }

  async addTeamMember(insertTeamMember: InsertTeamMember): Promise<TeamMember> {
    const [teamMember] = await db
      .insert(teamMembers)
      .values([insertTeamMember])
      .returning();
    return teamMember;
  }

  async removeTeamMember(teamId: number, userId: number): Promise<void> {
    await this.updateUserTeam(userId, null);
  }

  // Client operations
  async createClient(insertClient: InsertClient): Promise<Client> {
    const [client] = await db
      .insert(clients)
      .values([insertClient])
      .returning();
    return client;
  }

  async getClient(id: number): Promise<Client | undefined> {
    if (!Number.isInteger(id) || id < 1) return undefined;

    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client;
  }

  async getAllClients(): Promise<Client[]> {
    return await db.select().from(clients);
  }

  // Appointment operations
  async createAppointment(insertAppointment: InsertAppointment): Promise<Appointment> {
    const [appointment] = await db
      .insert(appointments)
      .values([{
        ...insertAppointment,
        bookingDetails: { date: new Date().toISOString() },
      }])
      .returning();
    return appointment;
  }

  async updateAppointment(id: number, update: Partial<Appointment>): Promise<Appointment> {
    if (!Number.isInteger(id) || id < 1) {
      throw new Error("Invalid appointment ID");
    }

    const [updated] = await db
      .update(appointments)
      .set(update)
      .where(eq(appointments.id, id))
      .returning();
    return updated;
  }

  async getAppointment(id: number): Promise<Appointment | undefined> {
    if (!Number.isInteger(id) || id < 1) return undefined;

    const [appointment] = await db.select().from(appointments).where(eq(appointments.id, id));
    return appointment;
  }

  async getAllAppointments(): Promise<Appointment[]> {
    return await db.select().from(appointments);
  }

  async getTeamAppointments(teamId: number): Promise<Appointment[]> {
    return await db
      .select()
      .from(appointments)
      .where(eq(appointments.teamId, teamId));
  }

  // PDF operations
  async storePdf(appointmentId: number, pdfBuffer: Buffer): Promise<void> {
    this.pdfStorage.set(appointmentId, pdfBuffer);
  }

  async getPdf(appointmentId: number): Promise<Buffer | undefined> {
    return this.pdfStorage.get(appointmentId);
  }
}

export const storage = new DatabaseStorage();