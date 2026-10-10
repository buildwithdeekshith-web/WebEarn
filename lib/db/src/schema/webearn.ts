import {
  date,
  integer,
  pgTable,
  real,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const webearnUsersTable = pgTable("webearn_users", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  name: text("name").notNull(),
  role: text("role"),
  bio: text("bio").notNull().default(""),
  category: text("category").notNull().default(""),
  location: text("location").notNull().default(""),
  availability: text("availability").notNull().default(""),
  skills: text("skills").array().notNull().default([]),
  portfolioLinks: text("portfolio_links").array().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const webearnProjectsTable = pgTable("webearn_projects", {
  id: serial("id").primaryKey(),
  businessId: text("business_id").notNull().references(() => webearnUsersTable.id),
  title: text("title").notNull(),
  category: text("category").notNull(),
  about: text("about").notNull(),
  requiredPages: text("required_pages").array().notNull().default([]),
  requiredFeatures: text("required_features").array().notNull().default([]),
  minBudget: real("min_budget").notNull(),
  maxBudget: real("max_budget").notNull(),
  deadline: date("deadline", { mode: "string" }),
  referenceLinks: text("reference_links").array().notNull().default([]),
  notes: text("notes").notNull().default(""),
  status: text("status").notNull().default("open"),
  studentId: text("student_id").references(() => webearnUsersTable.id),
  previewUrl: text("preview_url"),
  paymentStatus: text("payment_status").notNull().default("not_funded"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const webearnProposalsTable = pgTable("webearn_proposals", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => webearnProjectsTable.id),
  studentId: text("student_id").notNull().references(() => webearnUsersTable.id),
  message: text("message").notNull(),
  quote: real("quote").notNull(),
  timelineDays: integer("timeline_days").notNull(),
  portfolioLinks: text("portfolio_links").array().notNull().default([]),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const webearnMilestonesTable = pgTable("webearn_milestones", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => webearnProjectsTable.id),
  title: text("title").notNull(),
  dueDate: date("due_date", { mode: "string" }),
  completed: integer("completed").notNull().default(0),
});

export const webearnMessagesTable = pgTable("webearn_messages", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => webearnProjectsTable.id),
  senderId: text("sender_id").notNull().references(() => webearnUsersTable.id),
  text: text("text").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const webearnSubmissionsTable = pgTable("webearn_submissions", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => webearnProjectsTable.id),
  url: text("url").notNull(),
  note: text("note").notNull().default(""),
  kind: text("kind").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const webearnReviewsTable = pgTable("webearn_reviews", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => webearnProjectsTable.id),
  reviewerId: text("reviewer_id").notNull().references(() => webearnUsersTable.id),
  subjectId: text("subject_id").notNull().references(() => webearnUsersTable.id),
  rating: integer("rating").notNull(),
  comment: text("comment").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const webearnDisputesTable = pgTable("webearn_disputes", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => webearnProjectsTable.id),
  openedBy: text("opened_by").notNull().references(() => webearnUsersTable.id),
  reason: text("reason").notNull(),
  status: text("status").notNull().default("open"),
  resolution: text("resolution"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const webearnPaymentsTable = pgTable("webearn_payments", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => webearnProjectsTable.id),
  amount: real("amount").notNull(),
  status: text("status").notNull().default("held"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertWebearnUserSchema = createInsertSchema(webearnUsersTable);
export const insertWebearnProjectSchema = createInsertSchema(webearnProjectsTable);
export const insertWebearnProposalSchema = createInsertSchema(webearnProposalsTable);
export type WebearnUser = typeof webearnUsersTable.$inferSelect;
export type InsertWebearnUser = z.infer<typeof insertWebearnUserSchema>;
export type WebearnProject = typeof webearnProjectsTable.$inferSelect;
export type InsertWebearnProject = z.infer<typeof insertWebearnProjectSchema>;
