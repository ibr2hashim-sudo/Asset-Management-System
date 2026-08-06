package com.example.data.model

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "transfer_records")
data class TransferRecord(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val assetId: String,
    val fromDepartmentId: Int,
    val toDepartmentId: Int,
    val transferDate: Long,
    val authorizedBy: String,
    val notes: String
)
