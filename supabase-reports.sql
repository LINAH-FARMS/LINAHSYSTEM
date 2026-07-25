CREATE TABLE IF NOT EXISTS incident_reports (
  id BIGSERIAL PRIMARY KEY,
  phone TEXT,
  name TEXT,
  type TEXT,
  description TEXT,
  location TEXT,
  priority TEXT,
  status TEXT DEFAULT 'جديد',
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE incident_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all" ON incident_reports FOR ALL USING (true) WITH CHECK (true);
