package com.culine.scanner

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.lifecycleScope
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.codescanner.GmsBarcodeScannerOptions
import com.google.mlkit.vision.codescanner.GmsBarcodeScanning
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONArray
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder

private data class Product(
  val name: String, val vendor: String, val price: String, val unit: String,
  val stock: Int, val availability: String, val health: String,
  val origin: String, val marketLocation: String, val dishes: String
)

class MainActivity : ComponentActivity() {
  private var status by mutableStateOf("Scan a product barcode to view its Culine details.")
  private var scannedCode by mutableStateOf("")
  private var product by mutableStateOf<Product?>(null)
  private var cartCount by mutableIntStateOf(0)
  private var cartItems by mutableStateOf(emptyList<String>())

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    val savedCart = getPreferences(MODE_PRIVATE).getString("cart_items", "[]")
    cartItems = try {
      val saved = JSONArray(savedCart)
      List(saved.length()) { index -> saved.getString(index) }
    } catch (_: Exception) { emptyList() }
    cartCount = cartItems.size
    val options = GmsBarcodeScannerOptions.Builder()
      .setBarcodeFormats(Barcode.FORMAT_EAN_13, Barcode.FORMAT_EAN_8, Barcode.FORMAT_UPC_A, Barcode.FORMAT_UPC_E, Barcode.FORMAT_CODE_128)
      .enableAutoZoom()
      .build()
    val scanner = GmsBarcodeScanning.getClient(this, options)

    setContent {
      MaterialTheme {
        Surface(Modifier.fillMaxSize()) {
          Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(24.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text("Culine barcode scanner", style = MaterialTheme.typography.headlineMedium)
            Text("Items in cart: $cartCount", style = MaterialTheme.typography.titleMedium)
            if (cartItems.isNotEmpty()) {
              val summary = cartItems.groupingBy { it }.eachCount().entries.joinToString { "${it.value} × ${it.key}" }
              Text("Cart: $summary")
            }
            Button(onClick = {
              status = "Opening Google scanner…"
              scanner.startScan()
                .addOnSuccessListener { code -> scannedCode = code.rawValue.orEmpty(); lookup(scannedCode) }
                .addOnCanceledListener { status = "Scan cancelled." }
                .addOnFailureListener { status = "Scanner could not start. Check Google Play services." }
            }) { Text("Scan barcode") }
            if (scannedCode.isNotBlank()) Text("Barcode: $scannedCode")
            Text(status)
            product?.let { item ->
              Text(item.name, style = MaterialTheme.typography.headlineSmall)
              Text("${item.vendor} · $${item.price} / ${item.unit}")
              Text("Nutrition: ${item.health.ifBlank { "Details not added yet." }}")
              Text("Grown or made: ${item.origin.ifBlank { "Details not added yet." }}")
              Text("Where to find it: ${item.marketLocation.ifBlank { item.vendor }}")
              Text("Dish ideas: ${item.dishes.ifBlank { "Details not added yet." }}")
              Text("Stock: ${if (item.availability == "unavailable") "Unavailable" else item.stock}")
              Button(enabled = item.availability != "unavailable" && item.stock > 0, onClick = {
                cartCount++
                cartItems = cartItems + item.name
                cartCount = cartItems.size
                getPreferences(MODE_PRIVATE).edit().putString("cart_items", JSONArray(cartItems).toString()).apply()
                status = "${item.name} added to this scanner app's cart."
              }) { Text("Add to cart") }
            }
            Text("Admins enter product barcodes and details in the Culine inventory dashboard.")
          }
        }
      }
    }
  }

  private fun lookup(code: String) {
    if (code.isBlank()) { status = "No barcode was returned. Try again."; return }
    product = null
    status = "Looking up $code…"
    lifecycleScope.launch {
      val result = withContext(Dispatchers.IO) { fetchProduct(code) }
      product = result
      status = if (result == null) "No Culine item is linked to this barcode yet." else "Product found. Review its details and add it to your cart."
    }
  }

  private fun fetchProduct(code: String): Product? {
    val encoded = URLEncoder.encode(code, Charsets.UTF_8.name())
    val endpoint = "${BuildConfig.SUPABASE_URL}/rest/v1/products?barcode=eq.$encoded&select=name,vendor,price,unit,stock_quantity,availability,health_info,growing_location,market_location,dish_ideas&limit=1"
    val connection = (URL(endpoint).openConnection() as HttpURLConnection).apply {
      connectTimeout = 10000
      readTimeout = 10000
      setRequestProperty("apikey", BuildConfig.SUPABASE_KEY)
      setRequestProperty("Authorization", "Bearer ${BuildConfig.SUPABASE_KEY}")
      setRequestProperty("Accept", "application/json")
    }
    return try {
      if (connection.responseCode !in 200..299) return null
      val rows = JSONArray(connection.inputStream.bufferedReader().use { it.readText() })
      if (rows.length() == 0) return null
      val row = rows.getJSONObject(0)
      Product(row.optString("name"), row.optString("vendor"), row.optString("price"), row.optString("unit"), row.optInt("stock_quantity"), row.optString("availability", "available"), row.optString("health_info"), row.optString("growing_location"), row.optString("market_location"), row.optString("dish_ideas"))
    } catch (_: Exception) {
      null
    } finally {
      connection.disconnect()
    }
  }
}
