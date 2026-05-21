ALTER TABLE `hifz_daily_entries`
  ADD COLUMN `sabqListener` VARCHAR(150) NULL,
  ADD COLUMN `sabqMistake` INTEGER NULL,
  ADD COLUMN `sabqAtkann` INTEGER NULL,
  ADD COLUMN `sabaqiMistake` INTEGER NULL,
  ADD COLUMN `sabaqiAtkann` INTEGER NULL,
  ADD COLUMN `manzilBeforeDetail` VARCHAR(150) NULL,
  ADD COLUMN `manzilBeforeMistake` INTEGER NULL,
  ADD COLUMN `manzilBeforeAtkann` INTEGER NULL,
  ADD COLUMN `manzilAfterDetail` VARCHAR(150) NULL,
  ADD COLUMN `manzilAfterMistake` INTEGER NULL,
  ADD COLUMN `manzilAfterAtkann` INTEGER NULL,
  ADD COLUMN `lessonDetail` VARCHAR(255) NULL,
  ADD COLUMN `count` INTEGER NULL;
