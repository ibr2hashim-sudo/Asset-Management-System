package com.example.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.example.data.model.AssetWithDetails
import com.example.data.model.Department

@Composable
fun DepartmentsTab(
    departments: List<Department>,
    assets: List<AssetWithDetails>,
    onAddDepartment: (String, String, String) -> Unit,
    onDeleteDepartment: (Department) -> Unit
) {
    var showAddDialog by remember { mutableStateOf(false) }
    var deleteConfirmDialogDept by remember { mutableStateOf<Department?>(null) }
    var deleteValidationMessage by remember { mutableStateOf<String?>(null) }

    Scaffold(
        floatingActionButton = {
            FloatingActionButton(
                onClick = { showAddDialog = true },
                containerColor = MaterialTheme.colorScheme.tertiary,
                contentColor = MaterialTheme.colorScheme.onTertiary,
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier.testTag("add_dept_fab")
            ) {
                Icon(Icons.Default.AddHome, contentDescription = "Add Department")
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
            Spacer(modifier = Modifier.height(16.dp))

            Text(
                text = "إدارة هيكل الأقسام الفنية والإدارية",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface
            )
            Text(
                text = "قم بإنشاء وتعديل الأقسام والتحقق من حجم الأصول عابرة الأقسام.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.outline
            )

            Spacer(modifier = Modifier.height(16.dp))

            if (departments.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(
                            imageVector = Icons.Default.MapsHomeWork,
                            contentDescription = "Empty",
                            tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.4f),
                            modifier = Modifier.size(72.dp)
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        Text(
                            text = "لا توجد أقسام معرفة بعد.",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            } else {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                    contentPadding = PaddingValues(bottom = 80.dp)
                ) {
                    items(departments, key = { it.id }) { dept ->
                        val deptAssetCount = assets.count { it.asset.currentDepartmentId == dept.id }
                        DepartmentCard(
                            dept = dept,
                            assetCount = deptAssetCount,
                            onDeleteClick = {
                                if (deptAssetCount > 0) {
                                    deleteValidationMessage = "لا يمكن حذف قسم '$deptAssetCount' لأنه يحتوي على أصول نشطة حالياً. يرجى نقل الأصول إلى أقسام أخرى أولاً لتتمكن من الحذف."
                                } else {
                                    deleteValidationMessage = null
                                    deleteConfirmDialogDept = dept
                                }
                            }
                        )
                    }
                }
            }
        }
    }

    // Modal: Add Department Dialog
    if (showAddDialog) {
        AddDepartmentDialog(
            onDismiss = { showAddDialog = false },
            onSave = { name, code, desc ->
                onAddDepartment(name, code, desc)
                showAddDialog = false
            }
        )
    }

    // Modal: Delete Denied Warning (Validation error)
    deleteValidationMessage?.let { msg ->
        AlertDialog(
            onDismissRequest = { deleteValidationMessage = null },
            title = { Text("قيد المنع الإداري", fontWeight = FontWeight.Bold) },
            text = { Text(msg) },
            confirmButton = {
                TextButton(onClick = { deleteValidationMessage = null }) {
                    Text("فهمت")
                }
            }
        )
    }

    // Modal: Delete Confirm Dialog
    deleteConfirmDialogDept?.let { dept ->
        AlertDialog(
            onDismissRequest = { deleteConfirmDialogDept = null },
            title = { Text("حذف القسم نهائياً؟", fontWeight = FontWeight.Bold) },
            text = { Text("هل أنت متأكد من حذف القسم '${dept.name} (${dept.code})'؟ هذا الإجراء غير قابل للتراجع وتتم تصفية ترميزه التاريخي.") },
            confirmButton = {
                Button(
                    onClick = {
                        onDeleteDepartment(dept)
                        deleteConfirmDialogDept = null
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error)
                ) {
                    Text("تأكيد الحذف")
                }
            },
            dismissButton = {
                TextButton(onClick = { deleteConfirmDialogDept = null }) {
                    Text("إلغاء")
                }
            }
        )
    }
}

@Composable
fun DepartmentCard(
    dept: Department,
    assetCount: Int,
    onDeleteClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .testTag("department_item_${dept.id}"),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = AssistChipDefaults.assistChipBorder(enabled = true),
        shape = RoundedCornerShape(16.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(48.dp)
                            .background(MaterialTheme.colorScheme.surfaceVariant, RoundedCornerShape(12.dp)),
                        contentAlignment = Alignment.Center
                    ) {
                        // Nested solid geometric container for department code
                        Box(
                            modifier = Modifier
                                .size(34.dp)
                                .background(MaterialTheme.colorScheme.secondaryContainer, RoundedCornerShape(6.dp)),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = dept.code,
                                style = MaterialTheme.typography.labelMedium,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onSecondaryContainer
                            )
                        }
                    }
                    Text(
                        text = dept.name,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                }

                IconButton(onClick = onDeleteClick) {
                    Icon(
                        imageVector = Icons.Default.Delete,
                        contentDescription = "Delete Department",
                        tint = MaterialTheme.colorScheme.outline
                    )
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            Text(
                text = dept.description.ifBlank { "لا يتوفر وصف فني أو هيكلي لهذا القسم في الوقت الحالي." },
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            Spacer(modifier = Modifier.height(12.dp))

            Divider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.1f))

            Spacer(modifier = Modifier.height(10.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "عدد الأصول في العهدة:",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.outline
                )

                Box(
                    modifier = Modifier
                        .background(
                            color = if (assetCount > 0) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceVariant,
                            shape = CircleShape
                        )
                        .padding(horizontal = 14.dp, vertical = 4.dp)
                ) {
                    Text(
                        text = if (assetCount > 0) "$assetCount أصل تابع" else "شاغر فني",
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.Bold,
                        color = if (assetCount > 0) MaterialTheme.colorScheme.onPrimaryContainer else MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }
    }
}

@Composable
fun AddDepartmentDialog(
    onDismiss: () -> Unit,
    onSave: (String, String, String) -> Unit
) {
    var name by remember { mutableStateOf("") }
    var code by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }

    var nameError by remember { mutableStateOf(false) }
    var codeError by remember { mutableStateOf(false) }

    Dialog(onDismissRequest = onDismiss) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            shape = RoundedCornerShape(20.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Text(
                    text = "إضافة قسم جديد",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary
                )

                OutlinedTextField(
                    value = name,
                    onValueChange = {
                        name = it
                        nameError = it.isBlank()
                    },
                    label = { Text("اسم القسم بالكامل *") },
                    isError = nameError,
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )

                OutlinedTextField(
                    value = code,
                    onValueChange = {
                        code = it.uppercase()
                        codeError = it.isBlank()
                    },
                    label = { Text("الرمز الإداري أو الاختصار الرئيسي * (مثال: IT)") },
                    isError = codeError,
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )

                OutlinedTextField(
                    value = description,
                    onValueChange = { description = it },
                    label = { Text("وصف مهام وموقع القسم بالشركة") },
                    modifier = Modifier.fillMaxWidth(),
                    maxLines = 3
                )

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
                            if (name.isBlank()) nameError = true
                            if (code.isBlank()) codeError = true

                            if (name.isNotBlank() && code.isNotBlank()) {
                                onSave(name, code, description)
                            }
                        },
                        modifier = Modifier.weight(1.5f)
                    ) {
                        Text("إضافة")
                    }
                }
            }
        }
    }
}
