package com.example

import android.app.Activity
import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.ui.screens.AssetsTab
import com.example.ui.screens.DashboardTab
import com.example.ui.screens.DepartmentsTab
import com.example.ui.screens.HistoryTab
import com.example.ui.screens.DashboardScreen
import com.example.ui.screens.AddDeviceScreen
import com.example.data.local.LocalImageStorageService
import kotlinx.coroutines.launch
import com.example.ui.theme.MyApplicationTheme
import com.example.ui.viewmodel.AssetViewModel

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            MyApplicationTheme {
                CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Rtl) {
                    MainScreen()
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainScreen(viewModel: AssetViewModel = viewModel()) {
    var selectedTab by remember { mutableIntStateOf(0) }
    var showExitDialog by remember { mutableStateOf(false) }
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    val storageService = remember { LocalImageStorageService(context) }
    var currentScreen by remember { mutableStateOf("main") }

    var showStatusDialog by remember { mutableStateOf(false) }
    var statusMessage by remember { mutableStateOf("") }

    val csvImportLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri ->
        uri?.let {
            coroutineScope.launch {
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
                        
                        // Check for UTF-8 decoding issue, fallback to Windows-1256
                        if (text.contains("\uFFFD")) {
                            try {
                                text = String(bytes, startIndex, bytes.size - startIndex, java.nio.charset.Charset.forName("Windows-1256"))
                            } catch (e: Exception) {
                                // Fallback
                            }
                        }

                        if (text.isNotBlank()) {
                            viewModel.importAssetsFromCsv(text) { count, message ->
                                statusMessage = message
                                showStatusDialog = true
                            }
                        } else {
                            statusMessage = "الملف المختار فارغ!"
                            showStatusDialog = true
                        }
                    } else {
                        statusMessage = "الملف المختار فارغ!"
                        showStatusDialog = true
                    }
                } catch (e: Exception) {
                    statusMessage = "خطأ أثناء استيراد الملف: ${e.localizedMessage}"
                    showStatusDialog = true
                }
            }
        }
    }

    val csvExportLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.CreateDocument("text/csv")
    ) { uri ->
        uri?.let {
            try {
                val csvContent = viewModel.exportAssetsToCsv()
                context.contentResolver.openOutputStream(uri)?.use { outputStream ->
                    outputStream.write(csvContent.toByteArray())
                }
                statusMessage = "تم تصدير ملف الأصول والبيانات بنجاح!"
                showStatusDialog = true
            } catch (e: Exception) {
                statusMessage = "خطأ أثناء تصدير الملف: ${e.localizedMessage}"
                showStatusDialog = true
            }
        }
    }

    if (showStatusDialog) {
        AlertDialog(
            onDismissRequest = { showStatusDialog = false },
            title = { Text("مزامنة وإدارة البيانات", fontWeight = FontWeight.Bold) },
            text = { Text(statusMessage) },
            confirmButton = {
                Button(onClick = { showStatusDialog = false }) {
                    Text("موافق")
                }
            }
        )
    }

    // Intercept Back Press to show confirmation dialog
    BackHandler(enabled = true) {
        if (currentScreen == "add_device") {
            currentScreen = "main"
        } else if (selectedTab != 0) {
            selectedTab = 0
        } else {
            showExitDialog = true
        }
    }

    if (showExitDialog) {
        AlertDialog(
            onDismissRequest = { showExitDialog = false },
            title = {
                Text(
                    text = "تأكيد الخروج",
                    fontWeight = FontWeight.Bold,
                    style = MaterialTheme.typography.titleMedium
                )
            },
            text = {
                Text(
                    text = "هل أنت متأكد من رغبتك في الخروج وإغلاق التطبيق؟",
                    style = MaterialTheme.typography.bodyMedium
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        showExitDialog = false
                        (context as? Activity)?.finish()
                    },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.error
                    )
                ) {
                    Text("خروج", color = MaterialTheme.colorScheme.onError)
                }
            },
            dismissButton = {
                TextButton(
                    onClick = { showExitDialog = false }
                ) {
                    Text("إلغاء")
                }
            }
        )
    }

    // Collect States from the ViewModel reactively
    val departments by viewModel.departments.collectAsState(initial = emptyList())
    val assetsWithDetails by viewModel.assetsWithDetails.collectAsState(initial = emptyList())
    val filteredAssets by viewModel.filteredAssets.collectAsState(initial = emptyList())
    val transfersWithDetails by viewModel.transfersWithDetails.collectAsState(initial = emptyList())

    val searchQuery by viewModel.searchQuery.collectAsState()
    val selectedTypeFilter by viewModel.selectedTypeFilter.collectAsState()
    val selectedDeptFilter by viewModel.selectedDepartmentFilter.collectAsState()

    if (currentScreen == "add_device") {
        AddDeviceScreen(
            departments = departments,
            onNavigateBack = { currentScreen = "main" },
            onSaveClick = { assetId, deviceName, deptId, model, serial, quantity, status, notes, galleryUri, cameraBitmap ->
                coroutineScope.launch {
                    var localImagePath: String? = null
                    if (cameraBitmap != null) {
                        localImagePath = storageService.saveBitmapLocally(cameraBitmap, assetId)
                    } else if (galleryUri != null) {
                        localImagePath = storageService.saveImageLocally(galleryUri, assetId)
                    }
                    
                    // إضافة أصل جديد مع الصورة والبيانات
                    viewModel.addAsset(
                        name = deviceName,
                        serialNumber = serial.ifBlank { "SN-${System.currentTimeMillis() % 10000}" },
                        type = "BIOMEDICAL",
                        description = notes,
                        currentDepartmentId = deptId,
                        condition = "GOOD",
                        model = model,
                        quantity = quantity,
                        imageUri = localImagePath,
                        id = assetId,
                        status = status
                    )
                    
                    currentScreen = "main"
                    selectedTab = 0 // العودة للوحة التحكم
                }
            }
        )
    } else {
        Scaffold(
            topBar = {
                TopAppBar(
                    title = {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            if (selectedTab == 0) {
                                Text(
                                    text = "الواجهة الرئيسية",
                                    fontWeight = FontWeight.Bold,
                                    style = MaterialTheme.typography.titleLarge
                                )
                            } else {
                                Box(
                                    modifier = Modifier
                                        .size(36.dp)
                                        .background(MaterialTheme.colorScheme.primaryContainer, CircleShape),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text(
                                        text = "AM",
                                        color = MaterialTheme.colorScheme.onPrimaryContainer,
                                        fontWeight = FontWeight.Bold,
                                        style = MaterialTheme.typography.bodyMedium
                                    )
                                }
                                Text(
                                    text = when (selectedTab) {
                                        1 -> "سجل الأصول والعهد"
                                        else -> "سجل حركات النقل"
                                    },
                                    fontWeight = FontWeight.Bold,
                                    style = MaterialTheme.typography.titleMedium
                                )
                            }
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(
                        containerColor = MaterialTheme.colorScheme.background,
                        titleContentColor = MaterialTheme.colorScheme.onBackground
                    ),
                    navigationIcon = {
                        if (selectedTab == 0) {
                            var showMenu by remember { mutableStateOf(false) }
                            Box {
                                IconButton(onClick = { showMenu = true }) {
                                    Icon(Icons.Default.Menu, contentDescription = "القائمة")
                                }
                                DropdownMenu(
                                    expanded = showMenu,
                                    onDismissRequest = { showMenu = false }
                                ) {
                                    DropdownMenuItem(
                                        text = { Text("استيراد قاعدة البيانات من أكسل (Excel/CSV)") },
                                        onClick = {
                                            showMenu = false
                                            csvImportLauncher.launch("text/*")
                                        },
                                        leadingIcon = { Icon(Icons.Default.UploadFile, contentDescription = null) }
                                    )
                                    DropdownMenuItem(
                                        text = { Text("تصدير قاعدة البيانات (Excel/CSV)") },
                                        onClick = {
                                            showMenu = false
                                            csvExportLauncher.launch("Assets_Export_${System.currentTimeMillis()}.csv")
                                        },
                                        leadingIcon = { Icon(Icons.Default.DownloadForOffline, contentDescription = null) }
                                    )
                                }
                            }
                        }
                    },
                    actions = {
                        if (selectedTab == 0) {
                            // أزرار الواجهة الرئيسية كما في الصورة المرفقة (تحديث، تحديد، بحث)
                            IconButton(onClick = { 
                                Toast.makeText(context, "تم تحديث البيانات بنجاح", Toast.LENGTH_SHORT).show() 
                            }) {
                                Icon(Icons.Default.Refresh, contentDescription = "تحديث")
                            }
                            IconButton(onClick = { 
                                Toast.makeText(context, "وضع التحديد المتعدد", Toast.LENGTH_SHORT).show() 
                            }) {
                                Icon(Icons.Default.Checklist, contentDescription = "تحديد")
                            }
                            IconButton(onClick = { 
                                selectedTab = 1 
                            }) {
                                Icon(Icons.Default.Search, contentDescription = "بحث")
                            }
                        } else if (selectedTab == 1) {
                            Box(modifier = Modifier.padding(end = 12.dp)) {
                                Badge(
                                    containerColor = MaterialTheme.colorScheme.primaryContainer,
                                    contentColor = MaterialTheme.colorScheme.onPrimaryContainer
                                ) {
                                    Text(
                                        text = "${assetsWithDetails.sumOf { it.asset.quantity }} أصل",
                                        fontWeight = FontWeight.Bold,
                                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                    )
                                }
                            }
                        }
                    }
                )
            },
            bottomBar = {
                NavigationBar(
                    windowInsets = WindowInsets.navigationBars
                ) {
                    NavigationBarItem(
                        selected = selectedTab == 0,
                        onClick = { 
                            selectedTab = 0
                            viewModel.updateDepartmentFilter(null)
                            viewModel.updateSearchQuery("")
                        },
                        icon = { Icon(Icons.Default.MapsHomeWork, contentDescription = "Departments") },
                        label = { Text("الأقسام (الرئيسية)", style = MaterialTheme.typography.labelSmall) }
                    )
                    NavigationBarItem(
                        selected = selectedTab == 1,
                        onClick = { selectedTab = 1 },
                        icon = { Icon(Icons.Default.Inventory, contentDescription = "Assets") },
                        label = { Text("سجل الأصول", style = MaterialTheme.typography.labelSmall) }
                    )
                    NavigationBarItem(
                        selected = selectedTab == 2,
                        onClick = { selectedTab = 2 },
                        icon = { Icon(Icons.Default.History, contentDescription = "History") },
                        label = { Text("سجل الترانزيت", style = MaterialTheme.typography.labelSmall) }
                    )
                }
            },
            modifier = Modifier.fillMaxSize()
        ) { innerPadding ->
            Surface(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding),
                color = MaterialTheme.colorScheme.background
            ) {
                when (selectedTab) {
                    0 -> DashboardScreen(
                        departments = departments,
                        assets = assetsWithDetails,
                        onDepartmentClick = { dept ->
                            viewModel.updateDepartmentFilter(dept.id)
                            selectedTab = 1
                        },
                        onAddDepartment = { name, code, desc ->
                            viewModel.addDepartment(name, code, desc)
                        },
                        onDeleteDepartment = { dept ->
                            viewModel.deleteDepartment(dept)
                        }
                    )
                    1 -> AssetsTab(
                        assets = filteredAssets,
                        departments = departments,
                        transfers = transfersWithDetails,
                        searchQuery = searchQuery,
                        selectedType = selectedTypeFilter,
                        selectedDeptId = selectedDeptFilter,
                        onSearchChanged = { viewModel.updateSearchQuery(it) },
                        onTypeChanged = { viewModel.updateTypeFilter(it) },
                        onDeptIdChanged = { viewModel.updateDepartmentFilter(it) },
                        onAddAsset = { name, serial, type, desc, deptId, cond, model, qty, img, code, accessories, manufacturer ->
                            viewModel.addAsset(id = code, name = name, serialNumber = serial, type = type, description = desc, currentDepartmentId = deptId, condition = cond, model = model, quantity = qty, imageUri = img, accessories = accessories, manufacturer = manufacturer)
                        },
                        onUpdateAsset = { viewModel.updateAsset(it) },
                        onDeleteAsset = { viewModel.deleteAsset(it) },
                        onTransferAsset = { assetId, fromDept, toDept, auth, note ->
                            viewModel.transferAsset(assetId, fromDept, toDept, auth, note)
                        },
                        onImportCsv = { csvText, onComplete ->
                            viewModel.importAssetsFromCsv(csvText, onComplete)
                        },
                        onExportCsv = {
                            viewModel.exportAssetsToCsv()
                        },
                        onGetTemplate = {
                            viewModel.getCsvTemplate()
                        }
                    )
                    else -> HistoryTab(
                        transfers = transfersWithDetails
                    )
                }
            }
        }
    }
}
