ALTER TABLE tenant
ADD COLUMN public_website_enabled BOOLEAN NOT NULL DEFAULT FALSE AFTER branch_enabled;
