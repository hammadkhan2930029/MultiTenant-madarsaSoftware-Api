-- Track all fund rows saved in a single receipt/session.
ALTER TABLE `fund_collections`
    ADD COLUMN `collectionGroupId` VARCHAR(100) NULL;

UPDATE `fund_collections`
SET `collectionGroupId` = CONCAT('FG-', `id`)
WHERE `collectionGroupId` IS NULL;

ALTER TABLE `fund_collections`
    MODIFY `collectionGroupId` VARCHAR(100) NOT NULL;

CREATE INDEX `fund_collections_collectionGroupId_idx` ON `fund_collections`(`collectionGroupId`);
