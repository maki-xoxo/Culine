# Culine live inventory setup

Culine uses Supabase for shared stock, admin sign-in, database permissions, and live customer updates.

1. Create a Supabase project.
2. In script/supabase-client.js, replace YOUR_PROJECT_REF with the Project URL and sb_publishable_REPLACE_WITH_PROJECT_KEY with the project's publishable key. The publishable key is intended for browser use; never paste a secret or service-role key into this file.
3. In the Supabase SQL Editor, run supabase/setup.sql.
4. Run supabase/barcode-details-migration.sql in the SQL Editor to add barcode matching and produce information fields.
5. In Supabase Authentication, create or invite the admin user.
6. Copy that user's UUID from the Users page. In the SQL Editor, run this with the real UUID:
   insert into public.inventory_admins (user_id) values ('REPLACE_WITH_ADMIN_USER_UUID');
7. Serve the Culine folder from a local or hosted web server, then open admin.html and sign in with the Supabase admin account. Camera scanning requires HTTPS (or localhost).

The customer dashboard continues to use its existing demo sign-in. Supabase keeps the product list public-read and restricts inventory writes to UUIDs in inventory_admins. Stock quantity zero displays as “Out of stock”; setting availability to “Unavailable” disables the Add action. Product inserts, stock changes, and availability changes are broadcast through Supabase Realtime. Admins can enter barcodes and customer-facing produce notes in admin.html; each barcode must be unique.

The existing browser-only customer accounts are not migrated. The admin account is a separate Supabase Auth user. The market page keeps its sample cards until a Supabase project is configured and its setup SQL has been run.
