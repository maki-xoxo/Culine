# Culine Android barcode scanner

This folder is a native Android companion for the Culine browser scanner. It uses Google's Code Scanner, which uses the ML Kit barcode model and is available only in native Android apps. It looks up barcodes in the same Supabase `products` table and shows the product's saved nutrition notes, origin, market location, and dish ideas.

Open this folder in Android Studio and let Gradle sync. The app requires Android API 23 or later and Google Play services. The scanner model can be installed by Google Play services on first use. The app's local cart is separate from the browser cart.

Before scanning products, run `supabase/barcode-details-migration.sql` in the Supabase SQL Editor, then sign in to `admin.html` and add each product's barcode and details. The Android app uses only the project's public Supabase publishable key; database row-level security must keep product data public-read and admin changes restricted.
