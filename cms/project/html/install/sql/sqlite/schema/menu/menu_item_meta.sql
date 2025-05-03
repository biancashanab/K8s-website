DROP TABLE IF EXISTS `menu_item_meta`;

CREATE TABLE `menu_item_meta` (
`menu_item_id` INT NOT NULL DEFAULT '0',
`namespace` TEXT DEFAULT NULL,
`key` TEXT DEFAULT NULL,
`value` TEXT
-- PRIMARY KEY (`menu_item_meta_id`)
);


CREATE INDEX `menu_item_meta_menu_item_id` ON `menu_item_meta` (`menu_item_id`, `namespace`, 'key');
-- CREATE INDEX `menu_item_meta_key` ON `menu_item_meta` (`key`);
