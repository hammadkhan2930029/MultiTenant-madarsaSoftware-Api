CREATE TABLE `result_grades` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(150) NOT NULL,
  `code` VARCHAR(20) NULL,
  `fromPercent` INTEGER NOT NULL,
  `toPercent` INTEGER NOT NULL,
  `status` VARCHAR(50) NOT NULL DEFAULT 'active',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `result_grades_status_fromPercent_toPercent_idx`(`status`, `fromPercent`, `toPercent`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `result_grades` (`title`, `code`, `fromPercent`, `toPercent`, `status`, `createdAt`, `updatedAt`)
VALUES
  ('ممتاز', 'A+', 80, 100, 'active', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  ('بہتر', 'A', 60, 79, 'active', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  ('مناسب', 'B', 40, 59, 'active', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  ('کمزور', 'C', 0, 39, 'active', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));
