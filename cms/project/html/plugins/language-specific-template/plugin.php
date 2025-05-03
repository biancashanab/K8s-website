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
Name: Language specific html template
Slug: language-specific-template
Category: tools
Url: https://www.vvveb.com
Description: Set a different html template for a specific language, the plugin will check for language specific html file like index.fr_FR.html or content/post.fr_FR.html before serving general index.html and content/post.html
Author: givanz
Version: 0.1
Thumb: language-specific-template.svg
Author url: https://www.vvveb.com
*/

use \Vvveb\System\Event as Event;
use function Vvveb\getLanguage;

if (! defined('V_VERSION')) {
	die('Invalid request!');
}

class LanguageSpecificTemplatePlugin {
	function admin() {
	}

	function app() {
		Event::on('Vvveb\System\Core\View', 'compile', __CLASS__, function ($template, $htmlFile, $tplFile, $vTpl, $view) {
			//check if language html available
			$lang = getLanguage();
			$languageHTMLFile = str_replace('.html', ".$lang.html", $htmlFile);

			if (file_exists($languageHTMLFile)) {
				$htmlFile = $languageHTMLFile;
			}

			return [$template, $htmlFile, $tplFile, $vTpl, $view];
		});

		Event::on('Vvveb\System\Core\View', 'template', __CLASS__, function ($filename, $compiledFilename, $view) {
			//add language to compiled html
			$lang = getLanguage();
			$compiledFilename = str_replace('.html', ".$lang.html", $compiledFilename);

			return [$filename, $compiledFilename, $view];
		});
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

$languageSpecificTemplatePlugin = new LanguageSpecificTemplatePlugin();
