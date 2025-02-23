import { pgTable, text, serial, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull(), // 'admin', 'collector', 'approver'
  createdBy: integer("created_by"), // admin who created this user
  teamId: integer("team_id"), // The current team the user belongs to
});

export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdBy: integer("created_by").notNull(), // admin who created the team
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const teamMembers = pgTable("team_members", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull(),
  userId: integer("user_id").notNull(),
  addedBy: integer("added_by").notNull(), // admin who added the member
  addedAt: timestamp("added_at").notNull().defaultNow(),
});

export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  passportNumber: text("passport_number").notNull(),
  fullName: text("full_name").notNull(),
  phoneNumber: text("phone_number").notNull(),
  email: text("email").notNull(),
  nationalId: text("national_id").notNull(),
  passportImage: text("passport_image").notNull(), // Base64 encoded
  workType: text("work_type").notNull(),
  workplace: text("workplace").notNull(), // Will be a GCC country or "Other"
  gender: text("gender").notNull(),
});

export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  teamId: integer("team_id").notNull(), // The team handling this appointment
  status: text("status").notNull(), // 'pending', 'approved'
  collectedBy: integer("collected_by").notNull(), // user who collected the information
  approvedBy: integer("approved_by"), // user who approved the booking
  pdfUrl: text("pdf_url"), // URL/path to the booking PDF
  bookingDetails: jsonb("booking_details").notNull().$type<{ date: string }>(), // Additional booking information
  createdAt: text("created_at").notNull(),
});

// Schema for creating new teams
export const insertTeamSchema = createInsertSchema(teams).extend({
  name: z.string().min(1, "Team name is required"),
  description: z.string().optional(),
});

// Schema for adding team members
export const insertTeamMemberSchema = createInsertSchema(teamMembers);

// Update user schema to include team
export const insertUserSchema = createInsertSchema(users).extend({
  role: z.enum(['admin', 'collector', 'approver']),
  createdBy: z.number().optional(),
  teamId: z.number({
    required_error: "Team selection is required",
    invalid_type_error: "Please select a team"
  }),
});

// Update client schema with workplace validation
const GCC_COUNTRIES = [
  'Bahrain',
  'Kuwait',
  'Oman',
  'Qatar',
  'Saudi Arabia',
  'United Arab Emirates',
  'Other'
] as const;

export const insertClientSchema = createInsertSchema(clients).extend({
  passportImage: z.any(), // Allow any file input initially, we'll validate during processing
  gender: z.enum(['male', 'female']),
  email: z.string().email("Invalid email format"),
  phoneNumber: z.string().min(10, "Phone number must be at least 10 digits"),
  workplace: z.enum(GCC_COUNTRIES),
});

export const insertAppointmentSchema = createInsertSchema(appointments);

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Team = typeof teams.$inferSelect;
export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type TeamMember = typeof teamMembers.$inferSelect;
export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;
export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;

// Export constants
export const GCC_COUNTRY_OPTIONS = GCC_COUNTRIES;