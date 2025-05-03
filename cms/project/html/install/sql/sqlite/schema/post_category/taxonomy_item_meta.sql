DROP TABLE IF EXISTS `taxonomy_item_meta`;

CREATE TABLE `taxonomy_item_meta` (
`taxonomy_item_id` INT NOT NULL DEFAULT '0',
`namespace` TEXT DEFAULT NULL,
`key` TEXT DEFAULT NULL,
`value` TEXT
-- PRIMARY KEY (`taxonomy_item_id`,`namespace`,`key`)
);


CREATE INDEX `taxonomy_item_meta_taxonomy_item_id` ON `taxonomy_item_meta` (`taxonomy_item_id`, `namespace`, `key`);
-- CREATE INDEX `taxonomy_item_meta_key` ON `taxonomy_item_meta` (`key`);
