package com.example.data.model

data class TransferWithDetails(
    val record: TransferRecord,
    val assetName: String,
    val assetSerialNumber: String,
    val fromDeptName: String,
    val fromDeptCode: String,
    val toDeptName: String,
    val toDeptCode: String
)
