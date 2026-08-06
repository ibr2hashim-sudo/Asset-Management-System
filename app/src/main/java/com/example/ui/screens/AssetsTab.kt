package com.example.ui.screens

import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import coil.compose.AsyncImage
import android.graphics.Bitmap
import android.net.Uri
import androidx.activity.result.launch
import kotlinx.coroutines.launch
import androidx.compose.ui.graphics.asImageBitmap
import com.example.data.local.LocalImageStorageService
import androidx.compose.foundation.Image
import com.example.data.model.Asset
import com.example.data.model.AssetWithDetails
import com.example.data.model.Department
import com.example.data.model.TransferWithDetails
import com.journeyapps.barcodescanner.ScanContract
import com.journeyapps.barcodescanner.ScanOptions
import java.text.NumberFormat
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AssetsTab(
    assets: List<AssetWithDetails>,
    departments: List<Department>,
    transfers: List<TransferWithDetails>,
    searchQuery: String,
    selectedType: String,
    selectedDeptId: Int?,
    onSearchChanged: (String) -> Unit,
    onTypeChanged: (String) -> Unit,
    onDeptIdChanged: (Int?) -> Unit,
    onAddAsset: (String, String, String, String, Int, String, String, Int, String?, String, String, String) -> Unit,
    onUpdateAsset: (Asset) -> Unit,
    onDeleteAsset: (Asset) -> Unit,
    onTransferAsset: (String, Int, Int, String, String) -> Unit,
    onImportCsv: (String, (Int, String) -> Unit) -> Unit,
    onExportCsv: () -> String,
    onGetTemplate: () -> String
) {
    var showAddDialog by remember { mutableStateOf(false) }
    var selectedAssetForDetail by remember { mutableStateOf<AssetWithDetails?>(null) }
    var showTransferDialog by remember { mutableStateOf<AssetWithDetails?>(null) }
    var showEditDialog by remember { mutableStateOf<AssetWithDetails?>(null) }
    var showDeleteConfirmDialog by remember { mutableStateOf<Asset?>(null) }

    // Excel and CSV State Managers
    val context = LocalContext.current
    var showImportStatusDialog by remember { mutableStateOf(false) }
    var importMessage by remember { mutableStateOf("") }

    val csvImportLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri ->
        uri?.let {
            try {
                val inputStream = context.contentResolver.openInputStream(uri)
                val bytes = inputStream?.readBytes() ?: ByteArray(0)
                if (bytes.isNotEmpty()) {
                    var startIndex = 0
                    // Check for UTF-8 BOM (EF BB BF)
                    if (bytes.size >= 3 && bytes[0] == 0xEF.toByte() && bytes[1] == 0xBB.toByte() && bytes[2] == 0xBF.toByte()) {
                        startIndex = 3
                    }
                    
                    var text = String(bytes, startIndex, bytes.size - startIndex, java.nio.charset.StandardCharsets.UTF_8)
                    
                    // If the text contains the replacement character (), it means UTF-8 decoding failed for some bytes.
                    // In that case, fallback to Windows-1256 which is common for Arabic CSV files.
                    if (text.contains("\uFFFD")) {
                        try {
                            text = String(bytes, startIndex, bytes.size - startIndex, java.nio.charset.Charset.forName("Windows-1256"))
                        } catch (e: Exception) {
                            // Fallback to the original text if Windows-1256 is not supported
                        }
                    }

                    if (text.isNotBlank()) {
                        onImportCsv(text) { count, message ->
                            importMessage = message
                            showImportStatusDialog = true
                        }
                    } else {
                        importMessage = "الملف المختار فارغ!"
                        showImportStatusDialog = true
                    }
                } else {
                    importMessage = "الملف المختار فارغ!"
                    showImportStatusDialog = true
                }
            } catch (e: Exception) {
                importMessage = "خطأ أثناء استيراد الملف: ${e.localizedMessage}"
                showImportStatusDialog = true
            }
        }
    }

    val csvExportLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.CreateDocument("text/csv")
    ) { uri ->
        uri?.let {
            try {
                val csvContent = onExportCsv()
                context.contentResolver.openOutputStream(uri)?.use { outputStream ->
                    outputStream.write(csvContent.toByteArray())
                }
                importMessage = "تم تصدير ملف الأصول والبيانات بنجاح!"
                showImportStatusDialog = true
            } catch (e: Exception) {
                importMessage = "خطأ أثناء تصدير الملف: ${e.localizedMessage}"
                showImportStatusDialog = true
            }
        }
    }

    val csvTemplateLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.CreateDocument("text/csv")
    ) { uri ->
        uri?.let {
            try {
                val templateContent = onGetTemplate()
                context.contentResolver.openOutputStream(uri)?.use { outputStream ->
                    outputStream.write(templateContent.toByteArray())
                }
                importMessage = "تم تحميل نموذج ملف Excel بنجاح! يمكنك تعبئته ورفعه."
                showImportStatusDialog = true
            } catch (e: Exception) {
                importMessage = "خطأ أثناء تحميل النموذج: ${e.localizedMessage}"
                showImportStatusDialog = true
            }
        }
    }

    if (showImportStatusDialog) {
        AlertDialog(
            onDismissRequest = { showImportStatusDialog = false },
            title = { Text("مزامنة وإدارة البيانات", fontWeight = FontWeight.Bold) },
            text = { Text(importMessage) },
            confirmButton = {
                Button(onClick = { showImportStatusDialog = false }) {
                    Text("موافق")
                }
            }
        )
    }

    val currencyFormatter = remember {
        NumberFormat.getCurrencyInstance(Locale("ar", "SA")).apply {
            maximumFractionDigits = 0
        }
    }

    val scanLauncher = rememberLauncherForActivityResult(
        contract = com.journeyapps.barcodescanner.ScanContract()
    ) { result ->
        if (result.contents != null) {
            onSearchChanged(result.contents)
        }
    }

    Scaffold(
        floatingActionButton = {
            if (selectedDeptId != null) {
                FloatingActionButton(
                    onClick = { showAddDialog = true },
                    containerColor = Color(0xFF3B82F6),
                    contentColor = Color.White,
                    shape = CircleShape,
                    modifier = Modifier.testTag("add_asset_fab")
                ) {
                    Icon(
                        imageVector = Icons.Default.Edit,
                        contentDescription = "اضافة اصل جديد",
                        modifier = Modifier.size(28.dp)
                    )
                }
            }
        },
        modifier = Modifier.fillMaxSize()
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(horizontal = 16.dp)
        ) {
            if (selectedDeptId == null) {
                // Main View: Departments Gallery
                Text(
                    text = "الأقسام",
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(top = 16.dp, bottom = 8.dp)
                )

                // Excel & CSV Data Management Row (Moved here)
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 12.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    FilledTonalButton(
                        onClick = { csvImportLauncher.launch("text/*") },
                        modifier = Modifier.weight(1f),
                        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Icon(Icons.Default.UploadFile, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("استيراد Excel", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold)
                    }
                    FilledTonalButton(
                        onClick = { csvExportLauncher.launch("assets_backup_${System.currentTimeMillis()}.csv") },
                        modifier = Modifier.weight(1f),
                        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Icon(Icons.Default.Download, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("تصدير Excel", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold)
                    }
                    IconButton(
                        onClick = { csvTemplateLauncher.launch("excel_template.csv") },
                        modifier = Modifier
                            .background(MaterialTheme.colorScheme.surfaceVariant, RoundedCornerShape(10.dp))
                            .size(36.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.HelpOutline,
                            contentDescription = "تحميل النموذج الفارغ",
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                }

                if (departments.isEmpty()) {
                    Box(modifier = Modifier.weight(1f), contentAlignment = Alignment.Center) {
                        Text("لا توجد أقسام حالياً")
                    }
                } else {
                    LazyVerticalGrid(
                        columns = GridCells.Fixed(2),
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                        contentPadding = PaddingValues(bottom = 16.dp),
                        modifier = Modifier.weight(1f)
                    ) {
                        items(departments, key = { it.id }) { dept ->
                            Card(
                                onClick = { onDeptIdChanged(dept.id) },
                                shape = RoundedCornerShape(16.dp),
                                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                                modifier = Modifier.fillMaxWidth().aspectRatio(1f)
                            ) {
                                Column(
                                    modifier = Modifier.fillMaxSize().padding(16.dp),
                                    horizontalAlignment = Alignment.CenterHorizontally,
                                    verticalArrangement = Arrangement.Center
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(56.dp)
                                            .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.1f), CircleShape),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Icon(Icons.Default.HomeWork, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(28.dp))
                                    }
                                    Spacer(modifier = Modifier.height(12.dp))
                                    Text(
                                        text = dept.name,
                                        style = MaterialTheme.typography.titleMedium,
                                        fontWeight = FontWeight.Bold,
                                        textAlign = TextAlign.Center
                                    )
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Text(
                                        text = dept.code,
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                            }
                        }
                    }
                }
            } else {
                // Secondary View: Assets list for selected department (Matches attached image design)
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 10.dp, bottom = 4.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Text(
                            text = "Related Data Bases",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Box(
                            modifier = Modifier
                                .background(
                                    color = MaterialTheme.colorScheme.surfaceVariant,
                                    shape = RoundedCornerShape(6.dp)
                                )
                                .padding(horizontal = 8.dp, vertical = 2.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = "${assets.size}",
                                style = MaterialTheme.typography.labelMedium,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }

                    Row(
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        IconButton(
                            onClick = { 
                                Toast.makeText(context, "حذف السجلات المحددة", Toast.LENGTH_SHORT).show() 
                            },
                            modifier = Modifier.size(36.dp)
                        ) {
                            Icon(Icons.Default.DeleteOutline, contentDescription = "حذف", tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(22.dp))
                        }
                        IconButton(
                            onClick = { 
                                Toast.makeText(context, "الخيارات الإضافية", Toast.LENGTH_SHORT).show() 
                            },
                            modifier = Modifier.size(36.dp)
                        ) {
                            Icon(Icons.Default.MoreVert, contentDescription = "المزيد", tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(22.dp))
                        }
                        IconButton(
                            onClick = { 
                                Toast.makeText(context, "تم تحديث قائمة الأصول", Toast.LENGTH_SHORT).show() 
                            },
                            modifier = Modifier.size(36.dp)
                        ) {
                            Icon(Icons.Default.Refresh, contentDescription = "تحديث", tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(22.dp))
                        }
                        IconButton(
                            onClick = { onDeptIdChanged(null) },
                            modifier = Modifier.size(36.dp)
                        ) {
                            Icon(Icons.Default.ArrowForward, contentDescription = "رجوع", tint = MaterialTheme.colorScheme.onSurface, modifier = Modifier.size(24.dp))
                        }
                    }
                }

                HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f))

                val deptName = departments.find { it.id == selectedDeptId }?.name ?: "الأصول"
                Text(
                    text = deptName,
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 10.dp)
                )

                HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f))

                // Search & Scan Bar
                OutlinedTextField(
                    value = searchQuery,
                    onValueChange = onSearchChanged,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 8.dp)
                        .testTag("asset_search_input"),
                    placeholder = { Text("ابحث عن أصل أو امسح الباركود...") },
                    leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                    singleLine = true,
                    shape = RoundedCornerShape(12.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = MaterialTheme.colorScheme.primary,
                        unfocusedBorderColor = MaterialTheme.colorScheme.outline.copy(alpha = 0.5f)
                    ),
                    trailingIcon = {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            if (searchQuery.isNotEmpty()) {
                                IconButton(onClick = { onSearchChanged("") }) {
                                    Icon(Icons.Default.Clear, contentDescription = "Clear search")
                                }
                            }
                            IconButton(
                                onClick = {
                                    val options = com.journeyapps.barcodescanner.ScanOptions()
                                    options.setDesiredBarcodeFormats(com.journeyapps.barcodescanner.ScanOptions.ALL_CODE_TYPES)
                                    options.setPrompt("امسح باركود الأصل")
                                    options.setCameraId(0)
                                    options.setBeepEnabled(true)
                                    options.setBarcodeImageEnabled(true)
                                    scanLauncher.launch(options)
                                }
                            ) {
                                Icon(Icons.Default.QrCodeScanner, contentDescription = "Scan Barcode", tint = MaterialTheme.colorScheme.primary)
                            }
                        }
                    }
                )

                // Main List of Assets
                if (assets.isEmpty()) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .weight(1f),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.Center
                        ) {
                            Icon(
                                Icons.Default.Inventory2,
                                contentDescription = "Empty assets",
                                tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.4f),
                                modifier = Modifier.size(72.dp)
                            )
                            Spacer(modifier = Modifier.height(16.dp))
                            Text(
                                text = "لا توجد أصول في هذا القسم، اضغط على زر التعديل بالأسفل لإضافة أصل جديد",
                                style = MaterialTheme.typography.bodyLarge,
                                fontWeight = FontWeight.Medium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                textAlign = TextAlign.Center
                            )
                        }
                    }
                } else {
                    LazyColumn(
                        modifier = Modifier
                            .fillMaxWidth()
                            .weight(1f),
                        contentPadding = PaddingValues(bottom = 80.dp)
                    ) {
                        items(assets, key = { it.asset.id }) { assetDetails ->
                            DepartmentAssetRowItem(
                                item = assetDetails,
                                onClick = { selectedAssetForDetail = assetDetails },
                                onEditClick = { showEditDialog = assetDetails },
                                onSendClick = { showTransferDialog = assetDetails }
                            )
                            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.3f))
                        }
                    }
                }
            }
        }
    }

    // Modal: Asset Detail Screen
    selectedAssetForDetail?.let { current ->
        AssetDetailsDialog(
            assetDetails = current,
            onDismiss = { selectedAssetForDetail = null },
            currencyFormatter = currencyFormatter,
            transfers = transfers.filter { it.record.assetId == current.asset.id },
            onTransferClick = {
                showTransferDialog = current
                selectedAssetForDetail = null
            },
            onEditClick = {
                showEditDialog = current
                selectedAssetForDetail = null
            },
            onDeleteClick = {
                showDeleteConfirmDialog = current.asset
                selectedAssetForDetail = null
            }
        )
    }

    // Modal: Add Asset Dialog
    if (showAddDialog) {
        AddAssetDialog(
            departments = departments,
            initialDeptId = selectedDeptId,
            onDismiss = { showAddDialog = false },
            onSave = { name, serial, type, desc, deptId, condition, model, quantity, imageUri, id, accessories, manufacturer ->
                onAddAsset(name, serial, type, desc, deptId, condition, model, quantity, imageUri, id, accessories, manufacturer)
                showAddDialog = false
            }
        )
    }

    // Modal: Edit Asset Dialog
    showEditDialog?.let { current ->
        EditAssetDialog(
            assetDetails = current,
            departments = departments,
            onDismiss = { showEditDialog = null },
            onSave = { updatedAsset ->
                onUpdateAsset(updatedAsset)
                showEditDialog = null
            }
        )
    }

    // Modal: Transfer Asset Dialog
    showTransferDialog?.let { current ->
        TransferAssetDialog(
            assetWithDetails = current,
            departments = departments,
            onDismiss = { showTransferDialog = null },
            onConfirmTransfer = { toDeptId, authorizedBy, notes ->
                onTransferAsset(current.asset.id, current.asset.currentDepartmentId, toDeptId, authorizedBy, notes)
                showTransferDialog = null
            }
        )
    }

    // Modal: Delete Confirm Dialog
    showDeleteConfirmDialog?.let { asset ->
        AlertDialog(
            onDismissRequest = { showDeleteConfirmDialog = null },
            title = { Text("تأكيد حذف الأصل؟", fontWeight = FontWeight.Bold) },
            text = { Text("هل أنت متأكد من حذف الأصل '${asset.name}' بشكل نهائي من قاعدة البيانات؟ لا يمكن التراجع عن هذا الإجراء.") },
            confirmButton = {
                Button(
                    onClick = {
                        onDeleteAsset(asset)
                        showDeleteConfirmDialog = null
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error)
                ) {
                    Text("نعم، حذف")
                }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteConfirmDialog = null }) {
                    Text("إلغاء")
                }
            }
        )
    }
}

// Icon helper sized
@Composable
fun Icon(imageVector: ImageVector, contentDescription: String?, size: androidx.compose.ui.unit.Dp) {
    Icon(imageVector, contentDescription, modifier = Modifier.size(size))
}

@Composable
fun AssetDeckCard(
    item: AssetWithDetails,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .aspectRatio(0.85f)
            .clickable(onClick = onClick)
            .testTag("asset_item_${item.asset.id}"),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = AssistChipDefaults.assistChipBorder(enabled = true),
        shape = RoundedCornerShape(16.dp)
    ) {
        Column(
            modifier = Modifier.fillMaxSize(),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Asset Image Header
            if (!item.asset.imageUri.isNullOrBlank()) {
                AsyncImage(
                    model = item.asset.imageUri,
                    contentDescription = item.asset.name,
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f)
                        .background(MaterialTheme.colorScheme.surfaceVariant),
                    contentScale = ContentScale.Crop
                )
            } else {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f)
                        .background(MaterialTheme.colorScheme.surfaceVariant),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = if (item.asset.type == "FIXED") Icons.Default.Business else Icons.Default.DirectionsCar,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f),
                        modifier = Modifier.size(48.dp)
                    )
                }
            }

            // Asset Details Footer
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(12.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = item.asset.id.ifBlank { "N/A" },
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.primary,
                    fontWeight = FontWeight.Bold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = item.asset.name,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    textAlign = TextAlign.Center
                )
            }
        }
    }
}

@Composable
fun DepartmentAssetRowItem(
    item: AssetWithDetails,
    onClick: () -> Unit,
    onEditClick: () -> Unit,
    onSendClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(vertical = 12.dp, horizontal = 4.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .size(72.dp)
                .clip(RoundedCornerShape(10.dp))
                .background(MaterialTheme.colorScheme.surfaceVariant),
            contentAlignment = Alignment.Center
        ) {
            if (!item.asset.imageUri.isNullOrBlank()) {
                AsyncImage(
                    model = item.asset.imageUri,
                    contentDescription = item.asset.name,
                    modifier = Modifier.fillMaxSize(),
                    contentScale = ContentScale.Crop
                )
            } else {
                Icon(
                    imageVector = when (item.asset.type) {
                        "BIOMEDICAL" -> Icons.Default.MedicalServices
                        "FIXED" -> Icons.Default.Business
                        else -> Icons.Default.Inventory2
                    },
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f),
                    modifier = Modifier.size(36.dp)
                )
            }
        }

        Column(
            modifier = Modifier
                .weight(1f)
                .padding(horizontal = 14.dp),
            verticalArrangement = Arrangement.Center
        ) {
            Text(
                text = item.asset.name,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = item.asset.id,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                fontWeight = FontWeight.Medium
            )
        }

        Column(
            modifier = Modifier.height(72.dp),
            horizontalAlignment = Alignment.End,
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            Text(
                text = item.asset.model.ifBlank { item.asset.serialNumber }.ifBlank { "N/A" },
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                fontWeight = FontWeight.Medium
            )

            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(
                    onClick = onEditClick,
                    modifier = Modifier.size(32.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Edit,
                        contentDescription = "تعديل الأصل",
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.size(20.dp)
                    )
                }
                IconButton(
                    onClick = onSendClick,
                    modifier = Modifier.size(32.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Send,
                        contentDescription = "نقل الأصل",
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.size(20.dp)
                    )
                }
            }
        }
    }
}

@Composable
fun AssetCard(
    item: AssetWithDetails,
    currencyFormatter: NumberFormat,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .testTag("asset_item_${item.asset.id}"),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = AssistChipDefaults.assistChipBorder(enabled = true),
        shape = RoundedCornerShape(16.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Asset Image or Icon Badge depending on Type
            val isFixed = item.asset.type == "FIXED"
            val badgeColor = if (isFixed) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.secondaryContainer
            val icon = if (isFixed) Icons.Default.Business else Icons.Default.DirectionsCar
            val tintColor = if (isFixed) MaterialTheme.colorScheme.onPrimaryContainer else MaterialTheme.colorScheme.onSecondaryContainer

            if (!item.asset.imageUri.isNullOrBlank()) {
                AsyncImage(
                    model = item.asset.imageUri,
                    contentDescription = item.asset.name,
                    modifier = Modifier
                        .size(48.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(MaterialTheme.colorScheme.surfaceVariant),
                    contentScale = ContentScale.Crop
                )
            } else {
                Box(
                    modifier = Modifier
                        .size(48.dp)
                        .background(MaterialTheme.colorScheme.surfaceVariant, RoundedCornerShape(12.dp)),
                    contentAlignment = Alignment.Center
                ) {
                    Box(
                        modifier = Modifier
                            .size(24.dp)
                            .background(badgeColor, RoundedCornerShape(6.dp)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = icon,
                            contentDescription = null,
                            tint = tintColor,
                            modifier = Modifier.size(14.dp)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.width(14.dp))

            Column(modifier = Modifier.weight(1f)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        modifier = Modifier.weight(1f)
                    ) {
                        Text(
                            text = item.asset.name,
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        if (item.asset.id.isNotBlank()) {
                            Box(
                                modifier = Modifier
                                    .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.1f), RoundedCornerShape(6.dp))
                                    .padding(horizontal = 6.dp, vertical = 2.dp)
                            ) {
                                Text(
                                    text = item.asset.id,
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.primary,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                    }

                    ConditionIndicator(condition = item.asset.condition)
                }

                Spacer(modifier = Modifier.height(4.dp))

                if (item.asset.model.isNotBlank()) {
                    Text(
                        text = "الموديل: ${item.asset.model}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        fontWeight = FontWeight.Medium
                    )
                    Spacer(modifier = Modifier.height(2.dp))
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "الرقم التسلسلي: ${item.asset.serialNumber}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.outline
                    )

                    Text(
                        text = "الكمية: ${item.asset.quantity} قطع",
                        style = MaterialTheme.typography.bodySmall,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.secondary
                    )
                }

                Spacer(modifier = Modifier.height(6.dp))

                Divider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.1f))

                Spacer(modifier = Modifier.height(6.dp))

                Row(
                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.MapsHomeWork,
                        contentDescription = "Department",
                        tint = MaterialTheme.colorScheme.secondary,
                        modifier = Modifier.size(14.dp)
                    )
                    Text(
                        text = item.departmentName,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.secondary,
                        fontWeight = FontWeight.SemiBold
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Box(
                        modifier = Modifier
                            .background(MaterialTheme.colorScheme.surfaceVariant, RoundedCornerShape(4.dp))
                            .padding(horizontal = 6.dp, vertical = 2.dp)
                    ) {
                        Text(
                            text = if (isFixed) "أصل ثابت" else "أصل منقول",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun ConditionIndicator(condition: String, modifier: Modifier = Modifier) {
    val (label, containerColor, textColor) = when (condition) {
        "NEW" -> Triple("جديد", Color(0xFFE8F5E9), Color(0xFF2E7D32))
        "EXCELLENT" -> Triple("ممتاز", Color(0xFFE3F2FD), Color(0xFF1565C0))
        "GOOD" -> Triple("جيد", Color(0xFFFFFDE7), Color(0xFFF57F17))
        "POOR" -> Triple("تالف/يحتاج صيانة", Color(0xFFFFEBEE), Color(0xFFC62828))
        else -> Triple(condition, Color.Gray.copy(alpha = 0.1f), Color.DarkGray)
    }

    Box(
        modifier = modifier
            .background(containerColor, CircleShape)
            .padding(horizontal = 8.dp, vertical = 3.dp)
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall,
            fontWeight = FontWeight.Bold,
            color = textColor
        )
    }
}

// Modal implementations
@Composable
fun AddAssetDialog(
    departments: List<Department>,
    initialDeptId: Int? = null,
    onDismiss: () -> Unit,
    onSave: (String, String, String, String, Int, String, String, Int, String?, String, String, String) -> Unit
) {
    var name by remember { mutableStateOf("") }
    var serialNumber by remember { mutableStateOf("") }
    var selectedType by remember { mutableStateOf("طبي") } // طبي، أثاث، ...
    var description by remember { mutableStateOf("") }
    var selectedDeptId by remember { mutableStateOf<Int?>(initialDeptId) }
    var selectedCondition by remember { mutableStateOf("NEW") } // NEW, EXCELLENT, GOOD, POOR
    
    // New fields
    var model by remember { mutableStateOf("") }
    var quantityStr by remember { mutableStateOf("1") }
    var imageUri by remember { mutableStateOf<String?>(null) }
    var assetCode by remember { mutableStateOf("") }
    var manufacturer by remember { mutableStateOf("") }
    var accessories by remember { mutableStateOf("") }

    var nameError by remember { mutableStateOf(false) }
    var serialError by remember { mutableStateOf(false) }
    var deptError by remember { mutableStateOf(false) }

    val context = LocalContext.current
    val storageService = remember { LocalImageStorageService(context) }
    val coroutineScope = rememberCoroutineScope()

    var selectedImageUri by remember { mutableStateOf<Uri?>(null) }
    var capturedBitmap by remember { mutableStateOf<Bitmap?>(null) }
    var showImagePickerDialog by remember { mutableStateOf(false) }

    val galleryLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri ->
        uri?.let {
            selectedImageUri = it
            capturedBitmap = null
            imageUri = null
        }
    }

    val cameraLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.TakePicturePreview()
    ) { bitmap ->
        bitmap?.let {
            capturedBitmap = it
            selectedImageUri = null
            imageUri = null
        }
    }

    val barcodeLauncher = rememberLauncherForActivityResult(
        contract = ScanContract()
    ) { result ->
        if (result.contents != null) {
            serialNumber = result.contents
        }
    }

    // Auto-select department if null
    LaunchedEffect(departments, initialDeptId) {
        if (selectedDeptId == null && departments.isNotEmpty()) {
            selectedDeptId = initialDeptId ?: departments.first().id
        }
    }

    Dialog(onDismissRequest = onDismiss) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
                .testTag("add_asset_dialog_card"),
            shape = RoundedCornerShape(20.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
        ) {
            LazyColumn(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                item {
                    Text(
                        text = "تسجيل أصل جديد",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.fillMaxWidth(),
                        textAlign = TextAlign.Start
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                }

                // Name Input
                item {
                    OutlinedTextField(
                        value = name,
                        onValueChange = {
                            name = it
                            nameError = it.isBlank()
                        },
                        label = { Text("اسم الأصل *") },
                        isError = nameError,
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )
                }

                // Asset Code Input
                item {
                    OutlinedTextField(
                        value = assetCode,
                        onValueChange = { assetCode = it },
                        label = { Text("كود الأصل التعريفي (Asset Tag / Code)") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        leadingIcon = { Icon(Icons.Default.QrCode, contentDescription = null, modifier = Modifier.size(20.dp)) }
                    )
                }

                // Model Input
                item {
                    OutlinedTextField(
                        value = model,
                        onValueChange = { model = it },
                        label = { Text("موديل الأصل (Model / Version)") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )
                }

                // Quantity Input
                item {
                    OutlinedTextField(
                        value = quantityStr,
                        onValueChange = { quantityStr = it },
                        label = { Text("الكمية المتوفرة *") },
                        modifier = Modifier.fillMaxWidth(),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        singleLine = true
                    )
                }

                // Serial Number Input
                item {
                    OutlinedTextField(
                        value = serialNumber,
                        onValueChange = {
                            serialNumber = it
                        },
                        label = { Text("الرقم التسلسلي (SN)") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        trailingIcon = {
                            IconButton(onClick = {
                                val scanOptions = ScanOptions().apply {
                                    setDesiredBarcodeFormats(ScanOptions.ALL_CODE_TYPES)
                                    setPrompt("وجه الكاميرا نحو الرمز الشريطي (Barcode) أو الرقم التسلسلي للالتقاط")
                                    setBeepEnabled(true)
                                    setOrientationLocked(false)
                                    setBarcodeImageEnabled(true)
                                }
                                barcodeLauncher.launch(scanOptions)
                            }) {
                                Icon(
                                    imageVector = Icons.Default.QrCodeScanner,
                                    contentDescription = "مسح الرمز الشريطي بالكاميرا",
                                    tint = MaterialTheme.colorScheme.primary
                                )
                            }
                        }
                    )
                }

                // Manufacturer Input
                item {
                    OutlinedTextField(
                        value = manufacturer,
                        onValueChange = { manufacturer = it },
                        label = { Text("الشركة المصنعة (Manufacturer)") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )
                }

                // Image Selection Section
                item {
                    Column {
                        Text("صورة الأصل:", style = MaterialTheme.typography.labelMedium)
                        Spacer(modifier = Modifier.height(6.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            if (capturedBitmap != null) {
                                Image(
                                    bitmap = capturedBitmap!!.asImageBitmap(),
                                    contentDescription = "Asset image preview",
                                    modifier = Modifier
                                        .size(64.dp)
                                        .clip(RoundedCornerShape(8.dp))
                                        .border(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.5f), RoundedCornerShape(8.dp)),
                                    contentScale = ContentScale.Crop
                                )
                            } else if (selectedImageUri != null) {
                                AsyncImage(
                                    model = selectedImageUri,
                                    contentDescription = "Asset image preview",
                                    modifier = Modifier
                                        .size(64.dp)
                                        .clip(RoundedCornerShape(8.dp))
                                        .border(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.5f), RoundedCornerShape(8.dp)),
                                    contentScale = ContentScale.Crop
                                )
                            } else if (!imageUri.isNullOrBlank()) {
                                AsyncImage(
                                    model = imageUri,
                                    contentDescription = "Asset image preview",
                                    modifier = Modifier
                                        .size(64.dp)
                                        .clip(RoundedCornerShape(8.dp))
                                        .border(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.5f), RoundedCornerShape(8.dp)),
                                    contentScale = ContentScale.Crop
                                )
                            } else {
                                Box(
                                    modifier = Modifier
                                        .size(64.dp)
                                        .background(MaterialTheme.colorScheme.surfaceVariant, RoundedCornerShape(8.dp))
                                        .border(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.5f), RoundedCornerShape(8.dp)),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(Icons.Default.Image, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                            }

                            Button(
                                onClick = { showImagePickerDialog = true },
                                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.secondaryContainer, contentColor = MaterialTheme.colorScheme.onSecondaryContainer)
                            ) {
                                Icon(Icons.Default.PhotoCamera, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("تحميل صورة")
                            }

                            if (capturedBitmap != null || selectedImageUri != null || !imageUri.isNullOrBlank()) {
                                TextButton(onClick = {
                                    capturedBitmap = null
                                    selectedImageUri = null
                                    imageUri = null
                                }) {
                                    Text("إزالة", color = MaterialTheme.colorScheme.error)
                                }
                            }
                        }
                    }
                }

                // Type selector
                item {
                    OutlinedTextField(
                        value = selectedType,
                        onValueChange = { selectedType = it },
                        label = { Text("نوع الأصل (مثال: طبي، أثاث...)") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        ElevatedFilterChip(
                            selected = selectedType == "طبي",
                            onClick = { selectedType = "طبي" },
                            label = { Text("طبي") }
                        )
                        ElevatedFilterChip(
                            selected = selectedType == "أثاث",
                            onClick = { selectedType = "أثاث" },
                            label = { Text("أثاث") }
                        )
                        ElevatedFilterChip(
                            selected = selectedType == "إلكترونيات",
                            onClick = { selectedType = "إلكترونيات" },
                            label = { Text("إلكترونيات") }
                        )
                    }
                }

                // Category & Cost removed

                // Initial Department Dropdown
                item {
                    Text("القسم الحالي *", style = MaterialTheme.typography.labelMedium)
                    var expanded by remember { mutableStateOf(false) }
                    val selectedDeptName = departments.find { it.id == selectedDeptId }?.name ?: "اختر قسم رئيسي"

                    Box(modifier = Modifier.fillMaxWidth()) {
                        OutlinedTextField(
                            value = selectedDeptName,
                            onValueChange = {},
                            readOnly = true,
                            isError = deptError,
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { expanded = true },
                            trailingIcon = {
                                IconButton(onClick = { expanded = true }) {
                                    Icon(Icons.Default.ArrowDropDown, contentDescription = null)
                                }
                            }
                        )

                        DropdownMenu(
                            expanded = expanded,
                            onDismissRequest = { expanded = false },
                            modifier = Modifier.fillMaxWidth(0.8f)
                        ) {
                            departments.forEach { dept ->
                                DropdownMenuItem(
                                    text = { Text(dept.name) },
                                    onClick = {
                                        selectedDeptId = dept.id
                                        deptError = false
                                        expanded = false
                                    }
                                )
                            }
                        }
                    }
                }

                // Condition selection
                item {
                    Text("حالة الأصل التشغيلية:", style = MaterialTheme.typography.labelMedium)
                    var expanded by remember { mutableStateOf(false) }
                    val currentConditionLabel = when (selectedCondition) {
                        "NEW" -> "جديد"
                        "EXCELLENT" -> "ممتاز"
                        "GOOD" -> "جيد"
                        "POOR" -> "يحتاج صيانة أو تالف"
                        else -> selectedCondition
                    }

                    Box(modifier = Modifier.fillMaxWidth()) {
                        OutlinedTextField(
                            value = currentConditionLabel,
                            onValueChange = {},
                            readOnly = true,
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { expanded = true },
                            trailingIcon = {
                                IconButton(onClick = { expanded = true }) {
                                    Icon(Icons.Default.ArrowDropDown, contentDescription = null)
                                }
                            }
                        )

                        DropdownMenu(
                            expanded = expanded,
                            onDismissRequest = { expanded = false }
                        ) {
                            DropdownMenuItem(text = { Text("جديد") }, onClick = { selectedCondition = "NEW"; expanded = false })
                            DropdownMenuItem(text = { Text("ممتاز") }, onClick = { selectedCondition = "EXCELLENT"; expanded = false })
                            DropdownMenuItem(text = { Text("جيد") }, onClick = { selectedCondition = "GOOD"; expanded = false })
                            DropdownMenuItem(text = { Text("يحتاج صيانة أو تالف") }, onClick = { selectedCondition = "POOR"; expanded = false })
                        }
                    }
                }

                // Accessories
                item {
                    OutlinedTextField(
                        value = accessories,
                        onValueChange = { accessories = it },
                        label = { Text("ملحقات الجهاز (اختياري)") },
                        modifier = Modifier.fillMaxWidth(),
                        maxLines = 2
                    )
                }

                // Description
                item {
                    OutlinedTextField(
                        value = description,
                        onValueChange = { description = it },
                        label = { Text("ملاحظات / وصف الأصل") },
                        modifier = Modifier.fillMaxWidth(),
                        maxLines = 3
                    )
                }

                // CTA Buttons
                item {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(top = 10.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        OutlinedButton(
                            onClick = onDismiss,
                            modifier = Modifier.weight(1f)
                        ) {
                            Text("إلغاء")
                        }
                        Button(
                            onClick = {
                                val qty = quantityStr.toIntOrNull() ?: 1
                                if (name.isBlank()) nameError = true
                                if (selectedDeptId == null) deptError = true

                                if (name.isNotBlank() && selectedDeptId != null) {
                                    val assetIdToSave = assetCode.trim().ifBlank { "AST-${System.currentTimeMillis() % 10000}" }
                                    coroutineScope.launch {
                                        var finalImageUri: String? = imageUri
                                        if (capturedBitmap != null) {
                                            finalImageUri = storageService.saveBitmapLocally(capturedBitmap!!, assetIdToSave)
                                        } else if (selectedImageUri != null) {
                                            finalImageUri = storageService.saveImageLocally(selectedImageUri!!, assetIdToSave)
                                        }
                                        onSave(name, serialNumber, selectedType, description, selectedDeptId!!, selectedCondition, model, qty, finalImageUri, assetIdToSave, accessories, manufacturer)
                                    }
                                }
                            },
                            modifier = Modifier
                                .weight(1.5f)
                                .testTag("save_asset_button")
                        ) {
                            Text("حفظ الأصل")
                        }
                    }
                }
            }
        }
    }

    if (showImagePickerDialog) {
        AlertDialog(
            onDismissRequest = { showImagePickerDialog = false },
            title = { Text("إضافة صورة للأصل", fontWeight = FontWeight.Bold) },
            text = { Text("اختر طريقة التقاط أو رفع صورة الأصل لحفظها محلياً في ذاكرة الهاتف:") },
            confirmButton = {
                Button(
                    onClick = {
                        cameraLauncher.launch(null)
                        showImagePickerDialog = false
                    }
                ) {
                    Icon(Icons.Default.PhotoCamera, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("الكاميرا")
                }
            },
            dismissButton = {
                FilledTonalButton(
                    onClick = {
                        galleryLauncher.launch("image/*")
                        showImagePickerDialog = false
                    }
                ) {
                    Icon(Icons.Default.PhotoLibrary, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("الاستوديو")
                }
            }
        )
    }
}

@Composable
fun EditAssetDialog(
    assetDetails: AssetWithDetails,
    departments: List<Department>,
    onDismiss: () -> Unit,
    onSave: (Asset) -> Unit
) {
    var name by remember { mutableStateOf(assetDetails.asset.name) }
    var serialNumber by remember { mutableStateOf(assetDetails.asset.serialNumber) }
    var selectedType by remember { mutableStateOf(assetDetails.asset.type) }
    var description by remember { mutableStateOf(assetDetails.asset.description) }
    var selectedDeptId by remember { mutableStateOf<Int>(assetDetails.asset.currentDepartmentId) }
    var selectedCondition by remember { mutableStateOf(assetDetails.asset.condition) }
    var selectedStatus by remember { mutableStateOf(assetDetails.asset.status) }

    // New Fields
    var assetCode by remember { mutableStateOf(assetDetails.asset.id) }
    var model by remember { mutableStateOf(assetDetails.asset.model) }
    var quantityStr by remember { mutableStateOf(assetDetails.asset.quantity.toString()) }
    var imageUri by remember { mutableStateOf<String?>(assetDetails.asset.imageUri) }
    var manufacturer by remember { mutableStateOf(assetDetails.asset.manufacturer) }
    var accessories by remember { mutableStateOf(assetDetails.asset.accessories) }

    val context = LocalContext.current
    val storageService = remember { LocalImageStorageService(context) }
    val coroutineScope = rememberCoroutineScope()

    var selectedImageUri by remember { mutableStateOf<Uri?>(null) }
    var capturedBitmap by remember { mutableStateOf<Bitmap?>(null) }
    var showImagePickerDialog by remember { mutableStateOf(false) }

    val galleryLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri ->
        uri?.let {
            selectedImageUri = it
            capturedBitmap = null
            imageUri = null
        }
    }

    val cameraLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.TakePicturePreview()
    ) { bitmap ->
        bitmap?.let {
            capturedBitmap = it
            selectedImageUri = null
            imageUri = null
        }
    }

    val barcodeLauncher = rememberLauncherForActivityResult(
        contract = ScanContract()
    ) { result ->
        if (result.contents != null) {
            serialNumber = result.contents
        }
    }

    Dialog(onDismissRequest = onDismiss) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            shape = RoundedCornerShape(20.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
        ) {
            LazyColumn(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                item {
                    Text(
                        text = "تعديل بيانات الأصل",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                }

                item {
                    OutlinedTextField(
                        value = name,
                        onValueChange = { name = it },
                        label = { Text("اسم الأصل *") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )
                }

                // Asset Code Input
                item {
                    OutlinedTextField(
                        value = assetCode,
                        onValueChange = { assetCode = it },
                        label = { Text("كود الأصل التعريفي (Asset Tag / Code)") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        leadingIcon = { Icon(Icons.Default.QrCode, contentDescription = null, modifier = Modifier.size(20.dp)) }
                    )
                }

                // Model Input
                item {
                    OutlinedTextField(
                        value = model,
                        onValueChange = { model = it },
                        label = { Text("موديل الأصل (Model / Version)") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )
                }

                // Quantity Input
                item {
                    OutlinedTextField(
                        value = quantityStr,
                        onValueChange = { quantityStr = it },
                        label = { Text("الكمية المتوفرة *") },
                        modifier = Modifier.fillMaxWidth(),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        singleLine = true
                    )
                }

                item {
                    OutlinedTextField(
                        value = serialNumber,
                        onValueChange = { serialNumber = it },
                        label = { Text("الرقم التسلسلي (SN)") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        trailingIcon = {
                            IconButton(onClick = {
                                val scanOptions = ScanOptions().apply {
                                    setDesiredBarcodeFormats(ScanOptions.ALL_CODE_TYPES)
                                    setPrompt("وجه الكاميرا نحو الرمز الشريطي (Barcode) أو الرقم التسلسلي للالتقاط")
                                    setBeepEnabled(true)
                                    setOrientationLocked(false)
                                    setBarcodeImageEnabled(true)
                                }
                                barcodeLauncher.launch(scanOptions)
                            }) {
                                Icon(
                                    imageVector = Icons.Default.QrCodeScanner,
                                    contentDescription = "مسح الرمز الشريطي بالكاميرا",
                                    tint = MaterialTheme.colorScheme.primary
                                )
                            }
                        }
                    )
                }

                // Manufacturer Input
                item {
                    OutlinedTextField(
                        value = manufacturer,
                        onValueChange = { manufacturer = it },
                        label = { Text("الشركة المصنعة (Manufacturer)") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )
                }

                // Image Selection Section
                item {
                    Column {
                        Text("صورة الأصل:", style = MaterialTheme.typography.labelMedium)
                        Spacer(modifier = Modifier.height(6.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            if (capturedBitmap != null) {
                                Image(
                                    bitmap = capturedBitmap!!.asImageBitmap(),
                                    contentDescription = "Asset image preview",
                                    modifier = Modifier
                                        .size(64.dp)
                                        .clip(RoundedCornerShape(8.dp))
                                        .border(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.5f), RoundedCornerShape(8.dp)),
                                    contentScale = ContentScale.Crop
                                )
                            } else if (selectedImageUri != null) {
                                AsyncImage(
                                    model = selectedImageUri,
                                    contentDescription = "Asset image preview",
                                    modifier = Modifier
                                        .size(64.dp)
                                        .clip(RoundedCornerShape(8.dp))
                                        .border(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.5f), RoundedCornerShape(8.dp)),
                                    contentScale = ContentScale.Crop
                                )
                            } else if (!imageUri.isNullOrBlank()) {
                                AsyncImage(
                                    model = imageUri,
                                    contentDescription = "Asset image preview",
                                    modifier = Modifier
                                        .size(64.dp)
                                        .clip(RoundedCornerShape(8.dp))
                                        .border(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.5f), RoundedCornerShape(8.dp)),
                                    contentScale = ContentScale.Crop
                                )
                            } else {
                                Box(
                                    modifier = Modifier
                                        .size(64.dp)
                                        .background(MaterialTheme.colorScheme.surfaceVariant, RoundedCornerShape(8.dp))
                                        .border(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.5f), RoundedCornerShape(8.dp)),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(Icons.Default.Image, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                            }

                            Button(
                                onClick = { showImagePickerDialog = true },
                                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.secondaryContainer, contentColor = MaterialTheme.colorScheme.onSecondaryContainer)
                            ) {
                                Icon(Icons.Default.PhotoCamera, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("تغيير الصورة")
                            }

                            if (capturedBitmap != null || selectedImageUri != null || !imageUri.isNullOrBlank()) {
                                TextButton(onClick = {
                                    capturedBitmap = null
                                    selectedImageUri = null
                                    imageUri = null
                                }) {
                                    Text("إزالة", color = MaterialTheme.colorScheme.error)
                                }
                            }
                        }
                    }
                }

                item {
                    OutlinedTextField(
                        value = selectedType,
                        onValueChange = { selectedType = it },
                        label = { Text("نوع الأصل (مثال: طبي، أثاث...)") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        ElevatedFilterChip(
                            selected = selectedType == "طبي",
                            onClick = { selectedType = "طبي" },
                            label = { Text("طبي") }
                        )
                        ElevatedFilterChip(
                            selected = selectedType == "أثاث",
                            onClick = { selectedType = "أثاث" },
                            label = { Text("أثاث") }
                        )
                        ElevatedFilterChip(
                            selected = selectedType == "إلكترونيات",
                            onClick = { selectedType = "إلكترونيات" },
                            label = { Text("إلكترونيات") }
                        )
                    }
                }

                // Category & cost removed

                // Department
                item {
                    Text("القسم الحالي *", style = MaterialTheme.typography.labelMedium)
                    var expanded by remember { mutableStateOf(false) }
                    val selectedDeptName = departments.find { it.id == selectedDeptId }?.name ?: "اختر قسم رئيسي"

                    Box(modifier = Modifier.fillMaxWidth()) {
                        OutlinedTextField(
                            value = selectedDeptName,
                            onValueChange = {},
                            readOnly = true,
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { expanded = true },
                            trailingIcon = {
                                IconButton(onClick = { expanded = true }) {
                                    Icon(Icons.Default.ArrowDropDown, contentDescription = null)
                                }
                            }
                        )

                        DropdownMenu(
                            expanded = expanded,
                            onDismissRequest = { expanded = false }
                        ) {
                            departments.forEach { dept ->
                                DropdownMenuItem(
                                    text = { Text(dept.name) },
                                    onClick = {
                                        selectedDeptId = dept.id
                                        expanded = false
                                    }
                                )
                            }
                        }
                    }
                }

                // Condition
                item {
                    Text("حالة الأصل التشغيلية:", style = MaterialTheme.typography.labelMedium)
                    var expanded by remember { mutableStateOf(false) }
                    val currentConditionLabel = when (selectedCondition) {
                        "NEW" -> "جديد"
                        "EXCELLENT" -> "ممتاز"
                        "GOOD" -> "جيد"
                        "POOR" -> "يحتاج صيانة أو تالف"
                        else -> selectedCondition
                    }

                    Box(modifier = Modifier.fillMaxWidth()) {
                        OutlinedTextField(
                            value = currentConditionLabel,
                            onValueChange = {},
                            readOnly = true,
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { expanded = true },
                            trailingIcon = {
                                IconButton(onClick = { expanded = true }) {
                                    Icon(Icons.Default.ArrowDropDown, contentDescription = null)
                                }
                            }
                        )

                        DropdownMenu(
                            expanded = expanded,
                            onDismissRequest = { expanded = false }
                        ) {
                            DropdownMenuItem(text = { Text("جديد") }, onClick = { selectedCondition = "NEW"; expanded = false })
                            DropdownMenuItem(text = { Text("ممتاز") }, onClick = { selectedCondition = "EXCELLENT"; expanded = false })
                            DropdownMenuItem(text = { Text("جيد") }, onClick = { selectedCondition = "GOOD"; expanded = false })
                            DropdownMenuItem(text = { Text("يحتاج صيانة أو تالف") }, onClick = { selectedCondition = "POOR"; expanded = false })
                        }
                    }
                }

                // Status
                item {
                    Text("حالة النشاط:", style = MaterialTheme.typography.labelMedium)
                    var expanded by remember { mutableStateOf(false) }
                    val statusLabel = when (selectedStatus) {
                        "ACTIVE" -> "نشط في الخدمة"
                        "MAINTENANCE" -> "خاضع للصيانة"
                        "SCRAPPED" -> "خارج الخدمة / تالف"
                        else -> selectedStatus
                    }

                    Box(modifier = Modifier.fillMaxWidth()) {
                        OutlinedTextField(
                            value = statusLabel,
                            onValueChange = {},
                            readOnly = true,
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { expanded = true },
                            trailingIcon = {
                                IconButton(onClick = { expanded = true }) {
                                    Icon(Icons.Default.ArrowDropDown, contentDescription = null)
                                }
                            }
                        )

                        DropdownMenu(
                            expanded = expanded,
                            onDismissRequest = { expanded = false }
                        ) {
                            DropdownMenuItem(text = { Text("نشط في الخدمة") }, onClick = { selectedStatus = "ACTIVE"; expanded = false })
                            DropdownMenuItem(text = { Text("خاضع للصيانة") }, onClick = { selectedStatus = "MAINTENANCE"; expanded = false })
                            DropdownMenuItem(text = { Text("خارج الخدمة / تالف") }, onClick = { selectedStatus = "SCRAPPED"; expanded = false })
                        }
                    }
                }

                // Accessories
                item {
                    OutlinedTextField(
                        value = accessories,
                        onValueChange = { accessories = it },
                        label = { Text("ملحقات الجهاز (اختياري)") },
                        modifier = Modifier.fillMaxWidth(),
                        maxLines = 2
                    )
                }

                // Description
                item {
                    OutlinedTextField(
                        value = description,
                        onValueChange = { description = it },
                        label = { Text("الوصف") },
                        modifier = Modifier.fillMaxWidth(),
                        maxLines = 3
                    )
                }

                // Buttons
                item {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(top = 10.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        OutlinedButton(onClick = onDismiss, modifier = Modifier.weight(1f)) {
                            Text("إلغاء")
                        }
                        Button(
                            onClick = {
                                if (name.isNotBlank()) {
                                    val assetIdToSave = assetCode.trim().ifBlank { assetDetails.asset.id }
                                    coroutineScope.launch {
                                        var finalImageUri: String? = imageUri
                                        if (capturedBitmap != null) {
                                            finalImageUri = storageService.saveBitmapLocally(capturedBitmap!!, assetIdToSave)
                                        } else if (selectedImageUri != null) {
                                            finalImageUri = storageService.saveImageLocally(selectedImageUri!!, assetIdToSave)
                                        }

                                        val updated = assetDetails.asset.copy(
                                            name = name,
                                            serialNumber = serialNumber,
                                            type = selectedType,
                                            description = description,
                                            currentDepartmentId = selectedDeptId,
                                            condition = selectedCondition,
                                            status = selectedStatus,
                                            model = model,
                                            quantity = quantityStr.toIntOrNull() ?: 1,
                                            imageUri = finalImageUri,
                                            id = assetIdToSave,
                                            manufacturer = manufacturer,
                                            accessories = accessories
                                        )
                                        onSave(updated)
                                    }
                                }
                            },
                            modifier = Modifier.weight(1.5f)
                        ) {
                            Text("تحديث")
                        }
                    }
                }
            }
        }
    }

    if (showImagePickerDialog) {
        AlertDialog(
            onDismissRequest = { showImagePickerDialog = false },
            title = { Text("تحديث صورة الأصل", fontWeight = FontWeight.Bold) },
            text = { Text("اختر طريقة التقاط أو رفع صورة الأصل لحفظها محلياً في ذاكرة الهاتف:") },
            confirmButton = {
                Button(
                    onClick = {
                        cameraLauncher.launch(null)
                        showImagePickerDialog = false
                    }
                ) {
                    Icon(Icons.Default.PhotoCamera, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("الكاميرا")
                }
            },
            dismissButton = {
                FilledTonalButton(
                    onClick = {
                        galleryLauncher.launch("image/*")
                        showImagePickerDialog = false
                    }
                ) {
                    Icon(Icons.Default.PhotoLibrary, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("الاستوديو")
                }
            }
        )
    }
}

@Composable
fun TransferAssetDialog(
    assetWithDetails: AssetWithDetails,
    departments: List<Department>,
    onDismiss: () -> Unit,
    onConfirmTransfer: (Int, String, String) -> Unit
) {
    var selectedDeptId by remember { mutableStateOf<Int?>(null) }
    var authorizedBy by remember { mutableStateOf("") }
    var notes by remember { mutableStateOf("") }

    var deptError by remember { mutableStateOf(false) }
    var authError by remember { mutableStateOf(false) }

    val filteredDepts = departments.filter { it.id != assetWithDetails.asset.currentDepartmentId }

    Dialog(onDismissRequest = onDismiss) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            shape = RoundedCornerShape(20.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
        ) {
            LazyColumn(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                item {
                    Text(
                        text = "نقل أصل بين الأقسام",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = "أصل: ${assetWithDetails.asset.name}",
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "من قسم: ${assetWithDetails.departmentName}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.primary
                    )
                    Spacer(modifier = Modifier.height(10.dp))
                }

                // Target Department
                item {
                    Text("القسم المنقول إليه *", style = MaterialTheme.typography.labelMedium)
                    var expanded by remember { mutableStateOf(false) }
                    val targetDeptName = filteredDepts.find { it.id == selectedDeptId }?.name ?: "اختر قسم الوجهة"

                    Box(modifier = Modifier.fillMaxWidth()) {
                        OutlinedTextField(
                            value = targetDeptName,
                            onValueChange = {},
                            readOnly = true,
                            isError = deptError,
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { expanded = true },
                            trailingIcon = {
                                IconButton(onClick = { expanded = true }) {
                                    Icon(Icons.Default.ArrowDropDown, contentDescription = null)
                                }
                            }
                        )

                        DropdownMenu(
                            expanded = expanded,
                            onDismissRequest = { expanded = false },
                            modifier = Modifier.fillMaxWidth(0.8f)
                        ) {
                            if (filteredDepts.isEmpty()) {
                                DropdownMenuItem(
                                    text = { Text("لا يوجد أقسام بديلة، قم بإنشاء أقسام أولاً") },
                                    onClick = { expanded = false }
                                )
                            }
                            filteredDepts.forEach { dept ->
                                DropdownMenuItem(
                                    text = { Text(dept.name) },
                                    onClick = {
                                        selectedDeptId = dept.id
                                        deptError = false
                                        expanded = false
                                    }
                                )
                            }
                        }
                    }
                }

                // Authorizer input
                item {
                    OutlinedTextField(
                        value = authorizedBy,
                        onValueChange = {
                            authorizedBy = it
                            authError = it.isBlank()
                        },
                        label = { Text("المسؤول المعتمد للنقل *") },
                        isError = authError,
                        modifier = Modifier.fillMaxWidth()
                    )
                }

                // Transfer notes
                item {
                    OutlinedTextField(
                        value = notes,
                        onValueChange = { notes = it },
                        label = { Text("سبب النقل أو ملاحظات إضافية") },
                        modifier = Modifier.fillMaxWidth(),
                        maxLines = 3
                    )
                }

                // CTA
                item {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(top = 10.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        OutlinedButton(onClick = onDismiss, modifier = Modifier.weight(1f)) {
                            Text("إلغاء")
                        }
                        Button(
                            onClick = {
                                if (selectedDeptId == null) deptError = true
                                if (authorizedBy.isBlank()) authError = true

                                if (selectedDeptId != null && authorizedBy.isNotBlank()) {
                                    onConfirmTransfer(selectedDeptId!!, authorizedBy, notes)
                                }
                            },
                            modifier = Modifier.weight(1.5f)
                        ) {
                            Text("إتمام النقل")
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun AssetDetailsDialog(
    assetDetails: AssetWithDetails,
    currencyFormatter: NumberFormat,
    transfers: List<TransferWithDetails>,
    onDismiss: () -> Unit,
    onTransferClick: () -> Unit,
    onEditClick: () -> Unit,
    onDeleteClick: () -> Unit
) {
    val df = remember { SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()) }

    Dialog(onDismissRequest = onDismiss) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp)
                .testTag("asset_details_dialog"),
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
        ) {
            LazyColumn(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(24.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Image Header Banner if present
                if (!assetDetails.asset.imageUri.isNullOrBlank()) {
                    item {
                        AsyncImage(
                            model = assetDetails.asset.imageUri,
                            contentDescription = assetDetails.asset.name,
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(160.dp)
                                .clip(RoundedCornerShape(16.dp))
                                .background(MaterialTheme.colorScheme.surfaceVariant),
                            contentScale = ContentScale.Crop
                        )
                    }
                }

                // Header Details
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.Top
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = assetDetails.asset.name,
                                style = MaterialTheme.typography.headlineSmall,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = "الرقم التسلسلي: ${assetDetails.asset.serialNumber}",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.outline
                            )
                        }

                        IconButton(onClick = onDismiss) {
                            Icon(Icons.Default.Close, contentDescription = "Close")
                        }
                    }
                }

                // Status indicators
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        ConditionIndicator(condition = assetDetails.asset.condition)
                        
                        val isFixed = assetDetails.asset.type == "FIXED"
                        Box(
                            modifier = Modifier
                                .background(MaterialTheme.colorScheme.surfaceVariant, CircleShape)
                                .padding(horizontal = 10.dp, vertical = 3.dp)
                        ) {
                            Text(
                                text = if (isFixed) "أصل ثابت" else "أصل منقول",
                                style = MaterialTheme.typography.bodySmall,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }

                        val actionStateLabel = when (assetDetails.asset.status) {
                            "ACTIVE" -> "نشط"
                            "MAINTENANCE" -> "صيانة"
                            "SCRAPPED" -> "تالف"
                            else -> assetDetails.asset.status
                        }
                        Box(
                            modifier = Modifier
                                .background(MaterialTheme.colorScheme.outline.copy(alpha = 0.15f), CircleShape)
                                .padding(horizontal = 10.dp, vertical = 3.dp)
                        ) {
                            Text(
                                text = actionStateLabel,
                                style = MaterialTheme.typography.bodySmall,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.outline
                            )
                        }
                    }
                }

                // Core details matrix
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f)),
                        shape = RoundedCornerShape(16.dp)
                    ) {
                        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            DetailItem(label = "كود تعريفي للأصل:", value = assetDetails.asset.id.ifBlank { "غير متوفر" }, icon = Icons.Default.QrCode)
                            DetailItem(label = "الموديل:", value = assetDetails.asset.model.ifBlank { "غير متوفر" }, icon = Icons.Default.Dns)
                            DetailItem(label = "الشركة المصنعة:", value = assetDetails.asset.manufacturer.ifBlank { "غير متوفر" }, icon = Icons.Default.PrecisionManufacturing)
                            DetailItem(label = "الكمية المتوفرة:", value = "${assetDetails.asset.quantity} قطع", icon = Icons.Default.Inventory)
                            DetailItem(label = "القسم الحالي:", value = assetDetails.departmentName, icon = Icons.Default.MapsHomeWork)
                            DetailItem(
                                label = "تاريخ التسجيل:",
                                value = df.format(Date(assetDetails.asset.purchaseDate)),
                                icon = Icons.Default.CalendarToday
                            )
                        }
                    }
                }

                // Accessories
                if (assetDetails.asset.accessories.isNotBlank()) {
                    item {
                        Column(modifier = Modifier.fillMaxWidth()) {
                            Text(
                                text = "ملحقات الجهاز:",
                                style = MaterialTheme.typography.bodyMedium,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = assetDetails.asset.accessories,
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f), RoundedCornerShape(8.dp))
                                    .padding(12.dp)
                            )
                        }
                    }
                }

                // Description
                item {
                    Column(modifier = Modifier.fillMaxWidth()) {
                        Text(
                            text = "تفاصيل ووصف الأصل:",
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = assetDetails.asset.description.ifBlank { "لا يوجد وصف إضافي متوفر." },
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }

                // Timeline header for transfers
                item {
                    Text(
                        text = "السجل التاريخي للانتقالات:",
                        style = MaterialTheme.typography.bodyLarge,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                }

                val assetTransfers = transfers
                if (assetTransfers.isEmpty()) {
                    item {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                            border = AssistChipDefaults.assistChipBorder(enabled = true),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Box(modifier = Modifier.padding(16.dp)) {
                                Text(
                                    text = "مستقر بموقعه الأولي؛ لم يتم تدوين حركات نقل لهذا الأصل بعد.",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.outline,
                                    modifier = Modifier.fillMaxWidth(),
                                    textAlign = TextAlign.Center
                                )
                            }
                        }
                    }
                } else {
                    items(assetTransfers) { item ->
                        TimelineItem(item = item, df = df)
                    }
                }

                // Action controls buttons
                item {
                    Spacer(modifier = Modifier.height(8.dp))
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Button(
                            onClick = onTransferClick,
                            modifier = Modifier.fillMaxWidth(),
                            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
                        ) {
                            Icon(Icons.Default.SwapHoriz, contentDescription = null)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("نقل الأصل الى قسم آخر")
                        }

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            OutlinedButton(
                                onClick = onEditClick,
                                modifier = Modifier.weight(1f)
                            ) {
                                Icon(Icons.Default.Edit, contentDescription = null, size = 16.dp)
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("تعديل")
                            }

                            Button(
                                onClick = onDeleteClick,
                                modifier = Modifier.weight(1f),
                                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.errorContainer, contentColor = MaterialTheme.colorScheme.onErrorContainer)
                            ) {
                                Icon(Icons.Default.Delete, contentDescription = null, size = 16.dp)
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("حذف")
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun DetailItem(label: String, value: String, icon: ImageVector) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(imageVector = icon, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(18.dp))
        Spacer(modifier = Modifier.width(10.dp))
        Text(
            text = label,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.width(100.dp)
        )
        Text(
            text = value,
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.SemiBold,
            color = MaterialTheme.colorScheme.onSurface
        )
    }
}

@Composable
fun TimelineItem(item: TransferWithDetails, df: SimpleDateFormat) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.2f)),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Text(
                        text = item.fromDeptName,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.outline
                    )
                    Icon(
                        imageVector = Icons.Default.ArrowBack, // Point left in RTL logs
                        contentDescription = "الى",
                        modifier = Modifier.size(10.dp),
                        tint = MaterialTheme.colorScheme.outline
                    )
                    Text(
                        text = item.toDeptName,
                        style = MaterialTheme.typography.bodySmall,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary
                    )
                }

                Text(
                    text = df.format(Date(item.record.transferDate)),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.outline
                )
            }
            if (item.record.notes.isNotBlank()) {
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "ملاحظة: ${item.record.notes}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            Spacer(modifier = Modifier.height(2.dp))
            Text(
                text = "المسؤول: ${item.record.authorizedBy}",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.secondary,
                fontWeight = FontWeight.Bold
            )
        }
    }
}
