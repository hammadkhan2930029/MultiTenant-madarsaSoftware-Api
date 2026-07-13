ALTER TABLE `store_purchase_items`
  ADD COLUMN `unitId` INTEGER NULL;

CREATE INDEX `store_purchase_items_unitId_idx` ON `store_purchase_items`(`unitId`);
