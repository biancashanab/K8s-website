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

namespace Vvveb\Plugins\CDN\Controller;

use function Vvveb\__;
use Vvveb\Controller\Base;

class Settings extends Base {
	function save() {
		//$validator = new Validator(['plugins.insert-scripts.settings']);
		$settings  = $this->request->post['settings'] ?? false;
		$errors    = [];

		if ($settings /*&&
			($errors = $validator->validate($settings)) === true*/) {
			//$settings              = $validator->filter($settings);
			$results               = \Vvveb\setMultiSetting('cdn',$settings);
			$this->view->success[] = __('Settings saved!');
		} else {
			$this->view->errors = $errors;
		}
	}

	function index() {
		$this->view->defaults = [
			'url'         => '//cdn.statically.io/img/%host%',
		];
	}
}
