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
Name: Markdown Editor
Slug: markdown-editor
Category: content
Url: https://www.vvveb.com
Description: Change post and product page editor to markdown, automatically render as html on frontend. 
Author: givanz
Version: 0.1
Thumb: markdown-editor.svg
Author url: https://www.vvveb.com
*/

use Vvveb\Plugins\MarkdownEditor\System\Parsedown as Parsedown;
use Vvveb\System\Event;

if (! defined('V_VERSION')) {
	die('Invalid request!');
}

class MarkdownEditorPlugin {
	private $parsedown;

	private function markdownToHtml($markdown) {
		//escape html tags
		$markdown = str_replace(['<', '>'], ['&lt;', '&gt;'], $markdown);
		//escape code blocks
		$markdown = preg_replace_callback('/```.*?```/ms', function ($matches) {
			return str_replace(['&lt;', '&gt;'], ['<', '>'],  $matches[0]);
		}, $markdown);

		/*
		$markdown = preg_replace_callback('/```.*?```/ms', function ($matches) {
			return htmlentities($matches[0]);
		}, $markdown);*/

		$this->parsedown = new Parsedown();
		$html            = $text            =  $this->parsedown->text($markdown);

		//admonitions support
		$html = preg_replace_callback('/<p>:::(\w+)<\/p>(.*?)\n<p>:::<\/p>/ms', function ($matches) {
			$text = $matches[1];
			$type = str_replace(['info', 'tip', 'note', 'caution', 'danger'], ['primary', 'info', 'secondary', 'warning', 'danger'], $text);
			$icon = str_replace(['primary', 'info', 'secondary', 'warning', 'danger'], ['&#128712;', '&#128161;', '&#8505;', '	&#128710;', '&#128711;'], $type);
			$message = strip_tags($matches[2], '<span><a>');

			return '<p class="alert alert-' . $type . ' " role="alert"><span class="fs-5 align-middle">' . $icon . '</span><strong class="initialism align-middle badge bg-white text-' . $type . '">' . $text . '</strong>' . $message . '</p>';
		}, $html);

		return $html;
	}

	function addMarkdownEditor() {
		//add script on compile
		Event::on('Vvveb\System\Core\View', 'compile', __CLASS__, function ($template, $htmlFile, $tplFile, $vTpl, $view) {
			//insert js and css on post and product page
			if ($template == 'content/post.html' || $template == 'product/product.html') {
				//insert script
				$vTpl->loadTemplateFile(__DIR__ . '/admin/template/editor.tpl');
				//$vTpl->addCommand('body|append', $script);
			}

			return [$template, $htmlFile, $tplFile, $vTpl, $view];
		});
	}

	function admin() {
		$this->addMarkdownEditor();
	}

	function app() {
		//post component
		Event::on('Vvveb\Component\Post', 'results', __CLASS__, function ($results = false) {
			if ($results) {
				$results['content'] = $this->markdownToHtml($results['content']);
			}

			return [$results];
		});

		//posts component
		Event::on('Vvveb\Component\Posts', 'results', __CLASS__, function ($results = false) {
			if (isset($results['post'])) {
				foreach ($results['post'] as &$post) {
					$post['content'] = $this->markdownToHtml($post['content']);
				}
			}

			return [$results];
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

$markdownPlugin = new MarkdownEditorPlugin();
