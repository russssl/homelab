package com.homelab.app.di

import android.content.Context
import androidx.room.Room
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase
import com.homelab.app.data.local.AppDatabase
import com.homelab.app.data.local.dao.ServiceDao
import com.homelab.app.data.local.dao.ServiceInstanceDao
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {
    private val MIGRATION_1_2 = object : Migration(1, 2) {
        override fun migrate(db: SupportSQLiteDatabase) {
            db.execSQL(
                """
                CREATE TABLE IF NOT EXISTS `service_instances` (
                    `id` TEXT NOT NULL,
                    `type` TEXT NOT NULL,
                    `label` TEXT NOT NULL,
                    `url` TEXT NOT NULL,
                    `token` TEXT NOT NULL,
                    `username` TEXT,
                    `apiKey` TEXT,
                    `piholePassword` TEXT,
                    `piholeAuthMode` TEXT,
                    `fallbackUrl` TEXT,
                    PRIMARY KEY(`id`)
                )
                """.trimIndent()
            )
        }
    }

    @Provides
    @Singleton
    fun provideAppDatabase(@ApplicationContext context: Context): AppDatabase {
        return Room.databaseBuilder(
            context,
            AppDatabase::class.java,
            "homelab_database"
        )
        .addMigrations(MIGRATION_1_2)
        .build()
    }

    @Provides
    @Singleton
    fun provideServiceDao(appDatabase: AppDatabase): ServiceDao {
        return appDatabase.serviceDao()
    }

    @Provides
    @Singleton
    fun provideServiceInstanceDao(appDatabase: AppDatabase): ServiceInstanceDao {
        return appDatabase.serviceInstanceDao()
    }
}
