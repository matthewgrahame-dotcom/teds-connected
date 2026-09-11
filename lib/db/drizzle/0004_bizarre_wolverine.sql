CREATE TABLE "news_articles" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"snippet" text NOT NULL,
	"body" text,
	"tag_color" text DEFAULT 'bg-destructive' NOT NULL,
	"posted_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
