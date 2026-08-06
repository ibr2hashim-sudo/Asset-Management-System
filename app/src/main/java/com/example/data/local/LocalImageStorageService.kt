package com.example.data.local

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import java.io.File
import java.io.FileOutputStream
import java.io.InputStream
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class LocalImageStorageService(private val context: Context) {

    /**
     * يحفظ الصورة المحددة (من المعرض أو الكاميرا) في الذاكرة الداخلية للهاتف
     * ويسمي الملف برقم الجهاز (Asset ID).
     */
    suspend fun saveImageLocally(imageUri: Uri, assetId: String): String? = withContext(Dispatchers.IO) {
        try {
            // الوصول إلى مجلد التطبيق الداخلي (لا يحتاج لصلاحيات تخزين خارجية)
            val directory = File(context.filesDir, "asset_images")
            if (!directory.exists()) {
                directory.mkdirs()
            }

            // تسمية الملف بكود الجهاز (مثال: CATHC-15.jpg)
            val fileName = "$assetId.jpg"
            val file = File(directory, fileName)

            // قراءة الصورة من الـ Uri وتحويلها إلى الملف
            val inputStream: InputStream? = context.contentResolver.openInputStream(imageUri)
            val bitmap = BitmapFactory.decodeStream(inputStream)
            
            val outputStream = FileOutputStream(file)
            // ضغط الصورة لتوفير المساحة
            bitmap?.compress(Bitmap.CompressFormat.JPEG, 85, outputStream)
            
            outputStream.flush()
            outputStream.close()
            inputStream?.close()

            // إرجاع المسار المطلق للملف لاستخدامه لاحقاً
            return@withContext file.absolutePath
        } catch (e: Exception) {
            e.printStackTrace()
            return@withContext null
        }
    }

    /**
     * يحفظ صورة ملتقطة مباشرة من الكاميرا (Bitmap) في الذاكرة الداخلية للهاتف
     * ويسمي الملف برقم الجهاز (Asset ID).
     */
    suspend fun saveBitmapLocally(bitmap: Bitmap, assetId: String): String? = withContext(Dispatchers.IO) {
        try {
            val directory = File(context.filesDir, "asset_images")
            if (!directory.exists()) {
                directory.mkdirs()
            }

            val fileName = "$assetId.jpg"
            val file = File(directory, fileName)

            val outputStream = FileOutputStream(file)
            bitmap.compress(Bitmap.CompressFormat.JPEG, 85, outputStream)
            outputStream.flush()
            outputStream.close()

            return@withContext file.absolutePath
        } catch (e: Exception) {
            e.printStackTrace()
            return@withContext null
        }
    }

    /**
     * جلب الصورة المحفوظة مسبقاً إذا كانت موجودة
     */
    fun getImagePath(assetId: String): String? {
        val directory = File(context.filesDir, "asset_images")
        val file = File(directory, "$assetId.jpg")
        return if (file.exists()) file.absolutePath else null
    }
}
