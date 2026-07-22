ALTER TABLE `cities`
ADD COLUMN `tenant_id` INT NULL;

ALTER TABLE `cities`
DROP INDEX `cities_name_key`;

ALTER TABLE `cities`
ADD UNIQUE INDEX `cities_tenant_id_name_key` (`tenant_id`, `name`),
ADD INDEX `cities_tenant_id_idx` (`tenant_id`);

ALTER TABLE `cities`
ADD CONSTRAINT `cities_tenant_id_fkey`
FOREIGN KEY (`tenant_id`) REFERENCES `tenant`(`id`)
ON DELETE CASCADE ON UPDATE CASCADE;
