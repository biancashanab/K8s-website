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

namespace Vvveb\Plugins\Debug\Controller;

use Vvveb\Controller\Base;
use Vvveb\System\Core\View;
use Vvveb\System\Images;

class Settings extends Base {
	protected $type = 'review';

	function delete() {
	}

	function index() {
		$view     = View :: getInstance();

		return;
		$fields = new \Vvveb\Sql\fieldSQL();

		$page    = $this->request->get['page'] ?? 1;
		$limit   = 10;

		$results = $fields->getFields(
			[
				'start'        => ($page - 1) * $limit,
				'limit'        => $limit,
				'type'         => $this->type,
				'language_id'  => 1,
				'site_id'      => 1,
			]
		);

		foreach ($results['fields'] as $id => &$review) {
			if (isset($review['image'])) {
				$review['image'] = Images::image('review', $review['image']);
			}

			$review['edit-url']   = \Vvveb\url(['module' => 'review/review', 'review_id' => $review['review_id']]);
			$review['delete-url'] = \Vvveb\url(['module' => 'review/fields', 'action' => 'delete', 'review_id' => $review['review_id']]);
			$review['view-url']   =  \Vvveb\url('content/review/index', $review);
			$admin_path           = \Vvveb\adminPath();
			$review['design-url'] = $admin_path . \Vvveb\url(['module' => 'editor/editor', 'url' => $review['view-url']], false, false);
		}

		$view->fields   = $results['fields'];
		$view->count    = $results['count'];

		$view->fields = [
			'article' => ['type' => 'link', 'url'=> ''],
		];

		$view->limit = $limit;

		return null;
		//insert plugin html
		$view->vtpl->insertHTML('public/admin/theme/default/content/fields.html', 'plugins/test/public/admin/content/fields.article.html', [
			//headcolumn
			[
				'insertSelector' => '[data-v-fields]table thead',
				'type'           => 'append',
				'selector'       => '[data-v-test-col]',
			],
			//row column
			[
				'insertSelector' => '[data-v-fields]table data-v-review .review',
				'type'           => 'after',
				'selector'       => '[data-v-test-row]',
			],
		]);
		$view->vtpl->addTemplate('public/admin/theme/default/content/fields.pst', 'plugins/test/admin/content/fields.pst');
	}
}
