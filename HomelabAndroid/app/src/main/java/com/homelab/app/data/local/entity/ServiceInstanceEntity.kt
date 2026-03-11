package com.homelab.app.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "service_instances")
data class ServiceInstanceEntity(
    @PrimaryKey val id: String,
    val type: String,
    val label: String,
    val url: String,
    val token: String,
    val username: String?,
    val apiKey: String?,
    val piholePassword: String?,
    val piholeAuthMode: String?,
    val fallbackUrl: String?
)
