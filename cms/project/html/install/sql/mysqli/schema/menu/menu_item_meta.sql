DROP TABLE IF EXISTS `menu_item_meta`;
CREATE TABLE `menu_item_meta` (
    `menu_item_id` INT UNSIGNED NOT NULL DEFAULT '0',
    `namespace` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `value` LONGTEXT,
    PRIMARY KEY (`menu_item_id`, `namespace`, `key`)
);
