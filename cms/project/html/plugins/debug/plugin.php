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
Name: Debug
Slug: debug
Category: development
Url: https://www.vvveb.com
Description: Activate debugging and logging, useful for development
Author: givanz
Version: 0.1
Thumb: debug.svg
Author url: https://www.vvveb.com
*/

use function Vvveb\__;
use Vvveb\System\Core\View;
use Vvveb\System\Event;
use Vvveb\System\Routes;

if (! defined('V_VERSION')) {
	die('Invalid request!');
}

#[\AllowDynamicProperties]
class DebugPlugin {
	function closureDump(Closure $c) {
		$r        = new ReflectionFunction($c);
		$fileName = $r->getFileName();
		$start    = $r->getStartLine();
		$end      = $r->getEndLine();

		$str    = "<pre>/* $fileName [line: $start - $end] */\nfunction (";
		$params = [];

		foreach ($r->getParameters() as $p) {
			$name = $p->getType() && $p->getType()->getName();

			$s = '';

			if ($name == 'array') {
				$s .= 'array ';
			} else {
				if ($name == 'class') {
					$s .= $p->getClass()->name . ' ';
				}
			}

			if ($p->isPassedByReference()) {
				$s .= '&';
			}
			$s .= '$' . $p->name;

			if ($p->isOptional()) {
				$s .= ' = ' . var_export($p->getDefaultValue(), TRUE);
			}
			$params[]= $s;
		}
		$str .= implode(', ', $params);
		$str .= '){' . PHP_EOL;
		$lines = file($r->getFileName());

		for ($l = $start; $l < $end; $l++) {
			$str .= $lines[$l];
		}

		return $str . '</pre>';
	}

	function admin() {
		//add admin menu item
		$admin_path = \Vvveb\adminPath();
		/*
		Event::on('Vvveb\Controller\Base', 'init-menu', __CLASS__, function ($menu) use ($admin_path) {
			$menu['plugins']['items']['debug'] = [
				'name'     => __('Debug'),
				'url'      => $admin_path . 'index.php?module=plugins/debug/settings',
				'icon-img' => PUBLIC_PATH . 'plugins/debug/debug.svg',
			];

			return [$menu];
		});
		 */

		$template = $this->view->getTemplateEngineInstance();
		//$view->plugins ?= [];
		$this->view->plugins = $this->view->plugins ?? [];
		$template->loadTemplateFile(__DIR__ . '/admin/template/common.tpl');
		//return;
		$this->view->plugins['debug'] = ['test' => 'asd'];
	}

	function app() {
		$template = $this->view->getTemplateEngineInstance();
		//$view->plugins ?= [];
		$this->view->plugins = $view->plugins ?? [];
		$template->loadTemplateFile(__DIR__ . '/app/template/common.tpl');
		//return;
		$this->view->plugins['debug'] = ['test' => 'asd'];
	}

	function sql() {
		$dbengine = ucfirst(DB_ENGINE);
		$db       = Vvveb\System\Db::getInstance();
		Event::on("Vvveb\System\Db\\$dbengine", 'execute', __CLASS__, function ($sql, $params) use (&$data, $db) {
			$debugSql = $db->debugSql($sql, $params);
			$this->view->debug['data']['sql'][] = [$sql, $params + ['sql' => $debugSql]];

			return [$sql, $params];
		});
	}

	function errorLog() {
		$error_log   = ini_get('error_log');
		$count       = 100;
		$is_readable = null;
		$text        = null;

		if (! empty($error_log)) {
			$is_readable = is_readable($error_log);

			if ($is_readable) {
				$text = explode("\n",\Vvveb\tail($error_log, $count));
			}
		} else {
			$error_log = __('empty file');
		}

		$this->view->debug['data']['errorlog'] = $text ?? __('PHP error log not readable, make sure that your log is properly configured and that is readable.');
	}

	function __construct() {
		if (Vvveb\isEditor()) {
			return;
		}
		$this->view = View::getInstance();

		if (APP == 'admin') {
			$this->admin();
		} else {
			if (APP == 'app') {
				$this->app();
			}
		}
		$this->sql();

		//when the request is finished and the template render gather info
		Event::on('Vvveb\System\Core\View', 'render', __CLASS__, function () {
			$events = Event::getEvents();

			array_walk_recursive($events, function (&$value, $key) {
				if (is_object($value)) {
					if ($value instanceof \Closure) {
						$value = $this->closureDump($value);
					}
				}
			});

			$this->view->debug['data']['filters'] = $events;
			$this->view->debug['data']['request'] = Routes::getUrlData();
		});

		$this->errorLog();
	}
}

$debugPlugin = new DebugPlugin();
