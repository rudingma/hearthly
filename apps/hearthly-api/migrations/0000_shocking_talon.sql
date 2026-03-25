CREATE TABLE "health_check" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" varchar(50) DEFAULT 'ok' NOT NULL,
	"checked_at" timestamp DEFAULT now() NOT NULL
);
