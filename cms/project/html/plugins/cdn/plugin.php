<?php

/**
 * Vvveb
 *
 * Copyright (C) 2022  Ziadin Givan
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 *
 */

/*
Name: CDN
Slug: cdn
Category: performance
Url: https://www.vvveb.com
Description: Load images from CDN for faster page loading
Author: givanz
Version: 0.1
Thumb: cdn.svg
Author url: https://www.vvveb.com
Settings: /admin/index.php?module=plugins/cdn/settings
*/

use function Vvveb\__;
use function Vvveb\isEditor;
use Vvveb\System\Event;

if (! defined('V_VERSION')) {
	die('Invalid request!');
}

class CDNPlugin {
	function admin() {
		//add admin menu item
		$admin_path = \Vvveb\adminPath();
		Event::on('Vvveb\Controller\Base', 'init-menu', __CLASS__, function ($menu) use ($admin_path) {
			$menu['plugins']['items']['cdn'] = [
				'name'     => __('CDN for static content'),
				'url'      => $admin_path . 'index.php?module=plugins/cdn/settings',
				'icon-img' => PUBLIC_PATH . 'plugins/cdn/cdn.svg',
			];

			return [$menu];
		});
	}

	function app() {
		//disable cdn when page is loaded in the page builder
		if (isEditor()) {
			return;
		}
		//cdn.statically.io/img/
		$cdnUrl = '//cdn.statically.io/img/' . $_SERVER['HTTP_HOST'] . '/';

		$defaults = [
			'url' => $cdnUrl,
		];

		$options = Vvveb\getSetting('cdn', ['url'], $cdnUrl);
		$options = $options + $defaults;

		//change image base path to point to cdn
		Event::on('Vvveb\System\Images', 'publicPath', __METHOD__ , function ($publicPath, $type, $image, $size) use ($options) {
			$publicPath = $options['url'];
			$publicPath = str_replace(
				['%host%', '%type%', '%image%', '%size%'],
				[$_SERVER['HTTP_HOST'], $type, $image, $size],
				$publicPath);

			return [$publicPath, $type, $image, $size];
		});

		//rewrite post content images

		/*
		Event::on('Vvveb\System\Images', 'image', __METHOD__ , function ($type, $image, $size) {
			return $image;
		});*/

		//on cache purge also purge cdn
	}

	function __construct() {
		if (APP == 'admin') {
			$this->admin();
		} else {
			if (APP == 'app') {
				$this->app();
			}
		}
	}
}

$cdnPlugin = new CDNPlugin();
