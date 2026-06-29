CREATE TABLE `Tenant` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `tenantCode` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `subdomain` VARCHAR(191) NULL,
  `customDomain` VARCHAR(191) NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'active',
  `ownerAdminId` INTEGER NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE INDEX `Tenant_tenantCode_key`(`tenantCode`),
  UNIQUE INDEX `Tenant_subdomain_key`(`subdomain`),
  UNIQUE INDEX `Tenant_customDomain_key`(`customDomain`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
