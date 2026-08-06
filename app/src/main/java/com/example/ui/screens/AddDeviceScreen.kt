package com.example.ui.screens

import android.graphics.Bitmap
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.result.launch
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
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
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.example.data.model.Department
import com.journeyapps.barcodescanner.ScanContract
import com.journeyapps.barcodescanner.ScanOptions

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddDeviceScreen(
    departments: List<Department>,
    onNavigateBack: () -> Unit,
    onSaveClick: (
        assetId: String,
        deviceName: String,
        deptId: Int,
        model: String,
        serialNumber: String,
        quantity: Int,
        status: String,
        notes: String,
        galleryUri: Uri?,
        cameraBitmap: Bitmap?
    ) -> Unit
) {
    var assetId by remember { mutableStateOf("") }
    var deviceName by remember { mutableStateOf("") }
    var selectedDeptId by remember { mutableStateOf<Int?>(null) }
    var model by remember { mutableStateOf("") }
    var serialNumber by remember { mutableStateOf("") }
    var quantityStr by remember { mutableStateOf("1") }
    var status by remember { mutableStateOf("ACTIVE") } // ACTIVE, MAINTENANCE
    var notes by remember { mutableStateOf("") }

    // إدارة الصور المحمولة
    var selectedImageUri by remember { mutableStateOf<Uri?>(null) }
    var capturedBitmap by remember { mutableStateOf<Bitmap?>(null) }
    var showImagePickerDialog by remember { mutableStateOf(false) }

    // التحقق من صحة المدخلات
    var assetIdError by remember { mutableStateOf(false) }
    var nameError by remember { mutableStateOf(false) }
    var deptError by remember { mutableStateOf(false) }

    // لاقط الصور من معرض الصور
    val galleryLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri ->
        uri?.let {
            selectedImageUri = it
            capturedBitmap = null // مسح الكاميرا في حال اختيار الاستوديو
        }
    }

    // لاقط الصور من الكاميرا
    val cameraLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.TakePicturePreview()
    ) { bitmap ->
        bitmap?.let {
            capturedBitmap = it
            selectedImageUri = null // مسح الاستوديو في حال التقاط كاميرا
        }
    }

    // لاقط الرقم التسلسلي والباركود بالكاميرا
    val barcodeLauncher = rememberLauncherForActivityResult(
        contract = ScanContract()
    ) { result ->
        if (result.contents != null) {
            serialNumber = result.contents
        }
    }

    // تهيئة أول قسم تلقائياً
    LaunchedEffect(departments) {
        if (departments.isNotEmpty() && selectedDeptId == null) {
            selectedDeptId = departments.first().id
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("إضافة جهاز طبي جديد", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowForward, contentDescription = "رجوع") // اتجاه اليمين RTL
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.background
                )
            )
        }
    ) { innerPadding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(horizontal = 20.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
            contentPadding = PaddingValues(bottom = 32.dp)
        ) {
            // صورة الجهاز وتحديدها
            item {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        text = "صورة الجهاز الطبي",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.align(Alignment.Start)
                    )
                    Spacer(modifier = Modifier.height(12.dp))

                    Box(
                        modifier = Modifier
                            .size(150.dp)
                            .clip(RoundedCornerShape(16.dp))
                            .background(MaterialTheme.colorScheme.surfaceVariant)
                            .border(
                                1.dp,
                                MaterialTheme.colorScheme.outline.copy(alpha = 0.5f),
                                RoundedCornerShape(16.dp)
                            )
                            .clickable { showImagePickerDialog = true },
                        contentAlignment = Alignment.Center
                    ) {
                        if (capturedBitmap != null) {
                            androidx.compose.foundation.Image(
                                bitmap = capturedBitmap!!.asImageBitmap(),
                                contentDescription = "صورة الكاميرا",
                                modifier = Modifier.fillMaxSize(),
                                contentScale = ContentScale.Crop
                            )
                        } else if (selectedImageUri != null) {
                            AsyncImage(
                                model = selectedImageUri,
                                contentDescription = "صورة الاستوديو",
                                modifier = Modifier.fillMaxSize(),
                                contentScale = ContentScale.Crop
                            )
                        } else {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Icon(
                                    imageVector = Icons.Default.PhotoCamera,
                                    contentDescription = null,
                                    tint = MaterialTheme.colorScheme.primary,
                                    modifier = Modifier.size(40.dp)
                                )
                                Spacer(modifier = Modifier.height(8.dp))
                                Text(
                                    text = "اضغط لإضافة صورة",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                    }
                }
            }

            // كود الجهاز (Asset ID) وهو المفتاح والاسم للملف
            item {
                OutlinedTextField(
                    value = assetId,
                    onValueChange = {
                        assetId = it
                        assetIdError = it.isBlank()
                    },
                    label = { Text("كود الجهاز (Asset ID) *") },
                    placeholder = { Text("مثال: CATHC-15") },
                    isError = assetIdError,
                    supportingText = {
                        if (assetIdError) {
                            Text("كود الجهاز مطلوب لحفظ وربط الصورة محلياً")
                        } else {
                            Text("سيتم تسمية ملف الصورة محلياً بهذا الكود وتعمل 100% أوفلاين")
                        }
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .testTag("asset_id_input"),
                    singleLine = true,
                    shape = RoundedCornerShape(12.dp)
                )
            }

            // اسم الجهاز الطبي
            item {
                OutlinedTextField(
                    value = deviceName,
                    onValueChange = {
                        deviceName = it
                        nameError = it.isBlank()
                    },
                    label = { Text("اسم الجهاز الطبي *") },
                    placeholder = { Text("مثال: جهاز مراقبة المريض") },
                    isError = nameError,
                    modifier = Modifier
                        .fillMaxWidth()
                        .testTag("device_name_input"),
                    singleLine = true,
                    shape = RoundedCornerShape(12.dp)
                )
            }

            // اختيار القسم من قائمة الأقسام
            item {
                Text("القسم التابع له الجهاز *", style = MaterialTheme.typography.labelLarge)
                var expanded by remember { mutableStateOf(false) }
                val selectedDeptName = departments.find { it.id == selectedDeptId }?.name ?: "اختر القسم"

                Box(modifier = Modifier.fillMaxWidth()) {
                    OutlinedTextField(
                        value = selectedDeptName,
                        onValueChange = {},
                        readOnly = true,
                        isError = deptError,
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { expanded = true },
                        shape = RoundedCornerShape(12.dp),
                        trailingIcon = {
                            IconButton(onClick = { expanded = true }) {
                                Icon(Icons.Default.ArrowDropDown, contentDescription = null)
                            }
                        }
                    )

                    DropdownMenu(
                        expanded = expanded,
                        onDismissRequest = { expanded = false },
                        modifier = Modifier.fillMaxWidth(0.9f)
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

            // الموديل (Model)
            item {
                OutlinedTextField(
                    value = model,
                    onValueChange = { model = it },
                    label = { Text("الموديل (Model)") },
                    placeholder = { Text("مثال: Vista 120") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    shape = RoundedCornerShape(12.dp)
                )
            }

            // الرقم التسلسلي (Serial Number)
            item {
                OutlinedTextField(
                    value = serialNumber,
                    onValueChange = { serialNumber = it },
                    label = { Text("الرقم التسلسلي (Serial Number)") },
                    placeholder = { Text("مثال: SN-9012384") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    shape = RoundedCornerShape(12.dp),
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

            // الكمية (Quantity)
            item {
                OutlinedTextField(
                    value = quantityStr,
                    onValueChange = { quantityStr = it },
                    label = { Text("الكمية") },
                    modifier = Modifier.fillMaxWidth(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    singleLine = true,
                    shape = RoundedCornerShape(12.dp)
                )
            }

            // الحالة التشغيلية للجهاز
            item {
                Text("الحالة التشغيلية للجهاز", style = MaterialTheme.typography.labelLarge)
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    ElevatedFilterChip(
                        selected = status == "ACTIVE",
                        onClick = { status = "ACTIVE" },
                        label = { Text("نشط / فعال (Active)") },
                        modifier = Modifier.weight(1f)
                    )
                    ElevatedFilterChip(
                        selected = status == "MAINTENANCE",
                        onClick = { status = "MAINTENANCE" },
                        label = { Text("تحت الصيانة (Maintenance)") },
                        modifier = Modifier.weight(1f)
                    )
                }
            }

            // ملاحظات إضافية (Notes)
            item {
                OutlinedTextField(
                    value = notes,
                    onValueChange = { notes = it },
                    label = { Text("ملاحظات / وصف حالة الجهاز") },
                    placeholder = { Text("ملاحظات إضافية عن صيانة أو عهدة الجهاز...") },
                    modifier = Modifier.fillMaxWidth(),
                    minLines = 3,
                    shape = RoundedCornerShape(12.dp)
                )
            }

            // زر الحفظ النهائي
            item {
                Button(
                    onClick = {
                        assetIdError = assetId.isBlank()
                        nameError = deviceName.isBlank()
                        deptError = selectedDeptId == null

                        if (!assetIdError && !nameError && !deptError) {
                            onSaveClick(
                                assetId.trim(),
                                deviceName.trim(),
                                selectedDeptId!!,
                                model.trim(),
                                serialNumber.trim(),
                                quantityStr.toIntOrNull() ?: 1,
                                status,
                                notes.trim(),
                                selectedImageUri,
                                capturedBitmap
                            )
                        }
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(50.dp)
                        .testTag("save_device_button"),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Icon(Icons.Default.Save, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("حفظ بيانات وصورة الجهاز محلياً", fontWeight = FontWeight.Bold)
                }
            }
        }
    }

    // حوار اختيار مصدر الصورة (كاميرا أو استوديو)
    if (showImagePickerDialog) {
        AlertDialog(
            onDismissRequest = { showImagePickerDialog = false },
            title = { Text("إضافة صورة للجهاز", fontWeight = FontWeight.Bold) },
            text = { Text("اختر طريقة التقاط أو رفع صورة الجهاز الطبي لحفظها محلياً في ذاكرة الهاتف:") },
            confirmButton = {
                Button(
                    onClick = {
                        cameraLauncher.launch()
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
