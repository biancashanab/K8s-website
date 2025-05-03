head|append = from(/plugins/debug/public/debug.html|#debug-bar-css)
body|append = from(/plugins/debug/public/debug.html|#debug-bar)

@tabs = [data-v-debug-tabs]
@tab = [data-v-debug-tabs] [data-v-debug-tab]

@tab|deleteAllButFirstChild

@tabs|prepend = <?php
global $tabName;
function debugArrayToList($array, $level = 1) {
	global $tabName;
	echo '<ol>';
	$id = $tabName;
	$i = 0;
	if (is_array($array)) {
		foreach ($array as $key => $value) {
			$i++;
			$is_array = is_array($value);
			if ($is_array) {
				echo '<li class="folder">'; 
			} else {
				echo '<li class="file">'; 
			}
			if (!is_int($key)) echo "<label for='d-$id-$level-$i'>$key</label><input type='checkbox' id='d-$id-$level-$i'>";
			if ($is_array) {
				//echo $key;
				debugArrayToList($value, ++$level);
			} else {
				if ($value) {
					echo '<div>' . substr($value,0, 2048) . '</div>';
				}
			}
			echo '</li>';
		}
	}
	else {
		echo '<div>' . substr($array,0, 2048) . '</div>';
	}
	echo '</ol>';
}

if(isset($this->debug['data']) && is_array($this->debug['data']))  {
	foreach ($this->debug['data'] as $tabName => $content) {?>
	
		@tabs [data-v-debug-label]|innerText = <?php echo ucfirst($tabName);?>
		@tabs [data-v-debug-content]|addClass = <?php echo strtolower($tabName);?>
		@tabs [data-v-debug-content] = <?php echo debugArrayToList($content);?>
		@tabs [data-v-debug-input]|id = <?php echo "debug-tab-$tabName";?>
		@tabs [data-v-debug-label]|for = <?php echo "debug-tab-$tabName";?>
		
	@tabs|append = <?php } 
}?>



