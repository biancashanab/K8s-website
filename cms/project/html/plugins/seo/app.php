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

namespace Vvveb\Plugins\Seo;

use function Vvveb\getMultiPostContentMeta;
use function Vvveb\getMultiProductContentMeta;
use function Vvveb\isEditor;
use function Vvveb\reconstructJson;
use Vvveb\System\Core\Request;
use Vvveb\System\Core\View;
use Vvveb\System\Event;

if (! defined('V_VERSION')) {
	die('Invalid request!');
}

#[\AllowDynamicProperties]
class App {
	function __construct() {
		$this->view    = View::getInstance();
		$this->request = Request::getInstance();

		if (isEditor()) {
			return;
		}

		//$route =
		$template = $this->view->getTemplateEngineInstance();
		$template->loadTemplateFile(__DIR__ . '/app/template/common.tpl');

		$this->view->seo = \Vvveb\getSetting('seo');

		Event::on('Vvveb\Controller\Content\Post', 'index:after', __CLASS__, [$this, 'post']);
		Event::on('Vvveb\Controller\Content\Page', 'index:after', __CLASS__, [$this, 'page']);
		Event::on('Vvveb\Controller\Product\Product', 'index:after', __CLASS__, [$this, 'product']);
		Event::on('Vvveb\Controller\Base', 'init:after', __CLASS__, [$this, 'site']);
	}

	private function setSchema($schema) {
		$this->view->seo['schema'] = $this->view->seo['schema'] ?? [];
		//$schemasDir = 'plugins/seo/config/schemas/';
		$schemasDir = __DIR__ . '/config/schemas/';

		//get email html template
		foreach ($schema as $file) {
			$htmlView  = new View();
			//$htmlView  = clone $this->view;
			$htmlView->setTheme();
			$htmlView->set(['seo' => $this->view->seo]);
			$htmlView->template($schemasDir . $file);
			$xml   = $htmlView->render(true, false, true);

			if ($xml) {
				$sxml  = \simplexml_load_string($xml, null, LIBXML_NOCDATA | LIBXML_DTDATTR);
				$array = reconstructJson($sxml, true);
				$json  = json_encode($array, JSON_THROW_ON_ERROR | JSON_PRETTY_PRINT);

				if ($json) {
					$this->view->seo['schema'][$file] = $json;
				}
			}
		}
	}

	function site($global) {
		$module = $this->request->get['module'] ?? 'index/index';

		//post and product are processed with page method
		if ($module == 'content/post/index' || $module == 'content/page/index' || $module == 'product/product/index') {
			return;
		}

		$schema = $this->view->seo['route'][$module]['schema'] ?? []; //route type
		$schema += $this->view->seo['route']['*']['schema'] ?? []; //all pages

		$this->setSchema($schema);
		
		return [$global];
	}

	function pageType($pageType, $content, $languageContent, $language, $slug) {
		$post        = $content[$language] ?? [];
		$post_id     = $post[$pageType . '_id'] ?? false;
		$language_id = $post['language_id'] ?? false;

		if ($post_id) {
			$seo  = [];

			if ($pageType == 'post') {
				$meta = getMultiPostContentMeta($post_id, 'seo', null, [], $language_id) ?? [];
			} else {
				//$meta = getMultiProductContentMeta($post_id, 'seo', null, [], $language_id) ?? [];
				$meta = getMultiPostContentMeta($post_id, 'seo', null, [], $language_id) ?? [];
			}

			foreach ($meta as $item) {
				$seo[$item['key']] = $item['value'];
			}

			$this->view->seo['meta'] = $seo;
		}

		$postType = $post['type'] ?? '';
		$schema   = $this->view->seo[$pageType . '-type'][$postType]['schema'] ?? []; //post type
		$schema += $this->view->seo['route']['*']['schema'] ?? []; //all pages

		$this->setSchema($schema);

		return [$content, $languageContent, $language, $slug];
	}

	function page($content, $languageContent, $language, $slug) {
		return $this->pageType('post', $content, $languageContent, $language, $slug);
	}

	function post($content, $languageContent, $language, $slug) {
		return $this->pageType('post', $content, $languageContent, $language, $slug);
	}

	function product($content, $languageContent, $language, $slug) {
		return $this->pageType('product', $content, $languageContent, $language, $slug);
	}
}
