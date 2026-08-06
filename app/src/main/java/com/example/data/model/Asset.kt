package com.example.data.model

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "assets")
data class Asset(
    @PrimaryKey val id: String,
    val name: String,
    val serialNumber: String,
    val type: String, // "FIXED" or "MOVABLE"
    val description: String,
    val purchaseDate: Long,
    val currentDepartmentId: Int,
    val status: String, // "ACTIVE", "MAINTENANCE", "SCRAPPED"
    val condition: String, // "NEW", "EXCELLENT", "GOOD", "POOR"
    val model: String = "",
    val quantity: Int = 1,
    val imageUri: String? = null,
    val accessories: String = "",
    val manufacturer: String = ""
)
