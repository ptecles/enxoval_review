-- Add author_email column to reviews table
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS author_email TEXT;

-- Create index for faster lookups by email
CREATE INDEX IF NOT EXISTS idx_reviews_author_email ON reviews(author_email);

-- Add comment to document the column
COMMENT ON COLUMN reviews.author_email IS 'Email of the user who created the review (from Hotmart login)';
