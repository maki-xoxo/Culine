plugins {
  id("com.android.application")
  id("org.jetbrains.kotlin.android")
  id("org.jetbrains.kotlin.plugin.compose")
}
android {
  namespace = "com.culine.scanner"
  compileSdk = 35
  defaultConfig {
    applicationId = "com.culine.scanner"
    minSdk = 23
    targetSdk = 35
    versionCode = 1
    versionName = "1.0"
    buildConfigField("String", "SUPABASE_URL", "\"https://vmdoojppbolonlmjgxtk.supabase.co\"")
    buildConfigField("String", "SUPABASE_KEY", "\"sb_publishable_4tkr-ghFSw6ItmNEhV38qQ_Z7k92y9c\"")
  }
  buildFeatures { compose = true; buildConfig = true }
}
dependencies {
  implementation(platform("androidx.compose:compose-bom:2024.09.00"))
  implementation("androidx.activity:activity-compose:1.9.2")
  implementation("androidx.compose.material3:material3")
  implementation("androidx.compose.ui:ui")
  implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.6")
  implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.9.0")
  implementation("com.google.android.gms:play-services-code-scanner:16.1.0")
}
