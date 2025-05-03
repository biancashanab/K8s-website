let mdeOptions = {};
/*
const easymde = new EasyMDE({
	element: document.querySelector('textarea.html'),
});
*/
let elements = document.querySelectorAll('textarea.html')
let easymde = [];

for (i = 0; i < elements.length; ++i) {
  mdeOptions['element'] = elements[i];
  easymde[i] = new EasyMDE(mdeOptions);
}

$(".revisions").on("click", ".btn-load", function (e) {
	/*
	let data = revision(this);
	let contentEditor = tinymce.get( $(this).parents(".tab-pane").find("[data-v-" + data.type + "-content-content]").attr("id") );
	revisionAction("revision", data, function (data, text) {
		if (data.content) {
			contentEditor.setContent(data["content"]);
			displayToast("bg-success", "Revision", data["created_at"] + " Revision loaded!");
	}});
	*/
	//e.preventDefault();
	return false;
});