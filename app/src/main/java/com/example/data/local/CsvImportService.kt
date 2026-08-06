package com.example.data.local

import android.content.Context
import com.example.data.model.Asset
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.BufferedReader
import java.io.InputStreamReader

class CsvImportService(private val context: Context) {

    /**
     * يقرأ ملف assets_data.csv من مجلد assets ويحوله إلى قائمة من الأصول (Assets)
     */
    suspend fun readAssetsFromCsv(): List<Asset> = withContext(Dispatchers.IO) {
        val assetList = mutableListOf<Asset>()
        try {
            val inputStream = context.assets.open("assets_data.csv")
            val bytes = inputStream.readBytes()
            var startIndex = 0
            if (bytes.size >= 3 && bytes[0] == 0xEF.toByte() && bytes[1] == 0xBB.toByte() && bytes[2] == 0xBF.toByte()) {
                startIndex = 3
            }
            var text = String(bytes, startIndex, bytes.size - startIndex, java.nio.charset.StandardCharsets.UTF_8)
            if (text.contains("\uFFFD")) {
                try {
                    text = String(bytes, startIndex, bytes.size - startIndex, java.nio.charset.Charset.forName("Windows-1256"))
                } catch (e: Exception) {}
            }
            
            val reader = BufferedReader(java.io.StringReader(text))
            
            // قراءة السطر الأول (العناوين/Headers) وتخطيه
            reader.readLine() 

            var line: String?
            while (reader.readLine().also { line = it } != null) {
                // تقسيم السطر بناءً على الفاصلة
                // Department,Type,Asset ID,Device Name,Model,Serial Number,Quantity,Status,Notes
                val tokens = line?.split(",")
                if (tokens != null && tokens.size >= 8) {
                    val departmentName = tokens.getOrNull(0)?.trim() ?: ""
                    val type = tokens.getOrNull(1)?.trim() ?: ""
                    val assetCode = tokens.getOrNull(2)?.trim() ?: ""
                    val deviceName = tokens.getOrNull(3)?.trim() ?: ""
                    val model = tokens.getOrNull(4)?.trim() ?: ""
                    val serialNumber = tokens.getOrNull(5)?.trim() ?: ""
                    val quantity = tokens.getOrNull(6)?.trim()?.toIntOrNull() ?: 1
                    val status = tokens.getOrNull(7)?.trim() ?: ""
                    val notes = tokens.getOrNull(8)?.trim() ?: ""

                    val asset = Asset(
                        id = assetCode,
                        name = deviceName,
                        serialNumber = serialNumber,
                        type = type,
                        description = notes,
                        purchaseDate = System.currentTimeMillis(),
                        currentDepartmentId = 1, // رقم افتراضي للقسم
                        status = status,
                        condition = "GOOD",
                        model = model,
                        quantity = quantity,
                        accessories = "",
                        manufacturer = ""
                    )
                    assetList.add(asset)
                }
            }
            reader.close()
        } catch (e: Exception) {
            e.printStackTrace()
        }
        return@withContext assetList
    }
}

