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
Cli example:
php cli.php admin module=plugins/markdown-import/settings action=import site_id=5 settings[path]=/docs/user
*/

namespace Vvveb\Plugins\MarkdownImport\Controller;

use function Vvveb\__;
use Vvveb\Controller\Base;
use function Vvveb\htmlToText;
use Vvveb\Plugins\MarkdownImport\System\Parsedown as Parsedown;
use Vvveb\Sql\categorySQL;
use Vvveb\Sql\postSQL;
use Vvveb\System\Extensions\Extensions;

class Settings extends Base {
	private $cats = [];

	private function markdownHtml($markdown, $dir) {
		//escape html tags
		//$markdown = str_replace(['<', '>'], ['&lt;', '&gt;'], $markdown);
		//escape code blocks
		$markdown = preg_replace_callback('/```.*?```/ms', function ($matches) {
			return str_replace(['&lt;', '&gt;'], ['<', '>'],  $matches[0]);
		}, $markdown);

		/*
		$markdown = preg_replace_callback('/```.*?```/ms', function ($matches) {
			return htmlentities($matches[0]);
		}, $markdown);*/
		//echo $markdown;

		$html = $text =  $this->parsedown->text($markdown);

		//admonitions support
		$html = preg_replace_callback('/<p>:::(\w+)<\/p>(.*?)\n<p>:::<\/p>/ms', function ($matches) {
			$text = $matches[1];
			$type = str_replace(['info', 'tip', 'note', 'caution', 'danger'], ['primary', 'info', 'secondary', 'warning', 'danger'], $text);
			$icon = str_replace(['primary', 'info', 'secondary', 'warning', 'danger'], ['&#128712;', '&#128161;', '&#8505;', '	&#128710;', '&#128711;'], $type);
			$message = strip_tags($matches[2], '<span><a>');

			return '<p class="alert alert-' . $type . ' " role="alert"><span class="fs-5 align-middle">' . $icon . '</span><strong class="initialism align-middle badge bg-white text-' . $type . '">' . $text . '</strong>' . $message . '</p>';
		}, $html);

		//process images
		$mediaPath = PUBLIC_PATH . 'media/';
		@mkdir(DIR_ROOT . $mediaPath . 'docs/');

		$html = preg_replace_callback('/<img.+?src=["\'](.+?)["\']/',
		function ($match) use (&$mediaPath, $dir) {
			$image = $match[1];
			//if local image copy to media
			if (strpos($image, '//') === false && file_exists($dir . '/' . $image)) {
				copy($dir . '/' . $image, DIR_ROOT . $mediaPath . 'docs/' . $image);

				return '<img src="/media/docs/' . $image . '"';
			}

			return $match[0];
		},$html);

		return $html;
	}

	private function traverseDir($dir) {
		if (! ($dp = opendir($dir))) {
			die("Cannot open $dir.");
		}

		while ((false !== $file = readdir($dp))) {
			if (is_dir($dir . DS . $file)) {
				if ($file != '.' && $file != '..') {
					//echo "category $dir/$file <br>";
					//check and add dir
					$this->addCategories($dir . DS . $file);
					$this->traverseDir($dir . DS . $file);
					chdir($dir);
				}
			} else {
				if ($file != '.' && $file != '..' && strrpos($file, '.md') != false) {
					//add post
					$this->add($file,$dir . DS . $file, $dir);
				}
			}
		}
		closedir($dp);

		return true;
	}

	private function addCategories($file) {
		$folder = trim(str_replace($this->docs_folder, '', $file), ' /' . DS);
		//echo '<br/>';
		$cats = explode(DS, $folder);

		$prev_category = 0;
		$category_id   = 0;

		foreach ($cats as $category_slug) {
			$cat = $this->categories->getCategoryBySlug(['slug' => $category_slug, 'taxonomy_id' => 1, 'parent_id' => $prev_category, 'site_id' => $this->global['site_id']]);

			if ($cat) {
				$prev_category = $cat['taxonomy_item_id'];
			} else {
				$cat = $this->categories->addCategory([
					'taxonomy_item' => $this->global + [
						'parent_id'   => $prev_category,
						'taxonomy_id' => 1,
					],
					'taxonomy_item_content' => $this->global + ['slug'=> $category_slug, 'name' => \Vvveb\humanReadable($category_slug), 'content' => ''],
				] + $this->global);

				$category_id = $cat['taxonomy_item'];
			}
		}

		if (! $category_id) {
			$category_id = $prev_category;
		}

		if (! isset($this->cats[$folder])) {
			$this->cats[$folder] = $category_id;
		}
	}

	private function add($filename, $file, $dir) {
		$category = trim(str_replace($this->docs_folder, '', dirname($file)), ' /' . DS);
		$slug     = \Vvveb\filter('/([^.]+)/', basename($file));
		$name     = \Vvveb\humanReadable($slug);

		$slug = \Vvveb\filter('/([^.]+)/', basename($file));
		$name = \Vvveb\humanReadable($slug);

		$markdown = file_get_contents($file);

		//get parameters and remove
		$params   = [];
		$markdown = preg_replace_callback('@^\s*---.+?---\s*@ms', function ($matches) use (&$params) {
			$params = Extensions::getParams($matches[0]);

			return '';
		}, $markdown);

		//convert markdown to html
		$html     = $this->markdownHtml($markdown, $dir);
		//get name from heading 1 if available
		$html = preg_replace_callback('/<h1>(.+?)<\/h1>/',
		function ($match) use (&$name) {
			$name = $match[1];

			return ''; //remove heading 1 from content as it will be set as post name
		},$html);

		$category_id = $this->cats[$category] ?? false;
		$slug        = $params['slug'] ?? $slug;
		$post_data   = $this->post->get(['slug' => $slug]);
		$excerpt     = substr(htmlToText($html), 0, 200) ?? '';

		if (defined('CLI')) {
			echo "Importing $slug - $file\n";
		}
		
		$language_id = $this->global['language_id'];

		if (! $post_data) {
			$data =
				[
					'post' => $this->global + $params,
					'post_content' => [
						$language_id => $params + ['language_id' => $language_id, 'name' => $name, 'slug' => $slug, 'content' => $html, 'excerpt' => $excerpt],
					],				
					'site_id' => [$this->global['site_id']],
				] + $this->global;

			$post_data = $this->post->add($data);

			if ($category_id) {
				$taxonomy_item = ['post_id' => $post_data['post'], 'taxonomy_item' => ['taxonomy_item_id' => $category_id]];
				$this->post->setPostTaxonomy($taxonomy_item);
			}
		} else {
			$data = [
				'post' => $this->global + $params,
				'post_content' => [
					$language_id => $params + ['language_id' => $language_id, 'name' => $name, 'slug' => $slug, 'content' => $html, 'excerpt' => $excerpt],
				],				
				'post_id' => $post_data['post_id'],
				'site_id' => [$this->global['site_id']],
			] + $this->global;

			$result = $this->post->edit($data);

			if ($category_id) {
				$taxonomy_item = ['post_id' => $post_data['post_id'], 'taxonomy_item' => ['taxonomy_item_id' => $category_id]];
				$this->post->setPostTaxonomy($taxonomy_item);
			}
		}
	}

	function import() {
		$path = $this->request->post['settings']['path'];

		if (isset($this->request->post['site_id'])) {
			$this->global['site_id'] = $this->request->post['site_id'];
		}

		if (isset($this->request->get['site_id'])) {
			$this->global['site_id'] = $this->request->get['site_id'];
		}

		if ($path) {
			$this->docs_folder = DIR_ROOT . $path . DS;
			$this->categories  = new categorySQL();
			$this->post        = new postSQL();
			/*
					include __DIR__ . '/../../system/parsedown.php';
					$this->parsedown = new \Parsedown();
			*/
			$this->parsedown = new Parsedown();

			if ($this->traverseDir($this->docs_folder)) {
				$this->view->success[] = __('Import complete!');
			}
		}

		return $this->index();
	}

	function index() {
		//$cat = $categories->getCategoryBySlug(['slug' => 	'desktop', 'parent_id' => 1]);
		//$this->traverseDir($this->docs_folder);

		return null;
	}
}
