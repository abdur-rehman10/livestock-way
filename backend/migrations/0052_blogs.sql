-- Blog posts managed by admin
CREATE TABLE IF NOT EXISTS blogs (
  id            SERIAL PRIMARY KEY,
  slug          VARCHAR(300) NOT NULL UNIQUE,
  title         VARCHAR(500) NOT NULL,
  excerpt       TEXT,
  content       TEXT NOT NULL,
  cover_image   TEXT,
  author        VARCHAR(200),
  category      VARCHAR(100),
  tags          TEXT[] DEFAULT '{}',
  published     BOOLEAN NOT NULL DEFAULT FALSE,
  published_at  TIMESTAMPTZ,
  created_by    INTEGER REFERENCES app_users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blogs_slug ON blogs(slug);
CREATE INDEX IF NOT EXISTS idx_blogs_published ON blogs(published);
CREATE INDEX IF NOT EXISTS idx_blogs_category ON blogs(category);
