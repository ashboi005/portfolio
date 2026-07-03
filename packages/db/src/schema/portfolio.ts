import { sql } from "drizzle-orm";
import { boolean, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const profile = pgTable("profile", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  tagline: text("tagline"),
  status: text("status"),
  location: text("location"),
  bio: text("bio"),
  githubUrl: text("github_url"),
  linkedinUrl: text("linkedin_url"),
  email: text("email"),
  interests: jsonb("interests").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  arsenal: jsonb("arsenal")
    .$type<Record<string, string[]>>()
    .notNull()
    .default(sql`'{}'::jsonb`),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const projects = pgTable("projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  tagline: text("tagline"),
  description: text("description").notNull(),
  status: text("status").notNull().default("shipped"), // live | nda | shipped | lab
  year: text("year"),
  highlights: jsonb("highlights").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  techStack: jsonb("tech_stack").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  githubUrl: text("github_url"),
  liveUrl: text("live_url"),
  s3ImageKey: text("s3_image_key"),
  featured: boolean("featured").default(false).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const experience = pgTable("experience", {
  id: uuid("id").defaultRandom().primaryKey(),
  role: text("role").notNull(),
  company: text("company").notNull(),
  duration: text("duration").notNull(),
  location: text("location"),
  description: text("description").notNull(),
  highlights: jsonb("highlights").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  isActive: boolean("is_active").default(false).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const achievements = pgTable("achievements", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  detail: text("detail"),
  year: text("year"),
  kind: text("kind").notNull().default("win"), // win | lead | community
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export type Profile = typeof profile.$inferSelect;
export type NewProfile = typeof profile.$inferInsert;

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;

export type Experience = typeof experience.$inferSelect;
export type NewExperience = typeof experience.$inferInsert;

export type Achievement = typeof achievements.$inferSelect;
export type NewAchievement = typeof achievements.$inferInsert;
