package com.example.ui.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.example.data.local.AppDatabase
import com.example.data.model.Asset
import com.example.data.model.AssetWithDetails
import com.example.data.model.Department
import com.example.data.model.TransferRecord
import com.example.data.model.TransferWithDetails
import com.example.data.repository.AssetRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

class AssetViewModel(application: Application) : AndroidViewModel(application) {
    private val database = AppDatabase.getDatabase(application)
    private val repository = AssetRepository(
        database.assetDao(),
        database.departmentDao(),
        database.transferDao(),
        database.companyDao()
    )

    // Raw streams from Repository
    val departments: StateFlow<List<Department>> = repository.allDepartments
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val assetsWithDetails: StateFlow<List<AssetWithDetails>> = repository.assetsWithDetails
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val transfersWithDetails: StateFlow<List<TransferWithDetails>> = repository.transfersWithDetails
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    // Filtering options
    private val _searchQuery = MutableStateFlow("")
    val searchQuery = _searchQuery.asStateFlow()

    private val _selectedTypeFilter = MutableStateFlow("ALL") // "ALL", "FIXED", "MOVABLE"
    val selectedTypeFilter = _selectedTypeFilter.asStateFlow()

    private val _selectedDepartmentFilter = MutableStateFlow<Int?>(null)
    val selectedDepartmentFilter = _selectedDepartmentFilter.asStateFlow()

    // Combined filtered assets flow
    val filteredAssets: StateFlow<List<AssetWithDetails>> = combine(
        assetsWithDetails,
        _searchQuery,
        _selectedTypeFilter,
        _selectedDepartmentFilter
    ) { assets, query, type, deptId ->
        assets.filter { item ->
            val matchesQuery = query.isBlank() ||
                item.asset.name.contains(query, ignoreCase = true) ||
                item.asset.serialNumber.contains(query, ignoreCase = true)

            val matchesType = type == "ALL" || item.asset.type == type
            val matchesDept = deptId == null || item.asset.currentDepartmentId == deptId

            matchesQuery && matchesType && matchesDept
        }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    init {
        // No pre-populated demo data, starts completely empty
    }

    // Filter adjustments
    fun updateSearchQuery(query: String) {
        _searchQuery.value = query
    }

    fun updateTypeFilter(type: String) {
        _selectedTypeFilter.value = type
    }

    fun updateDepartmentFilter(deptId: Int?) {
        _selectedDepartmentFilter.value = deptId
    }

    // Actions
    fun addAsset(
        id: String,
        name: String,
        serialNumber: String,
        type: String,
        description: String,
        currentDepartmentId: Int,
        condition: String,
        model: String = "",
        quantity: Int = 1,
        imageUri: String? = null,
        accessories: String = "",
        manufacturer: String = "",
        status: String = "ACTIVE"
    ) {
        viewModelScope.launch {
            val asset = Asset(
                id = id,
                name = name,
                serialNumber = serialNumber,
                type = type,
                description = description,
                purchaseDate = System.currentTimeMillis(),
                currentDepartmentId = currentDepartmentId,
                status = status,
                condition = condition,
                model = model,
                quantity = quantity,
                imageUri = imageUri,
                accessories = accessories,
                manufacturer = manufacturer
            )
            repository.insertAsset(asset)
        }
    }

    private fun normalizeArabic(text: String): String {
        return text.trim()
            .lowercase()
            .replace("أ", "ا")
            .replace("إ", "ا")
            .replace("آ", "ا")
            .replace("ة", "ه")
            .replace("\\s+".toRegex(), " ")
    }

    // Helper to parse CSV fields respecting quotes and custom delimiters
    private fun parseCsvLine(line: String, delimiter: String): List<String> {
        val result = mutableListOf<String>()
        var inQuotes = false
        val currentField = StringBuilder()
        var i = 0
        while (i < line.length) {
            val c = line[i]
            if (c == '"') {
                if (inQuotes && i + 1 < line.length && line[i + 1] == '"') {
                    // Escaped double quote "" inside quotes
                    currentField.append('"')
                    i++
                } else {
                    inQuotes = !inQuotes
                }
            } else if (line.startsWith(delimiter, i) && !inQuotes) {
                result.add(currentField.toString().trim())
                currentField.clear()
                i += delimiter.length - 1
            } else {
                currentField.append(c)
            }
            i++
        }
        result.add(currentField.toString().trim())
        return result
    }

    // Excel-compatible CSV Importer with robust English/Arabic header matching and auto delimiter detection
    fun importAssetsFromCsv(csvText: String, onComplete: (Int, String) -> Unit) {
        viewModelScope.launch {
            try {
                val lines = csvText.lines()
                if (lines.isEmpty() || lines.first().isBlank()) {
                    onComplete(0, "الملف فارغ أو غير صالح")
                    return@launch
                }
                
                // Detect delimiter dynamically from the header line
                val firstLine = lines.firstOrNull { it.isNotBlank() } ?: ""
                val commaCount = firstLine.count { it == ',' }
                val semicolonCount = firstLine.count { it == ';' }
                val tabCount = firstLine.count { it == '\t' }
                val delimiter = when {
                    semicolonCount > commaCount && semicolonCount > tabCount -> ";"
                    tabCount > commaCount && tabCount > semicolonCount -> "\t"
                    else -> ","
                }

                // Get header and columns
                val cleanHeader = parseCsvLine(firstLine, delimiter).map { 
                    it.trim()
                        .lowercase()
                        .removePrefix("\uFEFF")
                        .removePrefix("\uFFFE")
                }
                
                var importedCount = 0
                val departmentsList = repository.allDepartments.first()
                val defaultDept = departmentsList.firstOrNull()
                val defaultDeptId = defaultDept?.id ?: 1
                
                // Map to store normalized department name to its ID to absolutely avoid duplicates
                val departmentsMap = departmentsList.associate { 
                    normalizeArabic(it.name) to it.id 
                }.toMutableMap()

                // Prosperous headers lists for Arabic and English
                val nameNames = listOf("الاسم", "اسم الجهاز", "اسم الاصل", "اسم الأصل", "البيان", "الأصل", "الاصل", "name", "device name", "asset name", "device", "asset", "item", "title")
                val idNames = listOf("كود تعريفي", "رقم الأصل", "الرقم التعريفي", "كود الأصل", "كود الاصل", "الباركود", "المعرف", "رقم الاصل", "الكود", "id", "asset id", "code", "asset code", "device id", "barcode", "serial", "inventory id")
                val serialNames = listOf("الرقم التسلسلي", "رقم التسلسل", "الرقم السري", "سريال", "رقم السريال", "serialnumber", "serial number", "s/n", "sn", "serial no", "serial no.", "الرقم التسلسلي", "serial_number")
                val typeNames = listOf("النوع", "التصنيف", "الفئة", "type", "category", "class")
                val descriptionNames = listOf("الوصف", "ملاحظات", "ملاحظة", "ملاحضة", "تفاصيل", "description", "notes", "note", "details", "desc", "comment", "comments")
                val conditionNames = listOf("الجودة", "الحالة", "حالة الأصل", "حالة الاصل", "حالة", "condition", "status", "state")
                val modelNames = listOf("الموديل", "طراز", "رقم الموديل", "النوعية", "model", "type no", "model number", "موديل", "device model")
                val quantityNames = listOf("الكمية", "العدد", "الكميه", "quantity", "qty", "count")
                val accessoriesNames = listOf("الملحقات", "التوابع", "المرفقات", "الملحقه", "accessories", "attachments")
                val manufacturerNames = listOf("الشركة المصنعة", "الشركة", "المصنع", "البراند", "الماركة", "ماركة", "manufacturer", "brand", "make", "company", "manufactur")
                val deptNames = listOf("القسم", "الإدارة", "الادارة", "الجهة", "الموقع", "department", "dept", "section", "room", "location")
                
                for (i in 1 until lines.size) {
                    val line = lines[i].trim()
                    if (line.isBlank()) continue
                    
                    // Parse values using our robust quote-respecting CSV line parser
                    val tokens = parseCsvLine(line, delimiter)
                    if (tokens.isEmpty()) continue
                    
                    // Map indices dynamically based on header list
                    fun getValueForHeader(names: List<String>): String {
                        val index = cleanHeader.indexOfFirst { headerName -> 
                            names.any { prospective -> prospective.lowercase().trim() == headerName }
                        }
                        return if (index != -1 && index < tokens.size) tokens[index] else ""
                    }
                    
                    val nameValue = getValueForHeader(nameNames)
                    if (nameValue.isBlank()) continue
                    
                    val serial = getValueForHeader(serialNames)
                    val type = getValueForHeader(typeNames).ifBlank { "BIOMEDICAL" }
                    val description = getValueForHeader(descriptionNames)
                    val condition = getValueForHeader(conditionNames).ifBlank { "GOOD" }
                    val model = getValueForHeader(modelNames)
                    val quantity = getValueForHeader(quantityNames).toIntOrNull() ?: 1
                    val assetCode = getValueForHeader(idNames)
                    val idValue = assetCode.ifBlank { System.currentTimeMillis().toString() + "-" + importedCount }
                    val accessories = getValueForHeader(accessoriesNames)
                    val manufacturer = getValueForHeader(manufacturerNames)
                    
                    // Check if department exists by name, otherwise use default or create
                    val deptName = getValueForHeader(deptNames).trim()
                    var deptId = defaultDeptId
                    if (deptName.isNotBlank()) {
                        val normalizedDept = normalizeArabic(deptName)
                        if (departmentsMap.containsKey(normalizedDept)) {
                            deptId = departmentsMap[normalizedDept]!!
                        } else {
                            // Create department dynamically
                            val newDeptId = repository.insertDepartment(
                                Department(name = deptName, code = deptName.take(3).uppercase().trim(), description = "تم إنشاؤه تلقائياً")
                            )
                            deptId = newDeptId.toInt()
                            departmentsMap[normalizedDept] = deptId
                        }
                    }
                    
                    val asset = Asset(
                        id = idValue,
                        name = nameValue,
                        serialNumber = serial,
                        type = type,
                        description = description,
                        purchaseDate = System.currentTimeMillis(),
                        currentDepartmentId = deptId,
                        status = "ACTIVE",
                        condition = condition,
                        model = model,
                        quantity = quantity,
                        imageUri = null,
                        accessories = accessories,
                        manufacturer = manufacturer
                    )
                    repository.insertAsset(asset)
                    importedCount++
                }
                onComplete(importedCount, "تم استيراد $importedCount من الأصول بنجاح!")
            } catch (e: Exception) {
                onComplete(0, "خطأ في قراءة ملف CSV: ${e.localizedMessage}")
            }
        }
    }

    // Excel-compatible CSV Exporter from the entire database
    fun exportAssetsToCsv(): String {
        val builder = StringBuilder()
        // Standard UTF-8 BOM to make Excel open Arabic characters correctly
        builder.append("\uFEFF")
        
        // CSV Header
        builder.append("الاسم,كود تعريفي,الشركة المصنعة,الموديل,الرقم التسلسلي,النوع,الملحقات,الوصف,الكمية,الجودة,القسم\n")
        
        val assets = assetsWithDetails.value // Read ALL assets from database, not just filtered ones
        val depts = departments.value.associateBy { it.id }
        for (item in assets) {
            val name = item.asset.name.replace("\"", "\"\"")
            val code = item.asset.id.replace("\"", "\"\"")
            val mfg = item.asset.manufacturer.replace("\"", "\"\"")
            val model = item.asset.model.replace("\"", "\"\"")
            val serial = item.asset.serialNumber.replace("\"", "\"\"")
            val type = item.asset.type.replace("\"", "\"\"")
            val acc = item.asset.accessories.replace("\"", "\"\"")
            val description = item.asset.description.replace("\"", "\"\"")
            val quantity = item.asset.quantity
            val condition = item.asset.condition.replace("\"", "\"\"")
            val deptName = (depts[item.asset.currentDepartmentId]?.name ?: "غير محدد").replace("\"", "\"\"")
            
            builder.append("\"$name\",\"$code\",\"$mfg\",\"$model\",\"$serial\",\"$type\",\"$acc\",\"$description\",$quantity,\"$condition\",\"$deptName\"\n")
        }
        return builder.toString()
    }

    // CSV Empty Template for Excel
    fun getCsvTemplate(): String {
        val builder = StringBuilder()
        builder.append("\uFEFF")
        builder.append("الاسم,كود تعريفي,الشركة المصنعة,الموديل,الرقم التسلسلي,النوع,الملحقات,الوصف,الكمية,الجودة,القسم\n")
        builder.append("\"طاولة مكتبية ذكية\",\"AST-1001\",\"IKEA\",\"IKEA-Desk-X\",\"SN-99238\",\"MOVABLE\",\"\",\"طاولة مكتبية قابلة لتعديل الارتفاع\",5,\"NEW\",\"الموارد البشرية\"\n")
        builder.append("\"شاشة حاسوب 27 بوصة\",\"AST-1002\",\"LG\",\"LG-27UL\",\"SN-88231\",\"MOVABLE\",\"كابل طاقة - كابل HDMI\",\"شاشة عرض بدقة 4K فائقة الوضوح\",10,\"EXCELLENT\",\"تقنية المعلومات\"\n")
        return builder.toString()
    }

    fun updateAsset(asset: Asset) {
        viewModelScope.launch {
            repository.updateAsset(asset)
        }
    }

    fun deleteAsset(asset: Asset) {
        viewModelScope.launch {
            repository.deleteAsset(asset)
        }
    }

    fun addDepartment(name: String, code: String, description: String) {
        viewModelScope.launch {
            repository.insertDepartment(
                Department(
                    name = name,
                    code = code,
                    description = description
                )
            )
        }
    }

    fun deleteDepartment(department: Department) {
        viewModelScope.launch {
            repository.deleteDepartment(department)
        }
    }

    fun transferAsset(
        assetId: String,
        fromDeptId: Int,
        toDeptId: Int,
        authorizedBy: String,
        notes: String,
        onComplete: (Boolean) -> Unit = {}
    ) {
        viewModelScope.launch {
            val success = repository.transferAsset(
                assetId = assetId,
                fromDeptId = fromDeptId,
                toDeptId = toDeptId,
                authorizedBy = authorizedBy,
                notes = notes
            )
            onComplete(success)
        }
    }
}
